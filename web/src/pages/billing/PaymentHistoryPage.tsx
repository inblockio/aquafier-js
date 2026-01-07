import { useEffect } from 'react';
import { Download, CreditCard, Bitcoin } from 'lucide-react';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { fetchPaymentHistory } from '../../api/subscriptionApi';

export default function PaymentHistoryPage() {
  const {
    payments,
    paymentsPagination,
    paymentsLoading,
    setPayments,
    setPaymentsLoading,
    setPaymentsError,
  } = useSubscriptionStore();

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async (offset = 0) => {
    try {
      setPaymentsLoading(true);
      const data = await fetchPaymentHistory({ limit: 20, offset });
      setPayments(data.payments, data.pagination);
    } catch (error: any) {
      setPaymentsError(error.message);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      SUCCEEDED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      PROCESSING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      CANCELED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
      REFUNDED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.PENDING}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Payment History
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          View and download your payment receipts
        </p>
      </div>

      {/* Payments Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        {paymentsLoading && payments.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">Loading payments...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-2">No payments yet</p>
            <p className="text-sm text-gray-500">
              Your payment history will appear here once you make your first payment
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Receipt
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatDate(payment.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex items-center">
                          {payment.payment_method === 'STRIPE' ? (
                            <CreditCard className="w-4 h-4 mr-2 text-blue-500" />
                          ) : (
                            <Bitcoin className="w-4 h-4 mr-2 text-orange-500" />
                          )}
                          <span>
                            {payment.payment_method === 'STRIPE' ? 'Card payment' : 'Crypto payment'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        ${payment.amount.toFixed(2)} {payment.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(payment.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {payment.receipt_url ? (
                          <a
                            href={payment.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </a>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="p-4 border-b border-gray-200 dark:border-gray-700"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center mb-1">
                        {payment.payment_method === 'STRIPE' ? (
                          <CreditCard className="w-4 h-4 mr-2 text-blue-500" />
                        ) : (
                          <Bitcoin className="w-4 h-4 mr-2 text-orange-500" />
                        )}
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {payment.payment_method === 'STRIPE' ? 'Card payment' : 'Crypto payment'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {formatDate(payment.createdAt)}
                      </p>
                    </div>
                    {getStatusBadge(payment.status)}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      ${payment.amount.toFixed(2)} {payment.currency}
                    </span>
                    {payment.receipt_url && (
                      <a
                        href={payment.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm flex items-center"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Receipt
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {paymentsPagination && paymentsPagination.has_more && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-center">
                <button
                  onClick={() => loadPayments(paymentsPagination.offset + paymentsPagination.limit)}
                  disabled={paymentsLoading}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {paymentsLoading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Summary Stats */}
      {payments.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Payments</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {paymentsPagination?.total || payments.length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Successful</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {payments.filter(p => p.status === 'SUCCEEDED').length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Spent</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              $
              {payments
                .filter(p => p.status === 'SUCCEEDED')
                .reduce((sum, p) => sum + p.amount, 0)
                .toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
