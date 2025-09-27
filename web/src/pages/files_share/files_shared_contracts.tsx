import { useEffect, useState } from 'react'
import { FileText, X } from 'lucide-react'
import axios from 'axios'
import { useStore } from 'zustand'
import appStore from '@/store'
import { Contract } from '@/types/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { SharedContract } from './files_shared_contracts_item'



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
                                                      <TabsTrigger value="incoming">Inbox</TabsTrigger>
                                                      <TabsTrigger value="outgoing">Shared</TabsTrigger>
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
                                                            type='incoming'
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
                                                                  type='outgoing'
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
