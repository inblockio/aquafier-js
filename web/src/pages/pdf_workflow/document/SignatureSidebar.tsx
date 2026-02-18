import React from 'react'
import { useStore } from 'zustand'
import { FaPlus } from 'react-icons/fa'
import { LuInfo, LuTrash } from 'react-icons/lu'

import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import appStore from '@/store'
import { ApiFileInfo } from '@/models/FileInfo'
import { SignatureData } from '@/types/types'
import { ensureDomainUrlHasSSL } from '@/utils/functions'
import WalletAddressClaim from '../../v2_claims_workflow/WalletAddressClaim'

interface SignatureSidebarProps {
      signers: string[]
      allSignersBeforeMe: string[]
      mySignaturesAquaTree: ApiFileInfo[]
      mySignatureData: SignatureData[]
      selectedSignatureId: string | null
      canPlaceSignature: boolean
      signaturePositions: SignatureData[]
      submittingSignatureData: boolean
      setSelectedTool: React.Dispatch<React.SetStateAction<'text' | 'image' | 'profile' | 'signature' | null>>
      setCanPlaceSignature: React.Dispatch<React.SetStateAction<boolean>>
      setSignaturePositions: React.Dispatch<React.SetStateAction<SignatureData[]>>
      handleSignatureSubmission: () => Promise<void>
}

export const SignatureSidebar: React.FC<SignatureSidebarProps> = ({
      signers,
      allSignersBeforeMe,
      mySignaturesAquaTree,
      mySignatureData,
      selectedSignatureId,
      canPlaceSignature,
      signaturePositions,
      submittingSignatureData,
      setSelectedTool,
      setCanPlaceSignature,
      setSignaturePositions,
      handleSignatureSubmission,
}) => {
      const { session, setOpenDialog } = useStore(appStore)

      const renderProfileAnnotationEditor = () => {
            return (
                  <>
                        {signaturePositions.length > 0 && (
                              <>
                                    {/* Signatures on Document section */}
                                    <div className="max-h-[150px] overflow-y-auto border border-gray-200 rounded-md">
                                          <div className="flex flex-col">
                                                {signaturePositions.map(position => {
                                                      return (
                                                            <div key={position.id} className="p-2 flex justify-between items-center">
                                                                  <div className="flex items-center space-x-2">
                                                                        <div
                                                                              className="w-[40px] h-[30px] bg-contain bg-no-repeat bg-center border border-gray-200 rounded-sm"
                                                                              style={{
                                                                                    backgroundImage: `url(${position.dataUrl})`,
                                                                              }}
                                                                        />
                                                                        <p className="text-xs">
                                                                              {position.name} (Page {position.page})
                                                                        </p>

                                                                        <Button
                                                                              variant="outline"
                                                                              size="icon"
                                                                              className="h-6 w-6 p-0"
                                                                              onClick={e => {
                                                                                    e.preventDefault()

                                                                                    const newData: SignatureData[] = []
                                                                                    for (const item of signaturePositions) {
                                                                                          if (item.id != position.id) {
                                                                                                newData.push(item)
                                                                                          }
                                                                                    }
                                                                                    setSignaturePositions(newData)
                                                                              }}
                                                                        >
                                                                              <LuTrash className="h-3 w-3 text-red-500" />
                                                                        </Button>
                                                                  </div>
                                                            </div>
                                                      )
                                                })}
                                          </div>
                                    </div>
                              </>
                        )}
                  </>
            )
      }

      const annotationSidebar = () => {
            return (
                  <div className="w-full bg-card border-l rounded-xl p-4 h-full flex flex-col">
                        <div className="space-y-2">
                              <div className="flex items-center justify-between pb-2">
                                    <h3 className="text-base font-medium">Signatures in Document.</h3>
                              </div>
                              <div>{signaturePositions.length > 0 ? <>{renderProfileAnnotationEditor()}</> : <p className="text-muted-foreground text-sm text-center py-4">No signatures yet.</p>}</div>
                        </div>
                  </div>
            )
      }

      const isInSinatures = signers.find(e => {
            const res = e.toLowerCase().trim() == session!.address.toLowerCase().trim()
            return res
      })

      if (signers.length == 0) {
            return <p className="text-sm">Signers for document workflow not found</p>
      }

      if (isInSinatures == undefined) {
            return (
                  <div className="flex flex-col space-y-3">
                        <h4 className="text-md font-medium">Signers</h4>
                        <div className="space-y-2">
                              {signers.map((e) => {
                                    return (
                                          <div key={`address_${e}`} className="bg-background shadow-sm p-2 rounded-sm">
                                                <WalletAddressClaim walletAddress={e} />
                                          </div>
                                    )
                              })}
                        </div>
                  </div>
            )
      }

      if (allSignersBeforeMe.length > 0) {
            return (
                  <div className="flex flex-col gap-2 p-0 border border-gray-100 dark:border-gray-800 rounded-md">
                        <p className="text-md">The following wallet address need to sign before you can.</p>

                        <div className="p-2 space-y-2">
                              {allSignersBeforeMe.map((e, index) => {
                                    return (
                                          <div key={e} className="bg-background shadow-sm p-2 rounded-sm">
                                                <div className="flex items-center space-x-1">
                                                      <span className="text-xs">{index + 1}.</span>
                                                      <WalletAddressClaim walletAddress={e} />
                                                </div>
                                          </div>
                                    )
                              })}
                        </div>
                  </div>
            )
      }

      return (
            <div className="col-span-12 md:col-span-1  overflow-hidden md:overflow-auto">
                  <div className="flex flex-col gap-4 p-4 border border-gray-100 dark:border-gray-800 rounded-md">
                        {mySignaturesAquaTree.length === 0 && (
                              <Button data-testid="action-create-signature-button" className="flex items-center gap-2" onClick={() => {
                                    setOpenDialog({ dialogType: 'user_signature', isOpen: true, onClose: () => setOpenDialog(null), onConfirm: () => { } })
                              }}>
                                    <FaPlus className="h-4 w-4" />
                                    Create Signature
                              </Button>
                        )}

                        {/* Signature List */}
                        {mySignaturesAquaTree.length > 0 && (
                              <>
                                    <div className="space-y-2">
                                          <h4 className="font-bold mt-2">Your Signatures: </h4>
                                          <div className="max-h-[200px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
                                                <div className="flex flex-col">
                                                      {(() => {
                                                            const signature = mySignatureData.find(sig => sig.hash === selectedSignatureId || sig.id === selectedSignatureId)
                                                            if (!signature) {
                                                                  return (
                                                                        <div
                                                                              style={{
                                                                                    whiteSpace: 'pre-wrap',
                                                                              }}
                                                                        >
                                                                              Signature not found{' '}
                                                                        </div>
                                                                  )
                                                            }

                                                            return signature ? (
                                                                  <div key={signature.hash} className="p-2 cursor-pointer bg-blue-50 hover:bg-gray-50">
                                                                        <div className="flex items-center space-x-3">

                                                                              <div data-Id={signature.dataUrl}
                                                                                    className="w-[80px] min-w-[80px] h-[40px] min-h-[40px] bg-contain bg-no-repeat bg-center border border-gray-200 rounded-sm"
                                                                                    style={{
                                                                                          backgroundImage: `url(${ensureDomainUrlHasSSL(signature.dataUrl)})`,
                                                                                    }}
                                                                              />
                                                                              <div className="flex flex-col flex-1 overflow-hidden space-y-0">
                                                                                    <p className="text-sm font-medium">{signature.name}</p>
                                                                                    <WalletAddressClaim walletAddress={signature.walletAddress} />
                                                                              </div>
                                                                        </div>
                                                                  </div>
                                                            ) : null
                                                      })()}
                                                </div>
                                          </div>
                                    </div>
                              </>
                        )}

                        <Button
                              data-testid="action-signature-to-document-button"
                              onClick={() => {
                                    setSelectedTool('signature')
                                    setCanPlaceSignature(true)
                              }}
                        >
                              Place Signature
                        </Button>

                        {canPlaceSignature ? (
                              <Alert className="" variant={"destructive"}>
                                    <LuInfo />
                                    <AlertDescription>Click on the document to place your signature.</AlertDescription>
                              </Alert>
                        ) : null}


                        {annotationSidebar()}

                        <Button
                              data-testid="action-sign-document-button"
                              disabled={signaturePositions.length === 0 || submittingSignatureData}
                              onClick={handleSignatureSubmission}
                              className={signaturePositions.length === 0 || submittingSignatureData ? '' : 'bg-green-600 hover:bg-green-700 text-white'}
                        >
                              Sign document..
                        </Button>
                  </div>
            </div>
      )
}

export default SignatureSidebar
