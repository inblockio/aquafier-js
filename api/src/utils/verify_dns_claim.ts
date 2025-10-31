import * as ethers from 'ethers';
import * as dns from 'dns';
import { promisify } from 'util';
import Logger from "./logger";
import { Prisma } from '@prisma/client';

export interface TxtRecord {
  wallet: string;
  timestamp: string;
  expiration: string;
  sig: string;
}

// Promisify DNS functions for better async handling
const resolveTxtAsync = promisify(dns.resolveTxt);

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

// Improved DNS resolution with multiple fallbacks
async function resolveTxtWithFallbacks(domain: string): Promise<{ records: string[][]; dnssecValidated: boolean }> {
  const logs: string[] = [];

  // Method 1: Try with promisified dns.resolveTxt
  try {
    logs.push(`Attempting DNS resolution for ${domain} using promisified dns.resolveTxt`);
    const records = await resolveTxtAsync(domain);
    logs.push(`Success with promisified dns.resolveTxt: ${records.length} records found`);
    return { records, dnssecValidated: false };
  } catch (error1) {
    logs.push(`Method 1 failed: ${error1 instanceof Error ? error1.message : error1}`);
  }

  // Method 2: Try with callback-based dns.resolveTxt in Promise wrapper
  try {
    logs.push(`Attempting DNS resolution using callback-based dns.resolveTxt`);
    const records = await new Promise<string[][]>((resolve, reject) => {
      // Set a timeout for the DNS query
      const timeoutId = setTimeout(() => {
        reject(new Error('DNS query timeout after 10 seconds'));
      }, 10000);

      dns.resolveTxt(domain, (err, records) => {
        clearTimeout(timeoutId);
        if (err) {
          reject(err);
        } else {
          resolve(records);
        }
      });
    });
    logs.push(`Success with callback-based dns.resolveTxt: ${records.length} records found`);
    return { records, dnssecValidated: false };
  } catch (error2) {
    logs.push(`Method 2 failed: ${error2 instanceof Error ? error2.message : error2}`);
  }

  // Method 3: Try with custom resolver
  try {
    logs.push(`Attempting DNS resolution using custom resolver`);
    const customResolver = new dns.Resolver();
    customResolver.setServers(['8.8.8.8', '1.1.1.1']);

    const records = await new Promise<string[][]>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Custom resolver timeout after 10 seconds'));
      }, 10000);

      customResolver.resolveTxt(domain, (err, records) => {
        clearTimeout(timeoutId);
        if (err) {
          reject(err);
        } else {
          resolve(records);
        }
      });
    });
    logs.push(`Success with custom resolver: ${records.length} records found`);
    return { records, dnssecValidated: false };
  } catch (error3) {
    logs.push(`Method 3 failed: ${error3 instanceof Error ? error3.message : error3}`);
  }

  // Method 4: Try with different DNS servers
  const dnsServers = [
    ['8.8.8.8', '8.8.4.4'], // Google
    ['1.1.1.1', '1.0.0.1'], // Cloudflare
    ['208.67.222.222', '208.67.220.220'], // OpenDNS
    ['9.9.9.9', '149.112.112.112'] // Quad9
  ];

  for (const servers of dnsServers) {
    try {
      logs.push(`Attempting DNS resolution using servers: ${servers.join(', ')}`);
      const resolver = new dns.Resolver();
      resolver.setServers(servers);

      const records = await new Promise<string[][]>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`DNS query timeout with servers ${servers.join(', ')}`));
        }, 8000);

        resolver.resolveTxt(domain, (err, records) => {
          clearTimeout(timeoutId);
          if (err) {
            reject(err);
          } else {
            resolve(records);
          }
        });
      });
      logs.push(`Success with servers ${servers.join(', ')}: ${records.length} records found`);
      return { records, dnssecValidated: false };
    } catch (error: any) {
      logs.push(`Failed with servers ${servers.join(', ')}: ${error instanceof Error ? error.message : error}`);
    }
  }

  // If all methods fail, throw the last error with diagnostic info
  const diagnosticInfo = {
    domain,
    availableServers: dns.getServers(),
    logs,
    nodeVersion: process.version,
    platform: process.platform
  };

  throw new Error(`All DNS resolution methods failed for ${domain}. Diagnostic info: ${JSON.stringify(diagnosticInfo, null, 2)}`);
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
    wallet: params.get('wallet') || '',
    timestamp: params.get('timestamp') || '',
    expiration: params.get('expiration') || '',
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
  logs: LogEntry[]
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

  // Test 1: Wallet Record Format
  totalTests++;
  logs.push({ level: 'info', message: `Test 1/7: Wallet Record Format` });

  let isLegacyFormat = false;
  let hasValidFormat = txtRecord.includes('wallet=') &&
    txtRecord.includes('timestamp=') &&
    txtRecord.includes('expiration=') &&
    txtRecord.includes('sig=');

  if (!hasValidFormat) {
    hasValidFormat = txtRecord.includes('wallet=') &&
      txtRecord.includes('timestamp=') &&
      txtRecord.includes('sig=');
    if (hasValidFormat) {
      isLegacyFormat = true;
      logs.push({
        level: 'warning',
        message: 'Legacy format detected (no expiration field)',
        details: { recommendation: 'Please regenerate your signature for enhanced security' }
      });
    }
  }

  if (!hasValidFormat) {
    logs.push({
      level: 'error',
      message: 'Invalid wallet record format',
      details: {
        expected: 'wallet=...&timestamp=...&expiration=...&sig=...',
        found: txtRecord
      }
    });
    return result;
  }

  logs.push({ level: 'success', message: 'Valid wallet record format found' });
  testsPassed++;

  // Test 2: Field Parsing
  totalTests++;
  logs.push({ level: 'info', message: 'Test 2/7: Field Parsing' });

  const parsedRecord = parseTxtRecord(txtRecord);
  result.walletAddress = parsedRecord.wallet;

  if (isLegacyFormat && parsedRecord.timestamp && !parsedRecord.expiration) {
    parsedRecord.expiration = (parseInt(parsedRecord.timestamp) + (90 * 24 * 60 * 60)).toString();
    logs.push({
      level: 'info',
      message: 'Legacy format: Using default 90-day expiration'
    });
  }

  if (!parsedRecord.wallet || !parsedRecord.timestamp || !parsedRecord.expiration || !parsedRecord.sig) {
    logs.push({
      level: 'error',
      message: 'Missing required fields after parsing',
      details: {
        required: ['wallet', 'timestamp', 'expiration', 'sig'],
        parsed: parsedRecord
      }
    });
    return result;
  }

  logs.push({
    level: 'success',
    message: 'All required fields parsed successfully',
    details: {
      wallet: parsedRecord.wallet,
      timestamp: parsedRecord.timestamp,
      expiration: parsedRecord.expiration,
      signaturePreview: parsedRecord.sig.substring(0, 20) + '...'
    }
  });
  testsPassed++;

  // Test 3: Message Format & EIP-191 Preparation
  totalTests++;
  logs.push({ level: 'info', message: 'Test 3/7: Message Format & EIP-191 Preparation' });

  const originalMessage = isLegacyFormat
    ? `${parsedRecord.timestamp}|${domain}`
    : `${parsedRecord.timestamp}|${domain}|${parsedRecord.expiration}`;

  logs.push({
    level: 'success',
    message: 'Message prepared for verification',
    details: {
      format: isLegacyFormat ? 'timestamp|domain' : 'timestamp|domain|expiration',
      message: originalMessage
    }
  });
  testsPassed++;

  // Test 4: Timestamp Validity
  totalTests++;
  logs.push({ level: 'info', message: 'Test 4/7: Timestamp Validity' });

  const timestamp = parseInt(parsedRecord.timestamp);
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
        found: parsedRecord.timestamp
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

  // Test 5: Expiration Date Check
  totalTests++;
  logs.push({ level: 'info', message: 'Test 5/7: Expiration Date Validation' });

  const expiration = parseInt(parsedRecord.expiration);
  const expirationDate = new Date(expiration * 1000);
  const nowTimestamp = Math.floor(now.getTime() / 1000);
  result.expirationDate = expirationDate;

  if (isNaN(expiration) || expiration <= 0) {
    logs.push({
      level: 'error',
      message: 'Invalid expiration format',
      details: {
        expected: 'Valid Unix timestamp',
        found: parsedRecord.expiration
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

  // Test 6: Cryptographic Signature Verification (EIP-191 Compliant)
  totalTests++;
  logs.push({ level: 'info', message: 'Test 6/7: Cryptographic Signature Verification (EIP-191 Compliant)' });

  try {
    const recoveredAddress = ethers.verifyMessage(originalMessage, parsedRecord.sig);

    if (recoveredAddress.toLowerCase() !== parsedRecord.wallet.toLowerCase()) {
      logs.push({
        level: 'error',
        message: 'Signature verification failed - signature was NOT created by claimed wallet',
        details: {
          expectedWallet: parsedRecord.wallet,
          recoveredAddress: recoveredAddress
        }
      });
      return result;
    }

    logs.push({
      level: 'success',
      message: 'Signature verification successful',
      details: {
        wallet: parsedRecord.wallet,
        recoveredAddress: recoveredAddress
      }
    });
    testsPassed++;

    // Test 7: Domain Consistency Check
    totalTests++;
    logs.push({ level: 'info', message: 'Test 7/7: Domain Consistency Check' });

    const messageParts = originalMessage.split('|');
    const expectedParts = isLegacyFormat ? 2 : 3;
    if (messageParts.length !== expectedParts) {
      logs.push({
        level: 'error',
        message: 'Invalid message format',
        details: {
          expected: isLegacyFormat ? 'timestamp|domain' : 'timestamp|domain|expiration',
          foundParts: messageParts.length
        }
      });
      return result;
    }

    const signedDomain = messageParts[1];
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

// Main verification function adapted for API with improved DNS handling
export async function verifyProofApi(domain: string, lookupKey: string, expectedWallet?: string): Promise<ApiResponse> {
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
  if (!checkRateLimit(domain)) {
    logs.push({
      level: 'error',
      message: 'Rate limit exceeded',
      details: {
        maxRequests: RATE_LIMIT_MAX,
        windowMinutes: RATE_LIMIT_WINDOW / 60000
      }
    });
    response.message = 'Rate limit exceeded. Please try again later.';
    return response;
  }

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

  const recordName = `aqua._${actualLookupKey}.${actualDomain}`;
  response.domain = actualDomain;

  logs.push({
    level: 'info',
    message: 'Starting DNS verification',
    details: {
      domain: actualDomain,
      lookupKey: actualLookupKey,
      recordName: recordName,
      expectedWallet: expectedWallet,
      dnsServers: dns.getServers()
    }
  });

  try {
    // DNS Record Existence with improved fallback handling
    logs.push({
      level: 'info',
      message: 'Querying DNS records with multiple fallback methods',
      details: { recordName: recordName }
    });

    let txtRecords: string[][];
    let dnssecValidated = false;

    try {
      const result = await resolveTxtWithFallbacks(recordName);
      txtRecords = result.records;
      dnssecValidated = result.dnssecValidated;
      response.dnssecValidated = dnssecValidated;

      logs.push({
        level: 'success',
        message: 'DNS resolution successful',
        details: {
          recordCount: txtRecords.length,
          dnssecValidated: dnssecValidated
        }
      });
    } catch (dnsError) {
      logs.push({
        level: 'error',
        message: 'All DNS resolution methods failed',
        details: {
          error: dnsError instanceof Error ? dnsError.message : dnsError,
          recordName: recordName,
          dnsServers: dns.getServers()
        }
      });
      response.message = `DNS lookup failed for ${recordName}. This could be due to network restrictions in the server environment.`;
      return response;
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

    // Filter wallet records
    const walletRecords = txtRecords.flat().filter(record =>
      (record.includes('wallet=') &&
        record.includes('timestamp=') &&
        record.includes('expiration=') &&
        record.includes('sig=')) ||
      (record.includes('wallet=') &&
        record.includes('timestamp=') &&
        record.includes('sig='))
    );

    if (walletRecords.length === 0) {
      logs.push({
        level: 'error',
        message: 'No wallet records with required format found',
        details: {
          expected: 'wallet=...&timestamp=...&expiration=...&sig=...',
          foundRecords: txtRecords.flat()
        }
      });
      response.message = 'No valid wallet records found';
      return response;
    }

    response.totalRecords = walletRecords.length;
    logs.push({
      level: 'success',
      message: `Found ${walletRecords.length} wallet record(s) with valid format`
    });

    // Check if expected wallet exists (if specified)
    if (expectedWallet) {
      const expectedWalletFound = walletRecords.some(record => {
        const parsed = parseTxtRecord(record);
        return parsed.wallet && parsed.wallet.toLowerCase() === expectedWallet.toLowerCase();
      });

      if (!expectedWalletFound) {
        const availableWallets = walletRecords.map(record => {
          const parsed = parseTxtRecord(record);
          return parsed.wallet;
        }).filter(Boolean);

        logs.push({
          level: 'error',
          message: 'Expected wallet not found',
          details: {
            expectedWallet: expectedWallet,
            availableWallets: availableWallets
          }
        });
        response.message = `Expected wallet ${expectedWallet} not found in records`;
        return response;
      }

      logs.push({
        level: 'success',
        message: `Expected wallet ${expectedWallet} found in records`
      });
    }

    // Process each wallet record
    for (let i = 0; i < walletRecords.length; i++) {
      const record = walletRecords[i];

      if (expectedWallet) {
        const parsed = parseTxtRecord(record);
        if (!parsed.wallet || parsed.wallet.toLowerCase() !== expectedWallet.toLowerCase()) {
          continue;
        }
      }

      const result = await verifySingleRecord(record, actualDomain, recordName, i + 1, dnssecValidated, logs);
      response.results.push(result);

      if (result.success) {
        response.verifiedRecords++;

        if (expectedWallet) {
          break;
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