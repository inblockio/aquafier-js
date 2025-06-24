
import { LuShare2 } from "react-icons/lu"
import { Button } from "../chakra-ui/button"
import { useStore } from "zustand"
import appStore from "../../store"
import axios from "axios"
import { toaster } from "../chakra-ui/toaster"
import { useEffect, useState } from "react"
import { DialogActionTrigger, DialogBody, DialogCloseTrigger, DialogContent, DialogFooter, DialogHeader, DialogRoot, DialogTitle } from "../chakra-ui/dialog"
import { generateNonce } from "siwe"
import Loading from "react-loading"
import { Checkbox } from "../chakra-ui/checkbox"
import { Box, Center, Input, HStack, Text, VStack } from "@chakra-ui/react"
import { ClipboardButton, ClipboardIconButton, ClipboardInput, ClipboardLabel, ClipboardRoot } from "../chakra-ui/clipboard"
import { InputGroup } from "../chakra-ui/input-group"
import  {IShareButton} from "../../types/types"

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
