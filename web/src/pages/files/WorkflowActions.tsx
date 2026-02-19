import { ApiFileInfo } from '@/models/FileInfo'
import { getGenesisHash } from '@/utils/functions'
import { OrderRevisionInAquaTree } from 'aqua-js-sdk'
import { Album, Download, Eye } from 'lucide-react'
import { SignAquaChain } from '../../components/aqua_chain_actions/sign_aqua_chain'
import { WitnessAquaChain } from '../../components/aqua_chain_actions/witness_aqua_chain'
import { DownloadAquaChain } from '../../components/aqua_chain_actions/download_aqua_chain'
import { ShareButton } from '../../components/aqua_chain_actions/share_aqua_chain'
import { OpenAquaSignWorkFlowButton } from '../../components/aqua_chain_actions/open_aqua_sign_workflow'
import { LinkButton } from '../../components/aqua_chain_actions/link_aqua_chain'
import { OpenClaimsWorkFlowButton } from '@/components/aqua_chain_actions/open_identity_claim_workflow'
import { AttestAquaClaim } from '@/components/aqua_chain_actions/attest_aqua_claim'
import { OpenSelectedFileDetailsButton } from '@/components/aqua_chain_actions/details_button'
import { useStore } from 'zustand'
import appStore from '@/store'
import { FilesListProps } from '@/types/types'
import ActionsDropdown from './ActionsDropdown'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { LuBookOpen, LuGlasses, LuLink2, LuShare2, LuSignature } from 'react-icons/lu'
import { FileText } from 'lucide-react'

interface WorkflowActionsProps {
      file: ApiFileInfo
      index: number
      backendUrl: string
      nonce: string
      workflowInfo: {
            isWorkFlow: boolean
            workFlow: string
      } | undefined
      filesListProps: FilesListProps
}

export default function WorkflowActions({
      file,
      index,
      backendUrl,
      nonce,
      workflowInfo,
      filesListProps,
}: WorkflowActionsProps) {
      const { files, session } = useStore(appStore)

      const getTheWalletAddressFromWorkflow = (): string => {
            if (!workflowInfo || !workflowInfo.isWorkFlow) {
                  return ""
            }

            return file.aquaTree?.revisions[getGenesisHash(file.aquaTree!) || ""]?.forms_wallet_address || ""
      }

      const workFlowAquaSignActions = () => {
            return (
                  <>
                        <ActionsDropdown apiFileInfo={file} index={index}>
                              <OpenAquaSignWorkFlowButton item={file} nonce={session?.nonce ?? ''}>
                                    <DropdownMenuItem className='cursor-pointer'>
                                          <FileText className="mr-2 h-4 w-4" />
                                          View
                                    </DropdownMenuItem>
                              </OpenAquaSignWorkFlowButton>
                              <OpenSelectedFileDetailsButton file={file} index={index}>
                                    <DropdownMenuItem className='cursor-pointer'>
                                          <Eye className="mr-2 h-4 w-4" />
                                          Details
                                    </DropdownMenuItem>
                              </OpenSelectedFileDetailsButton>
                              <ShareButton item={file} index={index}>
                                    <DropdownMenuItem className='cursor-pointer'>
                                          <LuShare2 className="mr-2 h-4 w-4" />
                                          Share
                                    </DropdownMenuItem>
                              </ShareButton>
                              <DownloadAquaChain file={file} index={index}>
                                    <DropdownMenuItem className='cursor-pointer'>
                                          <Download className="mr-2 h-4 w-4" />
                                          Download
                                    </DropdownMenuItem>
                              </DownloadAquaChain>
                        </ActionsDropdown>
                  </>
            )
      }

      const workflowAquafierLicenceActions = () => {
            return (
                  <>
                        <ActionsDropdown apiFileInfo={file} index={index}>
                              <OpenSelectedFileDetailsButton file={file} index={index}>
                                    <DropdownMenuItem className='cursor-pointer'>
                                          <Eye className="mr-2 h-4 w-4" />
                                          Details
                                    </DropdownMenuItem>
                              </OpenSelectedFileDetailsButton>
                              <ShareButton item={file} index={index}>
                                    <DropdownMenuItem className='cursor-pointer'>
                                          <LuShare2 className="mr-2 h-4 w-4" />
                                          Share
                                    </DropdownMenuItem>
                              </ShareButton>
                              <DownloadAquaChain file={file} index={index}>
                                    <DropdownMenuItem className='cursor-pointer'>
                                          <Download className="mr-2 h-4 w-4" />
                                          Download
                                    </DropdownMenuItem>
                              </DownloadAquaChain>
                        </ActionsDropdown>
                  </>
            )
      }

      const workFlowAquaCertificateActions = () => {
            return (
                  <>
                        <ActionsDropdown apiFileInfo={file} index={index}>
                              <AttestAquaClaim file={file} index={index}>
                                    <DropdownMenuItem className='cursor-pointer'>
                                          <Album className="mr-2 h-4 w-4" />
                                          Attest
                                    </DropdownMenuItem>
                              </AttestAquaClaim>
                              <OpenSelectedFileDetailsButton file={file} index={index}>
                                    <DropdownMenuItem className='cursor-pointer'>
                                          <Eye className="mr-2 h-4 w-4" />
                                          Details
                                    </DropdownMenuItem>
                              </OpenSelectedFileDetailsButton>
                              <ShareButton item={file} index={index}>
                                    <DropdownMenuItem className='cursor-pointer'>
                                          <LuShare2 className="mr-2 h-4 w-4" />
                                          Share
                                    </DropdownMenuItem>
                              </ShareButton>
                              <DownloadAquaChain file={file} index={index}>
                                    <DropdownMenuItem className='cursor-pointer'>
                                          <Download className="mr-2 h-4 w-4" />
                                          Download
                                    </DropdownMenuItem>
                              </DownloadAquaChain>
                        </ActionsDropdown>

                        {/* <div className="flex flex-wrap gap-1">

                              <div className="w-25">
                                    <AttestAquaClaim file={file} index={index} />
                              </div>

                              <div className="w-25">
                                    <OpenSelectedFileDetailsButton file={file} index={index} />
                              </div>

                              <div className="w-25">
                                    <ShareButton item={file} nonce={nonce} index={index} />
                              </div>

                              <div className="w-25">
                                    <DeleteAquaChain apiFileInfo={file} backendUrl={backendUrl} nonce={nonce} revision="" index={index} />
                              </div>

                              <div className="w-25">
                                    <DownloadAquaChain file={file} index={index} />
                              </div>
                        </div> */}

                  </>
            )
      }

      const workFlowIdentityClaimAttestationActions = () => {
            let identityClaimfile = null
            const currentFileAquaTree = OrderRevisionInAquaTree(file.aquaTree!)
            const currentFileRevisionHashes = Object.keys(currentFileAquaTree.revisions)
            const firstRevision = currentFileAquaTree.revisions[currentFileRevisionHashes[0]]

            for (let i = 0; i < files.fileData.length; i++) {
                  const claimFile: ApiFileInfo = files.fileData[i]
                  const aquaTree = OrderRevisionInAquaTree(claimFile.aquaTree!)
                  const revisionHashes = Object.keys(aquaTree.revisions)

                  if (revisionHashes[0] === firstRevision.forms_identity_claim_id) {
                        identityClaimfile = claimFile
                        break
                  }
            }

            return (
                  <>
                        <ActionsDropdown apiFileInfo={file} index={index}>
                              <OpenClaimsWorkFlowButton item={identityClaimfile!} nonce={nonce} index={index}>
                                    <DropdownMenuItem className='cursor-pointer'>
                                          <LuBookOpen className="mr-2 h-4 w-4" />
                                          View
                                    </DropdownMenuItem>
                              </OpenClaimsWorkFlowButton>
                              <OpenSelectedFileDetailsButton file={file} index={index}>
                                    <DropdownMenuItem className='cursor-pointer'>
                                          <Eye className="mr-2 h-4 w-4" />
                                          Details
                                    </DropdownMenuItem>
                              </OpenSelectedFileDetailsButton>
                              <ShareButton item={file} index={index}>
                                    <DropdownMenuItem className='cursor-pointer'>
                                          <LuShare2 className="mr-2 h-4 w-4" />
                                          Share
                                    </DropdownMenuItem>
                              </ShareButton>
                              <DownloadAquaChain file={file} index={index}>
                                    <DropdownMenuItem className='cursor-pointer'>
                                          <Download className="mr-2 h-4 w-4" />
                                          Download
                                    </DropdownMenuItem>
                              </DownloadAquaChain>
                        </ActionsDropdown>

                        {/* <div className="flex flex-wrap gap-1">
                              {identityClaimfile ? (
                                    <div className="w-50.5">
                                          <OpenClaimsWorkFlowButton item={identityClaimfile} nonce={nonce} index={index} />
                                    </div>
                              ) : null}
                              <div className="w-25">
                                    <OpenSelectedFileDetailsButton file={file} index={index} />
                              </div>

                              <div className="w-25">
                                    <ShareButton item={file} nonce={nonce} index={index} />
                              </div>

                              <div className="w-25">
                                    <DeleteAquaChain apiFileInfo={file} backendUrl={backendUrl} nonce={nonce} revision="" index={index} />
                              </div>

                              <div className="w-25">
                                    <DownloadAquaChain file={file} index={index} />
                              </div>
                        </div> */}
                  </>
            )
      }
      const workFlowIdentityClaimActions = (workflowInfo: {
            isWorkFlow: boolean;
            workFlow: string;
      } | undefined) => {
            return (
                  <>

                        <ActionsDropdown apiFileInfo={file} index={index}>
                              <OpenClaimsWorkFlowButton item={file!} nonce={nonce} index={index}>
                                    <DropdownMenuItem className='cursor-pointer'>
                                          <LuBookOpen className="mr-2 h-4 w-4" />
                                          View
                                    </DropdownMenuItem>
                              </OpenClaimsWorkFlowButton>
                              {
                                    workflowInfo && ['identity_claim', 'phone_number_claim', 'email_claim', 'user_signature', 'aqua_certificate'].includes(workflowInfo.workFlow) && session?.address != getTheWalletAddressFromWorkflow() ? (
                                          <AttestAquaClaim file={file} index={index}>
                                                <DropdownMenuItem className='cursor-pointer'>
                                                      <Album className="mr-2 h-4 w-4" />
                                                      Attest
                                                </DropdownMenuItem>
                                          </AttestAquaClaim>
                                    ) : null
                              }
                              <OpenSelectedFileDetailsButton file={file} index={index}>
                                    <DropdownMenuItem className='cursor-pointer'>
                                          <Eye className="mr-2 h-4 w-4" />
                                          Details
                                    </DropdownMenuItem>
                              </OpenSelectedFileDetailsButton>
                              <LinkButton item={file} nonce={nonce} index={index}>
                                    <DropdownMenuItem className='cursor-pointer' onSelect={(e) => e.preventDefault()}>
                                          <LuLink2 className="mr-2 h-4 w-4" />
                                          Link
                                    </DropdownMenuItem>
                              </LinkButton>
                              <ShareButton item={file} index={index}>
                                    <DropdownMenuItem className='cursor-pointer'>
                                          <LuShare2 className="mr-2 h-4 w-4" />
                                          Share
                                    </DropdownMenuItem>
                              </ShareButton>
                              <DownloadAquaChain file={file} index={index}>
                                    <DropdownMenuItem className='cursor-pointer'>
                                          <Download className="mr-2 h-4 w-4" />
                                          Download
                                    </DropdownMenuItem>
                              </DownloadAquaChain>
                        </ActionsDropdown>

                        {/* <div className="flex flex-wrap gap-1">
                              <div className="w-50.5">
                                    <OpenClaimsWorkFlowButton item={file} nonce={nonce} index={index} />
                              </div>

                              {
                                    workflowInfo && ['identity_claim', 'phone_number_claim', 'email_claim', 'user_signature', 'aqua_certificate'].includes(workflowInfo.workFlow) && session?.address != getTheWalletAddressFromWorkflow() ? (
                                          <div className="w-25">
                                                <AttestAquaClaim file={file} index={index} />
                                          </div>
                                    ) : null
                              }

                              <div className="w-25">
                                    <OpenSelectedFileDetailsButton file={file} index={index} />
                              </div>

                              <div className="w-25">
                                    <ShareButton item={file} nonce={nonce} index={index} />
                              </div>

                              <div className="w-25">
                                    <DeleteAquaChain apiFileInfo={file} backendUrl={backendUrl} nonce={nonce} revision="" index={index} />
                              </div>

                              <div className="w-25">
                                    <DownloadAquaChain file={file} index={index} />
                              </div>

                              <div className="w-25">
                                    <LinkButton item={file} nonce={nonce} index={index} />
                              </div>
                        </div> */}
                  </>
            )
      }

      const workFileActions = () => {
            return (
                  <>
                        <ActionsDropdown apiFileInfo={file} index={index}>
                              <OpenSelectedFileDetailsButton file={file} index={index}>
                                    <DropdownMenuItem className='cursor-pointer'>
                                          <Eye className="mr-2 h-4 w-4" />
                                          Details
                                    </DropdownMenuItem>
                              </OpenSelectedFileDetailsButton>
                              <SignAquaChain apiFileInfo={file} backendUrl={backendUrl} nonce={nonce} revision="" index={index}>
                                    <DropdownMenuItem className='cursor-pointer'>
                                          <LuSignature className="mr-2 h-4 w-4" />
                                          Sign
                                    </DropdownMenuItem>
                              </SignAquaChain>
                              <WitnessAquaChain apiFileInfo={file} backendUrl={backendUrl} nonce={nonce} revision="" index={index}>
                                    <DropdownMenuItem className='cursor-pointer'>
                                          <LuGlasses className="mr-2 h-4 w-4" />
                                          Witness
                                    </DropdownMenuItem>
                              </WitnessAquaChain>
                              <LinkButton item={file} nonce={nonce} index={index}>
                                    <DropdownMenuItem className='cursor-pointer' onSelect={(e) => e.preventDefault()}>
                                          <LuLink2 className="mr-2 h-4 w-4" />
                                          Link
                                    </DropdownMenuItem>
                              </LinkButton>
                              <ShareButton item={file} index={index}>
                                    <DropdownMenuItem className='cursor-pointer'>
                                          <LuShare2 className="mr-2 h-4 w-4" />
                                          Share
                                    </DropdownMenuItem>
                              </ShareButton>
                              <DownloadAquaChain file={file} index={index}>
                                    <DropdownMenuItem className='cursor-pointer'>
                                          <Download className="mr-2 h-4 w-4" />
                                          Download
                                    </DropdownMenuItem>
                              </DownloadAquaChain>
                        </ActionsDropdown>
                        {/* Grid layout for action buttons with equal widths */}
                        {/* <div className="flex flex-wrap gap-1">


                              <div className="w-25">
                                    <OpenSelectedFileDetailsButton file={file} index={index} />
                              </div>

                              <div className="w-25">
                                    <SignAquaChain apiFileInfo={file} backendUrl={backendUrl} nonce={nonce} revision="" index={index} />
                              </div>

                              <div className="w-25">
                                    <WitnessAquaChain apiFileInfo={file} backendUrl={backendUrl} nonce={nonce} revision="" index={index} />
                              </div>

                              <div className="w-25">
                                    <LinkButton item={file} nonce={nonce} index={index} />
                              </div>

                              <div className="w-25">
                                    <ShareButton item={file} nonce={nonce} index={index} />
                              </div>

                              <div className="w-25">
                                    <DeleteAquaChain apiFileInfo={file} backendUrl={backendUrl} nonce={nonce} revision="" index={index} />
                              </div>

                              <div className="w-25">
                                    <DownloadAquaChain file={file} index={index} />
                              </div>
                        </div> */}

                  </>
            )
      }

      // All actions compressed down to a dropdown - the dispatcher
      // return <>-- {workflowInfo?.workFlow}</>
      if (filesListProps.showFileActions == false) {
            return null
      }
      if (workflowInfo?.isWorkFlow == true && workflowInfo.workFlow == 'aqua_sign') {
            return workFlowAquaSignActions()
      }
      if (workflowInfo?.isWorkFlow == true && workflowInfo.workFlow == 'aquafier_licence') {
            return workflowAquafierLicenceActions()
      }

      if (workflowInfo?.isWorkFlow == true && workflowInfo.workFlow == 'aqua_certificate') {
            return workFlowAquaCertificateActions()
      }
      if (workflowInfo?.isWorkFlow == true && (["domain_claim", "identity_claim", "user_signature", "email_claim", "phone_number_claim"].includes(workflowInfo.workFlow))) {
            return workFlowIdentityClaimActions(workflowInfo)
      }

      if (workflowInfo?.isWorkFlow == true && workflowInfo.workFlow == 'identity_attestation') {
            return workFlowIdentityClaimAttestationActions()
      }
      return workFileActions()
}
