import { prisma } from '../database/db';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Payment Service Utilities
 * Common operations for payment and subscription management
 */

/**
 * Generate a unique invoice number
 */
export async function generateInvoiceNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  // Find the last invoice for this month
  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      invoice_number: {
        startsWith: `INV-${year}${month}-`,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  let sequence = 1;
  if (lastInvoice) {
    const lastSequence = parseInt(lastInvoice.invoice_number.split('-')[2]);
    sequence = lastSequence + 1;
  }

  return `INV-${year}${month}-${String(sequence).padStart(4, '0')}`;
}

/**
 * Get or create a subscription for a user
 */
export async function getOrCreateFreeSubscription(userAddress: string) {
  // Check if user has an active subscription
  const existingSubscription = await prisma.userSubscription.findFirst({
    where: {
      user_address: userAddress,
      status: 'active',
    },
    include: {
      Plan: true,
    },
  });

  if (existingSubscription) {
    return existingSubscription;
  }

  // Get the free plan
  const freePlan = await prisma.subscriptionPlan.findFirst({
    where: {
      name: 'free',
      is_active: true,
    },
  });

  if (!freePlan) {
    throw new Error('Free plan not found. Please seed subscription plans first.');
  }

  // Create a free subscription for the user
  const now = new Date();
  const oneYearFromNow = new Date(now);
  oneYearFromNow.setFullYear(now.getFullYear() + 1);

  const subscription = await prisma.userSubscription.create({
    data: {
      user_address: userAddress,
      plan_id: freePlan.id,
      status: 'active',
      billing_cycle: 'yearly',
      current_period_start: now,
      current_period_end: oneYearFromNow,
      payment_provider: 'none',
      auto_renew: false,
    },
    include: {
      Plan: true,
    },
  });

  return subscription;
}

/**
 * Check if a subscription is active and not expired
 */
export async function isSubscriptionActive(subscriptionId: string): Promise<boolean> {
  const subscription = await prisma.userSubscription.findUnique({
    where: { id: subscriptionId },
  });

  if (!subscription) {
    return false;
  }

  const now = new Date();
  return (
    subscription.status === 'active' &&
    subscription.current_period_end > now
  );
}

/**
 * Get active subscription for a user
 */
export async function getUserActiveSubscription(userAddress: string) {
  return await prisma.userSubscription.findFirst({
    where: {
      user_address: userAddress,
      status: 'active',
      current_period_end: {
        gte: new Date(),
      },
    },
    include: {
      Plan: true,
    },
  });
}

/**
 * Check if user has access to a feature based on their subscription
 */
export async function hasFeatureAccess(
  userAddress: string,
  feature: string
): Promise<boolean> {
  const subscription = await getUserActiveSubscription(userAddress);

  if (!subscription) {
    return false;
  }

  const features = subscription.Plan.features as any;
  return features && features[feature] !== undefined;
}

/**
 * Create a payment record
 */
export async function createPaymentRecord(data: {
  user_address: string;
  subscription_id?: string;
  invoice_id?: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_provider: string;
  status: string;
  payment_intent_id?: string;
  crypto_transaction_hash?: string;
  crypto_wallet_address?: string;
  crypto_amount?: number;
  crypto_network?: string;
  exchange_rate?: number;
  metadata?: any;
}) {
  return await prisma.payment.create({
    data: {
      ...data,
      amount: new Decimal(data.amount),
      crypto_amount: data.crypto_amount ? new Decimal(data.crypto_amount) : undefined,
      exchange_rate: data.exchange_rate ? new Decimal(data.exchange_rate) : undefined,
    },
  });
}

/**
 * Update payment status
 */
export async function updatePaymentStatus(
  paymentId: string,
  status: string,
  additionalData?: {
    paid_at?: Date;
    failure_reason?: string;
    crypto_transaction_hash?: string;
  }
) {
  return await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status,
      ...additionalData,
    },
  });
}

/**
 * Create an invoice with line items
 */
export async function createInvoice(data: {
  user_address: string;
  subscription_id?: string;
  billing_reason?: string;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_amount: number;
    period_start?: Date;
    period_end?: Date;
  }>;
  tax?: number;
  stripe_invoice_id?: string;
}) {
  const invoice_number = await generateInvoiceNumber();
  const subtotal = data.line_items.reduce((sum, item) => sum + item.unit_amount * item.quantity, 0);
  const tax = data.tax || 0;
  const total = subtotal + tax;

  return await prisma.invoice.create({
    data: {
      invoice_number,
      user_address: data.user_address,
      subscription_id: data.subscription_id,
      status: 'open',
      subtotal: new Decimal(subtotal),
      tax: new Decimal(tax),
      total: new Decimal(total),
      billing_reason: data.billing_reason,
      stripe_invoice_id: data.stripe_invoice_id,
      LineItems: {
        create: data.line_items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit_amount: new Decimal(item.unit_amount),
          amount: new Decimal(item.unit_amount * item.quantity),
          period_start: item.period_start,
          period_end: item.period_end,
        })),
      },
    },
    include: {
      LineItems: true,
    },
  });
}

/**
 * Mark invoice as paid
 */
export async function markInvoiceAsPaid(invoiceId: string, paidAt?: Date) {
  return await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: 'paid',
      paid_at: paidAt || new Date(),
    },
  });
}

/**
 * Record subscription usage
 */
export async function recordUsage(data: {
  subscription_id: string;
  user_address: string;
  metric_name: string;
  usage_value: number;
  usage_limit?: number;
  period_start: Date;
  period_end: Date;
}) {
  return await prisma.subscriptionUsage.create({
    data,
  });
}

/**
 * Get usage for a subscription in current period
 */
export async function getSubscriptionUsage(
  subscriptionId: string,
  metricName: string,
  periodStart: Date,
  periodEnd: Date
) {
  return await prisma.subscriptionUsage.findMany({
    where: {
      subscription_id: subscriptionId,
      metric_name: metricName,
      period_start: {
        gte: periodStart,
      },
      period_end: {
        lte: periodEnd,
      },
    },
    orderBy: {
      recorded_at: 'desc',
    },
  });
}

/**
 * Calculate total usage for a metric in current period
 */
export async function getTotalUsage(
  subscriptionId: string,
  metricName: string,
  periodStart: Date,
  periodEnd: Date
): Promise<number> {
  const usageRecords = await getSubscriptionUsage(
    subscriptionId,
    metricName,
    periodStart,
    periodEnd
  );

  return usageRecords.reduce((sum, record) => sum + record.usage_value, 0);
}

/**
 * Update subscription status
 */
export async function updateSubscriptionStatus(
  subscriptionId: string,
  status: string,
  additionalData?: {
    canceled_at?: Date;
    cancel_at_period_end?: boolean;
    current_period_end?: Date;
  }
) {
  return await prisma.userSubscription.update({
    where: { id: subscriptionId },
    data: {
      status,
      ...additionalData,
    },
  });
}

/**
 * Get payment methods for a user
 */
export async function getUserPaymentMethods(userAddress: string) {
  return await prisma.paymentMethod.findMany({
    where: {
      user_address: userAddress,
      is_active: true,
    },
    orderBy: [
      { is_default: 'desc' },
      { createdAt: 'desc' },
    ],
  });
}

/**
 * Set default payment method
 */
export async function setDefaultPaymentMethod(
  paymentMethodId: string,
  userAddress: string
) {
  // Remove default from all other payment methods
  await prisma.paymentMethod.updateMany({
    where: {
      user_address: userAddress,
    },
    data: {
      is_default: false,
    },
  });

  // Set the new default
  return await prisma.paymentMethod.update({
    where: { id: paymentMethodId },
    data: { is_default: true },
  });
}
