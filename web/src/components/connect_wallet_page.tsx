import { useState } from 'react'
import { ensureDomainUrlHasSSL, fetchFiles, generateAvatar, setCookie } from '../utils/functions'
import { SiweMessage, generateNonce } from 'siwe'
import { SESSION_COOKIE_NAME } from '../utils/constants'
import axios from 'axios'
import { useStore } from 'zustand'
import appStore from '../store'
import { BrowserProvider, ethers } from 'ethers'
import { toast } from 'sonner'
import { Alert, AlertDescription } from './ui/alert'

export const ConnectWalletPage = () => {
      const { setMetamaskAddress, session, setFiles, setAvatar, setUserProfile, backend_url, setSession } = useStore(appStore)

      const [isConnecting, setIsConnecting] = useState(false)
      const [_isOpen, setIsOpen] = useState(false)
      const [_loading, setLoading] = useState(false)
      const [_connectionState, setConnectionState] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle')
      const [_message, _setMessage] = useState<string | null>(null)
      const [_progress, setProgress] = useState(0)
      const [error, setError] = useState('')

      const resetState = () => {
            setConnectionState('idle')
            setProgress(0)
      }

      function createSiweMessage(address: string, statement: string) {
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

      // Improved mobile detection
      const isMobile = () => {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768
      }

      // Better MetaMask detection for mobile
      const isMetaMaskInstalled = () => {
            const { ethereum } = window as any
            return !!(ethereum && ethereum.isMetaMask)
      }

      // Check if we're in MetaMask's in-app browser
      const isMetaMaskBrowser = () => {
            const { ethereum } = window as any
            return !!(ethereum && ethereum.isMetaMask && ethereum.selectedAddress)
      }

      const handleMobileConnection = async () => {
            const currentUrl = window.location.href

            // Try multiple approaches for mobile connection
            // const deepLinkUrls = [
            //   `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`,
            //   `metamask://dapp/${window.location.host}${window.location.pathname}`,
            //   `https://metamask.app.link/dapp/${currentUrl.replace(/^https?:\/\//, '')}`
            // ];

            const dappPath = `${window.location.host}${window.location.pathname}${window.location.search}`
            const deepLinkUrls = [
                  `https://metamask.app.link/dapp/${dappPath}`,
                  `metamask://dapp/${dappPath}`,
                  `https://metamask.app.link/dapp/${currentUrl}`,
                  `https://metamask.app.link/browser?url=${currentUrl}`,
            ]

            // First, try to detect if MetaMask mobile app is installed
            // let appInstalled = false;

            try {
                  // Try to open MetaMask app
                  const link = document.createElement('a')
                  link.href = deepLinkUrls[1] // metamask:// protocol
                  link.click()

                  // Wait a bit to see if the app opens
                  await new Promise(resolve => setTimeout(resolve, 2000))

                  // If we're still here, try the https deep link
                  window.location.href = deepLinkUrls[0]
            } catch (e) {
                  console.error('Deep link failed:', e)
                  // Fallback to download page
                  toast('MetaMask not found. Redirecting to download page.')
                  window.open('https://metamask.io/download/', '_blank')
            }
      }

      const signAndConnect = async () => {
            //  console.log('Connecting to wallet '+backend_url)
            setIsConnecting(true)
            setError('')

            try {
                  // Mobile handling
                  if (isMobile()) {
                        if (!isMetaMaskInstalled()) {
                              await handleMobileConnection()
                              return
                        }

                        // If MetaMask is installed on mobile, try to connect
                        if (isMetaMaskBrowser()) {
                              // We're in MetaMask's in-app browser, proceed normally
                              await connectWithMetaMask()
                        } else {
                              // MetaMask is installed but we're in external browser
                              const shouldOpenInApp = window.confirm("For the best experience, please open this page in MetaMask's built-in browser. Would you like to do that now?")

                              if (shouldOpenInApp) {
                                    await handleMobileConnection()
                                    return
                              } else {
                                    // User wants to continue in current browser
                                    await connectWithMetaMask()
                              }
                        }
                  } else {
                        // Desktop handling
                        if (!isMetaMaskInstalled()) {
                              toast('MetaMask is not installed. Please install it to connect.')
                              window.open('https://metamask.io/download/', '_blank')
                              return
                        }
                        await connectWithMetaMask()
                  }
            } catch (error: any) {
                  console.error('Connection error:', error)
                  setError(error.message || 'Connection failed')
                  toast(error.message || 'Connection failed')
            } finally {
                  setIsConnecting(false)
            }
      }

      const connectWithMetaMask = async () => {
            setLoading(true)
            setConnectionState('connecting')

            const { ethereum } = window as any
            const provider = new BrowserProvider(ethereum)

            try {
                  // Request account access
                  const accounts = await ethereum.request({
                        method: 'eth_requestAccounts',
                  })

                  if (!accounts || accounts.length === 0) {
                        throw new Error('No accounts found')
                  }

                  const signer = await provider.getSigner()
                  const address = await signer.getAddress()

                  // Generate SIWE message
                  const message = createSiweMessage(address, 'Sign in with Ethereum to the app.')
                  const signature = await signer.signMessage(message)

                  const url = ensureDomainUrlHasSSL(`${backend_url}/session`)
                  //  console.log(`url ${url}`)
                  // Send session request
                  const response = await axios.post(url, {
                        message,
                        signature,
                        domain: window.location.host,
                  })

                  if (response.status === 200 || response.status === 201) {
                        const responseData = response.data
                        //  console.log('Backend response:', responseData)
                        //  console.log('Session data:', responseData?.session)
                        //  console.log('Address from response:', responseData?.session?.address)

                        // const walletAddress = ethers.getAddress(responseData?.session?.address)
                        const backendAddress = responseData?.session?.address
                        const walletAddress = backendAddress ? ethers.getAddress(backendAddress) : ethers.getAddress(address)

                        setMetamaskAddress(walletAddress)
                        setAvatar(generateAvatar(walletAddress))

                        setCookie(SESSION_COOKIE_NAME, `${responseData.session.nonce}`, new Date(responseData?.session?.expiration_time))

                        setConnectionState('success')
                        setUserProfile({ ...response.data.user_settings })
                        setSession({ ...response.data.session })

                        const files = await fetchFiles(walletAddress, `${backend_url}/explorer_files`, responseData.session.nonce)
                        setFiles({
                              fileData: files,
                              status: 'loaded',
                        })

                        toast('Sign In successful')

                        setTimeout(() => {
                              setIsOpen(false)
                              resetState()
                        }, 2000)
                  }
            } catch (error: any) {
                  console.error('MetaMask connection error:', error)

                  let errorMessage = 'An error occurred while connecting.'

                  if (error.code === 4001) {
                        errorMessage = 'You rejected the connection request.'
                  } else if (error.code === -32002) {
                        errorMessage = 'MetaMask is already processing a request. Please check MetaMask.'
                  } else if (error.message?.includes('User rejected')) {
                        errorMessage = 'You rejected signing the message.'
                  }

                  setConnectionState('error')
                  setError(errorMessage)
                  toast(errorMessage)
            } finally {
                  setLoading(false)
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
                              onClick={() => {
                                    setIsOpen(true)
                                    !session && signAndConnect()
                              }}
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
                              <p className="text-xs text-gray-500">By connecting, you agree to our Terms of Service and Privacy Policy</p>
                        </div>
                  </div>
            </div>
      )
}
