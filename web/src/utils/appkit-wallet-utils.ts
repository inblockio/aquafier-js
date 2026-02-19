import { appKit } from '../config/appkit'
import { ethers } from 'ethers'
import { generateNonce, SiweMessage } from 'siwe'
import { ETH_CHAINID_MAP_NUMBERS } from './constants'
import appStore from '@/store'

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
export async function switchNetworkWalletConnect(chainId: string) {
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

/**
 * ERC-6492 magic suffix (32 bytes) appended to signatures from undeployed smart accounts.
 * See: https://eips.ethereum.org/EIPS/eip-6492
 */
const ERC_6492_MAGIC_SUFFIX = '6492649264926492649264926492649264926492649264926492649264926492'

/**
 * Unwraps an ERC-6492 signature to extract the inner ECDSA signature.
 *
 * Reown's social login creates an embedded smart account wallet that returns
 * ERC-6492 wrapped signatures from `personal_sign`. These are not standard
 * 65-byte ECDSA signatures and will fail with ethers.js Signature.from().
 *
 * The ERC-6492 format is: abi.encode(address, bytes, bytes) + magic_suffix
 * where the third bytes element is the inner signature.
 *
 * Safe smart accounts also adjust the v value for eth_sign by adding 4
 * (v=27 becomes 31, v=28 becomes 32), so we normalize that back.
 *
 * For standard ECDSA signatures (65 bytes), this function returns them as-is.
 */
export function unwrapERC6492Signature(signature: string): string {
  const sigBytes = ethers.getBytes(signature)

  // Standard ECDSA signature - return as-is
  if (sigBytes.length === 65) {
    return signature
  }

  // Check for ERC-6492 magic suffix (last 32 bytes)
  if (sigBytes.length <= 32) {
    return signature
  }

  const suffix = ethers.hexlify(sigBytes.slice(sigBytes.length - 32)).slice(2)
  if (suffix !== ERC_6492_MAGIC_SUFFIX) {
    return signature
  }

  // Strip magic suffix and ABI decode: (address factory, bytes calldata, bytes innerSig)
  const abiData = sigBytes.slice(0, sigBytes.length - 32)
  const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
    ['address', 'bytes', 'bytes'],
    abiData
  )

  const innerSig = ethers.getBytes(decoded[2])

  if (innerSig.length === 65) {
    // Safe wallets adjust v for eth_sign: v += 4 (so 27->31, 28->32)
    // Normalize back to standard v values for ethers.js compatibility
    const v = innerSig[64]
    if (v >= 31 && v <= 32) {
      const normalized = new Uint8Array(innerSig)
      normalized[64] = v - 4
      return ethers.hexlify(normalized)
    }
    return ethers.hexlify(innerSig)
  }

  // Inner signature is not standard 65-byte ECDSA (e.g., multi-sig)
  // Return it as-is and let the caller handle the error
  return ethers.hexlify(innerSig)
}

/**
 * Signs a message using the AppKit provider directly via personal_sign.
 *
 * This bypasses ethers.BrowserProvider.getSigner() which internally calls
 * eth_requestAccounts — a method blocked by W3mFrameProvider (social login wallets).
 *
 * The message is hex-encoded as required by W3mFrameProvider.
 * ERC-6492 signatures from smart account wallets are automatically unwrapped.
 *
 * Returns the unwrapped ECDSA signature and the recovered signer address.
 * For smart account wallets, the signer address is the internal EOA (not the
 * smart account address), which is what the SDK's verifySignature expects.
 */
export async function signMessageWithAppKit(
  message: string,
  accountAddress: string
): Promise<{ signature: string; signerAddress: string }> {
  const provider = await getAppKitProvider()
  if (!provider) throw new Error('No wallet provider available')

  // Resolve the address the provider actually manages via eth_accounts.
  // The passed accountAddress (from session) may be undefined, stale, or in
  // a format the provider doesn't recognize (e.g., W3mFrameProvider for
  // social login wallets requires the exact managed address).
  let signingAddress = accountAddress
  try {
    const accounts: string[] = await provider.request({ method: 'eth_accounts' })
    if (accounts && accounts.length > 0) {
      signingAddress = accounts[0]
    }
  } catch {
    // Fall back to the passed address if eth_accounts fails
  }

  if (!signingAddress) {
    throw new Error('No wallet address available for signing')
  }

  // Hex-encode the message as required by W3mFrameProvider
  const messageHex = ethers.hexlify(ethers.toUtf8Bytes(message))

  const rawSignature: string = await provider.request({
    method: 'personal_sign',
    params: [messageHex, signingAddress],
  })

  // Unwrap ERC-6492 signature from smart account wallets (e.g., Reown social login)
  const signature = unwrapERC6492Signature(rawSignature)

  // Recover the actual ECDSA signer address from the signature.
  // For smart account wallets, accountAddress is the smart account address
  // but the ECDSA signature is from the internal EOA signer.
  const signerAddress = ethers.verifyMessage(message, signature)

  return { signature, signerAddress }
}

/**
 * Normalizes a SIWE message to a single line.
 */
export const normalizeSiweMessage = (message: string): string => {
  return message.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Manually constructs a SIWE-like message to bypass library validation for custom formats.
 */
// export const createSiweMessage = (address: string, statement: string, args?: any): string => {
//   const domain = args?.domain || window.location.host
//   const origin = args?.uri || window.location.origin
//   const nonce = args?.nonce || generateNonce()

//   let chainId = args?.chainId
//   if (typeof chainId === 'string' && chainId.startsWith('0x')) {
//     chainId = parseInt(chainId, 16)
//   }
//   if (!chainId || isNaN(Number(chainId))) {
//     const network = appStore.getState().user_profile?.witness_network || "mainnet"
//     chainId = ETH_CHAINID_MAP_NUMBERS[network] || 1
//   }

//   const expiry = args?.expirationTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
//   const issuedAt = args?.issuedAt || new Date().toISOString()

//   // Build standard multi-line message first
//   const header = `${domain} wants you to sign in with your Ethereum account:`
//   const section1 = `${address}`
//   const section2 = `${statement}`
//   const section3 = [
//     `URI: ${origin}`,
//     `Version: 1`,
//     `Chain ID: ${chainId}`,
//     `Nonce: ${nonce}`,
//     `Issued At: ${issuedAt}`
//   ].join('\n')

//   const fullMessage = `${header}\n${section1}\n\n${section2}\n\n${section3}`

//   console.log("Created Manual SIWE Message:\n", fullMessage)
//   return fullMessage
// }

export const createSiweMessage = (address: string, statement: string): string => {
  const domain = window.location.host
  const origin = window.location.origin
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const network = appStore.getState().user_profile?.witness_network ? appStore.getState().user_profile?.witness_network : "mainnet"
  const chainId = ETH_CHAINID_MAP_NUMBERS[network]
  console.log("chainId", chainId, network)

  const message = new SiweMessage({
    domain,
    address,
    statement,
    uri: origin,
    version: '1',
    chainId,
    nonce: generateNonce(),
    expirationTime: expiry,
    issuedAt: new Date(Date.now()).toISOString(),
  })

  return message.prepareMessage()
}