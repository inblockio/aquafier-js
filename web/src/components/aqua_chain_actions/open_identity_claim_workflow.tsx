import { Button } from '@/components/ui/button'
import { IShareButton } from '@/types/types'
import { getGenesisHash } from '@/utils/aqua-tree'

import { FaFileExport } from 'react-icons/fa6'
import { useNavigate } from 'react-router-dom'

export const OpenClaimsWorkFlowButton = ({ item, children, index }: IShareButton) => {
      const navigate = useNavigate()

      function getWalletAddress() {
            if (item) {
                  const genesisRevision = getGenesisHash(item.aquaTree!)
                  const firstRevision = item.aquaTree!.revisions[genesisRevision!]
                  if (["simple_claim", "dns_claim", "user_signature", "identity_attestation"].includes(firstRevision.forms_type)) {
                        const walletAddress = firstRevision.forms_wallet_address
                        return {
                              walletAddress,
                              genesisRevision: genesisRevision
                        }
                  }
                  return {
                        walletAddress: firstRevision.forms_wallet_address || firstRevision.forms_creator,
                        genesisRevision: genesisRevision
                  }
            }
            return null
      }
      const { walletAddress, genesisRevision } = getWalletAddress() || { walletAddress: null, genesisRevision: null }

      return (
            <>
                  {children ? (
                        <div
                              onClick={e => {
                                    e.preventDefault()
                                    navigate(`/app/claims/workflow/${walletAddress}#${genesisRevision}`)
                              }}
                        >
                              {children}
                        </div>
                  ) : (
                        <Button
                              data-testid={'open-aqua-claim-workflow-button-' + index}
                              className="w-full cursor-pointer rounded-sm bg-cyan-900/10 text-cyan-600 hover:bg-cyan-500/20 break-words break-all overflow-hidden text-xs"
                              onClick={e => {
                                    e.preventDefault()
                                    navigate(`/app/claims/workflow/${walletAddress}#${genesisRevision}`)
                              }}
                              disabled={!walletAddress}
                        >
                              <FaFileExport />
                              <span className="break-words break-all overflow-hidden">Open Workflow</span>
                        </Button>
                  )}
            </>
      )
}
