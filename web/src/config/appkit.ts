import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, sepolia, polygon, arbitrum } from '@reown/appkit/networks'
import type { AppKitNetwork } from '@reown/appkit/networks'
import { siweConfig } from './siweConfig'

// Get projectId from environment or use default
export const projectId =  "b56e18d47c72ab683b10814fe9495694" ;// import.meta.env.VITE_PROJECT_ID || '80d7707d71e3502f8635b00e56173cdf'

if (!projectId) {
  throw new Error('Project ID is not defined')
}

// Debug: Log projectId to verify it's defined
console.log('=== AppKit Config Module Loading ===')
console.log('AppKit Config - projectId:', projectId)
console.log('Creating WagmiAdapter...')

// Create networks array - must be typed as non-empty tuple
export const networks = [
  mainnet,
  sepolia,
  polygon,
  arbitrum
] as [AppKitNetwork, ...AppKitNetwork[]]

// Create Wagmi adapter with explicit configuration
const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks,
})

// Log the wagmiConfig to verify it has the projectId
console.log('WagmiAdapter created')
console.log('WagmiAdapter projectId:', projectId)
console.log('WagmiConfig:', wagmiAdapter.wagmiConfig)

// Metadata configuration
export const metadata = {
  name: 'Aquafier',
  description: 'Aquafier - Decentralized Identity and Document Management',
  url: 'http://localhost:5173',
  icons: ['https://avatars.githubusercontent.com/u/179229932']
}

// Create AppKit instance at module level
console.log('Creating AppKit with projectId:', projectId)
export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks,
  metadata,
  features: {
    analytics: false,
    email: true,
    socials: ['google', 'facebook', 'x', 'discord', 'farcaster'],
    emailShowWallets: true
  },
  themeMode: 'light' as const,
  themeVariables: {
    '--w3m-accent': '#3b82f6',
    '--w3m-border-radius-master': '8px'
  },
  siweConfig
})

console.log('AppKit created successfully')
console.log('=== AppKit Config Module Loaded ===')

// Export the wagmi adapter and config for use in other components
export { wagmiAdapter, siweConfig }
export const wagmiConfig = wagmiAdapter.wagmiConfig