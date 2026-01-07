import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

export const STRIPE_CONFIG = {
  secretKey: process.env.STRIPE_SECRET_KEY,
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  currency: (process.env.STRIPE_CURRENCY || 'USD').toLowerCase(),
  successUrl: process.env.PAYMENT_FRONTEND_SUCCESS_URL || 'http://localhost:5173/payment/success',
  cancelUrl: process.env.PAYMENT_FRONTEND_CANCEL_URL || 'http://localhost:5173/payment/cancel',
} as const;
