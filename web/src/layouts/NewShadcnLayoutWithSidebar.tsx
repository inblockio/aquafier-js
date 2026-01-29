import { ConnectWallet } from '../components/connect_wallet_button'
import { ConnectWalletPage } from '../components/connect_wallet_page'
import { Separator } from '../components/ui/separator'
import NotificationsBell from '../pages/notifications/NotificationsBell'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '../components/ui/sidebar'
import appStore from '../store'
import { Crown, X } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useStore } from 'zustand'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Button } from '../components/ui/button'
import CreateFormFromTemplate from '../components/aqua_forms/CreateFormFromTemplate'
import FormTemplateEditorShadcn from '../components/aqua_forms/FormTemplateEditorShadcn'
import { AppSidebar } from '../components/app_sidebar'
import WebsocketFragment from '@/components/navbar/WebsocketFragment'
import { ScrollArea } from '@/components/ui/scroll-area'
import ShareComponent from '@/components/aqua_chain_actions/Share_component'
import { CompleteChainView } from '@/components/files_chain_details'
import { getAquaTreeFileName } from '@/utils/functions'
import { IDrawerStatus } from '@/models/AquaTreeDetails'
import { useState } from 'react'
import { RELOAD_KEYS, triggerWorkflowReload } from '../utils/reloadDatabase';
import WorkspaceDialogUI from '@/components/workspace/workspace_download_dialog_ui'
import IdentityCardDialogUi from '@/components/identity_card_dialog_ui'

export default function NewShadcnLayoutWithSidebar() {
 
      const {
            session,
            setSelectedFileInfo,
            selectedFileInfo,
            openDialog,
            setOpenDialog,
            formTemplates
      } = useStore(appStore)

      const [_drawerStatus, setDrawerStatus] = useState<IDrawerStatus | null>(null)

      const getClasses = () => {
            if (openDialog?.dialogType === 'form_template_editor') {
                  return "max-w-[95vw]! w-[95vw]! max-h-[98vh] sm:max-w-[95vw]! sm:w-[95vw]! sm:h-[98vh] sm:max-h-[98vh] flex flex-col"
            }
            if (openDialog?.dialogType === 'identity_attestation') {
                  return "max-w-[65vw]! w-[65vw]! h-[90vh] max-h-[90vh] sm:max-w-[65vw]! sm:w-[65vw]! sm:h-[90vh] sm:max-h-[90vh] flex flex-col"
            }
            return "sm:!max-w-[65vw] sm:!w-[65vw] !max-w-[95vw] !w-[95vw] min-h-[10vh] max-h-[98vh] overflow-hidden overflow-y-auto flex flex-col p-0 gap-0"
      }

      return (
            <>
                  {session == null ? (
                        <>
                              <ConnectWalletPage />
                        </>
                  ) : (
                        <SidebarProvider className='overflow-x-hidden'>
                              <WebsocketFragment />
                              <AppSidebar className="hidden md:block" />
                              <SidebarInset className='relative h-screen overflow-y-auto'>
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
                                    <div className="flex-1 w-full min-w-0 overflow-x-hidden px-1">
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
                                                      Free Pilot Version
                                                </h2>
                                                <p className="text-gray-600 leading-relaxed mb-4">
                                                      You are using a free pilot version of the{' '}

                                                      <a href="https://aquafier.inblock.io"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                                                      >
                                                            aquafier.inblock.io
                                                      </a>{' '}
                                                      application.
                                                </p>
                                          </div>

                                          <div className="bg-gray-50 rounded-lg p-4 mb-6">
                                                <p className="text-gray-700 mb-2">Find the Source Code here:</p>
                                                <a
                                                      href="https://github.com/inblockio/aquafier-js"
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                                                >
                                                      github.com/inblockio/aquafier-js
                                                </a>
                                          </div>

                                          <div className="flex gap-3">
                                                <button
                                                      onClick={() => setOpenDialog(null)}
                                                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                                >
                                                      Got it
                                                </button>
                                          </div>
                                    </div>
                              </div>
                        </div>
                  )}

                  <IdentityCardDialogUi

                        isOpen={openDialog?.isOpen! && openDialog.dialogType === "identity_card"}
                        walletAddress={session?.address!}
                        onClose={function (): void {
                              setOpenDialog(null)
                        }}
                  />

                  {/* General Dialogs */}
                  <Dialog
                        open={openDialog !== null && openDialog.isOpen && openDialog.dialogType != 'aqua_file_details' && openDialog.dialogType != 'identity_card' && openDialog.dialogType != 'share_dialog' && openDialog.dialogType != 'early_bird_offer'}
                        onOpenChange={openState => {
                              if (!openState) {
                                    setOpenDialog(null)
                              }
                        }}
                  >
                        <DialogContent
                              showCloseButton={false}
                              className={getClasses()}>
                              <div className="absolute top-4 right-4">
                                    <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 bg-red-500 text-white hover:bg-red-500 z-10 relative"
                                          onClick={() => {
                                                setOpenDialog(null)
                                                if (openDialog?.dialogType !== "user_signature") {
                                                      setSelectedFileInfo(null)
                                                }
                                          }}
                                    >
                                          <X className="h-4 w-4" />
                                    </Button>
                              </div>

                              <ScrollArea className="h-full">

                                    {openDialog?.dialogType === 'explorer_workspace_download' && (
                                          <WorkspaceDialogUI
                                                title="Download Workspace"
                                                isDone={function (): void {
                                                      setOpenDialog(null)
                                                }}
                                          />)}





                                    {openDialog?.dialogType === 'form_template_editor' && (
                                          <FormTemplateEditorShadcn
                                                onSave={function (): void {
                                                      setOpenDialog(null)
                                                }}
                                          />)}

                                    {openDialog?.dialogType === 'aqua_certificate' && (
                                          <CreateFormFromTemplate
                                                selectedTemplate={formTemplates.find(template => template.name === 'aqua_certificate')!}
                                                callBack={async function (): Promise<void> {
                                                      await triggerWorkflowReload(RELOAD_KEYS.aqua_certificate, true);
                                                      await triggerWorkflowReload(RELOAD_KEYS.all_files, true);
                                                      await triggerWorkflowReload(RELOAD_KEYS.user_files, true);
                                                      setOpenDialog(null)
                                                }}
                                                openCreateTemplatePopUp={false}
                                          />
                                    )}

                                    {openDialog?.dialogType === 'aqua_sign' && (
                                          <CreateFormFromTemplate
                                                selectedTemplate={formTemplates.find(template => template.name === 'aqua_sign')!}
                                                callBack={async function (): Promise<void> {
                                                      await triggerWorkflowReload(RELOAD_KEYS.aqua_sign, true);
                                                      await triggerWorkflowReload(RELOAD_KEYS.all_files, true);
                                                      await triggerWorkflowReload(RELOAD_KEYS.user_files, true);
                                                      setOpenDialog(null)
                                                }}
                                                openCreateTemplatePopUp={false}
                                          />
                                    )}

                                    {openDialog?.dialogType === 'user_signature' && (
                                          <CreateFormFromTemplate
                                                selectedTemplate={formTemplates.find(template => template.name === 'user_signature')!}
                                                callBack={async function (): Promise<void> {
                                                      await triggerWorkflowReload(RELOAD_KEYS.user_signature, true);
                                                      await triggerWorkflowReload(RELOAD_KEYS.all_files, true);
                                                      await triggerWorkflowReload(RELOAD_KEYS.user_files, true);
                                                      setOpenDialog(null)
                                                }}
                                                openCreateTemplatePopUp={false}
                                          />
                                    )}

                                    {openDialog?.dialogType === 'identity_claim' && (
                                          <CreateFormFromTemplate
                                                selectedTemplate={formTemplates.find(template => template.name === 'identity_claim')!}
                                                callBack={async function (): Promise<void> {
                                                      await triggerWorkflowReload(RELOAD_KEYS.identity_claim, true);
                                                      await triggerWorkflowReload(RELOAD_KEYS.all_files, true);
                                                      await triggerWorkflowReload(RELOAD_KEYS.user_files, true);
                                                      setOpenDialog(null)
                                                }}
                                                openCreateTemplatePopUp={false}
                                          />
                                    )}


                                    {openDialog?.dialogType === 'dba_claim' && (
                                          <CreateFormFromTemplate
                                                selectedTemplate={formTemplates.find(template => template.name === 'dba_claim')!}
                                                callBack={async function (): Promise<void> {

                                                      await triggerWorkflowReload(RELOAD_KEYS.dba_claim, true);
                                                      await triggerWorkflowReload(RELOAD_KEYS.all_files, true);
                                                      await triggerWorkflowReload(RELOAD_KEYS.user_files, true);

                                                      setOpenDialog(null)
                                                }}
                                                openCreateTemplatePopUp={false}
                                          />
                                    )}


                                    {openDialog?.dialogType === 'dns_claim' && (
                                          <CreateFormFromTemplate
                                                selectedTemplate={formTemplates.find(template => template.name === 'domain_claim')!}
                                                callBack={async function (): Promise<void> {
                                                      await triggerWorkflowReload(RELOAD_KEYS.domain_claim, true);
                                                      await triggerWorkflowReload(RELOAD_KEYS.all_files, true);
                                                      await triggerWorkflowReload(RELOAD_KEYS.user_files, true);

                                                      setOpenDialog(null)
                                                }}
                                                openCreateTemplatePopUp={false}
                                          />
                                    )}

                                    {openDialog?.dialogType === 'identity_attestation' && (
                                          <CreateFormFromTemplate
                                                selectedTemplate={formTemplates.find(template => template.name === 'identity_attestation')!}
                                                callBack={async function (): Promise<void> {
                                                      await triggerWorkflowReload(RELOAD_KEYS.identity_attestation, true);
                                                      await triggerWorkflowReload(RELOAD_KEYS.all_files, true);
                                                      await triggerWorkflowReload(RELOAD_KEYS.user_files, true);
                                                      setOpenDialog(null)
                                                }}
                                                openCreateTemplatePopUp={false}
                                          />
                                    )}

                                    {openDialog?.dialogType === 'email_claim' && (
                                          <CreateFormFromTemplate
                                                selectedTemplate={formTemplates.find(template => template.name === 'email_claim')!}
                                                callBack={async function (): Promise<void> {

                                                      await triggerWorkflowReload(RELOAD_KEYS.email_claim, true);
                                                      await triggerWorkflowReload(RELOAD_KEYS.all_files, true);
                                                      await triggerWorkflowReload(RELOAD_KEYS.user_files, true);

                                                      setOpenDialog(null)
                                                }}
                                                openCreateTemplatePopUp={false}
                                          />
                                    )}

                                    {openDialog?.dialogType === 'phone_number_claim' && (
                                          <CreateFormFromTemplate
                                                selectedTemplate={formTemplates.find(template => template.name === 'phone_number_claim')!}
                                                callBack={async function (): Promise<void> {
                                                      await triggerWorkflowReload(RELOAD_KEYS.phone_number_claim, true);
                                                      await triggerWorkflowReload(RELOAD_KEYS.all_files, true);
                                                      await triggerWorkflowReload(RELOAD_KEYS.user_files, true);

                                                      setOpenDialog(null)
                                                }}
                                                openCreateTemplatePopUp={false}
                                          />
                                    )}
                              </ScrollArea>
                        </DialogContent>
                  </Dialog>

                  <Dialog
                        open={openDialog !== null && openDialog.isOpen && openDialog.dialogType == 'share_dialog'}
                        onOpenChange={openState => {
                              // setIsSelectedFileDialogOpen(openState)
                              if (!openState) {
                                    setSelectedFileInfo(null)
                                    setOpenDialog(null)
                              }
                        }}
                  >
                        <DialogContent showCloseButton={false} className="max-w-[96vw]! w-[96vw]! md:w-[65vw]! h-[98vh]! md:h-[75vh]! max-h-[98vh] p-0! gap-0 flex flex-col overflow-hidden">
                              <div className="h-full">
                                    {
                                          selectedFileInfo ? (
                                                <ShareComponent />
                                          ) : (
                                                <div className="h-full w-full flex items-center justify-center">
                                                      <p className="text-center text-lg">No file selected</p>
                                                </div>
                                          )
                                    }
                              </div>
                        </DialogContent>
                  </Dialog>


                  {/* chain details dialog */}
                  <Dialog
                        open={openDialog !== null && openDialog.isOpen && openDialog.dialogType == 'aqua_file_details'}
                        onOpenChange={openState => {
                              // setIsSelectedFileDialogOpen(openState)
                              if (!openState) {
                                    setSelectedFileInfo(null)
                                    setOpenDialog(null)
                              }
                        }}
                  >
                        <DialogContent showCloseButton={false} className="!max-w-[96vw] !w-[96vw] !h-[96vh] md:!h-[96vh] max-h-[96vh] !p-0 gap-0 flex flex-col">
                              {/* Close Button */}
                              <div className="absolute top-4 right-4 z-10">
                                    <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 bg-red-500 text-white hover:bg-red-500"
                                          onClick={() => {
                                                // setIsSelectedFileDialogOpen(false)
                                                setSelectedFileInfo(null)
                                                setOpenDialog(null)
                                          }}
                                    >
                                          <X className="h-4 w-4" />
                                    </Button>
                              </div>
                              {selectedFileInfo ? (
                                    <div className="flex flex-col flex-1 h-[calc(100%-60px)]">
                                          {/* Header - fixed height */}
                                          <DialogHeader className="!h-[60px] !min-h-[60px] !max-h-[60px] flex justify-center px-6">
                                                <DialogTitle style={{
                                                      textAlign: 'start',
                                                      maxWidth: '90%',
                                                      overflow: 'hidden',
                                                      textOverflow: 'ellipsis',
                                                      whiteSpace: 'nowrap'
                                                }}>
                                                      {getAquaTreeFileName(selectedFileInfo.aquaTree!)}
                                                </DialogTitle>
                                          </DialogHeader>
                                          {/* Content - takes all available space */}
                                          <div className="h-[calc(100%-60px)] overflow-y-auto">
                                                <CompleteChainView
                                                      callBack={function (_drawerStatus: IDrawerStatus): void {
                                                            setDrawerStatus(_drawerStatus)
                                                      }}
                                                      selectedFileInfo={selectedFileInfo}
                                                />
                                          </div>
                                    </div>
                              ) : null}
                              {/* Footer - fixed height */}
                              <DialogFooter className="!h-[60px] !min-h-[60px] !max-h-[60px] !p-0 flex items-center justify-center !px-6 ">
                                    <Button
                                          variant="outline"
                                          className="bg-black text-white-500 hover:bg-black-700 text-white cursor-pointer"
                                          onClick={() => {
                                                setSelectedFileInfo(null)
                                                setOpenDialog(null)
                                          }}
                                    >
                                          Cancel
                                    </Button>
                              </DialogFooter>
                        </DialogContent>
                  </Dialog>
            </>
      )
}