import { useState, useRef, useEffect, useCallback } from 'react'

// Import /components//ui components
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../../../components/ui/dialog'
// import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PDFDocument } from 'pdf-lib'
import SignatureCanvas from 'react-signature-canvas'
import { FaPlus } from 'react-icons/fa'
import appStore from '../../../store'
import { useStore } from 'zustand'
// import { PdfControls } from '../../../components/FilePreview';
import axios from 'axios'
import { ApiFileInfo } from '../../../models/FileInfo'
import {
    dataURLToFile,
    dummyCredential,
    ensureDomainUrlHasSSL,
    estimateFileSize,
    fetchFiles,
    getAquaTreeFileName,
    getGenesisHash,
    getRandomNumber,
    timeStampToDateObject,
} from '../../../utils/functions'
import { API_ENDPOINTS } from '../../../utils/constants'
import Aquafier, {
    AquaTree,
    AquaTreeWrapper,
    FileObject,
    getAquaTreeFileObject,
} from 'aqua-js-sdk/web'
import { SignatureData } from '../../../types/types'
import { LuInfo, LuTrash } from 'react-icons/lu'
import { useNavigate } from 'react-router-dom'
// import SignerPage from './signer/SignerPage';
// import AnnotationSidebar from './signer/annotation-sidebar';
import { Annotation } from './signer/types'
import { PdfRenderer } from './signer/SignerPage'
import React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

interface PdfSignerProps {
    fileData: File | null
    setActiveStep: (page: number) => void
    documentSignatures?: SignatureData[]
}

const PdfSigner: React.FC<PdfSignerProps> = ({
    fileData,
    setActiveStep,
    documentSignatures,
}) => {
    const {
        formTemplates,
        systemFileInfo,
        selectedFileInfo,
        setSelectedFileInfo,
        setFiles,
    } = useStore(appStore)
    // State for PDF document
    const [pdfFile, setPdfFile] = useState<File | null>(null)
    const [_pdfUrl, setPdfUrl] = useState<string | null>(null)
    const [_pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null)
    const [creatingUserSignature, setCreatingUserSignature] =
        useState<boolean>(false)
    const [signers, setSigners] = useState<string[]>([])
    const [allSignersBeforeMe, setAllSignersBeforeMe] = useState<string[]>([])
    // const [userCanSign, setUserCanSign] = useState<boolean>(false);

    // const [numPages, setNumPages] = useState<number>(0);
    // const [currentPage, setCurrentPage] = useState<number>(1);

    // State for signatures
    const signatureRef = useRef<SignatureCanvas | null>(null)
    const [mySignaturesAquaTree, setMySignaturesAquaTree] = useState<
        Array<ApiFileInfo>
    >([])
    const [mySignatureData, setMySignatureData] = useState<
        Array<SignatureData>
    >([])

    // const [signaturesInDocument, setSignaturesInDocument] = useState<SignatureData[]>(documentSignatures || []);

    const [selectedSignatureId, setSelectedSignatureId] = useState<
        string | null
    >(null)
    const [signerName, setSignerName] = useState<string>('John Doe')
    const [signaturePositions, setSignaturePositions] = useState<
        SignatureData[]
    >([])
    const [placingSignature, setPlacingSignature] = useState<boolean>(false)
    // const [signatureSize, setSignatureSize] = useState<number>(330);
    const [canPlaceSignature, setCanPlaceSignature] = useState(false)
    const [selectedTool, setSelectedTool] = useState<
        'text' | 'image' | 'profile' | 'signature' | null
    >(null)
    const [submittingSignatureData, setSubmittingSignatureData] =
        useState(false)

    // Modal state
    const [isOpen, setIsOpen] = useState(false)

    // Get wallet address from store
    const { session, backend_url } = useStore(appStore)

    // PDF viewer container ref
    // const pdfContainerRef = useRef<HTMLDivElement>(null);
    const pdfMainContainerRef = useRef<HTMLDivElement>(null)

    const navigate = useNavigate()

    const saveRevisionsToServerForUser = async (
        aquaTrees: AquaTree[],
        address: string
    ) => {
        // console.log(`aquaTrees ${aquaTrees.length}`)
        for (let index = 0; index < aquaTrees.length; index++) {
            const aquaTree = aquaTrees[index]

            // console.log(`aquaTrees ${index}  ${JSON.stringify(aquaTree, null, 4)}`)
            try {
                const revisionHashes = Object.keys(aquaTree.revisions)
                const lastHash = revisionHashes[revisionHashes.length - 1]
                const lastRevision = aquaTree.revisions[lastHash]

                const url = `${backend_url}/tree/user`
                const actualUrlToFetch = ensureDomainUrlHasSSL(url)

                const response = await axios.post(
                    actualUrlToFetch,
                    {
                        revision: lastRevision,
                        revisionHash: lastHash,
                        address: address,
                        orginAddress: session?.address,
                    },
                    {
                        headers: {
                            nonce: session?.nonce,
                        },
                    }
                )

                if (response.status === 200 || response.status === 201) {
                    // console.log(`💯 Revision ${index + 1} saved successfully to the API`);
                    // todo a method to notify the other user should go here
                }
            } catch (error) {
                console.error(`Error saving revision ${index + 1}:`, error)
                throw new Error(`Error saving revision ${index + 1} to server`)
            }
        }
    }

    // Helper function to show error messages
    const showError = (message: string) => {
        toast.error(message)
    }

    // Helper function to create signature form data
    const createSignatureFormData = (signaturePosition: SignatureData[]) => {
        const signForm: { [key: string]: string | number } = {}

        signaturePosition.forEach((signaturePositionItem, index) => {
            const pageIndex = signaturePositionItem.page
            signForm[`x_${index}`] = Number(signaturePositionItem.x.toFixed(14))
            signForm[`y_${index}`] = Number(signaturePositionItem.y.toFixed(14))
            signForm[`page_${index}`] = pageIndex.toString()
            signForm[`width_${index}`] = signaturePositionItem.width.toString()
            signForm[`height_${index}`] =
                signaturePositionItem.height.toString()
        })

        return signForm
    }

    // Helper function to create user signature aqua tree
    const createUserSignatureAquaTree = async (
        aquafier: Aquafier,
        signForm: any
    ) => {
        const jsonString = JSON.stringify(signForm, null, 2)
        const estimateSize = estimateFileSize(jsonString)

        const randomNumber = getRandomNumber(100, 1000)
        const lastFourChar = session?.address.substring(
            session?.address.length - 4
        )
        const fileObjectUserSignature: FileObject = {
            fileContent: jsonString,
            fileName: `user_signature_data_${lastFourChar}_${randomNumber}.json`,
            path: './',
            fileSize: estimateSize,
        }

        const userSignatureDataAquaTree = await aquafier.createGenesisRevision(
            fileObjectUserSignature,
            true,
            false,
            false
        )

        if (userSignatureDataAquaTree.isErr()) {
            showError('Signature data creation failed')
            return null
        }

        // console.log(`👁️‍🗨️👁️‍🗨️ AquaTree form ${JSON.stringify(userSignatureDataAquaTree.data.aquaTree!, null, 4)} \n jsonString ${jsonString}`);

        // Save to server
        await saveAquaTree(
            userSignatureDataAquaTree.data.aquaTree!,
            fileObjectUserSignature,
            true,
            true,
            ''
        )

        console.log(`here 1`)
        return {
            aquaTree: userSignatureDataAquaTree.data.aquaTree!,
            fileObject: fileObjectUserSignature,
        }
    }

    // Helper function to link main document with signature data
    const linkMainDocumentWithSignatureData = async (
        aquafier: Aquafier,
        userSignatureData: any
    ) => {
        const sigFileObject =
            getAquaTreeFileObject(selectedFileInfo!) ??
            selectedFileInfo?.fileObject[0]

        const aquaTreeWrapper: AquaTreeWrapper = {
            aquaTree: selectedFileInfo!.aquaTree!,
            revision: '',
            fileObject: sigFileObject,
        }

        const userSignatureDataAquaTreeWrapper: AquaTreeWrapper = {
            aquaTree: userSignatureData.aquaTree,
            revision: '',
            fileObject: userSignatureData.fileObject,
        }

        const resLinkedAquaTreeWithUserSignatureData =
            await aquafier.linkAquaTree(
                aquaTreeWrapper,
                userSignatureDataAquaTreeWrapper
            )

        if (resLinkedAquaTreeWithUserSignatureData.isErr()) {
            showError('Signature data not appended to main tree successfully')
            return null
        }

        return resLinkedAquaTreeWithUserSignatureData.data.aquaTree!
    }

    // Helper function to link signature tree to document
    const linkSignatureTreeToDocument = async (
        aquafier: Aquafier,
        linkedAquaTree: any
    ) => {
        const linkedAquaTreeWrapper: AquaTreeWrapper = {
            aquaTree: linkedAquaTree,
            revision: '',
            fileObject:
                getAquaTreeFileObject(selectedFileInfo!) ??
                selectedFileInfo?.fileObject[0],
        }

        if (selectedSignatureId == null) {
            throw Error(`selected signature id is null `)
        }
        // const signatureFileObject = getAquaTreeFileObject(signatureInfo) ?? signatureInfo.fileObject[0];
        let sigData: ApiFileInfo | undefined = undefined

        for (const e of mySignaturesAquaTree) {
            const allHashes = Object.keys(e.aquaTree?.revisions ?? {})
            if (allHashes.includes(selectedSignatureId)) {
                sigData = e
                break
            }
        }

        if (sigData == undefined) {
            throw Error(`signature api data not found `)
        }

        // let genHa
        const signatureAquaTreeWrapper: AquaTreeWrapper = {
            aquaTree: sigData.aquaTree!,
            revision: '',
            fileObject: getAquaTreeFileObject(sigData),
        }

        const resLinkedAquaTree = await aquafier.linkAquaTree(
            linkedAquaTreeWrapper,
            signatureAquaTreeWrapper
        )

        if (resLinkedAquaTree.isErr()) {
            showError('Signature tree not appended to main tree successfully')
            return null
        }

        return resLinkedAquaTree.data.aquaTree!
    }

    // Helper function to sign with MetaMask
    const signWithMetaMask = async (aquafier: Aquafier, aquaTree: AquaTree) => {
        const signatureFileObject =
            getAquaTreeFileObject(selectedFileInfo!) ??
            selectedFileInfo?.fileObject[0]
        //getAquaTreeFileObject(aquaTree) ?? signAquaTree[0].fileObject[0];

        const aquaTreeWrapper: AquaTreeWrapper = {
            aquaTree: aquaTree,
            revision: '',
            fileObject: signatureFileObject,
        }

        const resLinkedMetaMaskSignedAquaTree = await aquafier.signAquaTree(
            aquaTreeWrapper,
            'metamask',
            dummyCredential()
        )

        if (resLinkedMetaMaskSignedAquaTree.isErr()) {
            showError(
                'MetaMask signature not appended to main tree successfully'
            )
            return null
        }

        return resLinkedMetaMaskSignedAquaTree.data.aquaTree!
    }

    const shareRevisionsToOwnerAnOtherSignersOfDocument = async (
        aquaTrees: AquaTree[]
    ) => {
        //get genesis hash
        const genesisHash = getGenesisHash(selectedFileInfo!.aquaTree!)

        if (genesisHash) {
            const revision = selectedFileInfo!.aquaTree!.revisions[genesisHash]
            const sender: string | undefined = revision['forms_sender']
            const signers: string | undefined = revision['forms_signers']

            if (sender == undefined) {
                showError('Workflow sender not found')
                return
            }

            if (signers == undefined) {
                showError('Workflow signers not found')
                return
            }

            if (signers.includes(',')) {
                const allSigners: string[] = signers.split(',')

                for (const aSigner of allSigners) {
                    // dont resend the revision to the user as this was handled before this function call
                    if (aSigner != session?.address) {
                        await saveRevisionsToServerForUser(aquaTrees, aSigner)
                    }
                }
            }

            if (sender != signers) {
                //send the signatures to workflow creator
                await saveRevisionsToServerForUser(aquaTrees, sender)
            }
        }
    }

    // Function to create a notification for contract signing
    const createSigningNotification = async (
        senderAddress: string,
        receiverAddress: string
    ) => {
        try {
            // Don't create notification if sender and receiver are the same
            if (senderAddress === receiverAddress) {
                return
            }

            const url = `${backend_url}${API_ENDPOINTS.NOTIFICATIONS}`
            const actualUrlToFetch = ensureDomainUrlHasSSL(url)

            await axios.post(
                actualUrlToFetch,
                {
                    receiver: receiverAddress,
                    content: `${senderAddress} has signed the shared contract`,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        nonce: session?.nonce,
                    },
                }
            )

            console.log('Signing notification created successfully')
        } catch (error) {
            console.error('Error creating signing notification:', error)
            // Don't show error to user as this is not critical functionality
        }
    }

    // Helper function to save multiple revisions to server
    const saveRevisionsToServer = async (aquaTrees: AquaTree[]) => {
        // console.log(`aquaTrees ${aquaTrees.length}`)
        for (let index = 0; index < aquaTrees.length; index++) {
            const aquaTree = aquaTrees[index]

            // console.log(`aquaTrees ${index}  ${JSON.stringify(aquaTree, null, 4)}`)
            try {
                const revisionHashes = Object.keys(aquaTree.revisions)
                const lastHash = revisionHashes[revisionHashes.length - 1]
                const lastRevision = aquaTree.revisions[lastHash]

                const url = `${backend_url}/tree`
                const actualUrlToFetch = ensureDomainUrlHasSSL(url)

                const response = await axios.post(
                    actualUrlToFetch,
                    {
                        revision: lastRevision,
                        revisionHash: lastHash,
                        orginAddress: session?.address,
                    },
                    {
                        headers: {
                            nonce: session?.nonce,
                        },
                    }
                )

                if (response.status === 200 || response.status === 201) {
                    // console.log(`💯 Revision ${index + 1} saved successfully to the API`);
                }
            } catch (error) {
                console.error(`Error saving revision ${index + 1}:`, error)
                throw new Error(`Error saving revision ${index + 1} to server`)
            }
        }
    }

    // Helper function to update UI after success
    const updateUIAfterSuccess = async () => {
        try {
            // Fetch updated files
            const url2 = `${backend_url}/explorer_files`
            const files = await fetchFiles(
                `${session?.address}`,
                url2,
                `${session?.nonce}`
            )
            setFiles(files)

            // Find and update selected file
            const selectedFileGenesisHash = getGenesisHash(
                selectedFileInfo!.aquaTree!
            )
            const selectedFile = files.find(
                data =>
                    getGenesisHash(data.aquaTree!) === selectedFileGenesisHash
            )

            if (selectedFile) {
                setSelectedFileInfo(selectedFile)
                toast.success(`Document signed successfully`)
                setActiveStep(1)
            } else {
                throw new Error('Updated file not found')
            }
        } catch (error) {
            toast.error(`An error occurred, redirecting to home`)

            setTimeout(() => {
                window.location.reload()
            }, 150)
            navigate('/')
        }
    }

    const submitSignatureData = async (signaturePosition: SignatureData[]) => {
        setSubmittingSignatureData(true)

        try {
            const aquafier = new Aquafier()

            // Step 1: Create signature form data
            const signForm = createSignatureFormData(signaturePosition)

            // Step 2: Create user signature data aqua tree
            const userSignatureDataAquaTree = await createUserSignatureAquaTree(
                aquafier,
                signForm
            )
            if (!userSignatureDataAquaTree) return

            // Step 3: Link main document with user signature data
            const linkedAquaTreeWithUserSignatureData =
                await linkMainDocumentWithSignatureData(
                    aquafier,
                    userSignatureDataAquaTree
                )
            if (!linkedAquaTreeWithUserSignatureData) return

            // Step 4: Link signature tree with the document
            const linkedAquaTreeWithSignature =
                await linkSignatureTreeToDocument(
                    aquafier,
                    linkedAquaTreeWithUserSignatureData
                )
            if (!linkedAquaTreeWithSignature) return

            // Step 5: Sign with MetaMask
            const metaMaskSignedAquaTree = await signWithMetaMask(
                aquafier,
                structuredClone(linkedAquaTreeWithSignature)
            )
            if (!metaMaskSignedAquaTree) return

            // Step 6: Save both revisions to server (only after successful MetaMask signing)
            await saveRevisionsToServer([
                linkedAquaTreeWithUserSignatureData,
                linkedAquaTreeWithSignature,
                metaMaskSignedAquaTree,
            ])

            // Step 7: Create notification for the contract sender
            // Get the genesis hash to find the contract sender
            const genesisHash = getGenesisHash(selectedFileInfo!.aquaTree!)
            if (genesisHash) {
                const revision =
                    selectedFileInfo!.aquaTree!.revisions[genesisHash]
                const sender = revision['forms_sender']

                // Only create notification if the current user is not the sender
                if (sender && session?.address && sender !== session.address) {
                    await createSigningNotification(session.address, sender)
                }
            }

            // Step 8: Update UI and refresh files
            await updateUIAfterSuccess()

            // Step 9:
            // check if the owner of the document is a different wallet address send him the above revsions
            // send the revision to the other wallet address if possible
            await shareRevisionsToOwnerAnOtherSignersOfDocument([
                linkedAquaTreeWithUserSignatureData,
                linkedAquaTreeWithSignature,
                metaMaskSignedAquaTree,
            ])
        } catch (error) {
            console.error('Error in submitSignatureData:', error)
            showError(
                'An unexpected error occurred during signature submission'
            )
        } finally {
            setSubmittingSignatureData(false)
        }
    }

    // Clear signature canvas
    const clearSignature = () => {
        if (signatureRef.current) {
            signatureRef.current.clear()
            // Don't clear all signatures, just reset the canvas
        }
    }

    const saveAquaTree = async (
        aquaTree: AquaTree,
        fileObject: FileObject,
        isFinal: boolean = false,
        isWorkflow: boolean = false,
        template_id: string
    ): Promise<boolean> => {
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
            formData.append('account', session?.address || '')
            formData.append('is_workflow', `${isWorkflow}`)

            //workflow specifi

            formData.append('template_id', template_id)

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
                    console.log(`Is finale ${isFinal}`)
                }

                console.log(`Got back a 200..`)
            }
            return true
        } catch (error) {
            toast.error('Error uploading aqua tree', {
                description:
                    error instanceof Error ? error.message : 'Unknown error',
                duration: 5000,
            })

            return false
        }
    }

    const createWorkflowFromTemplate = async (): Promise<boolean> => {
        const selectedTemplate = formTemplates.find(
            e => e.name == 'user_signature'
        )

        if (!selectedTemplate) {
            toast.error('User Signature template not found', {
                description: `User Signature template not found`,
                duration: 5000,
            })
            return false
        }

        if (systemFileInfo.length == 0) {
            toast.error('Aqua tree for templates not found')
            return false
        }

        if (!signatureRef.current) {
            toast.error('Signature image not found')
            return false
        }

        if (session?.address == undefined) {
            toast.error('Wallet address not found')
            return false
        }

        const templateApiFileInfo = systemFileInfo.find(e => {
            const nameExtract = getAquaTreeFileName(e!.aquaTree!)
            const selectedName = `${selectedTemplate?.name}.json`
            console.log(
                `nameExtract ${nameExtract} == selectedName ${selectedName}`
            )
            return nameExtract == selectedName
        })
        if (!templateApiFileInfo) {
            toast.error(`Aqua tree for ${selectedTemplate?.name} not found`)
            return false
        }

        const dataUrl = signatureRef.current.toDataURL('image/png')

        const epochInSeconds = Math.floor(Date.now() / 1000)
        const lastFiveCharactersOfWalletAddres = session?.address.slice(-5)
        const signatureFileName = `user_signature_${lastFiveCharactersOfWalletAddres}_${epochInSeconds}.png`
        const signatureFile = dataURLToFile(dataUrl, signatureFileName)

        setSignaturePositions([])

        const formData = {
            name: signerName,
            wallet_address: session!.address,
            image: signatureFile,
        }
        const aquafier = new Aquafier()
        const filteredData: Record<string, string | number> = {}

        Object.entries(formData).forEach(([key, value]) => {
            // Only include values that are not File objects
            if (!(value instanceof File)) {
                filteredData[key] = value
            }
        })

        const estimateize = estimateFileSize(JSON.stringify(formData))

        const jsonString = JSON.stringify(formData, null, 4)

        const randomNumber = getRandomNumber(100, 1000)
        const lastSixChar = session?.address.substring(
            session?.address.length - 6
        )
        const fileObject: FileObject = {
            fileContent: jsonString,
            fileName: `${selectedTemplate?.name ?? 'template'}-${lastSixChar}-${randomNumber}.json`,
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
            // create a link revision with the systems aqua tree
            const mainAquaTreeWrapper: AquaTreeWrapper = {
                aquaTree: genesisAquaTree.data.aquaTree!,
                revision: '',
                fileObject: fileObject,
            }
            const linkedAquaTreeFileObj =
                getAquaTreeFileObject(templateApiFileInfo)

            if (!linkedAquaTreeFileObj) {
                toast.error('system Aqua tee has error')
                return false
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
                toast.error('Error linking aqua tree')
                return false
            }

            let aquaTreeData = linkedAquaTreeResponse.data.aquaTree!

            const containsFileData = selectedTemplate?.fields.filter(
                e => e.type == 'file' || e.type == 'image'
            )
            if (containsFileData && containsFileData.length > 0) {
                // for (let index = 0; index < containsFileData.length; index++) {
                //     const element = containsFileData[index];
                //     const file: File = formData[element['name']] as File

                // Create an array to store all file processing promises
                const fileProcessingPromises = containsFileData.map(
                    async element => {
                        const file: File = formData['image']

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

                            toast.error('Error linking aqua tree')
                            return false
                        }
                        // upload the single aqua tree
                        const resApi = await saveAquaTree(
                            aquaTreeResponse.data.aquaTree!,
                            item,
                            false,
                            true,
                            selectedTemplate.id
                        )
                        console.log(`here 2`)
                        if (resApi == false) {
                            toast.error('An Error  occured saving signature')
                            return false
                        }
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

                            toast.error('Error linking aqua tree')
                            return false
                        }
                        aquaTreeData = res.data.aquaTree!
                    }
                } catch (error) {
                    console.error('Error processing files:', error)

                    toast.error('Error proceessing files')
                    return false
                }
            }

            console.log(`here 2.5`)
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
                console.log(`here 2.6 -- err`)
                toast.error('Error signing failed')
                return false
            } else {
                console.log('signRes.data', signRes.data)
                fileObject.fileContent = formData
                const resApi = await saveAquaTree(
                    signRes.data.aquaTree!,
                    fileObject,
                    true,
                    true,
                    selectedTemplate.id
                )
                console.log(`here 3`)
                if (resApi == false) {
                    toast.error('An Error  occured saving signature')
                    return false
                }

                const genHash = getGenesisHash(signRes.data.aquaTree!)
                if (genHash == null || genHash == undefined) {
                    toast.error('Error  Aqua tree - Genesis hash not found')
                }

                setSignerName('')
                return true
            }
        } else {
            toast.error('Error creating Aqua tree from template')

            return false
        }
    }

    // Save signature from canvas
    const saveSignature = async () => {
        setCreatingUserSignature(true)
        if (signatureRef.current && !signatureRef.current.isEmpty()) {
            if (signaturePositions.length > 0) {
                const userConfirmed = confirm(
                    'Your document will lose all the signatures appended. Do you want to continue?'
                )
                if (!userConfirmed) {
                    setSignerName('')
                    setIsOpen(false)

                    // Clear the canvas for next signature
                    if (signatureRef.current) {
                        signatureRef.current.clear()
                    }

                    return // Exit if user clicks "Cancel" (No)
                }
            }

            const resp = await createWorkflowFromTemplate()
            if (resp) {
                await loadUserSignatures(true)

                setIsOpen(false)
                setCreatingUserSignature(false)

                // Clear the canvas for next signature
                if (signatureRef.current) {
                    signatureRef.current.clear()
                }

                toast.success('Signature saved', {
                    description: 'You can now place it on the document',
                    duration: 3000,
                })

                // If user is in placing mode, allow them to place the signature
                if (!placingSignature) {
                    setPlacingSignature(true)
                    toast.info('Click on the PDF to place your signature', {
                        duration: 3000,
                    })
                }
            }
        } else {
            setCreatingUserSignature(false)

            toast.warning('Please draw a signature first', {
                duration: 3000,
            })
        }
    }

    const fetchImage = async (fileUrl: string) => {
        try {
            const actualUrlToFetch = ensureDomainUrlHasSSL(fileUrl)
            const response = await fetch(actualUrlToFetch, {
                headers: {
                    nonce: `${session?.nonce}`,
                },
            })

            if (!response.ok) {
                console.error(
                    'FFFailed to fetch file:',
                    response.status,
                    response.statusText
                )
                return null
            }

            // Get content type from headers
            let contentType = response.headers.get('Content-Type') || ''

            // If content type is missing or generic, try to detect from URL
            if (
                contentType === 'application/octet-stream' ||
                contentType === ''
            ) {
                contentType = 'image/png'
            }

            if (contentType.startsWith('image')) {
                const arrayBuffer = await response.arrayBuffer()
                // Ensure we use the PDF content type
                const blob = new Blob([arrayBuffer], { type: contentType })
                return URL.createObjectURL(blob)
            }

            return null
        } catch (error) {
            console.error('Error fetching file:', error)
            return null
        }
    }

    // Handle signature dragging
    const [activeDragId, setActiveDragId] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)

    // const handleDragStart = (e: React.MouseEvent | React.TouchEvent, id: string) => {
    //     e.stopPropagation();
    //     setActiveDragId(id);
    //     setIsDragging.on();
    // };

    // Helper function to get position from either mouse or touch event
    const getEventPosition = (e: MouseEvent | TouchEvent) => {
        // Touch event
        if ('touches' in e && e.touches.length > 0) {
            return {
                clientX: e.touches[0].clientX,
                clientY: e.touches[0].clientY,
            }
        }
        // Mouse event
        return {
            clientX: (e as MouseEvent).clientX,
            clientY: (e as MouseEvent).clientY,
        }
    }

    const handleDragMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging || !activeDragId || !pdfMainContainerRef.current) return

        e.preventDefault()

        // Get the PDF container dimensions
        const rect = pdfMainContainerRef.current.getBoundingClientRect()

        // Find the actual PDF element within the container
        const pdfElement =
            pdfMainContainerRef.current.querySelector('.react-pdf__Page')
        const pdfRect = pdfElement ? pdfElement.getBoundingClientRect() : rect

        // Get position from either mouse or touch event
        const { clientX, clientY } = getEventPosition(e)

        // Calculate position relative to the PDF element, not the container
        const x = clientX - pdfRect.left
        const y = clientY - pdfRect.top

        // Calculate relative position (0-1) for PDF coordinates
        const relativeX = x / pdfRect.width
        const relativeY = 1 - y / pdfRect.height // Invert Y for PDF coordinates

        setSignaturePositions(prev =>
            prev.map(pos => {
                if (pos.id === activeDragId) {
                    return {
                        ...pos,
                        x: relativeX,
                        y: relativeY,
                        isDragging: true,
                    }
                }
                return pos
            })
        )
    }

    const handleDragEnd = () => {
        if (!isDragging) return

        setSignaturePositions(prev =>
            prev.map(pos => ({
                ...pos,
                isDragging: false,
            }))
        )

        setActiveDragId(null)
        setIsDragging(false)

        toast.success('Signature position updated', {
            duration: 2000,
        })
    }

    // Component for signature display on PDF
    // const handlePageChange = (pageNumber: number, _totalPages: number) => {
    //     setCurrentPage(pageNumber);
    // };

    const loadUserSignatures = async (selectSignature: boolean = false) => {
        if (
            backend_url == 'http://0.0.0.0:0' ||
            backend_url == 'https://0.0.0.0:0'
        ) {
            // console.log(`load signature is aborted  as url is ${backend_url} `)
            return
        }
        if (session?.address == undefined || session?.address == '') {
            // console.log(`load signature is aborted  as session is ${session?.address} `)
            return
        }

        // proceed as url and session is set
        const url = `${backend_url}/tree/user_signatures`
        try {
            const response = await axios.get(url, {
                headers: {
                    nonce: session?.nonce,
                },
            })

            const userSignaturesApiInfo: Array<ApiFileInfo> = response.data.data
            // Make the logic here work with the current Signature Interface

            setMySignaturesAquaTree(userSignaturesApiInfo)

            const apiSigntures: SignatureData[] = []
            // first revision should be a form
            // second revision is a link to signature aqua tree template
            // third revision should  be link to sinature image
            // fourth revision is a signature
            for (const userSignature of userSignaturesApiInfo) {
                // all hashes
                const allHashes = Object.keys(
                    userSignature.aquaTree!.revisions!
                )

                const firstRevision =
                    userSignature.aquaTree?.revisions[allHashes[0]]
                if (!firstRevision) {
                    // console.log(`📢📢 first revision does not exist, this should be investigated`)
                    continue
                }
                if (!firstRevision.forms_wallet_address) {
                    // console.log(`📢📢 first revision does not contain wallet address, this should be investigated`)
                    continue
                }
                if (!firstRevision.forms_name) {
                    // console.log(`📢📢 first revision does not contain signature name, this should be investigated`)
                    continue
                }
                const sinatureAquaTreeName =
                    userSignature.aquaTree?.file_index[allHashes[0]]
                if (!sinatureAquaTreeName) {
                    // console.log(`📢📢 aqua tree sintaure instance unique na`)
                    continue
                }
                const thirdRevision =
                    userSignature.aquaTree?.revisions[allHashes[2]]
                if (!thirdRevision) {
                    // console.log(`📢📢 third revision does not exist, this should be investigated`)
                    continue
                }
                if (!thirdRevision.link_verification_hashes) {
                    // console.log(`📢📢 third revision link_verification_hashes is undefined, this should be investigated`)
                    continue
                }
                const signatureHash = thirdRevision.link_verification_hashes[0]
                const signatureImageName =
                    userSignature.aquaTree?.file_index[signatureHash]
                if (!signatureImageName) {
                    // console.log(`📢📢 signature Image Name not found in index, this should be investigated`)

                    continue
                }

                const signatureImageObject = userSignature.fileObject.find(
                    e => e.fileName == signatureImageName
                )
                if (!signatureImageObject) {
                    // console.log(`📢📢 file object does not contain the signature image object, this should be investigated`)

                    continue
                }

                const forthRevision =
                    userSignature.aquaTree?.revisions[allHashes[3]]
                if (!thirdRevision) {
                    // console.log(`📢📢 forth revision does not exist, this should be investigated`)
                    continue
                }

                if (
                    forthRevision?.signature_wallet_address != session.address
                ) {
                    // console.log(` 🤫🤫 skip signature as its not mine`)
                    continue
                }

                const fileContentUrl = signatureImageObject.fileContent

                if (
                    typeof fileContentUrl === 'string' &&
                    fileContentUrl.startsWith('http')
                ) {
                    let dataUrl = await fetchImage(fileContentUrl)

                    if (!dataUrl) {
                        dataUrl = '/images/placeholder-img.png'
                    }

                    // Add to signature
                    const sign: SignatureData = {
                        type: 'signature',
                        id: crypto.randomUUID(),
                        hash: getGenesisHash(userSignature.aquaTree!) ?? 'err2',
                        name: firstRevision.forms_name,
                        walletAddress: firstRevision.forms_wallet_address,
                        dataUrl: dataUrl,
                        createdAt:
                            timeStampToDateObject(
                                firstRevision.local_timestamp
                            ) ?? new Date(),
                        page: 0, // Default to 0, will be updated when placed
                        x: 0, // Default to 0, will be updated when placeholder
                        y: 0, // Default to 0, will be updated when placeholder
                        width: 100, // Default width, will be updated when placed
                        height: 120, // Default height, will be updated when placed
                        isDragging: false, // Default to false, will be updated when dragging
                        signatureId: signatureHash, // Use the signature hash as the ID
                        rotation: 0,
                        imageWidth: 100,
                        imageHeight: 150,
                        imageAlt: 'No image found',
                    }
                    apiSigntures.push(sign)
                }
            }

            // console.log(`Signatures length ${apiSigntures.length} now update state ${JSON.stringify(apiSigntures)}`)

            // Update mySignatureData with the fetched signatures
            setMySignatureData(apiSigntures)

            if (selectSignature) {
                let latestObject: SignatureData | null = null
                let latestTimestamp: Date | null = null
                if (apiSigntures.length > 0) {
                    for (const obj of apiSigntures) {
                        if (latestTimestamp == null) {
                            latestTimestamp = obj.createdAt
                            latestObject = obj
                        } else {
                            if (obj.createdAt > latestTimestamp) {
                                latestTimestamp = obj.createdAt
                                latestObject = obj
                            }
                        }
                    }
                }

                if (latestObject != null) {
                    setSelectedSignatureId(latestObject.hash)
                }
            }
        } catch (e) {
            // console.log(`loadUserSignaturez Error ${e}`)
        }
    }

    // const renderProfileAnnotationEditor = (_anno: SignatureData) => {
    const renderProfileAnnotationEditor = () => {
        {
            /* Signatures placed on document */
        }
        console.log(
            `renderProfileAnnotationEditor called with annotation: ${JSON.stringify(signaturePositions, null, 4)}`
        )
        return (
            <>
                {signaturePositions.length > 0 && (
                    <>
                        {/* Signatures on Document section */}
                        <div className="max-h-[150px] overflow-y-auto border border-gray-200 rounded-md">
                            <div className="flex flex-col">
                                {signaturePositions.map(position => {
                                    // const signature = signaturesInDocument.find(sig => sig.id === position.signatureId);
                                    // if (!signature) return null;

                                    return (
                                        <div
                                            key={position.id}
                                            className="p-2 flex justify-between items-center"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <div
                                                    className="w-[40px] h-[30px] bg-contain bg-no-repeat bg-center border border-gray-200 rounded-sm"
                                                    style={{
                                                        backgroundImage: `url(${position.dataUrl})`,
                                                    }}
                                                />
                                                <p className="text-xs">
                                                    {position.name} (Page{' '}
                                                    {position.page})
                                                </p>

                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-6 w-6 p-0"
                                                    onClick={e => {
                                                        e.preventDefault()

                                                        // console.log(`B4 Delete ${JSON.stringify(signaturePositions, null, 4)}`)
                                                        const newData: SignatureData[] =
                                                            []
                                                        for (const item of signaturePositions) {
                                                            // console.log(`item id ${item.id} -- ${position.id}`)
                                                            if (
                                                                item.id !=
                                                                position.id
                                                            ) {
                                                                newData.push(
                                                                    item
                                                                )
                                                            }
                                                        }

                                                        // console.log(`After Delete ${JSON.stringify(newData, null, 4)}`)
                                                        setSignaturePositions(
                                                            newData
                                                        )
                                                    }}
                                                >
                                                    <LuTrash className="h-3 w-3 text-red-500" />
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </>
                )}
            </>
        )
    }

    const annotationSidebar = () => {
        return (
            <div className="w-full bg-card border-l rounded-xl p-4 h-full flex flex-col">
                <div className="space-y-2">
                    <div className="flex items-center justify-between pb-2">
                        <h3 className="text-base font-medium">
                            Signatures in Document..
                        </h3>
                    </div>
                    <div>
                        {signaturePositions.length > 0 ? (
                            <>{renderProfileAnnotationEditor()}</>
                        ) : (
                            <p className="text-muted-foreground text-sm text-center py-4">
                                No signatures yet.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    const signatureSideBar = () => {
        const isInSinatures = signers.find(e => {
            const res =
                e.toLowerCase().trim() == session!.address.toLowerCase().trim()
            console.log(
                `Comparing iten ${e.toLowerCase()} to  ${session!.address.toLowerCase()} res ${res}`
            )
            return res
        })

        if (signers.length == 0) {
            return (
                <p className="text-sm">
                    Signers for document workflow not found
                </p>
            )
        }

        if (isInSinatures == undefined) {
            return (
                <div className="flex flex-col space-y-3">
                    <h4 className="text-md font-medium">Signers</h4>
                    <div className="space-y-2">
                        {signers.map((e, index) => {
                            return (
                                <div
                                    key={e}
                                    className="bg-background shadow-sm p-2 rounded-sm"
                                >
                                    <div className="flex items-center space-x-1">
                                        <span className="text-xs">
                                            {index + 1}.
                                        </span>
                                        <span className="text-xs"> {e}</span>
                                    </div>
                                </div>
                            )
                            // return <HStack key={e} p={2} justify="space-between">
                            //         <Text fontSize="xs">{index+1}.&nbsp;{e.replace("\"","")}</Text>
                            // </HStack>
                        })}
                    </div>
                </div>
            )
        }

        if (allSignersBeforeMe.length > 0) {
            return (
                <div className="flex flex-col gap-2 p-2 border border-gray-100 dark:border-gray-800 rounded-md">
                    <p className="text-md">
                        The following wallet address need to sign before you
                        can.
                    </p>

                    <div className="p-2 space-y-2">
                        {allSignersBeforeMe.map((e, index) => {
                            return (
                                <div
                                    key={e}
                                    className="bg-background shadow-sm p-2 rounded-sm"
                                >
                                    <div className="flex items-center space-x-1">
                                        <span className="text-xs">
                                            {index + 1}.
                                        </span>
                                        <span className="text-xs"> {e}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )
        }

        return (
            <div className="col-span-12 md:col-span-1 h-auto md:h-full overflow-hidden md:overflow-auto">
                <div className="flex flex-col gap-4 p-4 border border-gray-100 dark:border-gray-800 rounded-md">
                    <Button
                        data-testid="action-create-signature-button"
                        className="flex items-center gap-2"
                        onClick={() => setIsOpen(true)}
                    >
                        <FaPlus className="h-4 w-4" />
                        Create Signature
                    </Button>

                    {/* Signature List */}
                    {mySignaturesAquaTree.length > 0 && (
                        <>
                            <div className="space-y-2">
                                <h4 className="font-bold mt-2">
                                    Your Signatures:{' '}
                                </h4>
                                <div className="max-h-[200px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
                                    <div className="flex flex-col">
                                        {(() => {
                                            // const signature = signatures.find((signature) => signature.walletAddress === session?.address);
                                            const signature =
                                                mySignatureData.find(
                                                    sig =>
                                                        sig.hash ===
                                                            selectedSignatureId ||
                                                        sig.id ===
                                                            selectedSignatureId
                                                )
                                            if (!signature) {
                                                return (
                                                    <div
                                                        style={{
                                                            whiteSpace:
                                                                'pre-wrap',
                                                        }}
                                                    >
                                                        Signature not found{' '}
                                                    </div>
                                                )
                                            }

                                            return signature ? (
                                                <div
                                                    key={signature.hash}
                                                    className="p-2 cursor-pointer bg-blue-50 hover:bg-gray-50"
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <div
                                                            className="w-[80px] min-w-[80px] h-[40px] min-h-[40px] bg-contain bg-no-repeat bg-center border border-gray-200 rounded-sm"
                                                            style={{
                                                                backgroundImage: `url(${signature.dataUrl})`,
                                                            }}
                                                        />
                                                        <div className="flex flex-col flex-1 overflow-hidden space-y-0">
                                                            <p className="text-sm font-medium">
                                                                {signature.name}
                                                            </p>
                                                            <p className="text-xs text-gray-600 break-words">
                                                                {signature.walletAddress ??
                                                                    'NO WALLET ADDRESS'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : null
                                        })()}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <h4 className="font-bold mt-2">
                                    Other Signatures:
                                </h4>
                                <div className="max-h-[200px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
                                    <div className="flex flex-col">
                                        {documentSignatures ? (
                                            documentSignatures.map(
                                                signature => (
                                                    <div
                                                        key={signature.id}
                                                        className={`p-2 cursor-pointer ${selectedSignatureId === signature.id ? 'bg-blue-50' : 'bg-transparent'} hover:bg-gray-50`}
                                                    >
                                                        <div className="flex items-center space-x-3">
                                                            <div
                                                                className="w-[60px] h-[40px] bg-contain bg-no-repeat bg-center border border-gray-200 rounded-sm"
                                                                style={{
                                                                    backgroundImage: `url(${signature.dataUrl})`,
                                                                }}
                                                            />
                                                            <div className="flex flex-col space-y-0">
                                                                <p className="text-sm font-medium">
                                                                    {
                                                                        signature.name
                                                                    }
                                                                </p>
                                                                <p className="text-xs text-gray-600">
                                                                    {signature
                                                                        .walletAddress
                                                                        .length >
                                                                    10
                                                                        ? `${signature.walletAddress.substring(0, 6)}...${signature.walletAddress.substring(signature.walletAddress.length - 4)}`
                                                                        : signature.walletAddress}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            )
                                        ) : (
                                            <></>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {canPlaceSignature ? (
                        // <Alert className='bg-blue-500 text-blue-600'>
                        <Alert className="">
                            <LuInfo />
                            <AlertDescription>
                                Click on the document to place your signature.
                            </AlertDescription>
                        </Alert>
                    ) : null}

                    <Button
                        data-testid="action-signature-to-document-button"
                        onClick={() => {
                            setSelectedTool('signature')
                            //   setSelectedSignatureHash(selectedSignatureHash as any)
                            setCanPlaceSignature(true)
                        }}
                    >
                        Add Signature to document
                    </Button>

                    {annotationSidebar()}

                    <Button
                        data-testid="action-sign-document-button"
                        disabled={
                            signaturePositions.length === 0 ||
                            submittingSignatureData
                        }
                        onClick={handleSignatureSubmission}
                    >
                        Sign document
                    </Button>
                </div>
            </div>
        )
    }

    /**
     * Handles the submission of signature data.
     *
     * Checks if there are any signatures present in the document.
     * If no signatures are detected, displays an error message.
     * If signatures are detected, submits the signature data for processing.
     */
    const handleSignatureSubmission = async () => {
        if (signaturePositions.length == 0) {
            toast.error('No signature detected in document')
            return
        }
        // console.log("before sumbb: ", signaturePositions)
        await submitSignatureData(signaturePositions)
    }

    const addAnnotation = useCallback(
        (newAnnotationData: Annotation) => {
            console.log(
                `addAnnotation called with data: ${JSON.stringify(newAnnotationData, null, 4)}`
            )
            const id =
                Date.now().toString() +
                Math.random().toString(36).substring(2, 9)
            const selectedSignatureInfo = mySignatureData.find(
                signature => signature.hash === selectedSignatureId
            )

            if (!selectedSignatureInfo) {
                // console.log(`error signature hash not found `)
                return
            }
            // console.log("Selected signature info: ", selectedSignatureInfo)
            // ...newAnnotationData, id,
            const newAnnotation: SignatureData = {
                ...(newAnnotationData as SignatureData),
                id,
                name: selectedSignatureInfo.name,
                walletAddress: selectedSignatureInfo.walletAddress,
                dataUrl: selectedSignatureInfo.dataUrl,
            }

            // };

            const data = signaturePositions.find(
                (anno: SignatureData) => anno.id === newAnnotation.id
            )

            if (data) {
                console.log(
                    `Annotation with id ${newAnnotation.id} already exists, skipping addition.`
                )
                return
            }
            setSignaturePositions((prev: any) => {
                let newData = [...prev, newAnnotation]
                // console.log(`New annotation added: ${JSON.stringify(newData, null, 4)}`)
                // Remove duplicates based on id
                newData = newData.filter(
                    (
                        item: SignatureData,
                        index: number,
                        self: SignatureData[]
                    ) => index === self.findIndex(t => t.id === item.id)
                )
                return newData
            })

            setSelectedTool(null)
            setCanPlaceSignature(false)
        },
        [mySignatureData, selectedSignatureId]
    )

    const updateAnnotation = useCallback((updatedAnnotation: Annotation) => {
        setSignaturePositions((prev: any) =>
            prev.map((anno: any) =>
                anno.id === updatedAnnotation.id ? updatedAnnotation : anno
            )
        )
    }, [])

    const deleteAnnotation = useCallback(
        (id: string) => {
            setSignaturePositions(prev => prev.filter(anno => anno.id !== id))
            if (selectedSignatureId === id) {
                setSelectedSignatureId(null)
            }
        },
        [selectedSignatureId]
    )

    // Add event listeners for drag operations
    useEffect(() => {
        if (isDragging) {
            // Mouse events
            document.addEventListener('mousemove', handleDragMove as any)
            document.addEventListener('mouseup', handleDragEnd)

            // Touch events for mobile
            document.addEventListener('touchmove', handleDragMove as any, {
                passive: false,
            })
            document.addEventListener('touchend', handleDragEnd)
            document.addEventListener('touchcancel', handleDragEnd)
        }

        return () => {
            // Clean up all event listeners
            document.removeEventListener('mousemove', handleDragMove as any)
            document.removeEventListener('mouseup', handleDragEnd)
            document.removeEventListener('touchmove', handleDragMove as any)
            document.removeEventListener('touchend', handleDragEnd)
            document.removeEventListener('touchcancel', handleDragEnd)
        }
    }, [isDragging, activeDragId])

    // Effect to update signature positions when window is resized
    useEffect(() => {
        let signers: string[] = []
        const allHashes = Object.keys(selectedFileInfo!.aquaTree!.revisions!)
        const firstRevision =
            selectedFileInfo!.aquaTree?.revisions[allHashes[0]]

        if (firstRevision?.forms_signers) {
            if (firstRevision.forms_signers.includes(',')) {
                signers = firstRevision.forms_signers
                    .split(',')
                    .map((e: string) => e.trim().replace('"', ''))
            } else {
                signers.push(firstRevision?.forms_signers.replace('"', ''))
            }
        }

        setSigners(signers)

        const fourthItmeHashOnwards = allHashes.slice(4)
        let allSignersData = [...signers]

        try {
            if (signers.includes(session!.address)) {
                // setUserCanSign(true)

                // let indexOfMyWalletAddress = signers.indexOf(session!.address);
                // console.log(`beffore index of my wallet ${indexOfMyWalletAddress}`)
                //get all previous signature

                let index = 0
                for (let i = 0; i < fourthItmeHashOnwards.length; i += 3) {
                    const batch = fourthItmeHashOnwards.slice(i, i + 3)
                    // let hashSigPosition = batch[0] ?? ""
                    // let hashSigRev = batch[1] ?? ""
                    const hashSigMetamak = batch[2] ?? ''

                    const revision =
                        selectedFileInfo!.aquaTree!.revisions![hashSigMetamak]

                    allSignersData = allSignersData.filter(
                        item => item !== revision.signature_wallet_address
                    ) //pop()

                    index += 1
                }

                const indexOfMyWalletAddressAfter = allSignersData.indexOf(
                    session!.address
                )
                // console.log(` index ${index} index of my wallet b4 ${indexOfMyWalletAddress} after ${indexOfMyWalletAddressAfter}`)

                const allSignersBeforeMe = allSignersData.slice(
                    0,
                    indexOfMyWalletAddressAfter
                )
                // if (indexOfMyWalletAddress != index) {
                setAllSignersBeforeMe(allSignersBeforeMe)
            }
        } catch (e) {
            // console.log(`Error PDF Signer -  ${e}`)
            toast.error(`Error Loading pdf`)
        }

        console.log(`file data ${fileData} .....`)
        if (fileData) {
            ;(async () => {
                console.log(`Fetch pdf file....`)
                setPdfFile(fileData)

                // Create object URL for display
                const fileUrl = URL.createObjectURL(fileData)
                setPdfUrl(fileUrl)

                // Load PDF document using pdf-lib
                const arrayBuffer = await fileData.arrayBuffer()
                const pdfDoc = await PDFDocument.load(arrayBuffer)
                setPdfDoc(pdfDoc)
            })()
        }

        ;(async () => {
            await loadUserSignatures(true)
        })()

        const handleResize = () => {
            // Force re-render to update signature positions
            setSignaturePositions(prev => [...prev])
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    return (
        <div className="h-[calc(100vh-70px)] overflow-y-scroll md:overflow-hidden">
            <div className="h-[60px] flex items-center">
                <h1 className="text-2xl font-bold">PDF Signer</h1>
            </div>

            {/* PDF viewer and signature tools */}
            <div className="h-[calc(100%-60px)]">
                {pdfFile ? (
                    <>
                        <div className="h-auto md:h-full">
                            <div className="h-auto md:h-full">
                                <div className="grid grid-cols-12 gap-0 h-auto md:h-full">
                                    <div className="col-span-12 md:col-span-9 bg-gray-100 overflow-x-auto overflow-y-scroll h-full">
                                        <div className="h-auto md:h-full p-0 m-0">
                                            {/* This is a custom component do not convert to tailwind, we will convert it separately */}
                                            <PdfRenderer
                                                pdfFile={pdfFile}
                                                annotations={signaturePositions}
                                                annotationsInDocument={
                                                    documentSignatures ?? []
                                                }
                                                onAnnotationAdd={addAnnotation}
                                                onAnnotationUpdate={
                                                    updateAnnotation
                                                }
                                                onAnnotationDelete={
                                                    deleteAnnotation
                                                }
                                                selectedTool={selectedTool}
                                                selectedAnnotationId={
                                                    selectedSignatureId
                                                }
                                                onAnnotationSelect={() => {}}
                                                onAnnotationRotate={() => {}}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-12 md:col-span-3 bg-gray-100 overflow-hidden">
                                        <div className="p-4 h-auto md:h-full overflow-y-scroll overflow-x-hidden break-words">
                                            {signatureSideBar()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <>Error Loading PDF</>
                )}
            </div>

            {/* Signature drawing modal */}
            <Dialog open={isOpen} onOpenChange={open => setIsOpen(open)}>
                <DialogContent className="sm:rounded-lg md:rounded-xl">
                    <DialogHeader>
                        <DialogTitle>Draw Signature</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 p-4">
                        <div className="space-y-2">
                            <Label htmlFor="signer-name">Signer Name</Label>
                            <Input
                                id="signer-name"
                                value={signerName}
                                onChange={e => setSignerName(e.target.value)}
                                placeholder="Enter your name"
                                className="rounded-lg"
                            />
                        </div>

                        <p className="text-sm text-gray-700">
                            Wallet Address:{' '}
                            {session?.address
                                ? `${session?.address.substring(0, 6)}...${session?.address.substring(session?.address.length - 4)}`
                                : 'Not connected'}
                        </p>

                        <div className="border border-gray-200 w-full h-[200px] bg-white">
                            <SignatureCanvas
                                ref={signatureRef}
                                canvasProps={{
                                    style: {
                                        maxWidth: '100%',
                                    },
                                    width: 500,
                                    height: 200,
                                    className: 'signature-canvas',
                                }}
                                backgroundColor="transparent"
                            />
                        </div>

                        <div className="flex flex-row space-x-2">
                            <Button
                                variant="outline"
                                size="icon"
                                className="text-red-500 border-red-200 hover:bg-red-50"
                                onClick={clearSignature}
                            >
                                <LuTrash className="h-4 w-4" />
                            </Button>
                            <Button
                                data-testid="action-loading-save-signature-button"
                                disabled={creatingUserSignature}
                                className="bg-blue-600 text-white hover:bg-blue-700"
                                onClick={saveSignature}
                            >
                                {creatingUserSignature ? (
                                    <>
                                        <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-t-transparent border-white"></div>
                                        loading
                                    </>
                                ) : (
                                    <span>Save Signature</span>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// Add PDF.js types to window object
declare global {
    interface Window {
        pdfjsLib: any
    }
}

export default PdfSigner
