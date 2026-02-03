/**
 * PDF Digital Signature Module
 *
 * Implements digital signatures for PDF documents that are detectable
 * by Adobe Acrobat and other PDF readers.
 *
 * Refactored to support multiple signatures via sequential saves.
 *
 * Platform: Aquafier (dev.inblock.io)
 */

import forge from 'node-forge';
import { PDFDocument, PDFName, PDFString, PDFHexString, PDFDict, PDFArray, PDFNumber } from 'pdf-lib';
import appStore from '../store';
import Aquafier from 'aqua-js-sdk';

// Platform identification
const PLATFORM_NAME = 'Aquafier';

let PLATFORM_URL: string = "https://dev.inblock.io"
if (typeof window !== 'undefined') {
  PLATFORM_URL = `${window.location.protocol}//${window.location.host}`
}

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
  documentId?: string;
  signerInfo: SignerInfo;
  additionalSigners?: SignerInfo[];
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
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as any);
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
    key: privateKey as any,
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
        value: new Date().toDateString(),
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
 * Adds a single signature to a PDF document.
 * This is the core signing function that works with pdf-lib.
 */
async function addSingleSignature(
  pdfBytes: Uint8Array,
  signerInfo: SignerInfo,
  options: {
    reason: string;
    location: string;
    contactInfo: string;
    signedAt: Date;
    yOffset: number;
  }
): Promise<Uint8Array> {
  const { reason, location, contactInfo, signedAt, yOffset } = options;

  // Generate certificate for this signer
  const { certificate, privateKey } = generateCertificate(signerInfo);

  // Load the PDF
  const pdfDoc = await PDFDocument.load(pdfBytes, {
    ignoreEncryption: true,
    updateMetadata: false
  });

  // Create document hash
  const documentHash = await createDocumentHash(pdfBytes);

  // Create PKCS#7 signature
  const pkcs7Signature = createPkcs7Signature(documentHash, certificate, privateKey);

  // Create a signature annotation on the first page
  const pages = pdfDoc.getPages();
  if (pages.length > 0) {
    const firstPage = pages[0];
    const { width } = firstPage.getSize();

    // Create signature appearance (invisible by default, but can be made visible)
    const sigAnnotDict = pdfDoc.context.obj({
      Type: 'Annot',
      Subtype: 'Widget',
      FT: 'Sig',
      T: PDFString.of(`Sig-${signerInfo.walletAddress.substring(0, 8)}-${Date.now()}`),
      Rect: [width - 200, yOffset, width - 10, yOffset + 50],
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
        ContactInfo: PDFString.of(contactInfo),
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
 
  return signedPdfBytes;
}

/**
 * Adds digital signature metadata to a PDF document.
 * Supports multiple signatures via sequential saves (incremental updates).
 */
export async function signPdfDocument(
  pdfBytes: Uint8Array,
  options: SignatureOptions
): Promise<DigitalSignatureResult> {
  const signedAt = new Date();
  const { signerInfo } = options;

  // Collect all signers (primary + additional)
  const allSigners: SignerInfo[] = [signerInfo];
  if (options.additionalSigners && options.additionalSigners.length > 0) {
    allSigners.push(...options.additionalSigners);
  }

  // Collect names and wallets for metadata
  const allSignerNames = allSigners.map(s => s.name);
  const allSignerWallets = allSigners.map(s => s.walletAddress);
  const reason = options.reason || `Digitally signed via ${PLATFORM_NAME}`;
  const location = options.location || PLATFORM_URL;

  // 1. Preparation Phase: Add Metadata BEFORE any signatures
  const tempDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

  // Set basic metadata
  tempDoc.setTitle(tempDoc.getTitle() || 'Signed Document');
  tempDoc.setAuthor(allSignerNames.join(', '));
  tempDoc.setSubject(`Digitally signed via ${PLATFORM_NAME}`);
  tempDoc.setKeywords([PLATFORM_NAME, 'digital-signature', 'signed', ...allSignerWallets]);
  tempDoc.setProducer(`${PLATFORM_NAME} Digital Signature Service (${PLATFORM_URL})`);
  tempDoc.setCreator(PLATFORM_NAME);
  tempDoc.setCreationDate(signedAt);
  tempDoc.setModificationDate(signedAt);

  // Add custom Info dictionary metadata
  const infoDict = tempDoc.context.lookup(tempDoc.context.trailerInfo.Info);
  if (infoDict instanceof PDFDict) {
    infoDict.set(PDFName.of('SignedBy'), PDFString.of(allSignerNames.join(', ')));
    infoDict.set(PDFName.of('SignerWallet'), PDFString.of(allSignerWallets.join(', ')));
    infoDict.set(PDFName.of('SignerCount'), PDFString.of(String(allSigners.length)));
    infoDict.set(PDFName.of('SignatureReason'), PDFString.of(reason));
    infoDict.set(PDFName.of('SignatureLocation'), PDFString.of(location));
    infoDict.set(PDFName.of('SignatureDate'), PDFString.of(formatPdfDate(signedAt)));
    infoDict.set(PDFName.of('SignaturePlatform'), PDFString.of(PLATFORM_NAME));
    infoDict.set(PDFName.of('SignaturePlatformURL'), PDFString.of(PLATFORM_URL));

    if (options.documentId) {
      infoDict.set(PDFName.of('DocumentId'), PDFString.of(options.documentId));
      infoDict.set(PDFName.of('VerificationURL'), PDFString.of(options.documentId));
    }
  }

  // Get selectedFileInfo from store and embed aqua chain data
  const { selectedFileInfo } = appStore.getState();

  if (selectedFileInfo && selectedFileInfo.aquaTree) {
    try {
      const aquafier = new Aquafier();

      // Create aqua.json metadata
      const aquaJsonData = {
        genesis: selectedFileInfo.aquaTree.file_index[Object.keys(selectedFileInfo.aquaTree.file_index)[0]],
        name_with_hash: [] as Array<{ name: string; hash: string }>,
        createdAt: new Date().toISOString(),
        type: 'aqua_file_backup',
        version: '1.0.0',
        documentId: options.documentId,
      };

      // Process file objects to create name_with_hash
      if (selectedFileInfo.fileObject && selectedFileInfo.fileObject.length > 0) {
        for (const fileObj of selectedFileInfo.fileObject) {
          let hashData: string;

          if (typeof fileObj.fileContent === 'string') {
            hashData = aquafier.getFileHash(fileObj.fileContent);
          } else if (fileObj.fileContent instanceof Uint8Array || fileObj.fileContent instanceof ArrayBuffer) {
            const dataForHash = fileObj.fileContent instanceof ArrayBuffer
              ? new Uint8Array(fileObj.fileContent)
              : fileObj.fileContent;
            hashData = aquafier.getFileHash(dataForHash);
          } else {
            hashData = aquafier.getFileHash(JSON.stringify(fileObj.fileContent));
          }

          aquaJsonData.name_with_hash.push({
            name: fileObj.fileName,
            hash: hashData,
          });
        }
      }

      // Embed aqua.json
      const aquaJsonString = JSON.stringify(aquaJsonData, null, 2);
      await tempDoc.attach(
        new Uint8Array(new TextEncoder().encode(aquaJsonString)),
        'aqua.json',
        {
          mimeType: 'application/json',
          description: 'Aquafier chain metadata',
          creationDate: signedAt,
          modificationDate: signedAt,
        }
      );

      // Embed all file objects (both .aqua.json metadata and actual asset files)
      if (selectedFileInfo.fileObject && selectedFileInfo.fileObject.length > 0) {
        for (const fileObj of selectedFileInfo.fileObject) {
          try {
            // Skip files that are URLs - we can't embed remote content
            if (typeof fileObj.fileContent === 'string' &&
                (fileObj.fileContent.startsWith('http://') || fileObj.fileContent.startsWith('https://'))) {
              console.log(`Skipping URL-based file: ${fileObj.fileName}`);
              continue;
            }

            let fileBytes: Uint8Array;
            let mimeType = 'application/octet-stream';
            let description = 'Aquafier asset file';

            if (fileObj.fileName.endsWith('.aqua.json')) {
              // Handle aqua tree files
              const fileContent = typeof fileObj.fileContent === 'string'
                ? fileObj.fileContent
                : JSON.stringify(fileObj.fileContent);
              fileBytes = new Uint8Array(new TextEncoder().encode(fileContent));
              mimeType = 'application/json';
              description = 'Aquafier chain file';
            } else if (fileObj.fileName.endsWith('.json')) {
              // Handle JSON files
              const fileContent = typeof fileObj.fileContent === 'string'
                ? fileObj.fileContent
                : JSON.stringify(fileObj.fileContent);
              fileBytes = new Uint8Array(new TextEncoder().encode(fileContent));
              mimeType = 'application/json';
              description = 'Aquafier JSON asset';
            } else if (fileObj.fileName.endsWith('.png')) {
              mimeType = 'image/png';
              description = 'Aquafier image asset';
              if (fileObj.fileContent instanceof ArrayBuffer) {
                fileBytes = new Uint8Array(fileObj.fileContent);
              } else if (typeof fileObj.fileContent === 'string') {
                // Check if it's base64 encoded
                if (fileObj.fileContent.startsWith('data:')) {
                  const base64Data = fileObj.fileContent.split(',')[1];
                  fileBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                } else {
                  fileBytes = new Uint8Array(new TextEncoder().encode(fileObj.fileContent));
                }
              } else {
                console.warn(`Skipping ${fileObj.fileName} - unsupported content type`);
                continue;
              }
            } else if (fileObj.fileName.endsWith('.pdf')) {
              mimeType = 'application/pdf';
              description = 'Aquafier PDF asset';
              if (fileObj.fileContent instanceof ArrayBuffer) {
                fileBytes = new Uint8Array(fileObj.fileContent);
              } else if (typeof fileObj.fileContent === 'string') {
                fileBytes = new Uint8Array(new TextEncoder().encode(fileObj.fileContent));
              } else {
                console.warn(`Skipping ${fileObj.fileName} - unsupported content type`);
                continue;
              }
            } else {
              // Handle other file types
              if (typeof fileObj.fileContent === 'string') {
                fileBytes = new Uint8Array(new TextEncoder().encode(fileObj.fileContent));
              } else if (fileObj.fileContent instanceof ArrayBuffer) {
                fileBytes = new Uint8Array(fileObj.fileContent);
              } else {
                console.warn(`Skipping ${fileObj.fileName} - unsupported content type`);
                continue;
              }
            }

            await tempDoc.attach(
              fileBytes,
              fileObj.fileName,
              {
                mimeType,
                description,
                creationDate: signedAt,
                modificationDate: signedAt,
              }
            );
            console.log(`Attached file: ${fileObj.fileName} (${fileBytes.length} bytes)`);
          } catch (error) {
            console.error(`Failed to attach ${fileObj.fileName}:`, error);
          }
        }
      }

      // Also embed linkedFileObjects if they exist and have content
      if (selectedFileInfo.linkedFileObjects && selectedFileInfo.linkedFileObjects.length > 0) {
        for (const linkedFileObj of selectedFileInfo.linkedFileObjects) {
          if (linkedFileObj.fileObject) {
            for (const fileObj of linkedFileObj.fileObject) {
              try {
                // Skip files that are URLs
                if (typeof fileObj.fileContent === 'string' &&
                    (fileObj.fileContent.startsWith('http://') || fileObj.fileContent.startsWith('https://'))) {
                  continue;
                }

                let fileBytes: Uint8Array;
                let mimeType = 'application/octet-stream';

                if (typeof fileObj.fileContent === 'string') {
                  fileBytes = new Uint8Array(new TextEncoder().encode(fileObj.fileContent));
                  if (fileObj.fileName.endsWith('.json')) {
                    mimeType = 'application/json';
                  }
                } else if (fileObj.fileContent instanceof ArrayBuffer) {
                  fileBytes = new Uint8Array(fileObj.fileContent);
                } else {
                  continue;
                }

                await tempDoc.attach(
                  fileBytes,
                  fileObj.fileName,
                  {
                    mimeType,
                    description: 'Aquafier linked asset',
                    creationDate: signedAt,
                    modificationDate: signedAt,
                  }
                );
                console.log(`Attached linked file: ${fileObj.fileName} (${fileBytes.length} bytes)`);
              } catch (error) {
                console.error(`Failed to attach linked file ${fileObj.fileName}:`, error);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to embed aqua chain data:', error);
    }
  }

  // Save the prepared document
  let currentPdfBytes = await tempDoc.save({ useObjectStreams: false });

  // Get certificate fingerprint from primary signer
  const { certificate } = generateCertificate(signerInfo);
  const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(certificate));
  const certFingerprint = forge.md.sha256
    .create()
    .update(certDer.getBytes())
    .digest()
    .toHex();

  // 2. Sequential Signing Loop - Each signature is a separate save (incremental update)
  for (let i = 0; i < allSigners.length; i++) {
    const signer = allSigners[i];
    const yOffset = 10 + (i * 60); // Stack signatures vertically

    currentPdfBytes = await addSingleSignature(currentPdfBytes, signer, {
      reason,
      location,
      contactInfo: options.contactInfo || PLATFORM_URL,
      signedAt,
      yOffset,
    });
  }

  return {
    signedPdf: currentPdfBytes,
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
  additionalSigners?: Array<{ name: string; walletAddress: string }>,
  documentId?: string
): Promise<DigitalSignatureResult> {
  const signersList = signerName + (additionalSigners ? ', ' + additionalSigners.map((s) => s.name).join(', ') : '');

  // Convert additional signers to SignerInfo format
  const additionalSignerInfos: SignerInfo[] = additionalSigners
    ? additionalSigners.map((s) => ({
      name: s.name,
      walletAddress: s.walletAddress,
    }))
    : [];

  const options: SignatureOptions = {
    reason: `Document digitally signed via ${PLATFORM_NAME} by: ${signersList}`,
    location: PLATFORM_URL,
    contactInfo: `${PLATFORM_URL}/verify`,
    documentId: documentId,
    signerInfo: {
      name: signerName,
      walletAddress: walletAddress,
    },
    additionalSigners: additionalSignerInfos,
  };

  return signPdfDocument(pdfBytes, options);
}

/**
 * Extracts embedded aqua.json and related files from a signed PDF
 */
export async function extractEmbeddedAquaData(
  pdfBytes: Uint8Array
): Promise<{
  aquaJson: any | null;
  aquaChainFiles: Array<{ filename: string; content: string }>;
  assetFiles: Array<{ filename: string; content: string | ArrayBuffer }>;
}> {
  try {
    console.log('Loading PDF document for extraction...');
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

    let aquaJson: any = null;
    const aquaChainFiles: Array<{ filename: string; content: string }> = [];
    const assetFiles: Array<{ filename: string; content: string | ArrayBuffer }> = [];

    // Access the catalog to find embedded files
    const catalog = pdfDoc.catalog;
    const namesDict = catalog.lookup(PDFName.of('Names'));

    if (!namesDict) {
      console.log('No Names dictionary found in PDF catalog');
      return { aquaJson: null, aquaChainFiles: [], assetFiles: [] };
    }

    if (!(namesDict instanceof PDFDict)) {
      console.log('Names entry is not a dictionary');
      return { aquaJson: null, aquaChainFiles: [], assetFiles: [] };
    }

    const embeddedFilesDict = namesDict.lookup(PDFName.of('EmbeddedFiles'));

    if (!embeddedFilesDict) {
      console.log('No EmbeddedFiles dictionary found');
      return { aquaJson: null, aquaChainFiles: [], assetFiles: [] };
    }

    if (!(embeddedFilesDict instanceof PDFDict)) {
      console.log('EmbeddedFiles entry is not a dictionary');
      return { aquaJson: null, aquaChainFiles: [], assetFiles: [] };
    }

    const namesArray = embeddedFilesDict.lookup(PDFName.of('Names'));

    if (!namesArray || !(namesArray instanceof PDFArray)) {
      console.log('Names array not found in EmbeddedFiles');
      return { aquaJson: null, aquaChainFiles: [], assetFiles: [] };
    }

    console.log(`Found ${namesArray.size() / 2} embedded files`);

    // Names array contains alternating filename and filespec entries
    for (let i = 0; i < namesArray.size(); i += 2) {
      try {
        const filenameObj = namesArray.get(i);
        const filespecRef = namesArray.get(i + 1);

        if (!(filenameObj instanceof PDFString || filenameObj instanceof PDFHexString)) {
          continue;
        }

        const filename = filenameObj.decodeText();
        console.log(`Processing embedded file: ${filename}`);

        const filespec = pdfDoc.context.lookup(filespecRef);

        if (!filespec || !(filespec instanceof PDFDict)) {
          console.log(`Filespec not found for ${filename}`);
          continue;
        }

        const efDict = filespec.lookup(PDFName.of('EF'));

        if (!efDict || !(efDict instanceof PDFDict)) {
          console.log(`EF dictionary not found for ${filename}`);
          continue;
        }

        const fileStreamRef = efDict.lookup(PDFName.of('F'));
        const fileStream = pdfDoc.context.lookup(fileStreamRef);

        if (!fileStream) {
          console.log(`File stream not found for ${filename}`);
          continue;
        }

        // Decode the embedded file content
        // Check if the stream has encoded contents (compressed)
        let fileBytes: Uint8Array;

        if ((fileStream as any).contents) {
          fileBytes = (fileStream as any).contents;
        } else {
          console.log(`No contents found for ${filename}`);
          continue;
        }

        if (!fileBytes || fileBytes.length === 0) {
          console.log(`No contents found for ${filename}`);
          continue;
        }

        console.log(`Raw bytes for ${filename}: length=${fileBytes.length}, first byte=0x${fileBytes[0].toString(16)}, second byte=0x${fileBytes[1]?.toString(16) || 'N/A'}`);

        // Check if the stream has a FlateDecode filter (zlib compressed)
        // Zlib header starts with 0x78 followed by compression level byte
        const isZlibCompressed = fileBytes[0] === 0x78;

        let content: string;

        if (isZlibCompressed) {
          console.log(`File ${filename} appears to be zlib compressed, attempting to decompress with pako...`);
          try {
            // Use pako to decompress zlib data
            const pako = await import('pako');
            const decompressed = pako.inflate(fileBytes);
            content = new TextDecoder('utf-8').decode(decompressed);
            console.log(`Successfully decompressed ${filename} with pako`);
          } catch (error) {
            console.error(`Failed to decompress ${filename} with pako:`, error);
            // Try decoding as plain text
            content = new TextDecoder('utf-8').decode(fileBytes);
          }
        } else {
          // Not compressed, decode as plain text
          content = new TextDecoder('utf-8').decode(fileBytes);
        }

        console.log(`Extracted ${filename}: ${content.length} characters`);

        if (filename === 'aqua.json') {
          try {
            aquaJson = JSON.parse(content);
            console.log('Successfully parsed aqua.json');
          } catch (error) {
            console.error('Failed to parse aqua.json:', error);
            console.log('First 100 chars:', content.substring(0, 100));
          }
        } else if (filename.endsWith('.aqua.json')) {
          aquaChainFiles.push({ filename, content });
          console.log(`Added ${filename} to aquaChainFiles`);
        } else {
          // This is an asset file (non-aqua.json)
          assetFiles.push({ filename, content });
          console.log(`Added ${filename} to assetFiles`);
        }
      } catch (error) {
        console.error('Failed to process embedded file at index', i, ':', error);
      }
    }

    console.log(`Extraction complete. aquaJson: ${aquaJson ? 'found' : 'not found'}, aquaChainFiles: ${aquaChainFiles.length}, assetFiles: ${assetFiles.length}`);
    return { aquaJson, aquaChainFiles, assetFiles };
  } catch (error) {
    console.error('Error extracting embedded aqua data:', error);
    return { aquaJson: null, aquaChainFiles: [], assetFiles: [] };
  }
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
