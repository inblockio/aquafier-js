import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CircleCheckBigIcon, FileText, Hash, Users, Wallet, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useStore } from 'zustand'
import appStore from '@/store'
import { arraysEqualIgnoreOrder, formatCryptoAddress, getGenesisHash, timeToHumanFriendly } from '@/utils/functions'
import { Contract } from '@/types/types'
import WalletAddresClaim from "./../pages/v2_claims_workflow/WalletAdrressClaim"
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'sonner'
import { ApiFileInfo } from '@/models/FileInfo'


export const SharedContract = ({ contract, index, contractDeleted }: { contract: Contract; index: number; contractDeleted: (hash: string) => void }) => {
      const navigate = useNavigate()
      const [loading, setLoading] = useState(false)
      const { backend_url, session } = useStore(appStore)
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

      return (
            <Card key={contract.hash} className="hover:shadow-md transition-shadow cursor-pointer border border-gray-200 " style={{ marginTop: '10px', marginBottom: '10px' }}>
                  <CardContent className="p-3 sm:p-6">
                        <div className="flex items-start justify-between">
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
                                                                                          <WalletAddresClaim walletAddress={recipient} isShortened={false} />
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
                                                <Button
                                                      data-testid={'open-shared-contract-button-' + index}
                                                      variant="outline"
                                                      size="sm"
                                                      className="w-full"
                                                      onClick={() => navigate(`/app/shared-contracts/${contract.hash}`)}
                                                >
                                                      Open
                                                </Button>

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
                              <CheckIfAquaTreeIsImported contractHash={contract.hash} />
                        </div>
                  </CardContent>
            </Card>
      )
}


export function CheckIfAquaTreeIsImported({ contractHash }: { contractHash: string }) {
      const [exactMatchFound, setExactMatchFound] = useState<boolean>(false)
      const [loading, setLoading] = useState(true)
      const { backend_url, session, files } = useStore(appStore)
      //  const [fileInfo, setFileInfo] = useState<ApiFileInfo | null>(null)

      const loadPageData = async () => {
            try {
                  setLoading(true)
                  const url = `${backend_url}/share_data/${contractHash}`
                  const response = await axios.get(url, {
                        headers: {
                              'Content-Type': 'application/x-www-form-urlencoded',
                              nonce: session?.nonce ?? '',
                        },
                  })


                  let apiFile = response.data.data.displayData[0] as ApiFileInfo


                  if (apiFile) {

                        let contractFileGenHash = getGenesisHash(apiFile.aquaTree!)

                        for (let fileItem of files.fileData) {

                              let currentGeesisHash = getGenesisHash(fileItem.aquaTree!)

                              if (currentGeesisHash == contractFileGenHash) {

                                    let allHashesInFileItem = Object.keys(fileItem.aquaTree!.revisions)
                                    let allHashesInContract = Object.keys(apiFile.aquaTree!.revisions)

                                    let allHashesMatch = arraysEqualIgnoreOrder(allHashesInFileItem, allHashesInContract)
                                    if (allHashesMatch) {
                                          setExactMatchFound(true)
                                    }
                                    //file exist
                                    break;
                              }
                        }
                  }

                  setLoading(false)
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

            if (contractHash) {
                  loadPageData()
            }
      }, [])

      if (loading) {
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
            return <div className="flex-shrink-0 ml-4">
                  <Button
                        variant="default"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={(e) => {
                              e.stopPropagation();
                              // Add your click handler here
                              console.log('Green button clicked');
                        }}
                  >
                        File has been Imported  <CircleCheckBigIcon />
                  </Button>
            </div>
      }
      return <div />
}

export function SharedContracts() {
      const [searchQuery, _setSearchQuery] = useState('')
      const [shareContracts, setShareContracts] = useState<Contract[]>([])
      const { backend_url, session, setContracts, contracts } = useStore(appStore)

      const loadAccountSharedContracts = async () => {
            if (!session) {
                  return
            }
            try {
                  const url = `${backend_url}/contracts`
                  const response = await axios.get(url, {
                        params: {
                              receiver: session?.address,
                              sender: session?.address,
                        },
                        headers: {
                              nonce: session?.nonce,
                        },
                  })
                  if (response.status === 200) {
                        setContracts(response.data?.contracts)
                  }
            } catch (error) {
                  console.error(error)
            }
      }
      useEffect(() => {
            loadAccountSharedContracts()
      }, [backend_url, session])

      useEffect(() => {
            const filteredContracts = contracts.filter(
                  contract =>
                        contract.hash.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        contract.sender?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        contract.receiver?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            setShareContracts(filteredContracts)
      }, [JSON.stringify(contracts)])

      return (
            <div>
                  <div className="flex flex-col gap-2 ">
                        <div className="flex items-center gap-3 mt-5">
                              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                    <h2 className="text-xl font-semibold text-gray-900">Shared Contracts.</h2>
                                    <p className="text-sm text-gray-500 mt-1">{contracts.length} contracts available</p>
                              </div>
                        </div>

                        <div className="flex flex-col h-full">
                              {/* Contracts List */}
                              <div className="flex-1 overflow-auto p-0">
                                    <div className="space-y-4">
                                          <Tabs defaultValue="incoming">
                                                <TabsList>
                                                      <TabsTrigger value="incoming">Incoming</TabsTrigger>
                                                      <TabsTrigger value="outgoing">Outgoing</TabsTrigger>
                                                </TabsList>
                                                <TabsContent value="incoming">
                                                      {shareContracts
                                                      .filter((contract: Contract) => contract.recipients?.map((e) => e.toLocaleLowerCase()).includes(session?.address?.toLocaleLowerCase()!!))
                                                      .sort((a, b) => {
                                                                  // Sort from latest to oldest (descending order)
                                                                  if (!a.created_at) return 1;
                                                                  if (!b.created_at) return -1;
                                                                  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                                                            })
                                                      .map((contract, index) => (
                                                            <SharedContract
                                                                  key={`${contract.hash}`}
                                                                  contract={contract}
                                                                  index={index}
                                                                  /**
                                                                   * Removes a contract from the share contracts list by hash.
                                                                   * @param {string} hash - The hash of the contract to remove.
                                                                   */
                                                                  contractDeleted={hash => {
                                                                        let newState = shareContracts.filter(e => e.hash != hash)
                                                                        setShareContracts(newState)
                                                                  }}
                                                            />
                                                      ))}
                                                      {shareContracts.filter((contract: Contract) => contract.recipients?.map((e) => e.toLocaleLowerCase()).includes(session?.address?.toLocaleLowerCase()!!)).length == 0 && (
                                                            <div className="card">
                                                                  <Alert variant="default">
                                                                        <X />
                                                                        <AlertTitle>Shared Contracts</AlertTitle>
                                                                        <AlertDescription>
                                                                              No incoming contracts
                                                                        </AlertDescription>
                                                                  </Alert>
                                                            </div>
                                                      )}
                                                </TabsContent>
                                                <TabsContent value="outgoing">
                                                      {shareContracts
                                                            .filter((contract: Contract) => contract.sender?.toLocaleLowerCase() == session?.address?.toLocaleLowerCase())
                                                            .sort((a, b) => {
                                                                  // Sort from latest to oldest (descending order)
                                                                  if (!a.created_at) return 1;
                                                                  if (!b.created_at) return -1;
                                                                  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                                                            })
                                                            .map((contract, index) => (
                                                                  <SharedContract
                                                                        key={`${contract.hash}`}
                                                                        contract={contract}
                                                                        index={index}
                                                                        contractDeleted={hash => {
                                                                              let newState = shareContracts.filter(e => e.hash != hash)
                                                                              setShareContracts(newState)
                                                                        }}
                                                                  />
                                                            ))}
                                                      {shareContracts.filter(contract => contract.sender?.toLocaleLowerCase() == session?.address.toLocaleLowerCase()).length == 0 && (
                                                            <div className="card">
                                                                  <Alert variant="default">
                                                                        <X />
                                                                        <AlertTitle>Shared Contracts</AlertTitle>
                                                                        <AlertDescription>
                                                                              No outgoing contracts
                                                                        </AlertDescription>
                                                                  </Alert>
                                                            </div>
                                                      )}
                                                </TabsContent>
                                          </Tabs>

                                          {shareContracts.length === 0 && (
                                                <div className="text-center py-12">
                                                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                                            <FileText className="w-8 h-8 text-gray-400" />
                                                      </div>
                                                      <h3 className="text-lg font-medium text-gray-900 mb-2">No contracts found</h3>
                                                      <p className="text-gray-500">{searchQuery ? 'Try adjusting your search terms' : 'No shared contracts available'}</p>
                                                </div>
                                          )}
                                    </div>
                              </div>
                        </div>
                  </div>
            </div>
      )
}

const FilesSharedContracts = () => {
      return (
            <div className="container mx-auto max-w-4xl px-0 py-6">
                  <SharedContracts />
            </div>
      )
}

export default FilesSharedContracts
