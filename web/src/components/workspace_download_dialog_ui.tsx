import React, { useEffect, useState } from 'react'
import { Progress } from './ui/progress'
import appStore from '@/store'
import { useStore } from 'zustand'

interface WorkspaceDialogUIProps {
  isDone: () => void
  title: string
  uploadProgress?: number
  isUploading?: boolean
}

const WorkspaceDialogUI: React.FC<WorkspaceDialogUIProps> = ({ isDone, title, uploadProgress, isUploading }: WorkspaceDialogUIProps) => {

   const [progress, setProgress] = useState<number>(0)
   const [startTime] = useState<number>(Date.now())
   const MINIMUM_DISPLAY_TIME = 800 // milliseconds

   const {
             workSpaceDowload
        } = useStore(appStore)

         useEffect(() => {
          // If uploading, use the uploadProgress prop
          if (isUploading && uploadProgress !== undefined) {
                setProgress(uploadProgress)
                if (uploadProgress >= 100) {
                      // Ensure minimum display time to prevent flashing
                      const elapsedTime = Date.now() - startTime
                      const remainingTime = Math.max(0, MINIMUM_DISPLAY_TIME - elapsedTime)
                      setTimeout(() => isDone(), remainingTime)
                }
          } else {
                // Otherwise, calculate from workSpaceDowload for downloads
                let progress = workSpaceDowload.totalFiles > 0 ? (workSpaceDowload.fileIndex / workSpaceDowload.totalFiles) * 100 : 0
                setProgress(progress)
                if (progress >= 100) {
                      // Ensure minimum display time to prevent flashing
                      const elapsedTime = Date.now() - startTime
                      const remainingTime = Math.max(0, MINIMUM_DISPLAY_TIME - elapsedTime)
                      setTimeout(() => isDone(), remainingTime)
                }
          }

            }, [JSON.stringify(workSpaceDowload), uploadProgress, isUploading, startTime, MINIMUM_DISPLAY_TIME, isDone])
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h3>
      <div className="py-4">
        <Progress value={progress}  className="w-full" />
        <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center space-y-1">
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {Math.round(progress)}%
          </div>
          {isUploading ? (
            <div className="text-xs">
              Uploading workspace file...
            </div>
          ) : (
            workSpaceDowload.fileName && (
              <div className="text-xs">
                Processing: {workSpaceDowload.fileName}
                <br />
                {workSpaceDowload.fileIndex}/{workSpaceDowload.totalFiles} files
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}

export default WorkspaceDialogUI
