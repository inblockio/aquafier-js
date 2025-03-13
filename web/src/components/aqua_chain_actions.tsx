import { LuDelete, LuDownload, LuGlasses, LuShare2, LuSignature } from "react-icons/lu"
import { Button } from "./ui/button"
import { ethers } from "ethers"
import { areArraysEqual, dummyCredential, getCurrentNetwork, switchNetwork } from "../utils/functions"
import { ETH_CHAIN_ADDRESSES_MAP, ETH_CHAINID_MAP } from "../utils/constants"
import { useStore } from "zustand"
import appStore from "../store"
import axios, { AxiosError } from "axios"
import { ApiFileInfo } from "../models/FileInfo"
import { toaster } from "./ui/toaster"
import { useState } from "react"
import sha3 from 'js-sha3'
import { PageData } from "../models/PageData"
import { DialogActionTrigger, DialogBody, DialogCloseTrigger, DialogContent, DialogFooter, DialogHeader, DialogRoot, DialogTitle } from "./ui/dialog"
import { generateNonce } from "siwe"
import Loading from "react-loading"
import { Box, Center, Text, VStack } from "@chakra-ui/react"
import { ClipboardButton, ClipboardIconButton, ClipboardInput, ClipboardLabel, ClipboardRoot } from "./ui/clipboard"
import { InputGroup } from "./ui/input-group"
import Aquafier, { AquaTree, AquaTreeWrapper } from "aqua-js-sdk"
import { RevionOperation } from "../models/RevisionOperation"

async function storeWitnessTx(file_id: number, filename: string, txhash: string, ownerAddress: string, network: string, files: ApiFileInfo[], setFiles: any, backend_url: string) {

    const formData = new URLSearchParams();

    formData.append('file_id', file_id.toString());
    formData.append('filename', filename);
    formData.append('tx_hash', txhash);
    formData.append('wallet_address', ownerAddress);
    formData.append('network', network);

    const url = `${backend_url}/explorer_witness_file`

    const response = await axios.post(url, formData, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })

    const res = await response.data;
    // let logs: Array<string> = res.logs
    // // logs.forEach((item) => {
    // //     console.log("**>" + item + "\n.")
    // // })

    if (response.status === 200) {
        console.log(res)
        const resp: ApiFileInfo = res.file
        const array: ApiFileInfo[] = [];
        for (let index = 0; index < files.length; index++) {
            const element = files[index];
            if (element.id === file_id) {
                array.push(resp)
            } else {
                array.push(element)
            }
        }
        setFiles(array)
        toaster.create({
            description: "Witnessing successful",
            type: "success"
        })
    }

}




export const WitnessAquaChain = ({ apiFileInfo, backendUrl, nonce }: RevionOperation) => {
   const {  files, setFiles, metamaskAddress } = useStore(appStore)
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

            } catch (error: any) {
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
    const {  files, setFiles} = useStore(appStore)
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
        const formData = new URLSearchParams();
        formData.append('filename', filename);
        formData.append('file_id', file_id.toString());

        const url = `${backendUrl}/explorer_delete_file`
        const response = await axios.post(url, formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (response.status === 200) {
            throw Error("Fix me ....2")
            // let filesNew: Array<ApiFileInfo> = [];
            // for (let index = 0; index < files.length; index++) {
            //     const file = files[index];
            //     if (file.id != file_id) {
            //         filesNew.push(file)
            //     }
            // }
            // setFiles(filesNew);
            // toaster.create({
            //     description: "File deleted successfully",
            //     type: "success"
            // })
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


    const downloadAquaJson = () => {
        try {
            // Parse the page_data string to a PageData object
            const pageData: PageData = JSON.parse(file.page_data);

            for (const page of pageData.pages) {
                for (const revisionKey in page.revisions) {
                    const revision = page.revisions[revisionKey];

                    if (revision.witness && revision.witness.witness_event_transaction_hash) {
                        const hash = revision.witness.witness_event_transaction_hash;

                        // Prepend '0x' only if it doesn't already start with it
                        if (!hash.startsWith('0x')) {
                            revision.witness.witness_event_transaction_hash = `0x${hash}`;
                        }
                    }

                    // // Check if the revision has a witness and update witness_event_transaction_hash
                    // if (revision.witness && revision.witness.witness_event_transaction_hash) {

                    //     revision.witness.witness_event_transaction_hash = `0x${revision.witness.witness_event_transaction_hash}`;
                    // }
                }
            }

            // Convert the PageData object to a formatted JSON string
            const jsonString = JSON.stringify(pageData, null, 2);

            // Create a Blob from the JSON string
            const blob = new Blob([jsonString], { type: 'application/json' });

            // Create a URL for the Blob
            const url = URL.createObjectURL(blob);

            // Create a temporary anchor element and trigger the download
            const a = document.createElement('a');
            a.href = url;
            a.download = `${file.name}-aqua.json`;
            document.body.appendChild(a);
            a.click();

            // Clean up
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toaster.create({
                description: `Aqua Chain Downloaded successfully`,
                type: "success"
            })
        } catch (error) {
            toaster.create({
                description: `Error downloading JSON: ${error}`,
                type: "error"
            })
        }

    }

    return (
        <Button size={'xs'} colorPalette={'blackAlpha'} variant={'subtle'} w={'168px'} onClick={downloadAquaJson}>
            <LuDownload />
            Download Aqua-Chain
        </Button>
    )
}

interface IShareButton {
    id: number | null
    file_id: number
    filename: string | null
}

export const ShareButton = ({ filename, file_id }: IShareButton) => {
    const { backend_url } = useStore(appStore)
    const [isOpen, setIsOpen] = useState(false)
    const [sharing, setSharing] = useState(false)
    const [shared, setShared] = useState<string | null>(null)

    const handleShare = async () => {
        setSharing(true)
        // let id_to_share = id;
        const unique_identifier = `${Date.now()}_${generateNonce()}`

        const url = `${backend_url}/share_data`;
        const formData = new URLSearchParams();
        formData.append('file_id', file_id.toString());
        formData.append('filename', filename ?? "");
        formData.append('identifier', unique_identifier);

        const response = await axios.post(url, formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
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
                        <DialogTitle>{`Sharing ${filename}`}</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        <VStack textAlign={'start'}>
                            <p>
                                {`You are about to share ${filename}. Once a file is shared, don't delete it otherwise it will be broken if one tries to import it.`}
                            </p>
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
