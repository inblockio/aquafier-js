import { createSIWEConfig } from '@reown/appkit-siwe'
import type { SIWECreateMessageArgs, SIWESession, SIWEVerifyMessageArgs } from '@reown/appkit-siwe'
import axios from 'axios'
import { getCookie, setCookie, ensureDomainUrlHasSSL } from '../utils/functions'
import { SESSION_COOKIE_NAME } from '../utils/constants'
import appStore from '../store'

export const siweConfig = createSIWEConfig({
  createMessage: ({ address, ...args }: SIWECreateMessageArgs) => {
    return `${args.domain} wants you to sign in with your Ethereum account:
${address}

Sign in with Ethereum to the app.

URI: ${args.uri}
Version: ${args.version}
Chain ID: ${args.chainId}
Nonce: ${args.nonce}${args.iat ? `
Issued At: ${args.iat}` : ''}${args.exp ? `
Expiration Time: ${args.exp}` : ''}`
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
      version: '1'
    }
  },

  getSession: async () => {
    const nonce = getCookie(SESSION_COOKIE_NAME)
    if (!nonce) return null

    try {
      const backend_url = appStore.getState().backend_url
      const url = ensureDomainUrlHasSSL(`${backend_url}/session`)
      const response = await axios.get(url, {
        params: { nonce },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })

      if (response.status === 200 && response.data?.session) {
        return {
          address: response.data.session.address,
          chainId: response.data.session.chain_id || 1,
        } as SIWESession
      }
    } catch (error) {
      console.error('Failed to get session:', error)
    }
    
    return null
  },

  verifyMessage: async ({ message, signature }: SIWEVerifyMessageArgs) => {
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

  onSignIn: (session) => {
    console.log('User signed in:', session)
  },
  onSignOut: () => {
    console.log('User signed out')
  },
})