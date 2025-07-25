import { ApiFileInfo } from '@/models/FileInfo'
import appStore from '@/store'
import { getAquaTreeFileName, isWorkFlowData } from '@/utils/functions'
import { OrderRevisionInAquaTree } from 'aqua-js-sdk'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useStore } from 'zustand'

interface IWalletAdrressClaim {
    walletAddress: string
}

const WalletAdrressClaim = ({ walletAddress }: IWalletAdrressClaim) => {
    const { files, systemFileInfo, setSelectedFileInfo } = useStore(appStore)
    const navigate = useNavigate()

    const getWalletClaims = () => {
        const aquaTemplates: string[] = systemFileInfo.map(e => {
            try {
                return getAquaTreeFileName(e.aquaTree!)
            } catch (e) {
                console.log('Error processing system file') // More descriptive
                return ''
            }
        })

        if (files && files.length > 0) {
            let firstClaim: ApiFileInfo | null = null
            for (let i = 0; i < files.length; i++) {
                const aquaTree = files[i].aquaTree
                if (aquaTree) {
                    const { isWorkFlow, workFlow } = isWorkFlowData(
                        aquaTree!,
                        aquaTemplates
                    )
                    if (isWorkFlow && (workFlow === 'simple_claim' || workFlow === 'domain_claim')) {
                        const orderedAquaTree =
                            OrderRevisionInAquaTree(aquaTree)
                        const revisionHashes = Object.keys(
                            orderedAquaTree.revisions
                        )
                        const firstRevisionHash = revisionHashes[0]
                        const firstRevision =
                            orderedAquaTree.revisions[firstRevisionHash]
                        const _wallet_address =
                            firstRevision.forms_wallet_address
                        if (walletAddress === _wallet_address) {
                            // setSelectedFileInfo(files[i])
                            firstClaim = files[i]
                            // We only take the first claim as of now
                            break
                        }
                    }
                }
            }
            if (firstClaim) {
                setSelectedFileInfo(firstClaim)
                navigate('/app/claims/workflow')
            } else {
                toast.info('Claim not found', {
                    description: 'No claims found for this wallet address',
                })
            }
        }
    }

    return (
        <>
            <p className="text-sm" onClick={getWalletClaims}>
                {walletAddress}
            </p>
        </>
    )
}

export default WalletAdrressClaim
