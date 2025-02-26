import { LuDelete, LuDownload, LuGlasses, LuShare2, LuSignature } from "react-icons/lu"
import { Button } from "./ui/button"
import { ethers } from "ethers"
import { getCurrentNetwork, switchNetwork } from "../utils/functions"
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


interface ISigningAndWitnessing {
    file_id: number,
    filename: string,
    lastRevisionVerificationHash?: string,
    backend_url: string
}

export const WitnessAquaChain = ({ file_id, filename, lastRevisionVerificationHash }: ISigningAndWitnessing) => {
    const { user_profile, files, setFiles, metamaskAddress, backend_url } = useStore(appStore)
    const [witnessing, setWitnessing] = useState(false)


    const witnessFileHandler = async () => {
        const witness_event_verification_hash = sha3.sha3_512("a69f73cca23a9ac5c8b567dc185a756e97c982164fe25859e0d1dcc1475c80a615b2123af1f5f94c11e3e9402c3ac558f500199d95b6d3e301758586281dcd26" + lastRevisionVerificationHash)
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

                const networkId = await getCurrentNetwork()
                const currentChainId = ETH_CHAINID_MAP[user_profile.network]
                if (networkId !== currentChainId) {
                    await switchNetwork(currentChainId)
                }
                const contract_address = ETH_CHAIN_ADDRESSES_MAP[user_profile.network]
                const network = user_profile.network

                const params = [
                    {
                        from: walletAddress,
                        // to: SEPOLIA_SMART_CONTRACT_ADDRESS,
                        to: contract_address,
                        // gas and gasPrice are optional values which are
                        // automatically set by MetaMask.
                        // gas: '0x7cc0', // 30400
                        // gasPrice: '0x328400000',
                        data: '0x9cef4ea1' + witness_event_verification_hash,
                    },
                ]
                window.ethereum
                    .request({
                        method: 'eth_sendTransaction',
                        params: params,
                    })
                    .then(txhash => {
                        storeWitnessTx(file_id, filename, txhash, ethers.getAddress(walletAddress), network, files, setFiles, backend_url).then(() => {

                        }).catch(() => {

                        })
                    })
                    .catch((error: AxiosError) => {
                        if (error?.message) {
                            toaster.create({
                                description: error.message,
                                type: "error"
                            })
                        }
                    }).finally(() => {
                        setWitnessing(false)
                    })

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

export const SignAquaChain = ({ file_id, filename, lastRevisionVerificationHash }: ISigningAndWitnessing) => {
    const { user_profile, files, setFiles, metamaskAddress, backend_url } = useStore(appStore)
    const [signing, setSigning] = useState(false)

    const signFileHandler = async () => {
        setSigning(true)
        if (window.ethereum) {
            try {
                // We query the wallet address from storage
                const walletAddress = metamaskAddress;

                if (!walletAddress) {
                    setSigning(false)
                    toaster.create({
                        description: `Please connect your wallet to continue`,
                        type: "info"
                    })
                    return;
                }

                // Message to sign
                const message = "I sign the following page verification_hash: [0x" + lastRevisionVerificationHash + "]"

                // Create an ethers provider
                const provider = new ethers.BrowserProvider(window.ethereum);

                const networkId = await getCurrentNetwork()
                const currentChainId = ETH_CHAINID_MAP[user_profile.network]
                if (networkId !== currentChainId) {
                    await switchNetwork(currentChainId)
                }

                const signer = await provider.getSigner();

                // Hash the message (optional but recommended)
                const messageHash = ethers.hashMessage(message);

                // Sign the message using ethers.js
                const signature = await signer.signMessage(message);
                const signerAddress = await signer.getAddress()

                if (signature) {
                    try {
                        // Recover the public key from the signature; This returns an address same as wallet address
                        // const publicKey = ethers.recoverAddress(messageHash, signature)
                        const publicKey = ethers.SigningKey.recoverPublicKey(
                            messageHash,
                            signature,
                        )
                        console.log("File id not none ==> ", file_id)

                        const formData = new URLSearchParams();
                        formData.append('file_id', file_id.toString());
                        formData.append('filename', filename);
                        formData.append('signature', signature);
                        /* Recovered public key if needed */
                        // formData.append('publickey', walletAddress);
                        /* Hardcoded public key value for now; Remove this once a fix for obtaining public keys is found */
                        // formData.append('publickey', "0x04c56c1231c8a69a375c3f81e549413eb0f415cfd56d40c9a5622456a3f77be0625e1fe8a50cb6274e5d0959625bf33f3c8d1606b5782064bad2e4b46c5e2a7428");
                        formData.append('publickey', publicKey)
                        formData.append('wallet_address', signerAddress);

                        const url = `${backend_url}/explorer_sign_revision`;
                        const response = await axios.post(url, formData, {
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded'
                            }
                        });

                        const res = await response.data;
                        // Logs from api backend
                        // let logs: Array<string> = res.logs
                        // logs.forEach((item) => {
                        //     console.log("**>" + item + "\n.")
                        // })

                        if (response.status === 200) {
                            const resp: ApiFileInfo = res.file

                            const array: ApiFileInfo[] = [];
                            for (let index = 0; index < files.length; index++) {
                                const file = files[index];
                                if (file.id === file_id) {
                                    array.push(resp)
                                } else {
                                    array.push(file)
                                }
                            }
                            setFiles(array)
                            toaster.create({
                                description: "File signed successfully",
                                type: "success"
                            })
                        }

                    } catch (error: any) {
                        console.error("Network Error", error)
                        toaster.create({
                            description: `Error during signature submission`,
                            type: "error"
                        })
                    }
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


export const DeleteAquaChain = ({ file_id, filename, backend_url }: ISigningAndWitnessing) => {
    const { files, setFiles } = useStore(appStore)
    const [deleting, setDeleting] = useState(false)

    const deleteFile = async () => {
        setDeleting(true)
        const formData = new URLSearchParams();
        formData.append('filename', filename);
        formData.append('file_id', file_id.toString());

        const url = `${backend_url}/explorer_delete_file`
        const response = await axios.post(url, formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (response.status === 200) {
            let filesNew: Array<ApiFileInfo> = [];
            for (let index = 0; index < files.length; index++) {
                const file = files[index];
                if (file.id != file_id) {
                    filesNew.push(file)
                }
            }
            setFiles(filesNew);
            toaster.create({
                description: "File deleted successfully",
                type: "success"
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
