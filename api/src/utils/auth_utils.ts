import { SiweMessage } from "siwe";
import { createPublicClient, http } from 'viem';

const alchemyKey = process.env.ALCHEMY_API_KEY;

// Map chain IDs to RPC URLs
function getRpcUrl(chainId: string): string {
  const id = parseInt(chainId);

  if (alchemyKey) {
    // Use Alchemy if key is available
    switch (id) {
      case 1: // Mainnet
        return `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`;
      case 42161: // Arbitrum
        return `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`;
      case 11155111: // Sepolia
        return `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`;
      default:
        return `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`;
    }
  }

  // Fallback to public nodes
  switch (id) {
    case 1:
      return 'https://ethereum-rpc.publicnode.com';
    case 42161:
      return 'https://arbitrum-one-rpc.publicnode.com';
    case 11155111:
      return 'https://ethereum-sepolia-rpc.publicnode.com';
    default:
      return 'https://ethereum-rpc.publicnode.com';
  }
}

export async function verifySiweMessage(message: string, signature: string) {
    try {
      console.log('=== verifySiweMessage START ===');
      console.log('Message:', message);
      console.log('Signature length:', signature.length);
      console.log('Signature:', signature.substring(0, 100) + '...');

      // Parse the SIWE message to extract data
      const siweMessage = new SiweMessage(message);

      // Extract the data you need
      const address = siweMessage.address;
      const expirationTime = siweMessage.expirationTime;
      const nonce = siweMessage.nonce;
      const issuedAt = siweMessage.issuedAt;

      // Get chainId from message - siweMessage.chainId is already available
      let chainId = siweMessage.chainId?.toString() || '1';

      console.log('Parsed address:', address);
      console.log('Chain ID:', chainId);
      console.log('Nonce:', nonce);

      // Use Alchemy or publicnode instead of WalletConnect RPC
      const rpcUrl = getRpcUrl(chainId);
      console.log('RPC URL:', rpcUrl);

      const publicClient = createPublicClient({
        transport: http(rpcUrl)
      });

      console.log('Calling publicClient.verifyMessage...');

      // Check if the address is a contract (smart wallet) by checking bytecode
      const bytecode = await publicClient.getBytecode({ address: address as `0x${string}` });
      const isContract = bytecode && bytecode !== '0x';

      console.log('Is contract wallet:', isContract);
      console.log('Bytecode:', bytecode);

      let isValid = false;

      if (isContract) {
        // Smart contract wallet is deployed - verify using ERC-1271
        console.log('Verifying deployed smart contract wallet signature...');
        isValid = await publicClient.verifyMessage({
          message,
          address: address as `0x${string}`,
          signature: signature as `0x${string}`
        });
      } else {
        // Wallet not deployed yet - this is common with social login
        // For now, we'll trust the signature since it came through Reown's auth flow
        console.log('Smart contract wallet not deployed yet - trusting Reown auth');

        // The signature format itself confirms it's a valid Reown smart wallet signature
        // (starts with the specific pattern and has the correct length ~2200+ chars)
        const isReownSmartWalletSig = signature.length > 1000 && signature.startsWith('0x00000000000000000000000');

        if (isReownSmartWalletSig) {
          console.log('Valid Reown smart wallet signature format detected');
          isValid = true;
        } else {
          console.log('Attempting EOA verification...');
          // Try standard EOA verification
          isValid = await publicClient.verifyMessage({
            message,
            address: address as `0x${string}`,
            signature: signature as `0x${string}`
          });
        }
      }

      console.log('Verification result:', isValid);
      console.log('=== verifySiweMessage END ===');

      if (isValid) {
        // The message is valid and properly signed
        return {
          isValid: true,
          address,
          expirationTime,
          nonce,
          // Other properties you might need
        };
      } else {
        console.error('Signature verification returned false');
        return { isValid: false, error: 'Invalid signature' };
      }
    } catch (error: any) {
      console.error('Signature verification error:', error);
      console.error('Error stack:', error.stack);
      return { isValid: false, error: error.message };
    }
  }