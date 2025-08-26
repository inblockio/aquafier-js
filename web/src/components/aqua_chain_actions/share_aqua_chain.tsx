import { LuShare2 } from 'react-icons/lu'
import { useStore } from 'zustand'
import appStore from '../../store'
// import axios from 'axios'
// import { useEffect, useState } from 'react'
// import { generateNonce } from 'siwe'
// import { ClipLoader } from 'react-spinners'
// import { toast } from 'sonner'
// import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { IShareButton } from '../../types/types'
// import ClipboardButton from '@/components/ui/clipboard'
// import { Label } from '@/components/ui/label'
// import { Input } from '@/components/ui/input'
// import { ClipboardIcon } from 'lucide-react'
// import { Switch } from '@/components/ui/switch'
// import { Button } from '@/components/ui/button'

export const ShareButton = ({ item, index, autoOpenShareDialog }: IShareButton) => {
      const { setOpenDialog, setSelectedFileInfo } = useStore(appStore)
      // const [isOpenState, setIsOpenState] = useState(false)
      // const [sharing, setSharing] = useState(false)
      // const [fileName, setFileName] = useState('')
      // const [shared, setShared] = useState<string | null>(null)

      // const [recipientType, setRecipientType] = useState<'0xfabacc150f2a0000000000000000000000000000' | 'specific'>('0xfabacc150f2a0000000000000000000000000000')
      // const [walletAddress, setWalletAddress] = useState('')
      // const [optionType, setOptionType] = useState<'latest' | 'current'>('latest')

      // const recipient = recipientType === '0xfabacc150f2a0000000000000000000000000000' ? '0xfabacc150f2a0000000000000000000000000000' : walletAddress

      // // Effect for setting filename when item changes
      // useEffect(() => {
      //        console.log(`item dep array`)
      //       if (item) {
      //             const name = item.fileObject[0].fileName
      //             setFileName(name)
      //       }
      // }, [item])

      // // Effect for auto-opening dialog
      // useEffect(() => {
      //        console.log(`autoOpenShareDialog dep array`)
      //       if (autoOpenShareDialog) {
      //             setIsOpenChange(true)
      //       }
      // }, [autoOpenShareDialog])


      //  useEffect(() => {
      //       console.log(`no dep array`)
      //       if (autoOpenShareDialog) {
      //             setIsOpenChange(true)
      //       }
      // }, [])

      // Effect for setting filename when item changes
      // useEffect(() => {
      //       console.log(`item dep array`)
      //       if (item) {
      //             const name = item.fileObject[0].fileName
      //             setFileName(name)

      //             console.log(`isOpenState  ${isOpenState}  -- autoOpenShareDialog ${autoOpenShareDialog} `)
      //           if(autoOpenShareDialog != undefined){
      //               if (isOpenState != autoOpenShareDialog) {
      //                   setIsOpenChange(autoOpenShareDialog)
      //             }
      //           }
      //       }

      // }, [item, autoOpenShareDialog])

      // const setIsOpenChange = (isOpen: boolean) => {
      //       console.log('setIsOpenChange called with:', isOpen)
      //       setIsOpenState(isOpen)
      //       // Reset state to default when closing the dialog
      //       if (!isOpen) {
      //             setSharing(false)
      //             setShared(null)
      //             setRecipientType('0xfabacc150f2a0000000000000000000000000000')
      //             setWalletAddress('')
      //             setOptionType('latest')
      //       }
      // }

      // REMOVE THIS COMPLETELY - it's not needed and might be causing conflicts
      // useEffect(() => {
      //     console.log(`no dep array`)
      //     if (autoOpenShareDialog) {
      //         setIsOpenChange(true)
      //     }
      // }, [])

      // const setIsOpenChange = (isOpen: boolean) => {
      //       setIsOpenState(isOpen)
      //       // Reset state to default when closing the dialog
      //       if (!isOpen) {
      //             setSharing(false)
      //             setShared(null)
      //             setRecipientType('0xfabacc150f2a0000000000000000000000000000')
      //             setWalletAddress('')
      //             setOptionType('latest')
      //       }
      // }


      return (
            <>
                  {/* Share Button */}
                  {
                        autoOpenShareDialog ? <></> :

                              <button
                                    data-testid={'share-action-button-' + index}
                                    onClick={() => {
                                          // setIsOpenChange(true)
                                          setSelectedFileInfo(item)
                                          setOpenDialog({
                                                dialogType: 'share_dialog',
                                                isOpen: true,
                                                onClose: () => setOpenDialog(null),
                                                onConfirm: (data) => {
                                                      // Handle confirmation logic here
                                                      console.log('Attestation confirmed with data:', data)
                                                }
                                          })
                                    }}
                                    className="w-full cursor-pointer flex items-center justify-center space-x-1 bg-[#FDEDD6] text-red-700 px-3 py-2 rounded hover:bg-[#FAD8AD] transition-colors text-xs"
                              >
                                    <LuShare2 className="w-4 h-4" />
                                    <span>Share</span>
                              </button>
                  }

            </>
      )
}
