import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useStore } from 'zustand'
import { fetchUsageStats } from '../api/subscriptionApi'
import type { UsageStats, UsageLimits, PercentageUsed } from '../stores/subscriptionStore'
import { useSubscriptionStore } from '../stores/subscriptionStore'
import appStore from '../store'

export const SUBSCRIPTION_USAGE_QUERY_KEY = 'subscriptionUsage'

export interface SubscriptionUsageData {
  usage: UsageStats | null
  limits: UsageLimits | null
  percentage_used: PercentageUsed | null
}

async function fetchSubscriptionUsage(): Promise<SubscriptionUsageData> {
  try {
    const data = await fetchUsageStats()
    return {
      usage: data.usage,
      limits: data.limits,
      percentage_used: data.percentage_used
    }
  } catch (error) {
    console.error('Error fetching subscription usage:', error)
    return {
      usage: null,
      limits: null,
      percentage_used: null
    }
  }
}

export function useSubscriptionUsage() {
  const session = useStore(appStore, (state) => state.session)
  const { setUsage, setUsageLoading } = useSubscriptionStore()

  const query = useQuery({
    queryKey: [SUBSCRIPTION_USAGE_QUERY_KEY, session?.nonce],
    queryFn: fetchSubscriptionUsage,
    enabled: !!session?.nonce,
    staleTime: 60000, // 60 seconds
    gcTime: 300000, // 5 minutes
    retry: 1,
  })

  // Sync with Zustand store for backward compatibility
  useEffect(() => {
    setUsageLoading(query.isLoading)
  }, [query.isLoading, setUsageLoading])

  useEffect(() => {
    if (query.data?.usage && query.data?.limits && query.data?.percentage_used) {
      setUsage(query.data.usage, query.data.limits, query.data.percentage_used)
    }
  }, [query.data, setUsage])

  return {
    usage: query.data?.usage || null,
    limits: query.data?.limits || null,
    percentage_used: query.data?.percentage_used || null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch
  }
}
