import * as ethers from 'ethers';
import * as dns from 'dns';
import Logger from "./logger";
import { Prisma } from '@prisma/client';
import { cliGreenify, cliYellowfy } from 'aqua-js-sdk';
// import { cliGreenify } from 'aqua-js-sdk';

export interface TxtRecord {
  // New format fields
  id?: string;
  itime?: string;
  etime?: string;

  // Old format fields (keep for backward compatibility)
  wallet?: string;
  timestamp?: string;
  expiration?: string;

  // Common
  sig: string;
}

// Set reliable DNS servers (Google and Cloudflare)
dns.setServers([
  '8.8.8.8',
  '8.8.4.4',
  '1.1.1.1',
  '1.0.0.1'
]);

Logger.info('🔧 DNS servers set to:', dns.getServers());

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 10; // Max requests per window
const RATE_LIMIT_WINDOW = 60_000; // 1 minute window

// Log entry interface
interface LogEntry {
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

// Verification result interface
interface VerificationResult {
  success: boolean;
  walletAddress: string;
  expirationDate: Date;
  recordIndex: number;
}

// API Response interface
export interface ApiResponse {
  success: boolean;
  message: string;
  domain: string;
  expectedWallet?: string;
  totalRecords: number;
  verifiedRecords: number;
  results: VerificationResult[];
  logs: LogEntry[];
  dnssecValidated: boolean;
}

// DNS-over-HTTPS resolution (uses TCP - no UDP truncation issues)
async function resolveTxtWithDoH(domain: string): Promise<{ records: string[][]; dnssecValidated: boolean }> {
  const endpoints = [
    {
      name: 'Google DoH',
      url: `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=TXT`,
      headers: {} as Record<string, string>
    },
    {
      name: 'Cloudflare DoH',
      url: `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=TXT`,
      headers: { 'Accept': 'application/dns-json' }
    }
  ];

  let lastError: Error | undefined;

  for (const endpoint of endpoints) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(endpoint.url, {
          headers: endpoint.headers,
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          Logger.warn(`${endpoint.name} returned HTTP ${response.status}`);
          continue;
        }

        const data = await response.json() as any;

        // Status 3 = NXDOMAIN (domain does not exist)
        if (data.Status === 3) {
          throw new Error(`DNS name does not exist: ${domain}`);
        }

        if (data.Status !== 0) {
          Logger.warn(`${endpoint.name} returned DNS status ${data.Status}`);
          continue;
        }

        if (!data.Answer) {
          return { records: [], dnssecValidated: !!data.AD };
        }

        const records: string[][] = data.Answer
          .filter((r: any) => r.type === 16) // TXT record type
          .map((r: any) => {
            let txt = r.data as string;
            // DoH returns data with surrounding quotes
            if (txt.startsWith('"') && txt.endsWith('"')) {
              txt = txt.slice(1, -1);
            }
            return [txt];
          });

        Logger.info(`${endpoint.name}: resolved ${records.length} TXT records for ${domain}`);
       
        return { records, dnssecValidated: !!data.AD };
      } catch (error: any) {
        lastError = error instanceof Error ? error : new Error(String(error));
        // Propagate NXDOMAIN immediately so caller can try alternate record name
        if (lastError.message.includes('does not exist')) throw lastError;
        if (attempt < 2) await new Promise(r => setTimeout(r, 500));
      }
    }
  }

  throw lastError || new Error(`All DoH endpoints failed for ${domain}`);
}

// Fallback: UDP-based DNS resolution via Node.js dns module
async function resolveTxtWithUdp(domain: string): Promise<{ records: string[][]; dnssecValidated: boolean }> {
  const resolvers = [
    { name: 'System DNS', servers: null },
    { name: 'Google DNS', servers: ['8.8.8.8', '8.8.4.4'] },
    { name: 'Cloudflare DNS', servers: ['1.1.1.1', '1.0.0.1'] },
  ];

  for (const { name, servers } of resolvers) {
    try {
      const resolver = new dns.Resolver();
      if (servers) resolver.setServers(servers);

      const records = await new Promise<string[][]>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`${name} timeout after 10s`));
        }, 10000);

        resolver.resolveTxt(domain, (err, records) => {
          clearTimeout(timeoutId);
          if (err) reject(err);
          else resolve(records);
        });
      });

      Logger.info(`${name}: resolved ${records.length} TXT records for ${domain}`);
      return { records, dnssecValidated: false };
    } catch (error) {
      Logger.warn(`${name} failed for ${domain}: ${error instanceof Error ? error.message : error}`);
    }
  }

  throw new Error(`All UDP DNS methods failed for ${domain}`);
}

// Main DNS resolution: DoH first (reliable, TCP), then UDP fallback
async function resolveTxtWithFallbacks(domain: string): Promise<{ records: string[][]; dnssecValidated: boolean }> {
  // Prefer DNS-over-HTTPS: uses TCP so no UDP packet truncation for large TXT records
  try {
    return await resolveTxtWithDoH(domain);
  } catch (dohError: any) {
    // NXDOMAIN = domain doesn't exist, propagate immediately
    if (dohError.message?.includes('does not exist')) throw dohError;
    Logger.warn(`DoH failed for ${domain}, falling back to UDP: ${dohError.message}`);
  }

  // Fallback to traditional UDP-based DNS
  return await resolveTxtWithUdp(domain);
}

// Rate limiting check
function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(identifier);

  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (limit.count >= RATE_LIMIT_MAX) {
    return false;
  }

  limit.count++;
  return true;
}

function parseTxtRecord(txt: string): TxtRecord {
  const params = new URLSearchParams(txt);
  return {
    // New format
    id: params.get('id') || undefined,
    itime: params.get('itime') || undefined,
    etime: params.get('etime') || undefined,

    // Old format (backward compatibility)
    wallet: params.get('wallet') || undefined,
    timestamp: params.get('timestamp') || undefined,
    expiration: params.get('expiration') || undefined,

    // Common
    sig: params.get('sig') || ''
  };
}

// Helper function to verify a single wallet record
async function verifySingleRecord(
  txtRecord: string,
  domain: string,
  recordName: string,
  recordIndex: number,
  dnssecValidated: boolean,
  logs: LogEntry[],
  expectedWallet?: string,
  claimData?: { wallet: string; secret?: string; uniqueId?: string }
): Promise<VerificationResult> {

  logs.push({
    level: 'info',
    message: `Starting verification for record ${recordIndex}`,
    details: { recordIndex, recordPreview: txtRecord.substring(0, 80) + '...' }
  });

  let testsPassed = 0;
  let totalTests = 0;
  const result: VerificationResult = {
    success: false,
    walletAddress: '',
    expirationDate: new Date(0),
    recordIndex
  };

  // Parse record first to detect format
  const parsedRecord = parseTxtRecord(txtRecord);

  // Detect format
  const isNewFormat = !!(parsedRecord.id && parsedRecord.itime && parsedRecord.etime);
  const isOldFormat = !!(parsedRecord.wallet && parsedRecord.timestamp);

  if (!isNewFormat && !isOldFormat) {
    logs.push({
      level: 'error',
      message: 'Invalid record format - neither new nor old format detected',
      details: { record: txtRecord }
    });
    return result;
  }

  // Variables for verification
  let messageToVerify: string;
  let walletAddress: string | undefined;
  let itime: string;
  let etime: string;

  if (isNewFormat) {
    logs.push({
      level: 'info',
      message: 'New format detected (privacy-preserving)',
      details: { id: parsedRecord.id, hasWallet: !!parsedRecord.wallet }
    });

    itime = parsedRecord.itime!;
    etime = parsedRecord.etime!;

    // Check if private or public mode
    if (parsedRecord.wallet) {
      // Public mode: wallet in DNS record
      messageToVerify = `${parsedRecord.wallet}&${itime}&${domain}&${etime}`;

      logs.push({
        level: 'info',
        message: 'Public mode: Wallet address in DNS record'
      });
    } else {
      // Private mode: secret-based verification
      if (!claimData?.secret) {
        logs.push({
          level: 'error',
          message: 'Private mode claim detected but no secret provided'
        });
        return result;
      }
      messageToVerify = `${claimData.secret}&${itime}&${domain}&${etime}`;

      logs.push({
        level: 'info',
        message: 'Private mode: Wallet address hidden in DNS record'
      });
    }

    // Wallet address will be recovered from signature verification
  } else {
    // Old format verification (backward compatibility)
    logs.push({
      level: 'warning',
      message: 'Legacy format detected (wallet exposed in DNS)',
      details: { recommendation: 'Please regenerate with new privacy-preserving format' }
    });

    walletAddress = parsedRecord.wallet!;
    itime = parsedRecord.timestamp!;
    etime = parsedRecord.expiration || (parseInt(itime) + 90 * 24 * 60 * 60).toString();
    messageToVerify = `${itime}|${domain}|${etime}`;

    result.walletAddress = walletAddress;
    testsPassed++;
  }

  // Test 3: Timestamp Validity
  totalTests++;
  logs.push({ level: 'info', message: 'Test 3/7: Timestamp Validity' });

  const timestamp = parseInt(itime);
  const timestampDate = new Date(timestamp * 1000);
  const now = new Date();
  const ageMs = now.getTime() - timestampDate.getTime();
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

  if (isNaN(timestamp) || timestamp <= 0) {
    logs.push({
      level: 'error',
      message: 'Invalid timestamp format',
      details: {
        expected: 'Valid Unix timestamp',
        found: itime
      }
    });
    return result;
  }

  if (timestamp > Math.floor(now.getTime() / 1000) + 300) {
    logs.push({
      level: 'error',
      message: 'Timestamp is in the future - possible clock manipulation attack',
      details: { timestamp: timestampDate.toISOString() }
    });
    return result;
  }

  logs.push({
    level: 'success',
    message: 'Valid timestamp format',
    details: {
      created: timestampDate.toISOString(),
      ageDays: ageDays
    }
  });
  testsPassed++;

  // Test 4: Expiration Date Check
  totalTests++;
  logs.push({ level: 'info', message: 'Test 4/7: Expiration Date Validation' });

  const expiration = parseInt(etime);
  const expirationDate = new Date(expiration * 1000);
  const nowTimestamp = Math.floor(now.getTime() / 1000);
  result.expirationDate = expirationDate;

  if (isNaN(expiration) || expiration <= 0) {
    logs.push({
      level: 'error',
      message: 'Invalid expiration format',
      details: {
        expected: 'Valid Unix timestamp',
        found: etime
      }
    });
    return result;
  }

  if (expiration <= timestamp) {
    logs.push({
      level: 'error',
      message: 'Expiration date is before creation date',
      details: {
        created: timestampDate.toISOString(),
        expires: expirationDate.toISOString()
      }
    });
    return result;
  }

  if (expiration < nowTimestamp) {
    logs.push({
      level: 'error',
      message: 'Signature has expired',
      details: {
        expiredOn: expirationDate.toISOString(),
        currentTime: now.toISOString()
      }
    });
    return result;
  }

  const daysUntilExpiration = Math.floor((expiration - nowTimestamp) / (60 * 60 * 24));
  logs.push({
    level: 'success',
    message: 'Signature is not expired',
    details: {
      expires: expirationDate.toISOString(),
      daysRemaining: daysUntilExpiration
    }
  });
  testsPassed++;

  // Test 5: Cryptographic Signature Verification (EIP-191 Compliant)
  totalTests++;
  logs.push({ level: 'info', message: 'Test 5/7: Cryptographic Signature Verification (EIP-191 Compliant)' });

  try {
    const recoveredAddress = ethers.verifyMessage(messageToVerify, parsedRecord.sig);

    if (isNewFormat) {
      // For new format, the wallet is recovered from the signature
      walletAddress = recoveredAddress;
      result.walletAddress = recoveredAddress;
      testsPassed++; // wallet recovery test

      // Public mode: verify recovered wallet matches wallet in DNS record
      if (parsedRecord.wallet && recoveredAddress.toLowerCase() !== parsedRecord.wallet.toLowerCase()) {
        logs.push({
          level: 'error',
          message: 'Signature verification failed - recovered wallet does not match wallet in DNS record',
          details: {
            dnsWallet: parsedRecord.wallet,
            recoveredAddress: recoveredAddress
          }
        });
        return result;
      }

      // Compare recovered wallet with expected wallet
      if (expectedWallet && recoveredAddress.toLowerCase() !== expectedWallet.toLowerCase()) {
        logs.push({
          level: 'error',
          message: 'Recovered wallet does not match expected wallet',
          details: {
            expectedWallet: expectedWallet,
            recoveredAddress: recoveredAddress
          }
        });
        return result;
      }
    } else {
      // Old format: compare recovered with parsed wallet
      if (recoveredAddress.toLowerCase() !== walletAddress!.toLowerCase()) {
        logs.push({
          level: 'error',
          message: 'Signature verification failed - signature was NOT created by claimed wallet',
          details: {
            expectedWallet: walletAddress,
            recoveredAddress: recoveredAddress
          }
        });
        return result;
      }
    }

    logs.push({
      level: 'success',
      message: 'Signature verification successful',
      details: {
        wallet: walletAddress,
        recoveredAddress: recoveredAddress,
        message: messageToVerify
      }
    });
    testsPassed++;

    // Test 6: Domain Consistency Check
    totalTests++;
    logs.push({ level: 'info', message: 'Test 6/7: Domain Consistency Check' });

    // Check domain in message (works for both old and new formats)
    // Old format: itime|domain|etime (separator: |)
    // New format: prefix&itime&domain&etime (separator: &)
    const separator = isOldFormat ? '|' : '&';
    const messageParts = messageToVerify.split(separator);

    // For old format: parts are [itime, domain, etime]
    // For new format: parts are [prefix, itime, domain, etime]
    const domainIndex = isOldFormat ? 1 : 2;

    if (messageParts.length < domainIndex + 1) {
      logs.push({
        level: 'error',
        message: 'Invalid message format - not enough parts',
        details: {
          message: messageToVerify,
          parts: messageParts.length
        }
      });
      return result;
    }

    const signedDomain = messageParts[domainIndex];
    if (signedDomain !== domain) {
      logs.push({
        level: 'error',
        message: 'Domain mismatch - signature was created for different domain',
        details: {
          queriedDomain: domain,
          signedDomain: signedDomain,
          dnsRecordLocation: recordName
        }
      });
      return result;
    }

    logs.push({
      level: 'success',
      message: 'Domain consistency verified',
      details: {
        domain: domain,
        recordLocation: recordName
      }
    });
    testsPassed++;

    logs.push({
      level: 'success',
      message: `Record ${recordIndex} verification complete: ${testsPassed}/${totalTests} tests passed`,
      details: {
        wallet: parsedRecord.wallet,
        domain: domain,
        validUntil: expirationDate.toISOString()
      }
    });

    result.success = true;
    return result;

  } catch (error: any) {
    logs.push({
      level: 'error',
      message: 'Signature verification error',
      details: { error: error instanceof Error ? error.message : error }
    });
    return result;
  }
}

export function coerceIntoApiResponse(jsonValue: Prisma.JsonValue): ApiResponse {
  try {
    return jsonValue as unknown as ApiResponse;
  } catch (error) {
    throw new Error('Invalid JSON value');
  }
}

export interface IClaimData { wallet: string; secret?: string; uniqueId?: string }

// Main verification function adapted for API with improved DNS handling
export async function verifyProofApi(domain: string, lookupKey: string, expectedWallet?: string, claimData?: IClaimData): Promise<ApiResponse> {
  const logs: LogEntry[] = [];
  const response: ApiResponse = {
    success: false,
    message: '',
    domain: domain,
    expectedWallet: expectedWallet,
    totalRecords: 0,
    verifiedRecords: 0,
    results: [],
    logs: logs,
    dnssecValidated: false
  };

  // Rate limiting by domain
  // if (!checkRateLimit(domain)) {
  //   logs.push({
  //     level: 'error',
  //     message: 'Rate limit exceeded',
  //     details: {
  //       maxRequests: RATE_LIMIT_MAX,
  //       windowMinutes: RATE_LIMIT_WINDOW / 60000
  //     }
  //   });
  //   response.message = 'Rate limit exceeded. Please try again later.';
  //   return response;
  // }

  // Parse domain and lookup key
  let actualDomain: string;
  let actualLookupKey: string;

  if (domain.startsWith('aqua._')) {
    const parts = domain.split('.');
    if (parts.length >= 3 && parts[0] === 'aqua' && parts[1].startsWith('_')) {
      actualLookupKey = parts[1].substring(1);
      actualDomain = parts.slice(2).join('.');
    } else {
      logs.push({
        level: 'error',
        message: 'Invalid domain format',
        details: { domain: domain }
      });
      response.message = 'Invalid domain format';
      return response;
    }
  } else {
    actualDomain = domain;
    actualLookupKey = lookupKey;
  }

  response.domain = actualDomain;

  logs.push({
    level: 'info',
    message: 'Starting DNS verification',
    details: {
      domain: actualDomain,
      lookupKey: actualLookupKey,
      expectedWallet: expectedWallet,
      dnsServers: dns.getServers()
    }
  });

  try {
    // Try new format first (_aw.domain), fallback to old format (aqua._wallet.domain)
    // Strip leading _aw. from domain to prevent double prefix (e.g. _aw._aw.domain)
    const cleanDomain = actualDomain.replace(/^_aw\./, '');
    const newRecordName = `_aw.${cleanDomain}`;
    const oldRecordName = `aqua._${actualLookupKey}.${actualDomain}`;
    let txtRecords: string[][];
    let dnssecValidated = false;
    let recordName = newRecordName;

    logs.push({
      level: 'info',
      message: 'Querying DNS records with multiple fallback methods',
      details: { newFormat: newRecordName, oldFormat: oldRecordName }
    });

    try {
      const result = await resolveTxtWithFallbacks(newRecordName);
      // console.log(cliGreenify("DNS DATA RESULT"))
      // console.log(JSON.stringify(result, null, 4))
      txtRecords = result.records;
      dnssecValidated = result.dnssecValidated;
      response.dnssecValidated = dnssecValidated;

      // console.log(cliGreenify(JSON.stringify(txtRecords, null, 4)))

      logs.push({
        level: 'success',
        message: 'DNS resolution successful (new format)',
        details: {
          recordName: newRecordName,
          recordCount: txtRecords.length,
          dnssecValidated: dnssecValidated
        }
      });
    } catch (err) {
      // Fallback to old format
      // console.log("Error: ", err)
      logs.push({
        level: 'info',
        message: 'New format not found, trying old format',
        details: { oldRecordName: oldRecordName }
      });

      recordName = oldRecordName;

      try {
        const result = await resolveTxtWithFallbacks(oldRecordName);
        txtRecords = result.records;
        dnssecValidated = result.dnssecValidated;
        response.dnssecValidated = dnssecValidated;

        logs.push({
          level: 'success',
          message: 'DNS resolution successful (old format)',
          details: {
            recordName: oldRecordName,
            recordCount: txtRecords.length,
            dnssecValidated: dnssecValidated
          }
        });
      } catch (oldErr) {
        logs.push({
          level: 'error',
          message: 'All DNS resolution methods failed for both new and old formats',
          details: {
            newFormat: newRecordName,
            oldFormat: oldRecordName,
            dnsServers: dns.getServers()
          }
        });
        response.message = `DNS lookup failed for ${domain}. This could be due to network restrictions in the server environment.`;
        return response;
      }
    }

    if (!txtRecords || txtRecords.length === 0) {
      logs.push({
        level: 'error',
        message: 'No TXT records found',
        details: {
          expected: `TXT record at ${recordName}`,
          found: 'No records'
        }
      });
      response.message = 'No TXT records found at this location';
      return response;
    }

    // Filter claim records (new format: id + itime + etime + sig, old format: wallet + timestamp + sig)
    const walletRecords = txtRecords.flat().filter(record =>
      // New format: id=, itime=, etime=, sig= (wallet= is optional - absent in private mode)
      (record.includes('id=') &&
        record.includes('itime=') &&
        record.includes('etime=') &&
        record.includes('sig=')) ||
      // Old format: wallet=, timestamp=, sig= (with optional expiration=)
      (record.includes('wallet=') &&
        record.includes('timestamp=') &&
        record.includes('sig='))
    );

    if (walletRecords.length === 0) {
      logs.push({
        level: 'error',
        message: 'No valid claim records found',
        details: {
          expected: 'id=...&itime=...&etime=...&sig=... or wallet=...&timestamp=...&sig=...',
          foundRecords: txtRecords.flat()
        }
      });
      response.message = 'No valid claim records found';
      return response;
    }

    response.totalRecords = walletRecords.length;
    logs.push({
      level: 'success',
      message: `Found ${walletRecords.length} claim record(s) with valid format`
    });

    if (expectedWallet) {
      logs.push({
        level: 'info',
        message: `Will verify records against expected wallet ${expectedWallet}`
      });
    }

    // If uniqueId is provided, find the specific record to verify
    if (claimData?.uniqueId) {
      const targetRecord = walletRecords.find(record => {
        const parsed = parseTxtRecord(record);
        return parsed.id === claimData.uniqueId;
      });

      if (!targetRecord) {
        logs.push({
          level: 'error',
          message: `No record found with id=${claimData.uniqueId}`,
          details: {
            uniqueId: claimData.uniqueId,
            availableIds: walletRecords.map(r => parseTxtRecord(r).id).filter(Boolean)
          }
        });
        response.message = `No record found with id=${claimData.uniqueId}`;
        return response;
      }

      logs.push({
        level: 'info',
        message: `Found target record with id=${claimData.uniqueId}`
      });

      const result = await verifySingleRecord(targetRecord, actualDomain, recordName, 1, dnssecValidated, logs, expectedWallet, claimData);
      response.results.push(result);

      if (result.success) {
        response.verifiedRecords++;
      }
    } else {
      // Process each claim record
      for (let i = 0; i < walletRecords.length; i++) {
        const record = walletRecords[i];

        if (expectedWallet) {
          const parsed = parseTxtRecord(record);
          // Only skip old format records with explicit wallet mismatch
          // Private (new format without wallet) records must be verified to discover the wallet
          if (parsed.wallet && !parsed.id && parsed.wallet.toLowerCase() !== expectedWallet.toLowerCase()) {
            continue;
          }
        }

        const result = await verifySingleRecord(record, actualDomain, recordName, i + 1, dnssecValidated, logs, expectedWallet, claimData);
        response.results.push(result);

        if (result.success) {
          response.verifiedRecords++;

          if (expectedWallet && result.walletAddress.toLowerCase() === expectedWallet.toLowerCase()) {
            break;
          }
        }
      }
    }

    // Determine overall success
    if (expectedWallet) {
      const targetResult = response.results.find(r => r.walletAddress.toLowerCase() === expectedWallet.toLowerCase());
      if (targetResult && targetResult.success) {
        response.success = true;
        response.message = `Wallet ${expectedWallet} successfully verified`;
      } else {
        response.success = false;
        response.message = `Wallet ${expectedWallet} verification failed`;
      }
    } else {
      response.success = response.verifiedRecords > 0;
      response.message = response.success
        ? `${response.verifiedRecords}/${response.totalRecords} records successfully verified`
        : 'No wallet records passed verification';
    }

    return response;

  } catch (error: any) {
    logs.push({
      level: 'error',
      message: 'Unexpected error during verification',
      details: { error: error instanceof Error ? error.message : error }
    });
    response.message = 'Unexpected error during verification';
    return response;
  }
}