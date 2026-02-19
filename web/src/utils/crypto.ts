import { ethers, getAddress, isAddress } from 'ethers'

export function isValidEthereumAddress(address: string): boolean {
      try {
            return isAddress(address)
      } catch (error) {
            console.error('Error validating Ethereum address:', error)
            return false
      }
}

export function getValidChecksumAddress(address: string): string | null {
      try {
            if (!isAddress(address)) {
                  return null
            }

            // Convert to checksum address (properly capitalized)
            return getAddress(address)
      } catch (error) {
            console.error('Error processing Ethereum address:', error)
            return null
      }
}

export const cleanEthAddress = (address?: string) => {
      if (!address) {
            return false
      }
      try {
            ethers.getAddress(address)
            return true
      } catch (e) {
            return false
      }
}

// Helper function to convert string to hex with 0x prefix
export const stringToHex = (str: string): string => {
      const hex = Array.from(str)
            .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
            .join('')
      return `0x${hex}`
}

export async function getCurrentNetwork() {
      if (typeof window.ethereum !== 'undefined') {
            try {
                  const chainId = await (window.ethereum as any).request({
                        method: 'eth_chainId',
                  })
                  return chainId
            } catch (error) {
                  console.error('Error fetching chain ID:', error)
            }
      } else {
            console.error('MetaMask is not installed.')
      }
}

export async function switchNetwork(chainId: string) {
      if (typeof window.ethereum !== 'undefined') {
            try {
                  await (window.ethereum as any).request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId }],
                  })
            } catch (error) {
                  // If the network is not added, request MetaMask to add it
            }
      } else {
            console.error('MetaMask is not installed.')
      }
}
