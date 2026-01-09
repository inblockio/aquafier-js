import puppeteer from 'puppeteer';
import Logger from './logger';
import { InvoiceData } from '../models/invoice';
import { createTreeAndSave, CreateTreeAndSaveParams, CreateTreeAndSaveResult } from './create_tree_and_save';

export class InvoiceUtils {

    /**
     * Generates a PDF invoice using Puppeteer.
     * @param data Invoice data
     * @returns Buffer containing the PDF data
     */
    static async generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
        const html = this.generateInvoiceHtml(data);
        let browser = null;

        try {
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'] // Required for running in containerized environments
            });
            const page = await browser.newPage();

            // Set content and wait for it to load
            await page.setContent(html, {
                waitUntil: 'networkidle0'
            });

            // Generate PDF
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20px',
                    right: '20px',
                    bottom: '20px',
                    left: '20px'
                }
            });

            return Buffer.from(pdfBuffer);
        } catch (error: any) {
            Logger.error('Error generating PDF invoice:', error);
            throw new Error(`Failed to generate PDF: ${error.message}`);
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    /**
     * Generates a PDF invoice and saves it as an AquaTree revision.
     * @param data Invoice data
     * @param walletAddress Wallet address of the user
     * @param host Host URL
     * @param protocol Protocol (http or https)
     * @param serverAutoSign Whether to auto-sign the AquaTree with server credentials
     * @returns Result of the createTreeAndSave operation
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

    private static generateInvoiceHtml(data: InvoiceData): string {
        const {
            invoiceNumber,
            date,
            dueDate,
            status,
            billingTo,
            billingFrom,
            items,
            subtotal,
            tax,
            taxRate,
            total,
            currency,
            notes,
            footer
        } = data;

        const itemsHtml = items.map(item => `
      <tr>
        <td class="item-desc">${item.description}</td>
        <td class="text-right">${item.quantity}</td>
        <td class="text-right">${this.formatCurrency(item.unitPrice, currency)}</td>
        <td class="text-right">${this.formatCurrency(item.amount, currency)}</td>
      </tr>
    `).join('');

        const formattedDate = this.formatDate(date);
        const formattedDueDate = dueDate ? this.formatDate(dueDate) : '';

        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${invoiceNumber}</title>
        <style>
          body {
            font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif;
            color: #333;
            line-height: 1.5;
            font-size: 14px;
            margin: 0;
            padding: 20px;
          }
          
          .invoice-box {
            max-width: 100%;
            margin: auto;
          }
          
          .header {
            margin-bottom: 40px;
            overflow: hidden;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          
          .header-left {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
          }
          
          .header-right {
            text-align: right;
          }
          
          h1 {
            color: #2c3e50;
            font-size: 36px;
            margin: 0 0 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
            line-height: 1;
          }
          
          .status {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 12px;
            text-transform: uppercase;
          }
          
          .status.PAID { background: #d4edda; color: #155724; }
          .status.PENDING { background: #fff3cd; color: #856404; }
          .status.OVERDUE { background: #f8d7da; color: #721c24; }
          .status.CANCELED { background: #e2e3e5; color: #383d41; }
          
          .meta-info {
            margin-top: 10px;
            font-size: 13px;
            color: #777;
          }

          .meta-info div {
            margin-bottom: 4px;
          }

          .meta-info strong {
            color: #555;
            display: inline-block;
            width: 80px;
          }
          
          .addresses {
            margin-bottom: 40px;
            overflow: hidden;
            display: flex;
            justify-content: space-between;
          }
          
          .bill-to, .bill-from {
            width: 45%;
          }
          
          .section-title {
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            color: #999;
            margin-bottom: 10px;
            border-bottom: 1px solid #eee;
            padding-bottom: 5px;
          }
          
          .address-content p {
            margin: 2px 0;
          }
          
          .highlight {
            font-weight: bold;
            color: #333;
            font-size: 16px;
            margin-bottom: 5px;
            display: block;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          
          th {
            background: #f8f9fa;
            border-bottom: 2px solid #ddd;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 12px;
            color: #555;
            padding: 12px 8px;
            text-align: left;
          }
          
          td {
            padding: 12px 8px;
            border-bottom: 1px solid #eee;
          }
          
          .item-desc {
            width: 50%;
          }
          
          .text-right {
            text-align: right;
          }
          
          .totals-section {
            float: right;
            width: 40%;
            margin-bottom: 40px;
            margin-left: auto;
          }
          
          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px solid transparent;
          }
          
          .total-row.final {
            font-size: 18px;
            font-weight: bold;
            border-top: 2px solid #333;
            margin-top: 10px;
            padding-top: 10px;
          }
          
          .notes-section {
            clear: both;
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 13px;
            color: #777;
          }
          
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #aaa;
          }

          /* Clearfix for floated elements if any */
          .clearfix::after {
            content: "";
            clear: both;
            display: table;
          }
        </style>
      </head>
      <body>
        <div class="invoice-box clearfix">
          <div class="header">
            <div class="header-left">
              <h1>Invoice</h1>
              <div class="status ${status}">${status}</div>
            </div>
            <div class="header-right">
              <div class="highlight">#${invoiceNumber}</div>
              <div class="meta-info">
                <div><strong>Date:</strong> ${formattedDate}</div>
                ${dueDate ? `<div><strong>Due Date:</strong> ${formattedDueDate}</div>` : ''}
              </div>
            </div>
          </div>
          
          <div class="addresses">
            <div class="bill-from">
              <div class="section-title">From</div>
              <div class="address-content">
                <span class="highlight">${billingFrom.name}</span>
                <p style="white-space: pre-line">${billingFrom.address || ''}</p>
                ${billingFrom.email ? `<p>${billingFrom.email}</p>` : ''}
                ${billingFrom.website ? `<p>${billingFrom.website}</p>` : ''}
              </div>
            </div>
            
            <div class="bill-to">
              <div class="section-title">Bill To</div>
              <div class="address-content">
                <span class="highlight">${billingTo.name}</span>
                <p style="white-space: pre-line">${billingTo.address || ''}</p>
                ${billingTo.email ? `<p>${billingTo.email}</p>` : ''}
              </div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="totals-section">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>${this.formatCurrency(subtotal, currency)}</span>
            </div>
            ${tax && tax > 0 ? `
              <div class="total-row">
                <span>Tax ${taxRate ? `(${taxRate}%)` : ''}:</span>
                <span>${this.formatCurrency(tax, currency)}</span>
              </div>
            ` : ''}
            <div class="total-row final">
              <span>Total:</span>
              <span>${this.formatCurrency(total, currency)}</span>
            </div>
          </div>
          
          ${notes ? `
            <div class="notes-section">
              <strong>Notes:</strong><br>
              ${notes}
            </div>
          ` : ''}
          
          ${footer ? `
            <div class="footer">
              ${footer}
            </div>
          ` : ''}
        </div>
      </body>
      </html>
    `;
    }
}
