
import { LuCode, LuDownload, LuUpload } from 'react-icons/lu'
import { Button } from '../ui/button'
import { ApiFileInfo } from '@/models/FileInfo'
import appStore from '@/store'
import { isValidUrl, ensureDomainUrlHasSSL, isWorkFlowData } from '@/utils/functions'
import { getGenesisHash, getAquaTreeFileName, isAquaTree, AquaTree } from 'aqua-js-sdk'
import apiClient from '@/api/axiosInstance'
import JSZip from 'jszip'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import WorkspaceDialogUI from './workspace_download_dialog_ui'
import { AquaSystemNamesService } from '@/storage/databases/aquaSystemNames'
import { getCorrectUTF8JSONString } from '@/lib/utils'

const WorkspaceManagment = () => {

    const { backend_url, session, setWorkSpaceDowload } = useStore(appStore) // Removed setOpenDialog as dialog is now local
    const fileInputRef = useRef<HTMLInputElement>(null)

    // New states for workspace operation progress dialog
    const [isUploading, setIsUploading] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)
    // const [isOperationOpen, setIsOperationOpen] = useState(false)
    // const [operationMessage, setOperationMessage] = useState('')
    const [operationProgress, setOperationProgress] = useState(0)
    // const [operationFileName, setOperationFileName] = useState('')

    const loadSystemAquaFileNames = async () => {
        const aquaSystemNamesService = AquaSystemNamesService.getInstance();
        const systemNames = await aquaSystemNamesService.getSystemNames();
        return systemNames;
    }

    const handleDownloadWorkspace = async () => {
        if (!session?.nonce) {
            toast.error("Please connect your wallet first")
            return
        }

        setIsDownloading(true)

        try {
            // setIsOperationOpen(true)
            // setOperationMessage("Fetching workspace files...")
            // setOperationProgress(0)
            // setOperationFileName("")

            // Fetch list of all files (limit=1000000)
            const listResponse = await apiClient.get(ensureDomainUrlHasSSL(`${backend_url}/explorer_files?limit=1000000`), {
                headers: {
                    'nonce': session.nonce
                }
            })

            const allFiles: ApiFileInfo[] = listResponse.data.data
            const totalFiles = allFiles.length
            const zip = new JSZip()
            const nameWithHash: { name: string, hash: string }[] = []
            const processedFiles = new Set<string>()
            // throw new Error("Debugging download workspace")

            for (let i = 0; i < totalFiles; i++) {
                const fileInfo = allFiles[i]
                const aquaTree = fileInfo.aquaTree
                if (!aquaTree) continue

                const genesisHash = getGenesisHash(aquaTree)
                if (!genesisHash) continue

                const fileName = getAquaTreeFileName(aquaTree)
                if (!fileName) continue

                console.log("Downloading file: index ", i)

                // setOperationMessage(`Processing files... (${i + 1}/${totalFiles})`)
                // setOperationProgress(Math.round(((i + 1) / totalFiles) * 100))
                // setOperationFileName(fileName)

                setWorkSpaceDowload({

                    fileIndex: i, totalFiles: totalFiles, fileName: fileName
                })




                // Add aqua tree JSON
                const aquaTreeFileName = `${fileName}.aqua.json`
                zip.file(aquaTreeFileName, getCorrectUTF8JSONString(JSON.stringify(aquaTree, null, 2)))

                let exist = nameWithHash.find(nwh => nwh.name === aquaTreeFileName)
                if (!exist) {
                    nameWithHash.push({ name: aquaTreeFileName, hash: genesisHash })
                }

                // Process associated files
                for (const fileObj of fileInfo.fileObject) {
                    if (fileObj.fileName && !processedFiles.has(fileObj.fileName)) {
                        try {
                            let fileContent: ArrayBuffer | string | null | Uint8Array<ArrayBufferLike> = null

                            if (typeof fileObj.fileContent === 'string' && isValidUrl(fileObj.fileContent)) {
                                const actualUrl = ensureDomainUrlHasSSL(fileObj.fileContent)
                                // Fetch file content
                                const fileResponse = await apiClient.get(actualUrl, {
                                    responseType: 'arraybuffer',
                                    headers: { 'nonce': session.nonce }
                                })
                                fileContent = fileResponse.data
                            } else if (typeof fileObj.fileContent === 'string') {

                                let json = fileObj.fileContent;
                                try {
                                    const jsonData = JSON.parse(json);
                                    fileContent = JSON.stringify(jsonData, null, 2)
                                } catch (e) {

                                    fileContent = fileObj.fileContent
                                }
                            } else if (fileObj.fileContent instanceof Uint8Array) {
                                fileContent = fileObj.fileContent
                            } else if (isAquaTree(fileObj.fileContent)) {

                                let aquatreeData: AquaTree
                                if (typeof fileObj.fileContent === 'string') {
                                    aquatreeData = JSON.parse(fileObj.fileContent as string)
                                } else {
                                    aquatreeData = fileObj.fileContent as AquaTree
                                }
                                try {
                                    let genesisHash = getGenesisHash(aquatreeData)
                                    let exist = nameWithHash.find(nwh => nwh.name === fileObj.fileName)
                                    if (!exist) {

                                        nameWithHash.push({ name: fileObj.fileName, hash: genesisHash ?? "" })
                                    }
                                } catch (err) {
                                    console.error("Error adding to nameWithHash:", err)
                                }
                                fileContent = JSON.stringify(fileObj.fileContent, null, 2)
                            } else {
                                throw new Error("Unsupported file content type")
                            }

                            if (fileContent) {

                                zip.file(fileObj.fileName, getCorrectUTF8JSONString(fileContent))
                                processedFiles.add(fileObj.fileName)
                            }
                        } catch (err) {
                            console.error(`Failed to download asset ${fileObj.fileName}:`, err)
                        }
                    }
                }
            }

            // Create manifest
            const aquaManifest = {
                type: "aqua_workspace_backup",
                version: "1.0.0",
                createdAt: new Date().toISOString(),
                genesis: "0000000000000000000000000000000000000000000000000000000000000000",
                name_with_hash: nameWithHash
            }
            zip.file("aqua.json", getCorrectUTF8JSONString(JSON.stringify(aquaManifest, null, 2)))

            // setOperationMessage("Generating ZIP file...")


            const content = await zip.generateAsync({ type: "blob" })

            const url = window.URL.createObjectURL(content)
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `workspace_${session.address || 'backup'}.zip`)
            document.body.appendChild(link)
            link.click()
            link.parentNode?.removeChild(link)
            toast.success("Workspace downloaded successfully")

        } catch (error) {
            console.error(error)
            toast.error("Failed to download workspace")
        } finally {
            setIsDownloading(false)
        }
    }

    const handleUploadWorkspaceClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (!session?.nonce) {
            toast.error("Please connect your wallet first")
            return
        }

        // Validate that the file is a zip
        if (!file.name.toLowerCase().endsWith('.zip')) {
            toast.error("Please select a ZIP file")
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
            return
        }

        try {
            // Load and validate zip contents
            const zip = new JSZip()
            const zipContent = await zip.loadAsync(file)

            // Helper function to decode byte-encoded filenames
            const decodeFileName = (name: string): string => {
                // Check if the name looks like a comma-separated byte array
                if (name.includes(',') && /^[\d,]+$/.test(name)) {
                    try {
                        const bytes = name.split(',').map(b => parseInt(b.trim(), 10))
                        return String.fromCharCode(...bytes)
                    } catch (e) {
                        return name
                    }
                }
                return name
            }

            // Get all files and decode their names
            const allFiles = Object.keys(zipContent.files)
            const decodedFileMap = new Map<string, string>() // decoded name -> original key

            allFiles.forEach(originalKey => {
                const decodedName = decodeFileName(originalKey)
                decodedFileMap.set(decodedName, originalKey)
            })

            console.log("Decoded files in ZIP:", Array.from(decodedFileMap.keys()))
            console.log("Decoded:", decodedFileMap)

            // Check if aqua.json exists (try multiple variations)
            let aquaJsonFile = null
            let aquaJsonOriginalKey = null

            // First try direct access using decoded name
            if (decodedFileMap.get("aqua.json")) {
                aquaJsonOriginalKey = decodedFileMap.get("aqua.json")!
                aquaJsonFile = zipContent.file(aquaJsonOriginalKey)
                console.log("Found aqua.json with original key:", aquaJsonOriginalKey)
            }

            if (!aquaJsonFile) {
                toast.error("Invalid workspace: aqua.json not found in ZIP")
                if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                }
                return
            }

            // Read and parse aqua.json
            const aquaJsonContent = await aquaJsonFile.async("string")
            console.log("aqua.json content (first 200 chars):", aquaJsonContent.substring(0, 200))
            console.log("aqua.json content length:", aquaJsonContent.length)

            let aquaManifest: {
                type: string
                version: string
                createdAt: string
                genesis: string
                name_with_hash: { name: string, hash: string }[]
            }

            try {
                // Check if content might be byte-encoded
                let jsonContent = aquaJsonContent
                if (aquaJsonContent.includes(',') && /^[\d,\s]+$/.test(aquaJsonContent.substring(0, 100))) {
                    console.log("Detected byte-encoded JSON content, decoding...")
                    const bytes = aquaJsonContent.split(',').map(b => parseInt(b.trim(), 10))
                    jsonContent = String.fromCharCode(...bytes)
                    console.log("Decoded JSON content (first 200 chars):", jsonContent.substring(0, 200))
                }

                aquaManifest = JSON.parse(jsonContent)
            } catch (parseError) {
                console.error("JSON parse error:", parseError)
                toast.error("Invalid workspace: aqua.json is not valid JSON")
                if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                }
                return
            }

            // Validate aqua.json structure
            if (!aquaManifest.name_with_hash || !Array.isArray(aquaManifest.name_with_hash)) {
                toast.error("Invalid workspace: name_with_hash property not found or invalid")
                if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                }
                return
            }



            let systemWorkflowNames: string[] = await loadSystemAquaFileNames()

            let filesNotFound: string[] = [];
            // loop through all files that end with .aqua.json
            // parse them and check if the files in file index exist in the zip
            for (const [decodedName, originalKey] of decodedFileMap.entries()) {
                if (decodedName.toLowerCase().endsWith('.aqua.json') && decodedName !== 'aqua.json') {
                    try {
                        const aquaTreeFile = zipContent.file(originalKey)
                        if (!aquaTreeFile) continue
                        const aquaTreeContent = await aquaTreeFile.async("string")

                        let aquaTreeJsonContent = aquaTreeContent
                        if (aquaTreeContent.includes(',') && /^[\d,\s]+$/.test(aquaTreeContent.substring(0, 100))) {
                            // console.log(`Detected byte-encoded AquaTree JSON content in ${decodedName}, decoding...`)
                            const bytes = aquaTreeContent.split(',').map(b => parseInt(b.trim(), 10))
                            aquaTreeJsonContent = String.fromCharCode(...bytes)
                            // console.log(`Decoded AquaTree JSON content in ${decodedName} (first 200 chars):`, aquaTreeJsonContent.substring(0, 200))
                        }
                        const aquaTree: AquaTree = JSON.parse(aquaTreeJsonContent)

                        if (!isAquaTree(aquaTree)) {
                            toast.error(`Invalid workspace: ${decodedName} is not a valid AquaTree`)
                        }
                        // Validate files in fileIndex
                        if (aquaTree.file_index && Array.isArray(aquaTree.file_index)) {
                            for (const fileEntry of aquaTree.file_index) {
                                const fileName = fileEntry.fileName
                                let fileFound = false
                                // First try direct access
                                if (zipContent.file(fileName)) {
                                    fileFound = true
                                }
                                // If not found, search in decoded names
                                if (!fileFound) {
                                    const foundDecodedName = Array.from(decodedFileMap.keys()).find(name =>
                                        name === fileName ||
                                        (name.toLowerCase().endsWith(fileName.toLowerCase()) && !zipContent.files[decodedFileMap.get(name)!].dir)
                                    )
                                    if (foundDecodedName) {
                                        fileFound = true
                                    }
                                }

                                if (!fileFound) {
                                    toast.error(`Invalid workspace: File ${fileName} listed in ${decodedName} is missing from ZIP`)
                                    if (fileInputRef.current) {
                                        fileInputRef.current.value = ''
                                    }
                                    return
                                }


                            }
                        }
                        // Additional AquaTree validations 
                        let isWorkflow = isWorkFlowData(aquaTree as AquaTree, systemWorkflowNames)
                        if (isWorkflow.isWorkFlow) {
                            // console.log(`AquaTree ${decodedName} validated as workflow: ${isWorkflow.workFlow}`)
                            if (isWorkflow.workFlow == "aqua_sign") {

                                let keys = Object.keys(aquaTree.file_index);
                                for (let i = 0; i < keys.length; i++) {
                                    let aName = aquaTree.file_index[keys[i]];
                                    console.log("Aqua_sign workflow file index name " + aName);

                                    if (decodedFileMap.get(aName)) {
                                        console.log("Aqua_sign workflow file found in zip " + aName);
                                        if (aName.toLowerCase().endsWith('.pdf')) {
                                            const pdfAquaJsonName = `${aName}.aqua.json`
                                            if (!decodedFileMap.get(pdfAquaJsonName)) {
                                                filesNotFound.push(pdfAquaJsonName);
                                            }
                                        }
                                    } else {
                                        console.error("Aqua_sign workflow file NOT found in zip " + aName);
                                        filesNotFound.push(aName);

                                    }
                                }
                            }
                        }
                    } catch (err) {
                        console.error(`Error validating AquaTree file ${decodedName}:`, err)
                        toast.error(`Invalid workspace: Failed to validate ${decodedName}`)
                    }
                }
            }
            if (filesNotFound.length > 0) {
                toast.error(`Files not found in zip for aqua_sign workflow: ${filesNotFound.length} file(s) missing. First missing: ${filesNotFound[0]}`)
                console.error("Files not found in zip for aqua_sign workflow:", filesNotFound);
                return
            }


            // Check if all files in name_with_hash exist in the zip
            const missingFiles: string[] = []
            const decodedNames = Array.from(decodedFileMap.keys())

            for (const fileEntry of aquaManifest.name_with_hash) {
                const fileName = fileEntry.name
                let fileFound = false

                // First try direct access
                if (zipContent.file(fileName)) {
                    fileFound = true
                }

                // If not found, search in decoded names
                if (!fileFound) {
                    const foundDecodedName = decodedNames.find(name =>
                        name === fileName ||
                        (name.toLowerCase().endsWith(fileName.toLowerCase()) && !zipContent.files[decodedFileMap.get(name)!].dir)
                    )
                    if (foundDecodedName) {
                        fileFound = true
                    }
                }

                if (!fileFound) {
                    missingFiles.push(fileName)
                }
            }

            if (missingFiles.length > 0) {
                toast.error(`Invalid workspace: ${missingFiles.length} file(s) missing from ZIP. First missing: ${missingFiles[0]}`)
                if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                }
                return
            }

            toast.success("Workspace validated successfully")
        } catch (error) {
            console.error("Error validating workspace:", error)
            toast.error("Failed to validate workspace ZIP file")
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
            return
        }

        setIsUploading(true)
        setOperationProgress(0)

        const formData = new FormData()
        formData.append('file', file)

        let isSuccess = false
        try {
            // setIsOperationOpen(true)
            // setOperationMessage("Uploading workspace...")
            // setOperationProgress(0)
            // setOperationFileName(file.name) // Set filename for display

            const response = await apiClient.post(ensureDomainUrlHasSSL(`${backend_url}/explorer_workspace_upload`), formData, {
                headers: {
                    'nonce': session.nonce,
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                        setOperationProgress(percentCompleted)
                    }
                }
            })

            if (response.status === 200) {

                isSuccess = true
            }
        } catch (error) {
            console.error(error)
            toast.error("Failed to upload workspace")
        } finally {

            // setIsOperationOpen(false)
            // setOperationProgress(0)
            // setOperationFileName('')
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
            if (isSuccess) {
                toast.success("Workspace uploaded successfully")
                window.location.href = "/app"
            } else {
                setIsUploading(false)
            }
        }
    }

    return (
        <>
            <div className="col-span-12 md:col-span-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 sm:px-6 py-3 sm:py-4">
                    <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                        <LuCode className="h-5 w-5 text-primary" />
                        Workspace Management
                    </h2>
                </div>
                <div className="p-3 sm:p-6 flex flex-wrap gap-4">
                    <Button
                        onClick={handleDownloadWorkspace}
                        disabled={isDownloading}
                        className="flex items-center gap-2"
                    >
                        <LuDownload className="h-4 w-4" />
                        {isDownloading ? "Downloading..." : "Download Workspace"}
                    </Button>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".zip"
                        className="hidden"
                    />

                    <Button
                        onClick={handleUploadWorkspaceClick}
                        disabled={isUploading}
                        variant="outline"
                        className="flex items-center gap-2"
                    >
                        <LuUpload className="h-4 w-4" />
                        {isUploading ? "Uploading..." : "Upload Workspace"}
                    </Button>
                </div>
            </div>

            {(isUploading || isDownloading) && (
                <div className="fixed inset-0 bg-white/30 dark:bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-11/12 max-w-md">
                        <WorkspaceDialogUI
                            title={isUploading ? "Uploading Workspace" : "Downloading Workspace"}
                            uploadProgress={operationProgress}
                            isUploading={isUploading}
                            isDone={() => {
                                setIsUploading(false)
                                setIsDownloading(false)
                                setOperationProgress(0)
                            }
                            }
                        />
                    </div>
                </div>
            )}

        </>
    )
}

export default WorkspaceManagment