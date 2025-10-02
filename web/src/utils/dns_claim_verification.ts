import {ethers} from "ethers";
import { digTxtRecordsGoogle } from "./url.utils";
import { TxtRecord } from "@/types/types";



async function resolveTxt(hostname: string): Promise<string[]> {
  const result = digTxtRecordsGoogle(hostname)
  return result
}

function parseTxtRecord(txt: string): TxtRecord {
    // Use standard URLSearchParams for robust URL parameter parsing
    const params = new URLSearchParams(txt);
  
    return {
      wallet: params.get('wallet') || '',
      timestamp: params.get('timestamp') || '',
      expiration: params.get('expiration') || '',
      sig: params.get('sig') || ''
    };
  }

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 10; // Max requests per window
const RATE_LIMIT_WINDOW = 60000; // 1 minute window

// DNSSEC validation using DNS.resolveAny with AD flag
// async function resolveTxtWithDNSSEC(domain: string): Promise<{ records: string[][]; dnssecValidated: boolean }> {
//   return new Promise((resolve, reject) => {
//     const resolver = new dns.Resolver();

//     // Enable DNSSEC validation by requesting AD (Authenticated Data) flag
//     resolver.setServers(resolver.getServers());

//     // Use resolve4 with options to check DNSSEC
//     resolver.resolve4(domain.replace('aqua._wallet.', ''), { ttl: true }, (err, _addresses) => {
//       if (err && err.code !== 'ENODATA' && err.code !== 'ENOTFOUND') {
//         // Check if we can get basic DNS resolution for the parent domain
//         resolver.resolveTxt(domain, (txtErr, txtRecords) => {
//           if (txtErr) {
//             reject(txtErr);
//           } else {
//             // We got TXT records but couldn't verify DNSSEC
//             resolve({ records: txtRecords, dnssecValidated: false });
//           }
//         });
//       } else {
//         // Now get the actual TXT records
//         resolver.resolveTxt(domain, (txtErr, txtRecords) => {
//           if (txtErr) {
//             reject(txtErr);
//           } else {
//             // Simple DNSSEC check: if parent domain resolves, we have basic validation
//             resolve({ records: txtRecords, dnssecValidated: true });
//           }
//         });
//       }
//     });
//   });
// }

async function resolveTxtWithDNSSEC(domain: string): Promise<{ records: string[][]; dnssecValidated: boolean }> {
  try {
    // Use Cloudflare DoH API with DNSSEC validation
    const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=TXT&do=true&cd=false`, {
      headers: {
        'Accept': 'application/dns-json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Check DNSSEC status
    const dnssecValidated = data.AD === true; // AD flag indicates DNSSEC validation
    const hasRcode = data.Status === 0; // NOERROR status
    
    if (!hasRcode) {
      throw new Error(`DNS query failed with status: ${data.Status}`);
    }

    // Extract TXT records
    const txtRecords: string[][] = [];
    if (data.Answer) {
      for (const answer of data.Answer) {
        if (answer.type === 16) { // TXT record type
          // Parse TXT data (remove quotes and split if needed)
          const txtData = answer.data.replace(/^"|"$/g, '');
          txtRecords.push([txtData]);
        }
      }
    }

    return {
      records: txtRecords,
      dnssecValidated
    };

  } catch (error: any) {
    throw new Error(`DNSSEC validation failed: ${error.message}`);
  }
}


// Rate limiting check
function checkRateLimit(identifier: string): boolean {
    const now = Date.now();
    const limit = rateLimitMap.get(identifier);
  
    if (!limit || now > limit.resetTime) {
      // New window
      rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
      return true;
    }
  
    if (limit.count >= RATE_LIMIT_MAX) {
      return false;
    }
  
    limit.count++;
    return true;
  }


interface ILog {
    content: string,
    type: "error" | "success" | "warning" | "info"
  }
  
  export async function verifyProofV2(domain: string, lookupKey: string): Promise<ILog[]> {
    const logs: ILog[] = []
    // Rate limiting by domain
    if (!checkRateLimit(domain)) {
      logs.push({
        content: `⚠️ Rate limit exceeded. Please try again later. \n ℹ️ Maximum ${RATE_LIMIT_MAX} verifications per minute per domain`,
        type: 'error'
      })
      return logs;
    }
  
    const recordName = `aqua._${lookupKey}.${domain}`;
    // const recordName = domain
    let testsPassed = 0;
    let totalTests = 0;
  
    logs.push({
      content: `🔍 Starting verification tests for domain ${domain}`,
      type: 'info'
    })
  
    // Test 1: DNS Record Existence with DNSSEC
    totalTests++;
    logs.push({
      content: `Test 1/8: DNS Record Existence & DNSSEC Validation`,
      type: 'info'
    })
    logs.push({
      content: `   Querying: ${recordName}`,
      type: 'info'
    })
  
    try {
      let txtRecords: string[] = [];
      let dnssecValidated = false;
      const result = await resolveTxtWithDNSSEC(recordName);

        try {
        // txtRecords = result.records;
        dnssecValidated = result.dnssecValidated;
      } catch (dnssecError) {
        // Fallback to regular DNS if DNSSEC check fails
        logs.push({
          content: '   ⚠️  DNSSEC validation not available, falling back to standard DNS',
          type: 'warning'
        })
        txtRecords = await resolveTxt(recordName);
        dnssecValidated = false;
      }
  
      // if (!txtRecords || txtRecords.length === 0) {
      //   logs.push({
      //     content: '❌ FAIL: No TXT records found at this location',
      //     type: 'error'
      //   })
      //   logs.push({
      //     content: `ℹ️  Expected: TXT record at ${recordName}`,
      //     type: 'info'
      //   })
      //   logs.push({
      //     content: `ℹ️  Found: No records`,
      //     type: 'info'
      //   })
      //   return logs;
      // }
  
      logs.push({
        content: `✅ PASS: Found ${txtRecords.length} TXT record(s)`,
        type: 'success'
      })
      if (dnssecValidated) {
        logs.push({
          content: '🔒 DNSSEC: Validated',
          type: 'success'
        })
      } else {
        logs.push({
          content: '⚠️  DNSSEC: Not validated (DNS responses may be spoofed)',
          type: 'warning'
        })
      }
      testsPassed++;
  
      // Test 2: Wallet Record Format
      totalTests++;
      logs.push({
        content: `Test 2/8: Wallet Record Format`,
        type: 'info'
      })
  
      // Check for new format first (with expiration)
      let txtRecord = txtRecords.flat().find(record =>
        record.includes('wallet=') &&
        record.includes('timestamp=') &&
        record.includes('expiration=') &&
        record.includes('sig=')
      );

        let isLegacyFormat = false;
  
      // Fallback to legacy format (without expiration)
      if (!txtRecord) {
        txtRecord = txtRecords.flat().find(record =>
          record.includes('wallet=') &&
          record.includes('timestamp=') &&
          record.includes('sig=')
        );
        if (txtRecord) {
          isLegacyFormat = true;
          logs.push({
            content: '⚠️  WARNING: Legacy format detected (no expiration field)',
            type: 'warning'
          })
          logs.push({
            content: 'ℹ️  Please regenerate your signature for enhanced security',
            type: 'info'
          })
        }
      }
  
      if (!txtRecord) {
        logs.push({
          content: '❌ FAIL: No wallet record with required format found',
          type: 'error'
        })
        logs.push({
          content: 'ℹ️  Expected: wallet=...&timestamp=...&expiration=...&sig=...',
          type: 'info'
        })
        logs.push({
          content: 'ℹ️  Found: ' + txtRecords.flat(),
          type: 'info'
        })
        return logs;
      }
  
      logs.push({
        content: '✅ PASS: Valid wallet record format found',
        type: 'success'
      })
      logs.push({
        content: '📋 Record: ' + txtRecord.substring(0, 80) + '...',
        type: 'info'
      })
      testsPassed++;
  
      // Test 3: Field Parsing
      totalTests++;
      logs.push({
        content: `Test 3/8: Field Parsing`,
        type: 'info'
      })
  
      const parsedRecord = parseTxtRecord(txtRecord);
  
      // For legacy format, set a default expiration (90 days from timestamp)
      if (isLegacyFormat && parsedRecord.timestamp && !parsedRecord.expiration) {
        parsedRecord.expiration = (parseInt(parsedRecord.timestamp) + (90 * 24 * 60 * 60)).toString();
        logs.push({
          content: 'ℹ️  Legacy format: Using default 90-day expiration',
          type: 'info'
        })
      }
  
      if (!parsedRecord.wallet || !parsedRecord.timestamp || !parsedRecord.expiration || !parsedRecord.sig) {
        logs.push({
          content: '❌ FAIL: Missing required fields after parsing',
          type: 'error'
        })
        logs.push({
          content: 'ℹ️  Required: wallet, timestamp, expiration, sig',
          type: 'info'
        })
        logs.push({
          content: 'ℹ️  Parsed: ' + parsedRecord,
          type: 'info'
        })
        return logs;
      }
  
      logs.push({
        content: '✅ PASS: All required fields parsed successfully',
        type: 'success'
      })
      logs.push({
        content: `ℹ️  Wallet: ${parsedRecord.wallet}`,
        type: 'info'
      })
      logs.push({
        content: `ℹ️  Timestamp: ${parsedRecord.timestamp}`,
        type: 'info'
      })
      logs.push({
        content: `ℹ️  Expiration: ${parsedRecord.expiration}`,
        type: 'info'
      })
      logs.push({
        content: `ℹ️  Signature: ${parsedRecord.sig.substring(0, 20)}...`,
        type: 'info'
      })
      testsPassed++;
  
      // Test 4: Message Format & EIP-191 Preparation
      totalTests++;
      logs.push({
        content: `Test 4/8: Message Format & EIP-191 Preparation`,
        type: 'info'
      })
  
      // Reconstruct the original message (before EIP-191 formatting)
      const originalMessage = isLegacyFormat
        ? `${parsedRecord.timestamp}|${domain}`
        : `${parsedRecord.timestamp}|${domain}|${parsedRecord.expiration}`;
      logs.push({
        content: `📝 Expected format: "timestamp|domain|expiration"`,
        type: 'info'
      })
      logs.push({
        content: `ℹ️  Message to verify: "${originalMessage}"`,
        type: 'info'
      })
      logs.push({
        content: `ℹ️  EIP-191 Note: ethers.js handles automatic EIP-191 formatting`,
        type: 'info'
      })
      logs.push({
        content: '✅ PASS: Message prepared for verification',
        type: 'success'
      })
      testsPassed++;
  
      // Test 5: Timestamp Validity
      totalTests++;
      logs.push({
        content: `Test 5/8: Timestamp Validity`,
        type: 'info'
      })
  
      const timestamp = parseInt(parsedRecord.timestamp);
      const timestampDate = new Date(timestamp * 1000);
      const now = new Date();
      const ageMs = now.getTime() - timestampDate.getTime();
      const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  
      if (isNaN(timestamp) || timestamp <= 0) {
        logs.push({
          content: '❌ FAIL: Invalid timestamp format',
          type: 'error'
        })
        logs.push({
          content: `ℹ️  Expected: Valid Unix timestamp`,
          type: 'info'
        })
        logs.push({
          content: `ℹ️  Found: ${parsedRecord.timestamp}`,
          type: 'info'
        })
        return logs;
      }
  
      // Check for future timestamps (clock skew attack)
      if (timestamp > Math.floor(now.getTime() / 1000) + 300) { // 5 min tolerance
        logs.push({
          content: '❌ FAIL: Timestamp is in the future',
          type: 'error'
        })
        logs.push({
          content: '🚨 Possible clock manipulation attack',
          type: 'warning'
        })
        return logs;
      }
  
      logs.push({
        content: '✅ PASS: Valid timestamp format',
        type: 'success'
      })
      logs.push({
        content: `ℹ️  Signature created: ${timestampDate.toISOString()}`,
        type: 'info'
      })
      logs.push({
        content: `ℹ️  Age: ${ageDays} days`,
        type: 'info'
      })
      testsPassed++;
  
      // Test 6: Expiration Date Check
      totalTests++;
      logs.push({
        content: `Test 6/8: Expiration Date Validation`,
        type: 'info'
      })
  
      const expiration = parseInt(parsedRecord.expiration);
      const expirationDate = new Date(expiration * 1000);
      const nowTimestamp = Math.floor(now.getTime() / 1000);
  
      if (isNaN(expiration) || expiration <= 0) {
        logs.push({
          content: '❌ FAIL: Invalid expiration format',
          type: 'error'
        })
        logs.push({
          content: `ℹ️  Expected: Valid Unix timestamp`,
          type: 'info'
        })
        logs.push({
          content: `ℹ️  Found: ${parsedRecord.expiration}`,
          type: 'info'
        })
        return logs;
      }
  
      if (expiration <= timestamp) {
        logs.push({
          content: '❌ FAIL: Expiration date is before creation date',
          type: 'error'
        })
        logs.push({
          content: `ℹ️  Created: ${timestampDate.toISOString()}`,
          type: 'info'
        })
        logs.push({
          content: `ℹ️  Expires: ${expirationDate.toISOString()}`,
          type: 'info'
        })
        return logs;
      }
  
      if (expiration < nowTimestamp) {
        logs.push({
          content: '❌ FAIL: Signature has expired',
          type: 'error'
        })
        logs.push({
          content: `ℹ️  Expired on: ${expirationDate.toISOString()}`,
          type: 'info'
        })
        logs.push({
          content: `ℹ️  Current time: ${now.toISOString()}`,
          type: 'info'
        })
        logs.push({
          content: 'ℹ️  Please generate a new signature',
          type: 'info'
        })
        return logs;
      }
  
      const daysUntilExpiration = Math.floor((expiration - nowTimestamp) / (60 * 60 * 24));
      logs.push({
        content: '✅ PASS: Signature is not expired',
        type: 'success'
      })
      logs.push({
        content: `ℹ️  Expires: ${expirationDate.toISOString()}`,
        type: 'info'
      })
      logs.push({
        content: `ℹ️  Valid for: ${daysUntilExpiration} more days`,
        type: 'info'
      })
      testsPassed++;
  
      // Test 7: Cryptographic Signature Verification (EIP-191 Compliant)
      totalTests++;
      logs.push({
        content: `Test 7/8: Cryptographic Signature Verification (EIP-191 Compliant)`,
        type: 'info'
      })
      logs.push({
        content: `   🔐 Verifying EIP-191 signature for: "${originalMessage}"`,
        type: 'info'
      })
  
      try {
        // ethers.utils.verifyMessage handles EIP-191 formatting automatically:
        // It applies: "\x19Ethereum Signed Message:\n" + len(message) + message
        // This matches MetaMask's personal_sign behavior (EIP-191 version 0x45)
        const recoveredAddress = ethers.verifyMessage(originalMessage, parsedRecord.sig);
  
        logs.push({
          content: `ℹ️  Expected wallet: ${parsedRecord.wallet}`,
          type: 'info'
        })
        logs.push({
          content: `ℹ️  Recovered address: ${recoveredAddress}`,
          type: 'info'
        })
  
        if (recoveredAddress.toLowerCase() === parsedRecord.wallet.toLowerCase()) {
          logs.push({
            content: '✅ PASS: Signature verification successful',
            type: 'success'
          })
          logs.push({
            content: '🔐 The signature was created by the claimed wallet address',
            type: 'success'
          })
          testsPassed++;
  
          // Test 8: Domain Consistency Check (after signature verification)
          totalTests++;
          logs.push({
            content: `Test 8/8: Domain Consistency Check`,
            type: 'info'
          })
          logs.push({
            content: `🔍 Verifying the signed domain matches the queried domain`,
            type: 'info'
          })
  
          // Extract the domain from the verified message
          const messageParts = originalMessage.split('|');
          const expectedParts = isLegacyFormat ? 2 : 3;
          if (messageParts.length !== expectedParts) {
            logs.push({
              content: '❌ FAIL: Invalid message format',
              type: 'error'
            })
            logs.push({
              content: `ℹ️  Expected: ${isLegacyFormat ? 'timestamp|domain' : 'timestamp|domain|expiration'}`,
              type: 'info'
            })
            logs.push({
              content: `ℹ️  Found: ${messageParts.length} parts`,
              type: 'info'
            })
            return logs;
          }
  
          const signedDomain = messageParts[1];
          logs.push({
            content: `ℹ️  Domain being queried: ${domain}`,
            type: 'info'
          })
          logs.push({
            content: `ℹ️  Domain in signed message: ${signedDomain}`,
            type: 'info'
          })
          logs.push({
            content: `ℹ️  DNS record location: ${recordName}`,
            type: 'info'
          })
  
          if (signedDomain !== domain) {
            logs.push({
              content: '❌ FAIL: Domain mismatch!',
              type: 'error'
            })
            logs.push({
              content: '🚨 The signature is valid but was created for a different domain',
              type: 'warning'
            })
            logs.push({
              content: `ℹ️  This could indicate the DNS record was copied from another domain`,
              type: 'info'
            })
            return logs;
          }
  
          logs.push({
            content: '✅ PASS: Domain consistency verified',
            type: 'success'
          })
          logs.push({
            content: '🔐 The signature was specifically created for this domain',
            type: 'success'
          })
          testsPassed++;
  
          // Final Summary
          logs.push({
            content: `\n🎉 VERIFICATION COMPLETE: ${testsPassed}/${totalTests} tests passed`,
            type: 'success'
          })
          logs.push({
            content: '✅ All verification tests passed successfully!',
            type: 'success'
          })
          logs.push({
            content: `✅ Wallet ${parsedRecord.wallet} is cryptographically linked to domain ${domain}`,
            type: 'success'
          })
          logs.push({
            content: `📅 Valid until: ${expirationDate.toISOString()}`,
            type: 'info'
          })
          if (!dnssecValidated) {
            logs.push({
              content: '⚠️  Note: DNSSEC was not validated for this query',
              type: 'warning'
            })
          }
  
          return logs;
        } else {
          logs.push({
            content: '❌ FAIL: Signature verification failed',
            type: 'error'
          })
          logs.push({
            content: '🚨 The signature was NOT created by the claimed wallet address',
            type: 'error'
          })
          logs.push({
            content: `ℹ️  Address mismatch: expected ${parsedRecord.wallet}, got ${recoveredAddress}`,
            type: 'info'
          })
        }
      } catch (error) {
        logs.push({
          content: '❌ FAIL: Signature verification error',
          type: 'error'
        })
        logs.push({
          content: `ℹ️  Error: ${error instanceof Error ? error.message : error}`,
          type: 'info'
        })
      }
  
    } catch (error) {
      logs.push({
        content: '❌ FAIL: DNS lookup error',
        type: 'error'
      })
      logs.push({
        content: `ℹ️  Error: ${error instanceof Error ? error.message : error}`,
        type: 'info'
      })
    }
  
    // Failed Summary
    logs.push({
      content: `\n❌ VERIFICATION FAILED: ${testsPassed}/${totalTests} tests passed`,
      type: 'error'
    })
    return logs;
  }