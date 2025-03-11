import { SiweMessage } from "siwe";


export async function verifySiweMessage(message: string, signature: string) {
    try {
      // Parse the SIWE message
      const siweMessage = new SiweMessage(message);
      
      // Extract the data you need
      const address = siweMessage.address;
      const expirationTime = siweMessage.expirationTime;
      const nonce = siweMessage.nonce;
      const domain = siweMessage.domain;
      const issuedAt = siweMessage.issuedAt;
      
      // You can also verify the signature
      const verified = await siweMessage.verify({
        signature,
        domain: domain,
        nonce: nonce
      });
      
      if (verified.success) {
        // The message is valid and properly signed
        return {
          isValid: true,
          address,
          expirationTime,
          nonce,
          // Other properties you might need
        };
      } else {
        return { isValid: false, error: 'Invalid signature' };
      }
    } catch (error: any) {
      return { isValid: false, error: error.message };
    }
  }