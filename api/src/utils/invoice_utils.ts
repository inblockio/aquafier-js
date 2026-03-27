import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import Logger from './logger';
import { InvoiceData } from '../models/invoice';
import { createTreeAndSave, CreateTreeAndSaveParams, CreateTreeAndSaveResult } from './create_tree_and_save';

// Colors
const COLOR_DARK = rgb(0.17, 0.24, 0.31);      // #2c3e50
const COLOR_TEXT = rgb(0.2, 0.2, 0.2);          // #333
const COLOR_MUTED = rgb(0.47, 0.47, 0.47);      // #777
const COLOR_LIGHT_MUTED = rgb(0.6, 0.6, 0.6);   // #999
const COLOR_LINE = rgb(0.87, 0.87, 0.87);        // #ddd
const COLOR_LINE_LIGHT = rgb(0.93, 0.93, 0.93);  // #eee
const COLOR_TABLE_BG = rgb(0.97, 0.97, 0.98);    // #f8f9fa
const COLOR_PAID_BG = rgb(0.83, 0.93, 0.85);     // #d4edda
const COLOR_PAID_TEXT = rgb(0.08, 0.34, 0.14);   // #155724
const COLOR_PENDING_BG = rgb(1, 0.95, 0.8);      // #fff3cd
const COLOR_PENDING_TEXT = rgb(0.52, 0.39, 0.02); // #856404

export class InvoiceUtils {

    /**
     * Word-wrap text to fit within a maximum pixel width.
     * Handles long unbreakable strings (like wallet addresses) by splitting mid-word.
     */
    private static wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
        const lines: string[] = [];

        // First split on explicit newlines
        for (const paragraph of text.split('\n')) {
            const words = paragraph.split(/\s+/).filter(w => w.length > 0);
            if (words.length === 0) {
                lines.push('');
                continue;
            }

            let currentLine = '';

            for (const word of words) {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                const testWidth = font.widthOfTextAtSize(testLine, fontSize);

                if (testWidth <= maxWidth) {
                    currentLine = testLine;
                } else if (!currentLine) {
                    // Single word exceeds maxWidth — force-break it character by character
                    let partial = '';
                    for (const char of word) {
                        const partialTest = partial + char;
                        if (font.widthOfTextAtSize(partialTest, fontSize) > maxWidth && partial.length > 0) {
                            lines.push(partial);
                            partial = char;
                        } else {
                            partial = partialTest;
                        }
                    }
                    currentLine = partial;
                } else {
                    // Push current line and start a new one with this word
                    lines.push(currentLine);
                    // The word itself might be too long, so recurse on it
                    if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
                        let partial = '';
                        for (const char of word) {
                            const partialTest = partial + char;
                            if (font.widthOfTextAtSize(partialTest, fontSize) > maxWidth && partial.length > 0) {
                                lines.push(partial);
                                partial = char;
                            } else {
                                partial = partialTest;
                            }
                        }
                        currentLine = partial;
                    } else {
                        currentLine = word;
                    }
                }
            }

            if (currentLine) {
                lines.push(currentLine);
            }
        }

        return lines;
    }

    /**
     * Draw wrapped text lines, returning the new Y position after all lines.
     */
    private static drawWrappedText(
        page: PDFPage,
        text: string,
        x: number,
        y: number,
        maxWidth: number,
        lineHeight: number,
        font: PDFFont,
        fontSize: number,
        color: ReturnType<typeof rgb>,
    ): number {
        const lines = this.wrapText(text, font, fontSize, maxWidth);
        for (const line of lines) {
            page.drawText(line, { x, y, size: fontSize, font, color });
            y -= lineHeight;
        }
        return y;
    }

    /**
     * Generates a PDF invoice using pdf-lib (no browser required).
     */
    static async generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
        try {
            const pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage([595.28, 841.89]); // A4
            const { width, height } = page.getSize();

            const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

            const margin = 50;
            const contentWidth = width - margin * 2;
            let y = height - margin;

            // ── Header ──────────────────────────────────────────────
            // "INVOICE" title
            page.drawText('INVOICE', {
                x: margin,
                y: y - 5,
                size: 30,
                font: fontBold,
                color: COLOR_DARK,
            });

            // Status badge
            const statusColors = this.getStatusColors(data.status);
            const statusText = data.status;
            const statusWidth = fontBold.widthOfTextAtSize(statusText, 10) + 16;
            page.drawRectangle({
                x: margin,
                y: y - 30,
                width: statusWidth,
                height: 18,
                color: statusColors.bg,
                borderColor: statusColors.bg,
            });
            page.drawText(statusText, {
                x: margin + 8,
                y: y - 26,
                size: 10,
                font: fontBold,
                color: statusColors.text,
            });

            // Invoice number (right side)
            const invoiceNumText = `#${data.invoiceNumber}`;
            const invoiceNumWidth = fontBold.widthOfTextAtSize(invoiceNumText, 14);
            page.drawText(invoiceNumText, {
                x: width - margin - invoiceNumWidth,
                y: y - 5,
                size: 14,
                font: fontBold,
                color: COLOR_TEXT,
            });

            // Date (right side)
            const dateText = `Date: ${this.formatDate(data.date)}`;
            const dateWidth = fontRegular.widthOfTextAtSize(dateText, 10);
            page.drawText(dateText, {
                x: width - margin - dateWidth,
                y: y - 22,
                size: 10,
                font: fontRegular,
                color: COLOR_MUTED,
            });

            if (data.dueDate) {
                const dueDateText = `Due Date: ${this.formatDate(data.dueDate)}`;
                const dueDateWidth = fontRegular.widthOfTextAtSize(dueDateText, 10);
                page.drawText(dueDateText, {
                    x: width - margin - dueDateWidth,
                    y: y - 36,
                    size: 10,
                    font: fontRegular,
                    color: COLOR_MUTED,
                });
            }

            y -= 70;

            // ── Divider ─────────────────────────────────────────────
            page.drawLine({
                start: { x: margin, y },
                end: { x: width - margin, y },
                thickness: 1,
                color: COLOR_LINE,
            });

            y -= 30;

            // ── Addresses ───────────────────────────────────────────
            const colWidth = contentWidth / 2 - 10;
            const addressStartY = y;

            // — From column —
            let leftY = addressStartY;

            page.drawText('FROM', {
                x: margin,
                y: leftY,
                size: 9,
                font: fontBold,
                color: COLOR_LIGHT_MUTED,
            });
            leftY -= 4;
            page.drawLine({
                start: { x: margin, y: leftY },
                end: { x: margin + colWidth, y: leftY },
                thickness: 0.5,
                color: COLOR_LINE_LIGHT,
            });
            leftY -= 16;

            leftY = this.drawWrappedText(page, data.billingFrom.name, margin, leftY, colWidth, 14, fontBold, 12, COLOR_TEXT);
            leftY -= 2;

            if (data.billingFrom.address) {
                leftY = this.drawWrappedText(page, data.billingFrom.address, margin, leftY, colWidth, 14, fontRegular, 10, COLOR_MUTED);
            }
            if (data.billingFrom.email) {
                leftY = this.drawWrappedText(page, data.billingFrom.email, margin, leftY, colWidth, 14, fontRegular, 10, COLOR_MUTED);
            }
            if (data.billingFrom.website) {
                leftY = this.drawWrappedText(page, data.billingFrom.website, margin, leftY, colWidth, 14, fontRegular, 10, COLOR_MUTED);
            }

            // — Bill To column —
            let rightY = addressStartY;
            const rightX = margin + colWidth + 20;

            page.drawText('BILL TO', {
                x: rightX,
                y: rightY,
                size: 9,
                font: fontBold,
                color: COLOR_LIGHT_MUTED,
            });
            rightY -= 4;
            page.drawLine({
                start: { x: rightX, y: rightY },
                end: { x: rightX + colWidth, y: rightY },
                thickness: 0.5,
                color: COLOR_LINE_LIGHT,
            });
            rightY -= 16;

            // Name / wallet address — wrap within column
            rightY = this.drawWrappedText(page, data.billingTo.name, rightX, rightY, colWidth, 14, fontBold, 12, COLOR_TEXT);
            rightY -= 2;

            if (data.billingTo.address) {
                rightY = this.drawWrappedText(page, data.billingTo.address, rightX, rightY, colWidth, 14, fontRegular, 10, COLOR_MUTED);
            }
            if (data.billingTo.email) {
                rightY = this.drawWrappedText(page, data.billingTo.email, rightX, rightY, colWidth, 14, fontRegular, 10, COLOR_MUTED);
            }

            // Advance past whichever column is taller
            y = Math.min(leftY, rightY) - 30;

            // ── Items Table ─────────────────────────────────────────
            const colDesc = margin;
            const colQty = margin + contentWidth * 0.5;
            const colAmount = margin + contentWidth * 0.85;
            const tableRight = width - margin;
            const descMaxWidth = colQty - colDesc - 16; // max width for description text

            // Table header background
            page.drawRectangle({
                x: margin,
                y: y - 4,
                width: contentWidth,
                height: 22,
                color: COLOR_TABLE_BG,
            });

            // Table header text
            const headerY = y;
            page.drawText('DESCRIPTION', { x: colDesc + 8, y: headerY, size: 9, font: fontBold, color: COLOR_MUTED });
            this.drawRightAlignedText(page, 'QTY', colQty + 40, headerY, 9, fontBold, COLOR_MUTED);
            this.drawRightAlignedText(page, 'UNIT PRICE', colAmount - 10, headerY, 9, fontBold, COLOR_MUTED);
            this.drawRightAlignedText(page, 'AMOUNT', tableRight - 8, headerY, 9, fontBold, COLOR_MUTED);

            // Header bottom border
            page.drawLine({
                start: { x: margin, y: y - 5 },
                end: { x: tableRight, y: y - 5 },
                thickness: 1.5,
                color: COLOR_LINE,
            });

            y -= 22;

            // Table rows
            for (const item of data.items) {
                // Wrap description within its column
                const descLines = this.wrapText(item.description, fontRegular, 10, descMaxWidth);
                const rowStartY = y;

                for (const line of descLines) {
                    page.drawText(line, {
                        x: colDesc + 8,
                        y,
                        size: 10,
                        font: fontRegular,
                        color: COLOR_TEXT,
                    });
                    y -= 14;
                }
                // Back up one lineHeight since we overshot
                y += 14;

                // Draw qty, unit price, amount on the first line of the row
                this.drawRightAlignedText(page, String(item.quantity), colQty + 40, rowStartY, 10, fontRegular, COLOR_TEXT);
                this.drawRightAlignedText(page, this.formatCurrency(item.unitPrice, data.currency), colAmount - 10, rowStartY, 10, fontRegular, COLOR_TEXT);
                this.drawRightAlignedText(page, this.formatCurrency(item.amount, data.currency), tableRight - 8, rowStartY, 10, fontRegular, COLOR_TEXT);

                y -= 6;
                page.drawLine({
                    start: { x: margin, y },
                    end: { x: tableRight, y },
                    thickness: 0.5,
                    color: COLOR_LINE_LIGHT,
                });
                y -= 18;
            }

            y -= 10;

            // ── Totals (right-aligned) ──────────────────────────────
            const totalsX = margin + contentWidth * 0.55;

            // Subtotal
            page.drawText('Subtotal:', { x: totalsX, y, size: 10, font: fontRegular, color: COLOR_TEXT });
            this.drawRightAlignedText(page, this.formatCurrency(data.subtotal, data.currency), tableRight - 8, y, 10, fontRegular, COLOR_TEXT);
            y -= 18;

            // Tax
            if (data.tax && data.tax > 0) {
                const taxLabel = data.taxRate ? `Tax (${data.taxRate}%):` : 'Tax:';
                page.drawText(taxLabel, { x: totalsX, y, size: 10, font: fontRegular, color: COLOR_TEXT });
                this.drawRightAlignedText(page, this.formatCurrency(data.tax, data.currency), tableRight - 8, y, 10, fontRegular, COLOR_TEXT);
                y -= 18;
            }

            // Total divider
            page.drawLine({
                start: { x: totalsX, y: y + 8 },
                end: { x: tableRight, y: y + 8 },
                thickness: 1.5,
                color: COLOR_DARK,
            });

            y -= 4;
            page.drawText('Total:', { x: totalsX, y, size: 14, font: fontBold, color: COLOR_DARK });
            this.drawRightAlignedText(page, this.formatCurrency(data.total, data.currency), tableRight - 8, y, 14, fontBold, COLOR_DARK);

            y -= 40;

            // ── Notes ───────────────────────────────────────────────
            if (data.notes) {
                page.drawLine({
                    start: { x: margin, y: y + 10 },
                    end: { x: width - margin, y: y + 10 },
                    thickness: 0.5,
                    color: COLOR_LINE_LIGHT,
                });

                page.drawText('Notes:', { x: margin, y: y - 6, size: 10, font: fontBold, color: COLOR_MUTED });
                y -= 20;
                y = this.drawWrappedText(page, data.notes, margin, y, contentWidth, 14, fontRegular, 10, COLOR_MUTED);
                y -= 20;
            }

            // ── Footer ─────────────────────────────────────────────
            if (data.footer) {
                const footerLines = this.wrapText(data.footer, fontRegular, 9, contentWidth);
                let footerY = margin;
                for (const line of footerLines) {
                    const lineWidth = fontRegular.widthOfTextAtSize(line, 9);
                    page.drawText(line, {
                        x: (width - lineWidth) / 2,
                        y: footerY,
                        size: 9,
                        font: fontRegular,
                        color: COLOR_LIGHT_MUTED,
                    });
                    footerY -= 12;
                }
            }

            const pdfBytes = await pdfDoc.save();
            return Buffer.from(pdfBytes);
        } catch (error: any) {
            Logger.error('Error generating PDF invoice:', error);
            throw new Error(`Failed to generate PDF: ${error.message}`);
        }
    }

    /**
     * Generates a PDF invoice and saves it as an AquaTree revision.
     */
    static async createAndSaveInvoice(
        data: InvoiceData,
        walletAddress: string,
        host: string,
        protocol: string,
        serverAutoSign: boolean = true
    ): Promise<CreateTreeAndSaveResult> {
        const pdfBuffer = await this.generateInvoicePdf(data);

        const params: CreateTreeAndSaveParams = {
            walletAddress: walletAddress,
            fileBuffer: pdfBuffer,
            filename: `${data.invoiceNumber}_${data.billingTo.name.replace(/\s+/g, '_')}.pdf`,
            isForm: false,
            enableContent: true,
            enableScalar: true,
            host: host,
            protocol: protocol,
            serverAutoSign: serverAutoSign
        };

        return await createTreeAndSave(params);
    }

    private static formatCurrency(amount: number, currency: string): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount);
    }

    private static formatDate(date: Date): string {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    }

    private static drawRightAlignedText(
        page: PDFPage,
        text: string,
        rightX: number,
        y: number,
        size: number,
        font: PDFFont,
        color: ReturnType<typeof rgb>
    ) {
        const textWidth = font.widthOfTextAtSize(text, size);
        page.drawText(text, {
            x: rightX - textWidth,
            y,
            size,
            font,
            color,
        });
    }

    private static getStatusColors(status: string): { bg: ReturnType<typeof rgb>; text: ReturnType<typeof rgb> } {
        switch (status) {
            case 'PAID':
                return { bg: COLOR_PAID_BG, text: COLOR_PAID_TEXT };
            case 'PENDING':
                return { bg: COLOR_PENDING_BG, text: COLOR_PENDING_TEXT };
            case 'OVERDUE':
                return { bg: rgb(0.97, 0.84, 0.85), text: rgb(0.45, 0.11, 0.14) };
            case 'CANCELED':
                return { bg: rgb(0.89, 0.89, 0.9), text: rgb(0.22, 0.24, 0.25) };
            default:
                return { bg: COLOR_TABLE_BG, text: COLOR_TEXT };
        }
    }
}
