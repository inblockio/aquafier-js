import React, { useEffect, useState } from 'react'
import { Progress } from './ui/progress'
import appStore from '@/store'
import { useStore } from 'zustand'

interface WorkspaceDialogUIProps {
  isDone: () => void
}

const WorkspaceDialogUI: React.FC<WorkspaceDialogUIProps> = ({ isDone }: WorkspaceDialogUIProps) => {

   const [progress, setProgress] = useState<number>(0)

   const {
             workSpaceDowload
        } = useStore(appStore)

         useEffect(() => {
          let progress = workSpaceDowload.totalFiles > 0 ? (workSpaceDowload.fileIndex / workSpaceDowload.totalFiles) * 100 : 0
          setProgress(progress)
          if (progress >= 100) {
                isDone()
          }
               
            }, [JSON.stringify(workSpaceDowload)]) // Empty dependency array means this runs once on mount
  return (
    <div>

      <div className="py-4">
        <Progress value={progress}  className="w-full" />
        <div className="text-sm text-gray-500 mt-2 text-center">
          {workSpaceDowload.fileName && (
            <span>
              Processing: {workSpaceDowload.fileName}
            
                 {workSpaceDowload.fileIndex}/{workSpaceDowload.totalFiles} files
              
            </span>
          )}
         {progress}% Complete
        </div>
      </div>
    </div>
  )
}

export default WorkspaceDialogUI
