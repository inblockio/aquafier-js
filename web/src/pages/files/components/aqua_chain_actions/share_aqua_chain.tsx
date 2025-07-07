
import { LuShare2 } from "react-icons/lu"
// import { Button } from "../../../../components/chakra-ui/button"
import { useStore } from "zustand"
import appStore from "../../../../store"
import axios from "axios"
// import { toaster } from "../../../../components/chakra-ui/toaster"
import { useEffect, useState } from "react"
// import { DialogActionTrigger, DialogBody, DialogCloseTrigger, DialogContent, DialogFooter, DialogHeader, DialogRoot, DialogTitle } from "../../../../components/chakra-ui/dialog"
import { generateNonce } from "siwe"
import { ClipLoader } from "react-spinners";
// import { Checkbox } from "../../../../components/chakra-ui/checkbox"
// import { Box, Center, Input, HStack, Text, VStack } from "@chakra-ui/react"
// import { ClipboardButton, ClipboardIconButton, ClipboardInput, ClipboardLabel, ClipboardRoot } from "../../../../components/chakra-ui/clipboard"
// import { InputGroup } from "../../../../components/chakra-ui/input-group"

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/shadcn/ui/dialog";
import { IShareButton } from "../../../../types/types"
import ClipboardButton from "@/components/shadcn/ui/clipboard"
import { Label } from "@/components/shadcn/ui/label"
// import { Checkbox } from "@/components/chakra-ui/checkbox"
import { Input } from "@/components/shadcn/ui/input"
import { ClipboardIcon } from "lucide-react"
import { toaster } from "@/components/shadcn/ui/use-toast"
import { Checkbox } from "@/components/shadcn/ui/checkbox"

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


    return (
        <>


            {/* Share Button */}
            <button data-testid="share-action-button" onClick={() => setIsOpen(true)} className="flex items-center space-x-1 bg-[#FDEDD6] text-red-700  px-3 py-2 rounded hover:bg-[#FAD8AD] transition-colors text-xs">
                <LuShare2 className="w-3 h-3" />
                <span>Share</span>
            </button>


            <Dialog open={isOpen} onOpenChange={e => {
                // setIsOpen(e.open)
            }}>

                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{`Sharing ${fileName}`}</DialogTitle>
                    </DialogHeader>
                    <div>
                        <div className="flex flex-col items-start space-y-4 text-left">
                            <p>
                                {`You are about to share ${fileName}. Once a file is shared, don't delete it otherwise it will be broken if one tries to import it.`}
                            </p>

                            {/* Recipient Toggle */}
                            <div className="w-full space-y-2">
                                <div className="flex items-center justify-between w-full">
                                    <Label>Share with specific wallet</Label>
                                    <Checkbox
                                        checked={recipientType === "specific"}
                                        onCheckedChange={(checked) =>
                                            setRecipientType(checked ? "specific" : "0xfabacc150f2a0000000000000000000000000000")
                                        }
                                    />
                                </div>

                                {recipientType === "specific" && (
                                    <Input
                                        className="mt-2"
                                        placeholder="Enter wallet address"
                                        value={walletAddress}
                                        onChange={(e) => setWalletAddress(e.target.value)}
                                    />
                                )}
                            </div>

                            {/* Divider */}
                            <div className="w-full h-px bg-gray-200 my-3" />

                            {/* Version Toggle */}
                            <div className="w-full space-y-2">
                                <p>
                                    Would the recipient get the Aqua Tree as is, or receive the tree with any new revisions you add?
                                </p>

                                <div className="flex items-center justify-between w-4/5 ml-8 mt-2">
                                    <span>1. Share latest revision in tree</span>
                                    <Checkbox
                                        checked={optionType === "latest"}
                                        onCheckedChange={(checked) =>
                                            setOptionType(checked ? "latest" : "current")
                                        }
                                    />
                                </div>

                                <div className="flex items-center justify-between w-4/5 ml-8 mt-2">
                                    <span>2. Share current tree</span>
                                    <Checkbox
                                        checked={optionType === "current"}
                                        onCheckedChange={(checked) =>
                                            setOptionType(checked ? "current" : "latest")
                                        }
                                    />
                                </div>
                            </div>

                            {/* Loader */}
                            {sharing && (
                                <div className="flex justify-center w-full">
                                    <ClipLoader
                                        color="blue"
                                        loading={true}
                                        size={50}
                                        aria-label="Loading Spinner"
                                    />
                                </div>
                            )}

                            {/* Clipboard */}
                            {shared && (
                                <div className="w-full">
                                    <div onClick={async () => {
                                        try {
                                            await navigator.clipboard.writeText(shared);
                                        } catch (err) {
                                            console.error("Failed to copy text: ", err);
                                        }
                                    }}>
                                        <Label>Shared Document Link</Label>
                                        <ClipboardIcon className="w-4 h-4" />
                                        <p className="text-sm mt-2">Copy the link above and share</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        {/* <DialogActionTrigger asChild> */}
                        <button data-testid="share-cancel-action-button" className='rounded'>Cancel</button>
                        {/* </DialogActionTrigger> */}
                        {
                            shared ? (
                                <ClipboardButton value={shared} />

                            ) : (
                                <button data-testid="share-modal-action-button" onClick={handleShare} className='rounded'>Share</button>
                            )
                        }
                    </DialogFooter>
                    {/* <DialogCloseTrigger /> */}
                </DialogContent>
            </Dialog>
        </>
    )
}
