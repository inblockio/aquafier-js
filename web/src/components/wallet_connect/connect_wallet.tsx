import { lazy, Suspense, useState, useEffect } from 'react'
import { LuCircleCheck, LuCircleX, LuLogOut, LuWallet } from 'react-icons/lu'
import { ClipLoader } from 'react-spinners'
import { formatCryptoAddress, setCookie } from '../../utils/functions'
import { SESSION_COOKIE_NAME } from '../../utils/constants'
import { useStore } from 'zustand'
import appStore from '../../store'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { toast } from 'sonner'
import { useAppKit, useAppKitAccount, useDisconnect } from '@reown/appkit/react'

// Lazy load the WalletAddressProfile component
const WalletAddressProfile = lazy(() => import('@/pages/v2_claims_workflow/WalletAddressProfile'))

export const ConnectWallet: React.FC<{ dataTestId: string }> = ({ dataTestId }) => {
  const { open } = useAppKit()
  const { isConnected } = useAppKitAccount()
  const { disconnect } = useDisconnect()

  const {
    setMetamaskAddress,
    session,
    setFiles,
    setAvatar,
    setSession
  } = useStore(appStore)

  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [connectionState, _setConnectionState] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle')
  const [message, _setMessage] = useState<string | null>(null)

  const iconSize = '120px'

  // Sync AppKit connection state with your app state
  useEffect(() => {
    if (!isConnected && session) {
      // User disconnected from AppKit but session still exists
      // Clean up the session
      handleCleanup()
    }
  }, [isConnected, session])


  const handleCleanup = () => {
    setCookie(SESSION_COOKIE_NAME, '', new Date('1970-01-01T00:00:00Z'))
    setMetamaskAddress(null)
    setAvatar(undefined)
    setSession(null)
    setFiles({
      fileData: [],
      status: 'idle',
    })
  }

  const signAndConnect = async () => {
    if (session) {
      // Already connected, just open the dialog
      setIsOpen(true)
      return
    }

    // Open AppKit modal for connection
    // The actual authentication happens through siweConfig
    open()
  }

  //   const signOutFromSiweSession = async () => {
  //     setLoading(true)
  //     try {
  //       const nonce = getCookie(SESSION_COOKIE_NAME)


  //       if (nonce) {
  //         const url = ensureDomainUrlHasSSL(`${backend_url}/session`)
  //         await axios.delete(url, {
  //           params: { nonce },
  //         })
  //       }

  //       // Clean up local state
  //       handleCleanup()

  //          // Close the dialog immediately
  //   setIsOpen(false)
  //       // Disconnect from AppKit wallet
  //       await disconnect({

  //       })


  //       toast.success('Signed out successfully')
  //     } catch (error: any) {
  //       console.error('Sign out error:', error)
  //       // Clean up even if backend fails
  //       handleCleanup()
  //       toast.success('Signed out successfully')
  //     } finally {
  //       setLoading(false)
  //       setIsOpen(false)
  //     }
  //   }
  const { close } = useAppKit()

  const signOutFromSiweSession = async () => {
    setLoading(true)
    setIsOpen(false)
    // Force close any AppKit modals
    close()

    // Small delay to ensure modal is closed
    await new Promise(resolve => setTimeout(resolve, 100))

    // Find and click the disconnect button
    const disconnectButton = document.querySelector('[data-testid="disconnect-button"]') as HTMLElement

    if (disconnectButton) {
      // Click the button element inside the web component
      const button = disconnectButton.shadowRoot?.querySelector('button')
      if (button) {
        button.click()
      } else {
        // Fallback: click the component itself
        disconnectButton.click()
      }
    }
    try {
      await disconnect() // This calls siweConfig.signOut automatically
      toast.success('Signed out successfully')
    } catch (error: any) {
      console.error('Sign out error:', error)
      toast.error('Error signing out')
    } finally {
      setLoading(false)
    }
  }


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          data-testid={dataTestId}
          size={'sm'}
          className="rounded-md"
          onClick={signAndConnect}
        >
          <LuWallet />
          {session ? formatCryptoAddress(session?.address, 3, 3) : 'Sign In'}
        </Button>
      </DialogTrigger>
      <DialogContent
        aria-describedby="Account dialog"
        aria-description="Account dialog"
        className="sm:max-w-[425px] max-w-[425px]"
      >
        <DialogHeader>
          <DialogTitle>{session ? 'Account' : 'Sign In'}</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          {session ? (
            <div className="flex flex-col gap-5 items-center">
              <Suspense fallback={<div>Loading...</div>}>
                <WalletAddressProfile
                  walletAddress={session?.address}
                  callBack={() => setIsOpen(false)}
                  showAvatar={false}
                />
              </Suspense>

              <Button
                data-testid="sign-out-button"
                className="rounded-md w-full mt-2 flex items-center gap-2 bg-destructive/80 hover:bg-destructive"
                onClick={signOutFromSiweSession}
                disabled={loading}
                variant="destructive"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Signing out...
                  </>
                ) : (
                  <>
                    <LuLogOut className="h-4 w-4" />
                    Sign Out
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-10 align-center justify-center">
              {connectionState === 'connecting' && (
                <>
                  <ClipLoader
                    color={'blue'}
                    loading={loading}
                    size={150}
                    className="mx-auto"
                    aria-label="Loading Spinner"
                    data-testid="loader"
                  />
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
      </DialogContent>
    </Dialog>
  )
}