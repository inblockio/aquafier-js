import { PDFDocument, PDFDict, PDFName, PDFArray, PDFString, PDFHexString } from 'pdf-lib';
import pako from 'pako';

export interface ExtractedAquaData {
    aquaJson: any | null;
    aquaChainFiles: Array<{ filename: string; content: string }>;
    assetFiles: Array<{ filename: string; content: string | Buffer }>;
}

/**
 * Server-side equivalent of extractEmbeddedAquaData from the frontend.
 * Extracts embedded aqua data (aqua.json, .aqua.json chain files, and asset files)
 * from a PDF document buffer.
 */
export async function extractAquaDataFromPdf(pdfBuffer: Buffer): Promise<ExtractedAquaData> {
    try {
        const pdfBytes = new Uint8Array(pdfBuffer);
        const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

        let aquaJson: any = null;
        const aquaChainFiles: Array<{ filename: string; content: string }> = [];
        const assetFiles: Array<{ filename: string; content: string | Buffer }> = [];

        // Access the catalog to find embedded files
        const catalog = pdfDoc.catalog;
        const namesDict = catalog.lookup(PDFName.of('Names'));

        if (!namesDict || !(namesDict instanceof PDFDict)) {
            return { aquaJson: null, aquaChainFiles: [], assetFiles: [] };
        }

        const embeddedFilesDict = namesDict.lookup(PDFName.of('EmbeddedFiles'));

        if (!embeddedFilesDict || !(embeddedFilesDict instanceof PDFDict)) {
            return { aquaJson: null, aquaChainFiles: [], assetFiles: [] };
        }

        const namesArray = embeddedFilesDict.lookup(PDFName.of('Names'));

        if (!namesArray || !(namesArray instanceof PDFArray)) {
            return { aquaJson: null, aquaChainFiles: [], assetFiles: [] };
        }

        // Names array contains alternating filename and filespec entries
        for (let i = 0; i < namesArray.size(); i += 2) {
            try {
                const filenameObj = namesArray.get(i);
                const filespecRef = namesArray.get(i + 1);

                if (!(filenameObj instanceof PDFString || filenameObj instanceof PDFHexString)) {
                    continue;
                }

                const filename = filenameObj.decodeText();

                const filespec = pdfDoc.context.lookup(filespecRef);

                if (!filespec || !(filespec instanceof PDFDict)) {
                    continue;
                }

                const efDict = filespec.lookup(PDFName.of('EF'));

                if (!efDict || !(efDict instanceof PDFDict)) {
                    continue;
                }

                const fileStreamRef = efDict.lookup(PDFName.of('F'));
                const fileStream = pdfDoc.context.lookup(fileStreamRef);

                if (!fileStream) {
                    continue;
                }

                // Decode the embedded file content
                let fileBytes: Uint8Array;

                if ((fileStream as any).contents) {
                    fileBytes = (fileStream as any).contents;
                } else {
                    continue;
                }

                if (!fileBytes || fileBytes.length === 0) {
                    continue;
                }

                // Check if the stream is zlib compressed (starts with 0x78)
                const isZlibCompressed = fileBytes[0] === 0x78;

                const isTextFile = filename.endsWith('.json');

                let rawBytes: Uint8Array;

                if (isZlibCompressed) {
                    try {
                        rawBytes = pako.inflate(fileBytes);
                    } catch (error) {
                        console.error(`Failed to decompress ${filename}:`, error);
                        rawBytes = fileBytes;
                    }
                } else {
                    rawBytes = fileBytes;
                }

                if (filename === 'aqua.json') {
                    try {
                        const textContent = new TextDecoder('utf-8').decode(rawBytes);
                        aquaJson = JSON.parse(textContent);
                    } catch (error) {
                        console.error('Failed to parse aqua.json:', error);
                    }
                } else if (filename.endsWith('.aqua.json')) {
                    const textContent = new TextDecoder('utf-8').decode(rawBytes);
                    aquaChainFiles.push({ filename, content: textContent });
                } else if (isTextFile) {
                    const textContent = new TextDecoder('utf-8').decode(rawBytes);
                    assetFiles.push({ filename, content: textContent });
                } else {
                    assetFiles.push({ filename, content: Buffer.from(rawBytes) });
                }
            } catch (error) {
                console.error('Failed to process embedded file at index', i, ':', error);
            }
        }

        return { aquaJson, aquaChainFiles, assetFiles };
    } catch (error) {
        console.error('Error extracting embedded aqua data from PDF:', error);
        return { aquaJson: null, aquaChainFiles: [], assetFiles: [] };
    }
}
