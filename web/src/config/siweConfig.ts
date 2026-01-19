import { createSIWEConfig, formatMessage } from '@reown/appkit-siwe'
import type { SIWECreateMessageArgs, SIWESession, SIWEVerifyMessageArgs } from '@reown/appkit-siwe'
import axios from 'axios'
import { getCookie, setCookie, ensureDomainUrlHasSSL } from '../utils/functions'
import { ETH_CHAINID_MAP_NUMBERS, SESSION_COOKIE_NAME } from '../utils/constants'
import appStore from '../store'
import { toast } from 'sonner'
import { ethers } from 'ethers'
import { getAddress } from 'viem'

// Normalize the address (checksum) - handles both DID format and regular addresses
const normalizeAddress = (address: string): string => {
  try {
    const splitAddress = address.split(':')
    const extractedAddress = splitAddress[splitAddress.length - 1]
    const checksumAddress = getAddress(extractedAddress)
    splitAddress[splitAddress.length - 1] = checksumAddress
    const normalizedAddress = splitAddress.join(':')
    return normalizedAddress
  } catch (error) {
    return address
  }
}

export const siweConfig = createSIWEConfig({

  createMessage: ({ address, ...args }: SIWECreateMessageArgs) => {
    // Use formatMessage from AppKit (like working example)
    return formatMessage(args, normalizeAddress(address))
  },

  getNonce: async () => {
    // Keep your existing nonce generation for now
    // If backend provides /nonce endpoint, use that instead
    const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    console.log('getNonce called:', nonce)
    return nonce
  },

  getMessageParams: async () => {
    return {
      domain: window.location.host,
      uri: window.location.origin,
      statement: 'Sign in with Ethereum to the app.',
      version: '1',
      chains: [1, 11155111, 17000], // main, Sepolia and Holesky
    }
  },

  getSession: async () => {
    console.log("getSession called")
    const nonce = getCookie(SESSION_COOKIE_NAME)
    console.log("getSession: Nonce from cookie:", nonce)

    if (!nonce) {
      console.log("getSession: No nonce found, returning null")
      return null
    }

    try {
      const backend_url = appStore.getState().backend_url
      const url = ensureDomainUrlHasSSL(`${backend_url}/session`)
      console.log("getSession: Fetching from:", url)

      const response = await axios.get(url, {
        params: { nonce },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })

      console.log("getSession: Response status:", response.status)
      console.log("getSession: Response data:", response.data)

      if (response.status === 200 && response.data?.session) {
        const userSettings = response.data.user_settings
        const network = userSettings.witness_network
        const chainId = ETH_CHAINID_MAP_NUMBERS[network]
        let data = {
          address: ethers.getAddress(response.data.session.address),
          chainId: response.data.session.chain_id || chainId,
        } as SIWESession

        console.log("getSession: Retrieved session data:", JSON.stringify(data))
        return data
      }
    } catch (error) {
      console.error('getSession: Failed to get session:', error)
      if (axios.isAxiosError(error)) {
        console.error('getSession: Response data:', error.response?.data)
        console.error('getSession: Response status:', error.response?.status)
      }
    }

    console.log("getSession: Returning null")
    return null
  },

  enabled: true,
  required: false,


  signOutOnDisconnect: false,        // ADD
  signOutOnAccountChange: false,     // ADD
  signOutOnNetworkChange: false,     // ADD


  verifyMessage: async ({ message, signature }: SIWEVerifyMessageArgs) => {
    console.log("verifyMessage called")
    console.log("Message: ", message)
    console.log("Signature: ", signature)

    try {
      const backend_url = appStore.getState().backend_url
      const url = ensureDomainUrlHasSSL(`${backend_url}/session`)
      const domain = window.location.host

      const response = await axios.post(url, {
        message,
        signature,
        domain,
      })

      console.log("verifyMessage response status:", response.status)
      console.log("verifyMessage response data:", response.data)

      if (response.status === 200 || response.status === 201) {
        const responseData = response.data

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

        console.log("verifyMessage: Authentication successful")
        return true
      }

      console.log("verifyMessage: Authentication failed - unexpected status")
      return false
    } catch (error) {
      console.error('verifyMessage: Failed to verify message:', error)
      if (axios.isAxiosError(error)) {
        console.error('verifyMessage: Response data:', error.response?.data)
        console.error('verifyMessage: Response status:', error.response?.status)
      }
      toast.error('An error occurred during authentication')
      return false
    }
  },


  signOut: async () => {
    try {
      const nonce = getCookie(SESSION_COOKIE_NAME)

      if (nonce) {
        const backend_url = appStore.getState().backend_url
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