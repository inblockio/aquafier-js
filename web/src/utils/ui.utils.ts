/**
 * UI Utilities
 * Functions for UI operations like clipboard, avatars, etc.
 */

import jdenticon from 'jdenticon/standalone'

export const copyToClipboardModern = async (text: string) => {
      try {
            await navigator.clipboard.writeText(text)
            return true
      } catch (err) {
            console.error('Failed to copy text: ', err)
            return false
      }
}

export function generateAvatar(seed: string, size = 200) {
      const svg = jdenticon.toSvg(seed, size)
      return `data:image/svg+xml;base64,${btoa(svg)}`
}

/**
 * Converts bytes to human readable file size
 */
export function formatBytes(bytes: number, decimals = 2, binary = false) {
      if (bytes === 0) return '0 Bytes'
      if (bytes < 0) return 'Invalid size'
      if (typeof bytes !== 'number' || !isFinite(bytes)) return 'Invalid input'

      const k = binary ? 1024 : 1000
      const dm = decimals < 0 ? 0 : decimals

      const sizes = binary ? ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'] : ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

      const i = Math.floor(Math.log(bytes) / Math.log(k))
      const size = parseFloat((bytes / Math.pow(k, i)).toFixed(dm))

      return `${size} ${sizes[i]}`
}

export function humanReadableFileSize(size: number): string {
      const units = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB']
      let index = 0

      while (size >= 1024 && index < units.length - 1) {
            size /= 1024
            index++
      }

      return `${size.toFixed(2)} ${units[index]}`
}

export function getRandomNumber(min: number, max: number): number | null {
      min = Number(min)
      max = Number(max)

      if (isNaN(min) || isNaN(max)) {
          ('Please provide valid numbers')
            return null
      }

      if (min > max) {
            ;[min, max] = [max, min]
      }

      return Math.floor(Math.random() * (max - min + 1)) + min
}
