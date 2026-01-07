import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Calendar, AlertCircle, Check, X } from 'lucide-react';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import {
  fetchCurrentSubscription,
  cancelSubscription,
  changePlan,
  createStripePortal,
} from '../../api/subscriptionApi';

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const {
    currentSubscription,
    isFreeTier,
    setCurrentSubscription,
    setSubscriptionLoading,
    setSubscriptionError,
  } = useSubscriptionStore();

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      setSubscriptionLoading(true);
      const data = await fetchCurrentSubscription();
      setCurrentSubscription(data.subscription, data.is_free_tier);
    } catch (error: any) {
      setSubscriptionError(error.message);
    }
  };

  const handleManagePayment = async () => {
    try {
      setLoading(true);
      const { url } = await createStripePortal({
        return_url: window.location.href,
      });
      window.location.href = url;
    } catch (error: any) {
      alert(error.message || 'Failed to open portal');
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? It will remain active until the end of the billing period.')) {
      return;
    }

    try {
      setCancelLoading(true);
      await cancelSubscription({ immediate: false });
      await loadSubscription();
      alert('Subscription canceled. It will remain active until the end of your billing period.');
    } catch (error: any) {
      alert(error.message || 'Failed to cancel subscription');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleUpgrade = () => {
    navigate('/app/pricing');
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-green-600 bg-green-100';
      case 'TRIALING':
        return 'text-blue-600 bg-blue-100';
      case 'PAST_DUE':
        return 'text-yellow-600 bg-yellow-100';
      case 'CANCELED':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (!currentSubscription && !isFreeTier) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Loading subscription...</p>
        </div>
      </div>
    );
  }

  const plan = currentSubscription?.Plan;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Subscription
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your subscription and billing
        </p>
      </div>

      {/* Current Plan Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {plan?.display_name || 'Free Plan'}
            </h2>
            {currentSubscription && (
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                  currentSubscription.status
                )}`}
              >
                {currentSubscription.status}
              </span>
            )}
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              ${plan?.price_monthly_usd || 0}
              <span className="text-base font-normal text-gray-600 dark:text-gray-400">
                /month
              </span>
            </div>
            {currentSubscription?.billing_period === 'YEARLY' && (
              <p className="text-sm text-gray-500">Billed annually</p>
            )}
          </div>
        </div>

        {/* Plan Features */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="flex items-center">
            <Check className="w-5 h-5 text-green-500 mr-2" />
            <span className="text-gray-700 dark:text-gray-300">
              {plan?.max_storage_gb} GB Storage
            </span>
          </div>
          <div className="flex items-center">
            <Check className="w-5 h-5 text-green-500 mr-2" />
            <span className="text-gray-700 dark:text-gray-300">
              {plan?.max_files} Files
            </span>
          </div>
          <div className="flex items-center">
            <Check className="w-5 h-5 text-green-500 mr-2" />
            <span className="text-gray-700 dark:text-gray-300">
              {plan?.max_contracts} Contracts
            </span>
          </div>
          <div className="flex items-center">
            <Check className="w-5 h-5 text-green-500 mr-2" />
            <span className="text-gray-700 dark:text-gray-300">
              {plan?.max_templates} Templates
            </span>
          </div>
        </div>

        {/* Billing Info */}
        {currentSubscription && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400 flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Current period
              </span>
              <span className="text-gray-900 dark:text-white font-medium">
                {formatDate(currentSubscription.current_period_start)} -{' '}
                {formatDate(currentSubscription.current_period_end)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400 flex items-center">
                <CreditCard className="w-4 h-4 mr-2" />
                Payment method
              </span>
              <span className="text-gray-900 dark:text-white font-medium">
                {currentSubscription.payment_method === 'STRIPE' ? 'Credit Card' : 'Crypto'}
              </span>
            </div>
            {currentSubscription.cancel_at_period_end && (
              <div className="flex items-start p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Subscription will be canceled
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Your subscription will end on {formatDate(currentSubscription.current_period_end)}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Manage Subscription
        </h3>
        <div className="space-y-3">
          {!isFreeTier && (
            <button
              onClick={handleManagePayment}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Manage Payment Methods
            </button>
          )}

          <button
            onClick={handleUpgrade}
            className="w-full flex items-center justify-center px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
          >
            {isFreeTier ? 'Upgrade to Pro' : 'Change Plan'}
          </button>

          {currentSubscription && !currentSubscription.cancel_at_period_end && (
            <button
              onClick={handleCancelSubscription}
              disabled={cancelLoading}
              className="w-full flex items-center justify-center px-4 py-3 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 mr-2" />
              {cancelLoading ? 'Canceling...' : 'Cancel Subscription'}
            </button>
          )}
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Frequently Asked Questions
        </h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-1">
              When will I be charged?
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You'll be charged at the beginning of each billing period. Your first charge occurs
              after your trial period ends.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-1">
              Can I cancel anytime?
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Yes! You can cancel your subscription at any time. You'll retain access until the end
              of your billing period.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-1">
              What happens to my data if I cancel?
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your data is safe and will be retained for 30 days after cancellation. You can
              reactivate anytime during this period.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
