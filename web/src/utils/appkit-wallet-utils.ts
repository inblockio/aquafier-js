import { appKit } from '../config/appkit'
import { ethers } from 'ethers'

// Get the current provider from AppKit
export async function getAppKitProvider() {
  const walletProvider = appKit.getWalletProvider()
  if (!walletProvider || typeof (walletProvider as any).request !== 'function') {
    return null
  }
  return walletProvider as any
}

// Get the current signer from AppKit
export async function getAppKitSigner() {
  const provider = await getAppKitProvider()
  if (!provider) throw new Error('No provider available')
  
  const ethersProvider = new ethers.BrowserProvider(provider)
  return await ethersProvider.getSigner()
}

// Get current network/chain ID
export async function getCurrentNetwork() {
  try {
    const provider = await getAppKitProvider()
    if (!provider) {
      console.error('AppKit provider not available')
      return null
    }
    
    const chainId = await provider.request({
      method: 'eth_chainId',
    })
    return chainId
  } catch (error) {
    console.error('Error fetching chain ID:', error)
    return null
  }
}

// Switch network using AppKit
export async function switchNetwork(chainId: string) {
  try {
    const provider = await getAppKitProvider()
    if (!provider) {
      console.error('AppKit provider not available')
      return false
    }
    
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId }],
    })
    return true
  } catch (error: any) {
    // If the network is not added, it might need to be added first
    if (error.code === 4902) {
      console.error('Network not found. Please add it to your wallet first.')
    } else {
      console.error('Error switching network:', error)
    }
    return false
  }
}

// Check if wallet is connected
export async function isWalletConnected() {
  try {
    const provider = await getAppKitProvider()
    if (!provider) return false
    
    const accounts = await provider.request({ method: 'eth_accounts' })
    return accounts && accounts.length > 0
  } catch (error) {
    console.error('Error checking wallet connection:', error)
    return false
  }
}

// Get connected wallet address
export async function getConnectedAddress() {
  try {
    const signer = await getAppKitSigner()
    return await signer.getAddress()
  } catch (error) {
    console.error('Error getting wallet address:', error)
    return null
  }
}