import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { fetchSubscriptionPlans, createStripeCheckout, createCryptoPayment } from '../../api/subscriptionApi';
import appStore from '../../store';

export default function PricingPage() {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [loading, setLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const { plans, setPlans, setPlansLoading, setPlansError } = useSubscriptionStore();

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setPlansLoading(true);
      const data = await fetchSubscriptionPlans();
      setPlans(data);
    } catch (error: any) {
      setPlansError(error.message);
    }
  };

  const handleSelectPlan = async (planId: string) => {
    if (loading) return;

    setLoading(true);
    setSelectedPlanId(planId);

    try {
      const plan = plans.find(p => p.id === planId);
      if (!plan) throw new Error('Plan not found');

      // Free plan - just navigate to dashboard
      if (plan.price_monthly_usd === 0) {
        navigate('/app/dashboard');
        return;
      }

      // Check payment method from config
      const { webConfig } = appStore.getState();
      const enableCrypto = webConfig.ENABLE_CRYPTO_PAYMENTS ?? true;
      const enableStripe = webConfig.ENABLE_STRIPE_PAYMENTS ?? false;

      // Default to crypto if both are enabled or if only crypto is enabled
      const useCrypto = enableCrypto && (!enableStripe || webConfig.DEFAULT_PAYMENT_METHOD === 'CRYPTO');

      if (useCrypto) {
        // Create crypto payment
        const payment = await createCryptoPayment({
          plan_id: planId,
          billing_period: billingPeriod,
          pay_currency: 'btc', // Default to Bitcoin
          success_url: `${window.location.origin}/app/subscription?success=true`,
          cancel_url: `${window.location.origin}/app/pricing`,
        });

        // Redirect to crypto payment page
        window.location.href = payment.payment_url;
      } else if (enableStripe) {
        // Create Stripe checkout session
        const { url } = await createStripeCheckout({
          plan_id: planId,
          billing_period: billingPeriod,
          success_url: `${window.location.origin}/app/subscription?success=true`,
          cancel_url: `${window.location.origin}/app/pricing`,
        });

        // Redirect to Stripe checkout
        window.location.href = url;
      } else {
        throw new Error('No payment method is enabled. Please contact support.');
      }
    } catch (error: any) {
      alert(error.message || 'Failed to start checkout');
      setLoading(false);
      setSelectedPlanId(null);
    }
  };

  const getPrice = (plan: any) => {
    return billingPeriod === 'YEARLY'
      ? plan.price_yearly_usd
      : plan.price_monthly_usd;
  };

  const getMonthlyPrice = (plan: any) => {
    if (billingPeriod === 'YEARLY') {
      return (plan.price_yearly_usd / 12).toFixed(2);
    }
    return plan.price_monthly_usd;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Select the perfect plan for your needs
          </p>

          {/* Billing Period Toggle */}
          <div className="inline-flex items-center bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setBillingPeriod('MONTHLY')}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                billingPeriod === 'MONTHLY'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('YEARLY')}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                billingPeriod === 'YEARLY'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Yearly
              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const isPopular = plan.name === 'pro';
            const isFree = plan.price_monthly_usd === 0;

            return (
              <div
                key={plan.id}
                className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden transition-transform hover:scale-105 ${
                  isPopular ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute top-0 right-0 bg-blue-500 text-white px-4 py-1 rounded-bl-lg text-sm font-semibold">
                    Popular
                  </div>
                )}

                <div className="p-8">
                  {/* Plan Name */}
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {plan.display_name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 h-12">
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline">
                      <span className="text-5xl font-bold text-gray-900 dark:text-white">
                        ${getMonthlyPrice(plan)}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 ml-2">
                        /month
                      </span>
                    </div>
                    {billingPeriod === 'YEARLY' && !isFree && (
                      <p className="text-sm text-gray-500 mt-1">
                        Billed ${getPrice(plan)} annually
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {plan.max_storage_gb} GB Storage
                      </span>
                    </li>
                    <li className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {plan.max_files} Files
                      </span>
                    </li>
                    <li className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {plan.max_contracts} Aqua Sign Contracts
                      </span>
                    </li>
                    {/* <li className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {plan.max_templates} Templates
                      </span>
                    </li> */}
                    {plan.features.file_versioning && (
                      <li className="flex items-start">
                        <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">
                          File Versioning
                        </span>
                      </li>
                    )}
                    {plan.features.priority_support && (
                      <li className="flex items-start">
                        <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">
                          Priority Support
                        </span>
                      </li>
                    )}
                    {plan.features.api_access && (
                      <li className="flex items-start">
                        <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">
                          API Access
                        </span>
                      </li>
                    )}
                    {plan.features.custom_branding && (
                      <li className="flex items-start">
                        <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">
                          Custom Branding
                        </span>
                      </li>
                    )}
                  </ul>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={loading && selectedPlanId === plan.id}
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
                      isPopular
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {loading && selectedPlanId === plan.id
                      ? 'Processing...'
                      : isFree
                      ? 'Get Started'
                      : 'Subscribe Now'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Trusted by developers worldwide
          </p>
          <div className="flex justify-center items-center space-x-8 text-sm text-gray-500">
            <span>🔒 Secure Payments</span>
            <span>✓ 14-Day Trial</span>
            <span>⚡ Instant Setup</span>
            <span>💳 Cancel Anytime</span>
          </div>
        </div>
      </div>
    </div>
  );
}
