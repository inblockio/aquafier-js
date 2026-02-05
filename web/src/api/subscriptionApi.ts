import apiClient from './axiosInstance'
import type {
  SubscriptionPlan,
  Subscription,
  Payment,
  UsageStats,
  UsageLimits,
  PercentageUsed,
} from '../stores/subscriptionStore';
import appStore from '../store';
import { ensureDomainUrlHasSSL } from '@/utils/functions';

const getBackendUrl = () => {
  const { backend_url } = appStore.getState();
  return backend_url || 'http://localhost:3000';
};

const getHeaders = () => {
  const { session } = appStore.getState();
  if (session?.nonce) {
    return { nonce: session.nonce };
  }
  return {};
};

// ============================================================================
// SUBSCRIPTION PLANS
// ============================================================================

export async function fetchSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const backendUrl = getBackendUrl();
  const url = ensureDomainUrlHasSSL(`${backendUrl}/subscriptions/plans`);
  const response = await apiClient.get(url);

  if (response.data.success) {
    return response.data.data;
  }

  throw new Error(response.data.error || 'Failed to fetch subscription plans');
}

// ============================================================================
// CURRENT SUBSCRIPTION
// ============================================================================

export async function fetchCurrentSubscription(): Promise<{
  subscription: Subscription | null;
  plan: SubscriptionPlan;
  is_free_tier: boolean;
}> {
  const backendUrl = getBackendUrl();
  const headers = getHeaders();
  const url = ensureDomainUrlHasSSL(`${backendUrl}/subscriptions/current`);

  const response = await apiClient.get(url, {
    headers,
  });

  if (response.data.success) {
    return response.data.data;
  }

  throw new Error(response.data.error || 'Failed to fetch current subscription');
}

// ============================================================================
// CREATE SUBSCRIPTION
// ============================================================================

export async function createSubscription(data: {
  plan_id: string;
  payment_method: 'STRIPE' | 'CRYPTO';
  billing_period: 'MONTHLY' | 'YEARLY';
}): Promise<Subscription> {
  const backendUrl = getBackendUrl();
  const headers = getHeaders();
  const url = ensureDomainUrlHasSSL(`${backendUrl}/subscriptions/create`);

  const response = await apiClient.post(
    url,
    data,
    { headers }
  );

  if (response.data.success) {
    return response.data.data;
  }

  throw new Error(response.data.error || 'Failed to create subscription');
}

// ============================================================================
// CANCEL SUBSCRIPTION
// ============================================================================

export async function cancelSubscription(data?: {
  immediate?: boolean;
}): Promise<Subscription> {
  const backendUrl = getBackendUrl();
  const headers = getHeaders();
  const url = ensureDomainUrlHasSSL(`${backendUrl}/subscriptions/cancel`);

  const response = await apiClient.put(
    url,
    data || {},
    { headers }
  );

  if (response.data.success) {
    return response.data.data;
  }

  throw new Error(response.data.error || 'Failed to cancel subscription');
}

// ============================================================================
// CHANGE PLAN
// ============================================================================

export async function changePlan(data: {
  new_plan_id: string;
}): Promise<Subscription> {
  const backendUrl = getBackendUrl();
  const headers = getHeaders();
  const url = ensureDomainUrlHasSSL(`${backendUrl}/subscriptions/change-plan`);

  const response = await apiClient.put(
    url,
    data,
    { headers }
  );

  if (response.data.success) {
    return response.data.data;
  }

  throw new Error(response.data.error || 'Failed to change plan');
}

// ============================================================================
// USAGE STATS
// ============================================================================

export async function fetchUsageStats(): Promise<{
  usage: UsageStats;
  limits: UsageLimits;
  percentage_used: PercentageUsed;
}> {
  const backendUrl = getBackendUrl();
  const headers = getHeaders();
  const url = ensureDomainUrlHasSSL(`${backendUrl}/subscriptions/usage`);

  const response = await apiClient.get(url, {
    headers,
  });

  if (response.data.success) {
    return response.data.data;
  }

  throw new Error(response.data.error || 'Failed to fetch usage stats');
}

export async function reFetchUsageStats(): Promise<{
  usage: UsageStats;
  limits: UsageLimits;
  percentage_used: PercentageUsed;
}> {
  const backendUrl = getBackendUrl();
  const headers = getHeaders();
  const url = ensureDomainUrlHasSSL(`${backendUrl}/subscriptions/usage/recalculate`);

  const response = await apiClient.post(url, {}, {
    headers,
  });

  if (response.data.success) {
    return response.data.data;
  }

  throw new Error(response.data.error || 'Failed to fetch usage stats');
}

// ============================================================================
// STRIPE PAYMENTS
// ============================================================================

export async function createStripeCheckout(data: {
  plan_id: string;
  billing_period: 'MONTHLY' | 'YEARLY';
  success_url: string;
  cancel_url: string;
}): Promise<{ session_id: string; url: string }> {
  const backendUrl = getBackendUrl();
  const headers = getHeaders();
  const url = ensureDomainUrlHasSSL(`${backendUrl}/payments/stripe/create-checkout`);

  const response = await apiClient.post(
    url,
    data,
    { headers }
  );

  if (response.data.success) {
    return response.data.data;
  }

  throw new Error(response.data.error || 'Failed to create checkout session');
}

export async function createStripePortal(data: {
  return_url: string;
}): Promise<{ url: string }> {
  const backendUrl = getBackendUrl();
  const headers = getHeaders();
  const url = ensureDomainUrlHasSSL(`${backendUrl}/payments/stripe/create-portal`);

  const response = await apiClient.post(
    url,
    data,
    { headers }
  );

  if (response.data.success) {
    return response.data.data;
  }

  throw new Error(response.data.error || 'Failed to create portal session');
}

// ============================================================================
// PAYMENT HISTORY
// ============================================================================

export async function fetchPaymentHistory(params?: {
  limit?: number;
  offset?: number;
}): Promise<{
  payments: Payment[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}> {
  const backendUrl = getBackendUrl();
  const headers = getHeaders();

  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());
  const url = ensureDomainUrlHasSSL(`${backendUrl}/payments/history?${queryParams.toString()}`);

  const response = await apiClient.get(
    url,
    { headers }
  );

  if (response.data.success) {
    return response.data.data;
  }

  throw new Error(response.data.error || 'Failed to fetch payment history');
}

export async function fetchPaymentDetails(paymentId: string): Promise<Payment> {
  const backendUrl = getBackendUrl();
  const headers = getHeaders();
  const url = ensureDomainUrlHasSSL(`${backendUrl}/payments/${paymentId}`);

  const response = await apiClient.get(url, {
    headers,
  });

  if (response.data.success) {
    return response.data.data;
  }

  throw new Error(response.data.error || 'Failed to fetch payment details');
}

// ============================================================================
// CRYPTO PAYMENTS (NOWPayments)
// ============================================================================

export async function createCryptoPayment(data: {
  plan_id: string;
  billing_period: 'MONTHLY' | 'YEARLY';
  pay_currency?: string;
  success_url?: string;
  cancel_url?: string;
}): Promise<{
  payment_id: string;
  payment_url: string;
  pay_address: string;
  pay_amount: number;
  pay_currency: string;
}> {
  const backendUrl = getBackendUrl();
  const headers = getHeaders();
  const url = ensureDomainUrlHasSSL(`${backendUrl}/payments/crypto/create-payment`);

  const response = await apiClient.post(
    url,
    data,
    { headers }
  );

  if (response.data.success) {
    return response.data.data;
  }

  throw new Error(response.data.error || 'Failed to create crypto payment');
}

export async function getCryptoPaymentStatus(paymentId: string): Promise<any> {
  const backendUrl = getBackendUrl();
  const headers = getHeaders();
  const url = ensureDomainUrlHasSSL(`${backendUrl}/payments/crypto/status/${paymentId}`);

  const response = await apiClient.get(
    url,
    { headers }
  );

  if (response.data.success) {
    return response.data.data;
  }

  throw new Error(response.data.error || 'Failed to get payment status');
}
