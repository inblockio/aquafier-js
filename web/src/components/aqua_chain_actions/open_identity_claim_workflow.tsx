import { Button } from '@/components/ui/button'
import appStore from '@/store'
import { IShareButton } from '@/types/types'
import { OrderRevisionInAquaTree } from 'aqua-js-sdk'
import { useEffect, useState } from 'react'
import { FaFileExport } from 'react-icons/fa6'
import { useNavigate } from 'react-router-dom'
import { useStore } from 'zustand'

export const OpenClaimsWorkFlowButton = ({ item, children, index }: IShareButton) => {
      const { setSelectedFileInfo } = useStore(appStore)
      const navigate = useNavigate()
      const [walletAddress, setWalletAddress] = useState<string | null>(null)
      const [genesisRevision, setGenesisRevision] = useState<string | null>(null)

      function getWalletAddress() {
            if (item) {
                  const aquaTree = OrderRevisionInAquaTree(item.aquaTree!)
                  const revisionHashes = Object.keys(aquaTree.revisions)
                  const firstRevision = aquaTree.revisions[revisionHashes[0]]
                  console.log("First revision: ", firstRevision)
                  if ( ["simple_claim", "dns_claim"].includes(firstRevision.forms_type) ) {
                        const walletAddress = firstRevision.forms_wallet_address
                        setWalletAddress(walletAddress)
                        setGenesisRevision(revisionHashes[0])
                  }
            }
      }

      useEffect(() => {
            getWalletAddress()
      }, [])

      return (
            <>
                  {children ? (
                        <div
                              // onClick={e => {
                              //       e.preventDefault()
                              //       setSelectedFileInfo(item)
                              //       navigate('/app/claims/workflow')
                              // }}
                              onClick={e => {
                                    e.preventDefault()
                                    setSelectedFileInfo(item)
                                    navigate(`/app/claims/workflow/${walletAddress}#${genesisRevision}`)
                              }}
                        >
                              {children}
                        </div>
                  ) : (
                        <Button
                              data-testid={'open-aqua-claim-workflow-button-' + index}
                              className="w-full cursor-pointer rounded-sm bg-cyan-900/10 text-cyan-600 hover:bg-cyan-500/20 break-words break-all overflow-hidden text-xs"
                              // onClick={e => {
                              //       e.preventDefault()
                              //       setSelectedFileInfo(item)
                              //       navigate('/app/claims/workflow')
                              // }}
                              onClick={e => {
                                    e.preventDefault()
                                    setSelectedFileInfo(item)
                                    navigate(`/app/claims/workflow/${walletAddress}#${genesisRevision}`)
                              }}
                              disabled={!walletAddress}
                        >
                              <FaFileExport />
                              <span className="break-words break-all overflow-hidden">Open Details</span>
                        </Button>
                  )}
            </>
      )
}
