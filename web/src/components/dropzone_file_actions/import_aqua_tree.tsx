import { LuImport } from "react-icons/lu";
import { Button } from "../chakra-ui/button";
import axios from "axios";
import { useStore } from "zustand";
import appStore from "../../store";
import { useRef, useState } from "react";
import { toaster } from "../chakra-ui/toaster";
import { readFileAsText, validateAquaTree, getFileName, readFileContent, getGenesisHash, ensureDomainUrlHasSSL, isAquaTree, allLinkRevisionHashes, getAquaTreeFileName } from "../../utils/functions";
import { Box, Input, Text, VStack } from "@chakra-ui/react";
import {
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
} from '@chakra-ui/modal'

import Aquafier, { AquaTree, FileObject } from "aqua-js-sdk";
import { useDisclosure } from '@chakra-ui/hooks'
import { IDropzoneAction2, UploadLinkAquaTreeExpectedData } from "../../types/types";

export const ImportAquaTree = ({ aquaFile, uploadedIndexes, fileIndex, updateUploadedIndex }: IDropzoneAction2) => {

    let aquafier = new Aquafier();
    const [uploading, setUploading] = useState(false)
    const [uploaded, setUploaded] = useState(false)

    const [requiredFileHash, setRequiredFileHash] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [selectedFileName, setSelectedFileName] = useState<string>("")
    const { isOpen, onOpen, onClose } = useDisclosure()

    const [allFileObjectWrapper, setAllFileObjectsWrapper] = useState<Array<{
        file: File,
        fileObject: FileObject
    }>>([])
    const [expectedFile, setExpectedFile] = useState<UploadLinkAquaTreeExpectedData | null>(null)

    const { files, metamaskAddress, setFiles, backend_url, session } = useStore(appStore)

    const uploadFileData = async (aquaFile: File, assetFile: File | null, isWorkflow: boolean = false) => {
        const formData = new FormData();
        formData.append('file', aquaFile);
        formData.append('has_asset', `${assetFile != null}`);
        formData.append('asset', assetFile ?? aquaFile);
        formData.append('account', `${metamaskAddress}`);
        formData.append('is_workflow', `${isWorkflow}`);

        setUploading(true)
        try {
            const url = `${backend_url}/explorer_aqua_file_upload`
            const response = await axios.post(url, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    "nonce": session?.nonce
                },
            });

            const res = response.data
            setFiles([...res.files])
            setUploaded(true)
            setUploading(false)
            setSelectedFileName("")
            toaster.create({
                description: "File uploaded successfuly",
                type: "success"
            })
            updateUploadedIndex(fileIndex)
            return;
        } catch (error) {
            setUploading(false)
            setSelectedFileName("")
            toaster.create({
                description: `Failed to upload file: ${error}`,
                type: "error"
            })
        }
    }

    const importLinkedFile = async (aquaTree: AquaTree) => {

        let mainAquaFileObject: FileObject = {
            fileContent: aquaTree,
            fileName: aquaFile.name,
            fileSize: aquaFile.size,
            path: ""
        }

        const newFileObjects = [{ fileObject: mainAquaFileObject, file: aquaFile }]
        setAllFileObjectsWrapper(newFileObjects)

        let genHash = getGenesisHash(aquaTree);
        if (genHash == null) {
            toaster.create({
                description: `Genesis Revision not found`,
                type: "error"
            })
            return
        }

        console.log(`genHash -- ${genHash}`)
        let genRevision = aquaTree.revisions[genHash!!]
        let actualUrlToFetch = ensureDomainUrlHasSSL(backend_url)
        console.log(`revision  ${JSON.stringify(genRevision, null, 2)}`)
        console.log(`file hash +++ ${genRevision.file_hash}`)

        const response = await fetch(`${actualUrlToFetch}/files/${genRevision.file_hash}`, {
            method: 'GET',
            headers: {
                'Nonce': session?.nonce ?? "--error--"
            }
        });

        if (!response.ok) {
            setExpectedFile({
                displayText: `please upload ${aquaTree.file_index[genHash]}`,
                exectedFileHash: genRevision.file_hash!!,
                expectedFileName: aquaTree.file_index[genHash],
                itemRevisionHash: "",
                isAquaFile: false
            })
            onOpen()
        } else {


            // let revisionData = aquaTree.revisions[revisionHashWithLink]
            // setExpectedFile({
            //     displayText: `please aqua file upload ${aquaTree.file_index[revisionHashWithLink]}`,
            //     exectedFileHash: revisionData.link_file_hashes![0],
            //     expectedFileName: aquaTree.file_index[revisionHashWithLink],
            //     isAquaFile: true
            // })
            // onOpen()

            // Check if any files are missing
            // Scan through all aqua trees and confirm all assets are selected
            const allAquaTrees = newFileObjects.filter((e) => isAquaTree(e.fileObject.fileContent));
            const missingFile = checkAllFilesAvailable(allAquaTrees, newFileObjects);
            if (missingFile) {
                setExpectedFile(missingFile);
                onOpen();
                return;
            }
        }
    }

    // Helper function to find the first file revision
    const findFileRevision = (aquaTree: AquaTree): string => {
        let genHash = getGenesisHash(aquaTree)
        if (genHash == null) {
            return ""
        }
        const fileRevision = aquaTree.revisions[genHash]
        return fileRevision?.file_hash ?? ""

    }

    // Helper function to check if user already has aqua tree
    const userHasAquaTreeByGenesis = (importedGenesisHash: string): boolean => {
        return files.some(userFile => {
            const aquaTreeGenesisHash = getGenesisHash(userFile.aquaTree!!);
            return aquaTreeGenesisHash === importedGenesisHash;
        });
    }

    // Helper function to check if aqua tree has link revisions
    const hasLinkRevisions = (aquaTree: AquaTree): boolean => {
        return Object.values(aquaTree.revisions).some(item => item.revision_type === "link");
    }

    const importSimpleAquaFileFile = async (aquaTree: AquaTree) => {
        try {
            setUploading(true)

            let [isValidAquaTree, failureReason] = validateAquaTree(aquaTree)
            console.log(`is aqua tree valid ${isValidAquaTree} failure reason ${failureReason}`)
            if (!isValidAquaTree) {
                setUploading(false)
                toaster.create({
                    description: `Aqua tree has an error: ${failureReason}`,
                    type: "error"
                })
                return;
            }

            const fileHash = findFileRevision(aquaTree);
            let actualUrlToFetch = ensureDomainUrlHasSSL(backend_url)

            const response = await fetch(`${actualUrlToFetch}/files/${fileHash}`, {
                method: 'GET',
                headers: {
                    'Nonce': session?.nonce ?? "--error--"
                }
            });

            if (!response.ok) {
                if (fileHash) {
                    setRequiredFileHash(fileHash)
                    onOpen()
                    return
                } else {
                    setUploading(false)
                    toaster.create({
                        description: `Could not determine required file hash from AquaTree`,
                        type: "error"
                    })
                    return
                }
            }

            const blob: Blob = await response.blob();
            let fileName = getFileName(aquaTree)
            const arrayBuffer = await blob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            let fileObject: FileObject = {
                fileContent: uint8Array,
                fileName: fileName,
                path: "./",
                fileSize: blob.size
            }

            // Check if aqua tree has link revisions
            if (hasLinkRevisions(aquaTree)) {
                setUploading(false)
                toaster.create({
                    description: `Aqua tree has a link revision please import the Aquatree using the zip format`,
                    type: "error"
                })
                return
            }

            let result = await aquafier.verifyAquaTree(aquaTree, [fileObject]);

            if (result.isErr()) {
                setUploading(false)
                toaster.create({
                    description: `Aqua tree is not valid: ${JSON.stringify(result)}`,
                    type: "error"
                })
                return;
            }

            let importedAquaTreeGenesisHash = getGenesisHash(aquaTree);

            if (userHasAquaTreeByGenesis(importedAquaTreeGenesisHash!)) {
                setUploading(false)
                toaster.create({
                    description: `Aqua tree exists already in your files`,
                    type: "error"
                })
                return;
            }

            await uploadFileData(aquaFile, null, false)

        } catch (e) {
            setUploading(false)
            toaster.create({
                description: `Failed to import aqua tree file: ${e}`,
                type: "error"
            })
        }
    }

    // Helper function to find missing file for a link hash
    const findMissingFileForLinkHash = (
        aquaTreeItem: AquaTree,
        linkHash: string,
        newFileObjects: Array<{ file: File, fileObject: FileObject }>
    ): UploadLinkAquaTreeExpectedData | null => {
        const revisionItem = aquaTreeItem.revisions[linkHash];
        const fileRevisionHash = revisionItem.link_verification_hashes![0];
        const fileName = aquaTreeItem.file_index[fileRevisionHash];
        const aquaFile = `${fileName}.aqua.json`;


        // Check if aqua file exists
        const aquaFileItemObject = newFileObjects.find((e) => e.fileObject.fileName === aquaFile);
        if (!aquaFileItemObject) {
            return {
                displayText: `please upload ${aquaFile}.`,
                exectedFileHash: "",
                itemRevisionHash: fileRevisionHash,
                expectedFileName: aquaFile,
                isAquaFile: true
            };
        }
        // Check if the actual file exists
        const fileItemObject = newFileObjects.find((e) => e.fileObject.fileName === fileName);
        if (!fileItemObject) {

            const aquaFileItemObject = newFileObjects.find((e) => e.fileObject.fileName === aquaFile);
            if (!aquaFileItemObject) {
                return {
                    displayText: `please upload ${aquaFile} .`,
                    exectedFileHash: "",
                    itemRevisionHash: fileRevisionHash,
                    expectedFileName: aquaFile,
                    isAquaFile: true
                };
            }

            let aquaTree: AquaTree;
            let contentData = aquaFileItemObject.fileObject.fileContent;
            if (typeof contentData == 'string') {
                aquaTree = JSON.parse(aquaFileItemObject.fileObject.fileContent as string)
            } else if (typeof contentData === 'object') {
                aquaTree = aquaFileItemObject.fileObject.fileContent as AquaTree
            } else {
                throw Error(`An error occured. could not deduce aqua tree`)
            }
            let genHash = getGenesisHash(aquaTree)
            if (genHash == null) {
                throw Error(`Genesis hash cannot be null for ${aquaFileItemObject.fileObject.fileName}`)
            }
            let genRevision = aquaTree.revisions[genHash]
            let fileHash = genRevision.file_hash

            return {
                displayText: `please upload ${fileName}`,
                exectedFileHash: fileHash ?? "errors",
                expectedFileName: fileName,
                itemRevisionHash: fileRevisionHash,
                isAquaFile: false
            };
        }



        return null;
    }

    // Helper function to check if all files are available for aqua trees
    const checkAllFilesAvailable = (
        allAquaTrees: Array<{ file: File, fileObject: FileObject }>,
        newFileObjects: Array<{ file: File, fileObject: FileObject }>
    ): UploadLinkAquaTreeExpectedData | null => {
        for (const aFileObject of allAquaTrees) {
            const aquaTreeItem: AquaTree = aFileObject.fileObject.fileContent as AquaTree;
            const linkHashes = allLinkRevisionHashes(aquaTreeItem);

            if (linkHashes.length > 0) {
                for (const linkHash of linkHashes) {
                    const missingFile = findMissingFileForLinkHash(aquaTreeItem, linkHash, newFileObjects);
                    if (missingFile) {
                        return missingFile;
                    }
                }
            }
        }
        return null;
    }



    const inspectMultiFileUpload = async (filePar: File) => {
        if (!expectedFile) {
            toaster.create({
                description: "An internal error occured",
                type: "error"
            });
            return;
        }


        const fileDataContent = await readFileContent(filePar);
        console.log(`expectedFile ${JSON.stringify(expectedFile, null, 2)}`)

        if (!expectedFile.expectedFileName.endsWith(`.aqua.json`)) {
            const fileHash = aquafier.getFileHash(fileDataContent);

            console.log(`calculated fileHash ${fileHash} and from chain ${expectedFile.exectedFileHash} file name ${filePar.name}`);
            if (fileHash.trim() != expectedFile.exectedFileHash.trim()) {
                toaster.create({
                    description: "Dropped file hash doesn't match the required hash in the AquaTree..",
                    type: "error"
                });
                return;
            }
        } else {
            let aquaTreeItem: AquaTree = JSON.parse(fileDataContent as string)
            let allHashes = Object.keys(aquaTreeItem.revisions)
            console.log(`All hashes ${allHashes} --`)
            if (allHashes.includes(expectedFile.itemRevisionHash)) {
                console.log(`Its okay continue ......`)
            } else {
                toaster.create({
                    description: "Aqua file does not contain " + expectedFile.itemRevisionHash,
                    type: "error"
                });
                return;
            }

        }

        if (filePar.name != expectedFile.expectedFileName) {
            toaster.create({
                description: "Please rename the file to " + expectedFile.expectedFileName,
                type: "error"
            });
            return;
        }


        let fileData = fileDataContent
        if (filePar.name.endsWith(`.aqua.json`)) {
            fileData = JSON.parse(fileDataContent as string)
        }
        const fileObject: FileObject = {
            fileContent: fileData,
            fileName: filePar.name,
            fileSize: filePar.size,
            path: ""
        };

        console.log(`New file object ${JSON.stringify(fileObject, null, 4)}`)

        const newFileObjects = allFileObjectWrapper;//[...allFileObjectWrapper, { file: filePar, fileObject }];
        newFileObjects.push({
            file: filePar, fileObject: fileObject
        })


        console.log(`--- inspectMultiFileUpload continue ${JSON.stringify(newFileObjects, null, 4)} `)
        setAllFileObjectsWrapper(newFileObjects);

        // Scan through all aqua trees and confirm all assets are selected
        const allAquaTrees = newFileObjects.filter((e) => isAquaTree(e.fileObject.fileContent));

        // Check if any files are missing
        const missingFile = checkAllFilesAvailable(allAquaTrees, newFileObjects);
        if (missingFile) {
            console.log(`missingFile ${JSON.stringify(missingFile, null, 2)}`)
            setExpectedFile(missingFile);
            onOpen();
            return;
        }
        console.log(`allAquaTrees contrinue to upload  ${JSON.stringify(allAquaTrees, null, 4)}`)

        // Upload all aqua tree files
        // const uploadSuccess = await uploadAllAquaTreeFiles(allAquaTrees, newFileObjects);
        // if (!uploadSuccess) return;

        for (const item of allAquaTrees) {

            console.log(` looping aqua tree file ${item.file.name} `)
            if (aquaFile.name == item.file.name) {
                console.log(`skip main file .. ${aquaFile.name}`)
            } else {
                const aquaTreeItem: AquaTree = item.fileObject.fileContent as AquaTree;
                const fileName = getAquaTreeFileName(aquaTreeItem);
                const fileObjWrapper = newFileObjects.find((e) => e.fileObject.fileName === fileName);

                if (!fileObjWrapper) {
                    toaster.create({
                        description: `An internal error occured , cannot find file ${fileName}`,
                        type: "error"
                    });
                    return false;
                }

                await uploadFileData(item.file, fileObjWrapper.file, true);
            }
        }

        // Upload the main file
        const fileContent = await readFileAsText(aquaFile);
        const aquaTree: AquaTree = JSON.parse(fileContent);
        const fileName = getAquaTreeFileName(aquaTree);
        const fileObjWrapper = newFileObjects.find((e) => e.fileObject.fileName === fileName);

        await uploadFileData(aquaFile, fileObjWrapper?.file!, false);
    }

    // Helper function to find revision with link

    const importFile = async () => {
        const fileContent = await readFileAsText(aquaFile);
        const aquaTree: AquaTree = JSON.parse(fileContent);
        const hasLinkRevision = hasLinkRevisions(aquaTree);
        console.log(`one here ${hasLinkRevision}`)
        if (hasLinkRevision) {
            await importLinkedFile(aquaTree);
        } else {
            await importSimpleAquaFileFile(aquaTree);
        }
    }

    const modalSelectedFile = async (selectedFile: File) => {
        if (requiredFileHash) {
            let fileDataContent = await readFileContent(selectedFile);
            const fileHash = aquafier.getFileHash(fileDataContent)
            console.log(`calculated fileHash ${fileHash} and from chain ${requiredFileHash} file name ${selectedFile.name}`)
            if (fileHash !== requiredFileHash) {
                toaster.create({
                    description: "Dropped file hash doesn't match the required hash in the AquaTree..",
                    type: "error"
                })
            } else {


                setSelectedFileName(selectedFile.name)
                onClose()

                try {
                    await uploadFileData(aquaFile, selectedFile, false)
                } catch (error) {
                    toaster.create({
                        description: `Error processing: ${error instanceof Error ? error.message : String(error)}`,
                        type: "error"
                    })
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



    return (
        <>
            <Button size={'xs'} colorPalette={'green'} variant={'subtle'} w={'100px'} onClick={importFile} disabled={uploadedIndexes.includes(fileIndex) || uploaded} loading={uploading}>
                <LuImport />
                Import
            </Button>
            <Modal isOpen={isOpen} onClose={() => {
                setUploading(false)
                onClose()
            }} isCentered>
                <ModalOverlay
                    backgroundColor="rgba(0, 0, 0, 0.5)"
                    backdropFilter="blur(2px)"
                />
                <ModalContent
                    maxW="650px"
                    w="90%"
                    mx="auto"
                    mt="50px"
                    borderRadius="16px"
                    boxShadow="0 5px 15px rgba(0, 0, 0, 0.5)"
                    bg="white"
                    border="1px solid rgba(0, 0, 0, 0.2)"
                    p={25}
                    overflow="hidden"
                >
                    <ModalHeader
                        borderBottom="1px solid #e9ecef"
                        py={3}
                        px={4}
                        fontSize="16px"
                        fontWeight="500"
                    >
                        Please provide the required file
                    </ModalHeader>
                    <ModalCloseButton
                        position="absolute"
                        right="10px"
                        top="10px"
                        size="sm"
                        borderRadius="50%"
                        bg="transparent"
                        border="none"
                        _hover={{ bg: "gray.100" }}
                    />
                    <ModalBody py={4} px={4}>
                        <VStack gap={3} alignItems={'center'} flex={1}>
                            <Text fontSize="14px" color={'black'} >
                                {
                                    expectedFile == null ? <span> We couldn't fetch the file associated with this AquaTree. Please select or drop the file:</span>
                                        : <span>{expectedFile.displayText}</span>
                                }
                            </Text>

                            <Box
                                border="1px dashed"
                                borderColor="gray.300"
                                borderRadius="md"
                                p={4}
                                w="100%"
                                textAlign="center"
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                bg="gray.50"
                            >
                                <Text mb={2} color={'black'} fontSize="14px">Drag and drop file here</Text>
                                <Text fontSize="14px" color={'black'} >or</Text>
                                <Button
                                    mt={2}
                                    onClick={() => fileInputRef.current?.click()}
                                    bg="black"
                                    color="white"
                                    _hover={{ bg: "gray.800" }}
                                    size="sm"
                                    borderRadius="sm"
                                >
                                    Select File
                                </Button>
                                <Input
                                    type="file"
                                    hidden
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                />
                            </Box>

                            {selectedFileName.length > 0 ?
                                <Text fontSize="14px">Selected: {selectedFileName}</Text>
                                : <></>}
                        </VStack>
                    </ModalBody>

                    <ModalFooter
                        borderTop="1px solid #e9ecef"
                        py={3}
                        px={4}
                        justifyContent="flex-end"
                    >
                        <Button
                            bg="black"
                            color="white"
                            mr={3}
                            onClick={() => {
                                setUploading(false)
                                onClose()
                            }}
                            size="sm"
                            borderRadius="sm"
                            _hover={{ bg: "gray.800" }}
                        >
                            Cancel
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    )
}