/**
 * Crypto and Address Utilities
 * Functions for handling Ethereum addresses and cryptographic operations
 */

import {getAddress, isAddress} from 'ethers'

export function formatCryptoAddress(address?: string, start: number = 10, end: number = 4, message?: string): string {
      if (!address) return message ?? 'NO ADDRESS'
      if (address?.length < start + end) {
            return address
      }

      const firstPart = address?.slice(0, start)
      const lastPart = address?.slice(-end)
      return `${firstPart}...${lastPart}`
}

/**
 * Validates if a string is a valid Ethereum address using ethers.js v6
 * @param address The string to check
 * @returns Boolean indicating if the address is valid
 */
export function isValidEthereumAddress(address: string): boolean {
      try {
            return isAddress(address)
      } catch (error) {
            console.error('Error validating Ethereum address:', error)
            return false
      }
}

/**
 * Validates an address and returns the checksummed version if valid
 * @param address The address to check and format
 * @returns The checksummed address if valid, or null if invalid
 */
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
