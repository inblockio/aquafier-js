import { useCallback, useState } from 'react'
import { FileText, Folder, Upload } from 'lucide-react'

import { DropEvent, FileSelectEvent } from '@/types/types'

const FileDropZone = ({ setFiles }: { setFiles: (selectedFiles: File[]) => void }) => {
      const [isDragOver, setIsDragOver] = useState(false)

      const handleDragOver = useCallback((e: { preventDefault: () => void }) => {
            e.preventDefault()
            setIsDragOver(true)
      }, [])

      const handleDragLeave = useCallback((e: { preventDefault: () => void }) => {
            e.preventDefault()
            setIsDragOver(false)
      }, [])

      const handleDrop = useCallback((e: DropEvent) => {
            e.preventDefault()
            setIsDragOver(false)

            const droppedFiles = Array.from(e.dataTransfer.files)
            if (droppedFiles.length === 0) return

            setFiles(droppedFiles)
      }, [])

      const handleFileSelect = useCallback((e: FileSelectEvent) => {
            const selectedFiles = Array.from(e.target.files ?? [])
            if (selectedFiles.length === 0) return
            setFiles(selectedFiles)
      }, [])

      return (
            <div className="w-full max-w-2xl mx-auto p-6 items-center justify-center">
                  <div
                        className={`
          relative border-2 border-dashed rounded-lg p-12 text-center transition-colors  max-w-full items-center justify-center 
          ${isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'}
        `}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                  >
                        {/* Folder Icon */}
                        <div className="mb-4 flex justify-center">
                              <div
                                    className="relative"
                                    onClick={() => {
                                          const input = document.getElementById('file-input')
                                          if (input) input.click()
                                    }}
                              >
                                    <Folder className="w-16 h-16 text-gray-400" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                          <FileText className="w-6 h-6 text-blue-500" />
                                    </div>
                              </div>
                        </div>

                        {/* Text */}
                        <div className="mb-6">
                              <p className="text-gray-600 text-lg mb-2">
                                    Drop anything here
                                    {/* or{' '} */}
                                    {/* <button
              className="text-blue-600 hover:text-blue-800 font-medium underline"
              onClick={() => {

              }}
            >
              create a workflow
            </button> */}
                              </p>
                        </div>

                        {/* Upload Button */}
                        <div className="flex justify-center">
                              <label
                                    htmlFor="file-input"
                                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 cursor-pointer transition-colors"
                              >
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload
                              </label>
                              <input id="file-input" type="file" multiple className="hidden" onChange={handleFileSelect} />
                        </div>

                        {/* Drag overlay */}
                        {isDragOver && (
                              <div className="absolute inset-0 bg-blue-100 bg-opacity-50 rounded-lg flex items-center justify-center">
                                    <div className="text-blue-600 font-medium">Drop files here</div>
                              </div>
                        )}
                  </div>
            </div>
      )
}

export default FileDropZone
