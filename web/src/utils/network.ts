export function ensureDomainUrlHasSSL(url: string): string {
      const windowHost = typeof window !== 'undefined' ? window.location.origin : '';
      const isWindowLocalhost = windowHost.includes('localhost') || windowHost.includes('127.0.0.1');
      const isUrlLocalhost = url.includes('localhost') || url.includes('0.0.0.0') || url.includes('127.0.0.1');

      // If we're on a production domain but the URL points to localhost/0.0.0.0,
      // transform the URL to use the production API
      if (isUrlLocalhost && !isWindowLocalhost && windowHost) {
            let apiHost = '';

            // Determine the API host based on the current window host
            if (windowHost === 'https://dev.inblock.io') {
                  apiHost = 'https://dev-api.inblock.io';
            } else if (windowHost === 'https://aquafier.inblock.io') {
                  apiHost = 'https://aquafier-api.inblock.io';
            } else {
                  // Extract subdomain and create API host (e.g., https://foo.inblock.io -> https://foo-api.inblock.io)
                  const match = windowHost.match(/https?:\/\/([^.]+)\.(.*)/);
                  if (match) {
                        const subdomain = match[1];
                        const domain = match[2];
                        apiHost = `https://${subdomain}-api.${domain}`;
                  }
            }

            if (apiHost) {
                  // Extract the path from the original URL (exclude "/" as it's the default)
                  let path = '';
                  try {
                        const urlObj = new URL(url);
                        // Only include path if it's not just "/"
                        if (urlObj.pathname !== '/') {
                              path = urlObj.pathname;
                        }
                        path += urlObj.search;
                  } catch {
                        // Fallback: extract path manually
                        const pathMatch = url.match(/https?:\/\/[^\/]+(\/.*)?$/);
                        if (pathMatch && pathMatch[1] && pathMatch[1] !== '/') {
                              path = pathMatch[1];
                        }
                  }

                  return apiHost + path;
            }
      }

      // For non-localhost URLs, ensure HTTPS for inblock.io domains
      if (url.includes('inblock.io') && url.startsWith('http://')) {
            url = url.replace('http://', 'https://');
      }

      // For local development, normalize 0.0.0.0 to localhost
      if (isWindowLocalhost && url.includes('0.0.0.0')) {
            url = url.replace('0.0.0.0', 'localhost');
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
