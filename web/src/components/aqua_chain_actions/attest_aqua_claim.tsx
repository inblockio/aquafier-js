import {getAquaTreeFileName, getGenesisHash, isWorkFlowData} from '../../utils/functions'
import {useStore} from 'zustand'
import appStore from '../../store'
import {ApiFileInfo} from '../../models/FileInfo'
import {toast} from 'sonner'
import {Album} from 'lucide-react'
import {Revision} from 'aqua-js-sdk'
import {Button} from '../ui/button'

export const AttestAquaClaim = ({ file, index, children }: { file: ApiFileInfo; index: number; children?: React.ReactNode }) => {
      const { files, session, openDialog, setOpenDialog, setSelectedFileInfo, systemFileInfo } = useStore(appStore)
      // const [isAttesting, setIsAttesting] = useState(false)
      // const [open, setOpen] = useState(false)
      // const [isLoading, setIsloading] = useState(false)
      // const [aquaTreesAffected, setAquaTreesAffected] = useState<ApiFileInfo[]>([])

      const allHashes = Object.keys(file.aquaTree!.revisions!)
      let secondRevision: Revision | null = null
      if (allHashes.length >= 2) {
            secondRevision = file.aquaTree!.revisions![allHashes[2]]
      }

      const attestAquaClaimAction = async () => {
            // check if already attested
            for (const anAquaTree of files.fileData) {
                  const isWorkFlow = isWorkFlowData(
                        anAquaTree.aquaTree!,
                        systemFileInfo.map(e => {
                              try {
                                    return getAquaTreeFileName(e.aquaTree!)
                              } catch (e) {
                                    return ''
                              }
                        })
                  )
                  if (isWorkFlow && isWorkFlow.workFlow == 'identity_attestation') {
                        const genHash = getGenesisHash(file.aquaTree!)
                        const genRevision: Revision = Object.values(anAquaTree.aquaTree?.revisions!)[0]
                        if (genRevision) {
                              const identityClaimId: string | undefined = genRevision[`forms_identity_claim_id`]
                              //  console.log(`identityClaimId  ${identityClaimId} genHash ${genHash} fileName ${getFileName(file.aquaTree!)}`)
                              if (identityClaimId == genHash) {
                                    toast.error('This file is already attested')
                                    return
                              }

                              const jsonData: Record<string, any> = {}
                              const genKeys = Object.keys(genRevision)
                              for (const key of genKeys) {
                                    if (key.startsWith('forms_')) {
                                          jsonData[key] = genRevision[key]
                                    }
                              }
                        }
                  }
            }

            setSelectedFileInfo(file)
            // setOpenCreateClaimAttestationPopUp(true)
            setOpenDialog({
                  dialogType: 'identity_attestation',
                  isOpen: true,
                  onClose: () => setOpenDialog(null),
                  onConfirm: () => {
                        // Handle confirmation logic here
                  }
            })
      }

      if (secondRevision) {
            if (secondRevision.revision_type == 'signature') {
                  if (secondRevision.signature_wallet_address == session?.address) {
                        return (
                              <Button
                                    disabled
                                    className={`w-full cursor-not-allowed flex items-center justify-center space-x-1 text-gray-600 px-3 py-2 rounded transition-colors text-xs bg-gray-200 `}
                                    // disabled={openCreateClaimAttestationPopUp}
                              >
                                    <Album className="w-4 h-4" />
                                    <span>Attest</span>
                              </Button>
                        )
                  } else {
                        return (
                              <div className="w-[100px]">
                                    {children ? (
                                          <div
                                                data-testid={'attest-in-progress-aqua-claim-button-' + index}
                                                onClick={() => {
                                                      if (openDialog && openDialog.dialogType == 'identity_attestation') {
                                                            toast('Attesting is already in progress')
                                                      } else {
                                                            attestAquaClaimAction()
                                                      }
                                                }}
                                          >
                                                {children}
                                          </div>
                                    ) : (
                                          <button
                                                data-testid={'attest-aqua-claim-button-' + index}
                                               onClick={() => {
                                                      if (openDialog && openDialog.dialogType == 'identity_attestation') {
                                                            toast('Attesting is already in progress')
                                                      } else {
                                                            attestAquaClaimAction()
                                                      }
                                                }}
                                                className={`w-full flex items-center justify-center space-x-1 bg-[#009c6e] text-white px-3 py-2 rounded transition-colors text-xs ${openDialog && openDialog.dialogType == 'identity_attestation' ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[#7ECEB7]'}`}
                                                // disabled={openCreateClaimAttestationPopUp}
                                          >
                                                {openDialog && openDialog.dialogType == 'identity_attestation' ? (
                                                      <>
                                                            <svg className="animate-spin h-3 w-3 mr-1 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                                            </svg>
                                                            <span>Attesting...</span>
                                                      </>
                                                ) : (
                                                      <>
                                                            <Album className="w-4 h-4" />
                                                            <span>Attest</span>
                                                      </>
                                                )}
                                          </button>
                                    )}
                              </div>
                        )
                  }
            } else {
                  // toast.error(`This claim does not have a signature revision, cannot attest ${secondRevision.revision_type}`)
                  return null
            }
      }

      return <></>
}
