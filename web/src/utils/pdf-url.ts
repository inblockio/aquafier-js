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
