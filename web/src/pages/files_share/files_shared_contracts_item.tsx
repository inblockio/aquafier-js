import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CircleCheckBigIcon, Hash, Users, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useStore } from 'zustand'
import appStore from '@/store'
import { arraysEqualIgnoreOrder, formatCryptoAddress, getGenesisHash, timeToHumanFriendly } from '@/utils/functions'
import { Contract } from '@/types/types'
import WalletAddresClaim from "../v2_claims_workflow/WalletAdrressClaim"
import { toast } from 'sonner'
import { ApiFileInfo } from '@/models/FileInfo'
import { ImportAquaChainFromChain } from '@/components/dropzone_file_actions/import_aqua_tree_from_aqua_tree'
import { API_ENDPOINTS, SYSTEM_WALLET_ADDRESS } from '@/utils/constants'


export const SharedContract = ({ type, contract, index, contractDeleted }: { type: 'outgoing' | 'incoming', contract: Contract; index: number; contractDeleted: (hash: string) => void }) => {
      const navigate = useNavigate()
      const [loading, setLoading] = useState(false)
      const [exactMatchFound, setExactMatchFound] = useState<boolean>(false)
      const [loadingSharedFileData, setLoadingSharedFileData] = useState(true)
      const [genesisMatch, setGenesisMatch] = useState(false)
      const { backend_url, session } = useStore(appStore)


      const [fileInfo, setFileInfo] = useState<ApiFileInfo | null>(null)
      const [contractData, setContractData] = useState<any | null>(null)

      const getStatusFromLatest = (latest?: string) => {
            if (!latest) return 'unknown'
            try {
                  const parsed = JSON.parse(latest)
                  return parsed.status || 'unknown'
            } catch {
                  return 'unknown'
            }
      }

      const getStatusColor = (status: string) => {
            switch (status) {
                  case 'active':
                        return 'bg-green-100 text-green-800 border-green-200'
                  case 'pending':
                        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
                  case 'completed':
                        return 'bg-blue-100 text-blue-800 border-blue-200'
                  default:
                        return 'bg-gray-100 text-gray-800 border-gray-200'
            }
      }

      async function deleteContract() {
            setLoading(true)
            try {
                  const response = await axios.delete(`${backend_url}/contracts/${contract.hash}`, {
                        headers: {
                              nonce: session?.nonce,
                        }
                  })

                  if (response.status === 200 || response.status === 201) {
                        contractDeleted(contract.hash)
                        toast.success('Contract deleted successfully')
                  }
                  setLoading(false)
            } catch (error: any) {
                  toast.error('Error deleting contract:', error)
                  setLoading(false)
            }
      }



      const loadPageData = async () => {
            try {
                  setLoadingSharedFileData(true)
                  const url = `${backend_url}/share_data/${contract.hash}`
                  const response = await axios.get(url, {
                        headers: {
                              'Content-Type': 'application/x-www-form-urlencoded',
                              nonce: session?.nonce ?? '',
                        },
                  })


                  let apiFile = response.data.data.displayData[0] as ApiFileInfo


                  if (apiFile) {
                        setContractData(response.data.data.contractData)
                        setFileInfo(apiFile)

                        //check if file is already imported
                        let contractFileGenHash = getGenesisHash(apiFile.aquaTree!)


                        try {
                              // fetch my aqaua tree using gen hash

                              const url = `${backend_url}/${API_ENDPOINTS.GET_AQUA_TREE}`
                              const res = await axios.post(url, {
                                    revisionHashes: [contractFileGenHash]
                              }, {
                                    headers: {
                                          'Content-Type': 'application/json',
                                          nonce: session?.nonce,
                                    },
                              })
                              if (res.status === 200) {
                                    // setExistingChainFile(res.data.data)
                                    // setHasFetchedanyExistingChain(true)
                                    let fileItem = res.data.data

                                    let currentGeesisHash = getGenesisHash(fileItem.aquaTree!)

                                    if (currentGeesisHash == contractFileGenHash) {

                                          setGenesisMatch(true)

                                          //check if all hashes match
                                          let allHashesInFileItem = Object.keys(fileItem.aquaTree!.revisions)
                                          let allHashesInContract = Object.keys(apiFile.aquaTree!.revisions)

                                          let allHashesMatch = arraysEqualIgnoreOrder(allHashesInFileItem, allHashesInContract)
                                          if (allHashesMatch) {
                                                setExactMatchFound(true)
                                          }
                                          //file exist
                                         // break;
                                    }
                              }


                        } catch (error: any) {

                              if (error.response.status == 401) {
                              } else if (error.response.status == 404) {
                                    toast.error(`File could not be found (probably it was deleted)`)
                              } else if (error.response.status == 412) {
                                    toast.error(`File not found or no permission for access granted.`)
                              } else {
                                    toast.error(`Error : ${error}`)
                              }
                              console.error(error)

                              toast.error(`Error fetching my aqua tree data`)
                        }

                        // for (let fileItem of files.fileData) {


                        // }
                  }

                  setLoadingSharedFileData(false)
            } catch (error: any) {
                  if (error.response.status == 401) {
                  } else if (error.response.status == 404) {
                        toast.error(`File could not be found (probably it was deleted)`)
                  } else if (error.response.status == 412) {
                        toast.error(`File not found or no permission for access granted.`)
                  } else {
                        toast.error(`Error : ${error}`)
                  }
                  console.error(error)

                  toast.error(`Error fetching data`)
            }

      }
      useEffect(() => {

            if (contract.hash) {
                  loadPageData()
            }
      }, [])


      return (
            <Card key={contract.hash} className="hover:shadow-md transition-shadow cursor-pointer border border-gray-200 " style={{ marginTop: '10px', marginBottom: '10px' }}>
                  <CardContent className="p-2 sm:p-6">
                        <div className="flex items-start justify-between relative">
                              <div className="flex-1 space-y-4">
                                    {/* Contract Hash */}
                                    <div className="flex items-center gap-3 align-center">
                                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                                <Hash className="h-3 text-gray-600" />
                                          </div>
                                          <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                      <span className="text-xs sm:text-sm font-medium text-gray-900 font-mono max-w-[120px] sm:max-w-none truncate">File Name: </span>
                                                      <code className="text-xs sm:text-sm font-mono bg-gray-100 px-1 sm:px-2 py-1 rounded break-all sm:break-words sm:max-w-none overflow-hidden text-ellipsis">
                                                            {/* {formatCryptoAddress(contract.hash, 10, 10)} */}
                                                            {contract.file_name}
                                                      </code>
                                                      {/* <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            copyToClipboard(contract.hash);
                                        }}
                                        className="h-6 w-6 p-0"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </Button> */}
                                                </div>
                                                {contract.created_at ? <p className="text-xs text-gray-500 mt-1">{timeToHumanFriendly(contract.created_at, true)}</p> : null}
                                          </div>
                                    </div>

                                    {/* Participants */}
                                    <div className="">
                                          {/* Create me a grid here */}
                                          <div className="grid grid-cols-2 gap-4">
                                                {/* Create me the two cols */}
                                                <div>
                                                      <TooltipProvider>
                                                            <Tooltip>
                                                                  <TooltipTrigger asChild>
                                                                        <div className="flex items-center gap-2">
                                                                              <Avatar className="w-6 h-6">
                                                                                    <AvatarFallback className="text-xs bg-blue-100 text-blue-600">
                                                                                          <Wallet className="w-4 h-4" />
                                                                                    </AvatarFallback>
                                                                              </Avatar>
                                                                              <div>
                                                                                    <p className="text-xs sm:text-sm font-medium text-gray-900 font-mono max-w-[120px] sm:max-w-none truncate">
                                                                                          {/* {formatCryptoAddress(contract.sender, 10, 10)} */}
                                                                                          <WalletAddresClaim walletAddress={contract.sender!} isShortened={true} />
                                                                                    </p>
                                                                                    <p className="text-xs text-gray-500">Sender</p>
                                                                              </div>
                                                                        </div>
                                                                  </TooltipTrigger>
                                                                  <TooltipContent>
                                                                        <p className="font-mono text-xs">{contract.sender}</p>
                                                                  </TooltipContent>
                                                            </Tooltip>
                                                      </TooltipProvider>
                                                </div>
                                                <div>
                                                      <h3 className="text-md text-gray-900  break-words">Receivers</h3>
                                                      <div className="flex flex-col gap-2">
                                                            {/* {contract.recipients.map((recipient, _idx) => (
                                                                  <TooltipProvider>
                                                                        <Tooltip>
                                                                              <TooltipTrigger asChild>
                                                                                    <div className="flex items-center gap-2">
                                                                                          <>
                                                                                                <Avatar className="w-6 h-6">
                                                                                                      <AvatarFallback className="text-xs bg-green-100 text-green-600">
                                                                                                            <Wallet className="w-4 h-4" />
                                                                                                      </AvatarFallback>
                                                                                                </Avatar>
                                                                                                <div>
                                                                                                      <p className="text-xs break-words sm:text-sm font-medium text-gray-900 font-mono max-w-[120px] sm:max-w-none truncate">
                                                                                                            <WalletAddresClaim walletAddress={recipient} isShortened={false} />
                                                                                                      </p>
                                                                                                </div>
                                                                                          </>
                                                                                    </div>
                                                                              </TooltipTrigger>
                                                                              <TooltipContent>
                                                                                    <p className="font-mono text-xs">{recipient}</p>
                                                                              </TooltipContent>
                                                                        </Tooltip>
                                                                  </TooltipProvider>
                                                            ))} */}
                                                            {contract.recipients.map((recipient, _idx) => (
                                                                  <div key={`${recipient}-${_idx}`} className="flex items-center gap-2">
                                                                        <>
                                                                              <Avatar className="w-6 h-6">
                                                                                    <AvatarFallback className="text-xs bg-green-100 text-green-600">
                                                                                          <Wallet className="w-4 h-4" />
                                                                                    </AvatarFallback>
                                                                              </Avatar>
                                                                              <div>
                                                                                    <p className="text-xs break-words sm:text-sm font-medium text-gray-900 font-mono max-w-[120px] sm:max-w-none truncate">
                                                                                          {/* {formatCryptoAddress(contract.receiver)} */}
                                                                                          {
                                                                                                recipient == SYSTEM_WALLET_ADDRESS ? <>Many potential receivers - file shared by link.</> :
                                                                                                      <WalletAddresClaim walletAddress={recipient} isShortened={false} />
                                                                                          }

                                                                                    </p>
                                                                              </div>
                                                                        </>
                                                                  </div>
                                                            ))}
                                                      </div>
                                                </div>
                                          </div>
                                    </div>

                                    {/* Status and Details */}
                                    <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2">
                                          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                                                <Badge
                                                      variant="outline"
                                                      className={`${getStatusColor(getStatusFromLatest(contract.latest))} text-xs whitespace-normal max-w-[150px] sm:max-w-none px-2`}
                                                >
                                                      {formatCryptoAddress(contract.latest, 5, 6)}
                                                </Badge>

                                                {contract.option && (
                                                      <div className="flex items-center gap-1 text-sm text-gray-600">
                                                            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                                                            <span className="capitalize">{contract.option}</span>
                                                      </div>
                                                )}

                                                {contract.reference_count !== undefined && (
                                                      <div className="flex items-center gap-1 text-sm text-gray-600">
                                                            <Users className="w-4 h-4" />
                                                            <span>{contract.reference_count} refs</span>
                                                      </div>
                                                )}
                                          </div>

                                          <div className="grid grid-cols-2 gap-2 w-full">
                                                {
                                                      genesisMatch ?
                                                            <Button
                                                                  data-testid={'open-shared-contract-button-' + index}
                                                                  variant="default"
                                                                  size="sm"
                                                                  className="w-full"
                                                                  onClick={() => navigate(`/app/shared-contracts/${contract.hash}`)}
                                                            >
                                                                  Review
                                                            </Button>
                                                            :
                                                            fileInfo && <ImportAquaChainFromChain
                                                                  showButtonOnly={true}
                                                                  fileInfo={fileInfo}
                                                                  contractData={contractData}
                                                                  isVerificationSuccessful={true}

                                                            />
                                                }
                                                <Button
                                                      data-testid={'delete-shared-contract-button-' + index}
                                                      variant="destructive"
                                                      size="sm"
                                                      className="w-full"
                                                      disabled={loading}
                                                      onClick={deleteContract}
                                                >
                                                      {loading ? 'Deleting...' : 'Delete'}
                                                </Button>
                                          </div>

                                    </div>
                              </div>
                              {/* Green Button in Top Right */}
                              <div className="absolute top-0 right-0">
                                    {
                                          type == 'incoming' ?
                                                <CheckIfAquaTreeIsImported loadingSharedFileData={loadingSharedFileData} exactMatchFound={exactMatchFound} />
                                                : <div className="shrink-0 ml-4" />
                                    }
                              </div>
                        </div>
                  </CardContent>
            </Card>
      )
}


export function CheckIfAquaTreeIsImported({ loadingSharedFileData, exactMatchFound }: { loadingSharedFileData: boolean, exactMatchFound: boolean }) {

      //  const [fileInfo, setFileInfo] = useState<ApiFileInfo | null>(null)

      if (loadingSharedFileData) {
            return <Button
                  variant="default"
                  size="sm"
                  className={`bg-green-600 hover:bg-green-700 text-white disabled:bg-green-400 disabled:cursor-not-allowed `}
                  disabled={true}
                  onClick={(e) => {
                        e.stopPropagation();
                        //   if (onClick && !isLoading) {
                        //     onClick(e);
                        //   }
                  }}

            >

                  <div className="flex items-center gap-2">
                        {/* Circular Loading Spinner */}
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>checking if file is imported...</span>
                  </div>

            </Button>
      }

      if (exactMatchFound) {
            return <div className="shrink-0 ml-4">
                  <Button
                        variant="default"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={(e) => {
                              e.stopPropagation();
                              // Add your click handler here
                              // console.log('Green button clicked');
                        }}
                  >
                        File has been Imported  <CircleCheckBigIcon />
                  </Button>
            </div>
      }
      return <div />
}


