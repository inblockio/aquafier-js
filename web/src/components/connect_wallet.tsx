import {lazy, Suspense, useState} from 'react'
import {LuCircleCheck, LuCircleX, LuLogOut, LuWallet} from 'react-icons/lu'
import {ClipLoader} from 'react-spinners'
import {
    ensureDomainUrlHasSSL,
    fetchFiles,
    formatCryptoAddress,
    generateAvatar,
    getCookie,
    setCookie
} from '../utils/functions'
import {generateNonce, SiweMessage} from 'siwe'
import {SESSION_COOKIE_NAME} from '../utils/constants'
import axios from 'axios'
import {useStore} from 'zustand'
import appStore from '../store'
import {BrowserProvider, ethers} from 'ethers'

import {Button} from './ui/button'
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger} from './ui/dialog'
import {toast} from 'sonner'
// Lazy load the WalletAddressProfile component
const WalletAddressProfile = lazy(() => import('@/pages/v2_claims_workflow/WalletAddressProfile'))

export const ConnectWallet: React.FC<{ dataTestId: string }> = ({ dataTestId }) => {
      const { setMetamaskAddress, session, setFiles, setAvatar, setUserProfile, backend_url, setSession } = useStore(appStore)

      const [isOpen, setIsOpen] = useState(false)
      const [loading, setLoading] = useState(false)
      const [connectionState, setConnectionState] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle')
      const [message, setMessage] = useState<string | null>(null)
      // const [avatar, setAvatar] = useState("")
      const [_progress, setProgress] = useState(0)

      const iconSize = '120px'

      const resetState = () => {
            setConnectionState('idle')
            setProgress(0)
      }

      function createSiweMessage(address: string, statement: string) {
            // const scheme = window.location.protocol.slice(0, -1);
            const domain = window.location.host
            const origin = window.location.origin
            const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            const message = new SiweMessage({
                  // Setting scheme is giving out lots of headaches
                  // scheme: scheme,
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

      const signAndConnect = async () => {
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

            // Function to check if MetaMask is installed
            const isMetaMaskInstalled = () => !!window.ethereum

            if (isMetaMaskInstalled()) {
                  setLoading(true)
                  setConnectionState('connecting')
                  const provider = new BrowserProvider(window.ethereum as any)

                  try {
                        // Request connection
                        await (window.ethereum as any).request({
                              method: 'eth_requestAccounts',
                        })
                        const signer = await provider.getSigner()

                        // Generate SIWE message
                        const domain = window.location.host
                        const message = createSiweMessage(signer.address, 'Sign in with Ethereum to the app.')
                        const signature = await signer.signMessage(message)
                        // Send session request
                         const url = ensureDomainUrlHasSSL(`${backend_url}/session`)
                        const response = await axios.post(url, {
                              message,
                              signature,
                              domain,
                        })

                        if (response.status === 200 || response.status === 201) {
                              const responseData = response.data
                              const walletAddress = ethers.getAddress(responseData?.session?.address)
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
                        }

                        setLoading(false)
                        setMessage(null)
                        toast('Sign In successful', {
                              description: 'Sign In successful',
                        })

                        setTimeout(() => {
                              setIsOpen(false)
                              resetState()
                              setLoading(false)
                              setMessage(null)
                        }, 2000)
                  } catch (error: any) {
                        console.error('Error connecting:', error)
                        setConnectionState('error')
                        setLoading(false)
                        setMessage(error.toString().includes('4001') ? 'You have rejected signing the message.' : 'An error occurred while connecting.')
                        toast(error.toString().includes('4001') ? 'You have rejected signing the message.' : 'An error occurred while connecting.')
                  }
            } else {
                  // Handle mobile deep linking if MetaMask is not installed
                  if (isMobile) {
                        const currentDomain = window.location.host
                        const currentPath = window.location.pathname

                        const metamaskDeepLink = `https://metamask.app.link/dapp/${currentDomain}${currentPath}`
                        const metamaskAppLink = `metamask://dapp/${currentDomain}${currentPath}`

                        try {
                              // Open MetaMask deep link in a new tab
                              window.open(metamaskDeepLink, '_self')

                              // If MetaMask doesn't open, fall back to alternative link
                              setTimeout(() => {
                                    window.open(metamaskAppLink, '_self')

                                    // If still no response, redirect to MetaMask download page
                                    setTimeout(() => {
                                          if (!isMetaMaskInstalled()) {
                                                toast('MetaMask is not installed. Redirecting to download page.')
                                                window.location.href = 'https://metamask.io/download/'
                                          }
                                    }, 2000)
                              }, 1000)
                        } catch (e) {
                              console.error('Deep link error:', e)
                              toast('Failed to open MetaMask. You may need to install it first.')
                              window.location.href = 'https://metamask.io/download/'
                        }
                  } else {
                        toast('MetaMask is not installed. Please install it to connect.')
                  }
            }
      }

      const signOut = () => {
            setLoading(true)
            setCookie(SESSION_COOKIE_NAME, '', new Date('1970-01-01T00:00:00Z'))
            setMetamaskAddress(null)
            setAvatar(undefined)
            setLoading(false)
            setIsOpen(false)
            toast('Signed out successfully')
      }

      const signOutFromSiweSession = async () => {
            setLoading(true)
            try {
                  // const formData = new URLSearchParams();
                  const nonce = getCookie('pkc_nonce')
                  // formData.append("nonce", nonce);

                   const url = ensureDomainUrlHasSSL(`${backend_url}/session`)
                  const response = await axios.delete(url, {
                        params: {
                              nonce,
                        },
                  })

                  if (response.status === 200) {
                        signOut()
                        setMetamaskAddress(null)
                        setAvatar(undefined)
                        setSession(null)
                        setFiles({
                              fileData: [],
                              status: 'idle',
                        })
                  }
            } catch (error: any) {
                  setMetamaskAddress(null)
                  setAvatar(undefined)
                  setSession(null)
                  setFiles({
                        fileData: [],
                  status: 'idle',})
            }
            setLoading(false)
            setIsOpen(false)
            toast('Signed out successfully')
      }

      return (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                  <DialogTrigger asChild>
                        <Button
                              data-testid={dataTestId}
                              size={'sm'}
                              className="rounded-md"
                              onClick={() => {
                                    !session && signAndConnect()
                              }}
                        >
                              <LuWallet />
                              {session ? formatCryptoAddress(session?.address, 3, 3) : 'Sign In'}
                        </Button>
                  </DialogTrigger>
                  <DialogContent aria-describedby="Account dialog" aria-description="Account dialog" className="sm:max-w-[425px] max-w-[425px]">
                        <DialogHeader>
                              <DialogTitle>{session ? 'Account' : 'Sign In'}</DialogTitle>
                        </DialogHeader>
                        <DialogDescription>
                              {session ? (
                                    <div className="flex flex-col gap-5 items-center">
                                          {/* <div className="relative group">
                                                <Avatar className="size-20 border-2 border-primary/20 hover:border-primary/50 transition-all duration-300">
                                                      <AvatarImage src={avatar} alt="User Avatar" />
                                                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                                            {session?.address ? session.address.substring(2, 4).toUpperCase() : 'UN'}
                                                      </AvatarFallback>
                                                </Avatar>
                                                <div className="absolute -bottom-1 -right-1 bg-green-500 h-3 w-3 rounded-full border-2 border-background" title="Connected" />
                                          </div>

                                          <div className="flex flex-col items-center gap-2 w-full">
                                                <p className="font-mono text-sm bg-secondary/30 px-3 py-1 rounded-full">{formatCryptoAddress(session?.address, 10, 10)}</p>
                                                <CustomCopyButton value={`${session?.address}`} />
                                          </div> */}
                                          <Suspense fallback={<div>Loading...</div>}>
                                                <WalletAddressProfile walletAddress={session?.address} callBack={() => {
                                                      setIsOpen(false)
                                                }} showAvatar={false} />
                                          </Suspense>

                                          {/* <div className="bg-secondary/20 w-full p-3 rounded-lg my-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-muted-foreground">Wallet Balance</span>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">ETH</span>
                </div>
                <div className="font-medium">0.0000 ETH</div>
              </div> */}

                                          <Button
                                                data-testid="sign-out-button"
                                                className="rounded-md w-full mt-2 flex items-center gap-2 bg-destructive/80 hover:bg-destructive"
                                                onClick={signOutFromSiweSession}
                                                variant="destructive"
                                          >
                                                <LuLogOut className="h-4 w-4" />
                                                Sign Out
                                          </Button>
                                    </div>
                              ) : (
                                    <div className="flex flex-col gap-10 align-center justify-center">
                                          {connectionState === 'connecting' && (
                                                <>
                                                      {/* <ReactLoading type={"spin"} color={"blue"} height={iconSize} width={iconSize} /> */}
                                                      <ClipLoader color={'blue'} loading={loading} size={150} className="mx-auto" aria-label="Loading Spinner" data-testid="loader" />
                                                      <p className="text-md text-center">Connecting to wallet...</p>
                                                </>
                                          )}
                                          {connectionState === 'success' && (
                                                <>
                                                      <LuCircleCheck strokeWidth="1px" color="green" size={iconSize} />
                                                      <p className="text-md text-green-700">Successfully connected!</p>
                                                </>
                                          )}
                                          {connectionState === 'error' && (
                                                <>
                                                      <LuCircleX color="red" strokeWidth="1px" size={iconSize} />
                                                      <div className="flex flex-col gap-0">
                                                            <p className="text-md text-red-700">Error connecting to wallet</p>
                                                            <p className="text-md text-red-700">{message ?? ''}</p>
                                                      </div>
                                                </>
                                          )}
                                    </div>
                              )}
                        </DialogDescription>
                        {/* <DialogCloseTrigger /> */}
                  </DialogContent>
            </Dialog>
      )
}
