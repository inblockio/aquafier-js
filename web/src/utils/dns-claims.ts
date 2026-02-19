import { DNSProof } from '@/types/types'

export function generateProofFromSignature(domain: string, walletAddress: string, timestamp: string, expiration: string, signature: string): DNSProof {
      return {
            walletAddress,
            domainName: domain,
            timestamp,
            expiration,
            signature
      };
}

export function formatTxtRecord(proof: DNSProof): string {
      return `wallet=${proof.walletAddress}&timestamp=${proof.timestamp}&expiration=${proof.expiration}&sig=${proof.signature}`;
}

export interface AquaTreeClaim {
      forms_unique_id: string;
      forms_claim_secret: string;
      forms_txt_name: string;
      forms_txt_record: string;
      forms_wallet_address: string;
      forms_domain: string;
      forms_type: string;
      signature_type: string;
      itime: string;
      etime: string;
      sig: string;
      public_association: boolean;
}

// Generate random 8-char hex ID using crypto for security
export function generateUniqueId(): string {
      const array = new Uint8Array(4);
      crypto.getRandomValues(array);
      return Array.from(array)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
}

// Generate random 16-char hex secret (for private mode)
export function generateClaimSecret(): string {
      const array = new Uint8Array(8);
      crypto.getRandomValues(array);
      return Array.from(array)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
}

// Format TXT record based on mode (private or public)
export function formatClaimTxtRecord(
      uniqueId: string,
      itime: number,
      etime: number,
      signature: string,
      walletAddress?: string
): string {
      if (walletAddress) {
            // Public mode: include wallet address in record
            return `id=${uniqueId}&wallet=${walletAddress}&itime=${itime}&etime=${etime}&sig=${signature}`;
      }
      // Private mode: no wallet in record
      return `id=${uniqueId}&itime=${itime}&etime=${etime}&sig=${signature}`;
}

// Main DNS claim generation function
export async function generateDNSClaim(
      domain: string,
      walletAddress: string,
      signMessageFunction: (message: string) => Promise<string>,
      expirationDays: number = 90,
      publicAssociation: boolean = false
): Promise<AquaTreeClaim> {
      const uniqueId = generateUniqueId();
      const claimSecret = publicAssociation ? '' : generateClaimSecret();
      const messagePrefix = publicAssociation ? walletAddress : claimSecret;

      const itime = Math.floor(Date.now() / 1000);
      const etime = itime + expirationDays * 86400;

      // Message format: {prefix}&{itime}&{domain}&{etime}
      // Private mode: {secret}&{itime}&{domain}&{etime}
      // Public mode: {wallet}&{itime}&{domain}&{etime}
      const message = `${messagePrefix}&${itime}&${domain}&${etime}`;
      const signature = await signMessageFunction(message);

      const txtName = `_aw.${domain}`;

      return {
            forms_unique_id: uniqueId,
            forms_claim_secret: claimSecret,
            forms_txt_name: txtName,
            forms_txt_record: formatClaimTxtRecord(
                  uniqueId,
                  itime,
                  etime,
                  signature,
                  publicAssociation ? walletAddress : undefined
            ),
            forms_wallet_address: walletAddress,
            forms_domain: domain,
            forms_type: 'dns_claim',
            signature_type: 'ethereum:eip-191',
            itime: itime.toString(),
            etime: etime.toString(),
            sig: signature,
            public_association: publicAssociation
      };
}

export async function digTxtRecords(domain: string): Promise<string[]> {
      try {
            // Using Google's DNS-over-HTTPS API
            const response = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=TXT`)
            const data = await response.json()

            if (!data.Answer) {
                  return []
            }

            // Extract TXT records from the response
            return data.Answer
      } catch (error) {
            console.error('Error fetching DNS TXT records:', error)
            return []
      }
}

export async function digTxtRecordsGoogle(domain: string): Promise<string[]> {
      try {
            const response = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=TXT`, {
                  headers: {
                        Accept: 'application/json',
                  },
            })

            if (!response.ok) {
                  throw new Error(`DNS query failed: ${response.statusText}`)
            }

            const data = await response.json()

            if (data.Status !== 0) {
                  throw new Error(`DNS query failed with status: ${data.Status}`)
            }

            const txtRecords: string[] = []
            if (data.Answer) {
                  for (const record of data.Answer) {
                        if (record.type === 16) {
                              // TXT record type
                              // Remove quotes from the TXT record data
                              const cleanData = record.data.replace(/^"|"$/g, '')
                              txtRecords.push(cleanData)
                        }
                  }
            }

            return txtRecords
      } catch (error: any) {
            throw new Error(`Failed to lookup TXT records for ${domain}: ${error.message}`)
      }
}

export const extractDNSClaimInfo = (
      record: string
): {
      walletAddress: string
      timestamp: number
      expiration: number
      signature: string
} => {
      const [walletAddress, timestamp, expiration, signature] = record.split('&').map(e => e.split('=')[1])
      return {
            walletAddress,
            timestamp: Number(timestamp),
            expiration: Number(expiration),
            signature,
      }
}
