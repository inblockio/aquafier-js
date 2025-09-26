import React, {useRef, useState} from 'react'
import {LuImport} from 'react-icons/lu'
import {useStore} from 'zustand'
import appStore from '../../store'
import {
    allLinkRevisionHashes,
    dummyCredential,
    ensureDomainUrlHasSSL,
    fetchFiles,
    getAquaTreeFileName,
    getFileName,
    getGenesisHash,
    isAquaTree,
    readFileAsText,
    readFileContent,
    validateAquaTree,
} from '../../utils/functions'
import Aquafier, {AquaTree, CredentialsData, FileObject} from 'aqua-js-sdk'
import {IDropzoneAction, UploadLinkAquaTreeExpectedData} from '../../types/types'
import {Input} from '@/components/ui/input'
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog'
import {Button} from '@/components/ui/button'
import {toast} from 'sonner'

// export const ImportAquaTree = ({ aquaFile, uploadedIndexes, fileIndex, updateUploadedIndex }: IDropzoneAction2) => {
export const ImportAquaTree = ({file, filesWrapper, removeFilesListForUpload}: IDropzoneAction) => {
    const aquafier = new Aquafier()
    const [uploading, setUploading] = useState(false)
    // const [uploaded, setUploaded] = useState(false)
    const [requiredFileHash, setRequiredFileHash] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [selectedFileName, setSelectedFileName] = useState<string>('')
    const [isOpen, setIsOpen] = useState(false)
    const [allFileObjectWrapper, setAllFileObjectsWrapper] = useState<
        Array<{
            file: File
            fileObject: FileObject
        }>
    >([])
    const [expectedFile, setExpectedFile] = useState<UploadLinkAquaTreeExpectedData | null>(null)

    const {files, metamaskAddress, setFiles, backend_url, session, user_profile} = useStore(appStore)

    const uploadFileData = async (aquaFile: File, assetFile: File | null, isWorkflow: boolean = false) => {
        const formData = new FormData()
        formData.append('file', aquaFile)
        formData.append('has_asset', `${assetFile != null}`)
        formData.append('asset', assetFile ?? aquaFile)
        formData.append('account', `${metamaskAddress}`)
        formData.append('is_workflow', `${isWorkflow}`)

        setUploading(true)
        try {
            const url = `${backend_url}/explorer_aqua_file_upload`
            await fetch(url, {
                method: 'POST',
                body: formData,
                headers: {
                    nonce: session?.nonce || '',
                },
            })

            // const responseData = await response.json()
            // setFiles([...responseData.files])

            //   setFiles({ fileData: [...responseData.data, file], status: 'loaded' })

            //  const filesFromApi: Array<ApiFileInfo> = responseData.files
            //                     setFiles({ fileData: filesFromApi, status: 'loaded' })
            // setUploaded(true)

            const files = await fetchFiles(session!.address, `${backend_url}/explorer_files`, session!.nonce)
            setFiles({fileData: files, status: 'loaded'})
            setUploading(false)
            setSelectedFileName('')
            toast.success('File uploaded successfully')
            // updateUploadedIndex(fileIndex)
            removeFilesListForUpload(filesWrapper)
            return
        } catch (error) {
            setUploading(false)
            setSelectedFileName('')
            toast.error(`Failed to upload file: ${error}`)
        }
    }

    const importLinkedFile = async (aquaTree: AquaTree) => {
        const mainAquaFileObject: FileObject = {
            fileContent: aquaTree,
            fileName: file.name,
            fileSize: file.size,
            path: '',
        }

        const newFileObjects = [{fileObject: mainAquaFileObject, file: file}]
        setAllFileObjectsWrapper(newFileObjects)

        const genHash = getGenesisHash(aquaTree)
        if (genHash == null) {
            toast.error(`Genesis Revision not found`)
            return
        }

        const genRevision = aquaTree.revisions[genHash!]
        const actualUrlToFetch = ensureDomainUrlHasSSL(backend_url)

        const response = await fetch(`${actualUrlToFetch}/files/${genRevision.file_hash}`, {
            method: 'GET',
            headers: {
                Nonce: session?.nonce ?? '--error--',
            },
        })

        if (!response.ok) {
            setExpectedFile({
                displayText: `please upload ${aquaTree.file_index[genHash]}`,
                exectedFileHash: genRevision.file_hash!,
                expectedFileName: aquaTree.file_index[genHash],
                itemRevisionHash: '',
                isAquaFile: false,
            })
            setIsOpen(true)
        } else {
            const allAquaTrees = newFileObjects.filter(e => isAquaTree(e.fileObject.fileContent))
            const missingFile = checkAllFilesAvailable(allAquaTrees, newFileObjects)
            if (missingFile) {
                setExpectedFile(missingFile)
                setIsOpen(true)
                return
            }
        }
    }

    const findFileRevision = (aquaTree: AquaTree): string => {
        const genHash = getGenesisHash(aquaTree)
        if (genHash == null) {
            return ''
        }
        const fileRevision = aquaTree.revisions[genHash]
        return fileRevision?.file_hash ?? ''
    }

    const userHasAquaTreeByGenesis = (importedGenesisHash: string): boolean => {
        return files.fileData.some(userFile => {
            const aquaTreeGenesisHash = getGenesisHash(userFile.aquaTree!)
            return aquaTreeGenesisHash === importedGenesisHash
        })
    }

    const hasLinkRevisions = (aquaTree: AquaTree): boolean => {
        return Object.values(aquaTree.revisions).some(item => item.revision_type === 'link')
    }

    const importSimpleAquaFileFile = async (aquaTree: AquaTree) => {
        try {
            setUploading(true)

            const [isValidAquaTree, failureReason] = validateAquaTree(aquaTree)
            if (!isValidAquaTree) {
                setUploading(false)
                toast.error(`Aqua tree has an error: ${failureReason}`)
                return
            }

            const fileHash = findFileRevision(aquaTree)
            const actualUrlToFetch = ensureDomainUrlHasSSL(backend_url)

            const response = await fetch(`${actualUrlToFetch}/files/${fileHash}`, {
                method: 'GET',
                headers: {
                    Nonce: session?.nonce ?? '--error--',
                },
            })

            if (!response.ok) {
                if (fileHash) {
                    setRequiredFileHash(fileHash)
                    setIsOpen(true)
                    return
                } else {
                    setUploading(false)
                    toast.error(`Could not determine required file hash from AquaTree`)
                    return
                }
            }

            const blob: Blob = await response.blob()
            const fileName = getFileName(aquaTree)
            const arrayBuffer = await blob.arrayBuffer()
            const uint8Array = new Uint8Array(arrayBuffer)

            const fileObject: FileObject = {
                fileContent: uint8Array,
                fileName: fileName,
                path: './',
                fileSize: blob.size,
            }

            if (hasLinkRevisions(aquaTree)) {
                setUploading(false)
                toast.error(`Aqua tree has a link revision please import the Aquatree using the zip format`)
                return
            }

            const dummyCreds: CredentialsData = dummyCredential()
            dummyCreds.alchemy_key = user_profile.alchemy_key
            const result = await aquafier.verifyAquaTree(aquaTree, [fileObject], dummyCreds)
            if (result.isErr()) {
                setUploading(false)
                toast.error(`Aqua tree is not valid: ${JSON.stringify(result)}`)
                return
            }

            const importedAquaTreeGenesisHash = getGenesisHash(aquaTree)

            if (userHasAquaTreeByGenesis(importedAquaTreeGenesisHash!)) {
                setUploading(false)
                toast.error(`Aqua tree exists already in your files`)
                return
            }

            await uploadFileData(file, null, false)
        } catch (e) {
            setUploading(false)
            toast.error(`Failed to import aqua tree file: ${e}`)
        }
    }

    const findMissingFileForLinkHash = (aquaTreeItem: AquaTree, linkHash: string, newFileObjects: Array<{
        file: File;
        fileObject: FileObject
    }>): UploadLinkAquaTreeExpectedData | null => {
        const revisionItem = aquaTreeItem.revisions[linkHash]
        const fileRevisionHash = revisionItem.link_verification_hashes![0]
        const fileName = aquaTreeItem.file_index[fileRevisionHash]
        const aquaFile = `${fileName}.aqua.json`

        const aquaFileItemObject = newFileObjects.find(e => e.fileObject.fileName === aquaFile)
        if (!aquaFileItemObject) {
            return {
                displayText: `please upload ${aquaFile}.`,
                exectedFileHash: '',
                itemRevisionHash: fileRevisionHash,
                expectedFileName: aquaFile,
                isAquaFile: true,
            }
        }

        const fileItemObject = newFileObjects.find(e => e.fileObject.fileName === fileName)
        if (!fileItemObject) {
            const aquaFileItemObject = newFileObjects.find(e => e.fileObject.fileName === aquaFile)
            if (!aquaFileItemObject) {
                return {
                    displayText: `please upload ${aquaFile} .`,
                    exectedFileHash: '',
                    itemRevisionHash: fileRevisionHash,
                    expectedFileName: aquaFile,
                    isAquaFile: true,
                }
            }

            let aquaTree: AquaTree;
            const contentData = aquaFileItemObject.fileObject.fileContent
            if (typeof contentData == 'string') {
                aquaTree = JSON.parse(aquaFileItemObject.fileObject.fileContent as string)
            } else if (typeof contentData === 'object') {
                aquaTree = aquaFileItemObject.fileObject.fileContent as AquaTree
            }

            // @ts-ignore
            const genHash = getGenesisHash(aquaTree)
            if (genHash == null) {
                throw Error(`Genesis hash cannot be null for ${aquaFileItemObject.fileObject.fileName}`)
            }
            // @ts-ignore
            const genRevision = aquaTree.revisions[genHash]
            const fileHash = genRevision.file_hash

            return {
                displayText: `please upload ${fileName}`,
                exectedFileHash: fileHash ?? 'errors',
                expectedFileName: fileName,
                itemRevisionHash: fileRevisionHash,
                isAquaFile: false,
            }
        }

        return null
    }

    const checkAllFilesAvailable = (
        allAquaTrees: Array<{ file: File; fileObject: FileObject }>,
        newFileObjects: Array<{ file: File; fileObject: FileObject }>
    ): UploadLinkAquaTreeExpectedData | null => {
        for (const aFileObject of allAquaTrees) {
            const aquaTreeItem: AquaTree = aFileObject.fileObject.fileContent as AquaTree
            const linkHashes = allLinkRevisionHashes(aquaTreeItem)

            if (linkHashes.length > 0) {
                for (const linkHash of linkHashes) {
                    const missingFile = findMissingFileForLinkHash(aquaTreeItem, linkHash, newFileObjects)
                    if (missingFile) {
                        return missingFile
                    }
                }
            }
        }
        return null
    }

    const inspectMultiFileUpload = async (filePar: File) => {
        if (!expectedFile) {
            toast.error('An internal error occured')
            return
        }

        const fileDataContent = await readFileContent(filePar)

        if (!expectedFile.expectedFileName.endsWith(`.aqua.json`)) {
            const fileHash = aquafier.getFileHash(fileDataContent)

            if (fileHash.trim() != expectedFile.exectedFileHash.trim()) {
                toast.error("Dropped file hash doesn't match the required hash in the AquaTree..")
                return
            }
        } else {
            const aquaTreeItem: AquaTree = JSON.parse(fileDataContent as string)
            const allHashes = Object.keys(aquaTreeItem.revisions)
            if (!allHashes.includes(expectedFile.itemRevisionHash)) {
                toast.error('Aqua file does not contain ' + expectedFile.itemRevisionHash)
                return
            }
        }

        if (filePar.name != expectedFile.expectedFileName) {
            toast.error('Please rename the file to ' + expectedFile.expectedFileName)
            return
        }

        let fileData = fileDataContent
        if (filePar.name.endsWith(`.aqua.json`)) {
            fileData = JSON.parse(fileDataContent as string)
        }
        const fileObject: FileObject = {
            fileContent: fileData,
            fileName: filePar.name,
            fileSize: filePar.size,
            path: '',
        }

        const newFileObjects = allFileObjectWrapper
        newFileObjects.push({
            file: filePar,
            fileObject: fileObject,
        })

        setAllFileObjectsWrapper(newFileObjects)

        const allAquaTrees = newFileObjects.filter(e => isAquaTree(e.fileObject.fileContent))

        const missingFile = checkAllFilesAvailable(allAquaTrees, newFileObjects)
        if (missingFile) {
            setExpectedFile(missingFile)
            setIsOpen(true)
            toast.error(`Please upload ${missingFile.expectedFileName}`)
            return
        }

        for (const item of allAquaTrees) {
            if (file.name != item.file.name) {
                const aquaTreeItem: AquaTree = item.fileObject.fileContent as AquaTree
                const fileName = getAquaTreeFileName(aquaTreeItem)
                const fileObjWrapper = newFileObjects.find(e => e.fileObject.fileName === fileName)

                if (!fileObjWrapper) {
                    toast.error(`An internal error occured , cannot find file ${fileName}`)
                    return
                }

                await uploadFileData(item.file, fileObjWrapper.file, true)
            }
        }

        const fileContent = await readFileAsText(file)
        const aquaTree: AquaTree = JSON.parse(fileContent)
        const fileName = getAquaTreeFileName(aquaTree)
        const fileObjWrapper = newFileObjects.find(e => e.fileObject.fileName === fileName)

        await uploadFileData(file, fileObjWrapper?.file!, false)
    }

    const importFile = async () => {
        if (uploading) {
            toast.info(`Wait for upload to complete`)
            return
        }
        const fileContent = await readFileAsText(file)
        const aquaTree: AquaTree = JSON.parse(fileContent)
        const hasLinkRevision = hasLinkRevisions(aquaTree)
        if (hasLinkRevision) {
            await importLinkedFile(aquaTree)
        } else {
            await importSimpleAquaFileFile(aquaTree)
        }
    }

    const modalSelectedFile = async (selectedFile: File) => {
        if (requiredFileHash) {
            const fileDataContent = await readFileContent(selectedFile)
            const fileHash = aquafier.getFileHash(fileDataContent)
            if (fileHash !== requiredFileHash) {
                toast.error("Dropped file hash doesn't match the required hash in the AquaTree..")
            } else {
                setSelectedFileName(selectedFile.name)
                setIsOpen(false)

                try {
                    await uploadFileData(file, selectedFile, false)
                } catch (error) {
                    toast.error(`Error processing: ${error instanceof Error ? error.message : String(error)}`)
                    setUploading(false)
                }
            }
        }
    }

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]
            if (expectedFile == null) {
                await modalSelectedFile(file)
            } else {
                await inspectMultiFileUpload(file)
            }
        }
    }

    const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()

        if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
            const file = event.dataTransfer.files[0]
            await modalSelectedFile(file)
        }
    }

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
    }

    const closeModal = () => {
        setUploading(false)
        setIsOpen(false)
    }

    return (
        <>
            <Button
                data-testid="action-import-93-button"
                size="sm"
                variant="outline"
                className="w-24 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                onClick={importFile}
                // disabled={uploadedIndexes.includes(fileIndex) || uploaded}
            >
                {uploading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-700"></div> :
                    <LuImport className="w-4 h-4 mr-1"/>}
                Import
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent
                    className="max-w-2xl w-[90%] mx-auto mt-12 rounded-2xl shadow-2xl bg-white border border-gray-200 p-6">
                    <DialogHeader className="border-b border-gray-200 pb-3">
                        <DialogTitle className="text-lg font-medium">Please provide the required file</DialogTitle>
                    </DialogHeader>

                    <div className="py-4">
                        <div className="flex flex-col items-center space-y-4">
                            <p className="text-sm text-black text-center">
                                {expectedFile == null ? (
                                    <span>We couldn't fetch the file associated with this AquaTree. Please select or drop the file:</span>
                                ) : (
                                    <span>{expectedFile.displayText}</span>
                                )}
                            </p>

                            <div
                                className="border-2 border-dashed border-gray-300 rounded-lg p-6 w-full text-center bg-gray-50 hover:bg-gray-100 transition-colors"
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                            >
                                <p className="mb-2 text-sm text-black">Drag and drop file here</p>
                                <p className="text-sm text-black mb-3">or</p>
                                <Button
                                    data-testid="action-select-file-06-button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="bg-black text-white hover:bg-gray-800"
                                    size="sm"
                                >
                                    Select File
                                </Button>
                                <Input type="file" className="hidden" ref={fileInputRef} onChange={handleFileSelect}/>
                            </div>

                            {selectedFileName.length > 0 &&
                                <p className="text-sm text-gray-600">Selected: {selectedFileName}</p>}
                        </div>
                    </div>

                    <DialogFooter className="border-t border-gray-200 pt-3">
                        <Button data-testid="action-cancel-77-button" variant="outline" onClick={closeModal}
                                className="bg-black text-white hover:bg-gray-800">
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
