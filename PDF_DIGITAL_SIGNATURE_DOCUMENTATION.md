# PDF Digital Signature Implementation

## Overview

This document describes the PDF digital signature implementation for the Aquafier platform (dev.inblock.io). The implementation creates PAdES-compliant digital signatures that are detectable by Adobe Acrobat and other PDF readers.

## Current Implementation

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SignerPage.tsx                           │
│                    or EasyPDFRenderer.tsx                       │
├─────────────────────────────────────────────────────────────────┤
│  1. User adds signature overlays to PDF                         │
│  2. User clicks "Download"                                      │
│  3. Annotations are embedded using pdf-lib                      │
│  4. Digital signature is applied via signPdfWithAquafier()      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  pdf-digital-signature.ts                       │
├─────────────────────────────────────────────────────────────────┤
│  • Generates self-signed X.509 certificate (node-forge)         │
│  • Creates SHA-256 document hash (Web Crypto API)               │
│  • Creates PKCS#7 detached signature                            │
│  • Embeds signature dictionary in PDF (pdf-lib)                 │
│  • Adds signature metadata and annotations                      │
└─────────────────────────────────────────────────────────────────┘
```

### Files

| File | Purpose |
|------|---------|
| `web/src/utils/pdf-digital-signature.ts` | Core digital signature module |
| `web/src/pages/aqua_sign_wokflow/ContractDocument/signer/SignerPage.tsx` | PDF signing UI component |

### Dependencies

```json
{
  "node-forge": "^1.x.x",
  "pdf-lib": "^1.x.x"
}
```

### Current Features

1. **Self-Signed Certificates**: Generates unique X.509 certificates per signer
2. **PKCS#7 Signatures**: Creates standard detached signatures
3. **SHA-256 Hashing**: Uses Web Crypto API for efficient document hashing
4. **PDF Metadata**: Embeds comprehensive signature information
5. **Adobe Detection**: Signatures are visible in Adobe Acrobat's signature panel

### Signature Metadata Embedded

| Field | Description |
|-------|-------------|
| `SignedBy` | Signer's name |
| `SignerWallet` | Blockchain wallet address |
| `SignatureReason` | Reason for signing |
| `SignatureLocation` | Platform URL |
| `SignatureDate` | Timestamp (PDF format) |
| `SignaturePlatform` | "Aquafier" |
| `SignaturePlatformURL` | https://dev.inblock.io |
| `DocumentHash` | SHA-256 hash of original document |
| `CertificateFingerprint` | SHA-256 fingerprint of signing certificate |
| `DocumentURL` | URL where the PDF can be accessed |
| `VerificationURL` | URL for signature verification |

### Current Limitations

- **Self-signed certificates are not trusted by default** in Adobe Acrobat
- Users see "Signature validity is UNKNOWN" warning
- Manual trust addition required for each signer's certificate

---

## Certificate Integration Guide

### When to Purchase a Certificate

Purchase a document signing certificate when you need:
- Automatic trust in Adobe Acrobat without user intervention
- Legal compliance (eIDAS, ESIGN Act, etc.)
- Enterprise/B2B document workflows
- Public-facing signed documents

### Recommended Certificate Authorities (AATL-Approved)

| Provider | Type | Approximate Cost | Notes |
|----------|------|------------------|-------|
| DigiCert | Document Signing | $500-800/year | Industry leader, excellent support |
| GlobalSign | AATL Certificate | $300-500/year | Good for high volume |
| Sectigo | Document Signing | $200-400/year | Cost-effective option |
| SSL.com | Document Signing | $250-400/year | Good API support |

### Certificate Requirements

Your certificate must have:
- **Key Usage**: Digital Signature, Non-Repudiation
- **Extended Key Usage**: Document Signing (1.3.6.1.4.1.311.10.3.12)
- **AATL Membership**: Certificate chain trusted by Adobe

### Integration Steps

#### Step 1: Purchase and Obtain Certificate

1. Choose a CA from the AATL list
2. Complete organization validation (OV) or extended validation (EV)
3. Receive certificate files:
   - `certificate.pem` (or `.crt`) - Your signing certificate
   - `private-key.pem` (or `.key`) - Private key (KEEP SECURE!)
   - `ca-chain.pem` - Intermediate CA certificates

#### Step 2: Secure Storage

**Option A: Environment Variables (Simple)**
```bash
# .env (NEVER commit to git!)
PDF_SIGNING_CERT="-----BEGIN CERTIFICATE-----\n..."
PDF_SIGNING_KEY="-----BEGIN PRIVATE KEY-----\n..."
PDF_CA_CHAIN="-----BEGIN CERTIFICATE-----\n..."
```

**Option B: Cloud Key Management (Recommended for Production)**
- AWS KMS / AWS Secrets Manager
- Google Cloud KMS
- Azure Key Vault
- HashiCorp Vault

#### Step 3: Update pdf-digital-signature.ts

Replace the `generateCertificate` function with certificate loading:

```typescript
// Add these imports
import forge from 'node-forge';

// Certificate storage interface
interface CertificateStore {
  certificate: forge.pki.Certificate;
  privateKey: forge.pki.PrivateKey;
  caChain: forge.pki.Certificate[];
}

// Global certificate store (loaded once at startup)
let platformCertificate: CertificateStore | null = null;

/**
 * Load the platform's CA-signed certificate
 * Call this once during application initialization
 */
export function loadPlatformCertificate(
  certPem: string,
  keyPem: string,
  caChainPem: string
): void {
  try {
    // Parse certificate
    const certificate = forge.pki.certificateFromPem(certPem);

    // Parse private key
    const privateKey = forge.pki.privateKeyFromPem(keyPem);

    // Parse CA chain
    const caChain: forge.pki.Certificate[] = [];
    const caMatches = caChainPem.match(
      /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g
    );
    if (caMatches) {
      for (const caPem of caMatches) {
        caChain.push(forge.pki.certificateFromPem(caPem));
      }
    }

    platformCertificate = {
      certificate,
      privateKey,
      caChain,
    };

    console.log('Platform certificate loaded successfully');
    console.log('Certificate Subject:', certificate.subject.getField('CN').value);
    console.log('Valid Until:', certificate.validity.notAfter);
  } catch (error) {
    console.error('Failed to load platform certificate:', error);
    throw new Error('Certificate loading failed');
  }
}

/**
 * Get the platform certificate for signing
 * Falls back to self-signed if no CA certificate is loaded
 */
function getCertificateForSigning(signerInfo: SignerInfo): {
  certificate: forge.pki.Certificate;
  privateKey: forge.pki.PrivateKey;
  caChain?: forge.pki.Certificate[];
} {
  if (platformCertificate) {
    // Use the CA-signed platform certificate
    return {
      certificate: platformCertificate.certificate,
      privateKey: platformCertificate.privateKey,
      caChain: platformCertificate.caChain,
    };
  }

  // Fallback to self-signed certificate
  console.warn('Using self-signed certificate - signatures will not be trusted by default');
  const { certificate, privateKey } = generateSelfSignedCertificate(signerInfo);
  return { certificate, privateKey };
}

/**
 * Generate a self-signed certificate (fallback)
 */
function generateSelfSignedCertificate(signerInfo: SignerInfo): {
  certificate: forge.pki.Certificate;
  privateKey: forge.pki.PrivateKey;
} {
  // ... existing generateCertificate code ...
}
```

#### Step 4: Update PKCS#7 Signature Creation

Include the CA chain in the signature:

```typescript
function createPkcs7Signature(
  dataHash: string,
  certificate: forge.pki.Certificate,
  privateKey: forge.pki.PrivateKey,
  caChain?: forge.pki.Certificate[]
): string {
  const p7 = forge.pkcs7.createSignedData();

  // Add signing certificate
  p7.addCertificate(certificate);

  // Add CA chain certificates for trust validation
  if (caChain) {
    for (const caCert of caChain) {
      p7.addCertificate(caCert);
    }
  }

  // ... rest of signature creation ...
}
```

#### Step 5: Initialize Certificate on Server Start

```typescript
// In your app initialization (e.g., main.tsx or a startup script)
import { loadPlatformCertificate } from '@/utils/pdf-digital-signature';

// Load from environment variables
const certPem = import.meta.env.VITE_PDF_SIGNING_CERT;
const keyPem = import.meta.env.VITE_PDF_SIGNING_KEY;
const caChainPem = import.meta.env.VITE_PDF_CA_CHAIN;

if (certPem && keyPem && caChainPem) {
  loadPlatformCertificate(certPem, keyPem, caChainPem);
} else {
  console.warn('PDF signing certificate not configured - using self-signed certificates');
}
```

#### Step 6: Server-Side Signing (Recommended for Production)

For production, move signing to the backend to protect the private key:

```typescript
// Backend API endpoint (Node.js/Express example)
app.post('/api/sign-pdf', async (req, res) => {
  const { pdfBase64, signerName, walletAddress, documentUrl } = req.body;

  const pdfBytes = Buffer.from(pdfBase64, 'base64');

  const { signedPdf, signatureInfo } = await signPdfWithAquafier(
    new Uint8Array(pdfBytes),
    signerName,
    walletAddress,
    [],
    documentUrl
  );

  res.json({
    signedPdfBase64: Buffer.from(signedPdf).toString('base64'),
    signatureInfo,
  });
});

// Frontend calls the API instead of signing locally
async function downloadSignedPdf() {
  const response = await fetch('/api/sign-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pdfBase64: arrayBufferToBase64(pdfBytes),
      signerName: primarySigner.name,
      walletAddress: primarySigner.walletAddress,
      documentUrl: documentUrl,
    }),
  });

  const { signedPdfBase64 } = await response.json();
  // Download the signed PDF...
}
```

---

## Testing Signed PDFs

### Adobe Acrobat Verification

1. Open the signed PDF in Adobe Acrobat
2. Click on the signature panel (left sidebar)
3. Click on the signature to see details
4. Check "Signature Properties" for:
   - Signer name
   - Signing time
   - Reason
   - Certificate details

### Expected Results

**With Self-Signed Certificate:**
- Signature is detected
- Shows "Signature validity is UNKNOWN"
- Certificate shows "This certificate is not trusted"

**With CA-Signed Certificate:**
- Signature is detected
- Shows "Signature is valid"
- Certificate shows trust chain to root CA

### Verification Checklist

- [ ] Signature appears in Adobe's signature panel
- [ ] Signer name is correct
- [ ] Signing time is accurate
- [ ] Reason includes platform name
- [ ] Document hash can be verified
- [ ] Certificate details are visible

---

## Security Considerations

### Private Key Protection

1. **Never commit private keys to version control**
2. **Use environment variables or secure vaults**
3. **Rotate certificates before expiration**
4. **Monitor certificate usage and revocation status**

### Certificate Renewal

Set up monitoring for certificate expiration:

```typescript
function checkCertificateExpiration(): void {
  if (!platformCertificate) return;

  const expirationDate = platformCertificate.certificate.validity.notAfter;
  const daysUntilExpiration = Math.floor(
    (expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilExpiration <= 30) {
    console.warn(`Certificate expires in ${daysUntilExpiration} days!`);
    // Send alert to admin
  }
}
```

---

## API Reference

### signPdfWithAquafier

```typescript
function signPdfWithAquafier(
  pdfBytes: Uint8Array,
  signerName: string,
  walletAddress: string,
  additionalSigners?: Array<{ name: string; walletAddress: string }>,
  documentUrl?: string
): Promise<DigitalSignatureResult>
```

**Parameters:**
- `pdfBytes`: The PDF document as Uint8Array
- `signerName`: Primary signer's display name
- `walletAddress`: Signer's blockchain wallet address
- `additionalSigners`: Optional array of additional signers
- `documentUrl`: Optional URL where the document can be accessed

**Returns:**
```typescript
interface DigitalSignatureResult {
  signedPdf: Uint8Array;
  signatureInfo: {
    signedAt: Date;
    signer: string;
    reason: string;
    platform: string;
    certificateFingerprint: string;
  };
}
```

### extractSignatureInfo

```typescript
function extractSignatureInfo(
  pdfBytes: Uint8Array
): Promise<{
  hasSig: boolean;
  signerName?: string;
  reason?: string;
  signedAt?: string;
  platform?: string;
  walletAddress?: string;
  documentHash?: string;
}>
```

Extracts signature metadata from a signed PDF.

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Maximum call stack size exceeded" | Large PDF with node-forge | Use Web Crypto API for hashing (already implemented) |
| "Invalid PDF structure" | Incompatible PDF format | Use pdf-lib for all PDF manipulation |
| Signature not visible in Adobe | Missing AcroForm | Ensure AcroForm is created with signature field |
| Certificate chain incomplete | Missing CA certificates | Include full chain in PKCS#7 signature |

### Debug Logging

Enable debug logging in the signature module:

```typescript
const DEBUG = true;

function debugLog(...args: any[]) {
  if (DEBUG) console.log('[PDF-SIGN]', ...args);
}
```

---

## Changelog

### v1.0.0 (2026-01-28)
- Initial implementation with self-signed certificates
- PKCS#7 detached signatures
- Adobe Acrobat detection support
- PDF metadata embedding
- Document URL support

---

## Contact

For questions about this implementation:
- Platform: https://dev.inblock.io
- Documentation: This file
