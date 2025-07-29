import { ConnectWallet } from '../components/connect_wallet'
import { ConnectWalletPage } from '../components/connect_wallet_page'
import { Separator } from '../components/ui/separator'
import NotificationsBell from '../pages/notifications/NotificationsBell'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '../components/ui/sidebar'
import appStore from '../store'
import { Crown, Mail, X, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { ClipLoader } from 'react-spinners'
import { Toaster } from 'sonner'
import { useStore } from 'zustand'
import { Dialog, DialogContent } from '../components/ui/dialog'
import { Button } from '../components/ui/button'
import CreateFormFromTemplate from '../components/aqua_forms/CreateFormFromTemplate'
import FormTemplateEditorShadcn from '../components/aqua_forms/FormTemplateEditorShadcn'
import { AppSidebar } from '../components/app_sidebar'
import WebsocketFragment from '@/components/navbar/WebsocketFragment'


export default function NewShadcnLayoutWithSidebar() {
      const {
            session,
            // openCreateClaimAttestationPopUp,
            // setOpenCreateClaimAttestationPopUp,
            // openCreateClaimPopUp,
            // setOpenCreateClaimPopUp,
            // openCreateAquaSignPopUp,
            // setOpenCreateAquaSignPopUp,
            //      openCreateTemplatePopUp,
            // setOpenCreateTemplatePopUp,
            openDialog,
            setOpenDialog, 
            formTemplates,
      } = useStore(appStore)

      const [loading, setLoading] = useState(true)

      useEffect(() => {
            const timer = setTimeout(() => {
                  setLoading(false)
            }, 1000)
            return () => clearTimeout(timer)
      }, [])

      // const [isDialogOpenPopUp, setIsDialogPopUp] = useState<OpenDialog | null>(null)

      // useEffect(() => {
      //       if (openDialog) {
      //             setIsOpenCreateClaimPopUp(true)
      //       } else {
      //             setIsOpenCreateClaimPopUp(false)
      //       }
      // }, [openCreateClaimPopUp])

      // const [isOpenCreateAquaSignPopUp, setIsOpenCreateAquaSignPopUp] = useState(false)
      // const [isOpenCreateTemplatePopUp, setIsOpenCreateTemplatePopUp] = useState(false)
      // const [isOpenCreateClaimPopUp, setIsOpenCreateClaimPopUp] = useState(false)
      // const [isOpenCreateClaimAttestationPopUp, setIsOpenCreateClaimAttestationPopUp] = useState(false)

      // useEffect(() => {
      //       if (openCreateClaimPopUp) {
      //             setIsOpenCreateClaimPopUp(true)
      //       } else {
      //             setIsOpenCreateClaimPopUp(false)
      //       }
      // }, [openCreateClaimPopUp])

      // useEffect(() => {
      //       if (openCreateAquaSignPopUp) {
      //             setIsOpenCreateAquaSignPopUp(true)
      //       } else {
      //             setIsOpenCreateAquaSignPopUp(false)
      //       }
      // }, [openCreateAquaSignPopUp])

      // useEffect(() => {
      //       if (openCreateTemplatePopUp) {
      //             setIsOpenCreateTemplatePopUp(true)
      //       } else {
      //             setIsOpenCreateTemplatePopUp(false)
      //       }
      // }, [openCreateTemplatePopUp])

      // useEffect(() => {
      //       if (openCreateClaimAttestationPopUp) {
      //             setIsOpenCreateClaimAttestationPopUp(true)
      //       } else {
      //             setIsOpenCreateClaimAttestationPopUp(false)
      //       }
      // }, [openCreateClaimAttestationPopUp])

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
                                                      {/* <Button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"> Free Verision</Button> */}

                                                      <div className="flex items-center gap-3">
                                                            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                                                                  <Crown className="w-4 h-4 text-blue-600" />
                                                                  <span className="text-sm text-blue-700 font-medium">Free Plan</span>
                                                            </div>
                                                            <button
                                                                  onClick={() => {
                                                                        setOpenDialog({
                                                                              dialogType: 'early_bird_offer',
                                                                              isOpen: true,
                                                                              onClose: () => setOpenDialog(null),
                                                                              onConfirm: (data) => {
                                                                                    // Handle confirmation logic here
                                                                                    console.log('Early bird offer confirmed with data:', data)
                                                                              }
                                                                        })
                                                                  }}
                                                                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors flex items-center gap-2"
                                                            >
                                                                  <Zap className="w-4 h-4" />
                                                                  Upgrade to Pro
                                                            </button>
                                                      </div>
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



                  {openDialog?.dialogType === 'early_bird_offer' && (
                        <div className="fixed inset-0 bg-black bg-opacity-5 flex items-center justify-center z-50 p-4">
                              <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative animate-in fade-in duration-200">
                                    {/* Close Button */}
                                    <button
                                          onClick={() => {
                                                // setShowPopup(false)
                                                setOpenDialog(null)
                                          }}
                                          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                          <X size={20} />
                                    </button>

                                    {/* Popup Content */}
                                    <div className="text-center">
                                          <div className="mb-4">
                                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                      {/* <Mail className="w-8 h-8 text-green-600" /> */}
                                                      <Crown className="w-8 h-8 text-orange-600" />
                                                </div>
                                                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                                      Early Bird Special! 🎉
                                                </h2>
                                                {/* <p className="text-gray-600 leading-relaxed">
                                                      The code is better! If you're interested in our early bird offer of
                                                      <span className="font-semibold text-green-600"> 25% off</span>,
                                                      please email us at:
                                                </p> */}

                                                <h4 className="text-md font-bold text-gray-900 mb-2">
                                                      Upgrade to Pro! 🚀
                                                </h4>
                                                <p className="text-gray-600 leading-relaxed">
                                                      Get access to premium features with our early bird offer of
                                                      <span className="font-semibold text-orange-600"> 25% off</span>.
                                                      Contact us to unlock the full potential:
                                                </p>
                                          </div>

                                          <div className="bg-gray-50 rounded-lg p-4 mb-6">
                                                <a
                                                      href="mailto:info.inblock.io"
                                                      className="text-blue-600 hover:text-blue-800 font-medium text-lg transition-colors"
                                                >
                                                      info.inblock.io
                                                </a>
                                          </div>

                                          <div className="flex gap-3">
                                                <button
                                                      onClick={() => {
                                                            setOpenDialog(null)
                                                            // setShowPopup(false)
                                                      }}
                                                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                                >
                                                      Maybe Later
                                                </button>
                                                <a
                                                      href="mailto:info.inblock.io"
                                                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-center"
                                                >
                                                      Send Email
                                                </a>
                                          </div>
                                    </div>
                              </div>
                        </div>

                  )}

                  <Dialog
                        open={openDialog !== null && openDialog.isOpen && openDialog.dialogType != 'aqua_file_details' && openDialog.dialogType != 'early_bird_offer'}
                        onOpenChange={openState => {
                              if (!openState) {
                                    setOpenDialog(null)
                              }
                        }}

                  >
                        <DialogContent

                              className={
                                    openDialog?.dialogType === 'form_template_editor' ?
                                          "[&>button]:hidden !max-w-[95vw] !w-[95vw] h-[95vh] max-h-[95vh] sm:!max-w-[95vw] sm:!w-[95vw] sm:h-[95vh] sm:max-h-[95vh] flex flex-col" :
                                          "[&>button]:hidden sm:!max-w-[65vw] sm:!w-[65vw] sm:h-[65vh] sm:max-h-[65vh] !max-w-[95vw] !w-[95vw] h-[95vh] max-h-[95vh] flex flex-col p-0 gap-0"
                              }>
                              <div className="absolute top-4 right-4">
                                    <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 bg-red-500 text-white hover:bg-red-500"
                                          onClick={() => {
                                                setOpenDialog(null)
                                          }}
                                    >
                                          <X className="h-4 w-4" />
                                    </Button>
                              </div>

                              {openDialog?.dialogType === 'form_template_editor' && (

                                    <FormTemplateEditorShadcn
                                          onSave={function (): void {
                                                // setOpenCreateTemplatePopUp(false)
                                                setOpenDialog(null)
                                          }}
                                    />)}

                              {openDialog?.dialogType === 'aqua_sign' && (
                                    <CreateFormFromTemplate
                                          selectedTemplate={formTemplates.find(template => template.name === 'aqua_sign')!}
                                          callBack={function (): void {
                                                // setOpenCreateAquaSignPopUp(false)
                                                setOpenDialog(null)
                                          }}
                                          openCreateTemplatePopUp={false}
                                    />
                              )}

                              {openDialog?.dialogType === 'identity_claim' && (
                                    <CreateFormFromTemplate
                                          selectedTemplate={formTemplates.find(template => template.name === 'identity_claim')!}
                                          callBack={function (): void {
                                                // setOpenCreateClaimPopUp(false)
                                                setOpenDialog(null)
                                          }}
                                          openCreateTemplatePopUp={false}
                                    />
                              )}


                              {openDialog?.dialogType === 'dns_claim' && (
                                    <CreateFormFromTemplate
                                          selectedTemplate={formTemplates.find(template => template.name === 'domain_claim')!}
                                          callBack={function (): void {
                                                // setOpenCreateClaimPopUp(false)
                                                setOpenDialog(null)
                                          }}
                                          openCreateTemplatePopUp={false}
                                    />
                              )}

                              {openDialog?.dialogType === 'identity_attestation' && (
                                    <CreateFormFromTemplate
                                          selectedTemplate={formTemplates.find(template => template.name === 'identity_attestation')!}
                                          callBack={function (): void {
                                                // setOpenCreateClaimAttestationPopUp(false)
                                                setOpenDialog(null)
                                          }}
                                          openCreateTemplatePopUp={false}
                                    />
                              )}



                        </DialogContent>
                  </Dialog>





                  {/* create template dialog */}
                  {/* <Dialog
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
                             
                        </DialogContent>
                  </Dialog> */}

                  {/* create aqua sign  */}
                  {/* <Dialog
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
                             
                        </DialogContent>
                  </Dialog> */}

                  {/* create claim  */}
                  {/* <Dialog
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
                             
                        </DialogContent>
                  </Dialog> */}

                  {/* create claim  */}
                  {/* <Dialog
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
                              
                        </DialogContent>
                  </Dialog> */}
            </>
      )
}
