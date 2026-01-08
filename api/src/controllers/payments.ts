import { FastifyInstance, FastifyReply } from 'fastify';
import { prisma } from '../database/db';
import { AuthenticatedRequest, authenticate } from '../middleware/auth_middleware';
import Logger from '../utils/logger';
import { StripeService } from '../utils/stripe_service';
import { NOWPaymentsService } from '../utils/nowpayments_service';
import Stripe from 'stripe';
import { cliGreenify, cliRedify } from 'aqua-js-sdk';

export default async function paymentsController(fastify: FastifyInstance) {

  // ============================================================================
  // STRIPE PAYMENT ENDPOINTS
  // ============================================================================

  /**
   * POST /payments/stripe/create-checkout
   * Create a Stripe checkout session for subscription payment
   */
  fastify.post(
    '/payments/stripe/create-checkout',
    { preHandler: authenticate },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const userAddress = request.user?.address;

        if (!userAddress) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const { plan_id, billing_period, success_url, cancel_url } = request.body as {
          plan_id: string;
          billing_period: 'MONTHLY' | 'YEARLY';
          success_url: string;
          cancel_url: string;
        };

        // Get plan details
        const plan = await prisma.subscriptionPlan.findUnique({
          where: { id: plan_id },
        });

        if (!plan) {
          return reply.code(404).send({
            success: false,
            error: 'Plan not found',
          });
        }

        // Get Stripe price ID based on billing period
        const stripePriceId =
          billing_period === 'YEARLY'
            ? plan.stripe_yearly_price_id
            : plan.stripe_monthly_price_id;

        if (!stripePriceId) {
          return reply.code(400).send({
            success: false,
            error: 'Stripe price ID not configured for this plan',
          });
        }

        // Get or create Stripe customer
        let stripeCustomerId: string | undefined;

        const existingSubscription = await prisma.subscription.findFirst({
          where: {
            user_address: userAddress,
            stripe_customer_id: { not: null },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (existingSubscription?.stripe_customer_id) {
          stripeCustomerId = existingSubscription.stripe_customer_id;
        } else {
          // Create new Stripe customer
          const user = await prisma.users.findUnique({
            where: { address: userAddress },
          });

          const customer = await StripeService.createCustomer({
            email: user?.email || undefined,
            name: user?.ens_name || userAddress,
            metadata: {
              user_address: userAddress,
            },
          });

          stripeCustomerId = customer.id;
        }

        // Create checkout session
        const session = await StripeService.createCheckoutSession({
          customer_id: stripeCustomerId,
          price_id: stripePriceId,
          success_url: success_url,
          cancel_url: cancel_url,
          metadata: {
            user_address: userAddress,
            plan_id: plan_id,
            billing_period: billing_period,
          },
          trial_period_days: plan.price_monthly_usd.toNumber() === 0 ? undefined : parseInt(process.env.TRIAL_PERIOD_DAYS || '14'),
        });

        return reply.code(200).send({
          success: true,
          data: {
            session_id: session.id,
            url: session.url,
          },
        });
      } catch (error) {
        Logger.error('Error creating Stripe checkout session:', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to create checkout session',
        });
      }
    }
  );

  /**
   * POST /payments/stripe/create-portal
   * Create a Stripe customer portal session
   */
  fastify.post(
    '/payments/stripe/create-portal',
    { preHandler: authenticate },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const userAddress = request.user?.address;

        if (!userAddress) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const { return_url } = request.body as {
          return_url: string;
        };

        // Get user's Stripe customer ID
        const subscription = await prisma.subscription.findFirst({
          where: {
            user_address: userAddress,
            stripe_customer_id: { not: null },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (!subscription?.stripe_customer_id) {
          return reply.code(404).send({
            success: false,
            error: 'No Stripe customer found',
          });
        }

        // Create portal session
        const session = await StripeService.createPortalSession({
          customer_id: subscription.stripe_customer_id,
          return_url: return_url,
        });

        return reply.code(200).send({
          success: true,
          data: {
            url: session.url,
          },
        });
      } catch (error) {
        Logger.error('Error creating Stripe portal session:', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to create portal session',
        });
      }
    }
  );

  /**
   * POST /payments/stripe/webhook
   * Handle Stripe webhook events
   */
  fastify.post('/payments/stripe/webhook', async (request, reply: FastifyReply) => {
    try {
      const signature = request.headers['stripe-signature'];

      if (!signature || typeof signature !== 'string') {
        return reply.code(400).send({
          success: false,
          error: 'Missing stripe-signature header',
        });
      }

      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        Logger.error('STRIPE_WEBHOOK_SECRET not configured');
        return reply.code(500).send({
          success: false,
          error: 'Webhook secret not configured',
        });
      }

      // Construct the event
      const event = StripeService.constructWebhookEvent(
        request.body as Buffer,
        signature,
        webhookSecret
      );

      // Store webhook event
      await prisma.webhookEvent.create({
        data: {
          source: 'STRIPE',
          event_type: event.type,
          event_id: event.id,
          payload: event as any,
          processed: false,
        },
      });

      // Process the event
      await processStripeWebhook(event);

      // Mark as processed
      await prisma.webhookEvent.updateMany({
        where: { event_id: event.id },
        data: {
          processed: true,
          processed_at: new Date(),
        },
      });

      return reply.code(200).send({ received: true });
    } catch (error: any) {
      Logger.error('Error processing Stripe webhook:', error);

      // Log failed webhook
      if (request.headers['stripe-signature']) {
        await prisma.webhookEvent.create({
          data: {
            source: 'STRIPE',
            event_type: 'unknown',
            event_id: `error_${Date.now()}`,
            payload: { error: error.message },
            processed: false,
            error_message: error.message,
          },
        });
      }

      return reply.code(400).send({
        success: false,
        error: error.message,
      });
    }
  });

  // ============================================================================
  // CRYPTO PAYMENT ENDPOINTS (NOWPayments)
  // ============================================================================

  /**
   * POST /payments/crypto/create-payment
   * Create a crypto payment for subscription
   */
  fastify.post(
    '/payments/crypto/create-payment',
    { preHandler: authenticate },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const userAddress = request.user?.address;

        if (!userAddress) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const { plan_id, billing_period, pay_currency, success_url, cancel_url } = request.body as {
          plan_id: string;
          billing_period: 'MONTHLY' | 'YEARLY';
          pay_currency?: string;
          success_url?: string;
          cancel_url?: string;
        };

        // Get plan details
        const plan = await prisma.subscriptionPlan.findUnique({
          where: { id: plan_id },
        });

        if (!plan) {
          return reply.code(404).send({
            success: false,
            error: 'Plan not found',
          });
        }

        // Get price based on billing period
        const priceAmount =
          billing_period === 'YEARLY'
            ? Number(plan.crypto_yearly_price_usd || plan.price_yearly_usd)
            : Number(plan.crypto_monthly_price_usd || plan.price_monthly_usd);

        if (priceAmount === 0) {
          return reply.code(400).send({
            success: false,
            error: 'This plan does not support crypto payments',
          });
        }

        // Create subscription record first
        const subscription = await prisma.subscription.create({
          data: {
            user_address: userAddress,
            plan_id: plan_id,
            status: 'INCOMPLETE',
            payment_method: 'CRYPTO',
            billing_period: billing_period,
            current_period_start: new Date(),
            current_period_end: new Date(Date.now() + (billing_period === 'YEARLY' ? 365 : 30) * 24 * 60 * 60 * 1000),
          },
        });

        // Create NOWPayments payment
        const payment = await NOWPaymentsService.createPayment({
          // price_amount: priceAmount,
          price_amount: 1, // TEMPORARY FIX FOR TESTING PURPOSES
          price_currency: 'usd',
          // pay_currency: pay_currency || 'btc',
          pay_currency: 'usdc',
          order_id: subscription.id,
          order_description: `${plan.display_name} - ${billing_period} subscription`,
          // ipn_callback_url: `${process.env.BACKEND_URL}/payments/crypto/webhook`,
          ipn_callback_url: `https://1b67cbd1a47e.ngrok-free.app/payments/crypto/webhook`,
          // ipn_callback_url: "https://webhook.site/050d6a84-c4da-463d-9fb4-35cc87be0180",
          success_url: success_url,
          cancel_url: cancel_url,
        });

        // Store payment record
        await prisma.payment.create({
          data: {
            subscription_id: subscription.id,
            amount: priceAmount,
            currency: 'USD',
            payment_method: 'CRYPTO',
            status: 'PENDING',
            nowpayments_payment_id: payment.payment_id,
            nowpayments_order_id: subscription.id,
            crypto_payment_address: payment.pay_address,
            crypto_amount: payment.pay_amount,
            crypto_network: payment.pay_currency?.toUpperCase(),
            receipt_url: payment.payment_url || payment.invoice_url,
          },
        });

        Logger.info('Crypto payment created', {
          user_address: userAddress,
          subscription_id: subscription.id,
          payment_id: payment.payment_id,
        });

        console.log("==================")
        console.log("Crypto Payment:")
        console.log(cliRedify(JSON.stringify(payment, null, 4)))
        console.log("==================")

        return reply.send({
          success: true,
          data: {
            payment_id: payment.payment_id,
            payment_url: payment.payment_url || payment.invoice_url,
            pay_address: payment.pay_address,
            pay_amount: payment.pay_amount,
            pay_currency: payment.pay_currency,
          },
        });
      } catch (error: any) {
        Logger.error('Error creating crypto payment:', error);
        return reply.code(500).send({
          success: false,
          error: error.message || 'Failed to create crypto payment',
        });
      }
    }
  );

  /**
   * POST /payments/crypto/webhook
   * Handle NOWPayments IPN callbacks
   */
  fastify.post('/payments/crypto/webhook', async (request, reply: FastifyReply) => {
    try {
      console.log("==================")
      console.log("NOWPayments IPN Received:")
      console.log(cliGreenify(JSON.stringify(request.headers, null, 4)))
      console.log(cliRedify(JSON.stringify(request.body, null, 4)))
      console.log("==================")
      const signature = request.headers['x-nowpayments-sig'] as string;
      const payload = JSON.stringify(request.body);

      // Verify signature
      if (!NOWPaymentsService.verifyIPNSignature(signature, payload)) {
        Logger.warn('Invalid NOWPayments IPN signature');
        return reply.code(400).send({ success: false, error: 'Invalid signature' });
      }

      const ipnData = request.body as any;

      Logger.info('NOWPayments IPN received', { payment_id: ipnData.payment_id, status: ipnData.payment_status });

      // Store webhook event
      await prisma.webhookEvent.create({
        data: {
          source: 'NOWPAYMENTS',
          event_type: 'payment.status.update',
          event_id: String(ipnData.payment_id),
          payload: ipnData,
          processed: false,
        },
      });

      // Find payment record
      const payment = await prisma.payment.findFirst({
        where: { nowpayments_payment_id: ipnData.payment_id },
        include: { Subscription: true },
      });

      if (!payment) {
        Logger.warn('Payment not found for IPN', { payment_id: ipnData.payment_id });
        return reply.send({ success: true });
      }

      // Update payment status
      const statusMap: Record<string, 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED'> = {
        waiting: 'PENDING',
        confirming: 'PROCESSING',
        confirmed: 'PROCESSING',
        sending: 'PROCESSING',
        partially_paid: 'PROCESSING',
        finished: 'SUCCEEDED',
        failed: 'FAILED',
        refunded: 'CANCELED',
        expired: 'CANCELED',
      };

      const newStatus = statusMap[ipnData.payment_status] || 'PENDING';

      // Extract fee information and actual received amount
      const actuallyPaid = ipnData.actually_paid || 0;
      const outcomeAmount = ipnData.outcome_amount || 0;
      const feeInfo = ipnData.fee || {};

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: newStatus,
          paid_at: newStatus === 'SUCCEEDED' ? new Date() : null,
          failed_at: newStatus === 'FAILED' ? new Date() : null,
          crypto_amount: actuallyPaid, // Amount customer paid
          // Store additional fee and outcome information in metadata if needed
        },
      });

      Logger.info('Payment updated', {
        payment_id: ipnData.payment_id,
        status: newStatus,
        actually_paid: actuallyPaid,
        outcome_amount: outcomeAmount,
        fees: feeInfo,
      });

      // Update subscription status if payment succeeded
      if (newStatus === 'SUCCEEDED') {
        await prisma.subscription.update({
          where: { id: payment.subscription_id },
          data: {
            status: 'ACTIVE',
          },
        });

        Logger.info('Subscription activated via crypto payment', {
          subscription_id: payment.subscription_id,
        });
      } else if (newStatus === 'FAILED') {
        await prisma.subscription.update({
          where: { id: payment.subscription_id },
          data: {
            status: 'CANCELED',
          },
        });
      }

      // Mark webhook as processed
      await prisma.webhookEvent.updateMany({
        where: { event_id: ipnData.payment_id },
        data: { processed: true },
      });

      return reply.send({ success: true });
    } catch (error: any) {
      Logger.error('Error processing NOWPayments IPN:', error);
      return reply.code(500).send({ success: false, error: error.message });
    }
  });

  /**
   * GET /payments/crypto/status/:payment_id
   * Check crypto payment status
   */
  fastify.get(
    '/payments/crypto/status/:payment_id',
    { preHandler: authenticate },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const { payment_id } = request.params as { payment_id: string };

        const status = await NOWPaymentsService.getPaymentStatus(payment_id);

        return reply.send({
          success: true,
          data: status,
        });
      } catch (error: any) {
        Logger.error('Error getting crypto payment status:', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to get payment status',
        });
      }
    }
  );

  // ============================================================================
  // PAYMENT HISTORY ENDPOINTS
  // ============================================================================

  /**
   * GET /payments/history
   * Get user's payment history
   */
  fastify.get(
    '/payments/history',
    { preHandler: authenticate },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const userAddress = request.user?.address;

        if (!userAddress) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const { limit = 20, offset = 0 } = request.query as {
          limit?: number;
          offset?: number;
        };

        // Get user's subscriptions
        const subscriptions = await prisma.subscription.findMany({
          where: { user_address: userAddress },
          select: { id: true },
        });

        const subscriptionIds = subscriptions.map((s) => s.id);

        // Get payments
        const [payments, total] = await Promise.all([
          prisma.payment.findMany({
            where: {
              subscription_id: { in: subscriptionIds },
            },
            orderBy: { createdAt: 'desc' },
            take: Number(limit),
            skip: Number(offset),
            include: {
              Subscription: {
                include: {
                  Plan: true,
                },
              },
            },
          }),
          prisma.payment.count({
            where: {
              subscription_id: { in: subscriptionIds },
            },
          }),
        ]);

        return reply.code(200).send({
          success: true,
          data: {
            payments,
            pagination: {
              total,
              limit: Number(limit),
              offset: Number(offset),
              has_more: total > Number(offset) + Number(limit),
            },
          },
        });
      } catch (error) {
        Logger.error('Error fetching payment history:', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to fetch payment history',
        });
      }
    }
  );

  /**
   * GET /payments/:payment_id
   * Get specific payment details
   */
  fastify.get(
    '/payments/:payment_id',
    { preHandler: authenticate },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const userAddress = request.user?.address;

        if (!userAddress) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const { payment_id } = request.params as { payment_id: string };

        const payment = await prisma.payment.findUnique({
          where: { id: payment_id },
          include: {
            Subscription: {
              include: {
                Plan: true,
                User: true,
              },
            },
          },
        });

        if (!payment) {
          return reply.code(404).send({
            success: false,
            error: 'Payment not found',
          });
        }

        // Verify ownership
        if (payment.Subscription.user_address !== userAddress) {
          return reply.code(403).send({
            success: false,
            error: 'Access denied',
          });
        }

        return reply.code(200).send({
          success: true,
          data: payment,
        });
      } catch (error) {
        Logger.error('Error fetching payment:', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to fetch payment',
        });
      }
    }
  );
}

/**
 * Process Stripe webhook events
 */
async function processStripeWebhook(event: Stripe.Event) {
  Logger.info(`Processing Stripe webhook: ${event.type}`, { event_id: event.id });

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        Logger.info(`Unhandled Stripe webhook event type: ${event.type}`);
    }
  } catch (error) {
    Logger.error(`Error processing Stripe webhook ${event.type}:`, error);
    throw error;
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const metadata = session.metadata;
  const userAddress = metadata?.user_address;
  const planId = metadata?.plan_id;
  const billingPeriod = metadata?.billing_period as 'MONTHLY' | 'YEARLY';

  if (!userAddress || !planId) {
    Logger.error('Missing metadata in checkout session', { session_id: session.id });
    return;
  }

  const stripeSubscriptionId = session.subscription as string;

  // Create or update subscription
  await prisma.subscription.upsert({
    where: {
      stripe_subscription_id: stripeSubscriptionId,
    },
    create: {
      user_address: userAddress,
      plan_id: planId,
      status: 'ACTIVE',
      payment_method: 'STRIPE',
      billing_period: billingPeriod,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: stripeSubscriptionId,
      current_period_start: new Date(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
    update: {
      status: 'ACTIVE',
      stripe_customer_id: session.customer as string,
    },
  });

  Logger.info('Subscription created from checkout', {
    user_address: userAddress,
    stripe_subscription_id: stripeSubscriptionId,
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const dbSubscription = await prisma.subscription.findUnique({
    where: { stripe_subscription_id: subscription.id },
  });

  if (!dbSubscription) {
    Logger.warn('Subscription not found in database', { stripe_subscription_id: subscription.id });
    return;
  }

  const statusMap: Record<string, any> = {
    active: 'ACTIVE',
    past_due: 'PAST_DUE',
    canceled: 'CANCELED',
    incomplete: 'INCOMPLETE',
    trialing: 'TRIALING',
    paused: 'PAUSED',
  };

  await prisma.subscription.update({
    where: { stripe_subscription_id: subscription.id },
    data: {
      status: statusMap[subscription.status] || 'ACTIVE',
      current_period_start: new Date((subscription as any).current_period_start * 1000),
      current_period_end: new Date((subscription as any).current_period_end * 1000),
      cancel_at_period_end: (subscription as any).cancel_at_period_end,
    },
  });

  Logger.info('Subscription updated', { stripe_subscription_id: subscription.id });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await prisma.subscription.updateMany({
    where: { stripe_subscription_id: subscription.id },
    data: {
      status: 'CANCELED',
      canceled_at: new Date(),
    },
  });

  Logger.info('Subscription canceled', { stripe_subscription_id: subscription.id });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string;

  const dbSubscription = await prisma.subscription.findUnique({
    where: { stripe_subscription_id: subscriptionId },
  });

  if (!dbSubscription) {
    Logger.warn('Subscription not found for invoice', { invoice_id: invoice.id });
    return;
  }

  // Create payment record
  await prisma.payment.create({
    data: {
      subscription_id: dbSubscription.id,
      amount: invoice.amount_paid / 100, // Convert from cents
      currency: invoice.currency.toUpperCase(),
      payment_method: 'STRIPE',
      status: 'SUCCEEDED',
      stripe_invoice_id: invoice.id,
      stripe_payment_intent_id: (invoice as any).payment_intent as string,
      paid_at: new Date(invoice.status_transitions.paid_at! * 1000),
      receipt_url: invoice.hosted_invoice_url || undefined,
    },
  });

  Logger.info('Payment recorded from invoice', { invoice_id: invoice.id });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string;

  const dbSubscription = await prisma.subscription.findUnique({
    where: { stripe_subscription_id: subscriptionId },
  });

  if (!dbSubscription) {
    return;
  }

  // Update subscription status
  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      status: 'PAST_DUE',
    },
  });

  // Create failed payment record
  await prisma.payment.create({
    data: {
      subscription_id: dbSubscription.id,
      amount: invoice.amount_due / 100,
      currency: invoice.currency.toUpperCase(),
      payment_method: 'STRIPE',
      status: 'FAILED',
      stripe_invoice_id: invoice.id,
      failed_at: new Date(),
      failure_message: 'Payment failed',
    },
  });

  Logger.warn('Invoice payment failed', { invoice_id: invoice.id });
}
