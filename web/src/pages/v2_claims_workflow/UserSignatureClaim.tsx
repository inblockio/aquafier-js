import appStore from "@/store"
import { ICompleteClaimInformation } from "@/types/types"
import { ensureDomainUrlHasSSL, fetchImage } from "@/utils/functions"
import { AquaTree, FileObject, OrderRevisionInAquaTree } from "aqua-js-sdk"
import { Signature } from "lucide-react"
import { useEffect, useState } from "react"
import { useStore } from "zustand"


export async function loadSignatureImage(aquaTree: AquaTree, fileObject: FileObject[], nonce: string) {
    try {
        const signatureAquaTree = OrderRevisionInAquaTree(aquaTree)
        const fileobjects = fileObject

        const allHashes = Object.keys(signatureAquaTree!.revisions!)

        const thirdRevision = signatureAquaTree?.revisions[allHashes[2]]

        if (!thirdRevision) {
            console.log(`📢📢 third revision does not exist, this should be investigated`)
            return null
        }

        if (!thirdRevision.link_verification_hashes) {
            console.log(`📢📢 third revision link_verification_hashes is undefined, this should be investigated`)
            return null
        }

        const signatureHash = thirdRevision.link_verification_hashes[0]
        const signatureImageName = signatureAquaTree?.file_index[signatureHash]

        const signatureImageObject = fileobjects.find(e => e.fileName == signatureImageName)

        const fileContentUrl = signatureImageObject?.fileContent

        console.log(`fileContentUrl ===  ${fileContentUrl}`)

        if (typeof fileContentUrl === 'string' && fileContentUrl.startsWith('http')) {
            console.log(`fileContentUrl before  ===  ${fileContentUrl}`)
            let url = ensureDomainUrlHasSSL(fileContentUrl)
            console.log(`fileContentUrl ===  ${url}`)
            let dataUrl = await fetchImage(url, `${nonce}`)

            if (!dataUrl) {
                dataUrl = `${window.location.origin}/images/placeholder-img.png`
            }

            console.log(`dataUrl after fetchImage ===  ${dataUrl}`)
            return dataUrl
        }
    }
    catch (error) {
        console.log(`Error loading signature image: ${error}`)
        return `${window.location.origin}/images/placeholder-img.png`
    }
    return null
}



const UserSignatureClaim = ({ claim }: { claim: ICompleteClaimInformation }) => {

    const [signatureImage, setSignatureImage] = useState<string | null>(null)

    const claimName = claim.processedInfo.claimInformation.forms_name
    const claimWalletAddress = claim.processedInfo.claimInformation.forms_wallet_address
    // const date = timeToHumanFriendly(claim.processedInfo.claimInformation.local_timestamp)

    const { session } = useStore(appStore)

    const loadImage = async () => {
        let signatureImage = await loadSignatureImage(claim.file.aquaTree!, claim.file.fileObject, session?.nonce!)
        setSignatureImage(signatureImage)
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
                            <img src={signatureImage} alt={claimName} />
                        ) : (
                            <img src={`${window.location.origin}/images/placeholder-img.png`} alt={claimName} />
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

export default UserSignatureClaim