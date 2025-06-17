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
import { IDropzoneAction2 } from "../../types/types";





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
    const [expectedFile, setExpectedFile] = useState<{
        expectedFileName: string,
        displayText: string,
        exectedFileHash: string,
        isAquaFile: boolean
    } | null>(null)

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
            //  console.log("url ", url)
            const response = await axios.post(url, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    "nonce": session?.nonce
                },
            });

            // return all user files
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

    const importLinkedFile = async (aquaTree: AquaTree, revisionHashWithLink: string) => {
        let mainAquaFileObject: FileObject = {
            fileContent: aquaTree,
            fileName: aquaFile.name,
            fileSize: aquaFile.size,
            path: ""
        }

        setAllFileObjectsWrapper([{ fileObject: mainAquaFileObject, file: aquaFile }])

        //get genhash
        let genHash = getGenesisHash(aquaTree);
        if (genHash == null) {
            toaster.create({
                description: `Genesis Revision not found`,
                type: "error"
            })
            return
        }

        let genRevision = aquaTree.revisions[genHash!!]
        let actualUrlToFetch = ensureDomainUrlHasSSL(backend_url)


        // Fetch the file from the URL
        const response = await fetch(`${actualUrlToFetch}/files/${genRevision.fileHash}`, {
            method: 'GET',
            headers: {
                'Nonce': session?.nonce ?? "--error--" // Add the nonce directly as a custom header if needed
            }
        });


        // If response is not ok, prompt user to select a file
        if (!response.ok) {
            setExpectedFile({
                displayText: `please upload ${aquaTree.file_index[genHash]}`,
                exectedFileHash: genRevision.file_hash!!,
                expectedFileName: aquaTree.file_index[genHash],
                isAquaFile: false
            })
            onOpen()

        } else {

            let revisionData = aquaTree.revisions[revisionHashWithLink]

            setExpectedFile({
                displayText: `please aqua file upload ${aquaTree.file_index[revisionHashWithLink]}`,
                exectedFileHash: revisionData.link_file_hashes![0],
                expectedFileName: aquaTree.file_index[revisionHashWithLink],
                isAquaFile: true
            })
            onOpen()

        }

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

            // Find file hash from aqua tree
            let fileHash = ""
            for (let item of Object.values(aquaTree.revisions)) {
                if (item.revision_type === "file" && item.file_hash) {
                    fileHash = item.file_hash
                    break
                }
            }

            let actualUrlToFetch = ensureDomainUrlHasSSL(backend_url)


            // Fetch the file from the URL
            const response = await fetch(`${actualUrlToFetch}/files/${fileHash}`, {
                method: 'GET',
                headers: {
                    'Nonce': session?.nonce ?? "--error--" // Add the nonce directly as a custom header if needed
                }
            });


            // If response is not ok, prompt user to select a file
            if (!response.ok) {


                if (fileHash) {
                    setRequiredFileHash(fileHash)
                    onOpen() // Open dialog to select file
                    // setUploading(false)
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



            // check linked revsion exist and throw an error 
            // linked revsision should be in zip 
            for (let item of Object.values(aquaTree!.revisions)) {
                if (item.revision_type == "link") {
                    setUploading(false)
                    toaster.create({
                        description: `Aqua tree has a link revision please import the Aquatree using the zip format`,
                        type: "error"
                    })
                    return
                }
            }


            // check if the aqua tree is valid 

            let result = await aquafier.verifyAquaTree(aquaTree, [fileObject]);

            if (result.isErr()) {
                setUploading(false)
                toaster.create({
                    description: `Aqua tree is not valid: ${JSON.stringify(result)}`,
                    type: "error"
                })
                return;
            }


            // check if gensesi hash exist in user files
            let importedAquaTreeGensisHash = getGenesisHash(aquaTree);
            let userHasAquaTree = false;

            for (let userFile of files) {
                let aquaTreeGensisHash = getGenesisHash(userFile.aquaTree!!)
                if (aquaTreeGensisHash) {
                    if (aquaTreeGensisHash == importedAquaTreeGensisHash) {
                        userHasAquaTree = true
                        break;
                    }
                }
            }

            if (userHasAquaTree) {
                setUploading(false)
                toaster.create({
                    description: `Aqua tree is not valid: Genesis hash not found`,
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

    const importFile = async () => {

        if (allFileObjectWrapper.length != 0) {


        }


        //check if the file is a valid aqua tree 
        let fileContent = await readFileAsText(aquaFile)
        let aquaTree: AquaTree = JSON.parse(fileContent);
        let allHashes = Object.keys(aquaTree.revisions);
        let revisionHashWithLink: string | null = null;

        for (let item of allHashes) {
            let revision = aquaTree.revisions[item];

            if (revision.revision_type == "link") {
                revisionHashWithLink = item
                break
            }
        }

        if (revisionHashWithLink != null) {
            await importLinkedFile(aquaTree, revisionHashWithLink)
        } else {
            await importSimpleAquaFileFile(aquaTree)
        }

    }

    const inspectMultiFileUpload = async (filePar: File) => {
        if (expectedFile) {
            let fileDataContent = await readFileContent(filePar);
            const fileHash = aquafier.getFileHash(fileDataContent)
            console.log(`calculated fileHash ${fileHash} and from chain ${expectedFile.exectedFileHash} file name ${filePar.name}`)
            if (fileHash !== expectedFile.exectedFileHash) {
                toaster.create({
                    description: "Dropped file hash doesn't match the required hash in the AquaTree..",
                    type: "error"
                })
            } else if (filePar.name != expectedFile.expectedFileName) {
                toaster.create({
                    description: "Please rename the file to " + expectedFile.expectedFileName,
                    type: "error"
                })
            } else {

                let fileObject: FileObject = {
                    fileContent: fileDataContent,
                    fileName: filePar.name,
                    fileSize: filePar.size,
                    path: ""
                }
                let newFileObjects = [...allFileObjectWrapper, {
                    file: filePar,
                    fileObject
                }]
                setAllFileObjectsWrapper(newFileObjects)

                //scan through all aqua tree and confirm all assets are selected
                let allAquaTrees = newFileObjects.filter((e) => isAquaTree(e.fileObject.fileContent))

                for (let aFileObject of allAquaTrees) {
                    let aquaTreeItem: AquaTree = aFileObject.fileObject.fileContent as AquaTree
                    let linkHash = allLinkRevisionHashes(aquaTreeItem)

                    if (linkHash.length > 0) {

                        let allHashesHaveFile: boolean = true
                        for (let aLinkHash of linkHash) {

                            let revisionItem = aquaTreeItem.revisions[aLinkHash]
                            let fileName = aquaTreeItem.file_index[aLinkHash]
                            //find the aqua json file 
                            let aquaFile = `${fileName}.aqua.json`
                            let aquafileItemObject = newFileObjects.find((e) => e.fileObject.fileName == aquaFile)
                            if (aquafileItemObject == undefined) {

                                setExpectedFile({
                                    displayText: `please upload ${aquaFile}`,
                                    exectedFileHash: "",
                                    expectedFileName: aquaFile,
                                    isAquaFile: true
                                })
                                onOpen()

                                allHashesHaveFile = false
                                break;

                            }


                            // find the file

                            let fileItemObject = newFileObjects.find((e) => e.fileObject.fileName == fileName)
                            if (fileItemObject == undefined) {

                                setExpectedFile({
                                    displayText: `please upload ${fileName}`,
                                    exectedFileHash: revisionItem.link_file_hashes![0],
                                    expectedFileName: fileName,
                                    isAquaFile: false
                                })
                                onOpen()

                                allHashesHaveFile = false
                                break;

                            }




                        }

                        if (allHashesHaveFile == false) {


                            return

                        }

                    }
                }

                // upload all the file objects
                //scan through all aqua tree and confirm all assets are selected
                for (let item of allAquaTrees) {
                    let aquaTreeItem: AquaTree = item.fileObject.fileContent as AquaTree
                    let fileName = getAquaTreeFileName(aquaTreeItem)

                    let fileObjWrapper = newFileObjects.find((e) => e.fileObject.fileName == fileName)

                    if (fileObjWrapper == undefined) {
                        toaster.create({
                            description: "An internal error occured, genesis cannot be null ",
                            type: "error"
                        })
                        break;
                    }

                    await uploadFileData(item.file, fileObjWrapper.file, true)
                }


                // let aquaTreeItem: AquaTree = aq.fileObject.fileContent as AquaTree
                let fileContent = await readFileAsText(aquaFile)
                let aquaTree: AquaTree = JSON.parse(fileContent);

                let fileName = getAquaTreeFileName(aquaTree)

                let fileObjWrapper = newFileObjects.find((e) => e.fileObject.fileName == fileName)

                // Upload the file and aqua tree
                await uploadFileData(aquaFile, fileObjWrapper?.file!, false)

            }
        } else {
            toaster.create({
                description: "An internal error occured",
                type: "error"
            })
        }

    }
    const modalSelectedFile = async (selectedFile: File) => {


        // Verify file hash matches required hash
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
                await handleContinue(selectedFile)
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

    const handleContinue = async (assetFile: File) => {
        if (!assetFile) {
            toaster.create({
                description: "Please select a file first.",
                type: "warning"
            })
            return
        }

        setSelectedFileName(assetFile.name)

        // close modal
        onClose()


        try {

            // Upload the file and aqua tree
            await uploadFileData(aquaFile, assetFile)
        } catch (error) {
            toaster.create({
                description: `Error processing: ${error instanceof Error ? error.message : String(error)}`,
                type: "error"
            })
            setUploading(false)
        }
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
                        {/* <Button
                            bg="gray.500"
                            color="white"
                            onClick={handleContinue}
                            disabled={!selectedFile}
                            size="sm"
                            _hover={{ bg: "gray.600" }}
                            borderRadius="sm"
                        >
                            Continue
                        </Button> */}
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>

    )

}
