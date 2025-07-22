import { LuShare2 } from "react-icons/lu"
import { useStore } from "zustand"
import appStore from "../../store"
import axios from "axios"
import { useEffect, useState } from "react"
import { generateNonce } from "siwe"
import { ClipLoader } from "react-spinners"

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { IShareButton } from "../../types/types"
import ClipboardButton from "@/components/ui/clipboard"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ClipboardIcon } from "lucide-react"
import { toaster } from "@/components/ui/use-toast"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"

export const ShareButton = ({ item, nonce, index }: IShareButton) => {
    const { backend_url } = useStore(appStore)
    const [isOpenState, setIsOpenState] = useState(false)
    const [sharing, setSharing] = useState(false)
    const [fileName, setFileName] = useState("")
    const [shared, setShared] = useState<string | null>(null)

    const [recipientType, setRecipientType] = useState<"0xfabacc150f2a0000000000000000000000000000" | "specific">("0xfabacc150f2a0000000000000000000000000000")
    const [walletAddress, setWalletAddress] = useState("")
    const [optionType, setOptionType] = useState<"latest" | "current">("latest")

    const recipient = recipientType === "0xfabacc150f2a0000000000000000000000000000" ? "0xfabacc150f2a0000000000000000000000000000" : walletAddress

    useEffect(() => {
        if (item) {
            const name = item.fileObject[0].fileName;
            setFileName(name)
        }
    })

    const setIsOpenChange = (isOpen: boolean) => {
        setIsOpenState(isOpen);
        // Reset state to default when closing the dialog
        if (!isOpen) {
            setSharing(false);
            setShared(null);
            setRecipientType("0xfabacc150f2a0000000000000000000000000000");
            setWalletAddress("");
            setOptionType("latest");
        }

    }

    const handleShare = async () => {
        if (recipientType == "specific" && (walletAddress == "")) {
            toaster.create({
                description: `If recipient is specific a wallet address has to be specified.`,
                type: "error"
            })
            return
        }
        setSharing(true)

        const unique_identifier = `${Date.now()}_${generateNonce()}`
        const url = `${backend_url}/share_data`;

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
            "option": optionType,
            "file_name": fileName
        }, {
            headers: {
                'nonce': nonce
            }
        });

        if (response.status === 200) {
            setSharing(false)
            const domain = window.location.origin;
            setShared(`${domain}/app/shared-contracts/${unique_identifier}`)
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
            <button
                data-testid={"share-action-button-" + index}
                onClick={() => setIsOpenChange(true)}
                className="w-full flex items-center justify-center space-x-1 bg-[#FDEDD6] text-red-700 px-3 py-2 rounded hover:bg-[#FAD8AD] transition-colors text-xs"
            >
                <LuShare2 className="w-4 h-4" />
                <span>Share</span>
            </button>

            <Dialog open={isOpenState} onOpenChange={setIsOpenChange}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">
                            Sharing {fileName}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Warning Message */}
                        <p className="text-sm text-gray-600">
                            You are about to share {fileName}. Once a file is shared, don't delete it otherwise it will be broken if one tries to import it.
                        </p>

                        {/* Share with specific wallet toggle */}
                        <div className="flex items-center justify-between py-2">
                            <Label className="text-sm font-medium">
                                Share with specific wallet
                            </Label>
                            <Switch
                                checked={recipientType === "specific"}
                                onCheckedChange={(checked) =>
                                    setRecipientType(checked ? "specific" : "0xfabacc150f2a0000000000000000000000000000")
                                }
                            />
                        </div>

                        {/* Wallet Address Input */}
                        {recipientType === "specific" && (
                            <div className="space-y-2">
                                <Input
                                    placeholder="Enter wallet address"
                                    value={walletAddress}
                                    onChange={(e) => setWalletAddress(e.target.value)}
                                    className="w-full"
                                />
                            </div>
                        )}

                        {/* Sharing Options */}
                        <div className="space-y-3">
                            <Label className="text-sm font-medium">
                                Sharing Option (Would the recipient to get the the Aqua Tree as is Or receive the tree with any new revisions you will add?)
                            </Label>

                            <div className="space-y-2">
                                {/* Latest Option */}
                                <div
                                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${optionType === "latest"
                                            ? "border-blue-500 bg-orange-100/80"
                                            : "border-gray-200 hover:border-gray-300"
                                        }`}
                                    onClick={() => setOptionType("latest")}
                                >
                                    <div className="flex-1">
                                        <div className="font-medium text-sm">Latest</div>
                                        <div className="text-xs text-gray-500">Share latest revision in tree</div>
                                    </div>
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${optionType === "latest"
                                            ? "border-blue-500 bg-blue-500"
                                            : "border-gray-300"
                                        }`}>
                                        {optionType === "latest" && (
                                            <div className="w-2 h-2 bg-white rounded-full"></div>
                                        )}
                                    </div>
                                </div>

                                {/* Current Option */}
                                <div
                                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${optionType === "current"
                                            ? "border-blue-500 bg-orange-100/80"
                                            : "border-gray-200 hover:border-gray-300"
                                        }`}
                                    onClick={() => setOptionType("current")}
                                >
                                    <div className="flex-1">
                                        <div className="font-medium text-sm">Latest</div>
                                        <div className="text-xs text-gray-500">Share current tree</div>
                                    </div>
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${optionType === "current"
                                            ? "border-blue-500 bg-blue-500"
                                            : "border-gray-300"
                                        }`}>
                                        {optionType === "current" && (
                                            <div className="w-2 h-2 bg-white rounded-full"></div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Loading Spinner */}
                        {sharing && (
                            <div className="flex justify-center py-4">
                                <ClipLoader
                                    color="#3B82F6"
                                    loading={true}
                                    size={30}
                                    aria-label="Loading Spinner"
                                />
                            </div>
                        )}

                        {/* Shared Link - FIXED OVERFLOW */}
                        {shared && (
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Shared Document Link</Label>
                                <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded border min-w-0">
                                    <ClipboardIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                    <span 
                                        className="text-sm text-gray-700 flex-1 min-w-0 break-all overflow-hidden" 
                                        data-testid="share-url"
                                        title={shared}
                                    >
                                        {shared}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500">Copy the link above and share</p>
                            </div>
                        )}

                        {/* Existing sharing contracts section */}
                        <div className="border-t pt-4">
                            <h3 className="font-medium text-sm mb-2">Existing sharing contracts</h3>
                            {/* This section appears empty in the design, so leaving it as placeholder */}
                        </div>
                    </div>

                    <DialogFooter className="flex justify-between">
                        <Button
                            variant="outline"
                            onClick={() => setIsOpenChange(false)}
                            data-testid="share-cancel-action-button"
                        >
                            Cancel
                        </Button>

                        {shared ? (
                            <ClipboardButton value={shared} />
                        ) : (
                            <Button
                                onClick={handleShare}
                                disabled={sharing}
                                data-testid="share-modal-action-button-dialog"
                                className="bg-black text-white hover:bg-gray-800"
                            >
                                Share
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}