import { LuCheck, LuChevronRight, LuDock, LuImport, LuMinus, LuScan, LuUpload, LuX } from "react-icons/lu";
import { Button } from "./chakra-ui/button";
import axios from "axios";
import { useStore } from "zustand";
import appStore from "../store";
import { useEffect, useRef, useState } from "react";
import { ApiFileInfo } from "../models/FileInfo";
import { toaster } from "./chakra-ui/toaster";
import { formatCryptoAddress, readFileAsText, validateAquaTree, getFileName, readFileContent, checkIfFileExistInUserFiles, getGenesisHash, ensureDomainUrlHasSSL } from "../utils/functions";
import { Box, Container, DialogCloseTrigger, Group, Input, List, Text, VStack } from "@chakra-ui/react";
import {
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
} from '@chakra-ui/modal'

import { Alert } from "./chakra-ui/alert";
import { useNavigate } from "react-router-dom";
import { analyzeAndMergeRevisions } from "../utils/aqua_funcs";
import { DialogActionTrigger, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogRoot, DialogTitle } from "./chakra-ui/dialog";
import { TimelineConnector, TimelineContent, TimelineDescription, TimelineItem, TimelineRoot, TimelineTitle } from "./chakra-ui/timeline";
import { RevisionsComparisonResult } from "../models/revision_merge";
import Aquafier, { AquaTree, FileObject, OrderRevisionInAquaTree, Revision } from "aqua-js-sdk";
import JSZip from "jszip";
import { useDisclosure } from '@chakra-ui/hooks'
import { maxFileSizeForUpload } from "../utils/constants";

interface IDropzoneAction {
    file: File
    fileIndex: number
    uploadedIndexes: number[]
    updateUploadedIndex: (fileIndex: number) => void
    autoUpload: boolean
}

export const FormRevisionFile = ({ file, uploadedIndexes, fileIndex, updateUploadedIndex }: IDropzoneAction) => {

    const [uploading, setUploading] = useState(false)
    const [uploaded, setUploaded] = useState(false)

    const { metamaskAddress, setFiles, files, backend_url, session } = useStore(appStore)



    const uploadFile = async () => {

        let fileExist = await checkIfFileExistInUserFiles(file, files)

        if (fileExist) {
            toaster.create({
                description: "You already have the file. Delete before importing this",
                type: "info"
            })
            return
        }




        if (!file) {
            toaster.create({
                description: "No file selected!",
                type: "info"
            })
            return;
        }


        if (file.size > maxFileSizeForUpload) {
            toaster.create({
                description: "File size exceeds 200MB limit. Please upload a smaller file.",
                type: "error"
            })
            return;
        }

        const formData = new FormData();
        formData.append('isForm', 'true');
        formData.append('file', file);
        formData.append('account', `${metamaskAddress}`);

        setUploading(true)
        try {
            const url = `${backend_url}/explorer_files`
            //  console.log("url ", url)
            const response = await axios.post(url, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    "nonce": session?.nonce
                },
            });

            const res = response.data

            const fileInfo: ApiFileInfo = {
                aquaTree: res.aquaTree,
                fileObject: [res.fileObject],
                linkedFileObjects: [],
                mode: "private",
                owner: metamaskAddress ?? ""
            }
            // const base64Content = await encodeFileToBase64(file);
            // Assuming the API returns an array of FileInfo objects
            // const fileInfo: ApiFileInfo = {
            //     fileObject: {
            //         fileName: res.file.name,
            //         fileContent: base64Content,
            //         path: "aqua::",
            //     },
            //     // name: res.file.name,
            //     // extension: res.file.extension,
            //     // page_data: res.file.page_data,
            //     mode: res.file.mode,
            //     owner: res.file.owner,
            //     aquaTree: null,
            //     linkedFileObjects: []
            // };

            setFiles([...files, fileInfo])
            setUploaded(true)
            setUploading(false)
            toaster.create({
                description: "File uploaded successfuly",
                type: "success"
            })
            updateUploadedIndex(fileIndex)
            return;
        } catch (error) {
            setUploading(false)
            toaster.create({
                description: `Failed to upload file: ${error}`,
                type: "error"
            })
        }
    };

    return (
        <Button size={'xs'} colorPalette={'yellow'} variant={'subtle'} w={'120px'} onClick={uploadFile} disabled={uploadedIndexes.includes(fileIndex) || uploaded} loading={uploading}>
            <LuDock />
            Create Form
        </Button>
    )
}

export const UploadFile = ({ file, uploadedIndexes, fileIndex, updateUploadedIndex, autoUpload }: IDropzoneAction) => {

    const [uploading, setUploading] = useState(false)
    const [uploaded, setUploaded] = useState(false)

    const { metamaskAddress, addFile, files, backend_url, session } = useStore(appStore)



    const uploadFile = async () => {

        // let aquafier = new Aquafier();
        // let fileContent = await  readFileContent()
        // const existingChainFile = files.find(_file => _file.fileObject.find((e) => e.fileName == file.name) != undefined)

        //
        if (!file) {
            toaster.create({
                description: "No file selected!",
                type: "info"
            })
            return;
        }

        let fileExist = await checkIfFileExistInUserFiles(file, files)

        if (fileExist) {
            toaster.create({
                description: "You already have the file. Delete before importing this",
                type: "info"
            })
            updateUploadedIndex(fileIndex)

            return
        }





        if (file.size > maxFileSizeForUpload) {
            toaster.create({
                description: "File size exceeds 200MB limit. Please upload a smaller file.",
                type: "error"
            })
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('account', `${metamaskAddress}`);

        setUploading(true)
        try {
            const url = `${backend_url}/explorer_files`
            //  console.log("url ", url)
            const response = await axios.post(url, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    "nonce": session?.nonce
                },
            });

            const res = response.data

            const fileInfo: ApiFileInfo = {
                aquaTree: res.aquaTree,
                fileObject: [res.fileObject],
                linkedFileObjects: [],
                mode: "private",
                owner: metamaskAddress ?? ""
            }
            // const base64Content = await encodeFileToBase64(file);
            // Assuming the API returns an array of FileInfo objects
            // const fileInfo: ApiFileInfo = {
            //     fileObject: {
            //         fileName: res.file.name,
            //         fileContent: base64Content,
            //         path: "aqua::",
            //     },
            //     // name: res.file.name,
            //     // extension: res.file.extension,
            //     // page_data: res.file.page_data,
            //     mode: res.file.mode,
            //     owner: res.file.owner,
            //     aquaTree: null,
            //     linkedFileObjects: []
            // };


            // let newFilesData = [...files, fileInfo];
            // console.log(`newFilesData -, ${JSON.stringify(newFilesData)}`)

            addFile(fileInfo)

            setUploaded(true)
            setUploading(false)
            toaster.create({
                description: "File uploaded successfuly",
                type: "success"
            })
            updateUploadedIndex(fileIndex)
            return;
        } catch (error) {
            setUploading(false)
            toaster.create({
                description: `Failed to upload file: ${error}`,
                type: "error"
            })
        }
    };

    // Use a ref to track if the upload has already been triggered
    const uploadInitiatedRef = useRef(false)

    useEffect(() => {
        if (autoUpload) {
            // Only upload if it hasn't been initiated yet
            if (!uploadInitiatedRef.current) {
                uploadInitiatedRef.current = true

                uploadFile()
            }
        }
    }, [])

    return (
        <Button size={'xs'} colorPalette={'blackAlpha'} variant={'subtle'} w={'80px'} onClick={uploadFile} disabled={uploadedIndexes.includes(fileIndex) || uploaded} loading={uploading}>
            <LuUpload />
            Upload
        </Button>
    )
}



export const ImportAquaTree = ({ file, uploadedIndexes, fileIndex, updateUploadedIndex }: IDropzoneAction) => {

    let aquafier = new Aquafier();
    const [uploading, setUploading] = useState(false)
    const [uploaded, setUploaded] = useState(false)
    const [requiredFileHash, setRequiredFileHash] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [selectedFileName, setSelectedFileName] = useState<string>("")
    const { isOpen, onOpen, onClose } = useDisclosure()

    const { files, metamaskAddress, setFiles, backend_url, session } = useStore(appStore)


    const uploadFileData = async (selectedFile: File | null) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('has_asset', `${selectedFile != null}`);
        formData.append('asset', selectedFile ?? file);
        formData.append('account', `${metamaskAddress}`);

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

    const importFile = async () => {


        try {
            setUploading(true)
            //check if the file is a valid aqua tree 
            let fileContent = await readFileAsText(file)
            let aquaTree: AquaTree = JSON.parse(fileContent)
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

            await uploadFileData(null)



        } catch (e) {
            setUploading(false)
            toaster.create({
                description: `Failed to import aqua tree file: ${e}`,
                type: "error"
            })
        }
    }

    const modalSelectedFile = async (file: File) => {


        // Verify file hash matches required hash
        if (requiredFileHash) {
            let fileDataContent = await readFileContent(file);
            const fileHash = aquafier.getFileHash(fileDataContent)
            console.log(`calculated fileHash ${fileHash} and from chain ${requiredFileHash} file name ${file.name}`)
            if (fileHash !== requiredFileHash) {
                toaster.create({
                    description: "Dropped file hash doesn't match the required hash in the AquaTree..",
                    type: "error"
                })
            } else {
                await handleContinue(file)
            }
        }
    }
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]
            await modalSelectedFile(file)
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

    const handleContinue = async (file: File) => {
        if (!file) {
            toaster.create({
                description: "Please select a file first.",
                type: "warning"
            })
            return
        }

        setSelectedFileName(file.name)

        // close modal
        onClose()


        try {

            // Upload the file and aqua tree
            await uploadFileData(file)
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
                                We couldn't fetch the file associated with this AquaTree. Please select or drop the file:
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


export const ImportAquaTreeZip = ({ file, uploadedIndexes, fileIndex, updateUploadedIndex }: IDropzoneAction) => {

    const [uploading, setUploading] = useState(false)
    const [uploaded, setUploaded] = useState(false)

    const { metamaskAddress, setFiles, backend_url, session } = useStore(appStore)



    const uploadFileData = async () => {



        if (!file) {
            toaster.create({
                description: "No file selected!",
                type: "info"
            })
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('account', `${metamaskAddress}`);

        setUploading(true)
        try {
            const url = `${backend_url}/explorer_aqua_zip`
            //  console.log("url ", url)
            const response = await axios.post(url, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    "nonce": session?.nonce
                },
            });

            // return all user files
            const res = response.data


            setFiles([...res.data])
            setUploaded(true)
            setUploading(false)
            toaster.create({
                description: "File uploaded successfuly",
                type: "success"
            })
            updateUploadedIndex(fileIndex)
            return;
        } catch (error) {
            setUploading(false)
            toaster.create({
                description: `Failed to upload file: ${error}`,
                type: "error"
            })
        }
    }

    const importFile = async () => {


        const reader = new FileReader();

        reader.onload = async function (_e) {

            try {

                let hasAquaJson = false
                const zip = new JSZip();
                const zipData = await zip.loadAsync(file);
                for (const fileName in zipData.files) {
                    if (fileName == 'aqua.json') {
                        hasAquaJson = true
                        break;
                    }
                }
                if (!hasAquaJson) {
                    toaster.create({
                        description: "Aqua Json not found.",
                        type: "info"
                    })
                    return
                }

                await uploadFileData()


            } catch (error) {
                console.error("Error reading ZIP file:", error);
                alert("Failed to read ZIP file.");
            }
        };

        reader.readAsArrayBuffer(file);

    };

    return (
        <Button size={'xs'} colorPalette={'blackAlpha'} variant={'subtle'} w={'80px'} onClick={importFile} disabled={uploadedIndexes.includes(fileIndex) || uploaded} loading={uploading}>
            <LuScan />
            Import
        </Button>
    )
}


// export const VerifyFile = ({ file }: IDropzoneAction) => {

// const [verifying, setVerifying] = useState(false)
// const [hashChainForVerification, setHashChain] = useState<ApiFileInfo>()
// const [_isVerificationSuccessful, setIsVerificationSuccessful] = useState(false)
// const [uploaded, setUploaded] = useState(false)
// const { session } = useStore(appStore)
// const { metamaskAddress, setFiles, files } = useStore(appStore)

// const handleVerifyAquaJsonFile = () => {
//     setVerifying(true)
//     readJsonFile(file)
//         .then((jsonData) => {
//             const hashChain: ApiFileInfo = {
//                 id: 0,
//                 name: '',
//                 extension: '',
//                 page_data: JSON.stringify(jsonData),
//                 mode: '',
//                 owner: ''
//             }
//             setHashChain(hashChain)
//             // const hashChainString = JSON.stringify(hashChain)
//             ////  console.log("JSON data:", hashChain);
//             // setAppState("selectedFileFromApi", hashChain);
//             // navigate("/details");
//             // Handle the JSON data here
//         })
//         .catch(() => {
//             // Handle the error here
//         });
//     setVerifying(false)
// };

// useEffect(() => {
//     handleVerifyAquaJsonFile()
// }, [])

//     return (
//         <>
//             {
//                 hashChainForVerification ? (
//                     <ChainDetailsBtn session={session!!} fileInfo={hashChainForVerification} callBack={(res) => {
//                         console.log(`ChainDetailsBtn Callback FIX me ${res}`);
//                         setIsVerificationSuccessful(res[0])
//                     }} />
//                 ) : (
//                     <Button size={'xs'} colorPalette={'blackAlpha'} variant={'subtle'} w={'80px'} loading={verifying} disabled>
//                         <LuScan />
//                         Loading Chain
//                     </Button>
//                 )
//             }
//         </>
//     )
// }


export const ImportAquaChainFromFile = ({ file, uploadedIndexes, fileIndex, updateUploadedIndex }: IDropzoneAction) => {

    const [uploading, setUploading] = useState(false)
    const [uploaded, setUploaded] = useState(false)

    const { metamaskAddress, setFiles, files, backend_url } = useStore(appStore)

    const importAquaChain = async () => {

        if (!file) {
            toaster.create({
                description: "No file selected!",
                type: "error"
            })
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('account', "example");
        setUploading(true)
        try {
            const url = `${backend_url}/explorer_aqua_file_upload`;
            //  console.log("importAquaChain url ", url)
            const response = await axios.post(url, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    "metamask_address": metamaskAddress
                },
            });

            const res = response.data

            // let logs: Array<string> = res.logs
            // logs.forEach((item) => {
            //    //  console.log("**>" + item + "\n.")
            // })
            ////  console.log("Upload res: ", res)
            // Assuming the API returns an array of FileInfo objects
            // const file: ApiFileInfo = {
            // id: res.file.id,
            // name: res.file.name,
            // extension: res.file.extension,
            // page_data: res.file.page_data,
            // mode: user_profile.fileMode ?? "",
            // owner: metamaskAddress ?? "",
            // };

            const file: ApiFileInfo = res
            setFiles([...files, file])
            // setUploadedFilesIndexes(value => [...value, fileIndex])
            toaster.create({
                description: "Aqua Chain imported successfully",
                type: "success"
            })
            setUploading(false)
            setUploaded(true)
            updateUploadedIndex(fileIndex)
            return;
        } catch (error) {
            setUploading(false)
            toaster.create({
                description: `Failed to import chain: ${error}`,
                type: "error"
            })
        }
    };

    return (
        <Button size={'xs'} colorPalette={'blackAlpha'} variant={'subtle'} w={'80px'} onClick={importAquaChain} disabled={uploadedIndexes.includes(fileIndex) || uploaded} loading={uploading}>
            <LuImport />
            Import
        </Button>
    )
}

interface ImportChainFromChainProps { fileInfo: ApiFileInfo, isVerificationSuccessful: boolean | null, contractData?: any }

interface BtnContent {
    text: string
    color: string
}

export const ImportAquaChainFromChain = ({ fileInfo, isVerificationSuccessful, contractData }: ImportChainFromChainProps) => {

    const [uploading, setUploading] = useState(false)
    const [_uploaded, setUploaded] = useState(false)
    const [dbFiles, setDbFiles] = useState<ApiFileInfo[]>([])
    const [comparisonResult, setComparisonResult] = useState<RevisionsComparisonResult | null>(null)
    const [modalOpen, setModalOpen] = useState(false)

    // const [_existingFileId, _setExistingFileId] = useState<number | null>(null)
    const [_lastIdenticalRevisionHash, setLastIdenticalRevisionHash] = useState<string | null>(null)
    const [_revisionsToImport, setRevisionsToImport] = useState<Revision[]>([])
    const [updateMessage, setUpdateMessage] = useState<string | null>(null)
    const [btnText, setBtnText] = useState<BtnContent>({
        text: "Submit chain",
        color: "blue"
    })

    //  console.log(revisionsToImport)

    const { files, backend_url, session } = useStore(appStore)

    let navigate = useNavigate();

    //  console.log("Chain to import: ", fileInfo)
    //  console.log("My db files: ", dbFiles)

    const importAquaChain = async () => {
        // Early check to prevent recursion if already processing
        if (uploading) return;

        const existingChainFile = dbFiles.find(file => Object.keys(file?.aquaTree?.revisions ?? {})[0] === Object.keys(fileInfo?.aquaTree?.revisions ?? {})[0])

        // 1. update local chain with new revisions. (importing chain is bigger)
        // 2. delete revsiion in local chain if the locl one has more revision than the importing one (ie remote has less and theyare the same revision)
        // 3. if the  importing chain has  same length or bigger/smmal but divergent revision

        if (existingChainFile) {
            const existingFileRevisions = Object.keys(existingChainFile?.aquaTree?.revisions ?? {})
            const fileToImportRevisions = Object.keys(fileInfo?.aquaTree?.revisions ?? {})

            ////  console.log(existingFileRevisions, fileToImportRevisions)
            const mergeResult = analyzeAndMergeRevisions(existingFileRevisions, fileToImportRevisions)
            let _revisionsToImport: Revision[] = []

            if (mergeResult.existingRevisionsLength < mergeResult.upcomingRevisionsLength) {
                setUpdateMessage("Importing chain is longer than existing chain, this will add new revisions to your local chain")
                setBtnText({
                    text: "Update Local Chain",
                    color: "green",
                })
            }

            if (mergeResult.existingRevisionsLength > mergeResult.upcomingRevisionsLength) {
                setUpdateMessage("Existing chain is longer than importing chain, this will delete some revisions in your local chain")
                setBtnText({
                    text: "Rebase Local Chain",
                    color: "yellow"
                })
            }

            if (mergeResult.existingRevisionsLength === mergeResult.upcomingRevisionsLength && mergeResult.divergences.length > 0) {
                setUpdateMessage("Chains are different, this will merge the chains, your local revisions will be deleted up to where the chains diverge")
                setBtnText({
                    text: "Merge Chains",
                    color: "red"
                })
            }

            if (mergeResult.divergences.length > 0) {
                for (let i = 0; i < mergeResult.divergences.length; i++) {
                    const div = mergeResult.divergences[i];
                    if (div.upcomingRevisionHash) {
                        _revisionsToImport.push(fileInfo?.aquaTree?.revisions[div.upcomingRevisionHash]!!)
                    }
                }
            }

            setComparisonResult(mergeResult)
            setLastIdenticalRevisionHash(mergeResult.lastIdenticalRevisionHash)
            setRevisionsToImport(_revisionsToImport)
            setModalOpen(true)
            return
        }

        setUploading(true)

        try {
            const url = `${backend_url}/transfer_chain`
            const reorderedRevisions = OrderRevisionInAquaTree(fileInfo.aquaTree!!)
            const revisions = reorderedRevisions.revisions
            const revisionHashes = Object.keys(revisions)
            const latestRevisionHash = revisionHashes[revisionHashes.length - 1]
            console.log("Latest revision hash: ", latestRevisionHash)

            const res = await axios.post(url, {
                latestRevisionHash: latestRevisionHash,
                userAddress: contractData.sender
            }, {
                headers: {
                    "nonce": session?.nonce
                }
            })

            console.log("Transfer chain res: ", res)
            if (res.status === 200) {
                toaster.create({
                    description: "Aqua Chain imported successfully",
                    type: "success"
                })

                // Use setTimeout to ensure state is updated before navigation
                setTimeout(() => {
                    navigate("/loading?reload=true");
                }, 500);
            } else {
                toaster.create({
                    description: "Failed to import chain",
                    type: "error"
                })
            }

            setUploading(false)
            setUploaded(true)
            return;
        } catch (error) {
            setUploading(false)
            toaster.create({
                description: `Failed to import chain: ${error}`,
                type: "error"
            })
        }
    };

    const handleMergeRevisions = async () => {
        // try {
        //     setUploading(true)
        //     const revisionsToImport: Array<[string, Revision]> = []
        //     const revisionsToDelete: Array<string> = []
        //     const existingChainFile = dbFiles.find(file => Object.keys(file?.aquaTree?.revisions ?? {})[0] === Object.keys(fileInfo?.aquaTree?.revisions ?? {})[0])

        //     comparisonResult?.divergences?.forEach((divergence) => {
        //         const upcomingRevisionHash = divergence.upcomingRevisionHash
        //         const outgoingRevisionHash = divergence.existingRevisionHash
        //         if (outgoingRevisionHash) {
        //             revisionsToDelete.push(outgoingRevisionHash)
        //         }
        //         if (!upcomingRevisionHash) return

        //         if (existingChainFile) {
        //             const fileToImportRevisions = fileInfo?.aquaTree?.revisions
        //             let revisionToImport = fileToImportRevisions?.[upcomingRevisionHash]
        //             if (!revisionToImport) return
        //             revisionsToImport.push([upcomingRevisionHash, revisionToImport])
        //         }
        //     })

        //     // Process deletions first if needed
        //     if (revisionsToDelete.length > 0) {
        //         const revisionHashes = revisionsToDelete.join(",")
        //         const revisionDeleteUrl = `${backend_url}/tree`;
        //         try {
        //             let deletionResults = await axios.delete(revisionDeleteUrl, {
        //                 data: {
        //                     revisionHash: revisionHashes
        //                 },
        //                 params: {
        //                 },
        //                 headers: {
        //                     "nonce": session?.nonce
        //                 }
        //             })

        //             console.log("Deletion results: ", deletionResults)
        //         } catch (error: any) {
        //             console.log("Deletion Error: ", error)
        //             toaster.create({
        //                 title: "Revision Deletion Error",
        //                 description: `An error occurred deleting some revisions: ${error}`,
        //                 type: "error"
        //             })
        //         }
        //     }

        //     // Then handle imports
        //     let importSuccessful = true;
        //     if (revisionsToImport.length > 0) {
        //         const url = `${backend_url}/tree`;
        //         for (const revision of revisionsToImport) {
        //             try {
        //                 let res = await axios.post(url, {
        //                     "revision": revision[1],
        //                     "revisionHash": revision[0],
        //                 }, {
        //                     headers: {
        //                         "nonce": session?.nonce
        //                     }
        //                 })
        //                 if (res.status !== 200) {
        //                     importSuccessful = false;
        //                     break;
        //                 }
        //             } catch (e) {
        //                 importSuccessful = false;
        //                 break;
        //             }
        //         }
        //     }

        //     // Only show one success/error message after all operations
        //     if (importSuccessful) {
        //         toaster.create({
        //             title: "Aqua chain import",
        //             description: "Chain merged successfully",
        //             type: "success"
        //         })
        //         // Navigate only once after all operations are complete
        //         setTimeout(() => navigate("/loading?reload=true"), 500);
        //     } else {
        //         toaster.create({
        //             title: "Aqua chain import failed",
        //             description: "Chain merge failed",
        //             type: "error"
        //         })
        //     }

        //     setUploading(false)
        // } catch (e: any) {
        //     setUploading(false)
        //     if (e.message) {
        //         toaster.create({
        //             title: "Error occurred",
        //             description: e.message,
        //             type: "error"
        //         })
        //     }
        // }

        try {
            const url = `${backend_url}/merge_chain`
            const reorderedRevisions = OrderRevisionInAquaTree(fileInfo.aquaTree!!)
            const revisions = reorderedRevisions.revisions
            const revisionHashes = Object.keys(revisions)
            const latestRevisionHash = revisionHashes[revisionHashes.length - 1]
            // console.log("Latest revision hash: ", latestRevisionHash)

            const res = await axios.post(url, {
                latestRevisionHash: latestRevisionHash,
                userAddress: contractData.sender,
                mergeStrategy: "fork"
            }, {
                headers: {
                    "nonce": session?.nonce
                }
            })

            // console.log("Transfer chain res: ", res)
            if (res.status === 200) {
                toaster.create({
                    description: "Aqua Chain imported successfully",
                    type: "success"
                })

                // Use setTimeout to ensure state is updated before navigation
                setTimeout(() => {
                    navigate("/loading?reload=true");
                }, 500);
            } else {
                toaster.create({
                    description: "Failed to import chain",
                    type: "error"
                })
            }

            setUploading(false)
            setUploaded(true)
            return;
        } catch (error) {
            setUploading(false)
            toaster.create({
                description: `Failed to import chain: ${error}`,
                type: "error"
            })
        }
    }

    //  console.log(comparisonResult)

    useEffect(() => {
        // Only update dbFiles if files have actually changed
        // This prevents unnecessary re-renders and potential recursion
        if (JSON.stringify(files) !== JSON.stringify(dbFiles)) {
            setDbFiles(files);
        }
    }, [files]);

    return (
        <Container maxW={'xl'}>
            <Alert title="Import Aqua Chain" icon={<LuImport />}>
                <Group gap={"10"}>
                    <Text>
                        Do you want to import this Aqua Chain?
                    </Text>
                    <Button size={'lg'} colorPalette={'blue'} variant={'solid'} onClick={importAquaChain}
                    // disabled={!isVerificationSuccessful} loading={uploading}
                    >
                        <LuImport />
                        Import
                    </Button>
                </Group>
            </Alert>
            {/* <Alert.Root colorPalette={'orange'}>
                Would you like to import the file?
                <Button size={'lg'} colorPalette={'blue'} variant={'subtle'} onClick={importAquaChain} disabled={!isVerificationSuccessful} loading={uploading}>
                    <LuImport />
                    Import
                </Button>
            </Alert.Root> */}

            <DialogRoot open={modalOpen} onOpenChange={e => setModalOpen(e.open)}>
                {/* <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                        Open Dialog
                    </Button>
                </DialogTrigger> */}
                <DialogContent borderRadius={'lg'}>
                    <DialogHeader>
                        <DialogTitle>Aqua Chain Import</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        <TimelineRoot>
                            <TimelineItem colorPalette={isVerificationSuccessful ? 'green' : 'red'}>
                                <TimelineConnector>
                                    <LuCheck />
                                </TimelineConnector>
                                <TimelineContent colorPalette={'gray'}>
                                    <TimelineTitle>Verification status</TimelineTitle>
                                    <TimelineDescription>Verification successful</TimelineDescription>
                                </TimelineContent>
                            </TimelineItem>

                            {
                                comparisonResult?.identical ? (
                                    <>
                                        <TimelineItem colorPalette={'green'}>
                                            <TimelineConnector>
                                                <LuCheck />
                                            </TimelineConnector>
                                            <TimelineContent>
                                                <TimelineTitle textStyle="sm">Chains Identical</TimelineTitle>
                                                <TimelineDescription>Chains are identical</TimelineDescription>
                                            </TimelineContent>
                                        </TimelineItem>
                                    </>
                                ) : null
                            }

                            {
                                (comparisonResult?.existingRevisionsLength ?? 0) > (comparisonResult?.upcomingRevisionsLength ?? 0) ? (
                                    <>
                                        <TimelineItem colorPalette={'green'}>
                                            <TimelineConnector>
                                                <LuCheck />
                                            </TimelineConnector>
                                            <TimelineContent>
                                                <TimelineTitle textStyle="sm">Chain Difference</TimelineTitle>
                                                <TimelineDescription>Existing Chain is Longer than Upcoming Chain</TimelineDescription>
                                            </TimelineContent>
                                        </TimelineItem>
                                    </>
                                ) : null
                            }

                            {
                                comparisonResult?.sameLength ? (
                                    <>
                                        <TimelineItem colorPalette={'green'}>
                                            <TimelineConnector>
                                                <LuCheck />
                                            </TimelineConnector>
                                            <TimelineContent>
                                                <TimelineTitle textStyle="sm">Chains Length</TimelineTitle>
                                                <TimelineDescription>Chains are of same Length</TimelineDescription>
                                            </TimelineContent>
                                        </TimelineItem>
                                    </>
                                ) : null
                            }


                            {
                                (
                                    (comparisonResult?.divergences?.length ?? 0) > 0
                                    && (comparisonResult?.existingRevisionsLength ?? 0) <= (comparisonResult?.upcomingRevisionsLength ?? 0)
                                    // && isVerificationSuccessful // We won't reach here since by then the import button will be disabled
                                ) ? (
                                    <>
                                        <TimelineItem colorPalette={'gray'}>
                                            <TimelineConnector>
                                                <LuX />
                                            </TimelineConnector>
                                            <TimelineContent>
                                                <TimelineTitle textStyle="sm">Chains are Different</TimelineTitle>
                                                {/* <TimelineDescription>Chains have divergencies</TimelineDescription> */}
                                                <List.Root>
                                                    {
                                                        comparisonResult?.divergences.map((diff, i: number) => (
                                                            <List.Item key={`diff_${i}`} fontSize={'sm'}>
                                                                {
                                                                    diff.existingRevisionHash ? (
                                                                        <Group>
                                                                            <Text textDecoration={'line-through'} style={{ textDecorationColor: 'red', color: "red" }}>
                                                                                {formatCryptoAddress(diff.existingRevisionHash ?? "", 15, 4)}
                                                                            </Text>
                                                                            <LuChevronRight />
                                                                            <Text>
                                                                                {formatCryptoAddress(diff.upcomingRevisionHash ?? "", 15, 4)}
                                                                            </Text>
                                                                        </Group>
                                                                    ) : (
                                                                        <>
                                                                            {formatCryptoAddress(diff.upcomingRevisionHash ?? "", 20, 4)}
                                                                        </>
                                                                    )
                                                                }
                                                            </List.Item>
                                                        ))
                                                    }
                                                </List.Root>
                                            </TimelineContent>
                                        </TimelineItem>

                                        <TimelineItem colorPalette={'info'}>
                                            <TimelineConnector>
                                                <LuCheck />
                                            </TimelineConnector>
                                            <TimelineContent>
                                                <TimelineTitle textStyle="sm">Action</TimelineTitle>
                                                <TimelineDescription>{btnText.text}</TimelineDescription>
                                                <Alert title="Action Not reversible!" status={'warning'}>
                                                    {/* This action will delete some revision(s) in your local Aqua Chain */}
                                                    {updateMessage}
                                                </Alert>
                                                <Group>
                                                    <Button size={'xs'} borderRadius={'md'} colorPalette={btnText.color} onClick={handleMergeRevisions} loading={uploading}>{btnText.text}</Button>
                                                </Group>
                                            </TimelineContent>
                                        </TimelineItem>
                                    </>
                                ) : null
                            }

                            {
                                (
                                    (comparisonResult?.divergences?.length ?? 0) > 0
                                    && (comparisonResult?.existingRevisionsLength ?? 0) > (comparisonResult?.upcomingRevisionsLength ?? 0)
                                    // && isVerificationSuccessful // We won't reach here since by then the import button will be disabled
                                ) ? (
                                    <>
                                        <TimelineItem colorPalette={'gray'}>
                                            <TimelineConnector>
                                                <LuX />
                                            </TimelineConnector>
                                            <TimelineContent>
                                                <TimelineTitle textStyle="sm">Chains are Different</TimelineTitle>
                                                {/* <TimelineDescription>Chains have divergencies</TimelineDescription> */}
                                                <List.Root>
                                                    {
                                                        comparisonResult?.divergences.map((diff, i: number) => (
                                                            <List.Item key={`diff_${i}`} fontSize={'sm'}>
                                                                {
                                                                    diff.existingRevisionHash ? (
                                                                        <Group>
                                                                            <Text textDecoration={'line-through'} style={{ textDecorationColor: 'red', color: "red" }}>
                                                                                {formatCryptoAddress(diff.existingRevisionHash ?? "", 15, 4)}
                                                                            </Text>
                                                                            <LuChevronRight />
                                                                            <Text>
                                                                                {formatCryptoAddress(diff.upcomingRevisionHash ?? "", 15, 4, "Revision will be deleted")}
                                                                            </Text>
                                                                        </Group>
                                                                    ) : (
                                                                        <>
                                                                            {formatCryptoAddress(diff.upcomingRevisionHash ?? "", 20, 4)}
                                                                        </>
                                                                    )
                                                                }
                                                            </List.Item>
                                                        ))
                                                    }
                                                </List.Root>
                                            </TimelineContent>
                                        </TimelineItem>

                                        <TimelineItem colorPalette={'info'}>
                                            <TimelineConnector>
                                                <LuCheck />
                                            </TimelineConnector>
                                            <TimelineContent>
                                                <TimelineTitle textStyle="sm">Action</TimelineTitle>
                                                <TimelineDescription>{btnText.text}</TimelineDescription>
                                                <Alert title="Action Not reversible!" status={'warning'}>
                                                    {/* This action will delete some revision(s) in your local Aqua Chain */}
                                                    {updateMessage}
                                                </Alert>
                                                <Group>
                                                    <Button size={'xs'} borderRadius={'md'} colorPalette={btnText.color} onClick={handleMergeRevisions} loading={uploading}>{btnText.text}</Button>
                                                </Group>
                                            </TimelineContent>
                                        </TimelineItem>
                                    </>
                                ) : null
                            }

                            {
                                (
                                    (comparisonResult?.identical && (comparisonResult?.sameLength && comparisonResult?.divergences.length === 0))
                                    // || !isVerificationSuccessful // Import button will be disabled, no reaching this point
                                ) ? (
                                    <TimelineItem colorPalette={'blue'}>
                                        <TimelineConnector>
                                            <LuMinus />
                                        </TimelineConnector>
                                        <TimelineContent>
                                            <TimelineTitle textStyle="sm">Action</TimelineTitle>
                                            <TimelineDescription>No Action</TimelineDescription>
                                        </TimelineContent>
                                    </TimelineItem>
                                ) : null
                            }

                        </TimelineRoot>
                    </DialogBody>
                    <DialogFooter>
                        <DialogActionTrigger asChild>
                            <Button variant="outline" borderRadius={'md'}>Cancel</Button>
                        </DialogActionTrigger>
                        {/* <Button>Save</Button> */}
                    </DialogFooter>
                    <DialogCloseTrigger />
                </DialogContent>
            </DialogRoot>

        </Container >
    )
}
