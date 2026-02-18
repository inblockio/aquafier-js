import { FormField, FormTemplate } from './types'
import { getRandomNumber, formatDate } from '@/utils/functions'
import SignatureCanvas from 'react-signature-canvas'

export type CustomInputType = string | File | number | File[]

/**
 * Generates a text-based signature on a SignatureCanvas.
 * Renders the provided text (or initials derived from it) in a cursive font,
 * centered and scaled to fit the canvas.
 */
export const generateSignatureFromText = (
      signatureCanvas: SignatureCanvas | null,
      text: string,
      isInitials: boolean = false
) => {
      if (!signatureCanvas || !text.trim()) return

      const canvas = signatureCanvas.getCanvas()
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Clear the canvas first
      signatureCanvas.clear()

      // Configure text style - use larger font to fill the signature box
      const displayText = isInitials ? text.split(' ').map(n => n.charAt(0).toUpperCase()).join('') : text

      // Calculate font size based on canvas dimensions and text length
      // Start with height-based sizing, then adjust for width if neededz
      let fontSize = isInitials ? canvas.height * 0.7 : canvas.height * 0.6

      // Set font to measure text width
      ctx.font = `italic ${fontSize}px "Brush Script MT", "Segoe Script", "Bradley Hand", cursive`
      let textWidth = ctx.measureText(displayText).width

      // If text is too wide, scale down to fit within 90% of canvas width
      const maxWidth = canvas.width * 0.9
      if (textWidth > maxWidth) {
            fontSize = fontSize * (maxWidth / textWidth)
            ctx.font = `italic ${fontSize}px "Brush Script MT", "Segoe Script", "Bradley Hand", cursive`
      }

      ctx.fillStyle = '#000000'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      // Draw the text centered
      ctx.fillText(displayText, canvas.width / 2, canvas.height / 2)
}

/**
 * Gets the user's name for signature generation.
 * Checks form data fields first (name, full_name, signer_name),
 * then falls back to a shortened session address, or 'User'.
 */
export const getUserNameForSignature = (
      formData: Record<string, CustomInputType>,
      sessionAddress?: string
): string => {
      // Try to get name from form data first
      const nameField = formData['name'] || formData['full_name'] || formData['signer_name']
      if (nameField && typeof nameField === 'string') return nameField

      // Fallback to session address (shortened)
      if (sessionAddress) {
            return `${sessionAddress.slice(0, 6)}...${sessionAddress.slice(-4)}`
      }
      return 'User'
}

/**
 * Clears the signature canvas.
 */
export const clearSignature = (signatureCanvas: SignatureCanvas | null) => {
      if (signatureCanvas) {
            signatureCanvas.clear()
      }
}

/**
 * Generates a filename for the form submission based on the template name
 * and form data. Special handling for 'aqua_sign' and 'identity_attestation' templates.
 */
export const generateFileName = (selectedTemplate: FormTemplate, completeFormData: Record<string, CustomInputType>) => {
      const randomNumber = getRandomNumber(100, 1000)
      let fileName = `${selectedTemplate?.name ?? 'template'}-${randomNumber}.json`

      if (selectedTemplate?.name === 'aqua_sign') {
            const theFile = completeFormData['document'] as File
            const fileNameWithoutExt = theFile.name.substring(0, theFile.name.lastIndexOf('.'))
            fileName = fileNameWithoutExt + '-' + formatDate(new Date()) + '-' + randomNumber + '.json'
      }

      if (selectedTemplate?.name === 'identity_attestation') {
            fileName = `identity_attestation-${randomNumber}.json`
      }

      return fileName
}

/**
 * Reorders form input fields alphabetically by name.
 */
export const reorderInputFields = (fields: FormField[]) => {
      const sortedFields = fields.sort((a, b) => {
            return a.name.localeCompare(b.name)
      })

      // Return a new array with fields ordered by name
      return sortedFields
}
