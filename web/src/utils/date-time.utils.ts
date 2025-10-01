/**
 * Date and Time Utilities
 * Functions for formatting, parsing, and manipulating dates and timestamps
 */

export function formatDate(date: Date) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const day = date.getDate().toString().padStart(2, '0')
      const month = months[date.getMonth()]
      const year = date.getFullYear()
      return `${day}-${month}-${year}`
}

export function timeStampToDateObject(timestamp: string): Date | null {
      try {
            const year = parseInt(timestamp.substring(0, 4))
            const month = parseInt(timestamp.substring(4, 6)) - 1 // Month is 0-indexed (0=Jan)
            const day = parseInt(timestamp.substring(6, 8))
            const hour = parseInt(timestamp.substring(8, 10))
            const minute = parseInt(timestamp.substring(10, 12))
            const second = parseInt(timestamp.substring(12, 14))

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
            EAT: 'Africa/Nairobi', // East Africa Time (UTC+3)
            CAT: 'Africa/Harare', // Central Africa Time (UTC+2)
            WAT: 'Africa/Lagos', // West Africa Time (UTC+1)

            // European timezones
            CET: 'Europe/Berlin', // Central European Time (UTC+1)
            CEST: 'Europe/Berlin', // Central European Summer Time (UTC+2)
            GMT: 'GMT', // Greenwich Mean Time (UTC+0)
            BST: 'Europe/London', // British Summer Time (UTC+1)
            EET: 'Europe/Athens', // Eastern European Time (UTC+2)

            // North American timezones
            PST: 'America/Los_Angeles', // Pacific Standard Time (UTC-8)
            PDT: 'America/Los_Angeles', // Pacific Daylight Time (UTC-7)
            MST: 'America/Denver', // Mountain Standard Time (UTC-7)
            MDT: 'America/Denver', // Mountain Daylight Time (UTC-6)
            CST: 'America/Chicago', // Central Standard Time (UTC-6)
            CDT: 'America/Chicago', // Central Daylight Time (UTC-5)
            EST: 'America/New_York', // Eastern Standard Time (UTC-5)
            EDT: 'America/New_York', // Eastern Daylight Time (UTC-4)

            // Asian timezones
            JST: 'Asia/Tokyo', // Japan Standard Time (UTC+9)
            KST: 'Asia/Seoul', // Korea Standard Time (UTC+9)
            CST_CHINA: 'Asia/Shanghai', // China Standard Time (UTC+8)
            IST: 'Asia/Kolkata', // India Standard Time (UTC+5:30)
            GST: 'Asia/Dubai', // Gulf Standard Time (UTC+4)

            // Australian timezones
            AEST: 'Australia/Sydney', // Australian Eastern Standard Time (UTC+10)
            AWST: 'Australia/Perth', // Australian Western Standard Time (UTC+8)

            // Other common
            UTC: 'UTC',
            NZST: 'Pacific/Auckland', // New Zealand Standard Time (UTC+12)
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
                        const date = new Date(parseInt(input, 10) * 1000) // Convert seconds to milliseconds
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
