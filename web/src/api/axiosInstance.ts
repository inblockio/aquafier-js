import axios from 'axios'
import appStore from '../store'
import { appKit } from '../config/appkit'
import { triggerWorkflowReload } from '../utils/reloadDatabase'
import { ContactsService } from '../storage/databases/contactsDb'

declare module 'axios' {
  export interface AxiosRequestConfig {
    reloadKeys?: string[]
  }
}

const apiClient = axios.create()

// Request deduplication cache
const pendingRequests = new Map<string, Promise<any>>()

function generateRequestKey(config: any): string {
  return `${config.method}-${config.url}-${JSON.stringify(config.params || {})}`
}

apiClient.interceptors.request.use(
  (config) => {
    const key = generateRequestKey(config)

    // Check if identical request is already pending
    if (pendingRequests.has(key)) {
      if (import.meta.env.DEV) {
        console.log(`[API] Deduplicating request: ${config.method?.toUpperCase()} ${config.url}`)
      }

      // Return existing pending promise
      return pendingRequests.get(key)!.then(response => ({
        ...config,
        adapter: () => Promise.resolve(response)
      }))
    }

    if (import.meta.env.DEV) {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        cached: false
      })
    }

    return config
  },
  (error) => Promise.reject(error)
)

apiClient.interceptors.response.use(
  async (response) => {
    const key = generateRequestKey(response.config)
    pendingRequests.delete(key)

    const { reloadKeys } = response.config

    if (reloadKeys && reloadKeys.length > 0) {
      for (const reloadKey of reloadKeys) {
        await triggerWorkflowReload(reloadKey, true)
      }
    }

    return response
  },
  (error) => {
    if (error.config) {
      const key = generateRequestKey(error.config)
      pendingRequests.delete(key)
    }

    if (error.response?.status === 401) {
      appStore.getState().setSession(null)
      appKit.disconnect()
      ContactsService.getInstance().clear()
    }
    return Promise.reject(error)
  }
)

export default apiClient
