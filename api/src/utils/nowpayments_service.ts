import axios from 'axios';
import Logger from './logger';

const NOWPAYMENTS_API_URL = 'https://api.nowpayments.io/v1';

export class NOWPaymentsService {
  /**
   * Create a payment
   */
  static async createPayment(params: {
    price_amount: number;
    price_currency: string;
    pay_currency?: string;
    order_id: string;
    order_description: string;
    ipn_callback_url?: string;
    success_url?: string;
    cancel_url?: string;
  }) {
    try {
      const response = await axios.post(
        `${NOWPAYMENTS_API_URL}/invoice`,
        {
          price_amount: params.price_amount,
          price_currency: params.price_currency,
          pay_currency: params.pay_currency || 'btc', // Default to Bitcoin
          order_id: params.order_id,
          order_description: params.order_description,
          ipn_callback_url: params.ipn_callback_url,
          success_url: params.success_url,
          cancel_url: params.cancel_url,
        },
        {
          headers: {
            'x-api-key': process.env.NOWPAYMENTS_API_KEY || '',
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      Logger.error('NOWPayments create payment error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to create crypto payment');
    }
  }

  /**
   * Get payment status
   */
  static async getPaymentStatus(paymentId: string) {
    try {
      const response = await axios.get(
        `${NOWPAYMENTS_API_URL}/payment/${paymentId}`,
        {
          headers: {
            'x-api-key': process.env.NOWPAYMENTS_API_KEY || '',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      Logger.error('NOWPayments get payment status error:', error.response?.data || error.message);
      throw new Error('Failed to get payment status');
    }
  }

  /**
   * Get available currencies
   */
  static async getAvailableCurrencies() {
    try {
      const response = await axios.get(
        `${NOWPAYMENTS_API_URL}/currencies`,
        {
          headers: {
            'x-api-key': process.env.NOWPAYMENTS_API_KEY || '',
          },
        }
      );

      return response.data.currencies;
    } catch (error: any) {
      Logger.error('NOWPayments get currencies error:', error.response?.data || error.message);
      throw new Error('Failed to get available currencies');
    }
  }

  /**
   * Get minimum payment amount for a currency
   */
  static async getMinimumPaymentAmount(currency: string) {
    try {
      const response = await axios.get(
        `${NOWPAYMENTS_API_URL}/min-amount`,
        {
          params: { currency_from: 'usd', currency_to: currency },
          headers: {
            'x-api-key': process.env.NOWPAYMENTS_API_KEY || '',
          },
        }
      );

      return response.data.min_amount;
    } catch (error: any) {
      Logger.error('NOWPayments get min amount error:', error.response?.data || error.message);
      throw new Error('Failed to get minimum payment amount');
    }
  }

  /**
   * Verify IPN callback signature
   */
  static verifyIPNSignature(receivedSignature: string, payload: string): boolean {
    const crypto = require('crypto');
    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET || '';

    const hmac = crypto.createHmac('sha512', ipnSecret);
    hmac.update(payload);
    const calculatedSignature = hmac.digest('hex');

    return receivedSignature === calculatedSignature;
  }
}
