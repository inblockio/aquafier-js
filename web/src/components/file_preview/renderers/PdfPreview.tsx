import { FileObject } from 'aqua-js-sdk'
import { useEffect, useState } from 'react'
import { EasyPDFRenderer } from '@/pages/pdf_workflow/pdf-viewer/SignerPage'
import { handleLoadFromUrl } from '@/utils/functions'

interface IPdfViewerComponent {
      fileType: string
      fileURL: string
      fileInfo: FileObject
      latestRevisionHash: string
}

export function PdfPreview({ fileType, fileURL, fileInfo, latestRevisionHash }: IPdfViewerComponent) {
      const [pdfFile, setPdfFile] = useState<File | null>(null)

      useEffect(() => {
            if (fileType === 'application/pdf') {
                  const loadPdf = async () => {
                        try {
                              const result = await handleLoadFromUrl(fileURL, fileInfo.fileName || '', {})
                              if (!result.error) {
                                    setPdfFile(result.file)
                              }
                        } catch (error) {
                              console.error('Error loading PDF:', error)
                        }
                  }
                  loadPdf()
            }
      }, [fileType, fileURL, fileInfo.fileName])

      if (!pdfFile) return <p>Loading PDF...</p>

      return <EasyPDFRenderer pdfFile={pdfFile} annotations={[]} annotationsInDocument={[]} latestRevisionHash={latestRevisionHash} />
}
