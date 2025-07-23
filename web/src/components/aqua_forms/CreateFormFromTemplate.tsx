import React, { useState } from 'react'
import { FormField, FormTemplate } from './types'
import { useStore } from 'zustand'
import appStore from '@/store'
import {
    isValidEthereumAddress,
    getRandomNumber,
    formatDate,
    estimateFileSize,
    dummyCredential,
    fetchSystemFiles,
    getGenesisHash,
    fetchFiles,
} from '@/utils/functions'
import Aquafier, {
    AquaTree,
    FileObject,
    getAquaTreeFileName,
    AquaTreeWrapper,
    getAquaTreeFileObject,
    Revision,
} from 'aqua-js-sdk'
import axios from 'axios'
import { generateNonce } from 'siwe'
import { toast } from 'sonner'

// Shadcn UI components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useNavigate } from 'react-router-dom'
import {
    AlertCircle,
    FileText,
    Image,
    Loader2,
    Plus,
    Trash2,
    Upload,
} from 'lucide-react'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'

// const CreateFormFromTemplate = ({ selectedTemplate, callBack, openCreateTemplatePopUp = false }: { selectedTemplate: FormTemplate, callBack: () => void, openCreateTemplatePopUp: boolean }) => {
const CreateFormFromTemplate = ({
    selectedTemplate,
    callBack,
}: {
    selectedTemplate: FormTemplate
    callBack: () => void
    openCreateTemplatePopUp: boolean
}) => {
    const [submittingTemplateData, setSubmittingTemplateData] = useState(false)
    const [modalFormErorMessae, setModalFormErorMessae] = useState('')
    const {
        session,
        backend_url,
        systemFileInfo,
        setSystemFileInfo,
        setFiles,
        selectedFileInfo,
    } = useStore(appStore)
    const [formData, setFormData] = useState<
        Record<string, string | File | number>
    >({})
    const [multipleAddresses, setMultipleAddresses] = useState<string[]>([])

    const navigate = useNavigate()

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

    const shareAquaTree = async (
        aquaTree: AquaTree,
        recipientWalletAddress: string
    ) => {
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

    const saveAquaTree = async (
        aquaTree: AquaTree,
        fileObject: FileObject,
        isFinal: boolean = false,
        isWorkflow: boolean = false,
        account: string = session?.address || ''
    ) => {
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

            //workflow specifi
            if (selectedTemplate?.name == 'user_signature') {
                formData.append('template_id', `${selectedTemplate.id}`)
            }

            // Check if we have an actual file to upload as an asset
            if (fileObject.fileContent) {
                // Set has_asset to true
                formData.append('has_asset', 'true')

                // FIXED: Properly handle the file content as binary data
                // If fileContent is already a Blob or File object, use it directly
                if (
                    fileObject.fileContent instanceof Blob ||
                    fileObject.fileContent instanceof File
                ) {
                    formData.append(
                        'asset',
                        fileObject.fileContent,
                        fileObject.fileName
                    )
                }
                // If it's an ArrayBuffer or similar binary data
                else if (
                    fileObject.fileContent instanceof ArrayBuffer ||
                    fileObject.fileContent instanceof Uint8Array
                ) {
                    const fileBlob = new Blob([fileObject.fileContent], {
                        type: 'application/octet-stream',
                    })
                    formData.append('asset', fileBlob, fileObject.fileName)
                }
                // If it's a base64 string (common for image data)
                else if (
                    typeof fileObject.fileContent === 'string' &&
                    fileObject.fileContent.startsWith('data:')
                ) {
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
                    console.warn(
                        'Warning: fileContent is not in an optimal format for file upload'
                    )
                    const fileBlob = new Blob(
                        [JSON.stringify(fileObject.fileContent)],
                        {
                            type: 'application/json',
                        }
                    )
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
                        const files = await fetchFiles(
                            session!.address,
                            `${backend_url}/explorer_files`,
                            session!.nonce
                        )
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

    const createWorkflowFromTemplate = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            setModalFormErorMessae('')

            if (submittingTemplateData) {
                toast.info(
                    'Data submission not completed, try again after some time.'
                )
                return
            }
            setSubmittingTemplateData(true)

            // Ensure all fields have values before validation
            const completeFormData = { ...formData }
            selectedTemplate!.fields.forEach(field => {
                if (!field.is_array && !(field.name in completeFormData)) {
                    completeFormData[field.name] = getFieldDefaultValue(
                        field,
                        undefined
                    )
                } else {
                    if (
                        field.name === 'signers' &&
                        selectedTemplate.name === 'aqua_sign'
                    ) {
                        completeFormData[field.name] =
                            multipleAddresses.join(',')
                    }
                }
            })

            // Update formData with complete data
            setFormData(completeFormData)

            for (const fieldItem of selectedTemplate!.fields) {
                const valueInput = completeFormData[fieldItem.name]
                if (fieldItem.required && valueInput == undefined) {
                    setSubmittingTemplateData(false)
                    setModalFormErorMessae(`${fieldItem.name} is mandatory`)
                    return
                }

                if (fieldItem.type === 'wallet_address') {
                    if (typeof valueInput === 'string') {
                        if (valueInput.includes(',')) {
                            const walletAddresses = valueInput.split(',')
                            const seenWalletAddresses = new Set<string>()
                            for (const walletAddress of walletAddresses) {
                                const isValidWalletAddress =
                                    isValidEthereumAddress(walletAddress.trim())
                                if (!isValidWalletAddress) {
                                    setModalFormErorMessae(
                                        `>${walletAddress.trim()}< is not a valid wallet adress`
                                    )

                                    setSubmittingTemplateData(false)
                                    return
                                }
                                if (
                                    seenWalletAddresses.has(
                                        walletAddress.trim()
                                    )
                                ) {
                                    setModalFormErorMessae(
                                        `>${walletAddress.trim()}< is a duplicate wallet adress`
                                    )

                                    setSubmittingTemplateData(false)
                                    return
                                }
                                seenWalletAddresses.add(walletAddress.trim())
                            }
                        } else {
                            const isValidWalletAddress = isValidEthereumAddress(
                                valueInput.trim()
                            )
                            if (!isValidWalletAddress) {
                                setSubmittingTemplateData(false)
                                setModalFormErorMessae(
                                    `>${valueInput}< is not a valid wallet adress`
                                )
                                return
                            }
                        }
                    } else {
                        setSubmittingTemplateData(false)
                        setModalFormErorMessae(
                            `${valueInput} provided at ${fieldItem.name} is not a string`
                        )
                        return
                    }
                }
            }

            let allSystemFiles = systemFileInfo
            if (systemFileInfo.length == 0) {
                const url3 = `${backend_url}/system/aqua_tree`
                const systemFiles = await fetchSystemFiles(
                    url3,
                    session?.address || ''
                )
                setSystemFileInfo(systemFiles)
                allSystemFiles = systemFiles
            }

            if (allSystemFiles.length == 0) {
                setSubmittingTemplateData(false)
                toast.error('Aqua tree for templates not found')
                return
            }

            const templateApiFileInfo = allSystemFiles.find(e => {
                const nameExtract = getAquaTreeFileName(e!.aquaTree!)
                const selectedName = `${selectedTemplate?.name}.json`
                console.log(
                    `nameExtract ${nameExtract} == selectedName ${selectedName}`
                )
                return nameExtract == selectedName
            })
            if (!templateApiFileInfo) {
                setSubmittingTemplateData(false)
                toast.error(`Aqua tree for ${selectedTemplate?.name} not found`)
                return
            }

            const aquafier = new Aquafier()
            const filteredData: Record<string, string | number> = {}

            console.log(
                `completeFormData ${JSON.stringify(completeFormData, null, 4)}`
            )

            const randomNumber = getRandomNumber(100, 1000)

            let fileName = `${selectedTemplate?.name ?? 'template'}-${randomNumber}.json`

            if (selectedTemplate?.name == 'aqua_sign') {
                const theFile = completeFormData['document'] as File

                // Get filename without extension and the extension separately
                const fileNameWithoutExt = theFile.name.substring(
                    0,
                    theFile.name.lastIndexOf('.')
                )

                fileName =
                    fileNameWithoutExt +
                    '-' +
                    formatDate(new Date()) +
                    '-' +
                    randomNumber +
                    '.json'
            }

            if (selectedTemplate?.name == 'identity_attestation') {
                fileName = `identity_attestation-${randomNumber}.json`

                if (selectedFileInfo == null) {
                    setSubmittingTemplateData(false)
                    toast.error('No claim selected for identity attestation')
                    return
                }

                // set into the geneisis form revision of identity attestation the forms values calims
                const genRevision: Revision = Object.values(
                    selectedFileInfo.aquaTree?.revisions!
                )[0]
                if (genRevision) {
                    const genKeys = Object.keys(genRevision)
                    for (const key of genKeys) {
                        if (key.startsWith('forms_')) {
                            const keyWithoutFormWord = key.replace('forms_', '')
                            completeFormData[`claim_${keyWithoutFormWord}`] =
                                genRevision[key]
                        }
                    }
                }

                const genHash = getGenesisHash(selectedFileInfo.aquaTree!)
                if (genHash) {
                    completeFormData[`identity_claim_id`] = genHash
                } else {
                    setSubmittingTemplateData(false)
                    toast.error(
                        'Identity claim genesis id not found in selected file'
                    )
                    return
                }
            }

            const epochTimeInSeconds = Math.floor(Date.now() / 1000)
            // console.log(epochTimeInSeconds);
            Object.entries(completeFormData).forEach(([key, value]) => {
                // Only include values that are not File objects
                if (!(value instanceof File)) {
                    filteredData[key] = value
                } else {
                    filteredData[key] = value.name
                }
            })

            //for uniquness of the form
            completeFormData['created_at'] = epochTimeInSeconds

            const estimateize = estimateFileSize(
                JSON.stringify(completeFormData)
            )

            const jsonString = JSON.stringify(completeFormData, null, 4)
            console.log(`completeFormData -- jsonString-- ${jsonString}`)

            const fileObject: FileObject = {
                fileContent: jsonString,
                fileName: fileName,
                path: './',
                fileSize: estimateize,
            }
            const genesisAquaTree = await aquafier.createGenesisRevision(
                fileObject,
                true,
                false,
                false
            )

            if (genesisAquaTree.isOk()) {
                console.log(
                    `genesis ${JSON.stringify(genesisAquaTree.data.aquaTree!, null, 4)}`
                )
                // create a link revision with the systems aqua tree
                const mainAquaTreeWrapper: AquaTreeWrapper = {
                    aquaTree: genesisAquaTree.data.aquaTree!,
                    revision: '',
                    fileObject: fileObject,
                }
                const linkedAquaTreeFileObj =
                    getAquaTreeFileObject(templateApiFileInfo)

                if (!linkedAquaTreeFileObj) {
                    setSubmittingTemplateData(false)
                    toast.error('system Aqua tee has error')
                    return
                }
                const linkedToAquaTreeWrapper: AquaTreeWrapper = {
                    aquaTree: templateApiFileInfo.aquaTree!,
                    revision: '',
                    fileObject: linkedAquaTreeFileObj,
                }
                const linkedAquaTreeResponse = await aquafier.linkAquaTree(
                    mainAquaTreeWrapper,
                    linkedToAquaTreeWrapper
                )

                if (linkedAquaTreeResponse.isErr()) {
                    setSubmittingTemplateData(false)
                    toast.error('Error linking aqua tree')
                    return
                }

                let aquaTreeData = linkedAquaTreeResponse.data.aquaTree!

                const containsFileData = selectedTemplate?.fields.filter(
                    e =>
                        e.type == 'file' ||
                        e.type == 'image' ||
                        e.type == 'document'
                )
                if (containsFileData && containsFileData.length > 0) {
                    // for (let index = 0; index < containsFileData.length; index++) {
                    //     const element = containsFileData[index];
                    //     const file: File = formData[element['name']] as File

                    // Create an array to store all file processing promises
                    const fileProcessingPromises = containsFileData.map(
                        async element => {
                            const file: File = completeFormData[
                                element.name
                            ] as File

                            // Check if file exists
                            if (!file) {
                                console.warn(
                                    `No file found for field: ${element.name}`
                                )
                                return null
                            }

                            try {
                                // Convert File to Uint8Array
                                const arrayBuffer = await file.arrayBuffer()
                                const uint8Array = new Uint8Array(arrayBuffer)

                                // Create the FileObject with properties from the File object
                                const fileObjectPar: FileObject = {
                                    fileContent: uint8Array,
                                    fileName: file.name,
                                    path: './',
                                    fileSize: file.size,
                                }

                                return fileObjectPar
                                // After this you can use fileObjectPar with aquafier.createGenesisRevision() or other operations
                            } catch (error) {
                                console.error(
                                    `Error processing file ${file.name}:`,
                                    error
                                )

                                toast.error(
                                    `Error processing file ${file.name}`
                                )
                                setSubmittingTemplateData(false)
                                return null
                            }
                        }
                    )

                    // Wait for all file processing to complete
                    try {
                        const fileObjects = await Promise.all(
                            fileProcessingPromises
                        )
                        // Filter out null results (from errors)
                        const validFileObjects = fileObjects.filter(
                            obj => obj !== null
                        ) as FileObject[]

                        // Now you can use validFileObjects
                        console.log(
                            `Processed ${validFileObjects.length} files successfully`
                        )

                        // Example usage with each file object:
                        for (const item of validFileObjects) {
                            const aquaTreeResponse =
                                await aquafier.createGenesisRevision(item)

                            if (aquaTreeResponse.isErr()) {
                                console.error(
                                    'Error linking aqua tree:',
                                    aquaTreeResponse.data.toString()
                                )

                                setSubmittingTemplateData(false)
                                toast.error('Error linking aqua tree')
                                return
                            }
                            // upload the single aqua tree
                            await saveAquaTree(
                                aquaTreeResponse.data.aquaTree!,
                                item,
                                false,
                                true
                            )

                            // linke it to main aqua tree
                            const aquaTreeWrapper: AquaTreeWrapper = {
                                aquaTree: aquaTreeData,
                                revision: '',
                                fileObject: fileObject,
                            }

                            const aquaTreeWrapper2: AquaTreeWrapper = {
                                aquaTree: aquaTreeResponse.data.aquaTree!,
                                revision: '',
                                fileObject: item,
                            }

                            const res = await aquafier.linkAquaTree(
                                aquaTreeWrapper,
                                aquaTreeWrapper2
                            )
                            if (res.isErr()) {
                                console.error(
                                    'Error linking aqua tree:',
                                    aquaTreeResponse.data.toString()
                                )

                                setSubmittingTemplateData(false)
                                toast.error('Error linking aqua tree')
                                return
                            }
                            aquaTreeData = res.data.aquaTree!
                        }
                    } catch (error) {
                        console.error('Error processing files:', error)

                        setSubmittingTemplateData(false)
                        toast.error('Error proceessing files')
                        return
                    }
                }
                const aquaTreeWrapper: AquaTreeWrapper = {
                    aquaTree: aquaTreeData,
                    revision: '',
                    fileObject: fileObject,
                }

                // sign the aqua chain
                const signRes = await aquafier.signAquaTree(
                    aquaTreeWrapper,
                    'metamask',
                    dummyCredential()
                )

                if (signRes.isErr()) {
                    setSubmittingTemplateData(false)
                    toast.error('Error signing failed')
                    return
                } else {
                    console.log('signRes.data', signRes.data)
                    fileObject.fileContent = completeFormData
                    console.log('Sign res: -- ', signRes.data.aquaTree)
                    await saveAquaTree(signRes.data.aquaTree!, fileObject, true)
                    console.log(
                        'selectedTemplate.name -- ',
                        selectedTemplate.name
                    )
                    //check if aqua sign
                    if (
                        selectedTemplate &&
                        selectedTemplate.name === 'aqua_sign' &&
                        session?.address
                    ) {
                        if (completeFormData['signers'] != session?.address) {
                            await shareAquaTree(
                                signRes.data.aquaTree!,
                                completeFormData['signers'] as string
                            )
                        }
                    }

                    if (
                        selectedTemplate &&
                        selectedTemplate.name === 'identity_attestation'
                    ) {
                        const allHashes = Object.keys(
                            selectedFileInfo!.aquaTree!.revisions!
                        )
                        let secondRevision: Revision | null = null
                        if (allHashes.length >= 2) {
                            secondRevision =
                                selectedFileInfo!.aquaTree!.revisions![
                                    allHashes[2]
                                ]
                        }

                        if (secondRevision == null) {
                            setSubmittingTemplateData(false)
                            toast.error(
                                'No second revision found in claim , unable to share with claim creator'
                            )
                            return
                        }

                        await saveAquaTree(
                            signRes.data.aquaTree!,
                            fileObject,
                            true,
                            false,
                            secondRevision.signature_wallet_address!
                        )

                        // await shareAquaTree(
                        //     signRes.data.aquaTree!,
                        //     secondRevision.signature_wallet_address!
                        // )
                    }
                }
            } else {
                setSubmittingTemplateData(false)

                toast.error('Error creating Aqua tree from template', {
                    description: 'Error creating Aqua tree from template',
                    duration: 5000,
                })
            }
        } catch (error: any) {
            setSubmittingTemplateData(false)
            toast.error('Error creating Aqua tree from template', {
                description: error?.message ?? 'Unknown error',
                duration: 5000,
            })
        }
    }

    const getFieldIcon = (type: string) => {
        switch (type) {
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
        navigate('/templates')
        callBack && callBack()
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
                                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                                    Create {selectedTemplate?.title} Workflow
                                </h1>
                                <p className="text-gray-600 mt-1">
                                    Set up a new document signing workflow with
                                    multiple signers
                                </p>
                            </div>
                        </div>

                        <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700 border-blue-200"
                        >
                            Template: {selectedTemplate?.name}
                        </Badge>
                    </div>
                    <div className="pt-10">
                        <form
                            onSubmit={createWorkflowFromTemplate}
                            id="create-aqua-tree-form"
                            className="space-y-8"
                        >
                            {modalFormErorMessae.length > 0 && (
                                <Alert
                                    variant="destructive"
                                    className="border-red-200 bg-red-50"
                                >
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        {modalFormErorMessae}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-4 sm:space-y-6">
                                {selectedTemplate
                                    ? reorderInputFields(
                                          selectedTemplate.fields
                                      ).map((field, fieldIndex) => {
                                          const isFileInput =
                                              field.type === 'file' ||
                                              field.type === 'image' ||
                                              field.type === 'document'

                                          if (field.is_hidden) {
                                              return null // Skip hidden fields
                                          }

                                          if (field.is_array) {
                                              return (
                                                  <div
                                                      key={`field-${fieldIndex}`}
                                                      className="space-y-4"
                                                  >
                                                      <div className="flex items-center justify-between">
                                                          <div>
                                                              <Label className="text-base sm:text-lg font-medium text-gray-900">
                                                                  {field.label}
                                                                  {field.required && (
                                                                      <span className="text-red-500 ml-1">
                                                                          *
                                                                      </span>
                                                                  )}
                                                              </Label>
                                                              {/* Add multiple wallet addresses for document signers */}
                                                              {field.description ? (
                                                                  <p className="text-sm text-gray-500 mt-1">
                                                                      {
                                                                          field.description
                                                                      }
                                                                  </p>
                                                              ) : null}
                                                          </div>
                                                          <Button
                                                              variant="outline"
                                                              size="sm"
                                                              type="button"
                                                              className="rounded-lg hover:bg-blue-50 hover:border-blue-300"
                                                              onClick={
                                                                  addAddress
                                                              }
                                                              data-testid={`multiple_values_${field.name}`}
                                                          >
                                                              <Plus className="h-4 w-4 mr-1" />
                                                              Add Signer
                                                          </Button>
                                                      </div>

                                                      <div className="space-y-3">
                                                          {multipleAddresses.map(
                                                              (
                                                                  address,
                                                                  index
                                                              ) => (
                                                                  <div
                                                                      key={`address-${index}`}
                                                                      className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-4 bg-gray-50 rounded-lg border"
                                                                  >
                                                                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full text-blue-600 font-medium text-sm">
                                                                          {index +
                                                                              1}
                                                                      </div>
                                                                      <div className="flex-1">
                                                                          <Input
                                                                              data-testid={`input-${field.name}-${index}`}
                                                                              className="rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                                                                              placeholder="Enter signer wallet address"
                                                                              type="text"
                                                                              value={
                                                                                  address
                                                                              }
                                                                              onChange={ev => {
                                                                                  const newData =
                                                                                      multipleAddresses.map(
                                                                                          (
                                                                                              e,
                                                                                              i
                                                                                          ) => {
                                                                                              if (
                                                                                                  i ===
                                                                                                  index
                                                                                              ) {
                                                                                                  return ev
                                                                                                      .target
                                                                                                      .value
                                                                                              }
                                                                                              return e
                                                                                          }
                                                                                      )
                                                                                  setMultipleAddresses(
                                                                                      newData
                                                                                  )
                                                                              }}
                                                                          />
                                                                      </div>
                                                                      {multipleAddresses.length >
                                                                          1 && (
                                                                          <Button
                                                                              variant="outline"
                                                                              size="sm"
                                                                              type="button"
                                                                              className="rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 hover:border-red-300"
                                                                              onClick={() =>
                                                                                  removeAddress(
                                                                                      index
                                                                                  )
                                                                              }
                                                                          >
                                                                              <Trash2 className="h-4 w-4" />
                                                                          </Button>
                                                                      )}
                                                                  </div>
                                                              )
                                                          )}
                                                      </div>
                                                  </div>
                                              )
                                          }

                                          return (
                                              <div
                                                  key={`field-${fieldIndex}`}
                                                  className="space-y-2 sm:space-y-3"
                                              >
                                                  <div className="flex items-center gap-2">
                                                      {getFieldIcon(field.type)}
                                                      <Label
                                                          htmlFor={`input-${field.name}`}
                                                          className="text-base font-medium text-gray-900"
                                                      >
                                                          {field.label}
                                                          {field.required && (
                                                              <span className="text-red-500">
                                                                  *
                                                              </span>
                                                          )}
                                                      </Label>
                                                  </div>

                                                  {field.type === 'text' ? (
                                                      <Input
                                                          id={`input-${field.name}`}
                                                          data-testid={`input-${field.name}`}
                                                          className="w-full px-2 sm:px-3 py-1 sm:py-2 border border-gray-200 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm sm:text-base"
                                                          placeholder="Type here..."
                                                          defaultValue={getFieldDefaultValue(
                                                              field,
                                                              formData[
                                                                  field.name
                                                              ]
                                                          )}
                                                          onChange={e => {
                                                              setFormData({
                                                                  ...formData,
                                                                  [field.name]:
                                                                      e.target
                                                                          .value,
                                                              })
                                                          }}
                                                      />
                                                  ) : (
                                                      <div className="relative">
                                                          <Input
                                                              id={`input-${field.name}`}
                                                              data-testid={`input-${field.name}`}
                                                              className="rounded-md border-gray-200 focus:border-blue-500 focus:ring-blue-500 text-sm sm:text-base h-9 sm:h-10"
                                                              {...(!isFileInput
                                                                  ? {
                                                                        defaultValue:
                                                                            getFieldDefaultValue(
                                                                                field,
                                                                                formData[
                                                                                    field
                                                                                        .name
                                                                                ]
                                                                            ),
                                                                    }
                                                                  : {})}
                                                              type={
                                                                  field.type ===
                                                                      'image' ||
                                                                  field.type ===
                                                                      'document'
                                                                      ? 'file'
                                                                      : field.type
                                                              }
                                                              required={
                                                                  field.required
                                                              }
                                                              disabled={
                                                                  field.is_editable ===
                                                                  false
                                                              }
                                                              accept={
                                                                  field.type ===
                                                                  'document'
                                                                      ? '.pdf'
                                                                      : field.type ===
                                                                          'image'
                                                                        ? 'image/*'
                                                                        : undefined
                                                              }
                                                              placeholder={
                                                                  field.type ===
                                                                  'wallet_address'
                                                                      ? 'Enter wallet address'
                                                                      : field.type ===
                                                                          'date'
                                                                        ? 'Select due date'
                                                                        : field.type ===
                                                                            'document'
                                                                          ? 'Upload PDF document'
                                                                          : `Enter ${field.label.toLowerCase()}`
                                                              }
                                                              onChange={e => {
                                                                  if (
                                                                      selectedTemplate?.name ===
                                                                          'aqua_sign' &&
                                                                      field.name.toLowerCase() ===
                                                                          'sender'
                                                                  ) {
                                                                      // Show toast notification (would need toast implementation)
                                                                      console.log(
                                                                          'Aqua Sign sender cannot be changed'
                                                                      )
                                                                      return
                                                                  }

                                                                  if (
                                                                      field.type ===
                                                                      'image'
                                                                  ) {
                                                                      const files =
                                                                          e
                                                                              ?.target
                                                                              ?.files
                                                                      if (
                                                                          files &&
                                                                          files.length >
                                                                              0
                                                                      ) {
                                                                          const file =
                                                                              files[0]
                                                                          if (
                                                                              !file.type.startsWith(
                                                                                  'image/'
                                                                              )
                                                                          ) {
                                                                              alert(
                                                                                  'Please select an image file'
                                                                              )
                                                                              e.target.value =
                                                                                  ''
                                                                              return
                                                                          }
                                                                      }
                                                                  }

                                                                  if (
                                                                      field.type ===
                                                                      'document'
                                                                  ) {
                                                                      const files =
                                                                          e
                                                                              ?.target
                                                                              ?.files
                                                                      if (
                                                                          files &&
                                                                          files.length >
                                                                              0
                                                                      ) {
                                                                          const file =
                                                                              files[0]
                                                                          if (
                                                                              file.type !==
                                                                              'application/pdf'
                                                                          ) {
                                                                              alert(
                                                                                  'Please select a PDF file'
                                                                              )
                                                                              e.target.value =
                                                                                  ''
                                                                              return
                                                                          }
                                                                      }
                                                                  }

                                                                  const value =
                                                                      isFileInput &&
                                                                      e.target
                                                                          .files
                                                                          ? e
                                                                                .target
                                                                                .files[0]
                                                                          : e
                                                                                .target
                                                                                .value

                                                                  setFormData({
                                                                      ...formData,
                                                                      [field.name]:
                                                                          value,
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

                            {/* Action Buttons */}
                            <div className="flex justify-end space-x-2 sm:space-x-4 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onBack}
                                    className="px-6"
                                >
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
        </>
    )
}

export default CreateFormFromTemplate
