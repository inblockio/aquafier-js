/**
 * String Utilities
 * Functions for string manipulation and formatting
 */

export function capitalizeWords(str: string): string {
      return str.replace(/\b\w+/g, word => word.charAt(0).toUpperCase() + word.slice(1))
}

export function convertTemplateNameToTitle(str: string) {
      return str
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
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
