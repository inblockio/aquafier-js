import React from 'react'
import appStore from "@/store"
import { ICompleteClaimInformation } from "@/types/types"
import {loadSignatureImage } from "@/utils/functions"
import { Signature } from "lucide-react"
import { useEffect, useState } from "react"
import { useStore } from "zustand"



const UserSignatureClaim = ({ claim }: { claim: ICompleteClaimInformation }) => {

    const [signatureImage, setSignatureImage] = useState<string | Uint8Array | null>(null)

    const claimName = claim.processedInfo.claimInformation.forms_name
    const claimWalletAddress = claim.processedInfo.claimInformation.forms_wallet_address
    // const date = timeToHumanFriendly(claim.processedInfo.claimInformation.local_timestamp)

    const { session } = useStore(appStore)

    const loadImage = async () => {
        let signatureImage = await loadSignatureImage(claim.file.aquaTree!, claim.file.fileObject, session?.nonce!)
        if (signatureImage) {
           
            setSignatureImage(signatureImage)
        }
    }


    useEffect(() => {
        loadImage()
    }, [])

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start gap-3 mb-4">
                <div className="bg-blue-50 p-2 rounded-lg">
                    <Signature className="text-blue-500 w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold">User Signature Claim</h2>
                    <p className="text-gray-600 text-sm">A claim that shows a user's signature.</p>
                </div>
            </div>

            <div className="border-t border-gray-100 pt-4 mb-4">
                <p className="text-sm text-gray-700">Claim verified to "{claimName}"</p>
                {/* <p className="text-xs text-gray-500">{date}</p> */}
            </div>

            <div className="flex gap-2 items-center">
                <div className="bg-gray-100 p-4 rounded-2xl w-[140px]">
                    {
                        signatureImage ? (
                            typeof signatureImage === 'string' ? (
                                <img src={signatureImage} alt={`Signature of ${claimName}`} />
                            ) : (
                                <img
                                    src={`data:image/png;base64,${btoa(String.fromCharCode(...signatureImage))}`}
                                    alt={`Signature of ${claimName}`}
                                />
                            )
                        ) : (
                            <img src={`${window.location.origin}/images/placeholder-img.png`} alt={`Signature of ${claimName}`} />
                        )
                    }
                </div>
                <div>
                    <p className="text-sm text-gray-700">{claimName}</p>
                    <p className="text-xs text-gray-500 font-mono">{claimWalletAddress}</p>
                </div>
            </div>
        </div>
    )
}

export default React.memo(UserSignatureClaim)