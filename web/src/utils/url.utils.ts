/**
 * URL Utilities
 * Functions for URL manipulation and validation
 */

import { ApiFileInfo } from "@/models/FileInfo";

export function ensureDomainUrlHasSSL(url: string): string {
      // Check if actualUrlToFetch is localhost but window host is not localhost
      const isLocalhost = url.includes('127.0.0.1') || url.includes('0.0.0.0') || url.includes('localhost');
      const windowHost = window.location.origin;

      // Step 1: Enforce HTTPS for all domains except localhost/development
      if (!isLocalhost) {
            // Add https if no protocol specified
            if (!url.includes('://')) {
                  url = 'https://' + url;
            }
            // Replace http with https if not localhost
            else if (url.startsWith('http://')) {
                  url = url.replace('http://', 'https://');
            }

            //Remove port numbers for non-localhost URLs
            url = url.replace(/:\d+/g, '');
      }

      // Step 2: Replace unsafe localhost URLs with safe ones
      const localhostReplacements = [
            { from: 'https://0.0.0.0', to: 'http://127.0.0.1' },
            { from: 'http://0.0.0.0', to: 'http://127.0.0.1' },
            { from: 'https://127.0.0.1', to: 'http://127.0.0.1' },
            { from: 'https://localhost', to: 'http://127.0.0.1' }
      ];

      for (const replacement of localhostReplacements) {
            if (url.startsWith(replacement.from)) {
                  url = url.replace(replacement.from, replacement.to);
            }
      }

    (`ensureDomainUrlHasSSL url after replacements: ${url}`)

      if (isLocalhost && !(windowHost.includes('127.0.0.1') || windowHost.includes('localhost'))) {

          (`ensureDomainUrlHasSSL isLocalhost: ${isLocalhost}, windowHost: ${windowHost}`)
            // Replace localhost/127.0.0.1 based on window host
            if (windowHost === 'https://dev.inblock.io') {
                  url = url.replace('https://127.0.0.1', 'https://dev-api.inblock.io')
                        .replace('https://localhost', 'https://dev-api.inblock.io')
                        .replace('https://0.0.0.0', 'https://dev-api.inblock.io');

            } else if (windowHost === 'https://aquafier.inblock.io') {
                  url = url.replace('https://127.0.0.1', 'https://aquafier-api.inblock.io')
                        .replace('https://localhost', 'https://aquafier-api.inblock.io')
                        .replace('https://0.0.0.0', 'https://aquafier-api.inblock.io');
            } else {
                  // Extract subdomain and add -api
                  const match = windowHost.match(/https?:\/\/([^.]+)\./);
                  if (match) {
                        const subdomain = match[1];
                        const baseHost = windowHost.replace(/https?:\/\/[^.]+\./, `https://${subdomain}-api.`);
                        url = url.replace('https://127.0.0.1', baseHost)
                              .replace('https://localhost', baseHost)
                              .replace('https://0.0.0.0', baseHost);
                  }
            }
            // Remove port numbers and path from the replaced URL if they exist
            url = url.replace(/:\d+/g, '').replace(/\/.*$/, '');
            return url;
      }

      return url;
}

export function convertToWebsocketUrl(actualUrlToFetch: string): string {
      // Step 1: Ensure SSL if needed
      const validHttpAndDomain = ensureDomainUrlHasSSL(actualUrlToFetch)

      // Step 2: Convert protocol from http(s) to ws(s)
      if (validHttpAndDomain.startsWith('https://')) {
            return validHttpAndDomain.replace('https://', 'wss://')
      } else if (validHttpAndDomain.startsWith('http://')) {
            return validHttpAndDomain.replace('http://', 'ws://')
      }

      // If no recognizable protocol is found, assume secure websocket as fallback
      return 'wss://' + validHttpAndDomain
}

export function isValidUrl(str: string): boolean {
      try {
            new URL(str)
            return true
      } catch {
            return false
      }
}

export function isHttpUrl(str: string): boolean {
      // quick reject if contains newline or tab
      if (/\s/.test(str)) return false

      try {
            const url = new URL(str)
            return url.protocol === "http:" || url.protocol === "https:"
      } catch {
            return false
      }
}

export const getFileHashFromUrl = (url: string) => {
      // Using a regular expression to match the file ID
      const regex = /\/files\/([a-f0-9]+)/
      const match = url.match(regex)

      // Return the captured group if found, otherwise empty string
      return match ? match[1] : ''
}

export function extractFileHash(url: string): string | undefined {
      try {
            const urlObj = new URL(url)
            const parts = urlObj.pathname.split('/')
            return parts.pop() // Get the last part of the URL path
      } catch (error) {
            console.error('Invalid URL:', error)
            return undefined
      }
}



export async function digTxtRecords(domain: string): Promise<string[]> {
      try {
            // Using Google's DNS-over-HTTPS API
            const response = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=TXT`)
            const data = await response.json()

            if (!data.Answer) {
                  return []
            }

            // Extract TXT records from the response
            return data.Answer
      } catch (error) {
            console.error('Error fetching DNS TXT records:', error)
            return []
      }
}

export async function digTxtRecordsGoogle(domain: string): Promise<string[]> {
      try {
            const response = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=TXT`, {
                  headers: {
                        Accept: 'application/json',
                  },
            })

            if (!response.ok) {
                  throw new Error(`DNS query failed: ${response.statusText}`)
            }

            const data = await response.json()

            if (data.Status !== 0) {
                  throw new Error(`DNS query failed with status: ${data.Status}`)
            }

            const txtRecords: string[] = []
            if (data.Answer) {
                  for (const record of data.Answer) {
                        if (record.type === 16) {
                              // TXT record type
                              // Remove quotes from the TXT record data
                              const cleanData = record.data.replace(/^"|"$/g, '')
                              txtRecords.push(cleanData)
                        }
                  }
            }

            return txtRecords
      } catch (error: any) {
            throw new Error(`Failed to lookup TXT records for ${domain}: ${error.message}`)
      }
}

export async function handleLoadFromUrl(pdfUrlInput: string, fileName: string, toaster: any) {
      if (!pdfUrlInput.trim()) {
            toaster.error('Invalid URL', {
                  description: 'Please enter a valid PDF URL.',
                  type: 'error',
            })
            return {
                  file: null,
                  error: 'Invalid URL',
            }
      }
      try {
            const response = await fetch(pdfUrlInput)
            if (!response.ok) {
                  // throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
                  return {
                        file: null,
                        error: `Failed to fetch PDF: ${response.status} ${response.statusText}`,
                  }
            }
            const contentType = response.headers.get('content-type')
            if (!contentType || !contentType.includes('application/pdf')) {
                  console.warn(`Content-Type is not application/pdf: ${contentType}. Attempting to load anyway.`)
                  // Potentially toast a warning here, but proceed for now
            }

            const arrayBuffer = await response.arrayBuffer()
            const filename = fileName
            const blob = new Blob([arrayBuffer], { type: 'application/pdf' })
            const newFile = new File([blob], filename, { type: 'application/pdf' })

            //   resetPdfStateAndLoad(newFile);
            //   if (fileInputRef.current) { // Clear file input if URL is loaded
            //     fileInputRef.current.value = "";
            //   }

            return {
                  file: newFile,
                  error: null,
            }
      } catch (error) {
            console.error('Error loading PDF from URL:', error)
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.'
            //   toast({ title: "Load from URL Failed", description: `Could not load PDF from URL. ${errorMessage}`, variant: "destructive" });
            return {
                  file: null,
                  error: errorMessage,
            }
      }
}


// Function to convert data URL to Uint8Array
export const dataURLToUint8Array = (dataUrl: string): Uint8Array => {
      // Extract the base64 data
      const base64Data = dataUrl.split(',')[1]
      // Convert base64 to binary string
      const binaryString = atob(base64Data)

      // Create Uint8Array from binary string
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
      }

      return bytes
}


// Function to convert data URL to File object
export const dataURLToFile = (dataUrl: string, filename: string): File => {
      // Split the data URL to get the MIME type and base64 data
      const arr = dataUrl.split(',')
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
      const bstr = atob(arr[1])

      // Convert base64 to binary
      let n = bstr.length
      const u8arr = new Uint8Array(n)

      while (n--) {
            u8arr[n] = bstr.charCodeAt(n)
      }

      // Create and return File object
      return new File([u8arr], filename, { type: mime })
}


// Helper function to convert Blob to Data URL
export const blobToDataURL = (blob: Blob): Promise<string> => {
      return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
                  resolve(reader.result as string)
            }
            reader.onerror = reject
            reader.readAsDataURL(blob)
      })
}


export async function fetchSystemFiles(url: string, metamaskAddress: string = ''): Promise<Array<ApiFileInfo>> {
      try {
            const query = await fetch(url, {
                  method: 'GET',
                  headers: {
                        metamask_address: metamaskAddress,
                  },
            })
            const response = await query.json()

            if (!query.ok) {
                  throw new Error(`HTTP error! status: ${query.status}`)
            }

            return response.data
      } catch (error) {
            console.error('Error fetching files:', error)
            return []
      }
}