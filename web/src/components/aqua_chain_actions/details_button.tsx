import { Button } from '@/components/ui/button'
import { ApiFileInfo } from '@/models/FileInfo'
import appStore from '@/store'
import { LuEye } from 'react-icons/lu'
import { useStore } from 'zustand'

export const OpenSelectedFileDetailsButton = ({
    file,
    children,
    index,
}: {
    file: ApiFileInfo
    index: number
    children?: React.ReactNode
}) => {
    const { setSelectedFileInfo, setOpenFileDetailsPopUp } = useStore(appStore)

    return (
        <>
            {children ? (
                <div
                    onClick={() => {
                        setOpenFileDetailsPopUp(true)
                        setSelectedFileInfo(file)
                    }}
                >
                    {children}
                </div>
            ) : (
                <Button
                    data-testid={'open-aqua-claim-workflow-button-' + index}
                    className="w-full flex items-center justify-center space-x-1 bg-green-100 text-green-700 px-2 py-2 rounded hover:bg-green-200 transition-colors text-xs"
                    onClick={() => {
                        setOpenFileDetailsPopUp(true)
                        setSelectedFileInfo(file)
                    }}
                >
                    <LuEye className="w-4 h-4" />
                    <span className="break-words break-all overflow-hidden">
                        Details
                    </span>
                </Button>
            )}
        </>
    )
}
