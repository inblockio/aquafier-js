import React, { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '../../components/ui/alert'
import appStore from '../../store'
import { useStore } from 'zustand'
import {
      convertTemplateNameToTitle,
      ensureDomainUrlHasSSL,
      getFileName,
      getHighestFormIndex,
      isAquaTree,
      parseAquaTreeContent
} from '../../utils/functions'
import { ContractDocumentView } from './document/ContractDocumentView'
import { ContractSummaryView } from './summary/ContractSummaryView'
import { AquaTree, OrderRevisionInAquaTree, Revision } from 'aqua-js-sdk/web'
import { Button } from '../../components/ui/button'
import { LuArrowLeft } from 'react-icons/lu'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { API_ENDPOINTS } from '@/utils/constants'
import apiClient from '@/api/axiosInstance'
import { ApiFileInfo } from '@/models/FileInfo'
import { SummaryDetailsDisplayData } from '../../types/types'


export default function PdfWorkflowPage() {
      const [timeLineTitle, setTimeLineTitle] = useState('')
      const [error, _setError] = useState('')
      const { selectedFileInfo, setSelectedFileInfo, backend_url, session } = useStore(appStore)
      const [selectedFileInfoLocal, setSelectedFileInfoLocal] = useState<ApiFileInfo | null>(null)
      const [errorMessage, setErrorMessage] = useState<string | null>(null)
      const [loadingFromApiSelectedFileInfo, setLoadingFromApiSelectedFileInfo] = useState(false)
      const [signerSidebar, setSignerSidebar] = useState<React.ReactNode>(null)

      const navigate = useNavigate()

      const { genesisHash } = useParams();

      const getSignatureRevionHashes = (hashesToLoopPar: Array<string>): Array<SummaryDetailsDisplayData> => {
            const signatureRevionHashes: Array<SummaryDetailsDisplayData> = []

            for (let i = 0; i < hashesToLoopPar.length; i += 3) {
                  const batch = hashesToLoopPar.slice(i, i + 3)

                  let signaturePositionCount = 0
                  const hashSigPosition = batch[0] ?? ''
                  const hashSigRev = batch[1] ?? ''
                  const hashSigMetamak = batch[2] ?? ''
                  let walletAddress = ''

                  if (hashSigPosition.length > 0) {
                        const allAquaTrees = selectedFileInfoLocal?.fileObject.filter(e => isAquaTree(e.fileContent))

                        const hashSigPositionHashString = selectedFileInfoLocal!.aquaTree!.revisions[hashSigPosition].link_verification_hashes![0]

                        if (allAquaTrees) {
                              for (const anAquaTreeFileObject of allAquaTrees) {
                                    const aquaTreeData = parseAquaTreeContent(anAquaTreeFileObject.fileContent) as AquaTree
                                    if (!aquaTreeData || !aquaTreeData.revisions) {
                                          toast.error("Error parsing AquaTree from file object.");
                                          continue
                                    }
                                    const allHashes = Object.keys(aquaTreeData.revisions)
                                    if (allHashes.includes(hashSigPositionHashString)) {
                                          const revData = aquaTreeData.revisions[hashSigPositionHashString]
                                          signaturePositionCount = getHighestFormIndex(revData)

                                          break
                                    }
                              }
                        }
                  }

                  const metaMaskRevision = selectedFileInfoLocal!.aquaTree!.revisions[hashSigMetamak]
                  if (metaMaskRevision) {
                        walletAddress = metaMaskRevision.signature_wallet_address ?? ''
                  }
                  const data: SummaryDetailsDisplayData = {
                        revisionHashWithSignaturePositionCount: signaturePositionCount,
                        revisionHashWithSignaturePosition: hashSigPosition,
                        revisionHashWithSinatureRevision: hashSigRev,
                        revisionHashMetamask: hashSigMetamak,
                        walletAddress: walletAddress,
                  }

                  signatureRevionHashes.push(data)
            }

            return signatureRevionHashes
      }

      function computeIsWorkflowCOmplete(): boolean {
            if (selectedFileInfoLocal) {
                  const orderedTree = OrderRevisionInAquaTree(selectedFileInfoLocal!.aquaTree!)

                  const revisions = orderedTree.revisions
                  const revisionHashes = Object.keys(revisions)

                  const firstHash: string = revisionHashes[0]
                  const firstRevision: Revision = selectedFileInfoLocal!.aquaTree!.revisions[firstHash]

                  const signers: string[] = firstRevision?.forms_signers.split(',')

                  let signatureRevionHashesData: Array<SummaryDetailsDisplayData> = []
                  let fourthItmeHashOnwards: string[] = []
                  let signatureRevionHashes: Array<SummaryDetailsDisplayData> = []

                  if (revisionHashes.length > 4) {
                        // remove the first 4 elements from the revision list
                        fourthItmeHashOnwards = revisionHashes.slice(4)
                        signatureRevionHashes = getSignatureRevionHashes(fourthItmeHashOnwards)

                        signatureRevionHashesData = signatureRevionHashes
                  }

                  const signatureRevionHashesDataAddress = signatureRevionHashesData.map(e => e.walletAddress)
                  const remainSigners = signers.filter(item => !signatureRevionHashesDataAddress.includes(item))

                  if (remainSigners.length > 0) {
                        return false
                  } else {
                        return true
                  }
            } else {
                  return false
            }
      }

      const loadData = () => {
            if (selectedFileInfoLocal) {
                  const workflowName = getFileName(selectedFileInfoLocal.aquaTree!)

                  setTimeLineTitle(convertTemplateNameToTitle(workflowName))

                  computeIsWorkflowCOmplete()
            }
      }

      useEffect(() => {
            if (selectedFileInfoLocal == null && genesisHash == undefined) {

                  setErrorMessage("No file selected and no genesis hash provided.")
                  return
            }

            if (selectedFileInfoLocal == null) {

                  const fetchSelectedFileInfo = async () => {
                        const targetHash = genesisHash!;
                        setLoadingFromApiSelectedFileInfo(true)
                        try {
                              const url = ensureDomainUrlHasSSL(`${backend_url}/${API_ENDPOINTS.GET_AQUA_TREE}`)
                              const res = await apiClient.post(url, {
                                    revisionHashes: [targetHash]
                              }, {
                                    headers: {
                                          'Content-Type': 'application/json',
                                          nonce: session?.nonce,
                                    },
                              })

                              let fileInfoFromApi: ApiFileInfo = res.data.data;
                              setSelectedFileInfoLocal(fileInfoFromApi)
                              setSelectedFileInfo(fileInfoFromApi)
                        } catch (error) {
                              console.error("Error fetching file info from API:", error)
                              setErrorMessage("Error fetching file info from server.")
                        } finally {
                              setLoadingFromApiSelectedFileInfo(false)
                        }
                  }
                  fetchSelectedFileInfo()
            }else {
                  setSelectedFileInfoLocal(selectedFileInfo)
            }
      }, [])

      useEffect(() => {
            if(selectedFileInfo){
                  setSelectedFileInfoLocal(selectedFileInfo)
            }
      }, [JSON.stringify(selectedFileInfo)])

      useEffect(() => {
            loadData()
      }, [JSON.stringify(selectedFileInfoLocal)])

      const noOp = (_step: number) => {}

      const pageContent = () => {
            return (
                  <div className="container mx-auto py-4 px-1 md:px-4">
                        <div className="flex flex-col gap-6">
                              <div className="container">
                                    <div className="flex items-center justify-between">
                                          <div></div>
                                          <h1 className="text-center text-2xl font-bold">{timeLineTitle}</h1>
                                          <Button
                                                variant="outline"
                                                onClick={() => {
                                                      setSelectedFileInfoLocal(null)
                                                      setSelectedFileInfo(null)
                                                      navigate('/app', { replace: true })
                                                }}
                                                className="cursor-pointer"
                                          >
                                                <LuArrowLeft className="mr-2 h-4 w-4" /> Go Home
                                          </Button>
                                    </div>
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-2">
                                          <ContractDocumentView
                                                selectedFileInfo={selectedFileInfoLocal!}
                                                setActiveStep={noOp}
                                                onSidebarReady={setSignerSidebar}
                                          />
                                    </div>
                                    <div className="lg:col-span-1">
                                          {signerSidebar}
                                          <ContractSummaryView
                                                selectedFileInfo={selectedFileInfoLocal!}
                                                setActiveStep={noOp}
                                          />
                                    </div>
                              </div>
                        </div>
                  </div>
            )
      }

      const workFlowPageData = () => {
            if (error.length > 0) {
                  return (
                        <Alert variant="destructive">
                              <AlertDescription>{error}</AlertDescription>
                        </Alert>
                  )
            }
            if (loadingFromApiSelectedFileInfo) {
                  return (
                        <div className="flex justify-center items-center h-64">
                              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
                        </div>
                  )
            }

            if (errorMessage) {
                  return (
                        <Alert variant="destructive">
                              <AlertDescription>{errorMessage}</AlertDescription>
                        </Alert>
                  )
            }

            if (selectedFileInfoLocal == null) {
                        return (
                              <Alert variant="destructive">
                                    <AlertDescription>Selected File not found.</AlertDescription>
                              </Alert>
                        )
                  }

            return pageContent()
      }

      return <div className="w-full">{workFlowPageData()}</div>
}
