import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { toast } from 'sonner';
import { signPdfWithAquafier } from './pdf-digital-signature';
import { Annotation, ImageAnnotation, ProfileAnnotation, TextAnnotation } from '../pages/aqua_sign_wokflow/ContractDocument/signer/types';

/**
 * Parses a font size string (e.g., "12pt", "16px") to points.
 */
export const parseFontSizeToPoints = (fontSizeString: string, defaultSize: number = 12): number => {
    if (!fontSizeString || typeof fontSizeString !== 'string') return defaultSize;

    const value = parseFloat(fontSizeString);
    if (isNaN(value)) return defaultSize;

    if (fontSizeString.toLowerCase().endsWith('pt')) {
        return value;
    } else if (fontSizeString.toLowerCase().endsWith('px')) {
        // Common conversion: 1px = 0.75pt (assuming 96 DPI where 1pt = 1/72 inch)
        // Treating px as pt is often acceptable for visual consistency in pdf-lib.
        return value;
    } else if (fontSizeString.toLowerCase().endsWith('em')) {
        return value * defaultSize; // Assuming 1em = defaultSize
    }
    // If no unit, assume points
    return value;
};

/**
 * Parses a dimension string (e.g., "100px", "50%") to points based on page dimension.
 */
export const parseDimension = (dimension: string | number | undefined, pageDimension: number, defaultPercentage: number): number => {
    if (dimension === undefined || dimension === null) return (defaultPercentage / 100) * pageDimension;

    if (typeof dimension === 'number') {
        return isNaN(dimension) ? (defaultPercentage / 100) * pageDimension : dimension;
    }

    const dimStr = String(dimension);

    if (dimStr.endsWith('%')) {
        const num = parseFloat(dimStr);
        return isNaN(num) ? (defaultPercentage / 100) * pageDimension : (num / 100) * pageDimension;
    } else if (dimStr.endsWith('px') || dimStr.endsWith('pt')) {
        const num = parseFloat(dimStr);
        return isNaN(num) ? (defaultPercentage / 100) * pageDimension : num;
    } else if (dimStr.endsWith('em')) {
        const num = parseFloat(dimStr);
        return isNaN(num) ? (defaultPercentage / 100) * pageDimension : num * 12;
    } else if (!isNaN(parseFloat(dimStr))) {
        return parseFloat(dimStr);
    }
    return (defaultPercentage / 100) * pageDimension;
};

export interface DownloadPdfOptions {
    pdfFile: File;
    annotations: Annotation[];
    fileName?: string;
    backupFn?: () => Promise<string | null>;
}

/**
 * Sanitizes text to ensure it can be encoded in WinAnsi (standard PDF font encoding).
 * Replaces unsupported characters with '?' or removes them.
 */
const sanitizeTextForWinAnsi = (text: string): string => {
    if (!text) return "";
    // Regex matches characters that are NOT in the WinAnsi printable range (roughly).
    // WinAnsi supports: 
    // - ASCII printable (32-126)
    // - Most IS0-8859-1 chars (128-255)
    // We'll filter out anything else for safety to avoid crash.
    return text.replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');
};

export const downloadPdfWithAnnotations = async ({
    pdfFile,
    annotations,
    fileName,
    backupFn
}: DownloadPdfOptions) => {
    if (!pdfFile) {
        toast.error("No PDF - Please upload or load a PDF file first.");
        return;
    }

    try {
        const existingPdfBytes = await pdfFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        for (const anno of annotations) {
            // Ensure page index is valid (0-based)
            const pageIndex = (anno.page || 1) - 1;
            if (pageIndex < 0 || pageIndex >= pdfDoc.getPageCount()) continue;

            const page = pdfDoc.getPage(pageIndex);
            const { width: pageWidth, height: pageHeight } = page.getSize();

            const annoXPercent = anno.x;
            const annoYPercent = anno.y;
            const annoX = (annoXPercent / 100) * pageWidth;

            if ((anno.type as any) === 'text') {
                const textAnno = anno as unknown as TextAnnotation;
                const colorString = textAnno.color?.startsWith('#') ? textAnno.color.substring(1) : (textAnno.color || '000000');
                const r = parseInt(colorString.substring(0, 2), 16) / 255;
                const g = parseInt(colorString.substring(2, 4), 16) / 255;
                const b = parseInt(colorString.substring(4, 6), 16) / 255;

                const annoTextWidth = ((textAnno.width || 20) / 100) * pageWidth;
                const fontSizeInPoints = parseFontSizeToPoints(textAnno.fontSize, 12);
                const textYPdfLib = pageHeight - (annoYPercent / 100 * pageHeight) - fontSizeInPoints;

                page.drawText(sanitizeTextForWinAnsi(textAnno.text), {
                    x: annoX,
                    y: textYPdfLib,
                    size: fontSizeInPoints,
                    font: helveticaFont,
                    color: rgb(r, g, b),
                    lineHeight: fontSizeInPoints * 1.2,
                    maxWidth: annoTextWidth,
                    rotate: degrees(anno.rotation || 0),
                });
            } else if ((anno.type as any) === 'image') {
                const imgAnno = anno as unknown as ImageAnnotation;
                const finalAnnoWidthInPoints = parseDimension(imgAnno.width, pageWidth, 25);
                const finalAnnoHeightInPoints = parseDimension(imgAnno.height, pageHeight, 15);
                const annoImgYPdfLib = pageHeight - (annoYPercent / 100 * pageHeight) - finalAnnoHeightInPoints;

                try {
                    let imageBytes: ArrayBuffer;
                    if (imgAnno.src.startsWith('data:image')) {
                        const base64Data = imgAnno.src.split(',')[1];
                        imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
                    } else {
                        const response = await fetch(imgAnno.src);
                        imageBytes = await response.arrayBuffer();
                    }

                    let pdfImage;
                    if (imgAnno.src.includes('png')) {
                        pdfImage = await pdfDoc.embedPng(imageBytes);
                    } else if (imgAnno.src.includes('jpeg') || imgAnno.src.includes('jpg')) {
                        pdfImage = await pdfDoc.embedJpg(imageBytes);
                    } else {
                        console.warn(`Unsupported image type for annotation ${imgAnno.id}`);
                        continue;
                    }

                    page.drawImage(pdfImage, {
                        x: annoX,
                        y: annoImgYPdfLib,
                        width: finalAnnoWidthInPoints,
                        height: finalAnnoHeightInPoints,
                        rotate: degrees(anno.rotation || 0),
                    });
                } catch (error) {
                    console.error(`Failed to embed image for annotation ${imgAnno.id}:`, error);
                }
            } else if (anno.type === 'profile' || anno.type === 'signature') {
                const profileAnno = anno as unknown as ProfileAnnotation;
                let currentYOffsetFromTopPercent = profileAnno.y;
                const profileRotation = degrees(profileAnno.rotation || 0);

                // 1. Draw Image - use fixed width of 150px to match browser rendering
                const fixedImgWidth = 150; // Match browser's fixed width of 150px
                let imgWidthPoints = fixedImgWidth;
                let imgHeightPoints = fixedImgWidth * 0.6; // Default aspect ratio

                try {
                    const imgSrc = profileAnno.imageSrc || (profileAnno as any).dataUrl;
                    if (imgSrc) {
                        let imageBytes: ArrayBuffer;
                        if (imgSrc.startsWith('data:image')) {
                            const base64Data = imgSrc.split(',')[1];
                            imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
                        } else {
                            const response = await fetch(imgSrc);
                            imageBytes = await response.arrayBuffer();
                        }

                        let pdfImage;
                        if (imgSrc.includes('png')) {
                            pdfImage = await pdfDoc.embedPng(imageBytes);
                        } else if (imgSrc.includes('jpeg') || imgSrc.includes('jpg')) {
                            pdfImage = await pdfDoc.embedJpg(imageBytes);
                        } else {
                            // Try PNG as default for data URLs
                            try {
                                pdfImage = await pdfDoc.embedPng(imageBytes);
                            } catch {
                                pdfImage = await pdfDoc.embedJpg(imageBytes);
                            }
                        }

                        if (pdfImage) {
                            // Calculate height based on image's actual aspect ratio
                            const aspectRatio = pdfImage.height / pdfImage.width;
                            imgHeightPoints = imgWidthPoints * aspectRatio;

                            const imgYPdfLib = pageHeight - (currentYOffsetFromTopPercent / 100 * pageHeight) - imgHeightPoints;

                            page.drawImage(pdfImage, {
                                x: annoX,
                                y: imgYPdfLib,
                                width: imgWidthPoints,
                                height: imgHeightPoints,
                                rotate: profileRotation,
                            });
                        }
                    }
                } catch (error) {
                    console.error(`Failed to embed profile image for annotation ${profileAnno.id}:`, error);
                }

                // Use fixed spacing (4px gap) to match browser rendering
                const gapPoints = 4;
                currentYOffsetFromTopPercent += (imgHeightPoints / pageHeight * 100) + (gapPoints / pageHeight * 100);

                // 2. Draw Name (match browser: fontSize 12pt, color #333333, bold)
                if (profileAnno.name) {
                    const nameFontSize = parseFontSizeToPoints(profileAnno.nameFontSize || "12pt", 12);
                    const nameColorStr = profileAnno.nameColor || '#333333';
                    // Fix: Handle case where color string might be short or invalid
                    const safeColor = nameColorStr.length >= 7 ? nameColorStr : '#333333';
                    const nameR = parseInt(safeColor.substring(1, 3), 16) / 255;
                    const nameG = parseInt(safeColor.substring(3, 5), 16) / 255;
                    const nameB = parseInt(safeColor.substring(5, 7), 16) / 255;
                    const nameYPdfLib = pageHeight - (currentYOffsetFromTopPercent / 100 * pageHeight) - nameFontSize;

                    page.drawText(sanitizeTextForWinAnsi(profileAnno.name), {
                        x: annoX,
                        y: nameYPdfLib,
                        size: nameFontSize,
                        font: helveticaBoldFont,
                        color: rgb(isNaN(nameR) ? 0.2 : nameR, isNaN(nameG) ? 0.2 : nameG, isNaN(nameB) ? 0.2 : nameB),
                        rotate: profileRotation,
                        maxWidth: pageWidth * 0.8,
                    });
                    currentYOffsetFromTopPercent += (nameFontSize / pageHeight * 100) + (gapPoints / pageHeight * 100);
                }

                // 3. Draw Wallet Address (match browser: fontSize 10pt, color #555555)
                if (profileAnno.walletAddress) {
                    const walletFontSize = parseFontSizeToPoints(profileAnno.walletAddressFontSize || "10pt", 10);
                    const walletColorStr = profileAnno.walletAddressColor || '#555555';
                    const safeColor = walletColorStr.length >= 7 ? walletColorStr : '#555555';
                    const walletR = parseInt(safeColor.substring(1, 3), 16) / 255;
                    const walletG = parseInt(safeColor.substring(3, 5), 16) / 255;
                    const walletB = parseInt(safeColor.substring(5, 7), 16) / 255;
                    const walletYPdfLib = pageHeight - (currentYOffsetFromTopPercent / 100 * pageHeight) - walletFontSize;

                    page.drawText(sanitizeTextForWinAnsi(profileAnno.walletAddress), {
                        x: annoX,
                        y: walletYPdfLib,
                        size: walletFontSize,
                        font: helveticaFont,
                        color: rgb(isNaN(walletR) ? 0.33 : walletR, isNaN(walletG) ? 0.33 : walletG, isNaN(walletB) ? 0.33 : walletB),
                        rotate: profileRotation,
                        maxWidth: pageWidth * 0.8,
                    });
                }
            }
        }

        // Save PDF with annotations
        const pdfBytes = await pdfDoc.save();

        // Collect all signers from annotations
        // Filter to ensure we have name and walletAddress
        const signers = annotations
            .filter((anno: any) => anno.name && anno.walletAddress)
            .map((anno: any) => ({
                name: anno.name,
                walletAddress: anno.walletAddress,
            }));

        // Get primary signer (first one) or use default
        const primarySigner = signers[0] || { name: 'Document Signer', walletAddress: '0x0' };
        const additionalSigners = signers.slice(1);

        // Apply digital signature
        toast.info("Applying digital signature...");

        try {
            let docBackupId = "";
            if (backupFn) {
                const id = await backupFn();
                if (id) docBackupId = id;
            }

            const { signedPdf, signatureInfo } = await signPdfWithAquafier(
                pdfBytes,
                primarySigner.name,
                primarySigner.walletAddress,
                additionalSigners,
                docBackupId
            );

            // Download the digitally signed PDF
            const blob = new Blob([signedPdf as BlobPart], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName || (pdfFile.name ? `${pdfFile.name.replace('.pdf', '')}_signed.pdf` : 'signed_document.pdf');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            console.log("Digital Signature Info:", signatureInfo);
            let message = `Document signed by ${signatureInfo.signer} `
            if (annotations.length > 1) {
                message += ` and ${annotations.length - 1} more signer(s).`
            }

            message += `via ${signatureInfo.platform}`;
            toast.success("Download Started - " + message);
        
        } catch (signError) {
            console.warn("Digital signature failed, downloading without signature:", signError);
            // Fallback: download without digital signature
            const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName || (pdfFile.name ? `${pdfFile.name.replace('.pdf', '')}_signed.pdf` : 'document_signed.pdf');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Download Started - PDF downloaded (without digital signature).");
        }
    } catch (error) {
        console.error("Failed to save PDF:", error);
        toast.error("Download Failed - Could not generate the signed PDF.");
    }
};
