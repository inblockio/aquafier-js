import { useEffect } from 'react'
import { copyToClipboardModern, ensureDomainUrlHasSSL } from '../../utils/functions'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LuCopy, LuExternalLink, LuShare2 } from 'react-icons/lu'
import { useStore } from 'zustand'
import appStore from '../../store'
import apiClient from '@/api/axiosInstance'
import { Link, useNavigate } from 'react-router-dom'
import { IAccountContracts } from '../../types/index'
import { toast } from 'sonner'

export default function AccountContracts({ inline, open, updateOpenStatus }: IAccountContracts) {
      const { backend_url, session, setContracts, contracts } = useStore(appStore)
      const navigate = useNavigate()

      const loadAccountSharedContracts = async () => {
            if (!session) {
                  return
            }
            try {
                  const url = ensureDomainUrlHasSSL(`${backend_url}/contracts`)
                  const response = await apiClient.get(url, {
                        params: {
                              receiver: session?.address,
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

      return (
            <Dialog open={open} onOpenChange={isOpen => updateOpenStatus?.(isOpen)}>
                  <DialogTrigger asChild>
                        <Button
                              id="contracts-shared-button-id"
                              data-testid="contracts-shared-button"
                              size="sm"
                              variant="outline"
                              className={`relative ${inline ? 'hidden' : ''}`}
                              onClick={() => updateOpenStatus?.(true)}
                        >
                              <LuShare2 />
                              <Badge variant="default" className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-black text-white">
                                    {contracts?.length || 0}
                              </Badge>
                        </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md rounded-xl overflow-hidden">
                        <DialogHeader className="py-3 px-5 bg-blue-100/22 dark:bg-black/30">
                              <DialogTitle className="font-medium text-gray-800 dark:text-white">Shared Contracts</DialogTitle>
                        </DialogHeader>
                        <div className="py-8 px-5">
                              <div className="space-y-4">
                                    {contracts?.length === 0 ? (
                                          <p className="text-muted-foreground">No shared contracts found</p>
                                    ) : (
                                          contracts?.map((contract, i: number) => (
                                                <div key={`${contract.hash}-${i}`} className="flex items-center gap-2">
                                                      <Button
                                                            data-testid={'shared-button-count-' + i}
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                  updateOpenStatus?.(false)
                                                                  navigate(`/share/${contract.hash}`, { replace: true })
                                                            }}
                                                      >
                                                            {i + 1}
                                                      </Button>
                                                      <span className="flex-1 break-words text-sm">{contract.sender}</span>
                                                      <Link to={`/share/${contract.hash}`}>
                                                            <Button variant="outline" size="sm" onClick={() => updateOpenStatus?.(false)}>
                                                                  <LuExternalLink className="h-4 w-4" />
                                                            </Button>
                                                      </Link>
                                                      <Button
                                                            data-testid={'shared-button-copy-' + i}
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={async () => {
                                                                  const res = await copyToClipboardModern(`${window.location.href}/share/${contract.hash}`)
                                                                  if (res) {
                                                                        toast.success('Link copied to clipboard')
                                                                        // toast({

                                                                        //     title: "Link copied to clipboard",
                                                                        //     description: "",
                                                                        //     variant: "default",
                                                                        // });
                                                                  } else {
                                                                        toast.error('Error witnessing failed')
                                                                  }
                                                            }}
                                                      >
                                                            <LuCopy className="h-3 w-3" title="copy" />
                                                      </Button>
                                                </div>
                                          ))
                                    )}
                              </div>
                        </div>
                  </DialogContent>
            </Dialog>
      )
}
