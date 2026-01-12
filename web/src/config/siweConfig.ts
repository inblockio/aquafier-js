import { createSIWEConfig } from '@reown/appkit-siwe'
import type { SIWECreateMessageArgs, SIWESession, SIWEVerifyMessageArgs } from '@reown/appkit-siwe'
import axios from 'axios'
import { getCookie, setCookie, ensureDomainUrlHasSSL } from '../utils/functions'
import { ETH_CHAINID_MAP_NUMBERS, SESSION_COOKIE_NAME } from '../utils/constants'
import appStore from '../store'
import { toast } from 'sonner'
import { createSiweMessage } from '@/utils/appkit-wallet-utils'
import { ethers } from 'ethers'

// Helper function to extract Ethereum address from DID or return as-is if already an address
const extractEthereumAddress = (addressOrDid: string): string => {
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

  
  createMessage: ({ address }: SIWECreateMessageArgs) => {
    // Extract the actual Ethereum address from DID format if necessary
    const ethAddress = extractEthereumAddress(address)

    return createSiweMessage(ethAddress, "Sign in with Ethereum to the app")
  },

  getNonce: async () => {
    const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
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
    const nonce = getCookie(SESSION_COOKIE_NAME)
    // console.log("getSession : Nonce: ", nonce)
    if (!nonce) return null

    // console.log("getSession : Here after nonce")

    try {
      const backend_url = appStore.getState().backend_url
      const url = ensureDomainUrlHasSSL(`${backend_url}/session`)
      const response = await axios.get(url, {
        params: { nonce },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
      // console.log("Response: ", response)

      if (response.status === 200 && response.data?.session) {
        // console.log("Session: ", response.data.session)
        const userSettings = response.data.user_settings
        const network = userSettings.witness_network
        const chainId = ETH_CHAINID_MAP_NUMBERS[network]
        let data = {
          address: ethers.getAddress(response.data.session.address),
          // TODO: fix this. Find a way to return the connected chain id from the backend to avoid issues in which it asks the user to reconnect
          // For now, I read the user settings to get chainID
          chainId: response.data.session.chain_id || chainId, 
        } as SIWESession

        // console.log("getSession : Retrieved session data:", JSON.stringify(data))
        return data
      }
    } catch (error) {
      console.error('getSession : Failed to get session:', error)
    }

    return null
  },

  enabled:true,
  required: true,
  

  signOutOnDisconnect: false,        // ADD
    signOutOnAccountChange: false,     // ADD
    signOutOnNetworkChange: false,     // ADD
  

  verifyMessage: async ({ message, signature }: SIWEVerifyMessageArgs) => {
    // console.log("Message: ", message)
    // console.log("Signature: ", signature)
    try {
      const backend_url = appStore.getState().backend_url
      const url = ensureDomainUrlHasSSL(`${backend_url}/session`)
      const domain = window.location.host

      const response = await axios.post(url, {
        message,
        signature,
        domain,
      })

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