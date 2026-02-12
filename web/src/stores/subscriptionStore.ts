import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Types for subscription state
export interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  price_monthly_usd: number;
  price_yearly_usd: number;
  crypto_monthly_price_usd?: number;
  crypto_yearly_price_usd?: number;
  max_storage_gb: number;
  max_files: number;
  max_contracts: number;
  max_templates: number;
  features: Record<string, boolean>;
  sort_order: number;
}

export interface Subscription {
  id: string;
  user_address: string;
  plan_id: string;
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIALING' | 'INCOMPLETE' | 'PAUSED' | 'EXPIRED';
  payment_method: 'STRIPE' | 'CRYPTO';
  billing_period: 'MONTHLY' | 'YEARLY';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at?: string;
  trial_start?: string;
  trial_end?: string;
  Plan: SubscriptionPlan;
}

export interface Payment {
  id: string;
  subscription_id: string;
  amount: number;
  currency: string;
  payment_method: 'STRIPE' | 'CRYPTO';
  status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED' | 'REFUNDED';
  paid_at?: string;
  failed_at?: string;
  receipt_url?: string;
  createdAt: string;
}

export interface UsageStats {
  files_count: number;
  contracts_count: number;
  templates_count: number;
  storage_used_gb: number;
}

export interface UsageLimits {
  max_files: number;
  max_contracts: number;
  max_templates: number;
  max_storage_gb: number;
}

export interface PercentageUsed {
  files: number;
  contracts: number;
  templates: number;
  storage: number;
}

interface SubscriptionState {
  // Available plans
  plans: SubscriptionPlan[];
  plansLoading: boolean;
  plansError: string | null;

  // Current subscription
  currentSubscription: Subscription | null;
  subscriptionLoading: boolean;
  subscriptionError: string | null;
  isFreeTier: boolean;

  // Usage tracking
  usage: UsageStats | null;
  limits: UsageLimits | null;
  percentageUsed: PercentageUsed | null;
  usageLoading: boolean;

  // Payment history
  payments: Payment[];
  paymentsLoading: boolean;
  paymentsError: string | null;
  paymentsPagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  } | null;

  // Checkout state
  checkoutSessionId: string | null;
  checkoutUrl: string | null;
}

interface SubscriptionActions {
  // Plans
  setPlans: (plans: SubscriptionPlan[]) => void;
  setPlansLoading: (loading: boolean) => void;
  setPlansError: (error: string | null) => void;

  // Subscription
  setCurrentSubscription: (subscription: Subscription | null, isFreeTier?: boolean) => void;
  setSubscriptionLoading: (loading: boolean) => void;
  setSubscriptionError: (error: string | null) => void;

  // Usage
  setUsage: (usage: UsageStats, limits: UsageLimits, percentageUsed: PercentageUsed) => void;
  setUsageLoading: (loading: boolean) => void;

  // Payments
  setPayments: (payments: Payment[], pagination?: SubscriptionState['paymentsPagination']) => void;
  setPaymentsLoading: (loading: boolean) => void;
  setPaymentsError: (error: string | null) => void;

  // Checkout
  setCheckoutSession: (sessionId: string | null, url: string | null) => void;
  clearCheckoutSession: () => void;

  // Reset
  resetSubscriptionStore: () => void;
}

type SubscriptionStore = SubscriptionState & SubscriptionActions;

const initialState: SubscriptionState = {
  plans: [],
  plansLoading: false,
  plansError: null,

  currentSubscription: null,
  subscriptionLoading: false,
  subscriptionError: null,
  isFreeTier: false,

  usage: null,
  limits: null,
  percentageUsed: null,
  usageLoading: false,

  payments: [],
  paymentsLoading: false,
  paymentsError: null,
  paymentsPagination: null,

  checkoutSessionId: null,
  checkoutUrl: null,
};

export const useSubscriptionStore = create<SubscriptionStore>()(
  persist(
    (set) => ({
      ...initialState,

      // Plans actions
      setPlans: (plans) => set({ plans, plansError: null }),
      setPlansLoading: (loading) => set({ plansLoading: loading }),
      setPlansError: (error) => set({ plansError: error, plansLoading: false }),

      // Subscription actions
      setCurrentSubscription: (subscription, isFreeTier = false) =>
        set({
          currentSubscription: subscription,
          isFreeTier,
          subscriptionError: null,
        }),
      setSubscriptionLoading: (loading) => set({ subscriptionLoading: loading }),
      setSubscriptionError: (error) =>
        set({ subscriptionError: error, subscriptionLoading: false }),

      // Usage actions
      setUsage: (usage, limits, percentageUsed) =>
        set({ usage, limits, percentageUsed, usageLoading: false }),
      setUsageLoading: (loading) => set({ usageLoading: loading }),

      // Payments actions
      setPayments: (payments, pagination) =>
        set({
          payments,
          paymentsPagination: pagination || null,
          paymentsLoading: false,
          paymentsError: null,
        }),
      setPaymentsLoading: (loading) => set({ paymentsLoading: loading }),
      setPaymentsError: (error) =>
        set({ paymentsError: error, paymentsLoading: false }),

      // Checkout actions
      setCheckoutSession: (sessionId, url) =>
        set({ checkoutSessionId: sessionId, checkoutUrl: url }),
      clearCheckoutSession: () =>
        set({ checkoutSessionId: null, checkoutUrl: null }),

      // Reset
      resetSubscriptionStore: () => set(initialState),
    }),
    {
      name: 'subscription-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
