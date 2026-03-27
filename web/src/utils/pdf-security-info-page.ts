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
  aquafierCommitHash?: string;
}

// Known build commit hashes for archival reference
const ARCHIVE_BUILDS = {
  'aqua-js-sdk': {
    repo: 'https://github.com/inblockio/aqua-js-sdk',
    commit: 'f19bd0927b44a04736c2dc86fe2db6559ba44269',
  },
  'aqua-js-cli': {
    repo: 'https://github.com/inblockio/aqua-js-cli',
    commit: '32e8b1f1cfe363ba77fff7b107494dc9d8eabf67',
  },
  'aquafier-js': {
    repo: 'https://github.com/inblockio/aquafier-js',
    commit: '8271a2bce4b02c54895163f734ca88b49684f686',
  },
};

const FALLBACK_VERIFY_URL = 'https://aquafier.inblock.io/app/verify-document';

/**
 * Adds a security information page as the last page of the PDF document.
 */
export async function addSecurityInfoPage(
  pdfDoc: PDFDocument,
  options: SecurityInfoOptions
): Promise<void> {
  const { signers, signedAt, documentId, reason, platformName, platformUrl, aquafierCommitHash } = options;

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

  cursorY -= headerHeight + 18;

  // ── 2. Document Information ────────────────────────────────────────
  cursorY = drawSectionTitle(page, 'Document information', margin, cursorY, helveticaBold, sectionTitleColor);
  cursorY -= 5;

  // Build info items (excluding reason, which gets its own wrapped block)
  const infoItems: Array<[string, string]> = [];
  if (documentId) {
    infoItems.push(['Document ID:', documentId]);
  }
  infoItems.push(['Signed At:', formatDate(signedAt)]);
  infoItems.push(['Protocol:', 'Aqua Protocol v3.2']);
  infoItems.push(['Platform:', `${platformName} (${platformUrl})`]);

  // Wrap the reason text into multiple lines
  const reasonLabel = 'Reason:';
  const reasonMaxWidth = contentWidth - 120;
  const reasonLines = wrapText(reason, helvetica, 9, reasonMaxWidth);

  // Calculate info block height: regular items + reason lines
  const infoBlockHeight = infoItems.length * 18 + reasonLines.length * 14 + 20;
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

  // Draw reason with text wrapping
  cursorY -= 16;
  page.drawText(sanitizeTextForWinAnsi(reasonLabel), {
    x: margin + 10,
    y: cursorY,
    size: 9,
    font: helveticaBold,
    color: darkGray,
  });

  for (let i = 0; i < reasonLines.length; i++) {
    const lineY = i === 0 ? cursorY : cursorY;
    page.drawText(sanitizeTextForWinAnsi(reasonLines[i]), {
      x: margin + 110,
      y: lineY,
      size: 9,
      font: helvetica,
      color: darkGray,
    });
    if (i < reasonLines.length - 1) {
      cursorY -= 14;
    }
  }

  cursorY -= 19;

  // ── 3. Signers ─────────────────────────────────────────────────────
  cursorY = drawSectionTitle(page, 'Signers', margin, cursorY, helveticaBold, sectionTitleColor);
  cursorY -= 6;

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

  cursorY -= 18;

  // ── 4. How This Document Is Secured ────────────────────────────────
  cursorY = drawSectionTitle(page, 'How this document is secured', margin, cursorY, helveticaBold, sectionTitleColor);
  cursorY -= 5;

  const securityItems = [
    ['Cryptographic Hashing (SHA-256)', 'Document integrity is ensured through SHA-256 hash verification.'],
    ['Digital Signatures (Ethereum secp256k1 + PKCS#7)', 'Signers are authenticated via Ethereum wallet signatures (secp256k1). The PDF is additionally signed with PKCS#7 for Adobe compatibility.'],
    ['Aqua Protocol Verification Record', 'A verifiable hash-tree is embedded with signatures within the PDF for verification.'],
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

    // Wrap description text
    const descMaxWidth = contentWidth - 34;
    const descLines = wrapText(description, helvetica, 8, descMaxWidth);
    for (const line of descLines) {
      cursorY -= 13;
      page.drawText(sanitizeTextForWinAnsi(line), {
        x: margin + 24,
        y: cursorY,
        size: 8,
        font: helvetica,
        color: mediumGray,
      });
    }
  }

  cursorY -= 15;

  // ── 5. Archive Notice ──────────────────────────────────────────────
  cursorY = drawSectionTitle(page, 'Archive notice', margin, cursorY, helveticaBold, sectionTitleColor);
  cursorY -= 3;

  const archiveIntro = 'Store the signed contract alongside the Aquafier Server App, the CLI tool, and the Aqua SDK for verification.';
  const archiveIntroLines = wrapText(archiveIntro, helvetica, 7, contentWidth - 20);
  for (const line of archiveIntroLines) {
    cursorY -= 10;
    page.drawText(sanitizeTextForWinAnsi(line), {
      x: margin + 10,
      y: cursorY,
      size: 9,
      font: helvetica,
      color: darkGray,
    });
  }

  cursorY -= 5;

  // Use the runtime commit hash for aquafier-js if available
  const aquafierJsCommit = aquafierCommitHash || ARCHIVE_BUILDS['aquafier-js'].commit;

  const buildEntries: Array<[string, string, string]> = [
    ['Aqua JS SDK', ARCHIVE_BUILDS['aqua-js-sdk'].repo, ARCHIVE_BUILDS['aqua-js-sdk'].commit],
    ['Aqua JS CLI', ARCHIVE_BUILDS['aqua-js-cli'].repo, ARCHIVE_BUILDS['aqua-js-cli'].commit],
    ['Aquafier JS', ARCHIVE_BUILDS['aquafier-js'].repo, aquafierJsCommit],
  ];

  for (const [name, repo, commit] of buildEntries) {
    cursorY -= 12;
    const entryText = `${name}: ${repo}`;
    const entryTruncated = truncateText(entryText, helvetica, 7, contentWidth - 20);
    page.drawText(sanitizeTextForWinAnsi(`\u2022  ${entryTruncated}`), {
      x: margin + 10,
      y: cursorY,
      size: 8,
      font: helvetica,
      color: darkGray,
    });
    cursorY -= 11;
    page.drawText(sanitizeTextForWinAnsi(`Commit: ${commit}`), {
      x: margin + 24,
      y: cursorY,
      size: 8,
      font: helvetica,
      color: mediumGray,
    });
  }

  cursorY -= 17;

  // ── 6. Verification ────────────────────────────────────────────────
  cursorY = drawSectionTitle(page, 'Verification', margin, cursorY, helveticaBold, sectionTitleColor);
  cursorY -= 5;

  const verifyUrl = `${platformUrl}/app/verify-document`;

  // Generate QR code as PNG
  try {
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 100,
      margin: 1,
      color: { dark: '#E55B1F', light: '#ffffff' },
    });

    // Extract base64 data from data URL
    const base64Data = qrDataUrl.split(',')[1];
    const qrBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const qrImage = await pdfDoc.embedPng(qrBytes);

    const qrSize = 70;
    const qrX = margin + 10;
    const qrY = cursorY - qrSize;

    page.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
    });

    // Text next to QR code
    const textX = qrX + qrSize + 15;
    page.drawText(sanitizeTextForWinAnsi('Scan to Verify'), {
      x: textX,
      y: cursorY - 12,
      size: 10,
      font: helveticaBold,
      color: darkGray,
    });

    page.drawText(sanitizeTextForWinAnsi('To verify this document, scan the QR code or visit:'), {
      x: textX,
      y: cursorY - 26,
      size: 8,
      font: helvetica,
      color: mediumGray,
    });

    // Primary URL
    const urlTruncated = truncateText(verifyUrl, helvetica, 7, contentWidth - qrSize - 35);
    page.drawText(sanitizeTextForWinAnsi(urlTruncated), {
      x: textX,
      y: cursorY - 40,
      size: 7,
      font: helvetica,
      color: sectionTitleColor,
    });

    // Fallback URL
    page.drawText(sanitizeTextForWinAnsi(`Fallback: ${FALLBACK_VERIFY_URL}`), {
      x: textX,
      y: cursorY - 52,
      size: 7,
      font: helvetica,
      color: sectionTitleColor,
    });

    cursorY = qrY - 10;
  } catch (qrError) {
    // Fallback if QR generation fails — just show the URLs
    console.error('Failed to generate QR code:', qrError);
    page.drawText(sanitizeTextForWinAnsi(`Verify at: ${verifyUrl}`), {
      x: margin + 10,
      y: cursorY - 15,
      size: 9,
      font: helvetica,
      color: sectionTitleColor,
    });
    page.drawText(sanitizeTextForWinAnsi(`Fallback: ${FALLBACK_VERIFY_URL}`), {
      x: margin + 10,
      y: cursorY - 28,
      size: 8,
      font: helvetica,
      color: mediumGray,
    });
    cursorY -= 40;
  }

  // ── 7. Footer ──────────────────────────────────────────────────────
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
 * Wraps text into multiple lines to fit within a given width.
 */
function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (font.widthOfTextAtSize(sanitizeTextForWinAnsi(testLine), fontSize) <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [''];
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
