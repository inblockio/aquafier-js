import React, { useCallback, useEffect, useRef, useState } from 'react'
import { FormField, FormTemplate } from './types'
import { useStore } from 'zustand'
import appStore from '@/store'
import {
      dataURLToFile,
      dummyCredential,
      ensureDomainUrlHasSSL,
      estimateFileSize,
      fetchSystemFiles,
      generateDNSClaim,
      getAquaTreeFileObject,
      getGenesisHash,
      getLastRevisionVerificationHash,
      isWorkFlowData,
      reorderRevisionsInAquaTree,
} from '@/utils/functions'
import { signMessageWithAppKit } from '@/utils/appkit-wallet-utils'
import Aquafier, {
      AquaTree,
      AquaTreeWrapper,
      FileObject,
      getAquaTreeFileName,
      getLatestVH,
      Revision
} from 'aqua-js-sdk'
import apiClient from '@/api/axiosInstance'
import { generateNonce } from 'siwe'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
      AlertCircle,
      FileText,
      Loader2,
      X
} from 'lucide-react'
import { Separator } from '../ui/separator'
import { ScrollArea } from '../ui/scroll-area'
import FilePreview from '../file_preview/file_preview'
import { ApiFileInfo } from '@/models/FileInfo'
import SignatureCanvas from 'react-signature-canvas'
import { ApiInfoData, Session } from '@/types/types'
import { RELOAD_KEYS, triggerWorkflowReload } from '@/utils/reloadDatabase'
import { useNavigate } from 'react-router-dom'
import { API_ENDPOINTS } from '@/utils/constants'
import { useAquaSystemNames } from '@/hooks/useAquaSystemNames'
// Extracted sub-components and helpers
import SortableSignerItem from './SortableSignerItem'
import {
      FormErrorRenderer,
      SingleFieldRenderer,
      AquaSignFormRenderer,
      type CustomInputType,
} from './FormFieldRenderer'
import {
      generateSignatureFromText as generateSigFromText,
      getUserNameForSignature as getUserNameForSig,
      clearSignature as clearSig,
      generateFileName,
      reorderInputFields,
} from './signatureHelpers'
import { validateFields } from '@/utils/formValidation'

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
      const [formData, setFormData] = useState<Record<string, CustomInputType>>({})
      const [multipleAddresses, setMultipleAddresses] = useState<string[]>([])
      const [isDialogOpen, setDialogOpen] = useState(false)
      const [dialogData, setDialogData] = useState<null | {
            content: React.ReactElement
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

                  const response = await apiClient.get(url)

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

      // Set default values for hidden/non-editable fields outside of render
      useEffect(() => {
            if (!selectedTemplate?.fields) return
            const defaults: Record<string, CustomInputType> = {}
            for (const field of selectedTemplate.fields) {
                  if (field.is_hidden || !field.is_editable) {
                        const val = getFieldDefaultValue(field, formData[field.name] as any)
                        const cleanedValue = val instanceof File || Array.isArray(val) ? undefined : val
                        if (cleanedValue !== undefined) {
                              defaults[field.name] = cleanedValue as any
                        }
                  }
            }
            if (Object.keys(defaults).length > 0) {
                  setFormData(prev => ({ ...prev, ...defaults }))
            }
      }, [selectedTemplate])

      const getFieldDefaultValue = (field: FormField, currentState: CustomInputType | undefined
      ): string | number | File | File[] => {
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

            } catch (e) {
                  toast.error('Error sharing workflow')
            }
      }

      const saveAquaTree = async (aquaTree: AquaTree, fileObject: FileObject, isFinal: boolean = false, isWorkflow: boolean = false, account: string = session?.address || '') => {
            try {
                  const url = ensureDomainUrlHasSSL(`${backend_url}/explorer_aqua_file_upload`)

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

                  const response = await apiClient.post(url, formData, {
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
      const prepareCompleteFormData = (formData: Record<string, CustomInputType | Array<File>>, selectedTemplate: FormTemplate, multipleAddresses: string[]): Record<string, CustomInputType | File[]> => {
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

      // Function to get system files
      const getSystemFiles = async (systemFileInfo: ApiFileInfo[], backend_url: string, sessionAddress: string) => {
            let allSystemFiles = systemFileInfo

            if (systemFileInfo.length === 0) {
                  const url3 = ensureDomainUrlHasSSL(`${backend_url}/system/aqua_tree`)

                  const systemFiles = await fetchSystemFiles(url3, sessionAddress)
                  allSystemFiles = systemFiles
            } else {
                  // console.log(`Using cached system files`)
                  // console.log(`systemFileInfo length: ${systemFileInfo.length} : ${JSON.stringify(systemFileInfo, null, 2)}`)
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

      // Function to handle identity attestation specific logic
      const handleIdentityAttestation = (completeFormData: Record<string, CustomInputType>, selectedFileInfo: ApiFileInfo | null): Record<string, CustomInputType> => {
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

                  try {
                        const result = await signMessageWithAppKit(messageToSign, session?.address!)
                        signature = result.signature
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
            completeFormData: Record<string, CustomInputType>,
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
                  let field = selectedTemplate.fields.find(field => field.name === key)
                  if ((value instanceof File) || (Array.isArray(value) && value.length > 0 && value[0] instanceof File)) {
                        if (field?.is_array && field.type === "document") {
                              filteredData[key] = (value as File[]).map(file => file.name).join(", ")
                        } else {
                              filteredData[key] = (value as File).name
                        }
                  } else {
                        if (typeof value === 'string' || typeof value === 'number') {
                              if (key.endsWith(`_verification`)) {
                              } else {

                                    filteredData[key] = value
                              }
                        } else {
                              filteredData[key] = String(value)
                        }
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
      const createGenesisAquaTree = async (completeFormData: Record<string, CustomInputType>, fileName: string, aquafier: Aquafier) => {
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
      const processFileAttachments = async (selectedTemplate: FormTemplate, completeFormData: Record<string, CustomInputType>, aquaTreeData: AquaTree, fileObject: FileObject, aquafier: Aquafier) => {
            const containsFileData = selectedTemplate?.fields.filter((e: FormField) => e.type === 'file' || e.type === 'scratchpad' || e.type === 'image' || e.type === 'document')

            if (!containsFileData || containsFileData.length === 0) {
                  return aquaTreeData
            }

            const fileProcessingPromises = containsFileData.map(async (element: FormField) => {

                  if (element.is_array) {
                        const files: File[] = completeFormData[element.name] as File[]

                        if (!files || !Array.isArray(files) || files.length === 0) {
                              console.warn(`No files found for field: ${element.name}`)
                              return null
                        }

                        try {
                              const fileObjects = await Promise.all(
                                    files.map(async (file) => {
                                          if (typeof file === 'string' || !(file instanceof File)) {
                                                console.warn(`Invalid file type for field: ${element.name}. Expected File object, got:`, typeof file)
                                                return null
                                          }

                                          const arrayBuffer = await file.arrayBuffer()
                                          const uint8Array = new Uint8Array(arrayBuffer)

                                          const fileObjectPar: FileObject = {
                                                fileContent: uint8Array,
                                                fileName: file.name,
                                                path: './',
                                                fileSize: file.size,
                                          }

                                          return fileObjectPar
                                    })
                              )

                              return fileObjects.filter(Boolean)
                        } catch (error) {
                              console.error(`Error processing files for field ${element.name}:`, error)
                              throw new Error(`Error processing files for field ${element.name}`)
                        }

                  } else {
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
                  }
            })

            console.log("11. ")

            const fileObjects = await Promise.all(fileProcessingPromises)
            const validFileObjects = fileObjects.flat().filter(obj => obj !== null) as FileObject[]

            let currentAquaTreeData = aquaTreeData

            for (const item of validFileObjects) {

                  const aquaTreeResponse = await aquafier.createGenesisRevision(item)
                  console.log("11.1")

                  if (aquaTreeResponse.isErr()) {
                        throw new Error('Error creating aqua tree for file')
                  }

                  await saveAquaTree(aquaTreeResponse.data.aquaTree!, item, true, true)

                  console.log("11.2")

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
                  console.log("11.3")

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

                  const targetRevisionHash = getLastRevisionVerificationHash(aquaTreeData)
                  const messageToSign = `I sign this revision: [${targetRevisionHash}]`
                  const { signature, signerAddress } = await signMessageWithAppKit(messageToSign, session?.address!)

                  const signRes = await aquafier.signAquaTree(aquaTreeWrapper, 'inline', dummyCredential(), true, undefined, {
                        signature,
                        walletAddress: signerAddress,
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

                  const url = ensureDomainUrlHasSSL(`${backend_url}/${API_ENDPOINTS.GET_AQUA_TREE}`)
                  const res = await apiClient.post(url, {
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
      const handlePostSigning = async (signedAquaTree: AquaTree, fileObject: FileObject, completeFormData: Record<string, CustomInputType>, selectedTemplate: FormTemplate, session: Session | null, selectedFileInfo: ApiFileInfo | null) => {
            fileObject.fileContent = completeFormData

            await saveAquaTree(signedAquaTree, fileObject, true)

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

                        let genesisHash = getGenesisHash(signedAquaTree)
                        if (!genesisHash) {
                              toast.error('Genesis hash not found in signed aqua tree')
                              return
                        }
                        try {
                              if (genesisHash && session?.address) {
                                    let genesisRevision = signedAquaTree.revisions[genesisHash]
                                    let signers = genesisRevision?.forms_signers
                                    if (signers) {
                                          let signersArray = signers.split(",").map((item: string) => item.trim().toLocaleLowerCase())
                                          let activeUserAddress = session.address.toLocaleLowerCase()
                                          let isUserSigner = signersArray.find((signer: string) => signer === activeUserAddress)
                                          if (isUserSigner) {
                                                navigate('/app/pdf/workflow/2/' + genesisHash)
                                          }
                                    } else {

                                          navigate('/app/pdf/workflow/1/' + genesisHash)
                                    }
                              }
                        } catch (error: any) {
                              navigate('/app/pdf/workflow/1/' + genesisHash)
                        }
                  }
            }
      }

      // Signature helpers - delegate to extracted functions
      const clearSignature = () => clearSig(signatureRef.current)

      const generateSignatureFromText = useCallback(
            (text: string, isInitials: boolean = false) => generateSigFromText(signatureRef.current, text, isInitials),
            []
      )

      const getUserNameForSignature = useCallback(
            (): string => getUserNameForSig(formData, session?.address),
            [formData, session?.address]
      )

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
                  await validateFields(completeFormData, selectedTemplate, formData)



                  for (const fieldItem of selectedTemplate.fields) {
                        const filledValue = completeFormData[fieldItem.name]


                        // ensure there is code input for all verifiable data
                        if (fieldItem.is_verifiable) {
                              let verificationCodeData = formData[`${fieldItem.name}_verification`]

                              try {
                                    const url = `${backend_url}/verify_code`
                                    const response = await apiClient.post(
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
                              const response = await apiClient.post(url, {
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
                        console.log(`Err ${error}`)
                        console.log(`Err ${error?.message}`)
                        toast.error('Error creating Aqua tree from template', {
                              description: error?.message ?? 'Unknown error',
                              duration: 5000,
                        })
                  }
            } finally {
                  setSubmittingTemplateData(false)
            }
      }

      const onBack = () => {
            callBack && callBack()
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
                        // const file = files[0]
                        for (let index = 0; index < files.length; index++) {
                              const file = files[index];
                              if (file.type !== 'application/pdf') {
                                    alert('Please select a PDF file')
                                    e.target.value = ''
                                    return
                              }
                        }
                  }
            }

            const isFileInput = field.type === 'file' || field.type === 'image' || field.type === 'document'

            if (field.is_array) {
                  let _files = e.target.files

                  let filesToAttach: File[] = []

                  if (!_files) {
                        return
                  }


                  for (let i = 0; i < _files.length; i++) {
                        const _file = _files[i];

                        // if (field.default_value !== undefined && field.default_value !== null && field.default_value !== '') {
                        //       e.target.value = field.default_value
                        //       toast.error(`${field.label} cannot be changed`)
                        // }
                        filesToAttach.push(_file)

                  }

                  setFormData({
                        ...formData,
                        [field.name]: filesToAttach,
                  })
            } else {
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
                  const response = await apiClient.post(
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

      // Shared props for SingleFieldRenderer and AquaSignFormRenderer
      const fieldRendererProps = {
            formData,
            setFormData,
            selectedTemplate,
            session,
            multipleAddresses,
            setMultipleAddresses,
            addAddress,
            removeAddress,
            signatureRef,
            containerRef,
            canvasSize,
            clearSignature,
            generateSignatureFromText,
            getUserNameForSignature,
            getFieldDefaultValue,
            verfyingFormFieldEnabled,
            verifyingFormField,
            handleTextInputChange,
            handleFileInputChange,
            handleSendVerificationCode,
            handleVerificationCodeChange,
            handleWalletAddressSelect,
            SortableSignerItemComponent: SortableSignerItem,
      }

      const getTemplateTitle = () => {
            if (selectedTemplate?.name === "aqua_sign") {
                  return "AquaSign"
            }
            return selectedTemplate.title
      }

      if (!selectedTemplate) {
            return <div className="min-h-full px-2 sm:px-4">
                  Selected template not found, check db migrations.
            </div>
      }

      return (
            <>
                  {/* <div className="min-h-full bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4"> */}
                  <div className="min-h-full px-2 sm:px-4">
                        <div className="max-w-full sm:max-w-4xl mx-auto py-4 sm:py-6">
                              {/* Header */}
                              <div className="mb-7">
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

                                    {/* <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                          Template: {selectedTemplate?.name}
                                    </Badge> */}
                              </div>
                              <div className="pt-2">
                                    <form onSubmit={createWorkflowFromTemplate} id="create-aqua-tree-form" className="space-y-8">
                                          <FormErrorRenderer errorMessage={modalFormErorMessae} />

                                          <div className="space-y-4 sm:space-y-6">
                                                {/* Use multi-step form for aqua_sign, default rendering for others */}
                                                {isAquaSignTemplate
                                                      ? <AquaSignFormRenderer
                                                            {...fieldRendererProps}
                                                            aquaSignStep={aquaSignStep}
                                                            setAquaSignStep={setAquaSignStep}
                                                            setModalFormErrorMessage={setModalFormErorMessae}
                                                            reorderInputFields={reorderInputFields}
                                                      />
                                                      : selectedTemplate
                                                            ? reorderInputFields(selectedTemplate.fields).map((field, fieldIndex) =>
                                                                  <SingleFieldRenderer
                                                                        key={`field-${fieldIndex}`}
                                                                        field={field}
                                                                        fieldIndex={fieldIndex}
                                                                        {...fieldRendererProps}
                                                                  />
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
                                                                  <FilePreview fileInfo={getAquaTreeFileObject(selectedFileInfo!)!} latestRevisionHash={getLatestVH(selectedFileInfo?.aquaTree!)} />
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
                                    className="h-15 min-h-15 max-h-15 flex justify-center items-start px-6">
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
