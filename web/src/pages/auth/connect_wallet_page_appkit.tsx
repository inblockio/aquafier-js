import { createSignal, createEffect, onCleanup, Show } from 'solid-js'
import { appKit } from '../../config/appkit'
import { appStore, appStoreActions } from '../../store';
import { Alert, AlertDescription } from '../../components/ui/alert'
import { toast } from 'sonner'
import { generateAvatar, fetchFiles } from '../../utils/functions'
import { ethers } from 'ethers'

export const ConnectWalletPageAppKit = () => {
  const [isConnected, setIsConnected] = createSignal(false)
  const [address, setAddress] = createSignal<string | null>(null)
  const [status, setStatus] = createSignal('disconnected')
  const [modalOpen, setModalOpen] = createSignal(false)
  const [isConnecting, setIsConnecting] = createSignal(false)
  const [error, setError] = createSignal('')
  const [hasTriggeredSiwe, setHasTriggeredSiwe] = createSignal(false)

  // const store = useStore()
const { setBackEndUrl, setFiles, setMetamaskAddress, setAvatar } = appStoreActions;

  // Subscribe to AppKit state changes
  // createEffect(() => {
  //   const unsubscribe = appKit.subscribeState((state) => {
  //     setIsConnected(state.open === false && !!state.address)
  //     setAddress(state.address || null)
  //     setModalOpen(state.open || false)
      
  //     // Determine status based on state
  //     if (state.open) {
  //       setStatus('connecting')
  //     } else if (state.address) {
  //       setStatus('connected')
  //     } else {
  //       setStatus('disconnected')
  //     }
  //   })

  //   onCleanup(() => unsubscribe())
  // })

  // Subscribe to AppKit state changes
createEffect(() => {
  const unsubscribe = appKit.subscribeState((state) => {
    setModalOpen(state.open || false)
    
    if (state.open) {
      setStatus('connecting')
    }
  })

  onCleanup(() => unsubscribe())
})

createEffect(() => {
  const handleAccountChange = () => {
    const addr = appKit.getAddress()
    setIsConnected(!!addr)
    setAddress(addr || null)
    setStatus(addr ? 'connected' : 'disconnected')
  }
  
  window.addEventListener('w3m-connected', handleAccountChange)
  window.addEventListener('w3m-disconnected', handleAccountChange)
  
  handleAccountChange()
  
  onCleanup(() => {
    window.removeEventListener('w3m-connected', handleAccountChange)
    window.removeEventListener('w3m-disconnected', handleAccountChange)
  })
})


  console.log("Connection status: ", status())

  // Handle wallet connection state changes
  createEffect(() => {
    const connected = isConnected()
    const addr = address()
    
    if (connected && addr) {
      const checksumAddress = ethers.getAddress(addr)
       setMetamaskAddress(checksumAddress)
       setAvatar(generateAvatar(checksumAddress))
    } else if (!connected && !addr) {
       setMetamaskAddress(null)
       setAvatar(undefined)
    }
  })

  // Check if session is null after connection
  createEffect(() => {
    const connected = isConnected()
    const addr = address()
    const session =  appStore.session
    
    if (connected && addr && session == null) {
      console.log("Session is null after connection, signing out to reset state.")
      handleSignOut()
    }
  })

  // Monitor modal state changes
  createEffect(() => {
    if (modalOpen()) {
      setIsConnecting(true)
      setError('')
    } else {
      setIsConnecting(false)
    }
  })

  // Monitor for successful authentication
  createEffect(() => {
    const connected = isConnected()
    const addr = address()
    const triggered = hasTriggeredSiwe()
    
    if (connected && addr && !triggered) {
      setHasTriggeredSiwe(true)
      handleSiweSuccess()
      toast.success('Sign In successful')
    }
  })

  // Reset SIWE trigger when user disconnects
  createEffect(() => {
    if (!isConnected()) {
      setHasTriggeredSiwe(false)
    }
  })

  const handleSignOut = async () => {
    try {
      await appKit.disconnect()
      toast.success('Signed out successfully')
    } catch (err: any) {
      // Check if it's the permission revocation error
      const isPermissionError = err?.message?.includes('revoke permissions') ||
        err?.message?.includes('Internal JSON-RPC error')

      if (isPermissionError) {
        console.warn('Permission revocation failed, but wallet disconnected:', err)
      } else {
        console.error('Sign out error:', err)
        toast.error('Error signing out')
      }
    }
  }

  // Handle SIWE success - files are fetched automatically in siweConfig
  const handleSiweSuccess = async () => {
    const session = appStore.session
    if (session?.address) {
      try {
        const filesApi = await fetchFiles(
          session.address,
          `${appStore.backend_url}/explorer_files`,
          session.nonce
        )
       setFiles({ 
          fileData: filesApi.files, 
          pagination: filesApi.pagination, 
          status: 'loaded' 
        })
      } catch (err) {
        console.error('Failed to fetch files:', err)
      }
    }
  }

  const handleSignAndConnect = () => {
    if (appStore.session) return
    setError('')
    appKit.open()
  }

  // Clear error when modal closes
  createEffect(() => {
    const open = modalOpen()
    const err = error()
    
    if (!open && err) {
      setTimeout(() => setError(''), 2000)
    }
  })

  return (
    <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl shadow-lg border border-gray-200 p-8 w-full max-w-md">
        <div class="text-center mb-8">
          <div class="w-16 h-16 bg-gradient-to-br from-orange-500 to-purple-300 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 mb-2">Welcome to Aquafier</h1>
          <p class="text-gray-600 text-sm">Connect your Web3 wallet to get started</p>
        </div>

        <Show when={error()}>
          <Alert class="mb-6 border-red-200 bg-red-50">
            <AlertDescription class="text-red-700 text-sm">{error()}</AlertDescription>
          </Alert>
        </Show>

        <Show when={status() === 'connecting'}>
          <Alert class="mb-6 border-blue-200 bg-blue-50">
            <AlertDescription class="text-blue-700 text-sm">
              Connecting to wallet...
            </AlertDescription>
          </Alert>
        </Show>

        <button
          onClick={handleSignAndConnect}
          data-testid="sign-in-button-page"
          disabled={isConnecting() || status() === 'connecting'}
          class="w-full bg-black hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          <Show 
            when={isConnecting() || status() === 'connecting'}
            fallback={
              <>
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.483 6.125C3.483 5.504 3.987 5 4.608 5h14.784c.621 0 1.125.504 1.125 1.125v11.75c0 .621-.504 1.125-1.125 1.125H4.608c-.621 0-1.125-.504-1.125-1.125V6.125zM5.233 6.75v10.5h13.534V6.75H5.233z" />
                  <path d="M7.5 9.75h9v1.5h-9v-1.5zm0 3h6v1.5h-6v-1.5z" />
                </svg>
                Sign in with Wallet
              </>
            }
          >
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Connecting...
          </Show>
        </button>

        <div class="mt-6 text-center">
          <p class="text-xs text-gray-500">
            By connecting, you agree to our Terms of Service and Privacy Policy
          </p>
          <p class="text-xs text-gray-400 mt-2">
            Supports 400+ wallets including MetaMask, WalletConnect, and more
          </p>
        </div>
      </div>
    </div>
  )
}