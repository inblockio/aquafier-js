import { LuDelete, LuDownload, LuGlasses, LuLink2, LuShare2, LuSignature, LuX } from "react-icons/lu"
import { Button } from "./chakra-ui/button"
import { areArraysEqual, dummyCredential, ensureDomainUrlHasSSL, extractFileHash, fetchFiles, getAquaTreeFileObject, getFileName, getGenesisHash, isAquaTree, isWorkFlowData } from "../utils/functions"
import { useStore } from "zustand"
import appStore from "../store"
import axios from "axios"
import { ApiFileInfo } from "../models/FileInfo"
import { toaster } from "./chakra-ui/toaster"
import { useEffect, useState } from "react"
import { Alert } from "./chakra-ui/alert"
import { DialogActionTrigger, DialogBody, DialogCloseTrigger, DialogContent, DialogFooter, DialogHeader, DialogRoot, DialogTitle } from "./chakra-ui/dialog"
import { generateNonce } from "siwe"
import Loading from "react-loading"
import { Checkbox } from "./chakra-ui/checkbox"
import { Box, Center, Input, HStack, Text, VStack, Portal, Dialog, List, Loader, Stack, Group } from "@chakra-ui/react"
import { ClipboardButton, ClipboardIconButton, ClipboardInput, ClipboardLabel, ClipboardRoot } from "./chakra-ui/clipboard"
import { InputGroup } from "./chakra-ui/input-group"
import Aquafier, { AquaTree, AquaTreeWrapper, Revision, WitnessNetwork } from "aqua-js-sdk"
import { RevionOperation } from "../models/RevisionOperation"
import JSZip from "jszip";
import { AquaJsonInZip, AquaNameWithHash } from "../models/Aqua"





export const WitnessAquaChain = ({ apiFileInfo, backendUrl, nonce }: RevionOperation) => {
    const { files, setFiles, metamaskAddress, selectedFileInfo, setSelectedFileInfo, user_profile } = useStore(appStore)
    const [witnessing, setWitnessing] = useState(false)


    const witnessFileHandler = async () => {
        if (window.ethereum) {
            setWitnessing(true)
            try {
                const walletAddress = metamaskAddress;

                if (!walletAddress) {
                    setWitnessing(false)
                    toaster.create({
                        description: `Please connect your wallet to continue`,
                        type: "info"
                    })
                    return;
                }

                const aquafier = new Aquafier();

                const aquaTreeWrapper: AquaTreeWrapper = {
                    aquaTree: apiFileInfo.aquaTree!,
                    revision: "",
                    fileObject: undefined
                }
                let xCredentials = dummyCredential()
                xCredentials.witness_eth_network = user_profile?.witness_network ?? "sepolia"
                const result = await aquafier.witnessAquaTree(aquaTreeWrapper, "eth", xCredentials.witness_eth_network as WitnessNetwork, "metamask", xCredentials)
                if (result.isErr()) {
                    toaster.create({
                        description: `Error witnessing failed`,
                        type: "error"
                    })
                } else {

                    const revisionHashes = result.data.aquaTree?.revisions ? Object.keys(result.data.aquaTree.revisions) : [];

                    if (revisionHashes.length == 0) {
                        toaster.create({
                            description: `Error witnessing failed (aqua tree structure)`,
                            type: "error"
                        })
                    }
                    const lastHash = revisionHashes[revisionHashes.length - 1]
                    const lastRevision = result.data.aquaTree?.revisions[lastHash]
                    // send to server
                    const url = `${backendUrl}/tree`;

                    const response = await axios.post(url, {
                        "revision": lastRevision,
                        "revisionHash": lastHash,

                    }, {
                        headers: {
                            "nonce": nonce
                        }
                    });

                    if (response.status === 200 || response.status === 201) {
                        //  console.log("update state ...")
                        const newFiles: ApiFileInfo[] = [];
                        const keysPar = Object.keys(apiFileInfo.aquaTree!.revisions!)
                        files.forEach((item) => {
                            const keys = Object.keys(item.aquaTree!.revisions!)
                            if (areArraysEqual(keys, keysPar)) {
                                newFiles.push({
                                    ...apiFileInfo,
                                    aquaTree: result.data.aquaTree!,
                                })
                            } else {
                                newFiles.push(item)
                            }
                        })
                        let _selectFileInfo = selectedFileInfo!!
                        _selectFileInfo.aquaTree = result.data.aquaTree!
                        setSelectedFileInfo(_selectFileInfo)
                        setFiles(newFiles)
                    }

                    toaster.create({
                        description: `Witnessing successfull`,
                        type: "success"
                    })
                }

                setWitnessing(false)

            } catch (error) {
                //  console.log("Error  ", error)
                setWitnessing(false)
                toaster.create({
                    description: `Error during witnessing`,
                    type: "error"
                })
            }
        } else {
            setWitnessing(false)
            toaster.create({
                description: `MetaMask is not installed`,
                type: "info"
            })
        }
    };


    return (
        <>

            <Button size={'xs'} w={'100px'} onClick={witnessFileHandler} loading={witnessing}>
                <LuGlasses />
                Witness
            </Button>
        </>
    )
}


export const SignAquaChain = ({ apiFileInfo, backendUrl, nonce }: RevionOperation) => {
    const { files, setFiles, setSelectedFileInfo, selectedFileInfo, user_profile } = useStore(appStore)
    const [signing, setSigning] = useState(false)

    const signFileHandler = async () => {
        setSigning(true)
        if (window.ethereum) {
            try {

                const aquafier = new Aquafier();

                const aquaTreeWrapper: AquaTreeWrapper = {
                    aquaTree: apiFileInfo.aquaTree!,
                    revision: "",
                    fileObject: undefined
                }

                let xCredentials = dummyCredential()
                xCredentials.witness_eth_network = user_profile?.witness_network ?? "sepolia"


                const result = await aquafier.signAquaTree(aquaTreeWrapper, "metamask", xCredentials)
                if (result.isErr()) {
                    toaster.create({
                        description: `Error signing failed`,
                        type: "error"
                    })
                } else {
                    const revisionHashes = result.data.aquaTree?.revisions ? Object.keys(result.data.aquaTree.revisions) : [];

                    if (revisionHashes.length == 0) {
                        toaster.create({
                            description: `Error signing failed (aqua tree structure)`,
                            type: "error"
                        })
                        return
                    }
                    const lastHash = revisionHashes[revisionHashes.length - 1]
                    const lastRevision = result.data.aquaTree?.revisions[lastHash]
                    // send to server
                    const url = `${backendUrl}/tree`;

                    const response = await axios.post(url, {
                        "revision": lastRevision,
                        "revisionHash": lastHash,

                    }, {
                        headers: {
                            "nonce": nonce
                        }
                    });

                    if (response.status === 200 || response.status === 201) {
                        if (response.data.data) {

                            let newFiles: ApiFileInfo[] = response.data.data

                            let data = {
                                ...selectedFileInfo!!,
                                aquaTree: result.data.aquaTree!!
                            }
                            if (data) {
                                setSelectedFileInfo(data)
                            }
                            setFiles(newFiles)

                        } else {
                            //  console.log("update state ...")
                            const newFiles: ApiFileInfo[] = [];
                            const keysPar = Object.keys(apiFileInfo.aquaTree!.revisions!)
                            files.forEach((item) => {
                                const keys = Object.keys(item.aquaTree!.revisions!)
                                if (areArraysEqual(keys, keysPar)) {
                                    newFiles.push({
                                        ...apiFileInfo,
                                        aquaTree: result.data.aquaTree!,
                                    })
                                } else {
                                    newFiles.push(item)
                                }
                            })
                            let _selectFileInfo = selectedFileInfo!!
                            _selectFileInfo.aquaTree = result.data.aquaTree!
                            setSelectedFileInfo(_selectFileInfo)
                            setFiles(newFiles)
                        }
                    }

                    toaster.create({
                        description: `Signing successfull`,
                        type: "success"
                    })
                }

                setSigning(false)
            } catch (error) {
                console.error("An Error", error)
                setSigning(false)
                toaster.create({
                    description: `Error during signing`,
                    type: "error"
                })
            }
        } else {
            setSigning(false)
            toaster.create({
                description: `MetaMask is not installed`,
                type: "info"
            })
        }
    };
    return (
        <Button size={'xs'} colorPalette={'blue'} variant={'subtle'} w={'100px'} onClick={signFileHandler} loading={signing}>
            <LuSignature />
            Sign
        </Button>
    )


}


export const DeleteAquaChain = ({ apiFileInfo, backendUrl, nonce }: RevionOperation) => {
    const { files, setFiles, session, backend_url } = useStore(appStore)
    const [deleting, setDeleting] = useState(false)
    const [open, setOpen] = useState(false)
    const [aquaTreesAffected, setAquaTreesAffected] = useState<ApiFileInfo[]>([])

    const deleteFileApi = async () => {
        try {
            const allRevisionHashes = Object.keys(apiFileInfo.aquaTree!.revisions!);
            const lastRevisionHash = allRevisionHashes[allRevisionHashes.length - 1]
            const url = `${backendUrl}/explorer_delete_file`
            const response = await axios.post(url, {
                "revisionHash": lastRevisionHash
            }, {
                headers: {
                    'nonce': nonce
                }
            });

            if (response.status === 200) {
                // //  console.log("update state ...")
                // const newFiles: ApiFileInfo[] = [];
                // const keysPar = Object.keys(apiFileInfo.aquaTree!.revisions!)
                // files.forEach((item) => {
                //     const keys = Object.keys(item.aquaTree!.revisions!)
                //     if (areArraysEqual(keys, keysPar)) {
                //         //  console.log("ignore revision files ...")
                //     } else {
                //         newFiles.push(item)
                //     }
                // })

                // setFiles(newFiles)
                toaster.create({
                    description: "File deleted successfully",
                    type: "success"
                })
                await refetchAllUserFiles()
            }
        } catch (e) {
            //  console.log(`Error ${e}`)
            toaster.create({
                description: "File deletion error",
                type: "error"
            })
        }

        setDeleting(false)

    }

    const refetchAllUserFiles = async () => {

        // refetch all the files to enure the front end  state is the same as the backend 
        try {
            const files = await fetchFiles(session!.address!, `${backend_url}/explorer_files`, session!.nonce);
            setFiles(files);
        } catch (e) {
            //  console.log(`Error ${e}`)
            toaster.create({
                description: "Error updating files",
                type: "error"
            })
            document.location.reload()
        }
    }
    const deleteFileAction = async () => {
        setDeleting(true)

        let allFilesAffected: ApiFileInfo[] = []
        let genesisOfFileBeingDeleted = getGenesisHash(apiFileInfo.aquaTree!)
        let fileNameBeingDeleted = getFileName(apiFileInfo.aquaTree!)
        //check if the fileis linked to any aqua chain by using the file index of an aqua tree
        for (let anAquaTree of files) {
            // skip the current file beind delete
            let genesisHash = getGenesisHash(anAquaTree.aquaTree!)
            if (genesisHash == genesisOfFileBeingDeleted) {
                console.log(`skipping  ${fileNameBeingDeleted} the file is being deleted`)
            } else {
                let indexValues = Object.values(anAquaTree.aquaTree!.file_index)
                for (let fileName of indexValues) {
                    if (fileNameBeingDeleted == fileName) {
                        allFilesAffected.push(anAquaTree)
                    }
                }
            }
        }

        if (allFilesAffected.length == 0) {
            await deleteFileApi()
        } else {
            setAquaTreesAffected(allFilesAffected)
            setOpen(true)
        }


        setDeleting(false)
    }



    return (
        <>
            <Button size={'xs'} colorPalette={'red'} variant={'subtle'} w={'100px'} onClick={() => {
                deleteFileAction()
            }} loading={deleting}>
                <LuDelete />
                Delete
            </Button>

            <Dialog.Root lazyMount open={open} onOpenChange={(e) => {
                setOpen(e.open)
            }}>
                {/* <Dialog.Trigger asChild>
        <Button variant="outline">Open</Button>
      </Dialog.Trigger> */}
                <Portal>
                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content>
                            <Dialog.Header>
                                <Dialog.Title> This action will corrupt your some file(s)</Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Body>
                                <Text>The following aqua trees will become corrupt, as they reference the file you are about to delete</Text>
                                <List.Root as="ol">

                                    {aquaTreesAffected.map((apiFileInfoItem) => {
                                        return <List.Item>
                                            {getFileName(apiFileInfoItem.aquaTree!) ?? "--error--"}
                                        </List.Item>
                                    })}
                                </List.Root>

                            </Dialog.Body>
                            {/* 
                                <Dialog.ActionTrigger asChild>
                                    <Button variant="outline">Cancel</Button>
                                </Dialog.ActionTrigger>
                                <Button>Save</Button>
                            </Dialog.Footer> */}
                            <Dialog.Footer>

                                <Dialog.CloseTrigger asChild>
                                    <Button onClick={() => {
                                        deleteFileApi()
                                    }} size="sm" colorPalette={'red'} >
                                        Proceed to delete &nbsp;<LuX />
                                    </Button>
                                </Dialog.CloseTrigger>
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>
        </>
    )
}

export const DownloadAquaChain = ({ file }: { file: ApiFileInfo }) => {
    const { session } = useStore(appStore)
    const [downloading, setDownloading] = useState(false)


    const downloadLinkAquaJson = async () => {
        const zip = new JSZip();
        let aquafier = new Aquafier();
        let mainAquaFileName = "";
        let mainAquaHash = "";
        // fetch the genesis 
        let revisionHashes = Object.keys(file.aquaTree!.revisions!)
        for (let revisionHash of revisionHashes) {
            let revisionData = file.aquaTree!.revisions![revisionHash];
            if (revisionData.previous_verification_hash == null || revisionData.previous_verification_hash == "") {
                mainAquaHash = revisionHash;
                break;
            }
        }
        mainAquaFileName = file.aquaTree!.file_index[mainAquaHash];

        zip.file(`${mainAquaFileName}.aqua.json`, JSON.stringify(file.aquaTree));

        let nameWithHashes: Array<AquaNameWithHash> = []
        for (let fileObj of file.fileObject) {
            if (typeof fileObj.fileContent === 'string' && fileObj.fileContent.startsWith('http')) {
                try {
                    let actualUrlToFetch = ensureDomainUrlHasSSL(fileObj.fileContent)

                    // Fetch the file from the URL
                    const response = await fetch(actualUrlToFetch, {
                        method: 'GET',
                        headers: {
                            'Nonce': session?.nonce ?? "--error--" // Add the nonce directly as a custom header if needed
                        }
                    });
                    const blob = await response.blob();

                    let hashData = extractFileHash(fileObj.fileContent)
                    if (hashData == undefined) {
                        hashData = aquafier.getFileHash(blob.toString())
                    }

                    nameWithHashes.push({
                        name: fileObj.fileName,
                        hash: hashData
                    })

                    zip.file(fileObj.fileName, blob, { binary: true })
                } catch (error) {
                    console.error(`Error downloading ${fileObj.fileName}:`, error);
                    toaster.create({
                        description: `Error downloading ${fileObj.fileName}: ${error}`,
                        type: "error"
                    });
                }
            } else {
                // Check if the file is an AquaTree (likely a JSON file) or a regular text file
                if (isAquaTree(fileObj.fileContent)) {
                    // It's an AquaTree, so stringify it as JSON
                    zip.file(fileObj.fileName, JSON.stringify(fileObj.fileContent as AquaTree));
                } else if (typeof fileObj.fileContent === 'string') {
                    // It's a plain text file, so add it directly without JSON.stringify
                    zip.file(fileObj.fileName, fileObj.fileContent);
                } else {
                    // For other types, use JSON.stringify (objects, etc.)
                    zip.file(fileObj.fileName, JSON.stringify(fileObj.fileContent));
                }
            }
        }

        //create aqua.json
        let aquaObject: AquaJsonInZip = {
            'genesis': mainAquaFileName,
            'name_with_hash': nameWithHashes
        };
        zip.file('aqua.json', JSON.stringify(aquaObject))

        // Generate the zip file
        zip.generateAsync({ type: "blob" }).then((blob) => {
            // Create a download link
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "aqua_tree.zip";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    const downloadSimpleAquaJson = async () => {

        // Convert the PageData object to a formatted JSON string
        const jsonString = JSON.stringify(file.aquaTree, null, 2);

        // Create a Blob from the JSON string
        const blob = new Blob([jsonString], { type: 'application/json' });

        // Create a URL for the Blob
        const url = URL.createObjectURL(blob);

        // Create a temporary anchor element and trigger the download
        const a = document.createElement('a');
        a.href = url;
        a.download = `${file.fileObject[0].fileName}.aqua.json`;
        document.body.appendChild(a);
        a.click();

        // Clean up
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toaster.create({
            description: `Aqua Chain Downloaded successfully`,
            type: "success"
        })



        // Loop through each file object and download the content
        for (const fileObj of file.fileObject) {
            // Check if fileContent is a string (URL)
            if (typeof fileObj.fileContent === 'string' && fileObj.fileContent.startsWith('http')) {
                try {
                    let actualUrlToFetch = ensureDomainUrlHasSSL(fileObj.fileContent)



                    // Fetch the file from the URL
                    const response = await fetch(actualUrlToFetch, {
                        method: 'GET',
                        headers: {
                            'Nonce': session?.nonce ?? "--error--" // Add the nonce directly as a custom header if needed
                        }
                    });
                    const blob = await response.blob();

                    // Create URL from blob
                    const url = URL.createObjectURL(blob);

                    // Create temporary anchor and trigger download
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileObj.fileName;
                    document.body.appendChild(a);
                    a.click();

                    // Clean up
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                } catch (error) {
                    console.error(`Error downloading ${fileObj.fileName}:`, error);
                    toaster.create({
                        description: `Error downloading ${fileObj.fileName}: ${error}`,
                        type: "error"
                    });
                }
            }
        }

    }
    const downloadAquaJson = async () => {
        try {


            setDownloading(true)
            let containsLink = false;
            //check if it contains a link revision
            let allHashes = Object.keys(file.aquaTree!.revisions!)
            for (let hashItem of allHashes) {
                let revision: Revision = file.aquaTree!.revisions![hashItem];
                if (revision.revision_type == "link") {
                    containsLink = true;
                    break
                }
            }

            if (containsLink) {
                await downloadLinkAquaJson()
            } else {
                await downloadSimpleAquaJson()
            }


            toaster.create({
                description: `Files downloaded successfully`,
                type: "success"
            });
            setDownloading(false)
        } catch (error) {
            toaster.create({
                description: `Error downloading JSON: ${error}`,
                type: "error"
            })

            setDownloading(false)
        }

    }



    return (
        <Button size={'xs'} colorPalette={'purple'} variant={'subtle'} w={'100px'} onClick={downloadAquaJson} loading={downloading}>
            <LuDownload />
            Download
        </Button>
    )
}

interface IShareButton {
    item: ApiFileInfo
    nonce: string

}

export const ShareButton = ({ item, nonce }: IShareButton) => {
    const { backend_url } = useStore(appStore)
    const [isOpen, setIsOpen] = useState(false)
    const [sharing, setSharing] = useState(false)
    const [fileName, setFileName] = useState("")
    const [shared, setShared] = useState<string | null>(null)

    const [recipientType, setRecipientType] = useState<"0xfabacc150f2a0000000000000000000000000000" | "specific">("0xfabacc150f2a0000000000000000000000000000")
    const [walletAddress, setWalletAddress] = useState("")
    const [optionType, setOptionType] = useState<"latest" | "current">("latest")

    // const hashToShare = optionType === "latest" ? latest : item.aquaTree!.currentHash
    const recipient = recipientType === "0xfabacc150f2a0000000000000000000000000000" ? "0xfabacc150f2a0000000000000000000000000000" : walletAddress

    useEffect(() => {

        if (item) {
            const name = item.fileObject[0].fileName;
            setFileName(name)
        }
    })



    const handleShare = async () => {

        if (recipientType == "specific" && (walletAddress == "")) {
            toaster.create({
                description: `If recipient is specific a wallet address has to be sepcified.`,
                type: "error"
            })
            return
        }
        setSharing(true)
        // let id_to_share = id;
        const unique_identifier = `${Date.now()}_${generateNonce()}`

        const url = `${backend_url}/share_data`;
        // const formData = new URLSearchParams();
        // formData.append('file_id', file_id.toString());
        // formData.append('filename', filename ?? "");
        // formData.append('identifier', unique_identifier);

        // 
        const allHashes = Object.keys(item.aquaTree!.revisions!);
        const latest = allHashes[allHashes.length - 1]
        let recepientWalletData = recipient;
        if (recipient == "") {
            recepientWalletData = "0xfabacc150f2a0000000000000000000000000000"
        }

        const response = await axios.post(url, {
            "latest": latest,
            "hash": unique_identifier,
            "recipient": recepientWalletData,
            "option": optionType
        }, {
            headers: {
                'nonce': nonce
            }
        });

        //  console.log(response)

        if (response.status === 200) {
            setSharing(false)
            const domain = window.location.origin;
            setShared(`${domain}/share/${unique_identifier}`)
        }
        else {
            toaster.create({
                description: "Error sharing",
                type: "error"
            })
        }

    }

    // const handleRecipientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    //     setRecipientType(e.target.checked ? "specific" : "0xfabacc150f2a0000000000000000000000000000")
    // }

    // const handleVersionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    //     setOptionType(e.target.checked ? "current" : "latest")
    // }

    return (
        <>
            <Button size={'xs'} colorPalette={'orange'} variant={'subtle'} w={'100px'} onClick={() => setIsOpen(true)}>
                <LuShare2 />
                Share
            </Button>
            <DialogRoot open={isOpen} onOpenChange={e => setIsOpen(e.open)}>
                {/* <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                        Open Dialog
                    </Button>
                </DialogTrigger> */}
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{`Sharing ${fileName}`}</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        <VStack textAlign={'start'}>
                            <p>
                                {`You are about to share ${fileName}. Once a file is shared, don't delete it otherwise it will be broken if one tries to import it.`}
                            </p>


                            {/* Recipient Toggle */}
                            <Box width="100%">
                                <HStack justifyContent="space-between" width="100%">
                                    <Text>Share with specific wallet</Text>
                                    <Checkbox
                                        checked={recipientType === "specific"}
                                        onCheckedChange={(changes) => setRecipientType(changes.checked ? "specific" : "0xfabacc150f2a0000000000000000000000000000")}
                                    />
                                </HStack>

                                {recipientType === "specific" && (
                                    <Input
                                        mt={2}
                                        placeholder="Enter wallet address"
                                        value={walletAddress}
                                        onChange={(e) => setWalletAddress(e.target.value)}
                                    />
                                )}
                            </Box>
                            {/* Custom Divider */}
                            <Box
                                width="100%"
                                height="1px"
                                bg="gray.200"
                                my={3}
                            />

                            {/* Version Toggle */}
                            <Box width="100%">
                                <Text>Would the recipient to get the the  Aqua Tree as is Or receive the tree with any new revisins you will add </Text>

                                <HStack justifyContent="space-between" width="80%" style={{ marginLeft: "30px", marginTop: "10px" }}>
                                    <Text>1. Share latest revision in tree</Text>
                                    <Checkbox
                                        checked={optionType === "latest"}
                                        onCheckedChange={(e) => setOptionType(e.checked ? "latest" : "current")}
                                    />
                                </HStack>
                                <HStack justifyContent="space-between" width="80%" style={{ marginLeft: "30px", marginTop: "10px" }}>
                                    <Text>2. share current  tree</Text>
                                    <Checkbox
                                        checked={optionType === "current"}
                                        onCheckedChange={(e) => setOptionType(e.checked ? "current" : "latest")}
                                    />
                                </HStack>
                            </Box>



                            {
                                sharing ?
                                    <Center>
                                        <Loading />
                                    </Center>
                                    : null
                            }
                            {
                                shared ?
                                    <Box w={'100%'}>
                                        <ClipboardRoot value={shared}>
                                            <ClipboardLabel>Shared Document Link</ClipboardLabel>
                                            <InputGroup width="full" endElement={<ClipboardIconButton me="-2" />}>
                                                <ClipboardInput />
                                            </InputGroup>
                                            <Text fontSize={'sm'} mt={'2'}>Copy the link above and share</Text>
                                        </ClipboardRoot>
                                    </Box>
                                    : null
                            }
                        </VStack>
                    </DialogBody>
                    <DialogFooter>
                        <DialogActionTrigger asChild>
                            <Button variant="outline" borderRadius={'md'}>Cancel</Button>
                        </DialogActionTrigger>
                        {
                            shared ? (
                                <ClipboardRoot value={shared}>
                                    <ClipboardButton borderRadius={'md'} variant={'solid'} />
                                </ClipboardRoot>
                            ) : (
                                <Button onClick={handleShare} borderRadius={'md'}>Share</Button>
                            )
                        }
                    </DialogFooter>
                    <DialogCloseTrigger />
                </DialogContent>
            </DialogRoot>
        </>
    )
}


export const LinkButton = ({ item, nonce }: IShareButton) => {
    const { backend_url, setFiles, files, session, systemFileInfo } = useStore(appStore)
    const [isOpen, setIsOpen] = useState(false)
    const [linking, setLinking] = useState(false)
    const [linkItem, setLinkItem] = useState<ApiFileInfo | null>(null)

    const cancelClick = () => {
        setLinkItem(null)
        setIsOpen(false)
    }
    const handleLink = async () => {
        if (linkItem == null) {
            toaster.create({
                description: `Please select an AquaTree to link`,
                type: "error"
            });
            return;
        }
        try {
            let aquafier = new Aquafier();
            setLinking(true)
            let aquaTreeWrapper: AquaTreeWrapper = {
                aquaTree: item.aquaTree!,
                revision: "",
                fileObject: item.fileObject[0]
            };
            let linkAquaTreeWrapper: AquaTreeWrapper = {
                aquaTree: linkItem!.aquaTree!,
                revision: "",
                fileObject: linkItem!.fileObject[0]
            };
            let result = await aquafier.linkAquaTree(aquaTreeWrapper, linkAquaTreeWrapper)

            if (result.isErr()) {
                toaster.create({
                    description: `An error occurred when linking`,
                    type: "error"
                });
                return;
            }

            let newAquaTree = result.data.aquaTree!
            let revisionHashes = Object.keys(newAquaTree.revisions)
            const lastHash = revisionHashes[revisionHashes.length - 1]
            const lastRevision = result.data.aquaTree?.revisions[lastHash]
            // send to server
            const url = `${backend_url}/tree`;

            const response = await axios.post(url, {
                "revision": lastRevision,
                "revisionHash": lastHash,

            }, {
                headers: {
                    "nonce": nonce
                }
            });

            if (response.status === 200 || response.status === 201) {


                await refetchAllUserFiles();

            }

            toaster.create({
                description: `Linking successfull`,
                type: "success"
            })
            setLinkItem(null)
            setIsOpen(false)

        } catch (error) {
            toaster.create({
                description: `An error occurred`,
                type: "error"
            });
        }
        setLinking(false)
    }


    const refetchAllUserFiles = async () => {

        // refetch all the files to enure the front end  state is the same as the backend 
        try {
            const files = await fetchFiles(session!.address!, `${backend_url}/explorer_files`, session!.nonce);
            setFiles(files);
        } catch (e) {
            //  console.log(`Error ${e}`)
            toaster.create({
                description: "Error updating files",
                type: "error"
            })
            document.location.reload()
        }
    }
    return (
        <>
            <Button size={'xs'} colorPalette={'yellow'} variant={'subtle'} w={'100px'} onClick={() => setIsOpen(true)}>
                <LuLink2 />
                Link
            </Button>

            <DialogRoot open={isOpen} onOpenChange={e => setIsOpen(e.open)}>
                {/* <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                        Open Dialog
                    </Button>
                </DialogTrigger> */}
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{`Link ${item.fileObject[0].fileName} To another file (Aquatree)`}</DialogTitle>
                    </DialogHeader>
                    <DialogBody>

                        {files?.length <= 1 ? <VStack>
                            <Alert status="warning" title={"For linking to work you need multiple files, curently you only have " + files?.length} />
                        </VStack> :
                            <Stack textAlign={'start'}>
                                <Text>
                                    {`You are about to link ${item.fileObject[0].fileName}. Once a file is linked, don't delete it otherwise it will be broken if one tries to use the Aqua tree.`}
                                </Text>
                                <Text>
                                    Select the file you want to link to.
                                </Text>



                                {/* Custom Divider */}
                                <Box
                                    width="100%"
                                    height="1px"
                                    bg="gray.200"
                                    my={3}
                                />


                                {
                                    files?.map((itemLoop: ApiFileInfo, index: number) => {
                                        const keys = Object.keys(itemLoop.aquaTree!.revisions!)
                                        const keysPar = Object.keys(item.aquaTree!.revisions!)
                                        const res = areArraysEqual(keys, keysPar)
                                        const { isWorkFlow } = isWorkFlowData(itemLoop.aquaTree!, systemFileInfo.map((e) => getFileName(e.aquaTree!!)))
                                        //  console.log(`res ${res} ${JSON.stringify(itemLoop.fileObject)}`)
                                        if (res) {
                                            return <div key={index}> </div>
                                        }
                                        if (isWorkFlow) {
                                            let fileName = getFileName(itemLoop.aquaTree!!)
                                            return <div key={index}>
                                                <Text>
                                                    {index + 1}. {`${fileName} - This is a workflow file. You can't link to it.`}
                                                </Text>
                                            </div>
                                        }

                                        let fileObject = getAquaTreeFileObject(itemLoop)

                                        if (fileObject) {

                                            return <Group key={index}>
                                                <Text>{index + 1}.</Text>
                                                <Checkbox
                                                    aria-label="Select File"
                                                    checked={linkItem == null ? false :
                                                        Object.keys(linkItem?.aquaTree?.revisions!)[0] === Object.keys(itemLoop.aquaTree?.revisions!)[0]}
                                                    onCheckedChange={(changes) => {
                                                        if (changes.checked) {
                                                            setLinkItem(itemLoop)
                                                        } else {
                                                            setLinkItem(null)
                                                        }

                                                    }}
                                                    value={index.toString()}
                                                >
                                                    {itemLoop.fileObject[0].fileName}
                                                </Checkbox>
                                            </Group>
                                        } else {
                                            return <Text>Error</Text>
                                        }
                                    })
                                }

                                {
                                    linking ?
                                        <Center>
                                            <Loader />
                                        </Center>
                                        : null
                                }

                            </Stack>
                        }
                    </DialogBody>
                    <DialogFooter>
                        <DialogActionTrigger asChild>
                            <Button variant="outline" onClick={cancelClick} borderRadius={'md'}>Cancel</Button>
                        </DialogActionTrigger>


                        {files?.length <= 1 ? <></>
                            : <>
                                <Button onClick={handleLink} borderRadius={'md'}>Link</Button>

                            </>}
                    </DialogFooter>
                    <DialogCloseTrigger />
                </DialogContent>
            </DialogRoot>

        </>
    )
}
