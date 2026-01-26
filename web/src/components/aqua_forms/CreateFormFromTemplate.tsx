import React, { JSX, useCallback, useEffect, useRef, useState } from 'react'
import { FormField, FormTemplate } from './types'
import { useStore } from 'zustand'
import appStore from '@/store'
import {
      dataURLToFile,
      dummyCredential,
      ensureDomainUrlHasSSL,
      estimateFileSize,
      fetchSystemFiles,
      formatDate,
      generateDNSClaim,
      getAquaTreeFileObject,
      getGenesisHash,
      getLastRevisionVerificationHash,
      getRandomNumber,
      isValidEthereumAddress,
      isWorkFlowData,
      reorderRevisionsInAquaTree,
      stringToHex
} from '@/utils/functions'
import { getAppKitProvider } from '@/utils/appkit-wallet-utils'
import Aquafier, {
      AquaTree,
      AquaTreeWrapper,
      FileObject,
      getAquaTreeFileName,
      Revision
} from 'aqua-js-sdk'
import axios from 'axios'
import { generateNonce } from 'siwe'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
// Shadcn UI components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
// import { useNavigate } from 'react-router-dom'
import {
      AlertCircle,
      BookCheck,
      FileText,
      GripVertical,
      Image,
      Link,
      Loader2,
      Pen,
      Plus,
      RotateCcw,
      Send,
      Trash2,
      Type,
      Upload,
      User,
      Wallet,
      X
} from 'lucide-react'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'
import { ScrollArea } from '../ui/scroll-area'
import FilePreview from '../file_preview'
import { WalletAutosuggest } from '../wallet_auto_suggest'
import { ApiFileInfo } from '@/models/FileInfo'
import SignatureCanvas from 'react-signature-canvas'
import { Session } from '@/types'
import { ApiInfoData } from '@/types/types'
import { RELOAD_KEYS, triggerWorkflowReload } from '@/utils/reloadDatabase'
// Drag and drop
import {
      DndContext,
      closestCenter,
      KeyboardSensor,
      PointerSensor,
      useSensor,
      useSensors,
      DragEndEvent
} from '@dnd-kit/core'
import {
      arrayMove,
      SortableContext,
      sortableKeyboardCoordinates,
      useSortable,
      verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useNavigate } from 'react-router-dom'
import { API_ENDPOINTS } from '@/utils/constants'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { useAquaSystemNames } from '@/hooks/useAquaSystemNames'

/** Props for the SortableSignerItem component */
interface SortableSignerItemProps {
      id: string
      index: number
      address: string
      field: FormField
      multipleAddresses: string[]
      setMultipleAddresses: React.Dispatch<React.SetStateAction<string[]>>
      // walletAddresses: { address: string; name?: string }[]
      onRemove: (index: number) => void
      canRemove: boolean
}

/** Sortable signer item component for drag-and-drop reordering */
const SortableSignerItem = ({
      id,
      index,
      address,
      field,
      multipleAddresses,
      setMultipleAddresses,
      // walletAddresses,
      onRemove,
      canRemove
}: SortableSignerItemProps) => {
      const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging
      } = useSortable({ id })

      const style = {
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.5 : 1,
            zIndex: isDragging ? 1000 : 'auto'
      }

      return (
            <div
                  ref={setNodeRef}
                  style={style}
                  className={`flex items-center space-x-2 sm:space-x-3 p-2 sm:p-4 bg-gray-50 rounded-lg border ${isDragging ? 'shadow-lg border-blue-300 bg-blue-50' : ''}`}
            >
                  {/* Drag handle */}
                  <div
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded touch-none"
                        title="Drag to reorder"
                  >
                        <GripVertical className="h-4 w-4 text-gray-400" />
                  </div>

                  {/* Index badge */}
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full text-blue-600 font-medium text-sm">
                        {index + 1}
                  </div>

                  {/* Wallet input */}
                  <div className="flex-1">
                        <WalletAutosuggest
                              // walletAddresses={walletAddresses}
                              field={field}
                              index={index}
                              address={address}
                              multipleAddresses={multipleAddresses}
                              setMultipleAddresses={setMultipleAddresses}
                              placeholder="Enter signer wallet address"
                              className="rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                  </div>

                  {/* Remove button */}
                  {canRemove && (
                        <Button
                              variant="outline"
                              size="sm"
                              type="button"
                              className="rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 hover:border-red-300"
                              onClick={() => onRemove(index)}
                        >
                              <Trash2 className="h-4 w-4" />
                        </Button>
                  )}
            </div>
      )
}

// const CreateFormF romTemplate  = ({ selectedTemplate, callBack, openCreateTemplatePopUp = false }: { selectedTemplate: FormTemplate, callBack: () => void, openCreateTemplatePopUp: boolean }) => {
const CreateFormFromTemplate = ({ selectedTemplate, callBack }: {
      selectedTemplate: FormTemplate;
      callBack: () => void;
      openCreateTemplatePopUp: boolean
}) => {
      const [submittingTemplateData, setSubmittingTemplateData] = useState(false)
      const [modalFormErorMessae, setModalFormErorMessae] = useState('')
      const { systemNames: systemAquaFileNames } = useAquaSystemNames()

      const {
            session,
            backend_url,
            systemFileInfo,
            setSystemFileInfo,
            selectedFileInfo,
            // setWorkflows,
            setSelectedFileInfo,
            webConfig
      } = useStore(appStore)
      const [formData, setFormData] = useState<Record<string, string | File | number>>({})
      const [multipleAddresses, setMultipleAddresses] = useState<string[]>([])
      const [isDialogOpen, setDialogOpen] = useState(false)
      const [dialogData, setDialogData] = useState<null | {
            content: JSX.Element
            title: string
      }>(null)

      const signatureRef = useRef<SignatureCanvas | null>(null)
      // const navigate = useNavigate()

      const [verfyingFormFieldEnabled, setVerfyingFormFieldEnabled] = useState<ApiInfoData | null>(null)
      const [verifyingFormField, setVerifyingFormField] = useState('')
      const [canvasSize, setCanvasSize] = useState({ width: 800, height: 200 });
      const containerRef = useRef<HTMLDivElement | null>(null);

      // Multi-step form state for aqua_sign template
      const [aquaSignStep, setAquaSignStep] = useState<1 | 2>(1)
      const isAquaSignTemplate = selectedTemplate?.name === 'aqua_sign'

      const navigate = useNavigate()

      const fetchInfoDetails = async () => {
            try {
                  const url = ensureDomainUrlHasSSL(`${backend_url}/app_info`);

                  const response = await axios.get(url)

                  const res: ApiInfoData = await response.data

                  if (response.status === 200) {
                        setVerfyingFormFieldEnabled(res)
                  }
            } catch (e: unknown) {
                  toast('Error fetching api info details')
            }
      }

      useEffect(() => {
            // (async () => {
            //       if (!session?.address || !session?.nonce) {
            //             console.warn('Session not available for fetching workflows')
            //             return
            //       }

            //       try {
            //             // const filesApi = await fetchFiles(session!.address, `${backend_url}/workflows`, session!.nonce)
            //             // setWorkflows({ fileData: filesApi.files, pagination: filesApi.pagination, status: 'loaded' })

            //       } catch (error) {
            //             console.error('Error fetching workflows:', error)

            //             toast.error('Failed to load workflows')

            //       }
            // })()


            if (containerRef.current) {
                  const rect = containerRef.current.getBoundingClientRect();
                  setCanvasSize({
                        width: rect.width,
                        height: rect.height,
                  });
            }

            (async () => {
                  // console.log(`running fetch api info`)
                  await fetchInfoDetails()
            })()


      }, []);

      const getFieldDefaultValue = (field: FormField, currentState: string | File | number | undefined
      ): string | File | number => {
            if (field.type === 'number') {
                  return currentState ?? 0
            }
            if (field.type === 'date') {
                  return new Date().toISOString()
            }
            if (field.type === 'text') {
                  return currentState ?? ''
            }
            if (field.type === 'file') {
                  return currentState ?? ''
            }
            if (field.type === 'wallet_address') {
                  return currentState ?? session?.address ?? ''
            }
            return ''
      }

      const reorderInputFields = (fields: FormField[]) => {
            const sortedFields = fields.sort((a, b) => {
                  return a.name.localeCompare(b.name)
            })

            // Return a new array with fields ordered by name
            return sortedFields
      }

      const addAddress = () => {
            // if (multipleAddresses.length === 0 && session?.address) {
            //     setMultipleAddresses([...multipleAddresses, session.address, ""])
            // } else {
            setMultipleAddresses([...multipleAddresses, ''])
            // }
      }

      const removeAddress = (index: number) => {
            setMultipleAddresses(multipleAddresses.filter((_, i) => i !== index))
      }

      const shareAquaTree = async (aquaTree: AquaTree, recipientWalletAddress: string) => {
            try {
                  let recipients: string[] = []
                  if (recipientWalletAddress.includes(',')) {
                        recipients = recipientWalletAddress
                              .split(',')
                              .map(address => address.trim())
                              .filter(address => address !== session?.address.trim())
                  } else {
                        // Only add the recipient if it's not the logged-in user
                        if (recipientWalletAddress.trim() !== session?.address.trim()) {
                              recipients = [recipientWalletAddress.trim()]
                        } else {
                              recipients = []
                        }
                  }

                  // for (const recipient of recipients) {
                  const unique_identifier = `${Date.now()}_${generateNonce()}`
                  // let genesisHash = getGenesisHash(aquaTree)

                  const allHashes = Object.keys(aquaTree.revisions)
                  const genesisHash = getGenesisHash(aquaTree) ?? '' //allHashes[0];
                  const latestHash = allHashes[allHashes.length - 1]

                  const name = aquaTree.file_index[genesisHash] ?? 'workflow file'
                  const url = `${backend_url}/share_data`
                  const method = 'POST'
                  const data = {
                        latest: latestHash,
                        genesis_hash: genesisHash,
                        hash: unique_identifier,
                        recipients: recipients,
                        option: 'latest',
                        file_name: name,
                  }

                  await axios({
                        method,
                        url,
                        data,
                        headers: {
                              nonce: session?.nonce,
                        },
                  })

            } catch (e) {
                  toast.error('Error sharing workflow')
            }
      }

      const saveAquaTree = async (aquaTree: AquaTree, fileObject: FileObject, isFinal: boolean = false, isWorkflow: boolean = false, account: string = session?.address || '') => {
            try {
                  const url = `${backend_url}/explorer_aqua_file_upload`

                  // Create a FormData object to send multipart data
                  const formData = new FormData()

                  // Add the aquaTree as a JSON file
                  const aquaTreeBlob = new Blob([JSON.stringify(aquaTree)], {
                        type: 'application/json',
                  })
                  formData.append('file', aquaTreeBlob, fileObject.fileName)

                  // Add the account from the session
                  // formData.append('account', session?.address || '')
                  formData.append('account', account)
                  formData.append('is_workflow', `${isWorkflow}`)
                  // Template name
                  formData.append('template_name', selectedTemplate?.name || '')

                  // todo unocmment here
                  //workflow specifi
                  // if (selectedTemplate?.name == 'user_signature') {
                  //       formData.append('template_id', `${selectedTemplate.id}`)
                  // }

                  // Check if we have an actual file to upload as an asset
                  if (fileObject.fileContent) {
                        // Set has_asset to true
                        formData.append('has_asset', 'true')

                        // FIXED: Properly handle the file content as binary data
                        // If fileContent is already a Blob or File object, use it directly
                        if (fileObject.fileContent instanceof Blob || fileObject.fileContent instanceof File) {
                              formData.append('asset', fileObject.fileContent, fileObject.fileName)
                        }
                        // If it's an ArrayBuffer or similar binary data
                        else if (fileObject.fileContent instanceof ArrayBuffer || fileObject.fileContent instanceof Uint8Array) {
                              const fileBlob = new Blob([fileObject.fileContent as any], {
                                    type: 'application/octet-stream',
                              })

                              // const uint8Array = fileObject.fileContent instanceof Uint8Array
                              //       ? fileObject.fileContent
                              //       : new Uint8Array(fileObject.fileContent as ArrayBuffer)
                              // const fileBlob = new Blob([uint8Array], {
                              //       type: 'application/octet-stream',
                              // })
                              formData.append('asset', fileBlob, fileObject.fileName)
                        }
                        // If it's a base64 string (common for image data)
                        else if (typeof fileObject.fileContent === 'string' && fileObject.fileContent.startsWith('data:')) {
                              // Convert base64 to blob
                              const response = await fetch(fileObject.fileContent)
                              const blob = await response.blob()
                              formData.append('asset', blob, fileObject.fileName)
                        }
                        // Fallback for other string formats (not recommended for binary files)
                        else if (typeof fileObject.fileContent === 'string') {
                              const fileBlob = new Blob([fileObject.fileContent], {
                                    type: 'text/plain',
                              })
                              formData.append('asset', fileBlob, fileObject.fileName)
                        }
                        // If it's something else (like an object), stringify it (not recommended for files)
                        else {
                              console.warn('Warning: fileContent is not in an optimal format for file upload')
                              const fileBlob = new Blob([JSON.stringify(fileObject.fileContent)], {
                                    type: 'application/json',
                              })
                              formData.append('asset', fileBlob, fileObject.fileName)
                        }
                  } else {
                        formData.append('has_asset', 'false')
                  }

                  const response = await axios.post(url, formData, {
                        headers: {
                              nonce: session?.nonce,
                              // Don't set Content-Type header - axios will set it automatically with the correct boundary
                        },
                  })

                  if (response.status === 200 || response.status === 201) {
                        if (isFinal) {



                              if (account == session?.address) {
                                    // show success toast only if saving to own account
                                    toast.success('Aqua tree created successfully')
                                    callBack && callBack()
                                    // navigate('/app')
                                    setModalFormErorMessae('')
                                    setFormData({})
                                    setSubmittingTemplateData(false)
                              }

                        }
                  }
            } catch (error) {
                  setSubmittingTemplateData(false)
                  toast.error('Error uploading aqua tree')
            }
      }

      // Helper function to prepare complete form data
      const prepareCompleteFormData = (formData: Record<string, string | File | number>, selectedTemplate: FormTemplate, multipleAddresses: string[]): Record<string, string | File | number> => {
            const completeFormData: Record<string, string | File | number> = { ...formData }

            selectedTemplate.fields.forEach((field: FormField) => {
                  if (!field.is_array && !(field.name in completeFormData)) {
                        completeFormData[field.name] = getFieldDefaultValue(field, undefined)
                  } else {
                        if (field.name === 'signers' && selectedTemplate.name === 'aqua_sign') {
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

      // Validation function for required fields
      const validateRequiredFields = (completeFormData: Record<string, string | File | number>, selectedTemplate: FormTemplate) => {
            for (const fieldItem of selectedTemplate.fields) {
                  const valueInput = completeFormData[fieldItem.name]
                  if (fieldItem.required && valueInput == undefined) {
                        throw new Error(`${fieldItem.name} is mandatory`)
                  }
            }
      }

      // Wallet address validation function
      const validateWalletAddress = (valueInput: string | number | File, fieldItem: FormField) => {
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

      // Domain validation function
      const validateDomain = (valueInput: string | number | File, fieldItem: FormField) => {
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

      // Field validation function
      const validateFields = (completeFormData: Record<string, string | File | number>, selectedTemplate: FormTemplate) => {

            validateRequiredFields(completeFormData, selectedTemplate)

            for (const fieldItem of selectedTemplate.fields) {
                  const valueInput = completeFormData[fieldItem.name]

                  if (fieldItem.type === 'wallet_address') {
                        validateWalletAddress(valueInput, fieldItem)
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

      // Function to get system files
      const getSystemFiles = async (systemFileInfo: ApiFileInfo[], backend_url: string, sessionAddress: string) => {
            let allSystemFiles = systemFileInfo

            if (systemFileInfo.length === 0) {
                  const url3 = `${backend_url}/system/aqua_tree`
                  const systemFiles = await fetchSystemFiles(url3, sessionAddress)
                  allSystemFiles = systemFiles
            } else {
                  console.log(`Using cached system files`)
                  console.log(`systemFileInfo length: ${systemFileInfo.length} : ${JSON.stringify(systemFileInfo, null, 2)}`)
            }

            if (allSystemFiles.length === 0) {
                  throw new Error('Aqua tree for templates not found')
            }

            return allSystemFiles
      }

      // Function to find template API file info
      const findTemplateApiFileInfo = (allSystemFiles: ApiFileInfo[], selectedTemplate: FormTemplate) => {
            const templateApiFileInfo = allSystemFiles.find(e => {
                  const nameExtract = getAquaTreeFileName(e!.aquaTree!)
                  const selectedName = `${selectedTemplate?.name}.json`
                  return nameExtract === selectedName
            })

            if (!templateApiFileInfo) {
                  throw new Error(`Aqua tree for ${selectedTemplate?.name} not found`)
            }

            return templateApiFileInfo
      }

      // Function to generate filename
      const generateFileName = (selectedTemplate: FormTemplate, completeFormData: Record<string, string | File | number>) => {
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

      // Function to handle identity attestation specific logic
      const handleIdentityAttestation = (completeFormData: Record<string, string | File | number>, selectedFileInfo: ApiFileInfo | null): Record<string, string | File | number> => {
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
                        
                              let genesisRevision = selectedFileInfo.aquaTree!.revisions[genHash] as Revision
                              if (!genesisRevision) {
                                    alert(`Error: The aqua tree selected does not contain a genesis revision, please report this issue.`)
                                    throw new Error('Identity claim genesis id not found in selected file')

                              }
                              let creator = genRevision['forms_creator'] as string
                              completeFormData[`claim_wallet_address`] = creator ?? '';
             
                        completeFormData[`claim_type`] = 'aqua_certificate';
                  }
                  completeFormData[`attestion_type`] = 'user'
            } else {
                  throw new Error('Identity claim genesis id not found in selected file')
            }

            return completeFormData
      }

      async function domainTemplateSignMessageFunction(domainParams: string | undefined, messageToSign: string): Promise<string | undefined> {
            let signature: string | undefined = undefined
            if (!domainParams) {
                  alert('Please enter a domain name')
                  return
            }

            const account = session?.address

            if (webConfig.AUTH_PROVIDER == "metamask") {
                  if (typeof window.ethereum == 'undefined') {
                        console.error('MetaMask not found')
                        setDialogOpen(true)
                        setDialogData({
                              title: 'MetaMask not found',
                              content: (
                                    <>
                                          <Alert variant="destructive">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription>Please install MetaMask to sign the domain claim.</AlertDescription>
                                          </Alert>
                                    </>
                              ),
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
                              content: (
                                    <>
                                          <Alert variant="destructive">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription>error signing domain claim: {JSON.stringify(error)}</AlertDescription>
                                          </Alert>
                                    </>
                              ),
                        })
                  }

            } else {

                  const provider = await getAppKitProvider()

                  if (!provider) {
                        console.error('Wallet not connected')
                        setDialogOpen(true)
                        setDialogData({
                              title: 'Wallet not connected',
                              content: (
                                    <>
                                          <Alert variant="destructive">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription>Please connect your wallet to sign the domain claim.</AlertDescription>
                                          </Alert>
                                    </>
                              ),
                        })
                        return
                  }

                  try {
                        const messageHex = stringToHex(messageToSign)
                        try {
                              signature = await provider.request({
                                    method: 'personal_sign',
                                    params: [messageHex, session?.address!]
                              })
                        } catch (hexError) {
                              // Fallback to plain text for wallets that don't accept hex
                              signature = await provider.request({
                                    method: 'personal_sign',
                                    params: [messageToSign, session?.address!]
                              })
                        }
                  } catch (error: any) {
                        console.error('Error signing domain claim:' + error)
                        setDialogOpen(true)
                        setDialogData({
                              title: 'Error signing domain claim',
                              content: (
                                    <>
                                          <Alert variant="destructive">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription>error signing domain claim: {JSON.stringify(error)}</AlertDescription>
                                          </Alert>
                                    </>
                              ),
                        })
                  }
            }

            return signature
      }

      // Function to prepare final form data
      const prepareFinalFormData = async (
            completeFormData: Record<string, string | File | number>,
            selectedTemplate: FormTemplate
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
                  if (!(value instanceof File)) {
                        if (typeof value === 'string' || typeof value === 'number') {
                              if (key.endsWith(`_verification`)) {
                              } else {

                                    filteredData[key] = value
                              }
                        } else {
                              filteredData[key] = String(value)
                        }
                  } else {
                        filteredData[key] = (value as File).name
                  }
            })

            // for domain_claim - NEW PRIVACY-PRESERVING IMPLEMENTATION
            if (selectedTemplate.name === 'domain_claim') {
                  const domain = completeFormData['domain'] as string
                  const walletAddress = session?.address!
                  const expirationDays = 90
                  const publicAssociation = completeFormData['public_association'] === 'true'

                  let dataGen = async (message: string) => {
                        const signature = await domainTemplateSignMessageFunction(domain, message)
                        if (!signature) {
                              throw new Error("Failed to sign message")
                        }
                        return signature
                  }
                  // Generate DNS claim using new format
                  const dnsClaim = await generateDNSClaim(
                        domain,
                        walletAddress,
                        dataGen,
                        expirationDays,
                        publicAssociation
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

                  // Store complete claim as JSON string for easy download
                  // filteredData['claim_json'] = JSON.stringify(dnsClaim, null, 2)
            }
            return { filteredData }
      }

      // Function to create genesis aqua tree
      const createGenesisAquaTree = async (completeFormData: Record<string, string | File | number>, fileName: string, aquafier: Aquafier) => {
            const estimateSize = estimateFileSize(JSON.stringify(completeFormData))
            const jsonString = JSON.stringify(completeFormData)
            const fileObject: FileObject = {
                  fileContent: jsonString,
                  fileName: fileName,
                  path: './',
                  fileSize: estimateSize,
            }

            const genesisAquaTree = await aquafier.createGenesisRevision(fileObject, true, false, false)

            if (genesisAquaTree.isErr()) {
                  throw new Error('Error creating genesis aqua tree')
            }

            return { genesisAquaTree: genesisAquaTree.data.aquaTree!, fileObject }
      }

      // Function to link aqua tree
      const linkToSystemAquaTree = async (genesisAquaTree: AquaTree, fileObject: FileObject, templateApiFileInfo: ApiFileInfo, aquafier: Aquafier) => {
            const mainAquaTreeWrapper: AquaTreeWrapper = {
                  aquaTree: genesisAquaTree,
                  revision: '',
                  fileObject: fileObject,
            }

            // console.log(`linking to system aqua tree ${JSON.stringify(templateApiFileInfo.aquaTree!, null, 4)}`)

            const linkedAquaTreeFileObj = getAquaTreeFileObject(templateApiFileInfo)
            if (!linkedAquaTreeFileObj) {
                  throw new Error('System Aqua tree has error')
            }

            const linkedToAquaTreeWrapper: AquaTreeWrapper = {
                  aquaTree: templateApiFileInfo.aquaTree!,
                  revision: '',
                  fileObject: linkedAquaTreeFileObj,
            }

            const linkedAquaTreeResponse = await aquafier.linkAquaTree(mainAquaTreeWrapper, linkedToAquaTreeWrapper)

            if (linkedAquaTreeResponse.isErr()) {
                  throw new Error('Error linking aqua tree')
            }

            return linkedAquaTreeResponse.data.aquaTree!
      }

      // Function to process file attachments
      const processFileAttachments = async (selectedTemplate: FormTemplate, completeFormData: Record<string, string | File | number>, aquaTreeData: AquaTree, fileObject: FileObject, aquafier: Aquafier) => {
            const containsFileData = selectedTemplate?.fields.filter((e: FormField) => e.type === 'file' || e.type === 'scratchpad' || e.type === 'image' || e.type === 'document')

            if (!containsFileData || containsFileData.length === 0) {
                  return aquaTreeData
            }

            const fileProcessingPromises = containsFileData.map(async (element: FormField) => {
                  const file: File = completeFormData[element.name] as File

                  if (!file) {
                        console.warn(`No file found for field: ${element.name}`)
                        return null
                  }

                  if (typeof file === 'string' || !(file instanceof File)) {
                        console.warn(`Invalid file type for field: ${element.name}. Expected File object, got:`, typeof file)
                        return null
                  }

                  try {
                        const arrayBuffer = await file.arrayBuffer()
                        const uint8Array = new Uint8Array(arrayBuffer)

                        const fileObjectPar: FileObject = {
                              fileContent: uint8Array,
                              fileName: file.name,
                              path: './',
                              fileSize: file.size,
                        }

                        return fileObjectPar
                  } catch (error) {
                        console.error(`Error processing file ${file.name}:`, error)
                        throw new Error(`Error processing file ${file.name}`)
                  }
            })

            const fileObjects = await Promise.all(fileProcessingPromises)
            const validFileObjects = fileObjects.filter(obj => obj !== null) as FileObject[]

            let currentAquaTreeData = aquaTreeData

            for (const item of validFileObjects) {
                  const aquaTreeResponse = await aquafier.createGenesisRevision(item)

                  if (aquaTreeResponse.isErr()) {
                        throw new Error('Error creating aqua tree for file')
                  }

                  await saveAquaTree(aquaTreeResponse.data.aquaTree!, item, true, true)

                  const aquaTreeWrapper: AquaTreeWrapper = {
                        aquaTree: currentAquaTreeData,
                        revision: '',
                        fileObject: fileObject,
                  }

                  const aquaTreeWrapper2: AquaTreeWrapper = {
                        aquaTree: aquaTreeResponse.data.aquaTree!,
                        revision: '',
                        fileObject: item,
                  }

                  const res = await aquafier.linkAquaTree(aquaTreeWrapper, aquaTreeWrapper2)

                  if (res.isErr()) {
                        throw new Error('Error linking file aqua tree')
                  }

                  currentAquaTreeData = res.data.aquaTree!
            }

            return currentAquaTreeData
      }

      // Function to sign aqua tree
      const signAquaTree = async (aquaTreeData: AquaTree, fileObject: FileObject, aquafier: Aquafier) => {
            const aquaTreeWrapper: AquaTreeWrapper = {
                  aquaTree: aquaTreeData,
                  revision: '',
                  fileObject: fileObject,
            }

            if (webConfig.AUTH_PROVIDER == "metamask") {
                  const aquaTreeWrapper: AquaTreeWrapper = {
                        aquaTree: aquaTreeData,
                        revision: '',
                        fileObject: fileObject,
                  }

                  const signRes = await aquafier.signAquaTree(aquaTreeWrapper, 'metamask', dummyCredential())

                  if (signRes.isErr()) {
                        throw new Error('Error signing failed')
                  }

                  return signRes.data.aquaTree!
            } else {

                  // const signRes = await aquafier.signAquaTree(aquaTreeWrapper, 'metamask', dummyCredential())
                  const targetRevisionHash = getLastRevisionVerificationHash(aquaTreeData)
                  // Sign using WalletConnect via ethers adapter
                  const messageToSign = `I sign this revision: [${targetRevisionHash}]`
                  // const provider: any = walletProvider
                  const provider = await getAppKitProvider()

                  // Convert message to hex format for Core Wallet compatibility
                  const messageHex = stringToHex(messageToSign)

                  let signature
                  try {
                        signature = await provider.request({
                              method: 'personal_sign',
                              params: [messageHex, session?.address!]
                        })
                  } catch (hexError) {
                        // Fallback to plain text for wallets that don't accept hex
                        signature = await provider.request({
                              method: 'personal_sign',
                              params: [messageToSign, session?.address!]
                        })
                  }

                  // const signature = await signer.signMessage(messageToSign)

                  const signRes = await aquafier.signAquaTree(aquaTreeWrapper, 'inline', dummyCredential(), true, undefined, {
                        signature: signature,
                        walletAddress: session?.address!,
                  })


                  if (signRes.isErr()) {
                        throw new Error('Error signing failed')
                  }

                  return signRes.data.aquaTree!
            }
      }

      const loadThisTreeFromSystem = async (aquaTree: AquaTree): Promise<ApiFileInfo | null> => {
            try {
                  // Get ordered revision hashes from genesis to latest
                  const orderedRevisionHashes = reorderRevisionsInAquaTree(aquaTree!)

                  const url = `${backend_url}/${API_ENDPOINTS.GET_AQUA_TREE}`
                  const res = await axios.post(url, {
                        revisionHashes: orderedRevisionHashes
                  }, {
                        headers: {
                              'Content-Type': 'application/json',
                              nonce: session?.nonce,
                        },
                  })
                  if (res.status === 200) {
                        return res.data.data
                  }
            } catch (error) {
                  return null
            }
            return null
      }

      // Function to handle post-signing actions
      const handlePostSigning = async (signedAquaTree: AquaTree, fileObject: FileObject, completeFormData: Record<string, string | File | number>, selectedTemplate: FormTemplate, session: Session | null, selectedFileInfo: ApiFileInfo | null) => {
            fileObject.fileContent = completeFormData

            const savedResult = await saveAquaTree(signedAquaTree, fileObject, true)
            console.log("Saved result: ", savedResult)

            // Handle aqua_sign specific logic
            if (selectedTemplate && selectedTemplate.name === 'aqua_sign' && session?.address) {
                  if (completeFormData['signers'] !== session?.address) {
                        await shareAquaTree(signedAquaTree, completeFormData['signers'] as string)
                  }
            }

            // Handle identity_attestation specific logic
            if (selectedTemplate && selectedTemplate.name === 'identity_attestation') {
                  console.log(`handling identity attestation post signing`)

                  let walletAddress = "";


                  const allHashes = Object.keys(selectedFileInfo!.aquaTree!.revisions!)
                  let secondRevision: Revision | null = null

                  if (allHashes.length >= 2) {
                        secondRevision = selectedFileInfo!.aquaTree!.revisions![allHashes[2]]
                  }

                  if (secondRevision == null || !secondRevision.signature_wallet_address) {
                        // throw new Error('No second revision found in claim, unable to share with claim creator')

                        console.warn('No second revision found in claim, attempting to get wallet from genesis revision')

                        let genHash = getGenesisHash(signedAquaTree)
                        if (!genHash) {
                              throw new Error('Genesis hash not found in signed aqua tree')
                        }
                        let revision = signedAquaTree.revisions![genHash]
                        if (!revision) {
                              throw new Error('Revision not found for genesis hash in signed aqua tree')
                        }
                        if (!revision["forms_claim_wallet_address"]) {
                              throw new Error('forms_claim_wallet_address not found in revision of signed aqua tree')
                        }

                        console.log(`found genesis revision wallet address: ${revision["forms_claim_wallet_address"]}`)
                        walletAddress = revision["forms_claim_wallet_address"] as string


                  } else {
                        walletAddress = secondRevision.signature_wallet_address!
                  }


                  console.log(`sharing identity attestation with claim creator at wallet address: ${walletAddress}`)




                  if (walletAddress && walletAddress.length > 0) {

                        await saveAquaTree(signedAquaTree, fileObject, true, false, walletAddress)// secondRevision.signature_wallet_address!)
                  } else {
                        console.warn('No wallet address found to share identity attestation with claim creator')
                  }

            }

            await triggerWorkflowReload(selectedTemplate.name, true);

            if (selectedTemplate.name === 'identity_attestation') {
                  await triggerWorkflowReload(RELOAD_KEYS.user_profile);
            }
            // Trigger reload for contacts if not aqua_sign
            if (!["aqua_sign", "access_agreement", "cheque", "dba_claim"].includes(selectedTemplate.name)) {
                  await triggerWorkflowReload(RELOAD_KEYS.contacts);
            }

            // Do navigation here for aqua_sign
            if (selectedTemplate.name === "aqua_sign") {
                  let apiFileInfoFromSystem = await loadThisTreeFromSystem(signedAquaTree)
                  if (apiFileInfoFromSystem) {
                        setSelectedFileInfo(apiFileInfoFromSystem)
                        // navigate('/app/pdf/workflow')
                        try {
                              let genesisHash = getGenesisHash(signedAquaTree)
                              if (genesisHash && session?.address) {
                                    let genesisRevision = signedAquaTree.revisions[genesisHash]
                                    let signers = genesisRevision?.forms_signers
                                    if (signers) {
                                          let signersArray = signers.split(",").map((item: string) => item.trim().toLocaleLowerCase())
                                          let activeUserAddress = session.address.toLocaleLowerCase()
                                          let isUserSigner = signersArray.find((signer: string) => signer === activeUserAddress)
                                          if (isUserSigner) {
                                                navigate('/app/pdf/workflow/2')
                                          }
                                    } else {

                                          navigate('/app/pdf/workflow')
                                    }
                              }
                        } catch (error: any) {
                              navigate('/app/pdf/workflow')
                        }
                  }
            }
      }

      // Clear signature canvas
      const clearSignature = () => {
            if (signatureRef.current) {
                  signatureRef.current.clear()
            }
      }

      // Generate signature from text (name or initials)
      const generateSignatureFromText = useCallback((text: string, isInitials: boolean = false) => {
            if (!signatureRef.current || !text.trim()) return

            const canvas = signatureRef.current.getCanvas()
            const ctx = canvas.getContext('2d')
            if (!ctx) return

            // Clear the canvas first
            signatureRef.current.clear()

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
      }, [])

      // Get user's name from session or form data for signature generation
      const getUserNameForSignature = useCallback((): string => {
            // Try to get name from form data first
            const nameField = formData['name'] || formData['full_name'] || formData['signer_name']
            if (nameField && typeof nameField === 'string') return nameField

            // Fallback to session address (shortened)
            if (session?.address) {
                  return `${session.address.slice(0, 6)}...${session.address.slice(-4)}`
            }
            return 'User'
      }, [formData, session?.address])

      // Main refactored function
      const createWorkflowFromTemplate = async (e: React.FormEvent) => {
            e.preventDefault()

            try {

                  setModalFormErorMessae('')

                  if (submittingTemplateData) {
                        toast.info('Data submission not completed, try again after some time.')
                        return
                  }
                  setSubmittingTemplateData(true)

                  // Step 1: Prepare complete form data
                  let completeFormData = prepareCompleteFormData(formData, selectedTemplate, multipleAddresses)
                  setFormData(completeFormData)

                  // Step 2: Validate fields
                  validateFields(completeFormData, selectedTemplate)



                  for (const fieldItem of selectedTemplate.fields) {
                        const filledValue = completeFormData[fieldItem.name]


                        // ensure there is code input for all verifiable data
                        if (fieldItem.is_verifiable) {
                              let verificationCodeData = formData[`${fieldItem.name}_verification`]

                              try {
                                    const url = `${backend_url}/verify_code`
                                    const response = await axios.post(
                                          url,
                                          {
                                                email_or_phone_number: filledValue,
                                                code: verificationCodeData
                                          },
                                          {
                                                headers: {
                                                      nonce: session?.nonce,
                                                },
                                          }
                                    )

                                    if (response.status == 200) {
                                          toast.success(`verification code verified sucessfully`)

                                          setFormData(prev =>
                                                Object.fromEntries(
                                                      Object.entries(prev).filter(([key]) => key !== `${fieldItem.name}_verification`)
                                                )
                                          );
                                    }
                              } catch (e) {
                                    toast.error(`Error verfying code.`)
                                    return
                              }
                        }

                  }


                  // console.log(`4.`)
                  // console.log(`B4 getSystemFiles ${JSON.stringify(systemFileInfo, null, 4)}`)
                  // Step 3: Get system files
                  const allSystemFiles = await getSystemFiles(systemFileInfo, backend_url, session?.address || '')
                  setSystemFileInfo(allSystemFiles)

                  // console.log(`5.`)
                  // Step 4: Find template API file info
                  const templateApiFileInfo = findTemplateApiFileInfo(allSystemFiles, selectedTemplate)

                  // console.log(`6.`)
                  // Step 5: Initialize aquafier and prepare data
                  const aquafier = new Aquafier()
                  const fileName = generateFileName(selectedTemplate, completeFormData)

                  // console.log(`7.`)
                  //  console.log(`see me ...3`)
                  // Step 6: Handle identity attestation specific logic
                  if (selectedTemplate?.name === 'identity_attestation') {
                        completeFormData = handleIdentityAttestation(completeFormData, selectedFileInfo)
                  } else if (selectedTemplate?.name === 'dba_claim') {

                        let dbaUrl = completeFormData['url'] as string
                        if (!dbaUrl.includes('courts.delaware.gov')) {
                              toast.error(`Please enter a DBA url expecting to find your trade name at courts.delaware.gov`)
                              setSubmittingTemplateData(false)
                              return
                        }

                        try {
                              const url = ensureDomainUrlHasSSL(`${backend_url}/scrape_data`)
                              const response = await axios.post(url, {
                                    domain: completeFormData['url']
                              },
                                    {
                                          headers: {
                                                nonce: session?.nonce,
                                          },
                                    }
                              )
                              completeFormData = response.data.data.tradeNameDetails

                              completeFormData['delegated_wallets'] = multipleAddresses.join(',')

                        } catch (e) {
                              toast.error(`Error fetching data from url.`)
                              setSubmittingTemplateData(false)
                              return
                        }

                  }

                  //  console.log('Complete form data: ', completeFormData)
                  console.log(`8.`)
                  // Step 7: Prepare final form data
                  const finalFormDataRes = await prepareFinalFormData(completeFormData, selectedTemplate)

                  if (!finalFormDataRes) {
                        toast.info('Final form data preparation failed.')
                        throw new Error('Final form data preparation failed')
                  }

                  const finalFormDataFiltered = finalFormDataRes.filteredData
                  // Step 8: Create genesis aqua tree
                  const { genesisAquaTree, fileObject } = await createGenesisAquaTree(finalFormDataFiltered, fileName, aquafier)
                  console.log(`10.`)
                  // Step 9: Link to system aqua tree
                  let aquaTreeData = await linkToSystemAquaTree(genesisAquaTree, fileObject, templateApiFileInfo, aquafier)

                  // check if the types contains scratchpad
                  // let newCompleteData = completeFormData
                  for (const fieldItem of selectedTemplate.fields) {
                        if (fieldItem.type === 'scratchpad') {
                              if (signatureRef.current) {
                                    const dataUrl = signatureRef.current.toDataURL('image/png')
                                    const epochInSeconds = Math.floor(Date.now() / 1000)
                                    const lastFiveCharactersOfWalletAddres = session?.address.slice(-5)
                                    const signatureFileName = `user_signature_${lastFiveCharactersOfWalletAddres}_${epochInSeconds}.png`
                                    const signatureFile = dataURLToFile(dataUrl, signatureFileName)
                                    completeFormData[`scratchpad`] = signatureFile
                              }
                              break;
                        }
                  }

                  // Step 10: Process file attachments
                  aquaTreeData = await processFileAttachments(
                        selectedTemplate,
                        completeFormData,
                        aquaTreeData,
                        fileObject,
                        aquafier
                  )



                  if (selectedTemplate?.name !== 'aqua_sign') {
                        // Step 11: Sign aqua tree
                        const signedAquaTree = await signAquaTree(aquaTreeData, fileObject, aquafier)
                        clearSignature()

                        // Step 12: Handle post-signing actions
                        await handlePostSigning(signedAquaTree, fileObject, finalFormDataFiltered, selectedTemplate, session, selectedFileInfo)
                  } else {
                        await handlePostSigning(aquaTreeData, fileObject, finalFormDataFiltered, selectedTemplate, session, selectedFileInfo)

                  }
                  // aqua sign signing happen in the server 




            } catch (error: any) {
                  setSubmittingTemplateData(false)

                  // Handle validation errors with specific messages
                  if (error.message.includes('is mandatory') || error.message.includes('is not a valid') || error.message.includes('is a duplicate')) {
                        setModalFormErorMessae(error.message)
                  } else {
                        toast.error('Error creating Aqua tree from template', {
                              description: error?.message ?? 'Unknown error',
                              duration: 5000,
                        })
                  }
            } finally {
                  setSubmittingTemplateData(false)
            }
      }

      const getFieldIcon = (type: string) => {
            switch (type) {
                  case 'string':
                        return <Pen className="h-4 w-4" />
                  case 'wallet_address':
                        return <Wallet className="h-4 w-4" />
                  case 'domain':
                        return <Link className="h-4 w-4" />
                  case 'document':
                        return <FileText className="h-4 w-4" />
                  case 'image':
                        return <Image className="h-4 w-4" />
                  case 'file':
                        return <Upload className="h-4 w-4" />
                  default:
                        return null
            }
      }

      const onBack = () => {
            // navigate('/templates')
            callBack && callBack()
      }

      const getInputType = (fieldType: string): string => {
            if (fieldType === 'image' || fieldType === 'document') {
                  return 'file'
            }
            if (['text', 'domain', 'wallet_address', 'signature', 'email'].includes(fieldType)) {
                  return 'text'
            }
            return fieldType // or return 'text' as a safe default
      }


      // ============================================
      // RENDER HELPER FUNCTIONS
      // ============================================

      /** Renders the form error alert */
      const renderFormError = () => {
            if (modalFormErorMessae.length === 0) return null
            return (
                  <Alert variant="destructive" className="border-red-200 bg-red-50">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{modalFormErorMessae}</AlertDescription>
                  </Alert>
            )
      }

      // Drag and drop sensors for signer reordering
      const sensors = useSensors(
            useSensor(PointerSensor, {
                  activationConstraint: {
                        distance: 8, // Require 8px movement before starting drag
                  },
            }),
            useSensor(KeyboardSensor, {
                  coordinateGetter: sortableKeyboardCoordinates,
            })
      )

      // Generate unique IDs for each signer (using index + address hash for stability)
      const getSignerIds = () => multipleAddresses.map((_, index) => `signer-${index}`)

      /** Handles drag end event for reordering signers */
      const handleDragEnd = (event: DragEndEvent) => {
            const { active, over } = event

            if (over && active.id !== over.id) {
                  const oldIndex = parseInt(String(active.id).split('-')[1])
                  const newIndex = parseInt(String(over.id).split('-')[1])

                  setMultipleAddresses((items) => arrayMove(items, oldIndex, newIndex))
            }
      }

      /** Renders the array field (multiple signers) with drag-and-drop reordering */
      const renderArrayField = (field: FormField, fieldIndex: number) => {
            const signerIds = getSignerIds()

            return (
                  <div key={`field-${fieldIndex}`} className="space-y-4">
                        <div className="flex items-center justify-between">
                              <div>
                                    <Label className="text-base sm:text-lg font-medium text-gray-900">
                                          {field.label}
                                          {field.required && <span className="text-red-500 ml-1">*</span>}
                                    </Label>
                                    {field.description && (
                                          <p className="text-sm text-gray-500 mt-1">{field.description}</p>
                                    )}
                                    <p className="text-xs text-gray-400 mt-1">
                                          <GripVertical className="h-3 w-3 inline-block mr-1" />
                                          Drag to reorder signers
                                    </p>
                              </div>
                              <Button
                                    variant="outline"
                                    size="sm"
                                    type="button"
                                    className="rounded-lg hover:bg-blue-50 hover:border-blue-300"
                                    onClick={addAddress}
                                    data-testid={`multiple_values_${field.name}`}
                              >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add Signer
                              </Button>
                        </div>

                        <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={handleDragEnd}
                        >
                              <SortableContext items={signerIds} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-3">
                                          {multipleAddresses.map((address, index) => (
                                                <SortableSignerItem
                                                      key={signerIds[index]}
                                                      id={signerIds[index]}
                                                      index={index}
                                                      address={address}
                                                      field={field}
                                                      multipleAddresses={multipleAddresses}
                                                      setMultipleAddresses={setMultipleAddresses}
                                                      // walletAddresses={walletAddresses}
                                                      onRemove={removeAddress}
                                                      canRemove={multipleAddresses.length > 1}
                                                />
                                          ))}
                                    </div>
                              </SortableContext>
                        </DndContext>
                  </div>
            )
      }

      /**Render options field if others show the input text */

      const renderOptionsField = (field: FormField, fieldIndex: number) => {

            let otherFieldsExist = selectedTemplate.fields.find((f: FormField) => f.depend_on_field === field.name && f.depend_on_value?.toLocaleLowerCase() === 'other' && f.is_hidden === true)
            if (!otherFieldsExist) {
                  console.warn(`No dependent 'Other' field found for options field: ${field.name}`)
            }

            return <div className="space-y-2" key={`fieldKey_${fieldIndex}`}>
                  <Select
                        onValueChange={(value) => {
                              let fieldName = field.name
                              setFormData(prev => ({ ...prev, [fieldName]: value }))
                        }}
                  >
                        <SelectTrigger id={`input-options-${field.name}`} data-testid={`input-options-${field.name}`} className="w-full">
                              <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                              {field.options?.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                              ))}

                        </SelectContent>
                  </Select>

                  {otherFieldsExist && (
                        <>

                              {((formData[field.name] as string) ?? '')?.toLocaleLowerCase() === 'other' && otherFieldsExist && (
                                    <Label htmlFor={`input-options-other`} className="text-sm font-medium text-gray-900">
                                          Please specify
                                    </Label>
                              )}
                              {((formData[field.name] as string) ?? '').toLocaleLowerCase() === 'other' && otherFieldsExist && (
                                    <Input
                                          id={`input-options-other`}
                                          data-testid={`input-options-other`}
                                          className="w-full px-2 sm:px-3 py-1 sm:py-2 border border-gray-200 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm sm:text-base"
                                          placeholder="Please specify"
                                          onChange={(e) => {
                                                let fieldName = otherFieldsExist!.name
                                                setFormData(prev => ({ ...prev, [fieldName]: e.target.value }))
                                          }}
                                    />
                              )}
                        </>
                  )}
            </div>
      }
      /** Renders the signature/scratchpad field with Reset, Generate from Name, and Initials buttons */
      const renderScratchpadField = () => (
            <div className="space-y-3">
                  <div
                        ref={containerRef}
                        className="border border-gray-200 rounded-lg w-full h-[200px] bg-white relative"
                  >
                        <SignatureCanvas
                              ref={signatureRef}
                              canvasProps={{
                                    id: 'signature-canvas-id',
                                    width: canvasSize.width,
                                    height: canvasSize.height,
                                    style: { width: '100%', height: '100%' },
                                    className: 'signature-canvas cursor-crosshair',
                              }}
                              backgroundColor="transparent"
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-300 text-sm">
                              Draw your signature here
                        </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                        <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={clearSignature}
                              className="flex items-center gap-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                        >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Reset
                        </Button>

                        <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => generateSignatureFromText(getUserNameForSignature(), false)}
                              className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 hover:border-blue-300"
                        >
                              <Type className="h-3.5 w-3.5" />
                              Generate from Name
                        </Button>

                        <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => generateSignatureFromText(getUserNameForSignature(), true)}
                              className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 hover:border-indigo-300"
                        >
                              <User className="h-3.5 w-3.5" />
                              Initials
                        </Button>
                  </div>

                  <p className="text-xs text-gray-500">
                        Draw your signature above, or use the buttons to generate one automatically.
                  </p>
            </div>
      )

      /** Renders a single form field - extracted for reuse in aqua_sign steps */
      const renderSingleField = (field: FormField, fieldIndex: number) => {
            if (field.is_hidden) return null

            // Use helper function for array fields (multiple signers)
            if (field.is_array) {
                  return renderArrayField(field, fieldIndex)
            }

            return (
                  <div key={`field-${fieldIndex}`} className="space-y-2 sm:space-y-3">
                        <div className="flex items-center gap-2">
                              {getFieldIcon(field.type)}
                              <Label htmlFor={`input-${field.name}`} className="text-base font-medium text-gray-900">
                                    {field.label}
                                    {field.required && <span className="text-red-500">*</span>}
                              </Label>
                        </div>

                        {/* Text, Number, Date, Domain, Email fields */}
                        {['text', 'number', 'date', 'domain', 'email'].includes(field.type) && (
                              <>
                                    <Input
                                          id={`input-${field.name}`}
                                          data-testid={`input-${field.name}`}
                                          className="w-full px-2 sm:px-3 py-1 sm:py-2 border border-gray-200 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm sm:text-base"
                                          placeholder={getFieldPlaceholder(field)}
                                          disabled={field.is_editable === false}
                                          defaultValue={(() => {
                                                const val = getFieldDefaultValue(field, formData[field.name])
                                                return val instanceof File ? undefined : val
                                          })()}
                                          onChange={(e) => handleTextInputChange(e, field)}
                                    />

                                    {field.support_text && (
                                          <p className="text-xs text-gray-500">{field.support_text}</p>
                                    )}
                                    {/* Verification code section for verifiable fields */}
                                    {field.is_verifiable && (
                                          <>
                                                <Button
                                                      type="button"
                                                      data-testid={`send-verification-code-${field.name}`}
                                                      disabled={!verfyingFormFieldEnabled || !verfyingFormFieldEnabled?.isTwilioEnabled}
                                                      onClick={() => handleSendVerificationCode(field)}
                                                      className={`w-full flex items-center justify-center space-x-1 bg-blue-100 text-blue-700 px-3 py-2 rounded transition-colors text-xs ${verifyingFormField === `field-${field.name}` ? 'opacity-60 cursor-not-allowed' : 'hover:bg-blue-200'
                                                            }`}
                                                >
                                                      {verifyingFormField === `field-${field.name}` ? (
                                                            <>
                                                                  <Loader2 className="animate-spin h-3 w-3 mr-1" />
                                                                  <span>Sending code...</span>
                                                            </>
                                                      ) : (
                                                            <>
                                                                  <Send className="w-4 h-4" />
                                                                  <span>Send Code</span>
                                                            </>
                                                      )}
                                                </Button>

                                                <div className="flex items-center gap-2">
                                                      <BookCheck className="h-4 w-4" />
                                                      <Label
                                                            htmlFor={`input-verification-${field.name}`}
                                                            className="text-base font-medium text-gray-900"
                                                      >
                                                            Verification code for {field.label}
                                                            <span className="text-red-500">*</span>
                                                      </Label>
                                                </div>

                                                <Input
                                                      id={`input-verification-${field.name}`}
                                                      data-testid={`input-verification-${field.name}`}
                                                      className="w-full px-2 sm:px-3 py-1 sm:py-2 border border-gray-200 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm sm:text-base"
                                                      placeholder="Type code here..."
                                                      onChange={(e) => handleVerificationCodeChange(e, field.name)}
                                                />
                                          </>
                                    )}
                              </>
                        )}

                        {/* Signature/Scratchpad field with Reset, Generate from Name, Initials */}
                        {field.type === 'scratchpad' && renderScratchpadField()}


                        {/* option field with Reset, Generate from Name, Initials */}
                        {field.type === 'options' && renderOptionsField(field, fieldIndex)}




                        {/* Wallet address field */}
                        {field.type === 'wallet_address' && (
                              field.is_editable === false ? (
                                    <Input
                                          id={`input-${field.name}`}
                                          data-testid={`input-${field.name}`}
                                          className="rounded-md border-gray-200 focus:border-blue-500 focus:ring-blue-500 text-sm sm:text-base h-9 sm:h-10"
                                          disabled
                                          defaultValue={(() => {
                                                const val = getFieldDefaultValue(field, formData[field.name])
                                                return val instanceof File ? undefined : val
                                          })()}
                                    />
                              ) : (
                                    <WalletAutosuggest
                                          field={field}
                                          index={1}
                                          address={formData[field.name] ? (formData[field.name] as string) : ''}
                                          multipleAddresses={[]}
                                          setMultipleAddresses={(data) => handleWalletAddressSelect(data, field.name)}
                                          placeholder="Enter signer wallet address"
                                          className="rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                                    />
                              )
                        )}

                        {/* Document, Image, File upload fields */}
                        {['document', 'image', 'file'].includes(field.type) && (
                              <div className="relative">
                                    <Input
                                          id={`input-${field.name}`}
                                          data-testid={`input-${field.name}`}
                                          className="rounded-md border-gray-200 focus:border-blue-500 focus:ring-blue-500 text-sm sm:text-base h-9 sm:h-10"
                                          type={getInputType(field.type)}
                                          required={field.required}
                                          disabled={field.is_editable === false}
                                          accept={field.type === 'document' ? '.pdf' : field.type === 'image' ? 'image/*' : undefined}
                                          placeholder={getFieldPlaceholder(field)}
                                          onChange={(e) => handleFileInputChange(e, field)}
                                    />

                                    {field.support_text && (
                                          <p className="text-xs text-gray-500">{field.support_text}</p>
                                    )}

                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                          <Upload className="h-4 w-4 text-gray-400" />
                                    </div>
                              </div>
                        )}

                        {field.name === 'sender' && (
                              <p className="text-xs text-gray-500">
                                    {field.support_text
                                          ? field.support_text
                                          : 'The sender is the person who initiates the document signing process. This field is auto-filled with your wallet address.'}
                              </p>
                        )}
                  </div>
            )
      }

      /** Renders the aqua_sign form with multi-step UI */
      const renderAquaSignForm = () => {
            const fields = reorderInputFields(selectedTemplate!.fields)
            const documentField = fields.find(f => f.type === 'document')
            const otherFields = fields.filter(f => f.type !== 'document')

            // Check if user has added themselves to signers
            const userInSigners = multipleAddresses.some(addr =>
                  addr.toLowerCase() === session?.address?.toLowerCase()
            )

            return (
                  <>
                        {/* Step indicator */}
                        <div className="flex items-center justify-center mb-6">
                              <div className="flex items-center gap-2">
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${aquaSignStep === 1
                                          ? 'bg-blue-600 text-white'
                                          : 'bg-green-500 text-white'
                                          }`}>
                                          {aquaSignStep === 1 ? '1' : '✓'}
                                    </div>
                                    <span className={`text-sm ${aquaSignStep === 1 ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                                          Select Document
                                    </span>
                                    <div className="w-12 h-0.5 bg-gray-300 mx-2" />
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${aquaSignStep === 2
                                          ? 'bg-blue-600 text-white'
                                          : 'bg-gray-300 text-gray-600'
                                          }`}>
                                          2
                                    </div>
                                    <span className={`text-sm ${aquaSignStep === 2 ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                                          Add Signers
                                    </span>
                              </div>
                        </div>

                        {/* Step 1: Document Selection */}
                        {aquaSignStep === 1 && documentField && (
                              <div className="space-y-4">
                                    <div className="text-center mb-4">
                                          <h3 className="text-lg font-medium text-gray-900">Select the PDF document to be signed</h3>
                                          <p className="text-sm text-gray-500 mt-1">Upload the document that requires signatures</p>
                                    </div>
                                    {renderSingleField(documentField, 0)}

                                    <div className="flex justify-end pt-4">
                                          <Button
                                                type="button"
                                                onClick={() => {
                                                      // Validate document is selected before proceeding
                                                      if (!formData['document']) {
                                                            toast.error('Please select a document first')
                                                            return
                                                      }
                                                      setAquaSignStep(2)
                                                }}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                                                disabled={!formData['document']}
                                          >
                                                Go to Add signers
                                          </Button>
                                    </div>
                              </div>
                        )}

                        {/* Step 2: Sender and Signers */}
                        {aquaSignStep === 2 && (
                              <div className="space-y-4">
                                    <div className="text-center mb-4">
                                          <h3 className="text-lg font-medium text-gray-900">Add signers for this document</h3>
                                          <p className="text-sm text-gray-500 mt-1">Specify who needs to sign this document</p>
                                    </div>

                                    {!userInSigners && (
                                          <Alert className="border-amber-200 bg-amber-50">
                                                <AlertCircle className="h-4 w-4 text-amber-600" />
                                                <AlertDescription className="text-amber-800">

                                                      You haven't added yourself as a signer. If you need to sign this document, add your wallet address to the signers list.
                                                      <Button onClick={() => {
                                                            if (session) {
                                                                  setMultipleAddresses(curr => [...curr, session?.address])
                                                            }
                                                      }}>
                                                            Add Yourself
                                                      </Button>
                                                </AlertDescription>
                                          </Alert>
                                    )}

                                    {otherFields.map((field, idx) => renderSingleField(field, idx))}
                                    {/* Warning if user hasn't added themselves */}

                                    <div className="flex justify-between pt-4">
                                          <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setAquaSignStep(1)}
                                                className="px-6"
                                          >
                                                Back
                                          </Button>
                                    </div>
                              </div>
                        )}
                  </>
            )
      }

      /** Handles text input change with validation */
      const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: FormField) => {
            if (field.is_editable === false) {
                  toast.error(`${field.label} cannot be changed`)
                  return
            }

            if (field.default_value !== undefined && field.default_value !== null && field.default_value !== '') {
                  e.target.value = field.default_value
                  toast.error(`${field.label} cannot be changed`)
            }

            setFormData({
                  ...formData,
                  [field.name]: e.target.value,
            })
      }

      /** Handles file input change with validation */
      const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: FormField) => {
            if (field.is_editable === false) {
                  toast.error(`${field.label} cannot be changed`)
                  return
            }

            if (selectedTemplate?.name === 'aqua_sign' && field.name.toLowerCase() === 'sender') {
                  return
            }

            // Validate image files
            if (field.type === 'image') {
                  const files = e?.target?.files
                  if (files && files.length > 0) {
                        const file = files[0]
                        if (!file.type.startsWith('image/')) {
                              alert('Please select an image file')
                              e.target.value = ''
                              return
                        }
                  }
            }

            // Validate PDF files
            if (field.type === 'document') {
                  const files = e?.target?.files
                  if (files && files.length > 0) {
                        const file = files[0]
                        if (file.type !== 'application/pdf') {
                              alert('Please select a PDF file')
                              e.target.value = ''
                              return
                        }
                  }
            }

            const isFileInput = field.type === 'file' || field.type === 'image' || field.type === 'document'
            const value = isFileInput && e.target.files ? e.target.files[0] : e.target.value

            if (field.default_value !== undefined && field.default_value !== null && field.default_value !== '') {
                  e.target.value = field.default_value
                  toast.error(`${field.label} cannot be changed`)
            }

            setFormData({
                  ...formData,
                  [field.name]: value,
            })
      }

      /** Gets the placeholder text for a field */
      const getFieldPlaceholder = (field: FormField): string => {
            if (field.type === 'domain') return 'Fill in the Domain Name (FQDN)'
            if (field.type === 'date') return 'Select a date'
            if (field.type === 'document') return 'Upload PDF document'
            return `Enter ${field.label.toLowerCase()}`
      }

      /** Handles sending verification code for verifiable fields (email/phone) */
      const handleSendVerificationCode = async (field: FormField) => {
            if (!verfyingFormFieldEnabled) {
                  toast.error('Unable to fetch code verification details')
                  return
            }

            if (verfyingFormFieldEnabled?.isTwilioEnabled === false) {
                  toast.error('Twilio is not enabled, set the .env and restart the docker container')
                  return
            }

            setVerifyingFormField(`field-${field.name}`)

            const filledValue = formData[field.name]

            if (!filledValue || (filledValue as string).length === 0) {
                  toast.error(`${field.label} is empty`)
                  setVerifyingFormField('')
                  return
            }

            // Allow test values in dev environments
            if (filledValue === '000-000-0000' || filledValue === 'test@inblock.io.com') {
                  if (window.location.hostname === 'localhost' || window.location.hostname === 'dev.inblock.io') {
                        toast.info('Using test value, no code will be sent')
                  } else {
                        setVerifyingFormField('')
                        return toast.error(`Please provide a valid ${field.label} to receive verification code`)
                  }
            }

            try {
                  const url = `${backend_url}/send_code`
                  const response = await axios.post(
                        url,
                        {
                              email_or_phone_number: filledValue,
                              name: field.name
                        },
                        {
                              headers: { nonce: session?.nonce }
                        }
                  )

                  if (response.status === 200) {
                        toast.success('Verification code sent successfully')
                  }
            } catch (e: any) {
                  toast.error(`Verification code not sent ${e?.response?.data?.message ?? ''}`)
            } finally {
                  setVerifyingFormField('')
            }
      }

      /** Handles verification code input change */
      const handleVerificationCodeChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
            setFormData({
                  ...formData,
                  [`${fieldName}_verification`]: e.target.value,
            })
      }

      /** Handles wallet address selection from autosuggest */
      const handleWalletAddressSelect = (data: string[], fieldName: string) => {
            const selectedAddress = data[0]
            if (selectedAddress) {
                  setFormData({
                        ...formData,
                        [fieldName]: selectedAddress,
                  })
            }
      }

      const getTemplateTitle = () => {
            if (selectedTemplate?.name === "aqua_sign") {
                  return "AquaSign"
            }
            return selectedTemplate.title
      }

      if (!selectedTemplate) {
            return <div className="min-h-[100%] px-2 sm:px-4">
                  Selected template not found, check db migrations.
            </div>
      }

      return (
            <>
                  {/* <div className="min-h-full bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4"> */}
                  <div className="min-h-full px-2 sm:px-4">
                        <div className="max-w-full sm:max-w-4xl mx-auto py-4 sm:py-6">
                              {/* Header */}
                              <div className="mb-8">
                                    <div className="flex items-center gap-2 sm:gap-3 mb-2">
                                          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                                <FileText className="h-5 w-5 text-blue-600" />
                                          </div>
                                          <div>
                                                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Create {getTemplateTitle()} Workflow</h1>
                                                {selectedTemplate?.subtitle ?
                                                      <p className="text-gray-600 mt-1">{selectedTemplate.subtitle}</p>

                                                      : <></>

                                                }
                                          </div>
                                    </div>

                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                          Template: {selectedTemplate?.name}
                                    </Badge>
                              </div>
                              <div className="pt-5">
                                    <form onSubmit={createWorkflowFromTemplate} id="create-aqua-tree-form" className="space-y-8">
                                          {renderFormError()}

                                          <div className="space-y-4 sm:space-y-6">
                                                {/* Use multi-step form for aqua_sign, default rendering for others */}
                                                {isAquaSignTemplate
                                                      ? renderAquaSignForm()
                                                      : selectedTemplate
                                                            ? reorderInputFields(selectedTemplate.fields).map((field, fieldIndex) =>
                                                                  renderSingleField(field, fieldIndex)
                                                            )
                                                            : null
                                                }
                                          </div>

                                          {/* Privacy mode toggle for domain_claim */}
                                          {selectedTemplate.name === 'domain_claim' && (
                                                <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-lg p-4 my-6">
                                                      <div className="flex items-start gap-3">
                                                            <input
                                                                  type="checkbox"
                                                                  id="public_association"
                                                                  data-testid="input-public_association"
                                                                  className="mt-1 h-4 w-4 rounded border-gray-300"
                                                                  onChange={(e) => {
                                                                        setFormData({
                                                                              ...formData,
                                                                              public_association: e.target.checked ? 'true' : 'false'
                                                                        })
                                                                  }}
                                                            />
                                                            <div className="flex-1">
                                                                  <Label htmlFor="public_association" className="text-base font-medium cursor-pointer">
                                                                        Make association public (wallet visible in DNS)
                                                                  </Label>
                                                                  <p className="text-sm text-gray-600 mt-1">
                                                                        <strong>Private mode (default):</strong> Wallet address hidden in DNS record. Only parties with the claim file can verify the association. Recommended for privacy.
                                                                  </p>
                                                                  <p className="text-sm text-gray-600 mt-1">
                                                                        <strong>Public mode:</strong> Wallet address visible in DNS record. Anyone can verify the association without the claim file.
                                                                  </p>
                                                            </div>
                                                      </div>
                                                </div>
                                          )}

                                          {/* Hide separator for aqua_sign step 1 */}
                                          {(!isAquaSignTemplate || aquaSignStep === 2) && <Separator className="my-8" />}
                                          {
                                                selectedTemplate.name == 'domain_claim' && (
                                                      <div>
                                                            <div className="space-y-4">
                                                                  <h5>Follow the following steps to associate your wallet with your domain:</h5>
                                                                  <ol className="list-decimal list-inside">
                                                                        <li>Fill in the Domain Name (FQDN).</li>
                                                                        <li>Sign with metamask to generate a TXT record.</li>
                                                                        <li>Second metamask signature for self signed identity claim.</li>
                                                                        <li>Open details of the DNS Claim and copy the TXT record into to your DNS
                                                                              records under the following subdomain <em>_aw.[domain filled
                                                                                    above]</em></li>
                                                                  </ol>
                                                            </div>
                                                            <Separator className="my-8" />
                                                      </div>
                                                )
                                          }

                                          {
                                                selectedTemplate.name == 'identity_attestation' && (
                                                      <div>
                                                            <div className="space-y-4">
                                                                  <h5>Claim To Be attested</h5>
                                                                  <FilePreview fileInfo={getAquaTreeFileObject(selectedFileInfo!)!} />
                                                            </div>
                                                            <Separator className="my-8" />
                                                      </div>
                                                )
                                          }

                                          {/* Action Buttons - Hide for aqua_sign step 1 since it has its own navigation */}
                                          {(!isAquaSignTemplate || aquaSignStep === 2) && (
                                                <div className="flex justify-end space-x-2 sm:space-x-4 pt-4">
                                                      <Button type="button" variant="outline" onClick={onBack} className="px-6">
                                                            Cancel
                                                      </Button>
                                                      {selectedTemplate && (
                                                            <Button
                                                                  data-testid="action-loading-create-button"
                                                                  type="submit"
                                                                  className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                                                                  disabled={submittingTemplateData}
                                                            >
                                                                  {submittingTemplateData ? (
                                                                        <>
                                                                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                              Creating Workflow...
                                                                        </>
                                                                  ) : (
                                                                        <>
                                                                              <FileText className="mr-2 h-4 w-4" />
                                                                              Create Workflow
                                                                        </>
                                                                  )}
                                                            </Button>
                                                      )}
                                                </div>
                                          )}
                                    </form>
                              </div>
                        </div>
                  </div>

                  {/* create claim  */}
                  <Dialog
                        open={isDialogOpen}
                        onOpenChange={() => {
                        }}
                  >
                        <DialogContent
                              className="[&>button]:hidden sm:max-w-[65vw]! sm:w-[65vw]! sm:h-[65vh]! sm:max-h-[65vh]! max-w-[95vw]! w-[95vw]! h-[95vh]! max-h-[95vh]! flex flex-col p-0 gap-0">
                              <div className="absolute top-4 right-4">
                                    <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 bg-red-500 text-white hover:bg-red-500"
                                          onClick={() => {
                                                setDialogOpen(false)
                                          }}
                                    >
                                          <X className="h-4 w-4" />
                                    </Button>
                              </div>
                              <DialogHeader
                                    className="h-[60px] min-h-[60px] max-h-[60px] flex justify-center items-start px-6">
                                    <DialogTitle>{dialogData?.title}</DialogTitle>
                              </DialogHeader>
                              <div className=" h-[calc(100%-60px)] pb-1">
                                    <ScrollArea className="h-full">{dialogData?.content ? <>{dialogData.content}</> :
                                          <p className="text-gray-500 text-sm">No content available</p>}</ScrollArea>
                              </div>
                              {/* <DialogFooter className="mt-auto">
                        <Button variant="outline" onClick={() => {
                           setOpenCreateAquaSignPopUp(false)
                        }}>Cancel</Button>
                        <Button type="submit">Save changes</Button>
                    </DialogFooter> */}
                        </DialogContent>
                  </Dialog>
            </>
      )
}

export default CreateFormFromTemplate
