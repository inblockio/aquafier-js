import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Calendar, AlertCircle, X, HardDrive, FileText, File, Layout, RefreshCcw } from 'lucide-react';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import {
  fetchCurrentSubscription,
  cancelSubscription,
  createStripePortal,
  reFetchUsageStats,
} from '../../api/subscriptionApi';
import UsageMetrics from '@/components/subscription/UsageMetrics';
import { Button } from '@/components/ui/button';

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

   const reloadSubscription = async () => {
    try {
      setSubscriptionLoading(true);
      await reFetchUsageStats();
      await loadSubscription()
      setSubscriptionLoading(false);
    } catch (error: any) {
      setSubscriptionError(error.message);
      setSubscriptionLoading(false);
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

  const getPaymentMethod = (method: string) => {
    if(method === "STRIPE"){
      return "Credit Card"
    }else if(method === "CRYPTO"){
      return "Crypto"
    }
    return "Aquafier Licence"
  }

  // const getStatusColor = (status: string) => {
  //   switch (status) {
  //     case 'ACTIVE':
  //       return 'text-green-600 bg-green-100';
  //     case 'TRIALING':
  //       return 'text-blue-600 bg-blue-100';
  //     case 'PAST_DUE':
  //       return 'text-yellow-600 bg-yellow-100';
  //     case 'CANCELED':
  //       return 'text-red-600 bg-red-100';
  //     default:
  //       return 'text-gray-600 bg-gray-100';
  //   }
  // };

  
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
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Card Header with Plan Info & Price */}
        <div className="p-8 border-b border-gray-100 bg-gray-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {plan?.display_name || 'Free Plan'}
                </h2>
                {currentSubscription && (
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${currentSubscription.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' :
                      currentSubscription.status === 'TRIALING' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        currentSubscription.status === 'PAST_DUE' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-red-50 text-red-700 border-red-200'
                      }`}
                  >
                    {currentSubscription.status}
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-sm">
                Next billing date: <span className="font-medium text-gray-900">{currentSubscription ? formatDate(currentSubscription.current_period_end) : 'N/A'}</span>
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900 dark:text-white leading-none">
                  ${plan?.price_monthly_usd || 0}
                  <span className="text-base font-normal text-gray-500 ml-1">
                    /{currentSubscription?.billing_period === 'YEARLY' ? 'year' : 'mo'}
                  </span>
                </div>
              </div>
              <div>
                <Button onClick={reloadSubscription} className='cursor-pointer'>
                  <RefreshCcw />
                  {`${loading ? "Refreshing" : "Refresh"}`}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Resource Usage</h3>
            <UsageMetrics />
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Plan Features */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Plan Limits</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-gray-600 dark:text-gray-400 text-sm flex items-center">
                    <HardDrive className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500" />
                    Storage Limit
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">{plan?.max_storage_gb} GB</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-gray-600 dark:text-gray-400 text-sm flex items-center">
                    <FileText className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500" />
                    File Limit
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">{plan?.max_files}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-gray-600 dark:text-gray-400 text-sm flex items-center">
                    <File className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500" />
                    Contract Limit
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">{plan?.max_contracts}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-gray-600 dark:text-gray-400 text-sm flex items-center">
                    <Layout className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500" />
                    Template Limit
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">{plan?.max_templates}</span>
                </div>
              </div>
            </div>

            {/* Billing Details */}
            {currentSubscription && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Billing Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-gray-600 dark:text-gray-400 text-sm flex items-center">
                      <Calendar className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500" />
                      Billing Cycle
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatDate(currentSubscription.current_period_start)} - {formatDate(currentSubscription.current_period_end)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-gray-600 dark:text-gray-400 text-sm flex items-center">
                      <CreditCard className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500" />
                      Payment Method
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white inline-flex items-center">
                      {getPaymentMethod(currentSubscription.payment_method)}
                    </span>
                  </div>

                  {currentSubscription.cancel_at_period_end && (
                    <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-lg flex items-start">
                      <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Subscription Canceled</p>
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                          Your access will end on {formatDate(currentSubscription.current_period_end)}.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
          Manage Subscription
        </h3>
        <div className="space-y-3">
          {!isFreeTier && (
            <button
              onClick={handleManagePayment}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Manage Payment Methods
            </button>
          )}

          <button
            onClick={handleUpgrade}
            className="w-full flex items-center justify-center px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl font-medium transition-colors"
          >
            {isFreeTier ? 'Upgrade to Pro' : 'Change Plan'}
          </button>

          {currentSubscription && currentSubscription.Plan.name !== "free" && !currentSubscription.cancel_at_period_end && (
            <button
              onClick={handleCancelSubscription}
              disabled={cancelLoading}
              className="w-full flex items-center justify-center px-4 py-3 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 mr-2" />
              {cancelLoading ? 'Canceling...' : 'Cancel Subscription'}
            </button>
          )}
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
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
