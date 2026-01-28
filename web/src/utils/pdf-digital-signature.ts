/**
 * PDF Digital Signature Module
 *
 * Implements digital signatures for PDF documents that are detectable
 * by Adobe Acrobat and other PDF readers.
 *
 * Platform: Aquafier (dev.inblock.io)
 */

import forge from 'node-forge';
import { PDFDocument, PDFName, PDFString, PDFHexString, PDFDict, PDFArray, PDFNumber } from 'pdf-lib';

// Platform identification
const PLATFORM_NAME = 'Aquafier';
const PLATFORM_URL = 'https://dev.inblock.io';

export interface SignerInfo {
  name: string;
  walletAddress: string;
  email?: string;
  location?: string;
}

export interface SignatureOptions {
  reason?: string;
  location?: string;
  contactInfo?: string;
  signerInfo: SignerInfo;
}

export interface DigitalSignatureResult {
  signedPdf: Uint8Array;
  signatureInfo: {
    signedAt: Date;
    signer: string;
    reason: string;
    platform: string;
    certificateFingerprint: string;
  };
}

/**
 * Generates a self-signed certificate for the signer
 */
function generateCertificate(signerInfo: SignerInfo): {
  certificate: forge.pki.Certificate;
  privateKey: forge.pki.PrivateKey;
  publicKey: forge.pki.PublicKey;
} {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();

  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01' + forge.util.bytesToHex(forge.random.getBytesSync(16));

  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  const attrs: forge.pki.CertificateField[] = [
    { name: 'commonName', value: signerInfo.name },
    { name: 'organizationName', value: PLATFORM_NAME },
    { shortName: 'OU', value: 'Digital Signing' },
  ];

  if (signerInfo.email) {
    attrs.push({ name: 'emailAddress', value: signerInfo.email });
  }

  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    {
      name: 'keyUsage',
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true,
    },
    {
      name: 'extKeyUsage',
      emailProtection: true,
      clientAuth: true,
    },
  ]);

  cert.sign(keys.privateKey, forge.md.sha256.create());

  return {
    certificate: cert,
    privateKey: keys.privateKey,
    publicKey: keys.publicKey,
  };
}

/**
 * Creates a hash of the document content using Web Crypto API
 * (more efficient for large files than node-forge)
 */
async function createDocumentHash(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Creates a PKCS#7 detached signature
 */
function createPkcs7Signature(
  dataHash: string,
  certificate: forge.pki.Certificate,
  privateKey: forge.pki.PrivateKey
): string {
  const p7 = forge.pkcs7.createSignedData();
  p7.addCertificate(certificate);

  // Create content info with the hash
  const hashBytes = forge.util.hexToBytes(dataHash);
  p7.content = forge.util.createBuffer(hashBytes);

  p7.addSigner({
    key: privateKey,
    certificate: certificate,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      {
        type: forge.pki.oids.contentType,
        value: forge.pki.oids.data,
      },
      {
        type: forge.pki.oids.messageDigest,
      },
      {
        type: forge.pki.oids.signingTime,
        value: new Date(),
      },
    ],
  });

  p7.sign({ detached: true });

  const asn1 = p7.toAsn1();
  const der = forge.asn1.toDer(asn1);
  return forge.util.bytesToHex(der.getBytes());
}

/**
 * Formats a date for PDF format (D:YYYYMMDDHHmmssZ)
 */
function formatPdfDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `D:${year}${month}${day}${hours}${minutes}${seconds}Z`;
}

/**
 * Adds digital signature metadata to a PDF document using pdf-lib.
 * This embeds signature information that can be detected by PDF readers.
 */
export async function signPdfDocument(
  pdfBytes: Uint8Array,
  options: SignatureOptions
): Promise<DigitalSignatureResult> {
  const signedAt = new Date();
  const { signerInfo } = options;

  // Generate certificate
  const { certificate, privateKey } = generateCertificate(signerInfo);

  // Get certificate fingerprint
  const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(certificate));
  const certFingerprint = forge.md.sha256
    .create()
    .update(certDer.getBytes())
    .digest()
    .toHex();

  const reason = options.reason || `Digitally signed via ${PLATFORM_NAME}`;
  const location = options.location || PLATFORM_URL;

  // Load the PDF
  const pdfDoc = await PDFDocument.load(pdfBytes, {
    ignoreEncryption: true,
    updateMetadata: false
  });

  // Create document hash (using Web Crypto API for efficiency)
  const documentHash = await createDocumentHash(pdfBytes);

  // Create PKCS#7 signature
  const pkcs7Signature = createPkcs7Signature(documentHash, certificate, privateKey);

  // Set PDF metadata with signature information
  pdfDoc.setTitle(pdfDoc.getTitle() || 'Signed Document');
  pdfDoc.setAuthor(signerInfo.name);
  pdfDoc.setSubject(`Digitally signed via ${PLATFORM_NAME}`);
  pdfDoc.setKeywords([
    PLATFORM_NAME,
    'digital-signature',
    'signed',
    signerInfo.walletAddress,
  ]);
  pdfDoc.setProducer(`${PLATFORM_NAME} Digital Signature Service (${PLATFORM_URL})`);
  pdfDoc.setCreator(`${PLATFORM_NAME}`);
  pdfDoc.setCreationDate(signedAt);
  pdfDoc.setModificationDate(signedAt);

  // Add custom metadata using the Info dictionary
  const infoDict = pdfDoc.context.lookup(pdfDoc.context.trailerInfo.Info);
  if (infoDict instanceof PDFDict) {
    // Add signature-related metadata
    infoDict.set(PDFName.of('SignedBy'), PDFString.of(signerInfo.name));
    infoDict.set(PDFName.of('SignerWallet'), PDFString.of(signerInfo.walletAddress));
    infoDict.set(PDFName.of('SignatureReason'), PDFString.of(reason));
    infoDict.set(PDFName.of('SignatureLocation'), PDFString.of(location));
    infoDict.set(PDFName.of('SignatureDate'), PDFString.of(formatPdfDate(signedAt)));
    infoDict.set(PDFName.of('SignaturePlatform'), PDFString.of(PLATFORM_NAME));
    infoDict.set(PDFName.of('SignaturePlatformURL'), PDFString.of(PLATFORM_URL));
    infoDict.set(PDFName.of('DocumentHash'), PDFString.of(documentHash));
    infoDict.set(PDFName.of('CertificateFingerprint'), PDFString.of(certFingerprint));
  }

  // Create a signature annotation on the first page
  const pages = pdfDoc.getPages();
  if (pages.length > 0) {
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    // Create signature appearance (invisible by default, but can be made visible)
    // We'll add an invisible signature field in the bottom-right corner
    const sigAnnotDict = pdfDoc.context.obj({
      Type: 'Annot',
      Subtype: 'Widget',
      FT: 'Sig',
      T: PDFString.of(`Sig-${signerInfo.walletAddress.substring(0, 8)}`),
      Rect: [width - 200, 10, width - 10, 60], // Bottom-right corner
      F: 132, // Print and Hidden flags
      P: firstPage.ref,
      V: pdfDoc.context.obj({
        Type: 'Sig',
        Filter: 'Adobe.PPKLite',
        SubFilter: 'adbe.pkcs7.detached',
        Name: PDFString.of(signerInfo.name),
        Location: PDFString.of(location),
        Reason: PDFString.of(reason),
        M: PDFString.of(formatPdfDate(signedAt)),
        ContactInfo: PDFString.of(options.contactInfo || PLATFORM_URL),
        Contents: PDFHexString.of(pkcs7Signature.padEnd(8192, '0')),
        ByteRange: PDFArray.withContext(pdfDoc.context),
        Prop_Build: pdfDoc.context.obj({
          App: pdfDoc.context.obj({
            Name: PDFName.of(PLATFORM_NAME),
            REx: PDFString.of(PLATFORM_URL),
          }),
        }),
      }),
    });

    const sigAnnotRef = pdfDoc.context.register(sigAnnotDict);

    // Add annotation to page
    const annots = firstPage.node.lookup(PDFName.of('Annots'));
    if (annots instanceof PDFArray) {
      annots.push(sigAnnotRef);
    } else {
      firstPage.node.set(PDFName.of('Annots'), pdfDoc.context.obj([sigAnnotRef]));
    }

    // Create or update AcroForm
    const catalog = pdfDoc.catalog;
    let acroForm = catalog.lookup(PDFName.of('AcroForm'));

    if (acroForm instanceof PDFDict) {
      // Update existing AcroForm
      const fields = acroForm.lookup(PDFName.of('Fields'));
      if (fields instanceof PDFArray) {
        fields.push(sigAnnotRef);
      } else {
        acroForm.set(PDFName.of('Fields'), pdfDoc.context.obj([sigAnnotRef]));
      }
      // Set SigFlags to indicate document contains signatures
      acroForm.set(PDFName.of('SigFlags'), PDFNumber.of(3));
    } else {
      // Create new AcroForm
      const acroFormDict = pdfDoc.context.obj({
        Fields: [sigAnnotRef],
        SigFlags: 3, // SignaturesExist (1) + AppendOnly (2)
      });
      catalog.set(PDFName.of('AcroForm'), acroFormDict);
    }
  }

  // Save the signed PDF
  const signedPdfBytes = await pdfDoc.save({
    useObjectStreams: false, // Better compatibility
    addDefaultPage: false,
    updateFieldAppearances: false,
  });

  return {
    signedPdf: signedPdfBytes,
    signatureInfo: {
      signedAt,
      signer: signerInfo.name,
      reason,
      platform: PLATFORM_NAME,
      certificateFingerprint: certFingerprint,
    },
  };
}

/**
 * Simplified signing function
 */
export async function signPdfWithAquafier(
  pdfBytes: Uint8Array,
  signerName: string,
  walletAddress: string,
  additionalSigners?: Array<{ name: string; walletAddress: string }>
): Promise<DigitalSignatureResult> {
  let signersList = signerName;
  if (additionalSigners && additionalSigners.length > 0) {
    signersList += ', ' + additionalSigners.map((s) => s.name).join(', ');
  }

  const options: SignatureOptions = {
    reason: `Document digitally signed via ${PLATFORM_NAME} by: ${signersList}`,
    location: PLATFORM_URL,
    contactInfo: `${PLATFORM_URL}/verify`,
    signerInfo: {
      name: signerName,
      walletAddress: walletAddress,
    },
  };

  return signPdfDocument(pdfBytes, options);
}

/**
 * Checks if a PDF has an Aquafier signature
 */
export function hasAquafierSignature(pdfBytes: Uint8Array): boolean {
  const pdfString = new TextDecoder('latin1').decode(pdfBytes);
  return (
    pdfString.includes('/SignaturePlatform') ||
    pdfString.includes(PLATFORM_NAME) ||
    pdfString.includes('inblock.io')
  );
}

/**
 * Extracts signature information from a signed PDF
 */
export async function extractSignatureInfo(
  pdfBytes: Uint8Array
): Promise<{
  hasSig: boolean;
  signerName?: string;
  reason?: string;
  signedAt?: string;
  platform?: string;
  walletAddress?: string;
  documentHash?: string;
}> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const infoDict = pdfDoc.context.lookup(pdfDoc.context.trailerInfo.Info);

    if (!(infoDict instanceof PDFDict)) {
      return { hasSig: false };
    }

    const getStringValue = (key: string): string | undefined => {
      const value = infoDict.lookup(PDFName.of(key));
      if (value instanceof PDFString || value instanceof PDFHexString) {
        return value.decodeText();
      }
      return undefined;
    };

    const signerName = getStringValue('SignedBy');
    const reason = getStringValue('SignatureReason');
    const signedAt = getStringValue('SignatureDate');
    const platform = getStringValue('SignaturePlatform');
    const walletAddress = getStringValue('SignerWallet');
    const documentHash = getStringValue('DocumentHash');

    return {
      hasSig: !!signerName || !!platform,
      signerName,
      reason,
      signedAt,
      platform,
      walletAddress,
      documentHash,
    };
  } catch (error) {
    console.error('Error extracting signature info:', error);
    return { hasSig: false };
  }
}
