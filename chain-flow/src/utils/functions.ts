

/**
 * Converts a timestamp string in format "YYYYMMDDHHmmss" to a Date object
 * @param timestamp - The timestamp string (e.g., "20250412153726")
 * @returns A Date object representing the timestamp
 */
export function convertTimestampToDate(timestamp: string): string {
    if (timestamp.length !== 14) {
        //   throw new Error('Invalid timestamp format. Expected YYYYMMDDHHmmss (14 digits)');
        return timestamp
    }

    const year = parseInt(timestamp.substring(0, 4));
    const month = parseInt(timestamp.substring(4, 6)) - 1; // Months are 0-indexed in JavaScript
    const day = parseInt(timestamp.substring(6, 8));
    const hour = parseInt(timestamp.substring(8, 10));
    const minute = parseInt(timestamp.substring(10, 12));
    const second = parseInt(timestamp.substring(12, 14));

    return new Date(year, month, day, hour, minute, second).toUTCString();
}

// Example usage:
// const dateObj = convertTimestampToDate("20250412153726");
// console.log(dateObj.toLocaleString()); // Output: 4/12/2025, 3:37:26 PM (depending on locale)