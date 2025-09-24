import {useState} from 'react'
import {ensureDomainUrlHasSSL, fetchFiles, generateAvatar, setCookie} from '../utils/functions'
import {generateNonce, SiweMessage} from 'siwe'
import {SESSION_COOKIE_NAME} from '../utils/constants'
import axios from 'axios'
import {useStore} from 'zustand'
import appStore from '../store'
import {BrowserProvider, ethers} from 'ethers'
import {toast} from 'sonner'
import {Alert, AlertDescription} from './ui/alert'

// Types for better type safety
type ConnectionState = 'idle' | 'connecting' | 'success' | 'error'

// Error codes enum for better maintainability
const METAMASK_ERRORS = {
  USER_REJECTED_REQUEST: 4001,
  ALREADY_PROCESSING: -32002,
} as const

// Constants
const MOBILE_BREAKPOINT = 768
const CONNECTION_TIMEOUT = 5000
const SESSION_SUCCESS_DELAY = 2000

// Utility functions
const timeoutPromise = <T,>(
  promise: Promise<T>, 
  ms: number, 
  errorMsg: string = 'Request timed out'
): Promise<T> => {
  let timeoutId: NodeJS.Timeout
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMsg))
    }, ms)
  })
  
  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)),
    timeoutPromise
  ])
}

const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
         window.innerWidth <= MOBILE_BREAKPOINT
}

const isMetaMaskInstalled = (): boolean => {
  const { ethereum } = window as any
  return !!(ethereum && ethereum.isMetaMask)
}

const isMetaMaskBrowser = (): boolean => {
  const { ethereum } = window as any
  return !!(ethereum && ethereum.isMetaMask && ethereum.selectedAddress)
}

const createSiweMessage = (address: string, statement: string): string => {
  const domain = window.location.host
  const origin = window.location.origin
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  
  const message = new SiweMessage({
    domain,
    address,
    statement,
    uri: origin,
    version: '1',
    chainId: 2,
    nonce: generateNonce(),
    expirationTime: expiry,
    issuedAt: new Date(Date.now()).toISOString(),
  })
  
  return message.prepareMessage()
}

export const ConnectWalletPage = () => {
  const { 
    setMetamaskAddress, 
    session, 
    setFiles, 
    setAvatar, 
    setUserProfile, 
    backend_url, 
    setSession 
  } = useStore(appStore)

  // State management
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle')
  const [error, setError] = useState('')

  const resetState = () => {
    setConnectionState('idle')
    setError('')
    setIsConnecting(false) // Add this to ensure button is enabled
  }

  const generateDeepLinkUrls = (): string[] => {
    const currentUrl = window.location.href
    const dappPath = `${window.location.host}${window.location.pathname}${window.location.search}`
    
    return [
      `https://metamask.app.link/dapp/${dappPath}`,
      `metamask://dapp/${dappPath}`,
      `https://metamask.app.link/dapp/${currentUrl}`,
      `https://metamask.app.link/browser?url=${currentUrl}`,
    ]
  }

  const handleMobileConnection = async (): Promise<void> => {
    const deepLinkUrls = generateDeepLinkUrls()

    try {
      // Try to open MetaMask app using protocol scheme
      const link = document.createElement('a')
      link.href = deepLinkUrls[1] // metamask:// protocol
      link.click()

      // Wait briefly to see if app opens
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Fallback to https deep link
      window.location.href = deepLinkUrls[0]
    } catch (error) {
      console.error('Deep link failed:', error)
      toast.error('MetaMask not found. Redirecting to download page.')
      window.open('https://metamask.io/download/', '_blank')
    }
  }

  const handleMobileFlow = async (): Promise<void> => {
    if (!isMetaMaskInstalled()) {
      await handleMobileConnection()
      return
    }

    if (isMetaMaskBrowser()) {
      // We're in MetaMask's in-app browser, proceed normally
      await connectWithMetaMask()
    } else {
      // MetaMask is installed but we're in external browser
      const shouldOpenInApp = window.confirm(
        "For the best experience, please open this page in MetaMask's built-in browser. Would you like to do that now?"
      )

      if (shouldOpenInApp) {
        await handleMobileConnection()
      } else {
        // User wants to continue in current browser
        await connectWithMetaMask()
      }
    }
  }

  const handleDesktopFlow = async (): Promise<void> => {
    if (!isMetaMaskInstalled()) {
      toast.error('MetaMask is not installed. Please install it to connect.')
      window.open('https://metamask.io/download/', '_blank')
      return
    }
    
    await connectWithMetaMask()
  }

  const getErrorMessage = (error: any): string => {
    if (error.message?.includes('timed out') || error.message?.includes('MetaMask is taking too long')) {
      return 'MetaMask is taking too long to respond. Please unlock your wallet manually and try connecting again.'
    }
    
    switch (error.code) {
      case METAMASK_ERRORS.USER_REJECTED_REQUEST:
        return 'You rejected the connection request.'
      case METAMASK_ERRORS.ALREADY_PROCESSING:
        return 'MetaMask is already processing a request. Please check MetaMask.'
      default:
        if (error.message?.includes('User rejected')) {
          return 'You rejected signing the message.'
        }
        return error.message || 'An error occurred while connecting.'
    }
  }

  const connectWithMetaMask = async (): Promise<void> => {
    setConnectionState('connecting')

    const { ethereum } = window as any
    const provider = new BrowserProvider(ethereum)

    try {
      // Use the timeoutPromise utility function for cleaner timeout handling
      const accountsResponse = await timeoutPromise(
        ethereum.request({ method: 'eth_requestAccounts' }),
        CONNECTION_TIMEOUT,
        'MetaMask is taking too long to respond. Please unlock your wallet and try again.'
      )

      // Type guard to ensure we have a valid accounts array
      const accounts = Array.isArray(accountsResponse) ? accountsResponse : []
      
      if (accounts.length === 0) {
        throw new Error('No accounts found')
      }

      const signer = await provider.getSigner()
      const address = await signer.getAddress()

      // Generate SIWE message and get signature
      const message = createSiweMessage(address, 'Sign in with Ethereum to the app.')
      
      // Add timeout to signature as well
      const signature = await timeoutPromise(
        signer.signMessage(message),
        CONNECTION_TIMEOUT,
        'Signature request timed out. Please try again.'
      )

      // Send session request to backend
      const url = ensureDomainUrlHasSSL(`${backend_url}/session`)
      const response = await axios.post(url, {
        message,
        signature,
        domain: window.location.host,
      })

      if (response.status === 200 || response.status === 201) {
        const responseData = response.data
        const backendAddress = responseData?.session?.address
        const walletAddress = backendAddress 
          ? ethers.getAddress(backendAddress) 
          : ethers.getAddress(address)

        // Update application state
        setMetamaskAddress(walletAddress)
        setAvatar(generateAvatar(walletAddress))
        setCookie(
          SESSION_COOKIE_NAME, 
          `${responseData.session.nonce}`, 
          new Date(responseData?.session?.expiration_time)
        )
        setConnectionState('success')
        setUserProfile({ ...response.data.user_settings })
        setSession({ ...response.data.session })

        // Fetch user files
        const files = await fetchFiles(
          walletAddress, 
          `${backend_url}/explorer_files`, 
          responseData.session.nonce
        )
        setFiles({
          fileData: files,
          status: 'loaded',
        })

        toast.success('Sign In successful')

        // Reset state after delay
        setTimeout(() => {
          resetState()
        }, SESSION_SUCCESS_DELAY)
      }
    } catch (error: any) {
      console.error('MetaMask connection error:', error)
      
      const errorMessage = getErrorMessage(error)
      setConnectionState('error')
      setError(errorMessage)
      toast.error(errorMessage)
      
      // Make sure to reset the connecting state on error
      setIsConnecting(false)
    }
  }

  const handleSignAndConnect = async (): Promise<void> => {
    if (session) return // Don't connect if already have session

    setIsConnecting(true)
    setError('')

    try {
      if (isMobileDevice()) {
        await handleMobileFlow()
      } else {
        await handleDesktopFlow()
      }
    } catch (error: any) {
      console.error('Connection error:', error)
      const errorMessage = getErrorMessage(error)
      setConnectionState('error')
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-purple-300 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Aquafier</h1>
          <p className="text-gray-600 text-sm">Connect your Web3 wallet to get started</p>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        <button
          onClick={handleSignAndConnect}
          data-testid="sign-in-button-page"
          disabled={isConnecting}
          className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          {isConnecting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Connecting...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.483 6.125C3.483 5.504 3.987 5 4.608 5h14.784c.621 0 1.125.504 1.125 1.125v11.75c0 .621-.504 1.125-1.125 1.125H4.608c-.621 0-1.125-.504-1.125-1.125V6.125zM5.233 6.75v10.5h13.534V6.75H5.233z" />
                <path d="M7.5 9.75h9v1.5h-9v-1.5zm0 3h6v1.5h-6v-1.5z" />
              </svg>
              Sign in
            </>
          )}
        </button>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            By connecting, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}