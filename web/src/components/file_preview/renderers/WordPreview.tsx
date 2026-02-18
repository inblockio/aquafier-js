import { useEffect } from 'react'

interface WordPreviewProps {
      renderWordDocument: () => Promise<void>
      wordContainerRef: React.RefObject<HTMLDivElement | null>
      fileURL: string
      fileName: string
}

export function WordPreview({ renderWordDocument, wordContainerRef, fileURL, fileName }: WordPreviewProps) {
      useEffect(() => {
            renderWordDocument()
      }, [])

      return (
            <div>
                  <div
                        ref={wordContainerRef}
                        className="word-preview-container"
                        style={{
                              padding: '20px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              overflow: 'auto',
                        }}
                  >
                        {/* docx-preview will render content here */}
                  </div>
                  <div style={{ marginTop: '15px', textAlign: 'center' }}>
                        <a
                              href={fileURL}
                              download={fileName || 'document.docx'}
                              style={{
                                    color: '#fff',
                                    backgroundColor: '#4285f4',
                                    padding: '10px 15px',
                                    borderRadius: '4px',
                                    textDecoration: 'none',
                                    display: 'inline-block',
                              }}
                        >
                              Download Word Document
                        </a>
                  </div>
            </div>
      )
}
