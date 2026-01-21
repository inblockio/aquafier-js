
import { InvoiceUtils } from '../utils/invoice_utils';
import { InvoiceData } from '../models/invoice';
import { createTreeAndSave, CreateTreeAndSaveParams } from '../utils/create_tree_and_save';

async function test() {
    const data: InvoiceData = {
        invoiceNumber: 'INV-1001',
        date: new Date(),
        // dueDate: new Date(Date.now() + 86400000 * 30),
        status: 'PAID',
        billingTo: {
            name: 'Dalmas Ogembo',
            address: 'Online',
            // email: 'john@example.com'
        },
        billingFrom: {
            name: 'Inblokcio GmbH Assets',
            address: '456 Business Rd\nTech City',
            email: 'billing@inblockio.com',
            website: 'www.inblockio.com'
        },
        items: [
            { description: 'Aquafier Professional Plan', quantity: 1, unitPrice: 29.99, amount: 29.99 },
        ],
        subtotal: 29.99,
        // tax: 13,
        // taxRate: 10,
        total: 29.99,
        currency: 'USD',
        notes: 'Thank you for your business!'
    };

    try {
        console.log('Generating and Saving PDF Invoice...');

        const result = await InvoiceUtils.createAndSaveInvoice(
            data,
            '0x254B0D7b63342Fcb8955DB82e95C21d72EFdB6f7',
            'localhost:3000',
            'http',
            true
        );

        console.log('PDF Generated and Saved!', JSON.stringify(result.fileObject, null, 2));
    } catch (error: any) {
        console.log('Caught expected error (or unexpected):', error.message);
    }
}

test();
