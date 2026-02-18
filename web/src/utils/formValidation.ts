import { FormField, FormTemplate } from '@/components/aqua_forms/types'
import { isValidEthereumAddress } from '@/utils/crypto'
import { fetchSubscriptionPlans } from '@/api/subscriptionApi'

export type CustomInputType = string | File | number | File[]

/**
 * Validates that all required fields have values.
 */
export const validateRequiredFields = (completeFormData: Record<string, CustomInputType>, selectedTemplate: FormTemplate) => {
      for (const fieldItem of selectedTemplate.fields) {
            const valueInput = completeFormData[fieldItem.name]
            if (fieldItem.required && valueInput == undefined) {
                  throw new Error(`${fieldItem.name} is mandatory`)
            }
      }
}

/**
 * Validates wallet address fields, including comma-separated multiple addresses.
 */
export const validateWalletAddress = (valueInput: CustomInputType, fieldItem: FormField) => {
      console.log(valueInput, fieldItem)
      if(!fieldItem.required){
            return
      }
      if (typeof valueInput !== 'string') {
            throw new Error(`${valueInput} provided at ${fieldItem.name} is not a string`)
      }

      if (valueInput.includes(',')) {
            const walletAddresses = valueInput.split(',')
            const seenWalletAddresses = new Set<string>()

            for (const walletAddress of walletAddresses) {
                  const trimmedAddress = walletAddress.trim()
                  const isValidWalletAddress = isValidEthereumAddress(trimmedAddress)

                  if (!isValidWalletAddress) {
                        throw new Error(`>${trimmedAddress}< is not a valid wallet address`)
                  }

                  if (seenWalletAddresses.has(trimmedAddress)) {
                        throw new Error(`>${trimmedAddress}< is a duplicate wallet address`)
                  }

                  seenWalletAddresses.add(trimmedAddress)
            }
      } else {
            const isValidWalletAddress = isValidEthereumAddress(valueInput.trim())
            if (!isValidWalletAddress) {
                  throw new Error(`>${valueInput}< is not a valid wallet address`)
            }
      }
}

/**
 * Validates domain fields, rejecting protocols, www prefixes, and invalid formats.
 */
export const validateDomain = (valueInput: CustomInputType, fieldItem: FormField) => {
      if (typeof valueInput !== 'string') {
            throw new Error(`${valueInput} provided at ${fieldItem.name} is not a string`)
      }

      const trimmedInput = valueInput.trim()

      // Check for protocol prefixes
      if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmedInput)) {
            throw new Error(`${valueInput} - contains protocol (http://, https://, etc.). Please provide domain only (e.g., example.com)`)
      }

      // Check for www subdomain
      if (/^www\./.test(trimmedInput)) {
            throw new Error(`${valueInput} - www subdomain not allowed. Please provide domain without www (e.g., example.com instead of www.example.com)`)
      }

      // Domain regex validation - allowing underscores in subdomains for DNS TXT records
      const domainWithSubdomainRegex = /^(?!www\.)((?!-)[A-Za-z0-9_-]{1,63}(?<!-)\.)*(?!-)[A-Za-z0-9-]{1,63}(?<!-)\.[A-Za-z]{2,6}$/

      if (!domainWithSubdomainRegex.test(trimmedInput)) {
            throw new Error(`${valueInput} - is not a valid domain. Expected format: example.com, api.example.com, or name._prefix.example.com`)
      }

      // Ensure it's not just a TLD
      const parts = trimmedInput.split('.')
      if (parts.length < 2 || parts[0].length === 0) {
            throw new Error(`${valueInput} - must include both domain name and TLD (e.g., example.com)`)
      }
}

/**
 * Validates all fields in the form, including required fields, wallet addresses,
 * domain fields, subscription package IDs, and verifiable data codes.
 */
export const validateFields = async (
      completeFormData: Record<string, CustomInputType>,
      selectedTemplate: FormTemplate,
      formData: Record<string, CustomInputType>
) => {

      validateRequiredFields(completeFormData, selectedTemplate)

      for (const fieldItem of selectedTemplate.fields) {
            const valueInput = completeFormData[fieldItem.name]

            if (fieldItem.type === 'wallet_address') {
                  validateWalletAddress(valueInput, fieldItem)
            }

            if (fieldItem.name === 'package_id' && selectedTemplate.name.includes("aquafier_licence")) {
                  const plans = await fetchSubscriptionPlans()
                  const validPlanIds = plans.map(plan => plan.id)
                  if (!validPlanIds.includes(valueInput as string)) {
                        throw new Error(`"${valueInput}" is not a valid package ID. Valid plans: ${plans.map(p => `${p.display_name} (${p.id})`).join(', ')}`)
                  }
            }

            if (fieldItem.type === 'domain') {
                  validateDomain(valueInput, fieldItem)
            }


            // ensure there is code input for all verifiable data
            if (fieldItem.is_verifiable) {
                  let verificationCodeData = formData[`${fieldItem.name}_verification`]
                  if (!verificationCodeData) {
                        throw new Error(`${fieldItem.label} has no verification code provided.`)
                  }
            }
      }
}
