/**
 * Conversion Utilities
 * Functions for converting between different data formats
 */

/**
 * Converts a Blob (typically from an HTTP response) to a base64 string
 */
export function blobToBase64(blob: Blob): Promise<string> {
      return new Promise((resolve, reject) => {
            const reader = new FileReader()

            reader.onload = () => {
                  if (typeof reader.result === 'string') {
                        const base64String = reader.result.split(',')[1]
                        resolve(base64String)
                  } else {
                        reject(new Error('FileReader did not return a string'))
                  }
            }

            reader.onerror = error => {
                  reject(new Error(`FileReader error: ${error}`))
            }

            reader.readAsDataURL(blob)
      })
}

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

export const dataURLToFile = (dataUrl: string, filename: string): File => {
      const arr = dataUrl.split(',')
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
      const bstr = atob(arr[1])

      let n = bstr.length
      const u8arr = new Uint8Array(n)

      while (n--) {
            u8arr[n] = bstr.charCodeAt(n)
      }

      return new File([u8arr], filename, { type: mime })
}

export const dataURLToUint8Array = (dataUrl: string): Uint8Array => {
      const base64Data = dataUrl.split(',')[1]
      const binaryString = atob(base64Data)

      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
      }

      return bytes
}

export async function fileToBase64(file: File): Promise<string> {
      return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => {
                  if (typeof reader.result === 'string') {
                        const base64String = reader.result.split(',')[1]
                        resolve(base64String)
                  } else {
                        reject(new Error('Failed to convert file to base64'))
                  }
            }
            reader.onerror = error => reject(error)
      })
}

export function encodeFileToBase64(file: File): Promise<string> {
      return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = error => reject(error)
      })
}
