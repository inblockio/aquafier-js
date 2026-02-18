import { useEffect, useState } from 'react'
import { useAppKit, useAppKitAccount, useAppKitState } from '@reown/appkit/react'
import { useStore } from 'zustand'
import appStore from '../../store'
import { Alert, AlertDescription } from '../ui/alert'
import { toast } from 'sonner'
import { generateAvatar, fetchFiles } from '../../utils/functions'
import { ethers } from 'ethers'

export const ConnectWalletPageAppKit = () => {
  const { open } = useAppKit()
  const { address, isConnected, status } = useAppKitAccount()
  const { open: modalOpen } = useAppKitState()

  const {
    setMetamaskAddress,
    session,
    setFiles,
    setAvatar,
    backend_url,
  } = useStore(appStore)

  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState('')
  const [hasTriggeredSiwe, setHasTriggeredSiwe] = useState(false)
  // const { disconnect } = useDisconnect()

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


  // Removed auto-signout logic that was causing premature disconnection
  // Social login needs time to establish session after wallet connection


  // Monitor modal state changes
  useEffect(() => {
    if (modalOpen) {
      setIsConnecting(true)
      setError('')
    } else {
      setIsConnecting(false)
    }
  }, [modalOpen])

  // Monitor for successful authentication - wait for SIWE session (nonce) to be set
  useEffect(() => {
    if (isConnected && address && session?.nonce && !hasTriggeredSiwe) {
      setHasTriggeredSiwe(true)
      handleSiweSuccess()
      toast.success('Sign In successful')
    }
  }, [isConnected, address, session, hasTriggeredSiwe])

  // Reset SIWE trigger when user disconnects
  useEffect(() => {
    if (!isConnected) {
      setHasTriggeredSiwe(false)
    }
  }, [isConnected])

  // const handleSignOut = useCallback(async () => {
  //   try {
  //     await disconnect()
  //     toast.success('Signed out successfully.')

  //   } catch (error: any) {
  //     // Check if it's the permission revocation error
  //     const isPermissionError = error?.message?.includes('revoke permissions') ||
  //       error?.message?.includes('Internal JSON-RPC error')

  //     if (isPermissionError) {
  //       // Still consider it a success since wallet disconnects anyway
  //       console.warn('Permission revocation failed, but wallet disconnected:', error)
  //     } else {
  //       // Only show error for other types of failures
  //       console.error('Sign out error:', error)
  //       toast.error('Error signing out')
  //     }
  //   }
  // }, [disconnect])  // Handle SIWE success - files are fetched automatically in siweConfig

  const handleSiweSuccess = async () => {
    if (session?.address) {
      try {

        const filesApi = await fetchFiles(session!.address, `${backend_url}/explorer_files`, session!.nonce)
        setFiles({ fileData: filesApi.files, pagination: filesApi.pagination, status: 'loaded' })

      } catch (error) {
        console.error('Failed to fetch files:', error)
      }
    }
  }

  const handleSignAndConnect = () => {
    if (session) return
    setError('')
    open()
  }

  // Clear error when modal closes
  useEffect(() => {
    if (!modalOpen && error) {
      setTimeout(() => setError(''), 2000)
    }
  }, [modalOpen, error])

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
            <AlertDescription className="text-red-700 text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {status === 'connecting' && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-700 text-sm">
              Connecting to wallet...
            </AlertDescription>
          </Alert>
        )}

        <button
          onClick={handleSignAndConnect}
          data-testid="sign-in-button-page"
          disabled={isConnecting || status === 'connecting'}
          className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          {(isConnecting || status === 'connecting') ? (
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
          <p className="text-xs text-gray-400 mt-2">
            Supports 400+ wallets including MetaMask, WalletConnect, and more
          </p>
        </div>
      </div>
    </div>
  )
}

// Export with the same name to maintain compatibility
// export const ConnectWalletPage = ConnectWalletPageAppKit