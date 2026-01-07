import { useEffect } from 'react';
import { HardDrive, FileText, FileContract, Layout, TrendingUp } from 'lucide-react';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { fetchUsageStats } from '../../api/subscriptionApi';

export default function UsageMetrics() {
  const { usage, limits, percentageUsed, setUsage, setUsageLoading } = useSubscriptionStore();

  useEffect(() => {
    loadUsage();
  }, []);

  const loadUsage = async () => {
    try {
      setUsageLoading(true);
      const data = await fetchUsageStats();
      setUsage(data.usage, data.limits, data.percentage_used);
    } catch (error) {
      console.error('Failed to load usage:', error);
      setUsageLoading(false);
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const metrics = [
    {
      icon: HardDrive,
      label: 'Storage',
      used: usage?.storage_used_gb.toFixed(2) || '0',
      limit: limits?.max_storage_gb || 0,
      unit: 'GB',
      percentage: percentageUsed?.storage || 0,
    },
    {
      icon: FileText,
      label: 'Files',
      used: usage?.files_count || 0,
      limit: limits?.max_files || 0,
      unit: '',
      percentage: percentageUsed?.files || 0,
    },
    {
      icon: FileContract,
      label: 'Contracts',
      used: usage?.contracts_count || 0,
      limit: limits?.max_contracts || 0,
      unit: '',
      percentage: percentageUsed?.contracts || 0,
    },
    {
      icon: Layout,
      label: 'Templates',
      used: usage?.templates_count || 0,
      limit: limits?.max_templates || 0,
      unit: '',
      percentage: percentageUsed?.templates || 0,
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Usage & Limits
        </h2>
        <button
          onClick={loadUsage}
          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
        >
          <TrendingUp className="w-4 h-4 mr-1" />
          Refresh
        </button>
      </div>

      <div className="space-y-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const percentage = Math.min(metric.percentage, 100);

          return (
            <div key={metric.label}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {metric.label}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {metric.used}{metric.unit}
                  </span>
                  {' / '}
                  {metric.limit}{metric.unit}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getProgressColor(percentage)} transition-all duration-300`}
                  style={{ width: `${percentage}%` }}
                />
              </div>

              {/* Warning if near limit */}
              {percentage >= 90 && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  ⚠️ You're approaching your {metric.label.toLowerCase()} limit
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Upgrade CTA */}
      {(percentageUsed?.storage || 0) >= 70 ||
        (percentageUsed?.files || 0) >= 70 ||
        (percentageUsed?.contracts || 0) >= 70 ||
        (percentageUsed?.templates || 0) >= 70 ? (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
            Running low on resources?
          </p>
          <button className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
            Upgrade your plan →
          </button>
        </div>
      ) : null}
    </div>
  );
}
