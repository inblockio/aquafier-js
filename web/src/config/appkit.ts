import { createAppKit } from '@reown/appkit/react'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { mainnet, sepolia, polygon, arbitrum } from '@reown/appkit/networks'
import { siweConfig } from './siweConfig'

// Get projectId from https://cloud.reown.com
export const projectId =  '80d7707d71e3502f8635b00e56173cdf'

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
  url: 'https://inblock.io',
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
  siweConfig
})

// Export the ethers adapter for use in other components
export { ethersAdapter }