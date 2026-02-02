import { useCallback, useState } from 'react'
import { FileText, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface PdfDropzoneProps {
      pdfFile: File | null | undefined
      setPdfFile: (file: File | null) => void
}

export const PdfDropzone = ({ pdfFile, setPdfFile }: PdfDropzoneProps) => {
      const [isDragOver, setIsDragOver] = useState(false)

      const handleDragOver = useCallback((e: React.DragEvent) => {
            e.preventDefault()
            setIsDragOver(true)
      }, [])

      const handleDragLeave = useCallback((e: React.DragEvent) => {
            e.preventDefault()
            setIsDragOver(false)
      }, [])

      const handleDrop = useCallback((e: React.DragEvent) => {
            e.preventDefault()
            setIsDragOver(false)

            const droppedFiles = Array.from(e.dataTransfer.files)
            if (droppedFiles.length === 0) return

            const file = droppedFiles[0]
            if (file.type === 'application/pdf') {
                  setPdfFile(file)
            } else {
                  toast.error('Please drop a PDF file')
            }
      }, [setPdfFile])

      const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
            const selectedFiles = Array.from(e.target.files ?? [])
            if (selectedFiles.length === 0) return

            const file = selectedFiles[0]
            if (file.type === 'application/pdf') {
                  setPdfFile(file)
            } else {
                  toast.error('Please select a PDF file')
            }
            e.target.value = ''
      }, [setPdfFile])

      return (
            <div className="w-full max-w-2xl mx-auto p-6">
                  {pdfFile ? (
                        <div className="border-2 border-dashed rounded-lg p-6 border-green-400 bg-green-50">
                              <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                          <FileText className="w-10 h-10 text-green-600" />
                                          <div>
                                                <p className="font-medium text-gray-900">{pdfFile.name}</p>
                                                <p className="text-sm text-gray-500">
                                                      {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                          </div>
                                    </div>
                                    <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => setPdfFile(null)}
                                          className="text-gray-500 hover:text-red-500"
                                    >
                                          <X className="w-5 h-5" />
                                    </Button>
                              </div>
                        </div>
                  ) : (
                        <div
                              className={`
                                    relative border-2 border-dashed rounded-lg p-12 text-center transition-colors
                                    ${isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'}
                              `}
                              onDragOver={handleDragOver}
                              onDragLeave={handleDragLeave}
                              onDrop={handleDrop}
                        >
                              <div className="mb-4 flex justify-center">
                                    <FileText className="w-16 h-16 text-gray-400" />
                              </div>

                              <div className="mb-6">
                                    <p className="text-gray-600 text-lg mb-2">
                                          Drop your PDF file here
                                    </p>
                                    <p className="text-gray-400 text-sm">
                                          or click to browse
                                    </p>
                              </div>

                              <div className="flex justify-center">
                                    <label
                                          htmlFor="pdf-file-input"
                                          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 cursor-pointer transition-colors"
                                    >
                                          <Upload className="w-4 h-4 mr-2" />
                                          Select PDF
                                    </label>
                                    <input
                                          id="pdf-file-input"
                                          type="file"
                                          accept=".pdf,application/pdf"
                                          className="hidden"
                                          onChange={handleFileSelect}
                                    />
                              </div>

                              {isDragOver && (
                                    <div className="absolute inset-0 bg-blue-100 bg-opacity-50 rounded-lg flex items-center justify-center">
                                          <div className="text-blue-600 font-medium">Drop PDF here</div>
                                    </div>
                              )}
                        </div>
                  )}
            </div>
      )
}
