import { createSIWEConfig } from '@reown/appkit-siwe'
import type { SIWECreateMessageArgs, SIWESession, SIWEVerifyMessageArgs } from '@reown/appkit-siwe'
import axios from 'axios'
import { getCookie, setCookie, ensureDomainUrlHasSSL } from '../utils/functions'
import { ETH_CHAINID_MAP_NUMBERS, SESSION_COOKIE_NAME } from '../utils/constants'
import appStore, { appStoreActions } from '../store'
import { toast } from 'sonner'
import { createSiweMessage } from '../utils/appkit-wallet-utils'
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
    console.log("SIWE: createMessage called with address:", address)
    // Extract the actual Ethereum address from DID format if necessary
    const ethAddress = extractEthereumAddress(address)
    const message = createSiweMessage(ethAddress, "Sign in with Ethereum to the app")
    console.log("SIWE: Message created:", message)
    return message
  },

  getNonce: async () => {
    console.log("SIWE: getNonce called")
    const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    console.log("SIWE: Generated nonce:", nonce)
    return nonce
  },

  getMessageParams: async () => {
    console.log("SIWE: getMessageParams called")
    return {
      domain: window.location.host,
      uri: window.location.origin,
      statement: 'Sign in with Ethereum to the app.',
      version: '1',
      chains: [1, 11155111, 17000], // main, Sepolia and Holesky
    }
  },
 
  getSession: async () => {
    console.log("SIWE: getSession called")
    const nonce = getCookie(SESSION_COOKIE_NAME)
    console.log("SIWE: Nonce from cookie:", nonce)
    
    if (!nonce) {
      console.log("SIWE: No nonce found, returning null")
      return null
    }

    try {
      const backend_url = appStore.backend_url
      const url = ensureDomainUrlHasSSL(`${backend_url}/session`)
      console.log("SIWE: Fetching session from:", url)
      
      const response = await axios.get(url, {
        params: { nonce },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })

      console.log("SIWE: Session response:", response)

      if (response.status === 200 && response.data?.session) {
        console.log("SIWE: Session found:", response.data.session)
        const userSettings = response.data.user_settings
        const network = userSettings.witness_network
        const chainId = ETH_CHAINID_MAP_NUMBERS[network]
        
        return {
          address: ethers.getAddress(response.data.session.address),
          chainId: response.data.session.chain_id || chainId, 
        } as SIWESession
      }
    } catch (error) {
      console.error('SIWE: Failed to get session:', error)
    }
    
    return null
  },

  verifyMessage: async ({ message, signature }: SIWEVerifyMessageArgs) => {
    console.log("SIWE: verifyMessage called")
    console.log("SIWE: Message:", message)
    console.log("SIWE: Signature:", signature)
    
    try {
      const backend_url = appStore.backend_url
      const url = ensureDomainUrlHasSSL(`${backend_url}/session`)
      const domain = window.location.host
      
      console.log("SIWE: Sending verification to:", url)

      const response = await axios.post(url, {
        message,
        signature,
        domain,
      })

      console.log("SIWE: Verification response:", response)

      if (response.status === 200 || response.status === 201) {
        const responseData = response.data
        
        // Set session cookie
        setCookie(
          SESSION_COOKIE_NAME,
          responseData.session.nonce,
          new Date(responseData.session.expiration_time)
        )

        console.log("SIWE: Session cookie set, updating store")

        // Update app store
        const { setMetamaskAddress, setFiles, setAvatar, setUserProfile, setSession } = appStoreActions;
        setSession(responseData.session)
        setUserProfile(responseData.user_settings)
        
        console.log("SIWE: Store updated successfully")
        return true
      }
      
      return false
    } catch (error) {
      console.error('SIWE: Failed to verify message:', error)
      toast.error('An error occurred during authentication')
      return false
    }
  },

  signOut: async () => {
    console.log("SIWE: signOut called")
    try {
      const nonce = getCookie(SESSION_COOKIE_NAME)
      if (nonce) {
        const backend_url = appStore.backend_url
        const url = ensureDomainUrlHasSSL(`${backend_url}/session`)
        console.log("SIWE: Sending signout request to:", url)
        await axios.delete(url, {
          params: { nonce },
        })
      }

      // Clear cookie
      setCookie(SESSION_COOKIE_NAME, '', new Date('1970-01-01T00:00:00Z'))

      // Clear store
      const { setMetamaskAddress, setFiles, setAvatar, setUserProfile, setSession } = appStoreActions;
      setMetamaskAddress(null)
      setAvatar(undefined)
      setSession(null)
      setFiles({
        fileData: [],
        status: 'idle',
      })
      
      console.log("SIWE: Sign out complete")
      return true
    } catch (error) {
      console.error('SIWE: Failed to sign out:', error)
      // Clear local state even if backend fails
      setCookie(SESSION_COOKIE_NAME, '', new Date('1970-01-01T00:00:00Z'))
      return false
    }
  },

  onSignIn: (session) => {
    console.log('SIWE: User signed in:', session)
  },

  onSignOut: () => {
    console.log('SIWE: User signed out')
  },

  // Enable SIWE
  enabled: true,
  
  // Configure when to show SIWE
  nonceRefetchIntervalMs: 300000, // 5 minutes
  sessionRefetchIntervalMs: 300000, // 5 minutes
  signOutOnDisconnect: true,
  signOutOnAccountChange: true,
  signOutOnNetworkChange: false,
})