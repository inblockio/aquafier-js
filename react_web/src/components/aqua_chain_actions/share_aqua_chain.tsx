import {LuShare2} from 'react-icons/lu'
import {useStore} from 'zustand'
import appStore from '../../store'
import {IShareButton} from '../../types/types'

export const ShareButton = ({ item, index, autoOpenShareDialog }: IShareButton) => {
      const { setOpenDialog, setSelectedFileInfo } = useStore(appStore)

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
                                                onConfirm: () => {
                                                      // Handle confirmation logic here
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
