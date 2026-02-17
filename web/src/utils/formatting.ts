export function formatDate(date: Date) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const day = date.getDate().toString().padStart(2, '0')
      const month = months[date.getMonth()]
      const year = date.getFullYear()
      return `${day}-${month}-${year}`
}

export function formatCryptoAddress(address?: string, start: number = 10, end: number = 4, message?: string): string {
      if (!address) return message ?? 'NO ADDRESS'
      if (address?.length < start + end) {
            return address
      }

      const firstPart = address?.slice(0, start)
      const lastPart = address?.slice(-end)
      return `${firstPart}...${lastPart}`
}

export function formatAddressForFilename(address?: string): string {
      if (!address || address.length < 8) return ''
      return `_${address.slice(0, 4)}_${address.slice(-4)}`
}

export function timeToHumanFriendly(timestamp: string | undefined, showFull: boolean = false, timezone?: string): string {
      if (!timestamp) {
            return '-'
      }

      let date: Date

      // Check if timestamp is in ISO 8601 format (contains 'T' and 'Z' or timezone info)
      if (timestamp.includes('T') || timestamp.includes('Z') || timestamp.includes('+') || timestamp.includes('-')) {
            // Handle ISO 8601 format (e.g., "2025-07-16T11:54:15.216Z")
            date = new Date(timestamp)

            // Check if the date is valid
            if (isNaN(date.getTime())) {
                  return 'Invalid Date'
            }
      } else {
            // Handle custom timestamp format (e.g., "20250716115415")
            if (timestamp.length < 14) {
                  return 'Invalid Date'
            }

            // Extract the date components
            const year = timestamp.substring(0, 4)
            const month = Number(timestamp.substring(4, 6)) - 1 // Months are zero-indexed in JS
            const day = timestamp.substring(6, 8)
            const hours = timestamp.substring(8, 10)
            const minutes = timestamp.substring(10, 12)
            const seconds = timestamp.substring(12, 14)

            // Create a new Date object in UTC
            date = new Date(Date.UTC(Number(year), month, Number(day), Number(hours), Number(minutes), Number(seconds)))

            // Check if the date is valid
            if (isNaN(date.getTime())) {
                  return 'Invalid Date'
            }
      }

      // Auto-detect user's local timezone if none provided
      const defaultTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone

      // Timezone mapping for common East African timezones
      const timezoneMap: { [key: string]: string } = {
            // African timezones
            EAT: 'Africa/Nairobi',
            CAT: 'Africa/Harare',
            WAT: 'Africa/Lagos',
            // European timezones
            CET: 'Europe/Berlin',
            CEST: 'Europe/Berlin',
            GMT: 'GMT',
            BST: 'Europe/London',
            EET: 'Europe/Athens',
            // North American timezones
            PST: 'America/Los_Angeles',
            PDT: 'America/Los_Angeles',
            MST: 'America/Denver',
            MDT: 'America/Denver',
            CST: 'America/Chicago',
            CDT: 'America/Chicago',
            EST: 'America/New_York',
            EDT: 'America/New_York',
            // Asian timezones
            JST: 'Asia/Tokyo',
            KST: 'Asia/Seoul',
            CST_CHINA: 'Asia/Shanghai',
            IST: 'Asia/Kolkata',
            GST: 'Asia/Dubai',
            // Australian timezones
            AEST: 'Australia/Sydney',
            AWST: 'Australia/Perth',
            // Other common
            UTC: 'UTC',
            NZST: 'Pacific/Auckland',
      }

      // Use the mapped timezone or the provided timezone directly
      const resolvedTimezone = timezoneMap[defaultTimezone.toUpperCase()] || defaultTimezone

      // Format options
      const dateOptions: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            timeZone: resolvedTimezone,
      }

      const fullOptions: Intl.DateTimeFormatOptions = {
            ...dateOptions,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: resolvedTimezone,
      }

      try {
            // Return formatted string based on showFull
            return date.toLocaleDateString('en-US', showFull ? fullOptions : dateOptions)
      } catch (error) {
            // Fallback to user's local timezone if specified timezone is invalid
            console.warn(`Invalid timezone: ${defaultTimezone}, falling back to local timezone`)
            const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
            const fallbackOptions = showFull ? { ...fullOptions, timeZone: userTimezone } : { ...dateOptions, timeZone: userTimezone }
            return date.toLocaleDateString('en-US', fallbackOptions)
      }
}

export function displayTime(input: number | string): string {
      // Handle number input
      if (typeof input === 'number') {
            // Convert to string for consistent processing
            input = input.toString()
      }

      // Handle string input
      if (typeof input === 'string') {
            // Check if string contains only numbers
            if (/^\d+$/.test(input)) {
                  // If it's a 14-digit number (YYYYMMDDhhmmss format)
                  if (input.length === 14) {
                        const year = input.substring(0, 4)
                        const month = parseInt(input.substring(4, 6)) - 1 // JS months are 0-indexed
                        const day = input.substring(6, 8)
                        const hour = input.substring(8, 10)
                        const minute = input.substring(10, 12)
                        const second = input.substring(12, 14)

                        const date = new Date(parseInt(year), month, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second))

                        return date.toLocaleString()
                  }
                  // Regular Unix timestamp (seconds since epoch)
                  else {
                        const date = new Date(parseInt(input, 10) * 1000)
                        return date.toLocaleString()
                  }
            } else {
                  // String contains non-numeric characters, just display it
                  return input
            }
      }

      // Handle invalid input
      return 'Invalid input'
}

export function humanReadableFileSize(size: number): string {
      const units = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB']
      let index = 0

      // Convert size in bytes to the appropriate unit
      while (size >= 1024 && index < units.length - 1) {
            size /= 1024
            index++
      }

      // Return the size formatted with 2 decimal places, along with the appropriate unit
      return `${size.toFixed(2)} ${units[index]}`
}

export function formatBytes(bytes: number, decimals = 2, binary = false) {
      // Handle edge cases
      if (bytes === 0) return '0 Bytes'
      if (bytes < 0) return 'Invalid size'
      if (typeof bytes !== 'number' || !isFinite(bytes)) return 'Invalid input'

      const k = binary ? 1024 : 1000
      const dm = decimals < 0 ? 0 : decimals

      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

      const i = Math.floor(Math.log(bytes) / Math.log(k))
      const size = parseFloat((bytes / Math.pow(k, i)).toFixed(dm))

      return `${size} ${sizes[i]}`
}

export function capitalizeWords(str: string): string {
      return str.replace(/\b\w+/g, word => word.charAt(0).toUpperCase() + word.slice(1))
}

export function makeProperReadableWord(wordWithUnderScores: string) {
      if (!wordWithUnderScores) {
            return wordWithUnderScores
      }
      const words = wordWithUnderScores.split('_')
      return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

export function remove0xPrefix(input: string): string {
      // Check if the input string starts with '0x'
      if (input.startsWith('0x')) {
            // Remove the prefix and return the remaining string
            return input.slice(2)
      }
      // Return the original string if it doesn't start with '0x'
      return input
}

export function timeStampToDateObject(timestamp: string): Date | null {
      try {
            // Extract parts using substring
            const year = parseInt(timestamp.substring(0, 4))
            const month = parseInt(timestamp.substring(4, 6)) - 1 // Month is 0-indexed (0=Jan)
            const day = parseInt(timestamp.substring(6, 8))
            const hour = parseInt(timestamp.substring(8, 10))
            const minute = parseInt(timestamp.substring(10, 12))
            const second = parseInt(timestamp.substring(12, 14))

            // Create Date object
            const dateObj = new Date(year, month, day, hour, minute, second)
            return dateObj
      } catch (e) {
            (`💣💣 Error occured parsing timestamp to date`)
            return null
      }
}

export function formatUnixTimestamp(timestamp: number) {
      // Convert seconds to milliseconds (JavaScript Date expects ms)
      const date = new Date(timestamp * 1000);

      // Use toLocaleString with options for desired format
      return date.toLocaleString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
      }).replace(',', ' at');
}
