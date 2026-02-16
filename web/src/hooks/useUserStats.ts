import { useQuery } from '@tanstack/react-query'
import { useStore } from 'zustand'
import apiClient from '../api/axiosInstance'
import appStore from '../store'
import { API_ENDPOINTS } from '../utils/constants'
import { ensureDomainUrlHasSSL } from '../utils/functions'
import { useReloadWatcher } from './useReloadWatcher'
import { RELOAD_KEYS } from '../utils/reloadDatabase'
import { IUserStats, emptyUserStats } from '../types/types'
import { queryClient } from '../providers/QueryProvider'

export const USER_STATS_QUERY_KEY = 'userStats'

async function fetchUserStats(session: any, backend_url: string): Promise<IUserStats> {
  if (!session?.nonce || !session?.address) {
    throw new Error('Session not available')
  }

  const result = await apiClient.get(
    ensureDomainUrlHasSSL(`${backend_url}/${API_ENDPOINTS.USER_STATS}`),
    {
      headers: {
        'nonce': session.nonce,
        'metamask_address': session.address
      }
    }
  )

  return result.data
}

export function useUserStats() {
  const session = useStore(appStore, (state) => state.session)
  const backend_url = useStore(appStore, (state) => state.backend_url)

  const query = useQuery({
    queryKey: [USER_STATS_QUERY_KEY, session?.address],
    queryFn: () => fetchUserStats(session, backend_url),
    enabled: !!session?.address && !!session?.nonce && !!backend_url,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
    placeholderData: emptyUserStats,
  })

  // Integrate with existing reload watcher
  useReloadWatcher({
    key: RELOAD_KEYS.user_stats,
    onReload: async () => {
      // Force refetch by invalidating and immediately refetching active queries
      await queryClient.invalidateQueries({
        queryKey: [USER_STATS_QUERY_KEY],
        refetchType: 'active'
      })
    }
  })

  return {
    stats: query.data || emptyUserStats,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch
  }
}
