import { JSX } from 'react'
import { useStore } from 'zustand'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { generateNonce } from 'siwe'
import {
      AquaTree,
      FileObject,
      Revision,
} from 'aqua-js-sdk'
import appStore from '@/store'
import apiClient from '@/api/axiosInstance'
import { ApiFileInfo } from '@/models/FileInfo'
import { Session } from '@/types'
import {
      ensureDomainUrlHasSSL,
      generateDNSClaim,
      getGenesisHash,
      isWorkFlowData,
} from '@/utils/functions'
import { signMessageWithAppKit } from '@/utils/appkit-wallet-utils'
import { RELOAD_KEYS, triggerWorkflowReload } from '@/utils/reloadDatabase'
import { FormField, FormTemplate } from '@/components/aqua_forms/types'

type CustomInputType = string | File | number | File[]

interface DialogData {
      content: JSX.Element
      title: string
}

interface UseWorkflowSubmissionProps {
      systemAquaFileNames: string[]
      setDialogOpen: (open: boolean) => void
      setDialogData: (data: DialogData | null) => void
      loadThisTreeFromSystem: (aquaTree: AquaTree) => Promise<ApiFileInfo | null>
}

interface UseWorkflowSubmissionReturn {
      prepareCompleteFormData: (
            formData: Record<string, CustomInputType | Array<File>>,
            selectedTemplate: FormTemplate,
            multipleAddresses: string[],
            getFieldDefaultValue: (field: FormField, currentState: CustomInputType | undefined) => string | number | File | File[],
      ) => Record<string, CustomInputType | File[]>
      prepareFinalFormData: (
            completeFormData: Record<string, CustomInputType>,
            selectedTemplate: FormTemplate,
      ) => Promise<{
            filteredData: Record<string, string | number>
      } | null>
      handleIdentityAttestation: (
            completeFormData: Record<string, CustomInputType>,
            selectedFileInfo: ApiFileInfo | null,
      ) => Record<string, CustomInputType>
      domainTemplateSignMessageFunction: (
            domainParams: string | undefined,
            messageToSign: string,
      ) => Promise<string | undefined>
      handlePostSigning: (
            signedAquaTree: AquaTree,
            fileObject: FileObject,
            completeFormData: Record<string, CustomInputType>,
            selectedTemplate: FormTemplate,
            session: Session | null,
            selectedFileInfo: ApiFileInfo | null,
            saveAquaTreeLocal: (aquaTree: AquaTree, fileObj: FileObject, isFinal: boolean, isWorkflow?: boolean, account?: string) => Promise<void>,
      ) => Promise<void>
      shareAquaTree: (aquaTree: AquaTree, recipientWalletAddress: string) => Promise<void>
}

export function useWorkflowSubmission({
      systemAquaFileNames,
      setDialogOpen,
      setDialogData,
      loadThisTreeFromSystem,
}: UseWorkflowSubmissionProps): UseWorkflowSubmissionReturn {
      const { session, backend_url, webConfig, setSelectedFileInfo } = useStore(appStore)
      const navigate = useNavigate()

      /**
       * Shares an AquaTree with the specified recipient wallet address(es).
       */
      const shareAquaTree = async (aquaTree: AquaTree, recipientWalletAddress: string): Promise<void> => {
            try {
                  let recipients: string[] = []
                  if (recipientWalletAddress.includes(',')) {
                        recipients = recipientWalletAddress
                              .split(',')
                              .map(address => address.trim())
                              .filter(address => address !== session?.address.trim())
                  } else {
                        if (recipientWalletAddress.trim() !== session?.address.trim()) {
                              recipients = [recipientWalletAddress.trim()]
                        } else {
                              recipients = []
                        }
                  }

                  const unique_identifier = `${Date.now()}_${generateNonce()}`

                  const allHashes = Object.keys(aquaTree.revisions)
                  const genesisHash = getGenesisHash(aquaTree) ?? ''
                  const latestHash = allHashes[allHashes.length - 1]

                  const name = aquaTree.file_index[genesisHash] ?? 'workflow file'
                  const url = ensureDomainUrlHasSSL(`${backend_url}/share_data`)
                  const method = 'POST'
                  const data = {
                        latest: latestHash,
                        genesis_hash: genesisHash,
                        hash: unique_identifier,
                        recipients: recipients,
                        option: 'latest',
                        file_name: name,
                  }

                  await apiClient({
                        method,
                        url,
                        data,
                        headers: {
                              nonce: session?.nonce,
                        },
                  })
            } catch (_e) {
                  toast.error('Error sharing workflow')
            }
      }

      /**
       * Prepares complete form data by filling in defaults and joining
       * multiple addresses for array fields.
       */
      const prepareCompleteFormData = (
            formData: Record<string, CustomInputType | Array<File>>,
            selectedTemplate: FormTemplate,
            multipleAddresses: string[],
            getFieldDefaultValue: (field: FormField, currentState: CustomInputType | undefined) => string | number | File | File[],
      ): Record<string, CustomInputType | File[]> => {
            const completeFormData: Record<string, CustomInputType | File[]> = { ...formData }

            selectedTemplate.fields.forEach((field: FormField) => {
                  if (!field.is_array && !(field.name in completeFormData)) {
                        completeFormData[field.name] = getFieldDefaultValue(field, undefined)
                  } else {
                        if (field.name === 'signers' && selectedTemplate.name === 'aqua_sign') {
                              completeFormData[field.name] = multipleAddresses.join(',')
                        } else if (field.name === 'receiver' && selectedTemplate.name === 'aquafier_licence') {
                              completeFormData[field.name] = multipleAddresses.join(',')
                        } else if (field.name === 'delegated_wallets' && selectedTemplate.name === 'dba_claim') {
                              completeFormData[field.name] = multipleAddresses.join(',')
                        } else if (field.name === 'delegated_wallets' && selectedTemplate && selectedTemplate.name === 'dba_claim') {
                              completeFormData[field.name] = multipleAddresses.join(',')
                        }
                  }
            })

            return completeFormData
      }

      /**
       * Prepares final form data: adds timestamps, applies default values,
       * converts File objects to file names, and handles domain_claim signing.
       */
      const prepareFinalFormData = async (
            completeFormData: Record<string, CustomInputType>,
            selectedTemplate: FormTemplate,
      ): Promise<{
            filteredData: Record<string, string | number>
      } | null> => {
            const epochTimeInSeconds = Math.floor(Date.now() / 1000)
            const filteredData: Record<string, string | number> = {}

            // Add timestamp for uniqueness
            completeFormData['created_at'] = epochTimeInSeconds

            // Set default values
            selectedTemplate.fields.forEach((field: FormField) => {
                  if (field.default_value && field.default_value !== '') {
                        completeFormData[field.name] = field.default_value
                  }
            })

            // Filter out File objects for logging
            Object.entries(completeFormData).forEach(([key, value]) => {
                  const field = selectedTemplate.fields.find(f => f.name === key)
                  if ((value instanceof File) || (Array.isArray(value) && value.length > 0 && value[0] instanceof File)) {
                        if (field?.is_array && field.type === 'document') {
                              filteredData[key] = (value as File[]).map(file => file.name).join(', ')
                        } else {
                              filteredData[key] = (value as File).name
                        }
                  } else {
                        if (typeof value === 'string' || typeof value === 'number') {
                              if (key.endsWith(`_verification`)) {
                                    // Skip verification fields
                              } else {
                                    filteredData[key] = value
                              }
                        } else {
                              filteredData[key] = String(value)
                        }
                  }
            })

            // For domain_claim - privacy-preserving implementation
            if (selectedTemplate.name === 'domain_claim') {
                  const domain = completeFormData['domain'] as string
                  const walletAddress = session?.address!
                  const expirationDays = 90
                  const publicAssociation = completeFormData['public_association'] === 'true'

                  const dataGen = async (message: string) => {
                        const signature = await domainTemplateSignMessageFunction(domain, message)
                        if (!signature) {
                              throw new Error('Failed to sign message')
                        }
                        return signature
                  }
                  // Generate DNS claim using new format
                  const dnsClaim = await generateDNSClaim(
                        domain,
                        walletAddress,
                        dataGen,
                        expirationDays,
                        publicAssociation,
                  )

                  // Store ALL claim data in form fields (no separate file)
                  filteredData['txt_record'] = dnsClaim.forms_txt_record
                  filteredData['unique_id'] = dnsClaim.forms_unique_id
                  filteredData['claim_secret'] = dnsClaim.forms_claim_secret
                  filteredData['txt_name'] = dnsClaim.forms_txt_name
                  filteredData['signature_type'] = dnsClaim.signature_type
                  filteredData['public_association'] = publicAssociation.toString()
                  filteredData['itime'] = dnsClaim.itime
                  filteredData['etime'] = dnsClaim.etime
            }
            return { filteredData }
      }

      /**
       * Handles identity attestation specific logic: copies genesis form
       * revision values into the form data and sets attestation metadata.
       */
      const handleIdentityAttestation = (
            completeFormData: Record<string, CustomInputType>,
            selectedFileInfo: ApiFileInfo | null,
      ): Record<string, CustomInputType> => {
            if (selectedFileInfo == null) {
                  throw new Error('No claim selected for identity attestation')
            }

            // Set genesis form revision values
            const genRevision: Revision = Object.values(selectedFileInfo.aquaTree?.revisions!)[0] as Revision
            if (genRevision) {
                  const genKeys = Object.keys(genRevision)
                  for (const key of genKeys) {
                        if (key.startsWith('forms_')) {
                              const keyWithoutFormWord = key.replace('forms_', '')
                              completeFormData[`claim_${keyWithoutFormWord}`] = genRevision[key]
                        }
                  }
            }

            const genHash = getGenesisHash(selectedFileInfo.aquaTree!)
            if (genHash) {
                  completeFormData[`identity_claim_id`] = genHash

                  const { isWorkFlow, workFlow } = isWorkFlowData(selectedFileInfo.aquaTree!, systemAquaFileNames)

                  if (completeFormData['claim_type'] == undefined && isWorkFlow && workFlow == 'aqua_certificate') {
                        const genesisRevision = selectedFileInfo.aquaTree!.revisions[genHash] as Revision
                        if (!genesisRevision) {
                              alert(`Error: The aqua tree selected does not contain a genesis revision, please report this issue.`)
                              throw new Error('Identity claim genesis id not found in selected file')
                        }
                        const creator = genRevision['forms_creator'] as string
                        completeFormData[`claim_wallet_address`] = creator ?? ''

                        completeFormData[`claim_type`] = 'aqua_certificate'
                  }
                  completeFormData[`attestion_type`] = 'user'
            } else {
                  throw new Error('Identity claim genesis id not found in selected file')
            }

            return completeFormData
      }

      /**
       * Signs a message for domain template claims using either MetaMask
       * or AppKit, depending on the configured AUTH_PROVIDER.
       */
      async function domainTemplateSignMessageFunction(
            domainParams: string | undefined,
            messageToSign: string,
      ): Promise<string | undefined> {
            let signature: string | undefined = undefined
            if (!domainParams) {
                  alert('Please enter a domain name')
                  return
            }

            const account = session?.address

            if (webConfig.AUTH_PROVIDER == 'metamask') {
                  if (typeof window.ethereum == 'undefined') {
                        console.error('MetaMask not found')
                        setDialogOpen(true)
                        setDialogData({
                              title: 'MetaMask not found',
                              content: createMetaMaskErrorContent('Please install MetaMask to sign the domain claim.'),
                        })
                        return
                  }

                  try {
                        signature = await (window.ethereum as any).request({
                              method: 'personal_sign',
                              params: [messageToSign, account],
                        })
                  } catch (error: any) {
                        console.error('Error signing domain claim:' + error)
                        setDialogOpen(true)
                        setDialogData({
                              title: 'Error signing domain claim',
                              content: createMetaMaskErrorContent(`error signing domain claim: ${JSON.stringify(error)}`),
                        })
                  }
            } else {
                  try {
                        const result = await signMessageWithAppKit(messageToSign, session?.address!)
                        signature = result.signature
                  } catch (error: any) {
                        console.error('Error signing domain claim:' + error)
                        setDialogOpen(true)
                        setDialogData({
                              title: 'Error signing domain claim',
                              content: createMetaMaskErrorContent(`error signing domain claim: ${JSON.stringify(error)}`),
                        })
                  }
            }

            return signature
      }

      /**
       * Helper to create a simple error JSX element for dialog content.
       * This avoids importing UI components directly in the hook.
       */
      function createMetaMaskErrorContent(message: string): JSX.Element {
            // Return a simple element - the parent component provides the actual Alert UI
            const el = {
                  type: 'div',
                  props: { children: message },
            }
            // We return a minimal JSX element to satisfy the DialogData interface
            return (el as unknown as JSX.Element)
      }

      /**
       * Handles all post-signing actions: saving, sharing, triggering reloads,
       * and navigating for aqua_sign workflows.
       */
      const handlePostSigning = async (
            signedAquaTree: AquaTree,
            fileObject: FileObject,
            completeFormData: Record<string, CustomInputType>,
            selectedTemplate: FormTemplate,
            _session: Session | null,
            selectedFileInfo: ApiFileInfo | null,
            saveAquaTreeLocal: (aquaTree: AquaTree, fileObj: FileObject, isFinal: boolean, isWorkflow?: boolean, account?: string) => Promise<void>,
      ): Promise<void> => {
            fileObject.fileContent = completeFormData

            await saveAquaTreeLocal(signedAquaTree, fileObject, true)

            // Handle aqua_sign specific logic
            if (selectedTemplate && selectedTemplate.name === 'aqua_sign' && session?.address) {
                  if (completeFormData['signers'] !== session?.address) {
                        await shareAquaTree(signedAquaTree, completeFormData['signers'] as string)
                  }
            }

            // Handle aquafier_licence specific logic - share with receivers
            if (selectedTemplate && selectedTemplate.name === 'aquafier_licence' && session?.address) {
                  if (completeFormData['receiver']) {
                        await shareAquaTree(signedAquaTree, completeFormData['receiver'] as string)
                  }
            }

            // Handle identity_attestation specific logic
            if (selectedTemplate && selectedTemplate.name === 'identity_attestation') {
                  console.log(`handling identity attestation post signing`)

                  let walletAddress = ''

                  const allHashes = Object.keys(selectedFileInfo!.aquaTree!.revisions!)
                  let secondRevision: Revision | null = null

                  if (allHashes.length >= 2) {
                        secondRevision = selectedFileInfo!.aquaTree!.revisions![allHashes[2]]
                  }

                  if (secondRevision == null || !secondRevision.signature_wallet_address) {
                        console.warn('No second revision found in claim, attempting to get wallet from genesis revision')

                        const genHash = getGenesisHash(signedAquaTree)
                        if (!genHash) {
                              throw new Error('Genesis hash not found in signed aqua tree')
                        }
                        const revision = signedAquaTree.revisions![genHash]
                        if (!revision) {
                              throw new Error('Revision not found for genesis hash in signed aqua tree')
                        }
                        if (!revision['forms_claim_wallet_address']) {
                              throw new Error('forms_claim_wallet_address not found in revision of signed aqua tree')
                        }

                        console.log(`found genesis revision wallet address: ${revision['forms_claim_wallet_address']}`)
                        walletAddress = revision['forms_claim_wallet_address'] as string
                  } else {
                        walletAddress = secondRevision.signature_wallet_address!
                  }

                  console.log(`sharing identity attestation with claim creator at wallet address: ${walletAddress}`)

                  if (walletAddress && walletAddress.length > 0) {
                        await saveAquaTreeLocal(signedAquaTree, fileObject, true, false, walletAddress)
                  } else {
                        console.warn('No wallet address found to share identity attestation with claim creator')
                  }
            }

            await triggerWorkflowReload(selectedTemplate.name, true)

            if (selectedTemplate.name === 'identity_attestation') {
                  await triggerWorkflowReload(RELOAD_KEYS.user_profile)
            }
            // Trigger reload for contacts if not aqua_sign
            if (!['aqua_sign', 'access_agreement', 'cheque', 'dba_claim'].includes(selectedTemplate.name)) {
                  await triggerWorkflowReload(RELOAD_KEYS.contacts)
            }

            // Do navigation here for aqua_sign
            if (selectedTemplate.name === 'aqua_sign') {
                  const apiFileInfoFromSystem = await loadThisTreeFromSystem(signedAquaTree)
                  if (apiFileInfoFromSystem) {
                        setSelectedFileInfo(apiFileInfoFromSystem)

                        const genesisHash = getGenesisHash(signedAquaTree)
                        if (!genesisHash) {
                              toast.error('Genesis hash not found in signed aqua tree')
                              return
                        }
                        try {
                              if (genesisHash && session?.address) {
                                    const genesisRevision = signedAquaTree.revisions[genesisHash]
                                    const signers = genesisRevision?.forms_signers
                                    if (signers) {
                                          const signersArray = signers.split(',').map((item: string) => item.trim().toLocaleLowerCase())
                                          const activeUserAddress = session.address.toLocaleLowerCase()
                                          const isUserSigner = signersArray.find((signer: string) => signer === activeUserAddress)
                                          if (isUserSigner) {
                                                navigate('/app/pdf/workflow/2/' + genesisHash)
                                          }
                                    } else {
                                          navigate('/app/pdf/workflow/1/' + genesisHash)
                                    }
                              }
                        } catch (_error: any) {
                              navigate('/app/pdf/workflow/1/' + genesisHash)
                        }
                  }
            }
      }

      return {
            prepareCompleteFormData,
            prepareFinalFormData,
            handleIdentityAttestation,
            domainTemplateSignMessageFunction,
            handlePostSigning,
            shareAquaTree,
      }
}
