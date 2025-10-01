/**
 * Network Utilities
 * Functions for interacting with Ethereum network via MetaMask
 */

export async function getCurrentNetwork() {
      if (typeof window.ethereum !== 'undefined') {
            try {
                  const chainId = await window.ethereum.request({
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
                  await window.ethereum.request({
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
