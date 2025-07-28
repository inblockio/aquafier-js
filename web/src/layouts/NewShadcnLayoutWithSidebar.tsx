import { ConnectWallet } from '../components/connect_wallet'
import { ConnectWalletPage } from '../components/connect_wallet_page'
import { Separator } from '../components/ui/separator'
import NotificationsBell from '../pages/notifications/NotificationsBell'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '../components/ui/sidebar'
import appStore from '../store'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { ClipLoader } from 'react-spinners'
import { Toaster } from 'sonner'
import { useStore } from 'zustand'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Button } from '../components/ui/button'
import CreateFormFromTemplate from '../components/aqua_forms/CreateFormFromTemplate'
import { ScrollArea } from '../components/ui/scroll-area'
import FormTemplateEditorShadcn from '../components/aqua_forms/FormTemplateEditorShadcn'
import { AppSidebar } from '../components/app_sidebar'
import WebsocketFragment from '@/components/navbar/WebsocketFragment'

export default function NewShadcnLayoutWithSidebar() {
      const {
            session,
            openCreateClaimAttestationPopUp,
            setOpenCreateClaimAttestationPopUp,
            openCreateClaimPopUp,
            setOpenCreateClaimPopUp,
            openCreateAquaSignPopUp,
            setOpenCreateAquaSignPopUp,
            openCreateTemplatePopUp,
            setOpenCreateTemplatePopUp,
            formTemplates,
      } = useStore(appStore)

      const [loading, setLoading] = useState(true)

      useEffect(() => {
            const timer = setTimeout(() => {
                  setLoading(false)
            }, 1000)
            return () => clearTimeout(timer)
      }, [])

      const [isOpenCreateAquaSignPopUp, setIsOpenCreateAquaSignPopUp] = useState(false)
      const [isOpenCreateTemplatePopUp, setIsOpenCreateTemplatePopUp] = useState(false)
      const [isOpenCreateClaimPopUp, setIsOpenCreateClaimPopUp] = useState(false)
      const [isOpenCreateClaimAttestationPopUp, setIsOpenCreateClaimAttestationPopUp] = useState(false)

      useEffect(() => {
            if (openCreateClaimPopUp) {
                  setIsOpenCreateClaimPopUp(true)
            } else {
                  setIsOpenCreateClaimPopUp(false)
            }
      }, [openCreateClaimPopUp])

      useEffect(() => {
            if (openCreateAquaSignPopUp) {
                  setIsOpenCreateAquaSignPopUp(true)
            } else {
                  setIsOpenCreateAquaSignPopUp(false)
            }
      }, [openCreateAquaSignPopUp])

      useEffect(() => {
            if (openCreateTemplatePopUp) {
                  setIsOpenCreateTemplatePopUp(true)
            } else {
                  setIsOpenCreateTemplatePopUp(false)
            }
      }, [openCreateTemplatePopUp])

      useEffect(() => {
            if (openCreateClaimAttestationPopUp) {
                  setIsOpenCreateClaimAttestationPopUp(true)
            } else {
                  setIsOpenCreateClaimAttestationPopUp(false)
            }
      }, [openCreateClaimAttestationPopUp])

      if (loading) {
            return (
                  <div
                        style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              height: '100vh',
                              width: '100vw',
                        }}
                  >
                        <ClipLoader color={'blue'} loading={loading} size={150} aria-label="Loading Spinner" data-testid="loader" />
                        <span style={{ fontSize: 24, fontWeight: 500 }}>Loading...</span>
                  </div>
            )
      }

      return (
            <>
                  {session == null ? (
                        <>
                              <ConnectWalletPage />
                        </>
                  ) : (
                        <SidebarProvider>
                              <WebsocketFragment />
                              <AppSidebar className="hidden md:block" />
                              <SidebarInset>
                                    <header className="flex h-16 shrink-0 items-center gap-2 border-b sticky top-0 z-50 bg-accent w-full">
                                          <div className="flex items-center gap-2 px-3 w-full">
                                                <SidebarTrigger />
                                                <Separator orientation="vertical" className="mr-2 h-4" />

                                                {/* Desktop Navigation */}
                                                <div className="hidden md:flex items-center space-x-4 ms-auto">
                                                      <NotificationsBell />
                                                      <Button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">Start free trial</Button>
                                                      <ConnectWallet dataTestId="sign-in-button-files-list" />
                                                </div>

                                                {/* Mobile Navigation */}
                                                <div className="flex md:hidden items-center space-x-1 ms-auto">
                                                      {/* Notification bell component */}
                                                      <NotificationsBell />

                                                      {/* Mobile dropdown menu */}
                                                      {/* <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-9 w-9 p-0">
                                                    <MoreVertical className="h-5 w-5" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-[200px]">
                                                <DropdownMenuItem>
                                                    <span className="w-full text-center">Start free trial</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu> */}

                                                      {/* Always show wallet connect button but with smaller padding */}
                                                      <div className="scale-90 origin-right">
                                                            <ConnectWallet dataTestId="sign-in-button-files-list" />
                                                      </div>
                                                </div>
                                          </div>
                                    </header>
                                    {/* <div className="flex flex-1 flex-col gap-4 md:px-4 px-2">
                                <Toaster position="top-right" richColors />
                                <Outlet />
                            </div> */}
                                    <div className="flex-1 w-full max-w-full overflow-hidden px-2">
                                          <Toaster position="top-right" richColors />
                                          <Outlet />
                                    </div>
                              </SidebarInset>
                        </SidebarProvider>
                  )}

                  {/* create template dialog */}
                  <Dialog
                        open={isOpenCreateTemplatePopUp}
                        onOpenChange={openState => {
                              setOpenCreateTemplatePopUp(openState)
                        }}
                  >
                        <DialogContent className="[&>button]:hidden !max-w-[95vw] !w-[95vw] h-[95vh] max-h-[95vh] sm:!max-w-[95vw] sm:!w-[95vw] sm:h-[95vh] sm:max-h-[95vh] flex flex-col">
                              <div className="absolute top-4 right-4">
                                    <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 bg-red-500 text-white hover:bg-red-500"
                                          onClick={() => {
                                                setOpenCreateTemplatePopUp(false)
                                          }}
                                    >
                                          <X className="h-4 w-4" />
                                    </Button>
                              </div>
                              <FormTemplateEditorShadcn
                                    onSave={function (): void {
                                          setOpenCreateTemplatePopUp(false)
                                    }}
                              />
                              {/* <DialogFooter className="mt-auto">
                        <Button variant="outline" onClick={() => {
                           setOpenCreateAquaSignPopUp(false)
                        }}>Cancel</Button>
                        <Button type="submit">Save changes</Button>
                    </DialogFooter> */}
                        </DialogContent>
                  </Dialog>

                  {/* create aqua sign  */}
                  <Dialog
                        open={isOpenCreateAquaSignPopUp}
                        onOpenChange={openState => {
                              setOpenCreateAquaSignPopUp(openState)
                        }}
                  >
                        <DialogContent className="[&>button]:hidden sm:!max-w-[65vw] sm:!w-[65vw] sm:h-[65vh] sm:max-h-[65vh] !max-w-[95vw] !w-[95vw] h-[95vh] max-h-[95vh] flex flex-col p-0 gap-0">
                              <div className="absolute top-4 right-4">
                                    <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 bg-red-500 text-white hover:bg-red-500"
                                          onClick={() => {
                                                setOpenCreateAquaSignPopUp(false)
                                          }}
                                    >
                                          <X className="h-4 w-4" />
                                    </Button>
                              </div>
                              <DialogHeader className="!h-[60px] !min-h-[60px] !max-h-[60px] flex justify-center items-start px-6">
                                    <DialogTitle>Create Aqua Sign</DialogTitle>
                              </DialogHeader>
                              <div className=" h-[calc(100%-60px)] pb-1">
                                    <ScrollArea className="h-full">
                                          <CreateFormFromTemplate
                                                selectedTemplate={formTemplates.find(template => template.name === 'aqua_sign')!}
                                                callBack={function (): void {
                                                      setOpenCreateAquaSignPopUp(false)
                                                }}
                                                openCreateTemplatePopUp={false}
                                          />
                                    </ScrollArea>
                              </div>
                              {/* <DialogFooter className="mt-auto">
                        <Button variant="outline" onClick={() => {
                           setOpenCreateAquaSignPopUp(false)
                        }}>Cancel</Button>
                        <Button type="submit">Save changes</Button>
                    </DialogFooter> */}
                        </DialogContent>
                  </Dialog>

                  {/* create claim  */}
                  <Dialog
                        open={isOpenCreateClaimPopUp}
                        onOpenChange={openState => {
                              setOpenCreateClaimPopUp(openState)
                        }}
                  >
                        <DialogContent className="[&>button]:hidden sm:!max-w-[65vw] sm:!w-[65vw] sm:h-[65vh] sm:max-h-[65vh] !max-w-[95vw] !w-[95vw] h-[95vh] max-h-[95vh] flex flex-col p-0 gap-0">
                              <div className="absolute top-4 right-4">
                                    <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 bg-red-500 text-white hover:bg-red-500"
                                          onClick={() => {
                                                setOpenCreateClaimPopUp(false)
                                          }}
                                    >
                                          <X className="h-4 w-4" />
                                    </Button>
                              </div>
                              <DialogHeader className="!h-[60px] !min-h-[60px] !max-h-[60px] flex justify-center items-start px-6">
                                    <DialogTitle>Create Claim</DialogTitle>
                              </DialogHeader>
                              <div className=" h-[calc(100%-60px)] pb-1">
                                    <ScrollArea className="h-full">
                                          <CreateFormFromTemplate
                                                selectedTemplate={formTemplates.find(template => template.name === 'identity_claim')!}
                                                callBack={function (): void {
                                                      setOpenCreateClaimPopUp(false)
                                                }}
                                                openCreateTemplatePopUp={false}
                                          />
                                    </ScrollArea>
                              </div>
                              {/* <DialogFooter className="mt-auto">
                        <Button variant="outline" onClick={() => {
                           setOpenCreateAquaSignPopUp(false)
                        }}>Cancel</Button>
                        <Button type="submit">Save changes</Button>
                    </DialogFooter> */}
                        </DialogContent>
                  </Dialog>

                  {/* create claim  */}
                  <Dialog
                        open={isOpenCreateClaimAttestationPopUp}
                        onOpenChange={openState => {
                              setOpenCreateClaimAttestationPopUp(openState)
                        }}
                  >
                        <DialogContent className="[&>button]:hidden sm:!max-w-[65vw] sm:!w-[65vw] sm:h-[65vh] sm:max-h-[65vh] !max-w-[95vw] !w-[95vw] h-[95vh] max-h-[95vh] flex flex-col p-0 gap-0">
                              <div className="absolute top-4 right-4">
                                    <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 bg-red-500 text-white hover:bg-red-500"
                                          onClick={() => {
                                                setOpenCreateClaimAttestationPopUp(false)
                                          }}
                                    >
                                          <X className="h-4 w-4" />
                                    </Button>
                              </div>
                              <DialogHeader className="!h-[60px] !min-h-[60px] !max-h-[60px] flex justify-center items-start px-6">
                                    <DialogTitle>Create Claim Attestation</DialogTitle>
                              </DialogHeader>
                              <div className=" h-[calc(100%-60px)] pb-1">
                                    <ScrollArea className="h-full">
                                          <CreateFormFromTemplate
                                                selectedTemplate={formTemplates.find(template => template.name === 'identity_attestation')!}
                                                callBack={function (): void {
                                                      setOpenCreateClaimAttestationPopUp(false)
                                                }}
                                                openCreateTemplatePopUp={false}
                                          />
                                    </ScrollArea>
                              </div>
                              {/* <DialogFooter className="mt-auto">
                        <Button variant="outline" onClick={() => {
                           setOpenCreateAquaSignPopUp(false)
                        }}>Cancel</Button>
                        <Button type="submit">Save changes</Button>
                    </DialogFooter> */}
                        </DialogContent>
                  </Dialog>
            </>
      )
}
