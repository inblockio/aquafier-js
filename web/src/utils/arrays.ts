export function arraysEqualIgnoreOrder(a: string[], b: string[]): boolean {
      return a.length === b.length &&
            [...new Set(a)].every(val => b.includes(val));
}

export function areArraysEqual(array1: Array<string>, array2: Array<string>) {
      // Check if arrays have the same length
      if (array1.length !== array2.length) {
            return false
      }

      // Create a copy of array2 to modify
      const array2Copy = [...array2]

      // Check each element in array1
      for (const item of array1) {
            const index = array2Copy.indexOf(item)

            // If element not found in array2Copy
            if (index === -1) {
                  return false
            }

            // Remove the found element from array2Copy
            array2Copy.splice(index, 1)
      }

      // If we've removed all elements from array2Copy, arrays are equal
      return array2Copy.length === 0
}

export const getHighestCount = (strArray: Array<string>): number => {
      let highestCounter = 0

      // Loop through each string in the array
      for (const str of strArray) {
            // Use regex to extract the number after the underscore
            const match = str.match(/_(\d+)$/)

            if (match) {
                  // Convert the extracted number to integer
                  const counter = parseInt(match[1], 10)

                  // Update highest counter if this one is greater
                  if (!isNaN(counter) && counter > highestCounter) {
                        highestCounter = counter
                  }
            }
      }
      return highestCounter
}

export const getHighestFormIndex = (obj: Record<string, any>): number => {
      let highestIndex = -1

      // Loop through all object keys
      for (const key of Object.keys(obj)) {
            // Check if key matches the expected pattern (forms_*_N)
            const match = key.match(/^forms_[^_]+_(\d+)$/)

            if (match) {
                  // Extract the index number and convert to integer
                  const index = parseInt(match[1], 10)

                  // Update highest index if this one is greater
                  if (!isNaN(index) && index > highestIndex) {
                        highestIndex = index
                  }
            }
      }

      return highestIndex
}

// Basic random number function
export function getRandomNumber(min: number, max: number): number | null {
      // Ensure min and max are numbers
      min = Number(min)
      max = Number(max)

      // Validate inputs
      if (isNaN(min) || isNaN(max)) {
            ('Please provide valid numbers')
            return null
      }

      // Swap if min is greater than max
      if (min > max) {
            ;[min, max] = [max, min]
      }

      // Generate random number between min and max (inclusive)
      return Math.floor(Math.random() * (max - min + 1)) + min
}
