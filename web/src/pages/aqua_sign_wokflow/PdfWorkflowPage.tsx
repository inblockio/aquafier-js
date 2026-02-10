import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '../../components/ui/alert'
import appStore from '../../store'
import { useStore } from 'zustand'
import { SummaryDetailsDisplayData, WorkFlowTimeLine } from '../../types/types'
import {
      convertTemplateNameToTitle,
      ensureDomainUrlHasSSL,
      getFileName,
      getHighestFormIndex,
      isAquaTree,
      parseAquaTreeContent
} from '../../utils/functions'
import { ContractDocumentView } from './ContractDocument/ContractDocument'
import { ContractSummaryView } from './ContractSummary/ContractSummary'
import { AquaTree, OrderRevisionInAquaTree, Revision } from 'aqua-js-sdk/web'
import { Button } from '../../components/ui/button'
import { LuArrowLeft } from 'react-icons/lu'
import { useNavigate, useParams } from 'react-router-dom'
import { HiDocumentText } from 'react-icons/hi'
import { FaCircleInfo } from 'react-icons/fa6'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { API_ENDPOINTS } from '@/utils/constants'
import apiClient from '@/api/axiosInstance'
import { ApiFileInfo } from '@/models/FileInfo'


export default function PdfWorkflowPage() {
      const [activeStep, setActiveStep] = useState(1)
      const [timeLineTitle, setTimeLineTitle] = useState('')
      const [error, _setError] = useState('')
      const [timeLineItems, setTimeLineItems] = useState<Array<WorkFlowTimeLine>>([])
      const { selectedFileInfo, setSelectedFileInfo, backend_url, session } = useStore(appStore)
      const [selectedFileInfoLocal, setSelectedFileInfoLocal] = useState<ApiFileInfo | null>(null)
      const [errorMessage, setErrorMessage] = useState<string | null>(null)
      const [loadingFromApiSelectedFileInfo, setLoadingFromApiSelectedFileInfo] = useState(false)

      const navigate = useNavigate()

      const { page, genesisHash } = useParams();

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
                        // (`revisionHashes  ${revisionHashes} --  ${typeof revisionHashes}`)
                        // (`fourthItmeHashOnwards  ${fourthItmeHashOnwards}`)
                        signatureRevionHashes = getSignatureRevionHashes(fourthItmeHashOnwards)
                        // (`signatureRevionHashes  ${JSON.stringify(signatureRevionHashes, null, 4)}`)

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

      function loadTimeline() {
            const items: Array<WorkFlowTimeLine> = []

            if (!selectedFileInfoLocal) {
                  return items
            }

            items.push({
                  id: 1,
                  completed: true,
                  content: (
                        <ContractSummaryView
                              selectedFileInfo={selectedFileInfoLocal}
                              setActiveStep={(index: number) => {
                                    setActiveStep(index)
                              }}
                        />
                  ),
                  icon: FaCircleInfo,
                  revisionHash: '',
                  title: 'Contract Information',
                  description: 'View and edit contract information'
            })

            items.push({
                  id: 2,
                  completed: computeIsWorkflowCOmplete(),
                  content: (
                        <ContractDocumentView
                              selectedFileInfo={selectedFileInfoLocal}
                              setActiveStep={(index: number) => {
                                    setActiveStep(index)
                              }}
                        />
                  ),
                  icon: HiDocumentText,
                  revisionHash: '',
                  title: 'Contract Document',
                  description: 'View and edit contract document'
            })

            setTimeLineItems(items)
      }

      const loadData = () => {
            if (selectedFileInfoLocal) {
                  const workflowName = getFileName(selectedFileInfoLocal.aquaTree!)

                  setTimeLineTitle(convertTemplateNameToTitle(workflowName))

                  computeIsWorkflowCOmplete()

                  loadTimeline()
            }
      }

      const updateStepOnPageParam = () => {
            if (page && timeLineItems.length > 0) {
                  let pageNumber = parseInt(page);
                  if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > timeLineItems.length) {
                        pageNumber = 1; // Default to 1 if invalid
                  }
                  setActiveStep(pageNumber);
            }
      }


      useEffect(() => {
            if (selectedFileInfoLocal == null && genesisHash == undefined) {

                  setErrorMessage("No file selected and no genesis hash provided.")
                  return
            }

            if (selectedFileInfoLocal == null) {


                  // Fetch the file info from the API using the genesisHash


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
                              // if (files.length === 0) {
                              //       setErrorMessage("No file found for the provided genesis hash.")
                              //       setLoadingFromApiSelectedFileInfo(false)
                              //       return
                              // }
                              // const fileInfoFromApi: ApiFileInfo = files[0];
                              setSelectedFileInfoLocal(fileInfoFromApi)
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
            if (page && timeLineItems.length > 0) {
                  updateStepOnPageParam()
            }
      }, [page, timeLineItems.length])

      useEffect(() => {
            loadData()
      }, [JSON.stringify(selectedFileInfoLocal)])

      // Find the currently active content
      const activeContent = () => {
            return timeLineItems.find(item => item.id === activeStep)?.content
      }

      const aquaTreeTimeLine = () => {
            return (
                  <div className="container mx-auto py-4 px-1 md:px-4">
                        <div className="flex flex-col gap-10">
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


                              {/* <div className="grid grid-cols-2 gap-6 mb-8"> */}
                              <div className="flex gap-6">
                                    {timeLineItems.map((tab, index) => {
                                          const isActive = activeStep === tab.id;
                                          const isCompleted = index === 0 && activeStep === 2;
                                          const Icon = tab.icon;

                                          return (
                                                <button
                                                      key={tab.id}
                                                      onClick={() => setActiveStep(tab.id)}
                                                      className={`relative p-6 rounded-xl transition-all duration-200 text-left cursor-pointer ${isActive
                                                            ? 'bg-blue-500 shadow-lg shadow-blue-500/30'
                                                            : false
                                                                  ? 'bg-white shadow-md hover:shadow-lg border-2 border-green-500'
                                                                  : 'bg-white shadow-md hover:shadow-lg'
                                                            }`}
                                                >
                                                      {/* Completion Badge */}
                                                      {isCompleted && (
                                                            <div className="absolute -top-3 -right-3 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                                                                  <Check className="w-6 h-6 text-white" />
                                                            </div>
                                                      )}

                                                      <div className="flex items-start gap-4">
                                                            {/* Icon */}
                                                            <div
                                                                  className={`w-14 h-14 rounded-lg flex items-center justify-center shrink-0 ${isActive
                                                                        ? 'bg-blue-600'
                                                                        : isCompleted
                                                                              ? 'bg-green-50'
                                                                              : 'bg-gray-100'
                                                                        }`}
                                                            >
                                                                  <Icon
                                                                        className={`w-7 h-7 ${isActive
                                                                              ? 'text-white'
                                                                              : isCompleted
                                                                                    ? 'text-green-600'
                                                                                    : 'text-gray-600'
                                                                              }`}
                                                                  />
                                                            </div>

                                                            {/* Content */}
                                                            <div className="flex-1">
                                                                  <h3
                                                                        className={`text-lg font-semibold mb-1 ${isActive ? 'text-white' : 'text-gray-900'
                                                                              }`}
                                                                  >
                                                                        {tab.title}
                                                                  </h3>
                                                                  <p
                                                                        className={`text-sm ${isActive ? 'text-blue-100' : 'text-gray-500'
                                                                              }`}
                                                                  >
                                                                        {tab.description}
                                                                  </p>
                                                            </div>

                                                            {/* Active Indicator */}
                                                            {isActive && (
                                                                  <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                                                            )}
                                                      </div>
                                                </button>
                                          );
                                    })}
                              </div>

                              {/* Content Area */}
                              <div className="p-0">{activeContent()}</div>
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
            // if (selectedFileInfoLocal == null) {
            //       return (
            //             <Alert variant="destructive">
            //                   <AlertDescription>Selected file not found</AlertDescription>
            //             </Alert>
            //       )
            // }

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
            

            

            return aquaTreeTimeLine()
      }

      return <div className="w-full">{workFlowPageData()}</div>
}
