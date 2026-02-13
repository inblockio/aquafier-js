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

apiClient.interceptors.response.use(
  async (response) => {
    const { reloadKeys } = response.config

    if (reloadKeys && reloadKeys.length > 0) {
      for (const key of reloadKeys) {
        await triggerWorkflowReload(key, true)
      }
    }

    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      appStore.getState().setSession(null)
      appKit.disconnect()
      ContactsService.getInstance().clear()
    }
    return Promise.reject(error)
  }
)

export default apiClient
