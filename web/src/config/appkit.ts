import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, sepolia, polygon, arbitrum } from '@reown/appkit/networks'
import type { AppKitNetwork } from '@reown/appkit/networks'
import { siweConfig } from './siweConfig'
import { http } from 'viem'

// Get projectId from environment or use default
const HARDCODED_ID = '80d7707d71e3502f8635b00e56173cdf'
export const projectId = import.meta.env.VITE_PROJECT_ID || HARDCODED_ID

if (!projectId || projectId.trim() === '') {
  console.error('CRITICAL: AppKit projectId is empty or undefined!')
  throw new Error('Project ID is not defined')
}

// Add to window for easy debugging in console
if (typeof window !== 'undefined') {
  (window as any).APPKIT_PROJECT_ID = projectId
}

// Get Alchemy API key from environment (optional)
const alchemyKey = import.meta.env.VITE_ALCHEMY_API_KEY

// Debug: Log projectId to verify it's defined
console.log('=== AppKit Config Module Loading ===')
console.log('AppKit Config - projectId:', projectId)
console.log('Creating WagmiAdapter...')

// Create networks array - must be typed as non-empty tuple
// export const networks = [
//   mainnet,
//   sepolia,
//   polygon,
//   arbitrum
// ] as [AppKitNetwork, ...AppKitNetwork[]]

// // Create Wagmi adapter with explicit configuration
// const wagmiAdapter = new WagmiAdapter({
//   projectId,
//   networks,
// })

// 3. Set the networks
export const chains: [AppKitNetwork, ...AppKitNetwork[]] = [mainnet, arbitrum];

// 4. Create Wagmi Adapter with custom transports
const wagmiAdapter = new WagmiAdapter({
  networks: chains,
  projectId,
  ssr: true,
  transports: {
    // Configure custom RPC transports to avoid CORS issues with WalletConnect's default RPC
    // Uses Alchemy if key is available, otherwise falls back to publicnode
    [mainnet.id]: http(
      alchemyKey
        ? `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`
        : 'https://ethereum-rpc.publicnode.com'
    ),
    [arbitrum.id]: http(
      alchemyKey
        ? `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`
        : 'https://arbitrum-one-rpc.publicnode.com'
    ),
  },
});


// Log the wagmiConfig to verify it has the projectId
console.log('WagmiAdapter created')
console.log('WagmiAdapter projectId:', projectId)
console.log('WagmiConfig:', wagmiAdapter.wagmiConfig)

// Metadata configuration
export const metadata = {
  name: 'Aquafier',
  description: 'Aquafier - Decentralized Identity and Document Management',
  // url: "https://reown.com", // 'http://localhost:5173',
  url: "http://localhost:5173",
  icons: ['https://avatars.githubusercontent.com/u/179229932']
}

// Create AppKit instance at module level
console.log('Creating AppKit with projectId:', projectId)
// export const appKit = createAppKit({
//   adapters: [wagmiAdapter],
//   projectId,
//   networks,
//   metadata,
//   features: {
//     analytics: false,
//     email: true,
//     socials: ['google', 'facebook', 'x', 'discord', 'farcaster'],
//     emailShowWallets: true
//   },
//   themeMode: 'light' as const,
//   themeVariables: {
//     '--w3m-accent': '#3b82f6',
//     '--w3m-border-radius-master': '8px'
//   },
//   siweConfig
// })
export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks: chains,
  projectId,
  siweConfig,
  metadata,
  features: {
    email: true,
    socials: [
      "google",
      "x",
      "github",
      "discord",
      "apple",
      "facebook",
      "farcaster",
    ],
    emailShowWallets: true,
  },
});

console.log('AppKit created successfully')
console.log('=== AppKit Config Module Loaded ===')

// Export the wagmi adapter and config for use in other components
export { wagmiAdapter, siweConfig }
export const wagmiConfig = wagmiAdapter.wagmiConfig