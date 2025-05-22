import { Button, VStack, Box, HStack, Input, Text, IconButton, Stack, Heading, Collapsible, List } from "@chakra-ui/react"
import axios from "axios"
import { useState, useEffect } from "react"
import { LuImport, LuLoader, LuShare2, LuTrash2 } from "react-icons/lu"
import { generateNonce } from "siwe"
import { useStore } from "zustand"
import { ApiFileInfo } from "../../models/FileInfo"
import appStore from "../../store"
import { ClipboardIconButton, ClipboardRoot, ClipboardLabel, ClipboardInput, ClipboardLink } from "../chakra-ui/clipboard"
import { InputGroup } from "../chakra-ui/input-group"
import { toaster } from "../chakra-ui/toaster"
import { DialogContent, DialogHeader, DialogRoot, DialogTitle, DialogBody, DialogFooter, DialogActionTrigger, DialogCloseTrigger } from "../chakra-ui/dialog"

import { Switch } from "../chakra-ui/switch"
import { ethers } from "ethers"
import { Alert } from "../chakra-ui/alert"
import { RadioCardItem, RadioCardLabel, RadioCardRoot } from "../chakra-ui/radio-card"
import { getGenesisHash, isAquaTree } from "../../utils/functions"
import { AquaTree } from "aqua-js-sdk"

interface ISharingOptions {
    value: string;
    onChange: (value: string) => void;
}

const SharingOptions = ({ value, onChange }: ISharingOptions) => {
    return (
        <RadioCardRoot defaultValue={value} onValueChange={e => onChange(`${e.value}`)}>
            <RadioCardLabel>Sharing Option (Would the recipient to get the the  Aqua Tree as is Or receive the tree with any new revisions you will add?)</RadioCardLabel>
            <HStack align="stretch">
                {items.map((item) => (
                    <RadioCardItem key={item.value}
                        // value={item.value} 
                        borderRadius={"lg"}
                        {...item}
                    >
                        {/* <RadioCard.ItemHiddenInput /> */}
                        {/* <RadioCard.ItemControl>
                            <RadioCard.ItemContent>
                                <RadioCard.ItemText>{item.label}</RadioCard.ItemText>
                                <RadioCard.ItemDescription>
                                    {item.description}
                                </RadioCard.ItemDescription>
                            </RadioCard.ItemContent>
                            <RadioCard.ItemIndicator />
                        </RadioCard.ItemControl> */}
                    </RadioCardItem>
                ))}
            </HStack>
        </RadioCardRoot>
    )
}

const items = [
    { value: "latest", label: "Latest", description: "Share latest revision in tree" },
    { value: "current", label: "Current", description: "Share current tree" },
]


interface ICreateContractForm {
    mutate: () => void,
    updating: boolean,
    contract?: any
    genesis_hash: string
    latest_hash: string
}

const CreateContractForm = ({ mutate, contract, updating, genesis_hash, latest_hash }: ICreateContractForm) => {

    const [recipient, setRecipient] = useState<string | null>(contract?.receiver === "0xfabacc150f2a0000000000000000000000000000" ? "0xfabacc150f2a0000000000000000000000000000" : contract?.receiver)
    const [option, setOption] = useState(contract?.option || "latest")
    const [shareWithSpecificWallet, setShareWithSpecificWallet] = useState(contract?.receiver !== "0xfabacc150f2a0000000000000000000000000000" || false)
    const [shared, setShared] = useState<string | null>(null)

    const { backend_url, session } = useStore(appStore)
    const [sharing, setSharing] = useState(false)

    const handleShare = async () => {
        try {

            let recipientWalletAddress = recipient
            if (shareWithSpecificWallet && !recipient) {
                toaster.create({
                    description: `Enter wallet address of recipient.`,
                    type: "error"
                })
                return
            }
            if (!shareWithSpecificWallet) {
                recipientWalletAddress = "0xfabacc150f2a0000000000000000000000000000"
            }
            recipientWalletAddress = ethers.getAddress(recipientWalletAddress!!)


            setSharing(true)
            const unique_identifier = `${Date.now()}_${generateNonce()}`

            let url = `${backend_url}/share_data`;
            let method = "POST"
            let data = {
                "latest": latest_hash,
                "genesis_hash": genesis_hash,
                "hash": unique_identifier,
                "recipient": recipientWalletAddress,
                "option": option
            }

            if (updating) {
                url = `${backend_url}/contracts/${contract?.hash}`
                method = "PUT"
            }

            const response = await axios({
                method,
                url,
                data,
                headers: {
                    'nonce': session?.nonce
                }
            });

            //  console.log(response)

            if (response.status === 200) {
                const domain = window.location.origin;
                const sharingLink = `${domain}/share/${unique_identifier}`
                setShared(sharingLink)
                mutate()
            }
            else {
                toaster.create({
                    description: "Error sharing",
                    type: "error"
                })
            }
            setSharing(false)
        }
        catch (error) {
            console.error(error)
            setSharing(false)
            toaster.create({
                description: "Error sharing",
                type: "error"
            })
        }

    }


    return (
        <Stack w={'100%'} py={"4"} px={"1"} gap={"4"}>
            <Switch checked={shareWithSpecificWallet} onCheckedChange={e => setShareWithSpecificWallet(e.checked)}>
                Share with specific wallet
            </Switch>
            {
                shareWithSpecificWallet && (
                    <Input
                        placeholder="Enter wallet address"
                        value={recipient || ""}
                        onChange={(e) => setRecipient(e.target.value)}
                        className="w-full"
                        borderRadius={"md"}
                    />
                )
            }
            <SharingOptions value={option} onChange={setOption} />
            <Button
                onClick={handleShare}
                className="w-full"
                borderRadius={"md"}
                disabled={sharing}
            >
                {
                    updating ? (sharing ? "Updating..." : "Update") : (sharing ? "Sharing..." : "Share")
                }
            </Button>
            {
                !updating ? (
                    <>
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
                    </>
                ) : null
            }
        </Stack>
    )
}

interface IContractItem {
    contract?: any,
    i: number
    mutate: () => void
}


const ContractItem = ({ contract, i, mutate }: IContractItem) => {

    const [deleting, setDeleting] = useState(false)
    const [open, setOpen] = useState(false)

    const { backend_url, session } = useStore(appStore)


    const createShareLink = (share_hash: string) => {
        const domain = window.location.origin;
        return `${domain}/share/${share_hash}`
    }


    const deleteContract = async () => {
        setDeleting(true)
        try {
            await axios.delete(`${backend_url}/contracts/${contract.hash}`, {
                headers: {
                    'nonce': session?.nonce
                }
            })
            mutate()
            setDeleting(false)
            toaster.create({
                description: `Contract deleted successfully`,
                type: "success",
            })
        } catch (error) {
            toaster.create({
                description: `Failed to delete contract: ${error}`,
                type: "error",
            })
            setDeleting(false)
        }
    }

    return (
        <>
            <Collapsible.Root w={'100%'} open={open}>
                {/* <Collapsible.Trigger w={'100%'}> */}
                <HStack key={contract.id} justifyContent={"start"} justifyItems={"start"} w={'100%'} cursor={"pointer"}>
                    <IconButton>{i + 1}</IconButton>
                    <Stack flex={1} gap={0} onClick={() => setOpen(!open)} justifyContent={"start"} alignItems={"start"} textAlign={"start"}>
                        <Text wordBreak={'break-word'}>Shared To: {contract.receiver}</Text>
                        <Text fontSize={12}>Access: {contract.option} (click to edit)</Text>
                    </Stack>
                    <IconButton variant="outline" borderRadius={'md'} onClick={deleteContract}>
                        {
                            deleting ? <LuLoader /> : <LuTrash2 />
                        }
                    </IconButton>
                    <ClipboardRoot value={createShareLink(contract.hash)}>
                        <ClipboardLink cursor={"pointer"} />
                    </ClipboardRoot>
                </HStack>
                {/* </Collapsible.Trigger> */}
                <Collapsible.Content>
                    <CreateContractForm mutate={mutate} contract={contract} updating={true} genesis_hash={contract.genesis_hash} latest_hash={contract.latest_hash} />
                </Collapsible.Content>
            </Collapsible.Root>
        </>
    )
}

interface IShareButtonAction {
    item: ApiFileInfo
    nonce: string

}

const ShareButtonAction = ({ item, nonce }: IShareButtonAction) => {
    const { backend_url } = useStore(appStore)
    const [isOpen, setIsOpen] = useState(false)
    // const [sharing, setSharing] = useState(false)
    const [fileName, setFileName] = useState("")
    const [contracts, setContracts] = useState<any[]>([])

    const getGenesisRevision = () => {
        if (item) {
            let revisions = Object.keys(item.aquaTree?.revisions ?? {})
            return revisions[0]
        }
        return null
    }

    const getLatestRevision = () => {
        if (item) {
            let revisions = Object.keys(item.aquaTree?.revisions ?? {})
            return revisions[revisions.length - 1]
        }
        return null
    }

    const loadAllContracts = async () => {
        try {
            const genesis_hash = getGenesisRevision()
            if (!genesis_hash) {
                return
            }
            const url = `${backend_url}/contracts/${genesis_hash}`;
            const response = await axios.get(url, {
                headers: {
                    'nonce': nonce
                }
            });
            if (response.status === 200) {
                setContracts(response.data?.contracts)
            }
        } catch (e) {
            console.error(`Error fetching contracts for  ${JSON.stringify(item)}`)
        }
    }

    const getFileNameFromAquatree = (hash: string): string => {
        let data = item.aquaTree!.file_index[hash]
        if (data) {
            return data
        }
        const allAquaTrees = item?.fileObject.filter((e) => isAquaTree(e.fileContent)) ?? []
        let name: string = '--name--'
        for (let item of allAquaTrees) {
            const itemAquaTree: AquaTree = item.fileContent as AquaTree
            let allRevisionHashes = Object.keys(itemAquaTree.revisions)

            // let linkedHash = getFifthRevision.link_verification_hashes![0]
            if (allRevisionHashes.includes(hash)) {
                let genHash = getGenesisHash(itemAquaTree)
                if (genHash) {

                    name = itemAquaTree.file_index[genHash]
                    break
                }
            }
        }

        return name
    }
    const checkIfFileContainsLinkAndShowWarning = () => {
        let linkHahses: string[] = [];
        let revisionHashes = Object.keys(item.aquaTree!.revisions!!)
        for (let rev of revisionHashes) {
            const revision = item.aquaTree?.revisions[rev]
            if (revision?.revision_type == "link") {
                let data = revision.link_verification_hashes![0]
                linkHahses.push(data)
            }
        }


        if (linkHahses.length != 0) {

            return <Alert status={'warning'} title="Import Aqua Chain" icon={<LuImport />}>
                <Stack gap={"100"}>
                    <Text>
                        The following files are linked and will also be shared.
                    </Text>
                    <List.Root justifySelf={'start'}>
                        {linkHahses.map((itemLoop, index) => {
                            return <List.Item> <List.Indicator>
                                {index + 1}.
                            </List.Indicator>
                                {/* {} */}
                                {getFileNameFromAquatree(itemLoop)}
                            </List.Item>
                        })}
                    </List.Root>
                </Stack>
            </Alert>


        } else {
            return <></>
        }
    }

    useEffect(() => {
        loadAllContracts()

        if (item) {
            const name = item.fileObject[0].fileName;
            setFileName(name)
        }
    }, [item])

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
                        <VStack textAlign={'start'} justify={"start"}>
                            <Text>
                                {`You are about to share ${fileName}. Once a file is shared, don't delete it otherwise it will be broken if one tries to import it.`}
                            </Text>

                            {checkIfFileContainsLinkAndShowWarning()}

                            <CreateContractForm mutate={loadAllContracts} updating={false} genesis_hash={getGenesisRevision() ?? ""} latest_hash={getLatestRevision() ?? ""} />

                            {/* Custom Divider */}
                            <Box
                                width="100%"
                                height="1px"
                                bg="gray.200"
                                my={3}
                            />

                            {/* Existing contracts */}
                            <Stack w={'100%'}>
                                <Heading as={"h3"} fontWeight={500}>Existing sharing contracts</Heading>
                                <VStack>
                                    {contracts?.map((contract, i: number) => (
                                        <ContractItem key={contract.id} contract={contract} i={i} mutate={loadAllContracts} />
                                    ))}
                                </VStack>
                            </Stack>

                        </VStack>
                    </DialogBody>
                    <DialogFooter>
                        <DialogActionTrigger asChild>
                            <Button variant="outline" borderRadius={'md'}>Cancel</Button>
                        </DialogActionTrigger>
                        {/* {
                            shared ? (
                                <ClipboardRoot value={shared}>
                                    <ClipboardButton borderRadius={'md'} variant={'solid'} />
                                </ClipboardRoot>
                            ) : (
                                <Button onClick={handleShare} borderRadius={'md'}>Share</Button>
                            )
                        } */}
                    </DialogFooter>
                    <DialogCloseTrigger />
                </DialogContent>
            </DialogRoot>
        </>
    )
}


export default ShareButtonAction