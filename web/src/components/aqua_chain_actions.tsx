import { LuDelete, LuDownload, LuGlasses, LuShare2, LuSignature } from "react-icons/lu"
import { Button } from "./ui/button"
import { areArraysEqual, dummyCredential } from "../utils/functions"
import { useStore } from "zustand"
import appStore from "../store"
import axios from "axios"
import { ApiFileInfo } from "../models/FileInfo"
import { toaster } from "./ui/toaster"
import { useEffect, useState } from "react"

import { DialogActionTrigger, DialogBody, DialogCloseTrigger, DialogContent, DialogFooter, DialogHeader, DialogRoot, DialogTitle } from "./ui/dialog"
import { generateNonce } from "siwe"
import Loading from "react-loading"
import { Checkbox } from "../components/ui/checkbox"
import { Box, Center, Input, HStack, Text, VStack } from "@chakra-ui/react"
import { ClipboardButton, ClipboardIconButton, ClipboardInput, ClipboardLabel, ClipboardRoot } from "./ui/clipboard"
import { InputGroup } from "./ui/input-group"
import Aquafier, { AquaTreeWrapper } from "aqua-js-sdk"
import { RevionOperation } from "../models/RevisionOperation"

// async function storeWitnessTx(file_id: number, filename: string, txhash: string, ownerAddress: string, network: string, files: ApiFileInfo[], setFiles: any, backend_url: string) {

//     const formData = new URLSearchParams();

//     formData.append('file_id', file_id.toString());
//     formData.append('filename', filename);
//     formData.append('tx_hash', txhash);
//     formData.append('wallet_address', ownerAddress);
//     formData.append('network', network);

//     const url = `${backend_url}/explorer_witness_file`

//     const response = await axios.post(url, formData, {
//         headers: {
//             'Content-Type': 'application/x-www-form-urlencoded'
//         }
//     })

//     const res = await response.data;
//     // let logs: Array<string> = res.logs
//     // // logs.forEach((item) => {
//     // //     console.log("**>" + item + "\n.")
//     // // })

//     if (response.status === 200) {
//         console.log(res)
//         const resp: ApiFileInfo = res.file
//         const array: ApiFileInfo[] = [];
//         for (let index = 0; index < files.length; index++) {
//             const element = files[index];
//             if (element.id === file_id) {
//                 array.push(resp)
//             } else {
//                 array.push(element)
//             }
//         }
//         setFiles(array)
//         toaster.create({
//             description: "Witnessing successful",
//             type: "success"
//         })
//     }

// }




export const WitnessAquaChain = ({ apiFileInfo, backendUrl, nonce }: RevionOperation) => {
    const { files, setFiles, metamaskAddress } = useStore(appStore)
    const [witnessing, setWitnessing] = useState(false)


    const witnessFileHandler = async () => {
        // const witness_event_verification_hash = sha3.sha3_512("a69f73cca23a9ac5c8b567dc185a756e97c982164fe25859e0d1dcc1475c80a615b2123af1f5f94c11e3e9402c3ac558f500199d95b6d3e301758586281dcd26" + lastRevisionVerificationHash)
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
                const result = await aquafier.witnessAquaTree(aquaTreeWrapper, "eth", "sepolia", "metamask", dummyCredential())
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
                        console.log("update state ...")
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

                        setFiles(newFiles)
                    }

                    toaster.create({
                        description: `Witnessing successfull`,
                        type: "success"
                    })
                }

                setWitnessing(false)

            } catch (error) {
                console.log("Error  ", error)
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

            <Button size={'xs'} w={'80px'} onClick={witnessFileHandler} loading={witnessing}>
                <LuGlasses />
                Witness
            </Button>
        </>
    )
}

export const SignAquaChain = ({ apiFileInfo, backendUrl, nonce }: RevionOperation) => {
    const { files, setFiles } = useStore(appStore)
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
                const result = await aquafier.signAquaTree(aquaTreeWrapper, "metamask", dummyCredential())
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
                        if (response.status === 200 || response.status === 201) {
                            console.log("update state ...")
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
        <Button size={'xs'} colorPalette={'blue'} variant={'subtle'} w={'80px'} onClick={signFileHandler} loading={signing}>
            <LuSignature />
            Sign
        </Button>
    )


}


export const DeleteAquaChain = ({ apiFileInfo, backendUrl, nonce }: RevionOperation) => {
    const { files, setFiles } = useStore(appStore)
    const [deleting, setDeleting] = useState(false)

    const deleteFile = async () => {
        setDeleting(true)

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
                console.log("update state ...")
                const newFiles: ApiFileInfo[] = [];
                const keysPar = Object.keys(apiFileInfo.aquaTree!.revisions!)
                files.forEach((item) => {
                    const keys = Object.keys(item.aquaTree!.revisions!)
                    if (areArraysEqual(keys, keysPar)) {
                        console.log("ignore revision files ...")
                    } else {
                        newFiles.push(item)
                    }
                })

                setFiles(newFiles)
                toaster.create({
                    description: "File deleted successfully",
                    type: "success"
                })
            }
        } catch (e) {
            console.log(`Error ${e}`)
            toaster.create({
                description: "File deletion error",
                type: "error"
            })
        }
        setDeleting(false)
    }



    return (
        <Button size={'xs'} colorPalette={'red'} variant={'subtle'} w={'80px'} onClick={deleteFile} loading={deleting}>
            <LuDelete />
            Delete
        </Button>
    )
}

export const DownloadAquaChain = ({ file }: { file: ApiFileInfo }) => {
    const [downloading, setDownloading] = useState(false)

    const downloadAquaJson = async () => {
        try {
            setDownloading(true)

            // Convert the PageData object to a formatted JSON string
            const jsonString = JSON.stringify(file.aquaTree, null, 2);

            // Create a Blob from the JSON string
            const blob = new Blob([jsonString], { type: 'application/json' });

            // Create a URL for the Blob
            const url = URL.createObjectURL(blob);

            // Create a temporary anchor element and trigger the download
            const a = document.createElement('a');
            a.href = url;
            a.download = `${file.fileObject[0].fileName}-aqua.json`;
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
                        // Fetch the file from the URL
                        const response = await fetch(fileObj.fileContent);
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
        <Button size={'xs'} colorPalette={'blackAlpha'} variant={'subtle'} w={'168px'} onClick={downloadAquaJson} loading={downloading}>
            <LuDownload />
            Download Aqua-Chain
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

    const [recipientType, setRecipientType] = useState<"everyone" | "specific">("everyone")
    const [walletAddress, setWalletAddress] = useState("")
    const [optionType, setOptionType] = useState<"latest" | "current">("latest")

    // const hashToShare = optionType === "latest" ? latest : item.aquaTree!.currentHash
    const recipient = recipientType === "everyone" ? "everyone" : walletAddress

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
        const response = await axios.post(url, {
            "latest": latest,
            "hash": unique_identifier,
            "recipient": recipient,
            "option": "forward"
        }, {
            headers: {
                'nonce': nonce
            }
        });

        console.log(response)

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
    //     setRecipientType(e.target.checked ? "specific" : "everyone")
    // }

    // const handleVersionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    //     setOptionType(e.target.checked ? "current" : "latest")
    // }

    return (
        <>
            <Button size={'xs'} colorPalette={'orange'} variant={'subtle'} w={'168px'} onClick={() => setIsOpen(true)}>
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
                                        onCheckedChange={(changes) => setRecipientType(changes.checked ? "specific" : "everyone")}
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

                                <HStack justifyContent="space-between" width="80%" style={{marginLeft:"30px",  marginTop:"10px"}}>
                                    <Text>1. Share latest revision in tree</Text>
                                    <Checkbox
                                        checked={optionType === "latest"}
                                        onCheckedChange={(e) => setOptionType(e.checked ? "latest" : "current")}
                                    />
                                </HStack>
                                <HStack justifyContent="space-between" width="80%" style={{marginLeft:"30px", marginTop:"10px"}}>
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
