import {ConnectWallet} from '../components/connect_wallet'
import {ConnectWalletPage} from '../components/connect_wallet_page'
import {Separator} from '../components/ui/separator'
import NotificationsBell from '../pages/notifications/NotificationsBell'
import {SidebarInset, SidebarProvider, SidebarTrigger} from '../components/ui/sidebar'
import appStore from '../store'
import {Crown, X} from 'lucide-react'
import {Outlet} from 'react-router-dom'
import {Toaster} from 'sonner'
import {useStore} from 'zustand'
// import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
import {Dialog, DialogContent} from '../components/ui/dialog'
import {Button} from '../components/ui/button'
import CreateFormFromTemplate from '../components/aqua_forms/CreateFormFromTemplate'
import FormTemplateEditorShadcn from '../components/aqua_forms/FormTemplateEditorShadcn'
import {AppSidebar} from '../components/app_sidebar'
import WebsocketFragment from '@/components/navbar/WebsocketFragment'
import {ScrollArea} from '@/components/ui/scroll-area'
// import ClipboardButton from '@/components/ui/clipboard'
// import { Label } from '@/components/ui/label'
// import { Input } from '@/components/ui/input'
// import { ClipboardIcon } from 'lucide-react'
// import { Switch } from '@/components/ui/switch'
import ShareComponent from '@/components/aqua_chain_actions/Share_component'

export default function NewShadcnLayoutWithSidebar() {
      const {
            session,
            selectedFileInfo,
            setSelectedFileInfo,
            openDialog,
            setOpenDialog,
            formTemplates
      } = useStore(appStore)

      

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
                                                      <div className="flex items-center gap-3">
                                                            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5"
                                                                  onClick={() => {
                                                                        setOpenDialog({
                                                                              dialogType: 'early_bird_offer',
                                                                              isOpen: true,
                                                                              onClose: () => setOpenDialog(null),
                                                                              onConfirm: () => {
                                                                              }
                                                                        })
                                                                  }}
                                                            >
                                                                  <Crown className="w-4 h-4 text-blue-600" />
                                                                  <span className="text-sm text-blue-700 font-medium">Free Plan</span>
                                                            </div>
                                                      </div>
                                                      <ConnectWallet dataTestId="sign-in-button-files-list" />
                                                </div>

                                                {/* Mobile Navigation */}
                                                <div className="flex md:hidden items-center space-x-1 ms-auto">
                                                      <NotificationsBell />
                                                      <div className="scale-90 origin-right">
                                                            <ConnectWallet dataTestId="sign-in-button-files-list" />
                                                      </div>
                                                </div>
                                          </div>
                                    </header>
                                    <div className="flex-1 w-full max-w-full overflow-hidden px-2">
                                          <Toaster position="top-center" richColors />
                                          <Outlet />
                                    </div>
                              </SidebarInset>
                        </SidebarProvider>
                  )}

                  {/* Early Bird Offer Dialog */}
                  {openDialog?.dialogType === 'early_bird_offer' && (
                        <div className="fixed inset-0 bg-black bg-opacity-5 flex items-center justify-center z-50 p-4">
                              <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative animate-in fade-in duration-200">
                                    <button
                                          onClick={() => setOpenDialog(null)}
                                          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                          <X size={20} />
                                    </button>

                                    <div className="text-center">
                                          <div className="mb-4">
                                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                      <Crown className="w-8 h-8 text-orange-600" />
                                                </div>
                                                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                                      Early Bird Special! 🎉
                                                </h2>
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
                                                      href="mailto:info@inblock.io"
                                                      className="text-blue-600 hover:text-blue-800 font-medium text-lg transition-colors"
                                                >
                                                      info@inblock.io
                                                </a>
                                          </div>

                                          <div className="flex gap-3">
                                                <button
                                                      onClick={() => setOpenDialog(null)}
                                                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                                >
                                                      Maybe Later
                                                </button>
                                                <a
                                                      href="mailto:info@inblock.io"
                                                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-center"
                                                >
                                                      Send Email
                                                </a>
                                          </div>
                                    </div>
                              </div>
                        </div>
                  )}

                  {/* General Dialogs */}
                  <Dialog
                        open={openDialog !== null && openDialog.isOpen && openDialog.dialogType != 'aqua_file_details' && openDialog.dialogType != 'share_dialog' && openDialog.dialogType != 'early_bird_offer'}
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
                                          openDialog?.dialogType === 'identity_attestation' ?
                                                "[&>button]:hidden !max-w-[65vw] !w-[65vw] h-[85vh] max-h-[85vh] sm:!max-w-[65vw] sm:!w-[65vw] sm:h-[85vh] sm:max-h-[85vh] flex flex-col" :
                                                "[&>button]:hidden sm:!max-w-[65vw] sm:!w-[65vw] sm:h-[65vh] sm:max-h-[65vh] !max-w-[95vw] !w-[95vw] h-[95vh] max-h-[95vh] flex flex-col p-0 gap-0"
                              }>
                              <div className="absolute top-4 right-4">
                                    <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 bg-red-500 text-white hover:bg-red-500 z-10 relative"
                                          onClick={() => {
                                                setOpenDialog(null)
                                                if(openDialog?.dialogType  !== "user_signature"){
                                                      setSelectedFileInfo(null)
                                                }
                                          }}
                                    >
                                          <X className="h-4 w-4" />
                                    </Button>
                              </div>

                              <ScrollArea className="h-full">
                                    {openDialog?.dialogType === 'form_template_editor' && (
                                          <FormTemplateEditorShadcn
                                                onSave={function (): void {
                                                      setOpenDialog(null)
                                                }}
                                          />)}
 
                                    {openDialog?.dialogType === 'aqua_sign' && (
                                          <CreateFormFromTemplate
                                                selectedTemplate={formTemplates.find(template => template.name === 'aqua_sign')!}
                                                callBack={function (): void {
                                                      setOpenDialog(null)
                                                }}
                                                openCreateTemplatePopUp={false}
                                          />
                                    )}

                                    {openDialog?.dialogType === 'user_signature' && (
                                          <CreateFormFromTemplate
                                                selectedTemplate={formTemplates.find(template => template.name === 'user_signature')!}
                                                callBack={function (): void {
                                                      setOpenDialog(null)
                                                }}
                                                openCreateTemplatePopUp={false}
                                          />
                                    )}

                                    {openDialog?.dialogType === 'identity_claim' && (
                                          <CreateFormFromTemplate
                                                selectedTemplate={formTemplates.find(template => template.name === 'identity_claim')!}
                                                callBack={function (): void {
                                                      setOpenDialog(null)
                                                }}
                                                openCreateTemplatePopUp={false}
                                          />
                                    )}

                                    {openDialog?.dialogType === 'dns_claim' && (
                                          <CreateFormFromTemplate
                                                selectedTemplate={formTemplates.find(template => template.name === 'domain_claim')!}
                                                callBack={function (): void {
                                                      setOpenDialog(null)
                                                }}
                                                openCreateTemplatePopUp={false}
                                          />
                                    )}

                                    {openDialog?.dialogType === 'identity_attestation' && (
                                          <CreateFormFromTemplate
                                                selectedTemplate={formTemplates.find(template => template.name === 'identity_attestation')!}
                                                callBack={function (): void {
                                                      setOpenDialog(null)
                                                }}
                                                openCreateTemplatePopUp={false}
                                          />
                                    )}

                                    {openDialog?.dialogType === 'email_claim' && (
                                          <CreateFormFromTemplate
                                                selectedTemplate={formTemplates.find(template => template.name === 'email_claim')!}
                                                callBack={function (): void {
                                                      setOpenDialog(null)
                                                }}
                                                openCreateTemplatePopUp={false}
                                          />
                                    )}

                                    {openDialog?.dialogType === 'phone_number_claim' && (
                                          <CreateFormFromTemplate
                                                selectedTemplate={formTemplates.find(template => template.name === 'phone_number_claim')!}
                                                callBack={function (): void {
                                                      setOpenDialog(null)
                                                }}
                                                openCreateTemplatePopUp={false}
                                          />
                                    )}
                              </ScrollArea>
                        </DialogContent>
                  </Dialog>

                  {/* Enhanced Share Dialog */}
                  {openDialog?.dialogType === 'share_dialog' && selectedFileInfo && (
                        <ShareComponent />
                  )}
            </>
      )
}