import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
      return twMerge(clsx(inputs))
}


export function getCorrectUTF8JSONString(fileContent: any, tabs?: number): Uint8Array {
      // Handle Uint8Array - return as is
      if (fileContent instanceof Uint8Array) {
            return fileContent
      }

      // Handle ArrayBuffer - convert to Uint8Array
      if (fileContent instanceof ArrayBuffer) {
            return new Uint8Array(fileContent)
      }

      // Handle string - encode to UTF-8
      if (typeof fileContent === 'string') {
            const encoder = new TextEncoder()
            return encoder.encode(fileContent)
      }

      // Handle other types (objects, arrays, etc.) - stringify then encode
      const jsonContent = tabs
            ? JSON.stringify(fileContent, null, tabs)
            : JSON.stringify(fileContent)
      const encoder = new TextEncoder()
      return encoder.encode(jsonContent)
}
