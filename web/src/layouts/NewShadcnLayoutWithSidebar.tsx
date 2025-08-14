import { ConnectWallet } from '../components/connect_wallet'
import { ConnectWalletPage } from '../components/connect_wallet_page'
import { Separator } from '../components/ui/separator'
import NotificationsBell from '../pages/notifications/NotificationsBell'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '../components/ui/sidebar'
import appStore from '../store'
import { Crown, X, Share2, Users, Lock, ExternalLink, Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { ClipLoader } from 'react-spinners'
import { toast, Toaster } from 'sonner'
import { useStore } from 'zustand'
// import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Dialog, DialogContent} from '../components/ui/dialog'
import { Button } from '../components/ui/button'
import CreateFormFromTemplate from '../components/aqua_forms/CreateFormFromTemplate'
import FormTemplateEditorShadcn from '../components/aqua_forms/FormTemplateEditorShadcn'
import { AppSidebar } from '../components/app_sidebar'
import WebsocketFragment from '@/components/navbar/WebsocketFragment'
import { ScrollArea } from '@/components/ui/scroll-area'
// import ClipboardButton from '@/components/ui/clipboard'
// import { Label } from '@/components/ui/label'
// import { Input } from '@/components/ui/input'
// import { ClipboardIcon } from 'lucide-react'
// import { Switch } from '@/components/ui/switch'
import { generateNonce } from 'siwe'
import axios from 'axios'
import { getAquaTreeFileObject } from '@/utils/functions'

export default function NewShadcnLayoutWithSidebar() {
      const {
            session,
            selectedFileInfo,
            setSelectedFileInfo,
            openDialog,
            setOpenDialog,
            formTemplates,
            backend_url
      } = useStore(appStore)

      const [loading, setLoading] = useState(true)
      const [recipientType, setRecipientType] = useState<'0xfabacc150f2a0000000000000000000000000000' | 'specific'>('0xfabacc150f2a0000000000000000000000000000')
      const [walletAddress, setWalletAddress] = useState('')
      const [optionType, setOptionType] = useState<'latest' | 'current'>('latest')
      const [shared, setShared] = useState<string | null>(null)
      const [sharing, setSharing] = useState(false)
      const [copied, setCopied] = useState(false)
      const recipient = recipientType === '0xfabacc150f2a0000000000000000000000000000' ? '0xfabacc150f2a0000000000000000000000000000' : walletAddress

      useEffect(() => {
            const timer = setTimeout(() => {
                  setLoading(false)
            }, 1000)
            return () => clearTimeout(timer)
      }, [])

      const handleCopy = () => {
            if (shared) {
                  navigator.clipboard.writeText(shared)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
            }
      }

      const handleShare = async () => {
            if (!selectedFileInfo) {
                  toast.error(`selected file not found`)
                  return
            }
            if (recipientType == 'specific' && walletAddress == '') {
                  toast.error(`If recipient is specific a wallet address has to be specified.`)
                  return
            }
            setSharing(true)

            const unique_identifier = `${Date.now()}_${generateNonce()}`
            const url = `${backend_url}/share_data`

            const allHashes = Object.keys(selectedFileInfo!.aquaTree!.revisions!)
            const latest = allHashes[allHashes.length - 1]
            let recepientWalletData = recipient
            if (recipient == '') {
                  recepientWalletData = '0xfabacc150f2a0000000000000000000000000000'
            }

            let mainFileObject = getAquaTreeFileObject(selectedFileInfo)

            if (!mainFileObject) {
                  toast.error(`selected file name not found`)
                  return
            }

            const response = await axios.post(
                  url,
                  {
                        latest: latest,
                        hash: unique_identifier,
                        recipient: recepientWalletData,
                        option: optionType,
                        file_name: mainFileObject.fileName,
                  },
                  {
                        headers: {
                              nonce: session?.nonce,
                        },
                  }
            )

            if (response.status === 200) {
                  setSharing(false)
                  const domain = window.location.origin
                  setShared(`${domain}/app/shared-contracts/${unique_identifier}`)
            } else {
                  toast.error('Error sharing')
                  setSharing(false)
            }
      }

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
                                                      <div className="flex items-center gap-3">
                                                            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5"
                                                                  onClick={() => {
                                                                        setOpenDialog({
                                                                              dialogType: 'early_bird_offer',
                                                                              isOpen: true,
                                                                              onClose: () => setOpenDialog(null),
                                                                              onConfirm: (data) => {
                                                                                    console.log('Early bird offer confirmed with data:', data)
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
                                          <Toaster position="top-right" richColors />
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
                                                setSelectedFileInfo(null)
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
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                              {/* <div className="sm:!max-w-[65vw] sm:!w-[65vw] sm:h-[65vh] sm:max-h-[65vh] !max-w-[95vw] !w-[95vw]  bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden"> */}
                              <div className="sm:!max-w-[65vw] sm:!w-[45vw] sm:h-[75vh] sm:max-h-[95vh] !max-w-[60vw] !w-[65vw]  bg-white rounded-xl shadow-2xl   overflow-hidden ">
                                    {/* Header */}
                                    <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                                          <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                      <div className="p-2 bg-blue-100 rounded-lg">
                                                            <Share2 className="w-5 h-5 text-blue-600" />
                                                      </div>
                                                      <div>
                                                            <h2 className="text-lg font-semibold text-gray-900">Share Document</h2>
                                                            <p className="text-sm text-gray-600">{selectedFileInfo.fileObject[0].fileName}</p>
                                                      </div>
                                                </div>
                                                <button 
                                                      onClick={() => {
                                                            setOpenDialog(null)
                                                            setSelectedFileInfo(null)
                                                      }}
                                                      className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                                                >
                                                      <X className="w-5 h-5 text-gray-400" />
                                                </button>
                                          </div>
                                    </div>

                                    {/* Content */}
                                    <div className="px-6 py-6 space-y-6 max-h-[60vh] overflow-y-auto">
                                          {/* Warning */}
                                          <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                                <div className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                                      <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                                </div>
                                                <div>
                                                      <p className="text-sm font-medium text-amber-800">Important</p>
                                                      <p className="text-sm text-amber-700 mt-1">
                                                            Once shared, don't delete this file as it will break the shared link for recipients.
                                                      </p>
                                                </div>
                                          </div>

                                          {/* Recipient Selection */}
                                          <div className="space-y-4">
                                                <h3 className="text-base font-medium text-gray-900 flex items-center gap-2">
                                                      <Users className="w-4 h-4" />
                                                      Who can access
                                                </h3>
                                                
                                                <div className="grid gap-3">
                                                      {/* Public Option */}
                                                      <div
                                                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                                                  recipientType !== 'specific' 
                                                                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20' 
                                                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                            }`}
                                                            onClick={() => setRecipientType('0xfabacc150f2a0000000000000000000000000000')}
                                                      >
                                                            <div className="flex items-center justify-between">
                                                                  <div className="flex items-center gap-3">
                                                                        <div className={`p-2 rounded-lg ${recipientType !== 'specific' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                                                              <ExternalLink className={`w-4 h-4 ${recipientType !== 'specific' ? 'text-blue-600' : 'text-gray-600'}`} />
                                                                        </div>
                                                                        <div>
                                                                              <div className="font-medium text-sm">Anyone with link</div>
                                                                              <div className="text-xs text-gray-500">Public access to shared document</div>
                                                                        </div>
                                                                  </div>
                                                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                                                        recipientType !== 'specific' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                                                                  }`}>
                                                                        {recipientType !== 'specific' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                                                  </div>
                                                            </div>
                                                      </div>

                                                      {/* Specific Wallet Option */}
                                                      <div
                                                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                                                  recipientType === 'specific' 
                                                                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20' 
                                                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                            }`}
                                                            onClick={() => setRecipientType('specific')}
                                                      >
                                                            <div className="flex items-center justify-between">
                                                                  <div className="flex items-center gap-3">
                                                                        <div className={`p-2 rounded-lg ${recipientType === 'specific' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                                                              <Lock className={`w-4 h-4 ${recipientType === 'specific' ? 'text-blue-600' : 'text-gray-600'}`} />
                                                                        </div>
                                                                        <div>
                                                                              <div className="font-medium text-sm">Specific wallet</div>
                                                                              <div className="text-xs text-gray-500">Restricted access by wallet address</div>
                                                                        </div>
                                                                  </div>
                                                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                                                        recipientType === 'specific' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                                                                  }`}>
                                                                        {recipientType === 'specific' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                                                  </div>
                                                            </div>
                                                      </div>
                                                </div>

                                                {/* Wallet Address Input */}
                                                {recipientType === 'specific' && (
                                                      <div className="ml-12 space-y-2">
                                                            <input
                                                                  type="text"
                                                                  placeholder="Enter wallet address (0x...)"
                                                                  value={walletAddress}
                                                                  onChange={(e) => setWalletAddress(e.target.value)}
                                                                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-mono"
                                                            />
                                                      </div>
                                                )}
                                          </div>

                                          {/* Sharing Options */}
                                          <div className="space-y-4">
                                                <h3 className="text-base font-medium text-gray-900">Version to share</h3>
                                                <p className="text-sm text-gray-600">Choose whether recipients get the current version or receive updates automatically.</p>
                                                
                                                <div className="grid gap-3">
                                                      {/* Latest Option */}
                                                      <div
                                                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                                                  optionType === 'latest' 
                                                                        ? 'border-green-500 bg-green-50 ring-2 ring-green-500/20' 
                                                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                            }`}
                                                            onClick={() => setOptionType('latest')}
                                                      >
                                                            <div className="flex items-center justify-between">
                                                                  <div>
                                                                        <div className="font-medium text-sm flex items-center gap-2">
                                                                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                                              Latest (Live Updates)
                                                                        </div>
                                                                        <div className="text-xs text-gray-500 mt-1">Recipients get all future changes automatically</div>
                                                                  </div>
                                                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                                                        optionType === 'latest' ? 'border-green-500 bg-green-500' : 'border-gray-300'
                                                                  }`}>
                                                                        {optionType === 'latest' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                                                  </div>
                                                            </div>
                                                      </div>

                                                      {/* Current Option */}
                                                      <div
                                                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                                                  optionType === 'current' 
                                                                        ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-500/20' 
                                                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                            }`}
                                                            onClick={() => setOptionType('current')}
                                                      >
                                                            <div className="flex items-center justify-between">
                                                                  <div>
                                                                        <div className="font-medium text-sm flex items-center gap-2">
                                                                              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                                                              Current (Snapshot)
                                                                        </div>
                                                                        <div className="text-xs text-gray-500 mt-1">Recipients get the current version only</div>
                                                                  </div>
                                                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                                                        optionType === 'current' ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                                                                  }`}>
                                                                        {optionType === 'current' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                                                  </div>
                                                            </div>
                                                      </div>
                                                </div>
                                          </div>

                                          {/* Loading State */}
                                          {sharing && (
                                                <div className="flex flex-col items-center py-8 space-y-3">
                                                      <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                                                      <p className="text-sm text-gray-600">Creating share link...</p>
                                                </div>
                                          )}

                                          {/* Shared Link */}
                                          {shared && !sharing && (
                                                <div className="space-y-3">
                                                      <h3 className="text-base font-medium text-gray-900">Share Link Ready</h3>
                                                      <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                                                            <div className="flex items-center gap-3">
                                                                  <ExternalLink className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                                                  <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-mono text-gray-700 break-all">{shared}</p>
                                                                  </div>
                                                            </div>
                                                      </div>
                                                      <p className="text-xs text-gray-500">Share this link with your intended recipients</p>
                                                </div>
                                          )}

                                          {/* Existing Contracts */}
                                          <div className="border-t pt-6">
                                                <h3 className="text-base font-medium text-gray-900 mb-3">Previous Shares</h3>
                                                <div className="text-center py-8 text-gray-400">
                                                      <Share2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                      <p className="text-sm">No previous sharing contracts</p>
                                                </div>
                                          </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-between gap-3">
                                          <button 
                                                onClick={() => {
                                                      setOpenDialog(null)
                                                      setSelectedFileInfo(null)
                                                }}
                                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                                          >
                                                Cancel
                                          </button>
                                          
                                          {shared ? (
                                                <button
                                                      onClick={handleCopy}
                                                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                                                >
                                                      {copied ? (
                                                            <>
                                                                  <Check className="w-4 h-4" />
                                                                  Copied!
                                                            </>
                                                      ) : (
                                                            <>
                                                                  <Copy className="w-4 h-4" />
                                                                  Copy Link
                                                            </>
                                                      )}
                                                </button>
                                          ) : (
                                                <button
                                                      onClick={handleShare}
                                                      disabled={sharing}
                                                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                                >
                                                      {sharing ? (
                                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                      ) : (
                                                            <Share2 className="w-4 h-4" />
                                                      )}
                                                      {sharing ? 'Sharing...' : 'Create Share Link'}
                                                </button>
                                          )}
                                    </div>
                              </div>
                        </div>
                  )}
            </>
      )
}

// import { ConnectWallet } from '../components/connect_wallet'
// import { ConnectWalletPage } from '../components/connect_wallet_page'
// import { Separator } from '../components/ui/separator'
// import NotificationsBell from '../pages/notifications/NotificationsBell'
// import { SidebarInset, SidebarProvider, SidebarTrigger } from '../components/ui/sidebar'
// import appStore from '../store'
// import { Crown, X } from 'lucide-react'
// import { useEffect, useState } from 'react'
// import { Outlet } from 'react-router-dom'
// import { ClipLoader } from 'react-spinners'
// import { toast, Toaster } from 'sonner'
// import { useStore } from 'zustand'
// import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
// import { Button } from '../components/ui/button'
// import CreateFormFromTemplate from '../components/aqua_forms/CreateFormFromTemplate'
// import FormTemplateEditorShadcn from '../components/aqua_forms/FormTemplateEditorShadcn'
// import { AppSidebar } from '../components/app_sidebar'
// import WebsocketFragment from '@/components/navbar/WebsocketFragment'
// import { ScrollArea } from '@/components/ui/scroll-area'
// import ClipboardButton from '@/components/ui/clipboard'
// import { Label } from '@/components/ui/label'
// import { Input } from '@/components/ui/input'
// import { ClipboardIcon } from 'lucide-react'
// import { Switch } from '@/components/ui/switch'
// import { generateNonce } from 'siwe'
// import axios from 'axios'
// import { getAquaTreeFileObject } from '@/utils/functions'

// export default function NewShadcnLayoutWithSidebar() {
//       const {
//             session,
//             // openCreateClaimAttestationPopUp,
//             // setOpenCreateClaimAttestationPopUp,
//             // openCreateClaimPopUp,
//             // setOpenCreateClaimPopUp,
//             // openCreateAquaSignPopUp,
//             // setOpenCreateAquaSignPopUp,
//             //      openCreateTemplatePopUp,
//             // setOpenCreateTemplatePopUp,
//             selectedFileInfo,
//             setSelectedFileInfo,
//             openDialog,
//             setOpenDialog,
//             formTemplates,
//             backend_url
//       } = useStore(appStore)

//       const [loading, setLoading] = useState(true)


//       const [recipientType, setRecipientType] = useState<'0xfabacc150f2a0000000000000000000000000000' | 'specific'>('0xfabacc150f2a0000000000000000000000000000')
//       const [walletAddress, setWalletAddress] = useState('')
//       const [optionType, setOptionType] = useState<'latest' | 'current'>('latest')
//       const [shared, setShared] = useState<string | null>(null)
//       const [sharing, setSharing] = useState(false)
//       const recipient = recipientType === '0xfabacc150f2a0000000000000000000000000000' ? '0xfabacc150f2a0000000000000000000000000000' : walletAddress


//       useEffect(() => {
//             const timer = setTimeout(() => {
//                   setLoading(false)
//             }, 1000)
//             return () => clearTimeout(timer)
//       }, [])



//       if (loading) {
//             return (
//                   <div
//                         style={{
//                               display: 'flex',
//                               flexDirection: 'column',
//                               alignItems: 'center',
//                               justifyContent: 'center',
//                               height: '100vh',
//                               width: '100vw',
//                         }}
//                   >
//                         <ClipLoader color={'blue'} loading={loading} size={150} aria-label="Loading Spinner" data-testid="loader" />
//                         <span style={{ fontSize: 24, fontWeight: 500 }}>Loading...</span>
//                   </div>
//             )
//       }




//       const handleShare = async () => {

//             if (!selectedFileInfo) {
//                   toast.error(`selected file not found`)
//                   return
//             }
//             if (recipientType == 'specific' && walletAddress == '') {
//                   toast.error(`If recipient is specific a wallet address has to be specified.`)
//                   return
//             }
//             setSharing(true)

//             const unique_identifier = `${Date.now()}_${generateNonce()}`
//             const url = `${backend_url}/share_data`

//             const allHashes = Object.keys(selectedFileInfo!.aquaTree!.revisions!)
//             const latest = allHashes[allHashes.length - 1]
//             let recepientWalletData = recipient
//             if (recipient == '') {
//                   recepientWalletData = '0xfabacc150f2a0000000000000000000000000000'
//             }

//             let mainFileObject = getAquaTreeFileObject(selectedFileInfo)

//             if (!mainFileObject) {
//                   toast.error(`selected file name not found`)
//                   return
//             }

//             const response = await axios.post(
//                   url,
//                   {
//                         latest: latest,
//                         hash: unique_identifier,
//                         recipient: recepientWalletData,
//                         option: optionType,
//                         file_name: mainFileObject.fileName,
//                   },
//                   {
//                         headers: {
//                               nonce: session?.nonce,
//                         },
//                   }
//             )

//             if (response.status === 200) {
//                   setSharing(false)
//                   const domain = window.location.origin
//                   setShared(`${domain}/app/shared-contracts/${unique_identifier}`)
//             } else {
//                   toast.error('Error sharing')
//             }
//       }

//       return (
//             <>
//                   {session == null ? (
//                         <>
//                               <ConnectWalletPage />
//                         </>
//                   ) : (
//                         <SidebarProvider>
//                               <WebsocketFragment />
//                               <AppSidebar className="hidden md:block" />
//                               <SidebarInset>
//                                     <header className="flex h-16 shrink-0 items-center gap-2 border-b sticky top-0 z-50 bg-accent w-full">
//                                           <div className="flex items-center gap-2 px-3 w-full">
//                                                 <SidebarTrigger />
//                                                 <Separator orientation="vertical" className="mr-2 h-4" />

//                                                 {/* Desktop Navigation */}
//                                                 <div className="hidden md:flex items-center space-x-4 ms-auto">
//                                                       <NotificationsBell />
//                                                       {/* <Button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"> Free Verision</Button> */}

//                                                       <div className="flex items-center gap-3">
//                                                             <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5"
//                                                                   onClick={() => {
//                                                                         setOpenDialog({
//                                                                               dialogType: 'early_bird_offer',
//                                                                               isOpen: true,
//                                                                               onClose: () => setOpenDialog(null),
//                                                                               onConfirm: (data) => {
//                                                                                     // Handle confirmation logic here
//                                                                                     console.log('Early bird offer confirmed with data:', data)
//                                                                               }
//                                                                         })
//                                                                   }}
//                                                             >
//                                                                   <Crown className="w-4 h-4 text-blue-600" />
//                                                                   <span className="text-sm text-blue-700 font-medium">Free Plan</span>
//                                                             </div>
//                                                             {/* <button
//                                                                   onClick={() => {
//                                                                         setOpenDialog({
//                                                                               dialogType: 'early_bird_offer',
//                                                                               isOpen: true,
//                                                                               onClose: () => setOpenDialog(null),
//                                                                               onConfirm: (data) => {
//                                                                                     // Handle confirmation logic here
//                                                                                     console.log('Early bird offer confirmed with data:', data)
//                                                                               }
//                                                                         })
//                                                                   }}
//                                                                   className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors flex items-center gap-2"
//                                                             >
//                                                                   <Zap className="w-4 h-4" />
//                                                                   Upgrade to Pro
//                                                             </button> */}
//                                                       </div>
//                                                       <ConnectWallet dataTestId="sign-in-button-files-list" />
//                                                 </div>

//                                                 {/* Mobile Navigation */}
//                                                 <div className="flex md:hidden items-center space-x-1 ms-auto">
//                                                       {/* Notification bell component */}
//                                                       <NotificationsBell />

//                                                       {/* Mobile dropdown menu */}
//                                                       {/* <DropdownMenu>
//                                             <DropdownMenuTrigger asChild>
//                                                 <Button variant="ghost" size="icon" className="h-9 w-9 p-0">
//                                                     <MoreVertical className="h-5 w-5" />
//                                                 </Button>
//                                             </DropdownMenuTrigger>
//                                             <DropdownMenuContent align="end" className="w-[200px]">
//                                                 <DropdownMenuItem>
//                                                     <span className="w-full text-center">Start free trial</span>
//                                                 </DropdownMenuItem>
//                                             </DropdownMenuContent>
//                                         </DropdownMenu> */}

//                                                       {/* Always show wallet connect button but with smaller padding */}
//                                                       <div className="scale-90 origin-right">
//                                                             <ConnectWallet dataTestId="sign-in-button-files-list" />
//                                                       </div>
//                                                 </div>
//                                           </div>
//                                     </header>
//                                     {/* <div className="flex flex-1 flex-col gap-4 md:px-4 px-2">
//                                 <Toaster position="top-right" richColors />
//                                 <Outlet />
//                             </div> */}
//                                     <div className="flex-1 w-full max-w-full overflow-hidden px-2">
//                                           <Toaster position="top-right" richColors />
//                                           <Outlet />
//                                     </div>
//                               </SidebarInset>
//                         </SidebarProvider>
//                   )}



//                   {openDialog?.dialogType === 'early_bird_offer' && (
//                         <div className="fixed inset-0 bg-black bg-opacity-5 flex items-center justify-center z-50 p-4">
//                               <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative animate-in fade-in duration-200">
//                                     {/* Close Button */}
//                                     <button
//                                           onClick={() => {
//                                                 // setShowPopup(false)
//                                                 setOpenDialog(null)
//                                           }}
//                                           className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
//                                     >
//                                           <X size={20} />
//                                     </button>

//                                     {/* Popup Content */}
//                                     <div className="text-center">
//                                           <div className="mb-4">
//                                                 <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
//                                                       {/* <Mail className="w-8 h-8 text-green-600" /> */}
//                                                       <Crown className="w-8 h-8 text-orange-600" />
//                                                 </div>
//                                                 <h2 className="text-2xl font-bold text-gray-900 mb-2">
//                                                       Early Bird Special! 🎉
//                                                 </h2>
//                                                 {/* <p className="text-gray-600 leading-relaxed">
//                                                       The code is better! If you're interested in our early bird offer of
//                                                       <span className="font-semibold text-green-600"> 25% off</span>,
//                                                       please email us at:
//                                                 </p> */}

//                                                 <h4 className="text-md font-bold text-gray-900 mb-2">
//                                                       Upgrade to Pro! 🚀
//                                                 </h4>
//                                                 <p className="text-gray-600 leading-relaxed">
//                                                       Get access to premium features with our early bird offer of
//                                                       <span className="font-semibold text-orange-600"> 25% off</span>.
//                                                       Contact us to unlock the full potential:
//                                                 </p>
//                                           </div>

//                                           <div className="bg-gray-50 rounded-lg p-4 mb-6">
//                                                 <a
//                                                       href="mailto:info@inblock.io"
//                                                       className="text-blue-600 hover:text-blue-800 font-medium text-lg transition-colors"
//                                                 >
//                                                       info@inblock.io
//                                                 </a>
//                                           </div>

//                                           <div className="flex gap-3">
//                                                 <button
//                                                       onClick={() => {
//                                                             setOpenDialog(null)
//                                                             // setShowPopup(false)
//                                                       }}
//                                                       className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
//                                                 >
//                                                       Maybe Later
//                                                 </button>
//                                                 <a
//                                                       href="mailto:info@inblock.io"
//                                                       className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-center"
//                                                 >
//                                                       Send Email
//                                                 </a>
//                                           </div>
//                                     </div>
//                               </div>
//                         </div>

//                   )}

//                   <Dialog
//                         open={openDialog !== null && openDialog.isOpen && openDialog.dialogType != 'aqua_file_details'  && openDialog.dialogType != 'share_dialog' && openDialog.dialogType != 'early_bird_offer'}
//                         onOpenChange={openState => {
//                               if (!openState) {
//                                     setOpenDialog(null)
//                               }
//                         }}

//                   >
//                         <DialogContent

//                               className={
//                                     openDialog?.dialogType === 'form_template_editor' ?
//                                           "[&>button]:hidden !max-w-[95vw] !w-[95vw] h-[95vh] max-h-[95vh] sm:!max-w-[95vw] sm:!w-[95vw] sm:h-[95vh] sm:max-h-[95vh] flex flex-col" :
//                                           openDialog?.dialogType === 'identity_attestation' ?
//                                                 "[&>button]:hidden !max-w-[65vw] !w-[65vw] h-[85vh] max-h-[85vh] sm:!max-w-[65vw] sm:!w-[65vw] sm:h-[85vh] sm:max-h-[85vh] flex flex-col" :
//                                                 "[&>button]:hidden sm:!max-w-[65vw] sm:!w-[65vw] sm:h-[65vh] sm:max-h-[65vh] !max-w-[95vw] !w-[95vw] h-[95vh] max-h-[95vh] flex flex-col p-0 gap-0"
//                               }>
//                               <div className="absolute top-4 right-4">
//                                     <Button
//                                           variant="ghost"
//                                           size="icon"
//                                           className="h-6 w-6 bg-red-500 text-white hover:bg-red-500 z-10 relative"
//                                           onClick={() => {
//                                                 setOpenDialog(null)
//                                                 setSelectedFileInfo(null)
//                                           }}
//                                     >
//                                           <X className="h-4 w-4" />
//                                     </Button>
//                               </div>

//                               <ScrollArea className="h-full">

//                                     {openDialog?.dialogType === 'form_template_editor' && (

//                                           <FormTemplateEditorShadcn
//                                                 onSave={function (): void {
//                                                       // setOpenCreateTemplatePopUp(false)
//                                                       setOpenDialog(null)
//                                                 }}
//                                           />)}

//                                     {openDialog?.dialogType === 'aqua_sign' && (
//                                           <CreateFormFromTemplate
//                                                 selectedTemplate={formTemplates.find(template => template.name === 'aqua_sign')!}
//                                                 callBack={function (): void {
//                                                       // setOpenCreateAquaSignPopUp(false)
//                                                       setOpenDialog(null)
//                                                 }}
//                                                 openCreateTemplatePopUp={false}
//                                           />
//                                     )}

//                                     {openDialog?.dialogType === 'user_signature' && (
//                                           <CreateFormFromTemplate
//                                                 selectedTemplate={formTemplates.find(template => template.name === 'user_signature')!}
//                                                 callBack={function (): void {
//                                                       // setOpenCreateAquaSignPopUp(false)
//                                                       setOpenDialog(null)
//                                                 }}
//                                                 openCreateTemplatePopUp={false}
//                                           />
//                                     )}


//                                     {openDialog?.dialogType === 'identity_claim' && (
//                                           <CreateFormFromTemplate
//                                                 selectedTemplate={formTemplates.find(template => template.name === 'identity_claim')!}
//                                                 callBack={function (): void {
//                                                       // setOpenCreateClaimPopUp(false)
//                                                       setOpenDialog(null)
//                                                 }}
//                                                 openCreateTemplatePopUp={false}
//                                           />
//                                     )}


//                                     {openDialog?.dialogType === 'dns_claim' && (
//                                           <CreateFormFromTemplate
//                                                 selectedTemplate={formTemplates.find(template => template.name === 'domain_claim')!}
//                                                 callBack={function (): void {
//                                                       // setOpenCreateClaimPopUp(false)
//                                                       setOpenDialog(null)
//                                                 }}
//                                                 openCreateTemplatePopUp={false}
//                                           />
//                                     )}


//                                     {openDialog?.dialogType === 'identity_attestation' && (
//                                           <CreateFormFromTemplate
//                                                 selectedTemplate={formTemplates.find(template => template.name === 'identity_attestation')!}
//                                                 callBack={function (): void {
//                                                       // setOpenCreateClaimAttestationPopUp(false)
//                                                       setOpenDialog(null)
//                                                 }}
//                                                 openCreateTemplatePopUp={false}
//                                           />
//                                     )}


//                                     {openDialog?.dialogType === 'email_claim' && (
//                                           <CreateFormFromTemplate
//                                                 selectedTemplate={formTemplates.find(template => template.name === 'email_claim')!}
//                                                 callBack={function (): void {
//                                                       // setOpenCreateClaimAttestationPopUp(false)
//                                                       setOpenDialog(null)
//                                                 }}
//                                                 openCreateTemplatePopUp={false}
//                                           />
//                                     )}


//                                     {openDialog?.dialogType === 'phone_number_claim' && (
//                                           <CreateFormFromTemplate
//                                                 selectedTemplate={formTemplates.find(template => template.name === 'phone_number_claim')!}
//                                                 callBack={function (): void {
//                                                       // setOpenCreateClaimAttestationPopUp(false)
//                                                       setOpenDialog(null)
//                                                 }}
//                                                 openCreateTemplatePopUp={false}
//                                           />
//                                     )}

//                               </ScrollArea>


//                         </DialogContent>
//                   </Dialog>




//                   <Dialog open={openDialog !== null && openDialog.isOpen && openDialog.dialogType == 'share_dialog'}
//                         onOpenChange={openState => {
//                               if (!openState) {
//                                     setOpenDialog(null)
//                                     setSelectedFileInfo(null)
//                               }
//                         }}>
//                         {selectedFileInfo != null ?

//                               <DialogContent  className={
//                                "[&>button]:hidden sm:!max-w-[65vw] sm:!w-[65vw] sm:h-[65vh] sm:max-h-[65vh] !max-w-[95vw] !w-[95vw] h-[95vh] max-h-[95vh] flex flex-col p-0 gap-0"
//                               }>
//                                     <DialogHeader>
//                                           <DialogTitle className="text-lg font-semibold">Sharing {selectedFileInfo.fileObject[0].fileName}</DialogTitle>
//                                     </DialogHeader>

//                                     <div className="space-y-4">
//                                           {/* Warning Message */}
//                                           <p className="text-sm text-gray-600">
//                                                 You are about to share {selectedFileInfo.fileObject[0].fileName}. Once a file is shared, don't delete it otherwise it will be broken if one tries to import it.
//                                           </p>

//                                           {/* Share with specific wallet toggle */}
//                                           <div className="flex items-center justify-between py-2">
//                                                 <Label className="text-sm font-medium">Share with specific wallet</Label>
//                                                 <Switch
//                                                       checked={recipientType === 'specific'}
//                                                       onCheckedChange={checked => setRecipientType(checked ? 'specific' : '0xfabacc150f2a0000000000000000000000000000')}
//                                                 />
//                                           </div>

//                                           {/* Wallet Address Input */}
//                                           {recipientType === 'specific' && (
//                                                 <div className="space-y-2">
//                                                       <Input placeholder="Enter wallet address" value={walletAddress} onChange={e => setWalletAddress(e.target.value)} className="w-full" />
//                                                 </div>
//                                           )}

//                                           {/* Sharing Options */}
//                                           <div className="space-y-3">
//                                                 <Label className="text-sm font-medium">
//                                                       Sharing Option (Would the recipient to get the the Aqua Tree as is Or receive the tree with any new revisions you will add?)
//                                                 </Label>

//                                                 <div className="space-y-2">
//                                                       {/* Latest Option */}
//                                                       <div
//                                                             className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${optionType === 'latest' ? 'border-blue-500 bg-orange-100/80' : 'border-gray-200 hover:border-gray-300'
//                                                                   }`}
//                                                             onClick={() => setOptionType('latest')}
//                                                       >
//                                                             <div className="flex-1">
//                                                                   <div className="font-medium text-sm">Latest</div>
//                                                                   <div className="text-xs text-gray-500">Share latest revision in tree</div>
//                                                             </div>
//                                                             <div
//                                                                   className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${optionType === 'latest' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
//                                                                         }`}
//                                                             >
//                                                                   {optionType === 'latest' && <div className="w-2 h-2 bg-white rounded-full"></div>}
//                                                             </div>
//                                                       </div>

//                                                       {/* Current Option */}
//                                                       <div
//                                                             className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${optionType === 'current' ? 'border-blue-500 bg-orange-100/80' : 'border-gray-200 hover:border-gray-300'
//                                                                   }`}
//                                                             onClick={() => setOptionType('current')}
//                                                       >
//                                                             <div className="flex-1">
//                                                                   <div className="font-medium text-sm">Current</div>
//                                                                   <div className="text-xs text-gray-500">Share current tree</div>
//                                                             </div>
//                                                             <div
//                                                                   className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${optionType === 'current' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
//                                                                         }`}
//                                                             >
//                                                                   {optionType === 'current' && <div className="w-2 h-2 bg-white rounded-full"></div>}
//                                                             </div>
//                                                       </div>
//                                                 </div>
//                                           </div>

//                                           {/* Loading Spinner */}
//                                           {sharing && (
//                                                 <div className="flex justify-center py-4">
//                                                       <ClipLoader color="#3B82F6" loading={true} size={30} aria-label="Loading Spinner" />
//                                                 </div>
//                                           )}

//                                           {/* Shared Link - FIXED OVERFLOW */}
//                                           {shared && (
//                                                 <div className="space-y-2">
//                                                       <Label className="text-sm font-medium">Shared Document Link</Label>
//                                                       <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded border min-w-0">
//                                                             <ClipboardIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
//                                                             <span className="text-sm text-gray-700 flex-1 min-w-0 break-all overflow-hidden" data-testid="share-url" title={shared}>
//                                                                   {shared}
//                                                             </span>
//                                                       </div>
//                                                       <p className="text-xs text-gray-500">Copy the link above and share</p>
//                                                 </div>
//                                           )}

//                                           {/* Existing sharing contracts section */}
//                                           <div className="border-t pt-4">
//                                                 <h3 className="font-medium text-sm mb-2">Existing sharing contracts</h3>
//                                                 {/* This section appears empty in the design, so leaving it as placeholder */}
//                                           </div>
//                                     </div>

//                                     <DialogFooter className="flex justify-between">
//                                           <Button variant="outline" onClick={() => {
//                                                 // setIsOpenChange(false)
//                                                 setOpenDialog(null)
//                                                 setSelectedFileInfo(null)
//                                           }} data-testid="share-cancel-action-button">
//                                                 Cancel
//                                           </Button>

//                                           {shared ? (
//                                                 <ClipboardButton value={shared} />
//                                           ) : (
//                                                 <Button onClick={handleShare} disabled={sharing} data-testid="share-modal-action-button-dialog" className="bg-black text-white hover:bg-gray-800">
//                                                       Share
//                                                 </Button>
//                                           )}
//                                     </DialogFooter>
//                               </DialogContent>

//                               : null}
//                   </Dialog>
//             </>
//       )
// }
