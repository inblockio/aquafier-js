import { LuShare2 } from 'react-icons/lu'
import { useStore } from 'zustand'
import appStore from '../../store'
import { IShareButton } from '../../types/types'

export const ShareButton = ({ item, index, autoOpenShareDialog, children }: IShareButton) => {
      const { setOpenDialog, setSelectedFileInfo } = useStore(appStore)

      if (autoOpenShareDialog) return null


      const handleShare = () => {
            setSelectedFileInfo(item)
            setOpenDialog({
                  dialogType: 'share_dialog',
                  isOpen: true,
                  onClose: () => setOpenDialog(null),
                  onConfirm: () => { },
            })
      }
      if (children) return <div onClick={handleShare}>{children}</div>

      return (
            <button
                  data-testid={`share-action-button-${index}`}
                  onClick={handleShare}
                  className="w-full cursor-pointer flex items-center justify-center space-x-1 bg-[#FDEDD6] text-red-700 px-3 py-2 rounded hover:bg-[#FAD8AD] transition-colors text-xs"
            >
                  <LuShare2 className="w-4 h-4" />
                  <span>Share</span>
            </button>
      )
}
