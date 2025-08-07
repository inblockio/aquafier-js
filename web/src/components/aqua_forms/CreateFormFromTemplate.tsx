import React, { JSX, useEffect, useRef, useState } from 'react'
import { FormField, FormTemplate } from './types'
import { useStore } from 'zustand'
import appStore from '@/store'
import { isValidEthereumAddress, getRandomNumber, formatDate, estimateFileSize, dummyCredential, fetchSystemFiles, getGenesisHash, fetchFiles, isWorkFlowData, generateProofFromSignature, formatTxtRecord, dataURLToFile } from '@/utils/functions'
import Aquafier, { AquaTree, FileObject, getAquaTreeFileName, AquaTreeWrapper, getAquaTreeFileObject, Revision, OrderRevisionInAquaTree } from 'aqua-js-sdk'
import axios from 'axios'
import { generateNonce } from 'siwe'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
// Shadcn UI components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, FileText, Image, Link, Loader2, Pen, Plus, Trash2, Upload, Wallet, X } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'
import { ScrollArea } from '../ui/scroll-area'
import FilePreview from '../file_preview'
import { WalletAutosuggest } from '../wallet_auto_suggest'
import { ApiFileInfo } from '@/models/FileInfo'
import SignatureCanvas from 'react-signature-canvas'

// const CreateFormFromTemplate  = ({ selectedTemplate, callBack, openCreateTemplatePopUp = false }: { selectedTemplate: FormTemplate, callBack: () => void, openCreateTemplatePopUp: boolean }) => {
const CreateFormFromTemplate = ({ selectedTemplate, callBack }: { selectedTemplate: FormTemplate; callBack: () => void; openCreateTemplatePopUp: boolean }) => {
      const [submittingTemplateData, setSubmittingTemplateData] = useState(false)
      const [modalFormErorMessae, setModalFormErorMessae] = useState('')
      const { session, backend_url, systemFileInfo, setSystemFileInfo, setFiles, selectedFileInfo, files } = useStore(appStore)
      const [formData, setFormData] = useState<Record<string, string | File | number>>({})
      const [multipleAddresses, setMultipleAddresses] = useState<string[]>([])
      const [isDialogOpen, setDialogOpen] = useState(false)
      const [dialogData, setDialogData] = useState<null | {
            content: JSX.Element
            title: string
      }>(null)

      const signatureRef = useRef<SignatureCanvas | null>(null)
      const navigate = useNavigate()

      const [canvasSize, setCanvasSize] = useState({ width: 800, height: 200 });
      const containerRef = useRef<HTMLDivElement | null>(null);

      useEffect(() => {
            if (containerRef.current) {
                  const rect = containerRef.current.getBoundingClientRect();
                  setCanvasSize({
                        width: rect.width,
                        height: rect.height,
                  });
            }
      }, []);

      const getFieldDefaultValue = (field: FormField, currentState: any) => {
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
                  return currentState ?? null
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

                  for (const recipient of recipients) {
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
                              recipient: recipient,
                              option: 'latest',
                              file_name: name,
                        }

                        const response = await axios({
                              method,
                              url,
                              data,
                              headers: {
                                    nonce: session?.nonce,
                              },
                        })

                        console.log(`Response from share request  ${response.status}`)
                  }
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
                              const fileBlob = new Blob([fileObject.fileContent], {
                                    type: 'application/octet-stream',
                              })
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
                              if (account !== session?.address) {
                                    const files = await fetchFiles(session!.address, `${backend_url}/explorer_files`, session!.nonce)
                                    setFiles(files)
                              } else {
                                    setFiles(response.data.files)
                              }

                              toast.success('Aqua tree created successfully')
                              callBack && callBack()
                              navigate('/app')
                              setModalFormErorMessae('')
                              setFormData({})
                              setSubmittingTemplateData(false)
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

            selectedTemplate.fields.forEach((field: any) => {
                  if (!field.is_array && !(field.name in completeFormData)) {
                        completeFormData[field.name] = getFieldDefaultValue(field, undefined)
                  } else {
                        if (field.name === 'signers' && selectedTemplate.name === 'aqua_sign') {
                              completeFormData[field.name] = multipleAddresses.join(',')
                        }
                  }
            })

            return completeFormData
      }

      // Validation function for required fields
      const validateRequiredFields = (completeFormData: any, selectedTemplate: FormTemplate) => {
            for (const fieldItem of selectedTemplate.fields) {
                  const valueInput = completeFormData[fieldItem.name]
                  if (fieldItem.required && valueInput == undefined) {
                        throw new Error(`${fieldItem.name} is mandatory`)
                  }
            }
      }

      // Wallet address validation function
      const validateWalletAddress = (valueInput: any, fieldItem: any) => {
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
      const validateDomain = (valueInput: any, fieldItem: any) => {
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

            console.log(`completeFormData  === ${JSON.stringify(completeFormData, null, 4)}`)
            validateRequiredFields(completeFormData, selectedTemplate)

            for (const fieldItem of selectedTemplate.fields) {
                  const valueInput = completeFormData[fieldItem.name]

                  if (fieldItem.type === 'wallet_address') {
                        validateWalletAddress(valueInput, fieldItem)
                  }

                  if (fieldItem.type === 'domain') {
                        validateDomain(valueInput, fieldItem)
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
                  console.log(`nameExtract ${nameExtract} == selectedName ${selectedName}`)
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
      const handleIdentityAttestation = (completeFormData: Record<string, string | File | number>, selectedFileInfo: any): Record<string, string | File | number> => {
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
            } else {
                  throw new Error('Identity claim genesis id not found in selected file')
            }

            return completeFormData
      }

      async function domainTemplateSignMessageFunction(domainParams: string | undefined, timestamp: string, expiration: string): Promise<string | undefined> {
            let signature: string | undefined = undefined
            if (!domainParams) {
                  alert('Please enter a domain name')
                  return
            }

            const account = session?.address
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
            }

            const domain = domainParams.trim()
            try {
                  // let timestamp = Math.floor(Date.now() / 1000).toString()
                  // const expiration = Math.floor(Date.now() / 1000 + 90 * 24 * 60 * 60).toString() // 90 days default
                  // Message format: unix_timestamp|domain_name|expiration_timestamp
                  const message = `${timestamp}|${domain}|${expiration}`
                  console.log('Signing message (before EIP-191 formatting):', message)
                  console.log('MetaMask will apply EIP-191 formatting automatically')
                  // document.getElementById('sign-btn').textContent = 'Signing...';
                  // document.getElementById('sign-btn').disabled = true;
                  signature = await window.ethereum!.request({
                        method: 'personal_sign',
                        params: [message, account],
                  })
            } catch (error: any) {
                  // alert('Failed to sign: ' + error.message);
                  console.error('Error signing domain claim:', error)
                  setDialogOpen(true)
                  setDialogData({
                        title: 'Error signing domain claim',
                        content: (
                              <>
                                    <Alert variant="destructive">
                                          <AlertCircle className="h-4 w-4" />
                                          <AlertDescription>error signing domain claim: {error}</AlertDescription>
                                    </Alert>
                              </>
                        ),
                  })
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
            selectedTemplate.fields.forEach((field: any) => {
                  if (field.default_value && field.default_value !== '') {
                        completeFormData[field.name] = field.default_value
                  }
            })

            // Filter out File objects for logging
            Object.entries(completeFormData).forEach(([key, value]) => {
                  console.log('key', key)
                  console.log('value', value)
                  console.log('type  of  ', typeof value)
                  console.log('instance of  ', value instanceof File)
                  if (!(value instanceof File)) {
                        if (typeof value === 'string' || typeof value === 'number') {
                              filteredData[key] = value
                        } else {
                              filteredData[key] = String(value)
                        }
                  } else {
                        console.log('file name', (value as File).name)
                        filteredData[key] = (value as File).name
                  }
            })

            console.log('completeFormData before validation:', selectedTemplate.name)
            // for domain_claim show pop up
            if (selectedTemplate.name === 'domain_claim') {
                  // we sign the
                  const domain = completeFormData['domain'] as string
                  const walletAddress = session?.address!
                  const timestamp = Math.floor(Date.now() / 1000).toString()
                  const expiration = Math.floor(Date.now() / 1000 + 90 * 24 * 60 * 60).toString() // 90 days default

                  console.log('domain_claim selected ', JSON.stringify(completeFormData, null, 4))
                  let signature = await domainTemplateSignMessageFunction(domain, timestamp, expiration)
                  if (!signature) {
                        return null
                  }


                  //domain: string, walletAddress: string, timestamp: string, expiration: string, signature: string
                  const proof = generateProofFromSignature(domain, walletAddress, timestamp, expiration, signature)
                  filteredData['txt_record'] = formatTxtRecord(proof)//signature
            }
            console.log('completeFormData after validation:', JSON.stringify(filteredData, null, 4))
            return { filteredData }
      }

      // Function to create genesis aqua tree
      const createGenesisAquaTree = async (completeFormData: Record<string, string | File | number>, fileName: string, aquafier: Aquafier) => {
            const estimateSize = estimateFileSize(JSON.stringify(completeFormData))
            const jsonString = JSON.stringify(completeFormData, null, 4)
            console.log(`completeFormData -- jsonString-- ${jsonString}`)

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
      const linkToSystemAquaTree = async (genesisAquaTree: any, fileObject: any, templateApiFileInfo: any, aquafier: Aquafier) => {
            const mainAquaTreeWrapper: AquaTreeWrapper = {
                  aquaTree: genesisAquaTree,
                  revision: '',
                  fileObject: fileObject,
            }

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
      const processFileAttachments = async (selectedTemplate: FormTemplate, completeFormData: Record<string, string | File | number>, aquaTreeData: any, fileObject: FileObject, aquafier: Aquafier) => {
            const containsFileData = selectedTemplate?.fields.filter((e: FormField) => e.type === 'file' || e.type === 'scratchpad' || e.type === 'image' || e.type === 'document')

            if (!containsFileData || containsFileData.length === 0) {
                  return aquaTreeData
            }

            console.log('completeFormData: ', completeFormData, 'Files: ', containsFileData)

            const fileProcessingPromises = containsFileData.map(async (element: any) => {
                  console.log('Element: ', element)
                  const file: File = completeFormData[element.name] as File
                  console.log('file: ', file)

                  if (!file) {
                        console.warn(`No file found for field: ${element.name}`)
                        return null
                  }

                  if (typeof file === 'string' || !(file instanceof File)) {
                        console.warn(`Invalid file type for field: ${element.name}. Expected File object, got:`, typeof file)
                        return null
                  }

                  try {
                        console.log(`creating file object ...`)
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
                        console.log('Error here: ---')
                        console.error(`Error processing file ${file.name}:`, error)
                        throw new Error(`Error processing file ${file.name}`)
                  }
            })

            const fileObjects = await Promise.all(fileProcessingPromises)
            const validFileObjects = fileObjects.filter(obj => obj !== null) as FileObject[]

            console.log(`Processed ${validFileObjects.length} files successfully`)

            let currentAquaTreeData = aquaTreeData

            for (const item of validFileObjects) {
                  const aquaTreeResponse = await aquafier.createGenesisRevision(item)

                  if (aquaTreeResponse.isErr()) {
                        throw new Error('Error creating aqua tree for file')
                  }

                  await saveAquaTree(aquaTreeResponse.data.aquaTree!, item, false, true)

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

            const signRes = await aquafier.signAquaTree(aquaTreeWrapper, 'metamask', dummyCredential())

            if (signRes.isErr()) {
                  throw new Error('Error signing failed')
            }

            return signRes.data.aquaTree!
      }

      // Function to handle post-signing actions
      const handlePostSigning = async (signedAquaTree: any, fileObject: any, completeFormData: Record<string, string | File | number>, selectedTemplate: FormTemplate, session: any, selectedFileInfo: any) => {
            fileObject.fileContent = completeFormData
            console.log('Sign res: -- ', signedAquaTree)

            await saveAquaTree(signedAquaTree, fileObject, true)
            console.log('selectedTemplate.name -- ', selectedTemplate.name)

            // Handle aqua_sign specific logic
            if (selectedTemplate && selectedTemplate.name === 'aqua_sign' && session?.address) {
                  if (completeFormData['signers'] !== session?.address) {
                        await shareAquaTree(signedAquaTree, completeFormData['signers'] as string)
                  }
            }

            // Handle identity_attestation specific logic
            if (selectedTemplate && selectedTemplate.name === 'identity_attestation') {
                  const allHashes = Object.keys(selectedFileInfo!.aquaTree!.revisions!)
                  let secondRevision: Revision | null = null

                  if (allHashes.length >= 2) {
                        secondRevision = selectedFileInfo!.aquaTree!.revisions![allHashes[2]]
                  }

                  if (secondRevision == null) {
                        throw new Error('No second revision found in claim, unable to share with claim creator')
                  }

                  await saveAquaTree(signedAquaTree, fileObject, true, false, secondRevision.signature_wallet_address!)
            }
      }

      // Clear signature canvas
      const clearSignature = () => {
            if (signatureRef.current) {
                  signatureRef.current.clear()
                  // Don't clear all signatures, just reset the canvas
            }
      }

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

                  // Step 3: Get system files
                  const allSystemFiles = await getSystemFiles(systemFileInfo, backend_url, session?.address || '')
                  setSystemFileInfo(allSystemFiles)

                  // Step 4: Find template API file info
                  const templateApiFileInfo = findTemplateApiFileInfo(allSystemFiles, selectedTemplate)

                  // Step 5: Initialize aquafier and prepare data
                  const aquafier = new Aquafier()
                  const fileName = generateFileName(selectedTemplate, completeFormData)

                  // Step 6: Handle identity attestation specific logic
                  if (selectedTemplate?.name === 'identity_attestation') {
                        completeFormData = handleIdentityAttestation(completeFormData, selectedFileInfo)
                  }

                  console.log('Complete form data: ', completeFormData)

                  // Step 7: Prepare final form data
                  const finalFormDataRes = await prepareFinalFormData(completeFormData, selectedTemplate)

                  // console.log('Final form data:', JSON.stringify(finalFormData, null, 4));
                  // throw new Error('Final form data preparation failed');

                  if (!finalFormDataRes) {
                        toast.info('Final form data preparation failed.')
                        throw new Error('Final form data preparation failed')
                  }

                  console.log('Final form data: ', finalFormDataRes)

                  const finalFormDataFiltered = finalFormDataRes.filteredData
                  // Step 8: Create genesis aqua tree
                  const { genesisAquaTree, fileObject } = await createGenesisAquaTree(finalFormDataFiltered, fileName, aquafier)

                  // Step 9: Link to system aqua tree
                  let aquaTreeData = await linkToSystemAquaTree(genesisAquaTree, fileObject, templateApiFileInfo, aquafier)
                  console.log('Form data: ', finalFormDataFiltered)

                  // check if the types contains scratchpad
                  // let newCompleteData = completeFormData
                  for (const fieldItem of selectedTemplate.fields) {
                        const valueInput = completeFormData[fieldItem.name]
                        console.log(`fieldItem.name -- ${fieldItem.name} valueInput ${valueInput}  -- type ${fieldItem.type}`)
                        if (fieldItem.type === 'scratchpad') {
                              console.log(` in scratch pad`)
                              if (signatureRef.current) {
                                    console.log(` not null `)
                                    const dataUrl = signatureRef.current.toDataURL('image/png')
                                    const epochInSeconds = Math.floor(Date.now() / 1000)
                                    const lastFiveCharactersOfWalletAddres = session?.address.slice(-5)
                                    const signatureFileName = `user_signature_${lastFiveCharactersOfWalletAddres}_${epochInSeconds}.png`
                                    const signatureFile = dataURLToFile(dataUrl, signatureFileName)
                                    console.log(`signatureFile ===  ${signatureFile}`)
                                    completeFormData[`scratchpad`] = signatureFile


                              } else {
                                    console.log(`signatureRef is null 💣💣💣 `)
                              }

                              break;
                        }


                  }


                  console.log(`completeFormData ${JSON.stringify(completeFormData, null, 4)}`)

                  // Step 10: Process file attachments
                  aquaTreeData = await processFileAttachments(
                        selectedTemplate,
                        completeFormData,
                        aquaTreeData,
                        fileObject,
                        aquafier
                  )


                  // console.log(`aquaTreeData after file attachement process ${JSON.stringify(aquaTreeData, null, 4)}`)
                  // throw Error(`fix mee...`)

                  // Step 11: Sign aqua tree
                  const signedAquaTree = await signAquaTree(aquaTreeData, fileObject, aquafier)


                  clearSignature()

                  // Step 12: Handle post-signing actions
                  await handlePostSigning(signedAquaTree, fileObject, finalFormDataFiltered, selectedTemplate, session, selectedFileInfo)


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


      const fetchRecommendedWalletAddresses = (): Map<string, string> => {

            const recommended = new Map<string, string>()

            const someData = systemFileInfo.map(e => {
                  try {
                        return getAquaTreeFileName(e.aquaTree!)
                  } catch (e) {
                        console.log('Error processing system file') // More descriptive
                        return ''
                  }
            })

            for (const file of files) {

                  const workFlow = isWorkFlowData(file.aquaTree!, someData)

                  if (workFlow && workFlow.isWorkFlow) {
                        console.log('Workflow found: ', workFlow.workFlow)
                        if (workFlow.workFlow === 'identity_claim') {
                              console.log('Identity claim found:')
                              const orederdRevisionAquaTree = OrderRevisionInAquaTree(file.aquaTree!)
                              let allHashes = Object.keys(orederdRevisionAquaTree.revisions)

                              // console.log('orederdRevisionAquaTree: ', JSON.stringify (orederdRevisionAquaTree.revisions ,null, 2))
                              // console.log('hashs: ', JSON.stringify (orederdRevisionAquaTree.revisions ,null, 2))
                              let genRevsion = orederdRevisionAquaTree.revisions[allHashes[0]]

                              // console.log('genRevsion: ', JSON.stringify (genRevsion,null, 2))
                              // console.log('name : ', genRevsion[`forms_name`])
                              // console.log('forms_wallet_address  : ', genRevsion[`forms_wallet_address`])
                              if (genRevsion && genRevsion[`forms_name`] && genRevsion[`forms_wallet_address`]) {
                                    recommended.set(genRevsion[`forms_name`], genRevsion[`forms_wallet_address`])
                              }
                        }
                  } else {
                        console.log('Not a workflow data: ', file.aquaTree)
                  }

            }

            console.log('Recommended wallet addresses: ', JSON.stringify(recommended, null, 2))

            return recommended;
      }
      return (
            <>
                  {/* <div className="min-h-[100%] bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4"> */}
                  <div className="min-h-[100%] px-2 sm:px-4">
                        <div className="max-w-full sm:max-w-4xl mx-auto py-4 sm:py-6">
                              {/* Header */}
                              <div className="mb-8">
                                    <div className="flex items-center gap-2 sm:gap-3 mb-2">
                                          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                                <FileText className="h-5 w-5 text-blue-600" />
                                          </div>
                                          <div>
                                                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Create {selectedTemplate?.title} Workflow</h1>
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
                                          {modalFormErorMessae.length > 0 && (
                                                <Alert variant="destructive" className="border-red-200 bg-red-50">
                                                      <AlertCircle className="h-4 w-4" />
                                                      <AlertDescription>{modalFormErorMessae}</AlertDescription>
                                                </Alert>
                                          )}

                                          <div className="space-y-4 sm:space-y-6">
                                                {selectedTemplate
                                                      ? reorderInputFields(selectedTemplate.fields).map((field, fieldIndex) => {
                                                            const isFileInput = field.type === 'file' || field.type === 'image' || field.type === 'document'

                                                            if (field.is_hidden) {
                                                                  return null // Skip hidden fields
                                                            }

                                                            if (field.is_array) {

                                                                  return (
                                                                        <div key={`field-${fieldIndex}`} className="space-y-4">
                                                                              <div className="flex items-center justify-between">
                                                                                    <div>
                                                                                          <Label className="text-base sm:text-lg font-medium text-gray-900">
                                                                                                {field.label}
                                                                                                {field.required && <span className="text-red-500 ml-1">*</span>}
                                                                                          </Label>
                                                                                          {/* Add multiple wallet addresses for document signers */}
                                                                                          {field.description ? <p className="text-sm text-gray-500 mt-1">{field.description}</p> : null}
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

                                                                              <div className="space-y-3">
                                                                                    {multipleAddresses.map((address, index) => (
                                                                                          <div
                                                                                                key={`address-${index}`}
                                                                                                className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-4 bg-gray-50 rounded-lg border"
                                                                                          >
                                                                                                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full text-blue-600 font-medium text-sm">
                                                                                                      {index + 1}
                                                                                                </div>
                                                                                                <div className="flex-1">
                                                                                                      {/* <Input
                                                                                                            data-testid={`input-${field.name}-${index}`}
                                                                                                            className="rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                                                                                                            placeholder="Enter signer wallet address"
                                                                                                            type="text"
                                                                                                            value={address}
                                                                                                            onChange={ev => {
                                                                                                                  const newData = multipleAddresses.map((e, i) => {
                                                                                                                        if (i === index) {
                                                                                                                              return ev.target.value
                                                                                                                        }
                                                                                                                        return e
                                                                                                                  })
                                                                                                                  setMultipleAddresses(newData)
                                                                                                            }}
                                                                                                      /> */}
                                                                                                      <WalletAutosuggest

                                                                                                            walletAddresses={fetchRecommendedWalletAddresses()}
                                                                                                            field={field}
                                                                                                            index={index}
                                                                                                            address={address}
                                                                                                            multipleAddresses={multipleAddresses}
                                                                                                            setMultipleAddresses={setMultipleAddresses}
                                                                                                            placeholder="Enter signer wallet address"
                                                                                                            className="rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                                                                                                      />
                                                                                                </div>
                                                                                                {multipleAddresses.length > 1 && (
                                                                                                      <Button
                                                                                                            variant="outline"
                                                                                                            size="sm"
                                                                                                            type="button"
                                                                                                            className="rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 hover:border-red-300"
                                                                                                            onClick={() => removeAddress(index)}
                                                                                                      >
                                                                                                            <Trash2 className="h-4 w-4" />
                                                                                                      </Button>
                                                                                                )}
                                                                                          </div>
                                                                                    ))}
                                                                              </div>
                                                                        </div>
                                                                  )
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

                                                                        {(field.type == 'text' || field.type == 'number' || field.type == 'date' || field.type == 'domain' || field.type == 'email') && (
                                                                              <Input
                                                                                    id={`input-${field.name}`}
                                                                                    data-testid={`input-${field.name}`}
                                                                                    className="w-full px-2 sm:px-3 py-1 sm:py-2 border border-gray-200 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm sm:text-base"
                                                                                    // placeholder="Type here..."
                                                                                    placeholder={
                                                                                          field.type === 'domain'
                                                                                                ? 'Fill in the Domain Name (FQDN)'
                                                                                                : field.type === 'date'
                                                                                                      ? 'Select a date'
                                                                                                      : `Enter ${field.label.toLowerCase()}`
                                                                                    }
                                                                                    disabled={field.is_editable === false}
                                                                                    defaultValue={getFieldDefaultValue(field, formData[field.name])}
                                                                                    onChange={e => {
                                                                                          if (field.is_editable === false) {
                                                                                                // Show toast notification (would need toast implementation)

                                                                                                console.log(`${field.label} cannot be changed`)
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
                                                                                    }}
                                                                              />
                                                                        )}

                                                                        {
                                                                              field.type == 'scratchpad' && (
                                                                                    <div ref={containerRef} className="border border-gray-200 w-full h-[200px] bg-white">
                                                                                          <SignatureCanvas
                                                                                                ref={signatureRef}
                                                                                                canvasProps={{
                                                                                                      width: canvasSize.width,
                                                                                                      height: canvasSize.height,
                                                                                                      style: {
                                                                                                            width: '100%',
                                                                                                            height: '100%',
                                                                                                      },
                                                                                                      className: 'signature-canvas',
                                                                                                }}
                                                                                                backgroundColor="transparent"
                                                                                          />
                                                                                    </div>
                                                                              )
                                                                        }

                                                                        {field.type == 'wallet_address' && (
                                                                              <>
                                                                                    {
                                                                                          field.is_editable == false ?
                                                                                                <Input
                                                                                                      id={`input-${field.name}`}
                                                                                                      data-testid={`input-${field.name}`}
                                                                                                      className="rounded-md border-gray-200 focus:border-blue-500 focus:ring-blue-500 text-sm sm:text-base h-9 sm:h-10"
                                                                                                      disabled={field.is_editable === false}
                                                                                                      defaultValue={getFieldDefaultValue(field, formData[field.name])} />

                                                                                                :

                                                                                                <WalletAutosuggest
                                                                                                      walletAddresses={fetchRecommendedWalletAddresses()}
                                                                                                      field={field}
                                                                                                      index={1}
                                                                                                      address={formData[field.name] ? formData[field.name] as string : ""}
                                                                                                      multipleAddresses={[]}
                                                                                                      setMultipleAddresses={(data) => {
                                                                                                            // setMultipleAddresses
                                                                                                            console.log(`data  ... ${data}`);
                                                                                                            let d = data[0]
                                                                                                            console.log(`data  ... ${d}`)
                                                                                                            if (d) {
                                                                                                                  setFormData({
                                                                                                                        ...formData,
                                                                                                                        [field.name]: d,
                                                                                                                  })
                                                                                                            }
                                                                                                      }}
                                                                                                      placeholder="Enter signer wallet address"
                                                                                                      className="rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                                                                                                />
                                                                                    }
                                                                              </>
                                                                        )}


                                                                        {(field.type == 'document' || field.type == 'image' || field.type == 'file') && (
                                                                              <div className="relative">
                                                                                    <Input
                                                                                          id={`input-${field.name}`}
                                                                                          data-testid={`input-${field.name}`}
                                                                                          className="rounded-md border-gray-200 focus:border-blue-500 focus:ring-blue-500 text-sm sm:text-base h-9 sm:h-10"
                                                                                          {...(!isFileInput
                                                                                                ? {
                                                                                                      defaultValue: getFieldDefaultValue(field, formData[field.name]),
                                                                                                }
                                                                                                : {})}
                                                                                          type={getInputType(field.type)}
                                                                                          required={field.required}
                                                                                          disabled={field.is_editable === false}
                                                                                          accept={field.type == 'document' ? '.pdf' : field.type === 'image' ? 'image/*' : undefined}
                                                                                          placeholder={
                                                                                                field.type === 'document'
                                                                                                      ? 'Upload PDF document'
                                                                                                      : `Enter ${field.label.toLowerCase()}`
                                                                                          }
                                                                                          onChange={e => {
                                                                                                if (field.is_editable === false) {
                                                                                                      // Show toast notification (would need toast implementation)

                                                                                                      console.log(`${field.label} cannot be changed`)
                                                                                                      toast.error(`${field.label} cannot be changed`)
                                                                                                      return
                                                                                                }

                                                                                                if (selectedTemplate?.name === 'aqua_sign' && field.name.toLowerCase() === 'sender') {
                                                                                                      // Show toast notification (would need toast implementation)
                                                                                                      console.log('Aqua Sign sender cannot be changed')
                                                                                                      return
                                                                                                }

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

                                                                                                let value = isFileInput && e.target.files ? e.target.files[0] : e.target.value
                                                                                                console.log(`value us isFileInput ${isFileInput}  value ${value}`)
                                                                                                if (field.default_value !== undefined && field.default_value !== null && field.default_value !== '') {
                                                                                                      e.target.value = field.default_value
                                                                                                      toast.error(`${field.label} cannot be changed`)
                                                                                                }
                                                                                                setFormData({
                                                                                                      ...formData,
                                                                                                      [field.name]: value,
                                                                                                })
                                                                                          }}
                                                                                    />
                                                                                    {isFileInput && (
                                                                                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                                                                <Upload className="h-4 w-4 text-gray-400" />
                                                                                          </div>
                                                                                    )}
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
                                                      })
                                                      : null}
                                          </div>

                                          <Separator className="my-8" />
                                          {
                                                selectedTemplate.name == 'domain_claim' && (
                                                      <div >
                                                            <div className="space-y-4">
                                                                  <h5>Follow the following steps to associate your wallet with your domain:</h5>
                                                                  <ol className="list-decimal list-inside">
                                                                        <li>Fill in the Domain Name (FQDN).</li>
                                                                        <li>Sign with metamask to generate a TXT record.</li>
                                                                        <li>Second metamask signature for self signed identity.</li>
                                                                        <li>Open details of the DNS Claim and copy the TXT record into to your DNS records under the following subdomain <em>aqua._wallet.[domain filled above]</em></li>
                                                                  </ol>
                                                            </div>
                                                            <Separator className="my-8" />
                                                      </div>
                                                )
                                          }


                                          {
                                                selectedTemplate.name == 'identity_attestation' && (
                                                      <div >
                                                            <div className="space-y-4">
                                                                  <h5>Claim To Be attested</h5>
                                                                  <FilePreview fileInfo={getAquaTreeFileObject(selectedFileInfo!)!} />
                                                            </div>
                                                            <Separator className="my-8" />
                                                      </div>
                                                )
                                          }

                                          {/* Action Buttons */}
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
                                    </form>
                              </div>
                        </div>
                  </div>

                  {/* create claim  */}
                  <Dialog
                        open={isDialogOpen}
                        onOpenChange={(openState: any) => {
                              console.log('Dialog open state:', openState)
                              // setOpenCreateClaimAttestationPopUp(openState)
                        }}
                  >
                        <DialogContent className="[&>button]:hidden sm:!max-w-[65vw] sm:!w-[65vw] sm:h-[65vh] sm:max-h-[65vh] !max-w-[95vw] !w-[95vw] h-[95vh] max-h-[95vh] flex flex-col p-0 gap-0">
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
                              <DialogHeader className="!h-[60px] !min-h-[60px] !max-h-[60px] flex justify-center items-start px-6">
                                    <DialogTitle>{dialogData?.title}</DialogTitle>
                              </DialogHeader>
                              <div className=" h-[calc(100%-60px)] pb-1">
                                    <ScrollArea className="h-full">{dialogData?.content ? <>{dialogData.content}</> : <p className="text-gray-500 text-sm">No content available</p>}</ScrollArea>
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
