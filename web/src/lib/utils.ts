import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
      return twMerge(clsx(inputs))
}


export function getCorrectUTF8JSONString(fileContent: any, tabs?: number) {
      if(typeof fileContent === 'string') {
            // It's already a string, return as is
            const encoder = new TextEncoder() // TextEncoder always uses UTF-8
            const utf8Bytes = encoder.encode(fileContent)
            return utf8Bytes
      }
      let jsonContent = JSON.stringify(fileContent)
      if (tabs) {
            jsonContent = JSON.stringify(fileContent, null, tabs)
      }
      const encoder = new TextEncoder() // TextEncoder always uses UTF-8
      const utf8Bytes = encoder.encode(jsonContent)
      return utf8Bytes
}