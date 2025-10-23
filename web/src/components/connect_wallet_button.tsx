import { useEffect, lazy, Suspense, useState } from 'react'
import { useAppKit, useAppKitAccount, useDisconnect } from '@reown/appkit/react'
import { Button } from './ui/button'
import { LuWallet, LuLogOut, LuLoaderCircle } from 'react-icons/lu'
import { formatCryptoAddress, generateAvatar, fetchFiles } from '../utils/functions'
import { useStore } from 'zustand'
import appStore from '../store'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { ethers } from 'ethers'
import { toast } from 'sonner'

// Lazy load the WalletAddressProfile component
const WalletAddressProfile = lazy(() => import('@/pages/v2_claims_workflow/WalletAddressProfile'))

export const ConnectWalletAppKit: React.FC<{ dataTestId: string }> = ({ dataTestId }) => {
  const { open } = useAppKit()
  const { address, isConnected, status } = useAppKitAccount()
  const { disconnect } = useDisconnect()
  
  const { setMetamaskAddress, session, setFiles, setAvatar, backend_url, webConfig } = useStore(appStore)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [hasHandledSiwe, setHasHandledSiwe] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

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

    if(isConnected== false && session != null  && webConfig.AUTH_PROVIDER=="wallet_connect"){
      handleSignOut()
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
     
                              const filesApi = await fetchFiles(session!.address, `${backend_url}/explorer_files`, session!.nonce)
                              setFiles({ fileData: filesApi.files, pagination : filesApi.pagination, status: 'loaded' })

    }
  }

  const handleConnect = () => {

    if ( webConfig.AUTH_PROVIDER=="wallet_connect"){

      if (!isConnected) {
        open()
      } else {
        setIsProfileOpen(true)
      }
    }else{
      if(!session){
        handleSignOut()
      } else{
        setIsProfileOpen(true)
      } 
    }
  }

  const handleSignOut = async () => {
  setIsSigningOut(true)
  toast.info('Signing out...')
  
  try {
    await disconnect()
    toast.success('Signed out successfully')
    setIsProfileOpen(false)
  } catch (error: any) {
    // Check if it's the permission revocation error
    const isPermissionError = error?.message?.includes('revoke permissions') || 
                              error?.message?.includes('Internal JSON-RPC error')
    
    if (isPermissionError) {
      // Still consider it a success since wallet disconnects anyway
      console.warn('Permission revocation failed, but wallet disconnected:', error)
      toast.success('Signed out successfully')
      setIsProfileOpen(false)
    } else {
      // Only show error for other types of failures
      console.error('Sign out error:', error)
      toast.error('Error signing out')
    }
  } finally {
    setIsSigningOut(false)
  }
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
        {
          webConfig.AUTH_PROVIDER=="wallet_connect" ? <>
            <LuWallet />
        {status === 'connecting' ? 'Connecting...' : 
         isConnected && session ? formatCryptoAddress(session.address, 3, 3) : 
         'Sign In '}
          </> : <>
          
           <LuWallet />
                              {session ? formatCryptoAddress(session?.address, 3, 3) : 'Sign In'}
          </>
        }
      
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
                  disabled={isSigningOut}
                >
                  {isSigningOut ? (
                    <>
                      <LuLoaderCircle className="h-4 w-4 animate-spin" />
                      Signing Out...
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

// import { useEffect, lazy, Suspense, useState } from 'react'
// import { useAppKit, useAppKitAccount, useDisconnect } from '@reown/appkit/react'
// import { Button } from './ui/button'
// import { LuWallet, LuLogOut } from 'react-icons/lu'
// import { formatCryptoAddress, generateAvatar, fetchFiles } from '../utils/functions'
// import { useStore } from 'zustand'
// import appStore from '../store'
// import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
// import { ethers } from 'ethers'
// import { toast } from 'sonner'

// // Lazy load the WalletAddressProfile component
// const WalletAddressProfile = lazy(() => import('@/pages/v2_claims_workflow/WalletAddressProfile'))

// export const ConnectWalletAppKit: React.FC<{ dataTestId: string }> = ({ dataTestId }) => {
//   const { open } = useAppKit()
//   const { address, isConnected, status } = useAppKitAccount()
  
//   const { setMetamaskAddress, session, setFiles, setAvatar, backend_url } = useStore(appStore)
//   const [isProfileOpen, setIsProfileOpen] = useState(false)
//   const [hasHandledSiwe, setHasHandledSiwe] = useState(false)

//   // Handle wallet connection state changes
//   useEffect(() => {
//     if (isConnected && address) {
//       const checksumAddress = ethers.getAddress(address)
//       setMetamaskAddress(checksumAddress)
//       setAvatar(generateAvatar(checksumAddress))
//     } else if (!isConnected && !address) {
//       setMetamaskAddress(null)
//       setAvatar(undefined)
//     }
//   }, [isConnected, address, setMetamaskAddress, setAvatar])

//   // Monitor for SIWE success
//   useEffect(() => {
//     if (isConnected && address && session?.address && !hasHandledSiwe) {
//       setHasHandledSiwe(true)
//       handlePostAuthentication()
//     }
//   }, [isConnected, address, session, hasHandledSiwe])

//   // Reset SIWE handler when disconnected
//   useEffect(() => {
//     if (!isConnected) {
//       setHasHandledSiwe(false)
//     }
//   }, [isConnected])

//   // Handle post-authentication tasks
//   const handlePostAuthentication = async () => {
//     if (session?.address) {
//       const files = await fetchFiles(session.address, `${backend_url}/explorer_files`, session.nonce)
//       setFiles({
//         fileData: files,
//         status: 'loaded',
//       })
//     }
//   }

//   const handleConnect = () => {
//     if (!isConnected) {
//       open()
//     } else {
//       setIsProfileOpen(true)
//     }
//   }

//   const handleSignOut = async () => {
//     // The sign out is handled by the SIWE config
//     // which will clear the session and disconnect the wallet
//     // open({ view: 'Account' })
//     try {
//         const { disconnect } = useDisconnect()
//     await disconnect() // This calls siweConfig.signOut automatically
//     toast.success('Signed out successfully')
//   } catch (error: any) {
//     console.error('Sign out error:', error)
//     toast.error('Error signing out')
//   } 
//   }

//   return (
//     <>
//       <Button
//         data-testid={dataTestId}
//         size="sm"
//         className="rounded-md"
//         onClick={handleConnect}
//         disabled={status === 'connecting'}
//       >
//         <LuWallet />
//         {status === 'connecting' ? 'Connecting...' : 
//          isConnected && session ? formatCryptoAddress(session.address, 3, 3) : 
//          'Sign In'}
//       </Button>

//       {/* Profile Dialog for authenticated users */}
//       <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
//         <DialogContent aria-describedby="Account dialog" aria-description="Account dialog" className="sm:max-w-[425px] max-w-[425px]">
//           <DialogHeader>
//             <DialogTitle>Account</DialogTitle>
//           </DialogHeader>
//           <DialogDescription>
//             {session ? (
//               <div className="flex flex-col gap-5 items-center">
//                 <Suspense fallback={<div>Loading...</div>}>
//                   <WalletAddressProfile 
//                     walletAddress={session.address} 
//                     callBack={() => setIsProfileOpen(false)} 
//                     showAvatar={false} 
//                   />
//                 </Suspense>

//                 <Button
//                   data-testid="sign-out-button"
//                   className="rounded-md w-full mt-2 flex items-center gap-2 bg-destructive/80 hover:bg-destructive"
//                   onClick={handleSignOut}
//                   variant="destructive"
//                 >
//                   <LuLogOut className="h-4 w-4" />
//                   Sign Out.
//                 </Button>
//               </div>
//             ) : (
//               <div className="text-center py-4">
//                 <p>Please sign in to view your account details.</p>
//               </div>
//             )}
//           </DialogDescription>
//         </DialogContent>
//       </Dialog>
//     </>
//   )
// }

// // Export a wrapper component that maintains the same interface as the original
// export const ConnectWallet: React.FC<{ dataTestId: string }> = (props) => {
//   return <ConnectWalletAppKit {...props} />
// }