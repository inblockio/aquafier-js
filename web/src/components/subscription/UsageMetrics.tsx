import { useEffect } from 'react';
import { HardDrive, FileText, File } from 'lucide-react';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { fetchUsageStats, reFetchUsageStats } from '../../api/subscriptionApi';

export default function UsageMetrics() {
  const { usage, limits, percentageUsed, setUsage, setUsageLoading } = useSubscriptionStore();

  useEffect(() => {
    loadUsage(false);
  }, []);

  const loadUsage = async (refetch: boolean) => {
    try {
      setUsageLoading(true);
      if (refetch) {
        const data = await reFetchUsageStats();
        setUsage(data.usage, data.limits, data.percentage_used);
      } else {
        const data = await fetchUsageStats();
        setUsage(data.usage, data.limits, data.percentage_used);
      }
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
      icon: File,
      label: 'Aqua Sign Contracts',
      used: usage?.contracts_count || 0,
      limit: limits?.max_contracts || 0,
      unit: '',
      percentage: percentageUsed?.contracts || 0,
    },
    // {
    //   icon: Layout,
    //   label: 'Templates',
    //   used: usage?.templates_count || 0,
    //   limit: limits?.max_templates || 0,
    //   unit: '',
    //   percentage: percentageUsed?.templates || 0,
    // },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => (
        <div
          key={index}
          className="group relative overflow-hidden rounded-xl bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md border border-gray-100"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-lg bg-gray-50/80 group-hover:bg-blue-50/80 transition-colors">
              <metric.icon className="h-5 w-5 text-gray-500 group-hover:text-blue-600 transition-colors" />
            </div>
            <div className={`px-2 py-1 rounded-full text-[10px] font-medium border ${metric.percentage >= 90 ? 'bg-red-50 text-red-600 border-red-100' :
              metric.percentage >= 75 ? 'bg-amber-50 text-amber-600 border-amber-100' :
                'bg-emerald-50 text-emerald-600 border-emerald-100'
              }`}>
              {Math.round(metric.percentage)}%
            </div>
          </div>

          <div className="space-y-1 mb-3">
            <h3 className="text-sm font-medium text-gray-500">{metric.label}</h3>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-bold text-gray-900 tracking-tight">
                {metric.used}
              </span>
              <span className="text-sm font-medium text-gray-400">
                / {metric.limit} {metric.unit}
              </span>
            </div>
          </div>

          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${getProgressColor(validPercentage(metric.percentage))}`}
              style={{ width: `${Math.min(metric.percentage, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function validPercentage(p: number): number {
  return Number.isNaN(p) ? 0 : p;
}
