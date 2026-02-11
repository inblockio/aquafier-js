/**
 * PDF Security Info Page Module
 *
 * Appends an extra last page to digitally signed PDFs that explains
 * how the document is secured and can be verified.
 */

import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import QRCode from 'qrcode';
import { sanitizeTextForWinAnsi } from './pdf-downloader';

export interface SecurityInfoOptions {
  signers: Array<{ name: string; walletAddress: string }>;
  signedAt: Date;
  documentId?: string;
  reason: string;
  platformName: string;
  platformUrl: string;
}

/**
 * Adds a security information page as the last page of the PDF document.
 */
export async function addSecurityInfoPage(
  pdfDoc: PDFDocument,
  options: SecurityInfoOptions
): Promise<void> {
  const { signers, signedAt, documentId, reason, platformName, platformUrl } = options;

  // Use existing page size or default to US Letter
  const existingPages = pdfDoc.getPages();
  let pageWidth = 612;
  let pageHeight = 792;
  if (existingPages.length > 0) {
    const firstPage = existingPages[0];
    const size = firstPage.getSize();
    pageWidth = size.width;
    pageHeight = size.height;
  }

  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  // Embed fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Layout constants
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = pageHeight - margin;

  // Colors
  const brandOrange = rgb(0.898, 0.357, 0.122); // #E55B1F
  const headerBgColor = rgb(0, 0, 0); // black
  const white = rgb(1, 1, 1);
  const darkGray = rgb(0.2, 0.2, 0.2);
  const mediumGray = rgb(0.4, 0.4, 0.4);
  const lightGrayBg = rgb(0.95, 0.95, 0.95);
  const sectionTitleColor = brandOrange;

  // ── 1. Header Bar ──────────────────────────────────────────────────
  const headerHeight = 40;
  page.drawRectangle({
    x: 0,
    y: cursorY - headerHeight,
    width: pageWidth,
    height: headerHeight,
    color: headerBgColor,
  });

  page.drawText(sanitizeTextForWinAnsi('SECURITY INFORMATION'), {
    x: margin,
    y: cursorY - headerHeight + 13,
    size: 16,
    font: helveticaBold,
    color: white,
  });

  cursorY -= headerHeight + 25;

  // ── 2. Document Information ────────────────────────────────────────
  cursorY = drawSectionTitle(page, 'Document Information', margin, cursorY, helveticaBold, sectionTitleColor);
  cursorY -= 5;

  // Draw a light background for the info block
  const infoItems: Array<[string, string]> = [];
  if (documentId) {
    infoItems.push(['Document ID:', documentId]);
  }
  infoItems.push(['Signed At:', formatDate(signedAt)]);
  infoItems.push(['Protocol:', 'Aqua Protocol v1.0']);
  infoItems.push(['Platform:', `${platformName} (${platformUrl})`]);
  infoItems.push(['Reason:', reason]);

  const infoBlockHeight = infoItems.length * 18 + 10;
  page.drawRectangle({
    x: margin,
    y: cursorY - infoBlockHeight,
    width: contentWidth,
    height: infoBlockHeight,
    color: lightGrayBg,
  });

  cursorY -= 5;
  for (const [label, value] of infoItems) {
    cursorY -= 16;
    page.drawText(sanitizeTextForWinAnsi(label), {
      x: margin + 10,
      y: cursorY,
      size: 9,
      font: helveticaBold,
      color: darkGray,
    });
    // Truncate long values to fit the page
    const maxValueWidth = contentWidth - 120;
    const truncatedValue = truncateText(value, helvetica, 9, maxValueWidth);
    page.drawText(sanitizeTextForWinAnsi(truncatedValue), {
      x: margin + 110,
      y: cursorY,
      size: 9,
      font: helvetica,
      color: darkGray,
    });
  }

  cursorY -= 25;

  // ── 3. Signers ─────────────────────────────────────────────────────
  cursorY = drawSectionTitle(page, 'Signers', margin, cursorY, helveticaBold, sectionTitleColor);
  cursorY -= 5;

  // Table header
  const tableHeaderHeight = 20;
  page.drawRectangle({
    x: margin,
    y: cursorY - tableHeaderHeight,
    width: contentWidth,
    height: tableHeaderHeight,
    color: headerBgColor,
  });
  page.drawText(sanitizeTextForWinAnsi('Name'), {
    x: margin + 10,
    y: cursorY - tableHeaderHeight + 6,
    size: 9,
    font: helveticaBold,
    color: white,
  });
  page.drawText(sanitizeTextForWinAnsi('Wallet Address'), {
    x: margin + 160,
    y: cursorY - tableHeaderHeight + 6,
    size: 9,
    font: helveticaBold,
    color: white,
  });
  cursorY -= tableHeaderHeight;

  // Table rows
  for (let i = 0; i < signers.length; i++) {
    const signer = signers[i];
    const rowHeight = 20;

    if (i % 2 === 0) {
      page.drawRectangle({
        x: margin,
        y: cursorY - rowHeight,
        width: contentWidth,
        height: rowHeight,
        color: lightGrayBg,
      });
    }

    cursorY -= rowHeight;
    const nameText = truncateText(signer.name, helvetica, 9, 140);
    page.drawText(sanitizeTextForWinAnsi(nameText), {
      x: margin + 10,
      y: cursorY + 6,
      size: 9,
      font: helvetica,
      color: darkGray,
    });

    const walletMaxWidth = contentWidth - 170;
    const walletText = truncateText(signer.walletAddress, helvetica, 8, walletMaxWidth);
    page.drawText(sanitizeTextForWinAnsi(walletText), {
      x: margin + 160,
      y: cursorY + 6,
      size: 8,
      font: helvetica,
      color: mediumGray,
    });
  }

  cursorY -= 25;

  // ── 4. How This Document Is Secured ────────────────────────────────
  cursorY = drawSectionTitle(page, 'How This Document Is Secured', margin, cursorY, helveticaBold, sectionTitleColor);
  cursorY -= 5;

  const securityItems = [
    ['Cryptographic Hashing (SHA-256)', 'Document integrity is ensured through SHA-256 hash verification.'],
    ['Digital Signatures (PKCS#7)', 'Each signer\'s identity is verified using PKCS#7 digital signatures.'],
    ['Blockchain Witnessing', 'Document hashes are anchored to a blockchain for tamper-proof timestamping.'],
    ['Aqua Protocol Chain', 'A verifiable chain of revisions and signatures is maintained via the Aqua Protocol.'],
  ];

  for (const [title, description] of securityItems) {
    cursorY -= 14;
    page.drawText(sanitizeTextForWinAnsi(`\u2022  ${title}`), {
      x: margin + 10,
      y: cursorY,
      size: 9,
      font: helveticaBold,
      color: darkGray,
    });
    cursorY -= 13;
    page.drawText(sanitizeTextForWinAnsi(description), {
      x: margin + 24,
      y: cursorY,
      size: 8,
      font: helvetica,
      color: mediumGray,
    });
  }

  cursorY -= 25;

  // ── 5. Verification ────────────────────────────────────────────────
  cursorY = drawSectionTitle(page, 'Verification', margin, cursorY, helveticaBold, sectionTitleColor);
  cursorY -= 10;

  const verifyUrl = `${platformUrl}/app/verify-document`;

  // Generate QR code as PNG
  try {
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 120,
      margin: 1,
      color: { dark: '#E55B1F', light: '#ffffff' },
    });

    // Extract base64 data from data URL
    const base64Data = qrDataUrl.split(',')[1];
    const qrBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const qrImage = await pdfDoc.embedPng(qrBytes);

    const qrSize = 100;
    const qrX = margin + 10;
    const qrY = cursorY - qrSize;

    page.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
    });

    // Text next to QR code
    const textX = qrX + qrSize + 20;
    page.drawText(sanitizeTextForWinAnsi('Scan to Verify'), {
      x: textX,
      y: cursorY - 15,
      size: 11,
      font: helveticaBold,
      color: darkGray,
    });

    page.drawText(sanitizeTextForWinAnsi('To verify this document, scan the QR code'), {
      x: textX,
      y: cursorY - 32,
      size: 9,
      font: helvetica,
      color: mediumGray,
    });

    page.drawText(sanitizeTextForWinAnsi('or visit the URL below:'), {
      x: textX,
      y: cursorY - 45,
      size: 9,
      font: helvetica,
      color: mediumGray,
    });

    const urlTruncated = truncateText(verifyUrl, helvetica, 8, contentWidth - qrSize - 40);
    page.drawText(sanitizeTextForWinAnsi(urlTruncated), {
      x: textX,
      y: cursorY - 62,
      size: 8,
      font: helvetica,
      color: sectionTitleColor,
    });

    cursorY = qrY - 15;
  } catch (qrError) {
    // Fallback if QR generation fails — just show the URL
    console.error('Failed to generate QR code:', qrError);
    page.drawText(sanitizeTextForWinAnsi(`Verify at: ${verifyUrl}`), {
      x: margin + 10,
      y: cursorY - 15,
      size: 9,
      font: helvetica,
      color: sectionTitleColor,
    });
    cursorY -= 30;
  }

  // ── 6. Footer ──────────────────────────────────────────────────────
  const footerText = `Generated by ${platformName}  |  ${platformUrl}`;
  const footerTextWidth = helvetica.widthOfTextAtSize(sanitizeTextForWinAnsi(footerText), 8);
  const footerX = (pageWidth - footerTextWidth) / 2;

  // Separator line
  page.drawRectangle({
    x: margin,
    y: margin + 20,
    width: contentWidth,
    height: 0.5,
    color: mediumGray,
  });

  page.drawText(sanitizeTextForWinAnsi(footerText), {
    x: footerX,
    y: margin + 8,
    size: 8,
    font: helvetica,
    color: mediumGray,
  });
}

/**
 * Draws a section title and returns the new cursor Y position.
 */
function drawSectionTitle(
  page: PDFPage,
  title: string,
  x: number,
  y: number,
  font: PDFFont,
  color: ReturnType<typeof rgb>
): number {
  page.drawText(sanitizeTextForWinAnsi(title), {
    x,
    y: y - 14,
    size: 12,
    font,
    color,
  });

  // Underline
  page.drawRectangle({
    x,
    y: y - 17,
    width: font.widthOfTextAtSize(sanitizeTextForWinAnsi(title), 12),
    height: 1,
    color,
  });

  return y - 22;
}

/**
 * Truncates text to fit within a given width.
 */
function truncateText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(sanitizeTextForWinAnsi(text), fontSize) <= maxWidth) {
    return text;
  }
  let truncated = text;
  while (truncated.length > 0 && font.widthOfTextAtSize(sanitizeTextForWinAnsi(truncated + '...'), fontSize) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}

/**
 * Formats a date for display on the security info page.
 */
function formatDate(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });
}
