import axios from 'axios'
import appStore from '../store'
import { appKit } from '../config/appkit'

const apiClient = axios.create()

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      appStore.getState().setSession(null)
      appKit.disconnect()
    }
    return Promise.reject(error)
  }
)

export default apiClient
