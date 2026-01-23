import { createSIWEConfig, formatMessage } from '@reown/appkit-siwe'
import type { SIWECreateMessageArgs, SIWESession, SIWEVerifyMessageArgs } from '@reown/appkit-siwe'
import axios from 'axios'
import { getCookie, setCookie, ensureDomainUrlHasSSL } from '../utils/functions'
import { ETH_CHAINID_MAP_NUMBERS, SESSION_COOKIE_NAME, BACKEND_URL_STORAGE_KEY } from '../utils/constants'
import appStore from '../store'
import { toast } from 'sonner'
import { ethers } from 'ethers'

/**
 * Get backend URL synchronously - reads from localStorage first (sync),
 * then falls back to the Zustand store.
 * This is needed because getSession() is called before IndexedDB rehydrates.
 */
const getBackendUrlSync = (): string => {
  // Try localStorage first (synchronous access)
  try {
    const cachedUrl = localStorage.getItem(BACKEND_URL_STORAGE_KEY)
    console.log('[SIWE DEBUG] getBackendUrlSync - localStorage value:', cachedUrl)
    if (cachedUrl && !cachedUrl.includes('0.0.0.0')) {
      const result = ensureDomainUrlHasSSL(cachedUrl)
      console.log('[SIWE DEBUG] getBackendUrlSync - using localStorage:', result)
      return result
    }
  } catch (e) {
    console.warn('Failed to read backend_url from localStorage:', e)
  }

  // Fall back to store (may not be rehydrated yet)
  const storeUrl = appStore.getState().backend_url
  const result = ensureDomainUrlHasSSL(storeUrl)
  console.log('[SIWE DEBUG] getBackendUrlSync - using store fallback:', result)
  return result
}

// Helper function to extract Ethereum address from DID or return as-is if already an address
export const extractEthereumAddress = (addressOrDid: string): string => {
  // Check if it's a DID format: did:pkh:eip155:1:0x...
  if (addressOrDid.startsWith('did:pkh:eip155:')) {
    const parts = addressOrDid.split(':')
    // The address is the last part after splitting by ':'
    return parts[parts.length - 1]
  }

  // Already a standard Ethereum address
  return addressOrDid
}

export const siweConfig = createSIWEConfig({


  createMessage: ({ address, ...args }: SIWECreateMessageArgs) => {
    return formatMessage(args, address)
  },

  getNonce: async () => {
    const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    return nonce
  },

  getMessageParams: async () => {
    // Set session expiration to 7 days from now
    const expirationTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    return {
      domain: window.location.host,
      uri: window.location.origin,
      statement: 'Sign in with Ethereum to the app.',
      version: '1',
      chains: [1, 11155111, 17000], // main, Sepolia and Holesky
      expirationTime,
    }
  },

  getSession: async () => {
    console.log('[SIWE DEBUG] getSession called')
    const nonce = getCookie(SESSION_COOKIE_NAME)
    console.log('[SIWE DEBUG] getSession - nonce from cookie:', nonce)
    if (!nonce) {
      console.log('[SIWE DEBUG] getSession - no nonce, returning null')
      return null
    }

    try {
      // Use synchronous getter to avoid race condition with IndexedDB rehydration
      const backend_url = getBackendUrlSync()
      console.log('[SIWE DEBUG] getSession - backend_url:', backend_url)

      // Skip if backend_url is still the default placeholder
      if (backend_url.includes('0.0.0.0')) {
        console.warn('[SIWE DEBUG] getSession: backend_url not yet available, skipping session check')
        return null
      }

      const url = ensureDomainUrlHasSSL(`${backend_url}/session`)
      console.log('[SIWE DEBUG] getSession - fetching from:', url)
      const response = await axios.get(url, {
        params: { nonce },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
      console.log('[SIWE DEBUG] getSession - response status:', response.status)
      console.log('[SIWE DEBUG] getSession - response data:', JSON.stringify(response.data, null, 2))

      if (response.status === 200 && response.data?.session) {
        const userSettings = response.data.user_settings
        const network = userSettings.witness_network
        const chainId = ETH_CHAINID_MAP_NUMBERS[network]
        let data = {
          address: ethers.getAddress(response.data.session.address),
          // TODO: fix this. Find a way to return the connected chain id from the backend to avoid issues in which it asks the user to reconnect
          // For now, I read the user settings to get chainID
          chainId: response.data.session.chain_id || chainId,
        } as SIWESession

        console.log('[SIWE DEBUG] getSession - returning session:', JSON.stringify(data))
        return data
      } else {
        console.log('[SIWE DEBUG] getSession - response did not contain valid session')
      }
    } catch (error) {
      console.error('[SIWE DEBUG] getSession - Failed to get session:', error)
    }

    console.log('[SIWE DEBUG] getSession - returning null at end')
    return null
  },

  enabled: true,
  required: true,


  signOutOnDisconnect: false,        // ADD
  signOutOnAccountChange: false,     // ADD
  signOutOnNetworkChange: false,     // ADD


  verifyMessage: async ({ message, signature }: SIWEVerifyMessageArgs) => {
    console.log('[SIWE DEBUG] verifyMessage called')
    try {
      const backend_url = getBackendUrlSync()
      console.log('[SIWE DEBUG] verifyMessage - backend_url:', backend_url)
      const url = ensureDomainUrlHasSSL(`${backend_url}/session`)
      const domain = window.location.host

      const response = await axios.post(url, {
        message,
        signature,
        domain,
      })

      if (response.status === 200 || response.status === 201) {
        const responseData = response.data
        console.log('[SIWE DEBUG] verifyMessage - success, session nonce:', responseData.session.nonce)

        // Set session cookie
        setCookie(
          SESSION_COOKIE_NAME,
          responseData.session.nonce,
          new Date(responseData.session.expiration_time)
        )

        // Update app store
        const store = appStore.getState()
        store.setSession(responseData.session)
        store.setUserProfile(responseData.user_settings)

        console.log('[SIWE DEBUG] verifyMessage - localStorage backend_url after verify:', localStorage.getItem(BACKEND_URL_STORAGE_KEY))

        return true
      }

      return false
    } catch (error) {
      console.error('Failed to verify message:', error)
      toast.error('An error occurred during authentication')
      return false
    }
  },


  signOut: async () => {
    try {
      const nonce = getCookie(SESSION_COOKIE_NAME)

      if (nonce) {
        const backend_url = getBackendUrlSync()
        const url = ensureDomainUrlHasSSL(`${backend_url}/session`)
        await axios.delete(url, {
          params: { nonce },
        })
      }

      // Clear cookie
      setCookie(SESSION_COOKIE_NAME, '', new Date('1970-01-01T00:00:00Z'))

      // Clear store
      const store = appStore.getState()
      store.setMetamaskAddress(null)
      store.setAvatar(undefined)
      store.setSession(null)
      store.setIsAdmin(false)
      store.setFiles({
        fileData: [],
        status: 'idle',
      })

      return true
    } catch (error) {
      console.error('Failed to sign out:', error)
      // Clear local state even if backend fails
      setCookie(SESSION_COOKIE_NAME, '', new Date('1970-01-01T00:00:00Z'))
      return false
    }
  },

  onSignIn: (_session) => {
    // console.log('onSignIn : User signed in:', session)
  },
  onSignOut: () => {
    // console.log('onSignOut : User signed out')
  },
})