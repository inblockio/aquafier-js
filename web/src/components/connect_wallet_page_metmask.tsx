import { useState } from 'react'
import { ensureDomainUrlHasSSL, fetchFiles, generateAvatar, setCookie } from '../utils/functions'
import { generateNonce, SiweMessage } from 'siwe'
import { SESSION_COOKIE_NAME } from '../utils/constants'
import apiClient from '@/api/axiosInstance'
import { useStore } from 'zustand'
import appStore from '../store'
import { BrowserProvider, ethers } from 'ethers'
import { toast } from 'sonner'
import { Alert, AlertDescription } from './ui/alert'

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

// New function to detect multiple wallets
const detectInstalledWallets = (): { wallets: string[], hasMultiple: boolean, hasMetaMask: boolean } => {
  const { ethereum } = window as any
  const wallets: string[] = []

  if (!ethereum) {
    return { wallets: [], hasMultiple: false, hasMetaMask: false }
  }

  // Check for MetaMask
  if (ethereum.isMetaMask) {
    wallets.push('MetaMask')
  }

  // Check for other common wallets
  if (ethereum.isCoinbaseWallet || ethereum.isCoinbaseBrowser) {
    wallets.push('Coinbase Wallet')
  }

  if (ethereum.isRabby) {
    wallets.push('Rabby')
  }

  if (ethereum.isBraveWallet) {
    wallets.push('Brave Wallet')
  }

  if (ethereum.isTokenPocket) {
    wallets.push('TokenPocket')
  }

  if (ethereum.isTrust) {
    wallets.push('Trust Wallet')
  }

  if (ethereum.isPhantom) {
    wallets.push('Phantom')
  }


  if (ethereum.isAvalanche) {
    wallets.push('Core Wallet')
  }

  if (ethereum.isCore || ethereum.isCoreWallet) {
    wallets.push('Core Wallet')
  }

  if (ethereum.isRainbow) {
    wallets.push('Rainbow Wallet')
  }

  if (ethereum.isKeplr) {
    wallets.push('Keplr Wallet')
  }

  if (ethereum.isExodus || ethereum.exodus) {
    wallets.push('Exodus Wallet')
  }

  if (ethereum.isOKExWallet) {
    wallets.push('OKX Wallet')
  }

  if (ethereum.isBitKeep) {
    wallets.push('BitKeep Wallet')
  }

  if (ethereum.isMathWallet) {
    wallets.push('MathWallet')
  }

  if (ethereum.isOneInchIOSWallet || ethereum.isOneInchAndroidWallet) {
    wallets.push('1inch Wallet')
  }

  if (ethereum.isZerion) {
    wallets.push('Zerion Wallet')
  }

  // Check if ethereum.providers array exists (injected by some wallets)
  if (ethereum.providers && Array.isArray(ethereum.providers)) {
    ethereum.providers.forEach((provider: any) => {
      if (provider.isMetaMask && !wallets.includes('MetaMask')) {
        wallets.push('MetaMask')
      }
      if (provider.isCoinbaseWallet && !wallets.includes('Coinbase Wallet')) {
        wallets.push('Coinbase Wallet')
      }
      if (provider.isRabby && !wallets.includes('Rabby')) {
        wallets.push('Rabby')
      }
      if (provider.isBraveWallet && !wallets.includes('Brave Wallet')) {
        wallets.push('Brave Wallet')
      }
      if (provider.isPhantom && !wallets.includes('Phantom')) {
        wallets.push('Phantom')
      }
      if (provider.isTrust && !wallets.includes('Trust Wallet')) {
        wallets.push('Trust Wallet')
      }
      if (provider.isRainbow && !wallets.includes('Rainbow Wallet')) {
        wallets.push('Rainbow Wallet')
      }
      if (provider.isKeplr && !wallets.includes('Keplr Wallet')) {
        wallets.push('Keplr Wallet')
      }
      if (provider.isTokenPocket && !wallets.includes('TokenPocket')) {
        wallets.push('TokenPocket')
      }
      if ((provider.isExodus || provider.exodus) && !wallets.includes('Exodus Wallet')) {
        wallets.push('Exodus Wallet')
      }
      if (provider.isOKExWallet && !wallets.includes('OKX Wallet')) {
        wallets.push('OKX Wallet')
      }
      if (provider.isBitKeep && !wallets.includes('BitKeep Wallet')) {
        wallets.push('BitKeep Wallet')
      }
      if (provider.isMathWallet && !wallets.includes('MathWallet')) {
        wallets.push('MathWallet')
      }
      if (provider.isOneInchIOSWallet || provider.isOneInchAndroidWallet) {
        if (!wallets.includes('1inch Wallet')) {
          wallets.push('1inch Wallet')
        }
      }
      if (provider.isZerion && !wallets.includes('Zerion Wallet')) {
        wallets.push('Zerion Wallet')
      }
      if ((provider.isCore || provider.isCoreWallet || provider.isAvalanche) && !wallets.includes('Core Wallet')) {
        wallets.push('Core Wallet')
      }
    })
  }

  // If no specific wallet detected but ethereum exists, it's an unknown wallet
  if (wallets.length === 0 && ethereum) {
    wallets.push('Unknown Wallet')
  }

  return {
    wallets,
    hasMultiple: wallets.length > 1,
    hasMetaMask: wallets.includes('MetaMask')
  }
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

export const ConnectWalletPageMetamask = () => {
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
  const [_connectionState, setConnectionState] = useState<ConnectionState>('idle')
  const [error, setError] = useState('')
  const [hasMultipleWallets, setHasMultipleWallets] = useState(false)
  const [detectedWallets, setDetectedWallets] = useState<string[]>([])

  const resetState = () => {
    setConnectionState('idle')
    setError('')
    setIsConnecting(false)
  }

  const checkForMultipleWallets = (): boolean => {
    const walletInfo = detectInstalledWallets()

    // console.log(`waallet info ${JSON.stringify(walletInfo)}`)
    setDetectedWallets(walletInfo.wallets)
    setHasMultipleWallets(walletInfo.hasMultiple)

    if (walletInfo.hasMultiple) {
      const walletList = walletInfo.wallets.join(', ')
      const errorMsg = `Multiple wallets detected: ${walletList}. Please disable all wallets except MetaMask to continue.`
      setError(errorMsg)
      toast.error(errorMsg, { duration: 6000 })
      return false
    }

    if (walletInfo.wallets.length === 0) {
      const errorMsg = 'No wallet detected. Please install MetaMask to continue.'
      setError(errorMsg)
      toast.error(errorMsg)
      return false
    }

    if (!walletInfo.hasMetaMask) {
      const errorMsg = `Only ${walletInfo.wallets[0]} detected. This app requires MetaMask. Please install MetaMask or disable other wallets.`
      setError(errorMsg)
      toast.error(errorMsg, { duration: 6000 })
      return false
    }

    // Clear any previous errors if check passes
    setError('')
    return true
  }

  const handleRetryWalletCheck = () => {
    const isValid = checkForMultipleWallets()

    if (isValid) {
      toast.success('MetaMask is ready! Click "Sign in" to continue.')
      setHasMultipleWallets(false)
    }
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
      const link = document.createElement('a')
      link.href = deepLinkUrls[1]
      link.click()

      await new Promise(resolve => setTimeout(resolve, 2000))

      if (document.hasFocus()) {
        window.location.href = deepLinkUrls[0]
      }
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
      await connectWithMetaMask()
    } else {
      const shouldOpenInApp = window.confirm(
        "For the best experience, please open this page in MetaMask's built-in browser. Would you like to do that now?"
      )

      if (shouldOpenInApp) {
        await handleMobileConnection()
      } else {
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


  // Function to get the genuine MetaMask provider from multiple providers
  // Function to get the genuine MetaMask provider from multiple providers
  const getMetaMaskProvider = (): any => {
    const { ethereum } = window as any

    if (!ethereum) {
      throw new Error('No Ethereum provider found')
    }

    // If there are multiple providers, find genuine MetaMask
    if (ethereum.providers && Array.isArray(ethereum.providers)) {
      // Look for genuine MetaMask
      const metamaskProvider = ethereum.providers.find((provider: any) => {
        return provider.isMetaMask &&
          !provider.isRainbow &&
          !provider.isCoinbaseWallet &&
          !provider.isRabby &&
          !provider.isBraveWallet &&
          !provider.isPhantom &&
          !provider.phantom &&
          !provider.isAvalanche &&
          !provider.isCore &&
          !provider.isCoreWallet &&
          !provider.core &&
          !provider.overrideIsMetaMask &&
          // Additional check: Phantom often has 'connect' method with publicKey
          !(typeof provider.connect === 'function' && provider.publicKey !== undefined)
      })

      if (metamaskProvider) {
        return metamaskProvider
      }

      // If not found, throw error
      throw new Error('MetaMask provider not found among multiple wallets')
    }

    // Single provider - verify it's MetaMask
    if (ethereum.isMetaMask &&
      !ethereum.isRainbow &&
      !ethereum.isCoinbaseWallet &&
      !ethereum.isPhantom &&
      !ethereum.phantom &&
      !ethereum.isAvalanche &&
      !ethereum.isCore &&
      !ethereum.isCoreWallet) {
      return ethereum
    }

    throw new Error('MetaMask is not the active provider')
  }

  // Update the connectWithMetaMask function to use the specific provider
  const connectWithMetaMask = async (): Promise<void> => {
    setConnectionState('connecting')

    try {
      // Get the genuine MetaMask provider
      const metamaskProvider = getMetaMaskProvider()
      const provider = new BrowserProvider(metamaskProvider)

      // Use metamaskProvider instead of ethereum for all requests
      await metamaskProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: "0x1" }]
      })

      const accountsResponse = await timeoutPromise(
        metamaskProvider.request({ method: 'eth_requestAccounts' }),
        CONNECTION_TIMEOUT,
        'MetaMask is taking too long to respond. Please unlock your wallet and try again.'
      )

      const accounts = Array.isArray(accountsResponse) ? accountsResponse : []

      if (accounts.length === 0) {
        throw new Error('No accounts found')
      }

      const signer = await provider.getSigner()
      const address = await signer.getAddress()

      const message = createSiweMessage(address, 'Sign in with Ethereum to the app.')

      const signature = await timeoutPromise(
        signer.signMessage(message),
        CONNECTION_TIMEOUT,
        'Signature request timed out. Please try again.'
      )

      const url = ensureDomainUrlHasSSL(`${backend_url}/session`)
      const response = await apiClient.post(url, {
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

       

        
                                      const filesApi = await fetchFiles(session!.address, `${backend_url}/explorer_files`, session!.nonce)
                                      setFiles({ fileData: filesApi.files, pagination : filesApi.pagination, status: 'loaded' })
        

        toast.success('Sign In successful')

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

      setIsConnecting(false)
    }
  }

  const handleSignAndConnect = async (): Promise<void> => {
    if (session) return

    // Check for multiple wallets before proceeding
    const isValid = checkForMultipleWallets()
    if (!isValid) {
      return
    }

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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Aquafier.</h1>
          <p className="text-gray-600 text-sm">Connect your Web3 wallet to get started</p>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-700 text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {hasMultipleWallets && detectedWallets.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm font-medium text-yellow-900 mb-2">Detected wallets:</p>
            <ul className="text-sm text-yellow-800 list-disc list-inside mb-3">
              {detectedWallets.map((wallet, index) => (
                <li key={index}>{wallet}</li>
              ))}
            </ul>
            <button
              onClick={handleRetryWalletCheck}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry Connection Check
            </button>
          </div>
        )}

        <button
          onClick={handleSignAndConnect}
          data-testid="sign-in-button-page"
          disabled={isConnecting || hasMultipleWallets}
          className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
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