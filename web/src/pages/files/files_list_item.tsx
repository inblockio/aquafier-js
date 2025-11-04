import { ApiFileInfo } from '@/models/FileInfo'

import {
      capitalizeWords,
      displayTime,
      formatBytes,
      formatCryptoAddress,
      getAquaTreeFileName,
      getAquaTreeFileObject,
      getFileCategory,
      getFileExtension,
      getGenesisHash,
      isWorkFlowData
} from '@/utils/functions'
import { FileObject, OrderRevisionInAquaTree } from 'aqua-js-sdk'
import { FileText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SignAquaChain } from '../../components/aqua_chain_actions/sign_aqua_chain'
import { WitnessAquaChain } from '../../components/aqua_chain_actions/witness_aqua_chain'
import { DownloadAquaChain } from '../../components/aqua_chain_actions/download_aqua_chain'
import { DeleteAquaChain } from '../../components/aqua_chain_actions/delete_aqua_chain'
import { ShareButton } from '../../components/aqua_chain_actions/share_aqua_chain'
import { OpenAquaSignWorkFlowButton } from '../../components/aqua_chain_actions/open_aqua_sign_workflow'
import { LinkButton } from '../../components/aqua_chain_actions/link_aqua_chain'
import { OpenClaimsWorkFlowButton } from '@/components/aqua_chain_actions/open_identity_claim_workflow'
import { AttestAquaClaim } from '@/components/aqua_chain_actions/attest_aqua_claim'
import { OpenSelectedFileDetailsButton } from '@/components/aqua_chain_actions/details_button'
import { useStore } from 'zustand'
import appStore from '@/store'
import { FilesListProps } from '@/types/types'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import WalletAdrressClaim from '../v2_claims_workflow/WalletAdrressClaim'

export default function FilesListItem({
      showWorkFlowsOnly,
      file,
      index,
      systemAquaFileNames,
      backendUrl,
      nonce,
      viewMode = 'table',
      filesListProps
}: {
      showWorkFlowsOnly: boolean
      file: ApiFileInfo
      index: number
      systemFileInfo: ApiFileInfo[]
      systemAquaFileNames: string[]
      backendUrl: string
      nonce: string
      viewMode?: 'table' | 'card' | 'actions-only'
      filesListProps: FilesListProps
}) {
      // const [_selectedFiles, setSelectedFiles] = useState<number[]>([]);
      const { files, session } = useStore(appStore)
      const [currentFileObject, setCurrentFileObject] = useState<FileObject | undefined>(undefined)
      const [workflowInfo, setWorkFlowInfo] = useState<{ isWorkFlow: boolean; workFlow: string } | undefined>(undefined)

      const prepareAquaTreeForRendering = () => {
            if (systemAquaFileNames.length === 0) {
                  return
            }
            const fileObject = getAquaTreeFileObject(file)
            setCurrentFileObject(fileObject)
            const workFlow = isWorkFlowData(file.aquaTree!, systemAquaFileNames)
            setWorkFlowInfo(workFlow)
      }

      useEffect(() => {
            prepareAquaTreeForRendering()
      }, [systemAquaFileNames, file])

      // useEffect(() => {
      // const someData = systemFileInfo.map(e => {
      //       try {
      //             return getAquaTreeFileName(e.aquaTree!)
      //       } catch (e) {
      //             return ''
      //       }
      // })

      // const fileObject = getAquaTreeFileObject(file)
      // setCurrentFileObject(fileObject)
      // const workFlow = isWorkFlowData(file.aquaTree!, someData)

      // setWorkFlowInfo(workFlow)
      // }, [file, systemAquaFileNames])

      const getFileInfo = () => {
            if (currentFileObject) {
                  return formatBytes(currentFileObject.fileSize ?? 0)
            } else {
                  return 'Not available'
            }
      }
      const getTimeInfo = () => {
            const genRevision = getGenesisHash(file.aquaTree!)
            if (genRevision) {
                  const timestamp = file.aquaTree?.revisions?.[genRevision]?.local_timestamp
                  if (timestamp) {
                        return displayTime(timestamp)
                  }
            } else {
                  return 'Not available'
            }
      }



      const workFlowAquaSignActions = () => {
            return (

                  <div className="flex flex-wrap gap-1">
                        <div className="w-[202px]">
                              <OpenAquaSignWorkFlowButton item={file} nonce={nonce} index={index} />
                        </div>

                        <div className="w-[100px]">
                              <OpenSelectedFileDetailsButton file={file} index={index} />
                        </div>

                        <div className="w-[100px]">
                              <ShareButton item={file} nonce={nonce} index={index} />
                        </div>

                        {/* Delete Button */}
                        <div className="w-[100px]">
                              <DeleteAquaChain apiFileInfo={file} backendUrl={backendUrl} nonce={nonce} revision="" index={index} />
                        </div>

                        {/* Download Button - Smaller width */}
                        <div className="w-[100px]">
                              <DownloadAquaChain file={file} index={index} />
                        </div>
                  </div>

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
                        <div className="flex flex-wrap gap-1">
                              {identityClaimfile ? (
                                    <div className="w-[202px]">
                                          <OpenClaimsWorkFlowButton item={identityClaimfile} nonce={nonce} index={index} />
                                    </div>
                              ) : null}
                              <div className="w-[100px]">
                                    <OpenSelectedFileDetailsButton file={file} index={index} />
                              </div>

                              <div className="w-[100px]">
                                    <ShareButton item={file} nonce={nonce} index={index} />
                              </div>

                              {/* Delete Button */}
                              <div className="w-[100px]">
                                    <DeleteAquaChain apiFileInfo={file} backendUrl={backendUrl} nonce={nonce} revision="" index={index} />
                              </div>

                              {/* Download Button - Smaller width */}
                              <div className="w-[100px]">
                                    <DownloadAquaChain file={file} index={index} />
                              </div>
                        </div>
                  </>
            )
      }
      const workFlowIdentityClaimActions = (workflowInfo: {
            isWorkFlow: boolean;
            workFlow: string;
      } | undefined) => {
            return (
                  <>
                        <div className="flex flex-wrap gap-1">
                              <div className="w-[202px]">
                                    <OpenClaimsWorkFlowButton item={file} nonce={nonce} index={index} />
                              </div>

                              {
                                    workflowInfo && workflowInfo.workFlow == 'identity_claim' && (
                                          <div className="w-[100px]">
                                                <AttestAquaClaim file={file} index={index} />
                                          </div>
                                    )
                              }


                              <div className="w-[100px]">
                                    <OpenSelectedFileDetailsButton file={file} index={index} />
                              </div>

                              <div className="w-[100px]">
                                    <ShareButton item={file} nonce={nonce} index={index} />
                              </div>

                              {/* Delete Button */}
                              <div className="w-[100px]">
                                    <DeleteAquaChain apiFileInfo={file} backendUrl={backendUrl} nonce={nonce} revision="" index={index} />
                              </div>

                              {/* Download Button - Smaller width */}
                              <div className="w-[100px]">
                                    <DownloadAquaChain file={file} index={index} />
                              </div>

                              {/* Link Button */}
                              <div className="w-[100px]">
                                    <LinkButton item={file} nonce={nonce} index={index} />
                              </div>
                        </div>
                  </>
            )
      }

      const showActionsButton = () => {
            if (filesListProps.showFileActions == false) {
                  return null
            }
            if (workflowInfo?.isWorkFlow == true && workflowInfo.workFlow == 'aqua_sign') {
                  return workFlowAquaSignActions()
            }
            if (workflowInfo?.isWorkFlow == true && (workflowInfo.workFlow == 'domain_claim' || workflowInfo.workFlow == 'identity_claim')) {
                  return workFlowIdentityClaimActions(workflowInfo)
            }

            if (workflowInfo?.isWorkFlow == true && workflowInfo.workFlow == 'identity_attestation') {
                  return workFlowIdentityClaimAttestationActions()
            }
            return workFileActions()
      }

      const workFileActions = () => {
            return (
                  <>
                        {/* Grid layout for action buttons with equal widths */}
                        <div className="flex flex-wrap gap-1">


                              {/* Details Button */}
                              <div className="w-[100px]">
                                    <OpenSelectedFileDetailsButton file={file} index={index} />
                              </div>

                              {/* Sign Button */}
                              <div className="w-[100px]">
                                    <SignAquaChain apiFileInfo={file} backendUrl={backendUrl} nonce={nonce} revision="" index={index} />
                              </div>

                              {/* Witness Button */}
                              <div className="w-[100px]">
                                    <WitnessAquaChain apiFileInfo={file} backendUrl={backendUrl} nonce={nonce} revision="" index={index} />
                              </div>

                              {/* Link Button */}
                              <div className="w-[100px]">
                                    <LinkButton item={file} nonce={nonce} index={index} />
                              </div>

                              {/* Share Button */}
                              <div className="w-[100px]">
                                    <ShareButton item={file} nonce={nonce} index={index} />
                              </div>

                              {/* Delete Button */}
                              <div className="w-[100px]">
                                    <DeleteAquaChain apiFileInfo={file} backendUrl={backendUrl} nonce={nonce} revision="" index={index} />
                              </div>

                              {/* Download Button */}
                              <div className="w-[100px]">
                                    <DownloadAquaChain file={file} index={index} />
                              </div>
                        </div>

                        {/* Third row - 1 smaller button */}
                        {/* <div className="flex">
                        
                    </div> */}
                  </>
            )
      }
      const renderTableView = () => {


            if (filesListProps.activeFile) {
                  if (getGenesisHash(filesListProps.activeFile.aquaTree!) == getGenesisHash(file.aquaTree!)) {
                        return null
                  }
            }
            return (
                  <tr key={index} onClick={(e) => {
                        if (filesListProps.showCheckbox != null && filesListProps.showCheckbox == true) {
                              // do nothing
                              e.stopPropagation();

                              let allGnesisHashes = filesListProps.selectedFiles.map(file => getGenesisHash(file.aquaTree!))
                              if (allGnesisHashes.includes(getGenesisHash(file.aquaTree!))) {
                                    // already selected, so deselect
                                    filesListProps.onFileDeSelected(file)
                              } else {
                                    // not selected, so select
                                    if (!showWorkFlowsOnly && workflowInfo?.isWorkFlow && workflowInfo.workFlow == 'aqua_sign') {

                                          toast.error("Aqua Sign workflows cannot be selected", {
                                                duration: 1500,
                                          })
                                          // do not allow selection of  aqua sign workflows
                                          return
                                    }
                                    filesListProps.onFileSelected(file)
                              }
                              return;
                        }
                  }} className="border-b border-gray-100 hover:bg-gray-50">
                        {filesListProps.showCheckbox != null && filesListProps.showCheckbox == true ? <td>

                              <div className="pt-0.5">
                                    <Checkbox
                                          id={`file-${index}`}
                                          checked={filesListProps.selectedFiles.map(file => getGenesisHash(file.aquaTree!)).includes(getGenesisHash(file.aquaTree!))}
                                          onCheckedChange={(checked: boolean) => {
                                                if (checked === true) {
                                                      // setLinkItem(itemLoop)
                                                      if (!showWorkFlowsOnly && workflowInfo?.isWorkFlow && workflowInfo.workFlow == 'aqua_sign') {
                                                            toast.error("Aqua Sign workflows cannot be selected")
                                                            // do not allow selection of  aqua sign workflows
                                                            return
                                                      } else {
                                                            filesListProps.onFileSelected(file)
                                                      }
                                                } else {
                                                      // setLinkItem(null)
                                                      filesListProps.onFileDeSelected(file)
                                                }
                                          }}
                                    />
                              </div>
                        </td> : null

                        }
                        <td className="py-3 flex items-center px-4">
                              {/* <FileText className="w-5 h-5 text-blue-500" /> */}
                              <div className="flex flex-col">
                                    <span className="font-medium text-sm">{getAquaTreeFileName(file.aquaTree!)}</span>
                                    {!showWorkFlowsOnly && workflowInfo?.isWorkFlow ? (
                                          <div className='mt-1'>
                                                <span className="text-xs text-gray-500">Workflow : {capitalizeWords(workflowInfo.workFlow.replace(/_/g, ' '))}</span>
                                                {showClaimExtraInfo()}
                                          </div>
                                    ) : null}
                              </div>
                        </td>

                        {showWorkFlowsOnly ? <td className="py-3 px-3 text-sm text-gray-500">{workflowInfo?.workFlow || 'Not a workflow'}</td> : null}
                        <td className="py-3 text-sm text-gray-500">{getFileCategory(getFileExtension(getAquaTreeFileName(file.aquaTree!)))}</td>
                        <td className="py-3 text-sm text-gray-500">
                              {(() => {
                                    const genRevision = getGenesisHash(file.aquaTree!)
                                    if (genRevision) {
                                          const timestamp = file.aquaTree?.revisions?.[genRevision]?.local_timestamp
                                          if (timestamp) {
                                                return displayTime(timestamp)
                                          }
                                    }
                                    return 'Not available'
                              })()}
                        </td>
                        <td className="py-3 text-sm text-gray-500">
                              {(() => {
                                    const fileObject = getAquaTreeFileObject(file)
                                    if (fileObject) {
                                          return formatBytes(fileObject.fileSize ?? 0)
                                    }
                                    return 'Not available'
                              })()}
                        </td>
                        <td className="py-3">{showActionsButton()}</td>
                  </tr>
            )
      }



      const showClaimExtraInfo = () => {
            if (workflowInfo?.workFlow == "user_profile") {
                  let genesisHash = getGenesisHash(file.aquaTree!)
                  if (!genesisHash) {
                        return <div />
                  }
                  let genRevision = file.aquaTree?.revisions[genesisHash]
                  if (!genRevision) {
                        return <div />
                  }
                  let creatorWallet = genRevision[`forms_wallet_address`]


                  if (creatorWallet) {
                        return <>

                              <div className="flex flex-nowrap   text-xs text-gray-500" style={{ alignItems: 'center' }}>
                                    <p className="text-xs ">Profile Owner   {session?.address === creatorWallet ? <>(You)</> : <></>}: &nbsp;</p>
                                    <WalletAdrressClaim walletAddress={creatorWallet} />

                              </div>

                        </>
                  }
            }
            if (workflowInfo?.workFlow == "identity_claim") {
                  let genesisHash = getGenesisHash(file.aquaTree!)
                  if (!genesisHash) {
                        return <div />
                  }
                  let genRevision = file.aquaTree?.revisions[genesisHash]
                  if (!genRevision) {
                        return <div />
                  }

                  let creatorWallet = genRevision[`forms_wallet_address`]
                  let name = genRevision[`forms_name`]

                  if (creatorWallet) {

                        return <>
                              <div className="flex flex-nowrap  text-xs text-gray-500">
                                    <p className="text-xs">Name: &nbsp;</p>
                                    <p className="text-xs ">{name}</p>
                              </div>
                              <div className="flex flex-nowrap   text-xs text-gray-500" style={{ alignItems: 'center' }}>
                                    <p className="text-xs ">Owner   {session?.address === creatorWallet ? <>(You)</> : <></>}: &nbsp;</p>
                                    <WalletAdrressClaim walletAddress={creatorWallet} />

                              </div>

                        </>
                  }
            }

            if (workflowInfo?.workFlow == "identity_attestation") {
                  let genesisHash = getGenesisHash(file.aquaTree!)
                  if (!genesisHash) {
                        return <div />
                  }
                  let genRevision = file.aquaTree?.revisions[genesisHash]
                  if (!genRevision) {
                        return <div />
                  }

                  let creatorWallet = genRevision[`forms_wallet_address`]
                  let claimWallet = genRevision[`forms_claim_wallet_address`]

                  if (creatorWallet) {
                        return <>
                              <div className="flex flex-nowrap  text-xs text-gray-500">
                                    <p className="text-xs">Claim  Owner: &nbsp;</p>
                                    <p className="text-xs ">{formatCryptoAddress(claimWallet)}</p>
                              </div>

                              <div className="flex flex-nowrap  text-xs text-gray-500">
                                    <p className="text-xs">Attestor Wallet: &nbsp;</p>
                                    <p className="text-xs ">{formatCryptoAddress(creatorWallet)}</p>
                              </div>
                        </>
                  }
            }

            if (workflowInfo?.workFlow == "domain_claim") {

                  let genesisHash = getGenesisHash(file.aquaTree!)
                  if (!genesisHash) {
                        return <div />
                  }
                  let genRevision = file.aquaTree?.revisions[genesisHash]
                  if (!genRevision) {
                        return <div />
                  }

                  let domain = genRevision[`forms_domain`]
                  let creatorWallet = genRevision[`forms_wallet_address`]

                  if (domain) {
                        return <>
                              <div className="flex flex-nowrap  text-xs text-gray-500">
                                    <p className="text-xs">Domain : &nbsp;</p>
                                    <p className="text-xs ">{domain}</p>
                              </div>
                              {
                                    creatorWallet ?
                                          <div className="flex flex-nowrap   text-xs text-gray-500" style={{ alignItems: 'center' }}>
                                                <p className="text-xs ">Owner   {session?.address === creatorWallet ? <>(You)</> : <></>}: &nbsp;</p>
                                                <WalletAdrressClaim walletAddress={creatorWallet} />

                                          </div> : null
                              }



                        </>

                  }

            }


            if (workflowInfo?.workFlow == "email_claim") {

                  let genesisHash = getGenesisHash(file.aquaTree!)
                  if (!genesisHash) {
                        return <div />
                  }
                  let genRevision = file.aquaTree?.revisions[genesisHash]
                  if (!genRevision) {
                        return <div />
                  }

                  let phoneNumber = genRevision[`forms_email`]

                  if (phoneNumber) {
                        return <div className="flex flex-nowrap  text-xs text-gray-500">
                              <p className="text-xs">Email Address : &nbsp;</p>
                              <p className="text-xs ">{phoneNumber}</p>
                        </div>

                  }

            }

            if (workflowInfo?.workFlow == "phone_number_claim") {

                  let genesisHash = getGenesisHash(file.aquaTree!)
                  if (!genesisHash) {
                        return <div />
                  }
                  let genRevision = file.aquaTree?.revisions[genesisHash]
                  if (!genRevision) {
                        return <div />
                  }

                  let phoneNumber = genRevision[`forms_phone_number`]

                  if (phoneNumber) {
                        return <div className="flex flex-nowrap  text-xs text-gray-500">
                              <p className="text-xs">Phone Number : &nbsp;</p>
                              <p className="text-xs ">{phoneNumber}</p>
                        </div>

                  }

            }


            if (workflowInfo?.workFlow == "user_signature") {
                  let genesisHash = getGenesisHash(file.aquaTree!)
                  if (!genesisHash) {
                        return <div />
                  }
                  let genRevision = file.aquaTree?.revisions[genesisHash]
                  if (!genRevision) {
                        return <div />
                  }

                  let createdAt = genRevision[`forms_created_at`]
                  let creatorWallet = genRevision[`forms_wallet_address`]

                  if (createdAt) {
                        return <>
                              {/* <div className="flex flex-nowrap  text-xs text-gray-500">
                                    <p className="text-xs">Created At : &nbsp;</p>
                                    <p className="text-xs ">{formatUnixTimestamp(createdAt, true)}</p>
                              </div> */}
                              {
                                    creatorWallet ?
                                          <div className="flex flex-nowrap   text-xs text-gray-500" style={{ alignItems: 'center' }}>
                                                <p className="text-xs ">Owner   {session?.address === creatorWallet ? <>(You)</> : <></>}: &nbsp;</p>
                                                <WalletAdrressClaim walletAddress={creatorWallet} />

                                          </div> : null
                              }



                        </>

                  }

            }

            //add  user signature
            return <div />
      }

      const renderCardView = () => {
            return (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                        {/* Header with file icon and name */}
                        <div className="flex items-start space-x-3 mb-4">
                              <div className="flex-shrink-0">
                                    <FileText className="w-8 h-8 text-blue-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-semibold text-gray-900 truncate">
                                          {getAquaTreeFileName(file.aquaTree!)}
                                    </h3>
                                    {!showWorkFlowsOnly && workflowInfo?.isWorkFlow && (


                                          <>
                                                <p className="text-sm text-blue-600 mt-1">
                                                      Workflow: {capitalizeWords(workflowInfo.workFlow.replace(/_/g, ' '))}
                                                </p>


                                          </>
                                    )}
                              </div>
                        </div>

                        {/* File details grid */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                              <div className="space-y-1">
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Type</p>
                                    <p className="text-sm text-gray-900 font-medium">
                                          {getFileCategory(getFileExtension(getAquaTreeFileName(file.aquaTree!)))}
                                    </p>
                              </div>
                              <div className="space-y-1">
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Size</p>
                                    <p className="text-sm text-gray-900 font-medium">{getFileInfo()}</p>
                              </div>
                              <div className="col-span-2 space-y-1">
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Uploaded</p>
                                    <p className="text-sm text-gray-900">{getTimeInfo()}</p>
                              </div>
                              {showWorkFlowsOnly && (
                                    <div className="col-span-2 space-y-1">
                                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Workflow Type</p>
                                          <p className="text-sm text-gray-900 font-medium">
                                                {workflowInfo?.workFlow ? capitalizeWords(workflowInfo.workFlow.replace(/_/g, ' ')) : 'Not a workflow'}
                                          </p>
                                    </div>
                              )}
                        </div>

                        {/* Actions section */}
                        <div className="border-t border-gray-100 pt-4">
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Actions</p>
                              <div className="flex flex-wrap gap-2">
                                    {showActionsButton()}
                              </div>
                        </div>
                  </div>
            )
      }

      if (workflowInfo === undefined) {
            return null
      }
      if (showWorkFlowsOnly && !workflowInfo?.isWorkFlow) {
            return null
      }

      // Then handle different view modes
      if (viewMode === 'table') {
            return renderTableView()
      } else if (viewMode === 'card') {
            return renderCardView()
      } else if (viewMode === 'actions-only') {
            return workFileActions()
      }

      return null

}
