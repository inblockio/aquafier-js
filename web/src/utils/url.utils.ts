/**
 * URL Utilities
 * Functions for URL manipulation and validation
 */

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
