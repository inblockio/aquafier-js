import { createAppKit } from '@reown/appkit/react'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { mainnet, sepolia, polygon, arbitrum } from '@reown/appkit/networks'
import { siweConfig } from './siweConfig'

// Get projectId from https://cloud.reown.com
export const projectId = '80d7707d71e3502f8635b00e56173cdf'

// Create networks array
export const networks = [
  mainnet,
  sepolia,
  polygon,
  arbitrum
]

// Set up metadata
const metadata = {
  name: 'Aquafier',
  description: 'Aquafier - Decentralized Identity and Document Management',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://inblock.io',
  icons: ["/images/ico.png"],
  // icons: ['https://github.com/inblockio/aquafier-js/blob/pr-438/web/public/images/inblock_logo.png?raw=true']
}

// Create Ethers adapter
const ethersAdapter = new EthersAdapter()

// Initialize AppKit immediately at module level
export const appKit = createAppKit({
  adapters: [ethersAdapter],
  networks: networks as any,
  projectId,
  metadata,
  features: {
    analytics: true,
    email: false,
    socials: false,
    swaps: false,
    onramp: false
  },
  themeMode: 'light',
  themeVariables: {
    '--w3m-accent': '#3b82f6',
    '--w3m-border-radius-master': '8px'
  },
  siweConfig,
  includeWalletIds: [
    // Configure more wallet here: https://docs.reown.com/cloud/wallets/wallet-list
    "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96", // Metamask
    "f323633c1f67055a45aac84e321af6ffe46322da677ffdd32f9bc1e33bafe29c", // Core wallet
    "a797aa35c0fadbfc1a53e7f675162ed5226968b44a19ee3d24385c64d1d3c393", // Phantom
    "1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369", // Rainbow
    "e0c2e199712878ed272e2c170b585baa0ff0eb50b07521ca586ebf7aeeffc598", // Talisman
    "4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0", // Trust Wallet
  ]
})

// Export the ethers adapter for use in other components
export { ethersAdapter }