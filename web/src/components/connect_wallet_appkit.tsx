import { useEffect, lazy, Suspense, useState } from 'react'
import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { Button } from './ui/button'
import { LuWallet, LuLogOut } from 'react-icons/lu'
import { formatCryptoAddress, generateAvatar, fetchFiles } from '../utils/functions'
import { useStore } from 'zustand'
import appStore from '../store'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { ethers } from 'ethers'

// Lazy load the WalletAddressProfile component
const WalletAddressProfile = lazy(() => import('@/pages/v2_claims_workflow/WalletAddressProfile'))

export const ConnectWalletAppKit: React.FC<{ dataTestId: string }> = ({ dataTestId }) => {
  const { open } = useAppKit()
  const { address, isConnected, status } = useAppKitAccount()
  
  const { setMetamaskAddress, session, setFiles, setAvatar, backend_url } = useStore(appStore)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [hasHandledSiwe, setHasHandledSiwe] = useState(false)

  // Handle wallet connection state changes
  useEffect(() => {
    if (isConnected && address) {
      const checksumAddress = ethers.getAddress(address)
      setMetamaskAddress(checksumAddress)
      setAvatar(generateAvatar(checksumAddress))
    } else if (!isConnected && !address) {
      setMetamaskAddress(null)
      setAvatar(undefined)
    }
  }, [isConnected, address, setMetamaskAddress, setAvatar])

  // Monitor for SIWE success
  useEffect(() => {
    if (isConnected && address && session?.address && !hasHandledSiwe) {
      setHasHandledSiwe(true)
      handlePostAuthentication()
    }
  }, [isConnected, address, session, hasHandledSiwe])

  // Reset SIWE handler when disconnected
  useEffect(() => {
    if (!isConnected) {
      setHasHandledSiwe(false)
    }
  }, [isConnected])

  // Handle post-authentication tasks
  const handlePostAuthentication = async () => {
    if (session?.address) {
      const files = await fetchFiles(session.address, `${backend_url}/explorer_files`, session.nonce)
      setFiles({
        fileData: files,
        status: 'loaded',
      })
    }
  }

  const handleConnect = () => {
    if (!isConnected) {
      open()
    } else {
      setIsProfileOpen(true)
    }
  }

  const handleSignOut = () => {
    // The sign out is handled by the SIWE config
    // which will clear the session and disconnect the wallet
    open({ view: 'Account' })
  }

  return (
    <>
      <Button
        data-testid={dataTestId}
        size="sm"
        className="rounded-md"
        onClick={handleConnect}
        disabled={status === 'connecting'}
      >
        <LuWallet />
        {status === 'connecting' ? 'Connecting...' : 
         isConnected && session ? formatCryptoAddress(session.address, 3, 3) : 
         'Sign In'}
      </Button>

      {/* Profile Dialog for authenticated users */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent aria-describedby="Account dialog" aria-description="Account dialog" className="sm:max-w-[425px] max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Account</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            {session ? (
              <div className="flex flex-col gap-5 items-center">
                <Suspense fallback={<div>Loading...</div>}>
                  <WalletAddressProfile 
                    walletAddress={session.address} 
                    callBack={() => setIsProfileOpen(false)} 
                    showAvatar={false} 
                  />
                </Suspense>

                <Button
                  data-testid="sign-out-button"
                  className="rounded-md w-full mt-2 flex items-center gap-2 bg-destructive/80 hover:bg-destructive"
                  onClick={handleSignOut}
                  variant="destructive"
                >
                  <LuLogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p>Please sign in to view your account details.</p>
              </div>
            )}
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Export a wrapper component that maintains the same interface as the original
export const ConnectWallet: React.FC<{ dataTestId: string }> = (props) => {
  return <ConnectWalletAppKit {...props} />
}