import { DNSProof } from "@/types/types"
import { CredentialsData } from "aqua-js-sdk"





export function dummyCredential(): CredentialsData {
      return {
            mnemonic: '',
            nostr_sk: '',
            did_key: '',
            alchemy_key: '',
            witness_eth_network: 'sepolia',
            witness_method: 'metamask',
      }
}




export const getHighestCount = (strArray: Array<string>): number => {
      let highestCounter = 0

      // Loop through each string in the array
      for (const str of strArray) {
            // Use regex to extract the number after the underscore
            const match = str.match(/_(\d+)$/)

            if (match) {
                  // Convert the extracted number to integer
                  const counter = parseInt(match[1], 10)

                  // Update highest counter if this one is greater
                  if (!isNaN(counter) && counter > highestCounter) {
                        highestCounter = counter
                  }
            }
      }
      return highestCounter
}



export function formatCryptoAddress(address?: string, start: number = 10, end: number = 4, message?: string): string {
      if (!address) return message ?? 'NO ADDRESS'
      if (address?.length < start + end) {
            // throw new Error(`Address must be at least ${start + end} characters long.`);
            return address
      }

      const firstPart = address?.slice(0, start)
      const lastPart = address?.slice(-end)
      return `${firstPart}...${lastPart}`
}




/**
 * Converts a Blob (typically from an HTTP response) to a base64 string
 *
 * @param blob - The Blob object returned from fetch or XMLHttpRequest
 * @returns Promise that resolves with the base64 string (without the data URL prefix)
 */
export function blobToBase64(blob: Blob): Promise<string> {
      return new Promise((resolve, reject) => {
            const reader = new FileReader()

            reader.onload = () => {
                  if (typeof reader.result === 'string') {
                        // Extract just the base64 part by removing the data URL prefix
                        // (e.g., "data:application/octet-stream;base64,")
                        const base64String = reader.result.split(',')[1]
                        resolve(base64String)
                  } else {
                        reject(new Error('FileReader did not return a string'))
                  }
            }

            reader.onerror = error => {
                  reject(new Error(`FileReader error: ${error}`))
            }

            // Read the blob as a data URL which gives us a base64 representation
            reader.readAsDataURL(blob)
      })
}

export const isArrayBufferText = (buffer: ArrayBuffer): boolean => {
      // Convert the ArrayBuffer to a Uint8Array
      const uint8Array = new Uint8Array(buffer)

      // If buffer is too small, it's likely not a valid file
      if (uint8Array.length < 4) {
            // Default to text for very small buffers
            return true
      }

      // Check for common binary file signatures (magic numbers)

      // Check for PDF signature: %PDF-
      if (uint8Array.length >= 5 && uint8Array[0] === 37 && uint8Array[1] === 80 && uint8Array[2] === 68 && uint8Array[3] === 70 && uint8Array[4] === 45) {
            return false
      }

      // Check for JPEG signature: FF D8 FF
      if (uint8Array.length >= 3 && uint8Array[0] === 0xff && uint8Array[1] === 0xd8 && uint8Array[2] === 0xff) {
            return false
      }

      // Check for PNG signature: 89 50 4E 47 0D 0A 1A 0A
      if (
            uint8Array.length >= 8 &&
            uint8Array[0] === 0x89 &&
            uint8Array[1] === 0x50 &&
            uint8Array[2] === 0x4e &&
            uint8Array[3] === 0x47 &&
            uint8Array[4] === 0x0d &&
            uint8Array[5] === 0x0a &&
            uint8Array[6] === 0x1a &&
            uint8Array[7] === 0x0a
      ) {
            return false
      }

      // Check for GIF signatures: GIF87a or GIF89a
      if (
            uint8Array.length >= 6 &&
            uint8Array[0] === 0x47 &&
            uint8Array[1] === 0x49 &&
            uint8Array[2] === 0x46 &&
            uint8Array[3] === 0x38 &&
            (uint8Array[4] === 0x37 || uint8Array[4] === 0x39) &&
            uint8Array[5] === 0x61
      ) {
            return false
      }

      // Check for BMP signature: BM
      if (uint8Array.length >= 2 && uint8Array[0] === 0x42 && uint8Array[1] === 0x4d) {
            return false
      }

      // Check for WEBP signature: RIFF....WEBP
      if (
            uint8Array.length >= 12 &&
            uint8Array[0] === 0x52 &&
            uint8Array[1] === 0x49 &&
            uint8Array[2] === 0x46 &&
            uint8Array[3] === 0x46 &&
            uint8Array[8] === 0x57 &&
            uint8Array[9] === 0x45 &&
            uint8Array[10] === 0x42 &&
            uint8Array[11] === 0x50
      ) {
            return false
      }

      // Check for SVG signature: typically starts with <?xml or <svg
      // SVG is actually text-based (XML), but we might want to treat it as a binary format
      // depending on your application's needs
      if (uint8Array.length >= 5) {
            // Check for <?xml
            const possibleXml = uint8Array[0] === 0x3c && uint8Array[1] === 0x3f && uint8Array[2] === 0x78 && uint8Array[3] === 0x6d && uint8Array[4] === 0x6c

            // Check for <svg
            const possibleSvg = uint8Array.length >= 4 && uint8Array[0] === 0x3c && uint8Array[1] === 0x73 && uint8Array[2] === 0x76 && uint8Array[3] === 0x67

            // If SVG should be treated as binary, uncomment:
            if (possibleXml || possibleSvg) return false
      }

      // Check for TIFF signature: 49 49 2A 00 (little endian) or 4D 4D 00 2A (big endian)
      if (
            uint8Array.length >= 4 &&
            ((uint8Array[0] === 0x49 && uint8Array[1] === 0x49 && uint8Array[2] === 0x2a && uint8Array[3] === 0x00) ||
                  (uint8Array[0] === 0x4d && uint8Array[1] === 0x4d && uint8Array[2] === 0x00 && uint8Array[3] === 0x2a))
      ) {
            return false
      }

      // Check if the byte sequence looks like text
      // 1. Check for null bytes (usually not in text files)
      // 2. Check for high ratio of printable ASCII characters
      // 3. Check for high ratio of control characters

      // Check first 1000 bytes or the whole buffer, whichever is smaller
      const bytesToCheck = Math.min(1000, uint8Array.length)
      let textCharCount = 0
      let nullByteCount = 0
      let controlCharCount = 0

      for (let i = 0; i < bytesToCheck; i++) {
            const byte = uint8Array[i]

            // Count null bytes
            if (byte === 0) {
                  nullByteCount++
            }

            // Count control characters (0-8, 14-31, 127)
            // Exclude common whitespace (9-13: tab, LF, VT, FF, CR)
            if ((byte >= 0 && byte <= 8) || (byte >= 14 && byte <= 31) || byte === 127) {
                  controlCharCount++
            }

            // Count printable ASCII characters (32-126) plus common whitespace (9-13)
            if ((byte >= 32 && byte <= 126) || (byte >= 9 && byte <= 13)) {
                  textCharCount++
            }
      }

      // If more than 3% are null bytes, probably not text
      if (nullByteCount > bytesToCheck * 0.03) {
            return false
      }

      // If more than 10% are control characters (excluding whitespace), probably not text
      if (controlCharCount > bytesToCheck * 0.1) {
            return false
      }

      // If more than 85% are printable characters, probably text
      return textCharCount > bytesToCheck * 0.85
}




export function formatTxtRecord(proof: DNSProof): string {
      return `wallet=${proof.walletAddress}&timestamp=${proof.timestamp}&expiration=${proof.expiration}&sig=${proof.signature}`;
}