import { Button } from '@/components/ui/button'
import appStore from '@/store'
import { IShareButton } from '@/types/types'
import { getGenesisHash } from '@/utils/functions'
import { FaFileExport } from 'react-icons/fa6'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useStore } from 'zustand'

export const OpenAquaSignWorkFlowButton = ({ item, children, index }: IShareButton) => {
      const { setSelectedFileInfo, session } = useStore(appStore)
      const navigate = useNavigate()

      const handleNavigation = () => {
            
            setSelectedFileInfo(item)

            let genesisHash = getGenesisHash(item.aquaTree!)
            if (!genesisHash) {
                  toast.error('Could not determine genesis hash for this workflow.')
                  return
            }
            try {
                 
                  if (genesisHash && session?.address) {
                        let genesisRevision = item.aquaTree?.revisions[genesisHash]
                        let signers = genesisRevision?.forms_signers
                        
                        if (signers) {
                              
                              let signersArray = signers.split(",").map((item: string) => item.trim().toLocaleLowerCase())
                              let activeUserAddress = session.address.toLocaleLowerCase()
                              let isUserSigner = signersArray.find((signer: string) => signer === activeUserAddress)
                              if (isUserSigner) {
                                    
                                    navigate('/app/pdf/workflow/2/' + genesisHash)
                              }else{
                                    navigate('/app/pdf/workflow/1/' + genesisHash)
                              }
                        } else {
                             

                              navigate('/app/pdf/workflow/1/' + genesisHash)
                        }
                  }else{
                        
                        toast.error('Could not determine genesis hash or user address.')
                  }
            } catch (error: any) {
                  console.error('Error parsing signers or navigating:', error)
                  navigate('/app/pdf/workflow/1/' + genesisHash)
            }
      }

      return (
            <>
                  {children ? (
                        <div
                              onClick={e => {
                                    e.preventDefault()
                                    handleNavigation()
                              }}
                        >
                              {children}
                        </div>
                  ) : (
                        <Button
                              data-testid={'open-aqua-sign-workflow-button-' + index}
                              className="w-full cursor-pointer rounded-sm bg-cyan-500/10 text-cyan-600 text-xs hover:bg-cyan-500/20 break-words break-all overflow-hidden"
                              onClick={e => {
                                    e.preventDefault()
                                    handleNavigation()
                              }}
                        >
                              <FaFileExport />
                              <span className="break-words break-all overflow-hidden">Open Workflow</span>
                        </Button>
                  )}
            </>
      )
}
