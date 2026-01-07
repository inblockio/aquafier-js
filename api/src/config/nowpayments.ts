import axios from 'axios';

if (!process.env.NOWPAYMENTS_API_KEY) {
  throw new Error('NOWPAYMENTS_API_KEY is not defined in environment variables');
}

const isSandbox = process.env.NOWPAYMENTS_SANDBOX === 'true';

export const NOWPAYMENTS_CONFIG = {
  apiKey: process.env.NOWPAYMENTS_API_KEY,
  ipnSecret: process.env.NOWPAYMENTS_IPN_SECRET || '',
  sandbox: isSandbox,
  baseUrl: isSandbox ? 'https://api-sandbox.nowpayments.io/v1' : 'https://api.nowpayments.io/v1',
  supportedCurrencies: ['btc', 'eth', 'ltc', 'usdt', 'usdc', 'bnb', 'matic'] as const,
} as const;

// Create axios instance for NOWPayments API calls
export const nowPaymentsClient = axios.create({
  baseURL: NOWPAYMENTS_CONFIG.baseUrl,
  headers: {
    'x-api-key': NOWPAYMENTS_CONFIG.apiKey,
    'Content-Type': 'application/json',
  },
});
