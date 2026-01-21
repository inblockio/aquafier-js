export interface InvoiceItem {
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
}

export interface InvoiceData {
    invoiceNumber: string;
    date: Date;
    dueDate?: Date;
    status: 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELED';

    billingTo: {
        name: string;
        address?: string;
        email?: string;
    };

    billingFrom: {
        name: string;
        address?: string;
        email?: string;
        website?: string;
    };

    items: InvoiceItem[];

    subtotal: number;
    tax?: number;
    taxRate?: number;
    total: number;
    currency: string;

    notes?: string;
    footer?: string;
}
