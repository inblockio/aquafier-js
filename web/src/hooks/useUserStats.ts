import { useQuery } from '@tanstack/react-query'
import { useStore } from 'zustand'
import apiClient from '../api/axiosInstance'
import appStore from '../store'
import { API_ENDPOINTS } from '../utils/constants'
import { ensureDomainUrlHasSSL } from '../utils/functions'
import { useReloadWatcher } from './useReloadWatcher'
import { RELOAD_KEYS } from '../utils/reloadDatabase'
import { IUserStats, emptyUserStats } from '../types/types'

export const USER_STATS_QUERY_KEY = 'userStats'

async function fetchUserStats(session: any, backend_url: string): Promise<IUserStats> {
  console.log('[useUserStats] fetchUserStats called')
  if (!session?.nonce || !session?.address) {
    console.log('[useUserStats] Session not available')
    throw new Error('Session not available')
  }

  console.log('[useUserStats] Fetching user stats from API')
  const result = await apiClient.get(
    ensureDomainUrlHasSSL(`${backend_url}/${API_ENDPOINTS.USER_STATS}`),
    {
      headers: {
        'nonce': session.nonce,
        'metamask_address': session.address
      }
    }
  )

  console.log('[useUserStats] API response:', result.data)
  return result.data
}

export function useUserStats() {
  const session = useStore(appStore, (state) => state.session)
  const backend_url = useStore(appStore, (state) => state.backend_url)

  console.log('[useUserStats] Hook render - session:', session?.address, 'backend_url:', backend_url)

  const query = useQuery({
    queryKey: [USER_STATS_QUERY_KEY, session?.address],
    queryFn: () => fetchUserStats(session, backend_url),
    enabled: !!session?.address && !!session?.nonce && !!backend_url,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
    placeholderData: emptyUserStats,
  })

  console.log('[useUserStats] Query state - isLoading:', query.isLoading, 'isFetching:', query.isFetching, 'data:', query.data)

  // Integrate with existing reload watcher
  useReloadWatcher({
    key: RELOAD_KEYS.user_stats,
    onReload: async () => {
      console.log('[useUserStats] Reload watcher triggered - calling query.refetch()')
      // Use the query's own refetch function to ensure it refetches
      await query.refetch()
      console.log('[useUserStats] Refetch complete')
    }
  })

  return {
    stats: query.data || emptyUserStats,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch
  }
}
