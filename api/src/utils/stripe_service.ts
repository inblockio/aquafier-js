import Stripe from 'stripe';
import Logger from './logger';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover',
  typescript: true,
});

export class StripeService {
  /**
   * Create a Stripe customer
   */
  static async createCustomer(params: {
    email?: string;
    name?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Customer> {
    try {
      const customer = await stripe.customers.create({
        email: params.email,
        name: params.name,
        metadata: params.metadata,
      });

      Logger.info('Stripe customer created', { customer_id: customer.id });
      return customer;
    } catch (error) {
      Logger.error('Error creating Stripe customer:', error);
      throw error;
    }
  }

  /**
   * Create a checkout session for subscription
   */
  static async createCheckoutSession(params: {
    customer_id?: string;
    price_id: string;
    success_url: string;
    cancel_url: string;
    metadata?: Record<string, string>;
    trial_period_days?: number;
  }): Promise<Stripe.Checkout.Session> {
    try {
      const session = await stripe.checkout.sessions.create({
        customer: params.customer_id,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: params.price_id,
            quantity: 1,
          },
        ],
        success_url: params.success_url,
        cancel_url: params.cancel_url,
        metadata: params.metadata,
        subscription_data: params.trial_period_days
          ? {
              trial_period_days: params.trial_period_days,
              metadata: params.metadata,
            }
          : { metadata: params.metadata },
      });

      Logger.info('Stripe checkout session created', { session_id: session.id });
      return session;
    } catch (error) {
      Logger.error('Error creating Stripe checkout session:', error);
      throw error;
    }
  }

  /**
   * Create a billing portal session
   */
  static async createPortalSession(params: {
    customer_id: string;
    return_url: string;
  }): Promise<Stripe.BillingPortal.Session> {
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: params.customer_id,
        return_url: params.return_url,
      });

      Logger.info('Stripe portal session created', { session_id: session.id });
      return session;
    } catch (error) {
      Logger.error('Error creating Stripe portal session:', error);
      throw error;
    }
  }

  /**
   * Get subscription details
   */
  static async getSubscription(
    subscription_id: string
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscription_id);
      return subscription;
    } catch (error) {
      Logger.error('Error retrieving Stripe subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
  static async cancelSubscription(params: {
    subscription_id: string;
    cancel_at_period_end: boolean;
  }): Promise<Stripe.Subscription> {
    try {
      let subscription: Stripe.Subscription;

      if (params.cancel_at_period_end) {
        subscription = await stripe.subscriptions.update(params.subscription_id, {
          cancel_at_period_end: true,
        });
      } else {
        subscription = await stripe.subscriptions.cancel(params.subscription_id);
      }

      Logger.info('Stripe subscription canceled', {
        subscription_id: params.subscription_id,
        immediate: !params.cancel_at_period_end,
      });

      return subscription;
    } catch (error) {
      Logger.error('Error canceling Stripe subscription:', error);
      throw error;
    }
  }

  /**
   * Update subscription (change plan)
   */
  static async updateSubscription(params: {
    subscription_id: string;
    new_price_id: string;
    proration_behavior?: 'create_prorations' | 'none' | 'always_invoice';
  }): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.retrieve(
        params.subscription_id
      );

      const updatedSubscription = await stripe.subscriptions.update(
        params.subscription_id,
        {
          items: [
            {
              id: subscription.items.data[0].id,
              price: params.new_price_id,
            },
          ],
          proration_behavior: params.proration_behavior || 'create_prorations',
        }
      );

      Logger.info('Stripe subscription updated', {
        subscription_id: params.subscription_id,
        new_price_id: params.new_price_id,
      });

      return updatedSubscription;
    } catch (error) {
      Logger.error('Error updating Stripe subscription:', error);
      throw error;
    }
  }

  /**
   * Construct webhook event from request
   */
  static constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
    webhookSecret: string
  ): Stripe.Event {
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );
      return event;
    } catch (error) {
      Logger.error('Error constructing Stripe webhook event:', error);
      throw error;
    }
  }

  /**
   * Create a payment intent (for one-time payments)
   */
  static async createPaymentIntent(params: {
    amount: number; // in cents
    currency: string;
    customer_id?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: params.amount,
        currency: params.currency,
        customer: params.customer_id,
        metadata: params.metadata,
      });

      Logger.info('Stripe payment intent created', {
        payment_intent_id: paymentIntent.id,
      });

      return paymentIntent;
    } catch (error) {
      Logger.error('Error creating Stripe payment intent:', error);
      throw error;
    }
  }

  /**
   * Retrieve customer
   */
  static async getCustomer(customer_id: string): Promise<Stripe.Customer> {
    try {
      const customer = await stripe.customers.retrieve(customer_id);
      return customer as Stripe.Customer;
    } catch (error) {
      Logger.error('Error retrieving Stripe customer:', error);
      throw error;
    }
  }

  /**
   * List invoices for a customer
   */
  static async listInvoices(
    customer_id: string,
    limit: number = 10
  ): Promise<Stripe.Invoice[]> {
    try {
      const invoices = await stripe.invoices.list({
        customer: customer_id,
        limit: limit,
      });

      return invoices.data;
    } catch (error) {
      Logger.error('Error listing Stripe invoices:', error);
      throw error;
    }
  }

  /**
   * Create a refund
   */
  static async createRefund(params: {
    payment_intent_id: string;
    amount?: number; // Optional partial refund amount in cents
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  }): Promise<Stripe.Refund> {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: params.payment_intent_id,
        amount: params.amount,
        reason: params.reason,
      });

      Logger.info('Stripe refund created', { refund_id: refund.id });
      return refund;
    } catch (error) {
      Logger.error('Error creating Stripe refund:', error);
      throw error;
    }
  }
}

export default stripe;
