import { FileObject } from 'aqua-js-sdk'
import { useEffect, useRef, useState } from 'react'
import { useStore } from 'zustand'
import appStore from '../store'
import { ensureDomainUrlHasSSL, handleLoadFromUrl, isJSONKeyValueStringContent } from '../utils/functions'
import { FilePreviewAquaTreeFromTemplate } from './file_preview_aqua_tree_from_template'
import { EasyPDFRenderer } from '@/pages/aqua_sign_wokflow/ContractDocument/signer/SignerPage'
// import { EasyPDFRenderer } from "../pages/files/wokflow/ContractDocument/signer/SignerPage";
// import { EasyPDFRenderer } from "../pages/aqua_sign_wokflow/ContractDocument/signer/SignerPage";
// import { toaster } from "./chakra-ui/toaster";

// Define file extensions to content type mappings
const fileExtensionMap: { [key: string]: string } = {
      // Images
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp',
      // Documents
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      doc: 'application/msword',
      txt: 'text/plain',
      json: 'application/json',
      xml: 'application/xml',
      csv: 'text/csv',
      // Video
      mp4: 'video/mp4',
      webm: 'video/webm',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      mkv: 'video/x-matroska',
      // Audio
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      flac: 'audio/flac',
      m4a: 'audio/mp4',
}

interface IFilePreview {
      fileInfo: FileObject
}

interface IPdfViewerComponent {
      fileType: string
      fileURL: string
      fileInfo: FileObject
}

function PdfViewerComponent({ fileType, fileURL, fileInfo }: IPdfViewerComponent) {
      const [pdfFile, setPdfFile] = useState<File | null>(null)

      useEffect(() => {
            if (fileType === 'application/pdf') {
                  const loadPdf = async () => {
                        try {
                              // todo fix me @kenn or @Dalmas
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

      return <EasyPDFRenderer pdfFile={pdfFile} annotations={[]} annotationsInDocument={[]} />
}

// Add declaration for docx-preview global type
declare global {
      interface Window {
            docx: {
                  renderAsync: (blob: Blob, container: HTMLElement, viewerOptions: any, renderOptions: any) => Promise<void>
            }
      }
}

const FilePreview: React.FC<IFilePreview> = ({ fileInfo }) => {
      const { session } = useStore(appStore)
      const [fileType, setFileType] = useState<string>('')
      const [fileURL, setFileURL] = useState<string>('')
      const [textContent, setTextContent] = useState<string>('')
      const [isLoading, setIsLoading] = useState<boolean>(true)
      const [_pdfBlob, setPdfBlob] = useState<Blob | null>(null)
      const [wordBlob, setWordBlob] = useState<Blob | null>(null)

      const wordContainerRef = useRef<HTMLDivElement>(null)

      // Helper function to get content type from file extension
      const getContentTypeFromFileName = (fileName: string): string => {
            if (!fileName) return 'application/octet-stream'

            const extension = fileName.split('.').pop()?.toLowerCase() || ''
            return fileExtensionMap[extension] || 'application/octet-stream'
      }

      // Function to load docx-preview script
      const loadDocxPreviewScript = () => {
            return new Promise<void>((resolve, reject) => {
                  if (window.docx) {
                        resolve()
                        return
                  }

                  // Load JSZip first (required by docx-preview)
                  const jsZipScript = document.createElement('script')
                  jsZipScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
                  jsZipScript.async = true

                  jsZipScript.onload = () => {
                        // Then load docx-preview
                        const docxScript = document.createElement('script')
                        docxScript.src = 'https://cdn.jsdelivr.net/npm/docx-preview@0.1.20/dist/docx-preview.min.js'
                        docxScript.async = true

                        docxScript.onload = () => {
                              // Small delay to ensure script is fully initialized
                              setTimeout(() => resolve(), 100)
                        }

                        docxScript.onerror = () => {
                              console.error('Failed to load docx-preview')
                              reject(new Error('Failed to load docx-preview'))
                        }

                        document.body.appendChild(docxScript)
                  }

                  jsZipScript.onerror = () => {
                        console.error('Failed to load JSZip')
                        reject(new Error('Failed to load JSZip'))
                  }

                  document.body.appendChild(jsZipScript)
            })
      }

      const renderWordDocument = async () => {
            if ((fileType === 'application/msword' || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') && wordBlob && wordContainerRef.current) {
                  try {
                        // Load the libraries
                        await loadDocxPreviewScript()

                        // Wait a bit to ensure everything is loaded
                        await new Promise(resolve => setTimeout(resolve, 200))

                        // Verify window.docx exists
                        if (!window.docx) {
                              throw new Error('docx-preview library not available')
                        }

                        // Clear any previous content
                        if (wordContainerRef.current) {
                              wordContainerRef.current.innerHTML = ''

                              // For DOCX files
                              if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                                    // Create a new blob to ensure it's processed correctly
                                    const docxBlob = new Blob([await wordBlob.arrayBuffer()], {
                                          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                                    })

                                    // Use docx-preview to render the document
                                    await window.docx.renderAsync(docxBlob, wordContainerRef.current, null, {
                                          className: 'docx-preview',
                                          inWrapper: true,
                                          ignoreWidth: false,
                                          ignoreHeight: false,
                                          defaultFont: {
                                                family: 'Arial',
                                                size: 12,
                                          },
                                    })
                              } else {
                                    // For DOC files, we can't use docx-preview directly
                                    // Show a message that DOC files can't be previewed
                                    if (wordContainerRef.current) {
                                          wordContainerRef.current.innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                        <p>Preview not available for .DOC files (only .DOCX is supported).</p>
                        <p>Please download the file to view it.</p>
                    </div>
                `
                                    }
                              }
                        }
                  } catch (error: any) {
                        console.error('Error rendering Word document with docx-preview:', error)

                        // Display error message in the container
                        if (wordContainerRef.current) {
                              wordContainerRef.current.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <p>Unable to preview this document.</p>
                    <p>Error: ${error.message || 'Unknown error'}</p>
                    <p>Please download the file to view it.</p>
                </div>
            `
                        }
                  }
            }
      }

      useEffect(() => {
            const fetchFile = async () => {
                  setIsLoading(true)
                  try {
                        // Handle if fileContent is a URL
                        if (typeof fileInfo.fileContent === 'string' && fileInfo.fileContent.startsWith('http')) {
                              // Ensure the URL has SSL
                              const fileContentUrl = fileInfo.fileContent
                              const actualUrlToFetch = ensureDomainUrlHasSSL(fileContentUrl)

                              const response = await fetch(actualUrlToFetch, {
                                    headers: {
                                          nonce: `${session?.nonce}`,
                                    },
                              })

                              if (!response.ok) throw new Error('Failed to fetch file')

                              // Get content type from headers or from file extension
                              let contentType = response.headers.get('Content-Type') || ''

                              // If content type is missing or generic, try to detect from filename
                              if (contentType === 'application/octet-stream' || contentType === '') {
                                    contentType = getContentTypeFromFileName(fileInfo.fileName || '')
                                    //  console.log("Determined content type from filename:", contentType);
                              }

                              // Clone response and get data
                              const arrayBuffer = await response.arrayBuffer()

                              // For text-based content types
                              if (contentType.startsWith('text/') || contentType === 'application/json' || contentType === 'application/xml') {
                                    try {
                                          const decoder = new TextDecoder('utf-8')
                                          const text = decoder.decode(arrayBuffer)
                                          setTextContent(text)
                                    } catch (error) {
                                          console.error('Error decoding text content:', error)
                                    }
                              }

                              // Create blob with correct content type
                              const blob = new Blob([arrayBuffer], { type: contentType })
                              //  console.log("Created blob with type:", contentType, "size:", blob.size);

                              setFileType(contentType)

                              // Store PDF blob for direct rendering if needed
                              if (contentType === 'application/pdf') {
                                    setPdfBlob(blob)
                              } else if (contentType.includes('wordprocessing') || contentType === 'application/msword') {
                                    setWordBlob(blob)
                              }

                              // Create URL from blob
                              const objectURL = URL.createObjectURL(blob)
                              setFileURL(objectURL)
                        }
                        // Handle if fileContent is binary data (Uint8Array or similar)
                        else if (fileInfo.fileContent && typeof fileInfo.fileContent !== 'string') {
                              // Determine content type from filename
                              const contentType = getContentTypeFromFileName(fileInfo.fileName || '')
                              //  console.log("Determined content type for binary data:", contentType);

                              // Create blob with detected content type
                              const blob = new Blob([fileInfo.fileContent as Uint8Array], {
                                    type: contentType,
                              })

                              setFileType(contentType)

                              if (contentType === 'application/pdf') {
                                    setPdfBlob(blob)
                              } else if (contentType.includes('wordprocessing') || contentType === 'application/msword') {
                                    setWordBlob(blob)
                              }

                              const objectURL = URL.createObjectURL(blob)
                              setFileURL(objectURL)
                        }
                        // Handle if fileContent is plain text
                        else if (typeof fileInfo.fileContent === 'string') {
                              setTextContent(fileInfo.fileContent)
                              setFileType('text/plain')
                        }
                  } catch (error) {
                        console.error('Error processing file:', error)
                  } finally {
                        setIsLoading(false)
                  }
            }

            fetchFile()

            // Cleanup function to revoke object URL
            return () => {
                  if (fileURL) URL.revokeObjectURL(fileURL)
            }
      }, [JSON.stringify(fileInfo), session?.nonce])

      if (isLoading) return <p>Loading...</p>

      // Render based on file type
      // Image files
      if (fileType.startsWith('image/')) {
            return <img src={fileURL} alt="File preview" style={{ maxWidth: '100%', height: 'auto' }} />
      }

      // PDF files
      if (fileType === 'application/pdf') {
            // console.log("File url: ", fileURL)
            return <PdfViewerComponent fileType={fileType} fileURL={fileURL} fileInfo={fileInfo} />
      }

      // Text files
      if (fileType.startsWith('text/') || fileType === 'application/json' || fileType === 'application/xml') {
            const newTxtContent = textContent
            const isJson = isJSONKeyValueStringContent(newTxtContent)

            if (fileType === 'application/json' || isJson) {
                  // console.log(`is this ${newTxtContent} is form ${isForm}-----`)
                  // if (isForm) {
                  return (
                        <div className="p-5 m-5">
                              <FilePreviewAquaTreeFromTemplate formData={JSON.parse(newTxtContent)} />
                        </div>
                  )
                  // }
            }
            return (
                  <div
                        style={{
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              fontFamily: 'monospace',
                              padding: '10px',
                              border: '1px solid #ccc',
                              borderRadius: '4px',
                              maxHeight: '600px',
                              overflow: 'auto',
                        }}
                  >
                        {newTxtContent}
                  </div>
            )
      }

      // Audio files
      if (fileType.startsWith('audio/')) {
            return (
                  <div>
                        <audio controls style={{ width: '100%' }}>
                              <source src={fileURL} type={fileType} />
                              Your browser does not support the audio element.
                        </audio>
                        <div style={{ marginTop: '10px' }}>
                              <a href={fileURL} download={fileInfo.fileName || 'audio'} style={{ color: 'blue', textDecoration: 'underline' }}>
                                    Download audio file
                              </a>
                        </div>
                  </div>
            )
      }

      // Video files - improved handling
      if (fileType.startsWith('video/') || (fileInfo.fileName && /\.(mp4|webm|mov|avi|mkv)$/i.test(fileInfo.fileName))) {
            // Force content type for video if filename matches but type doesn't
            const videoType = fileType.startsWith('video/') ? fileType : 'video/mp4'

            return (
                  <div>
                        <video
                              controls
                              style={{
                                    maxWidth: '100%',
                                    height: 'auto',
                                    backgroundColor: '#000',
                                    borderRadius: '4px',
                              }}
                        >
                              <source src={fileURL} type={videoType} />
                              Your browser does not support the video element.
                        </video>
                        <div style={{ marginTop: '10px' }}>
                              <a href={fileURL} download={fileInfo.fileName || 'video'} style={{ color: 'blue', textDecoration: 'underline' }}>
                                    Download video file
                              </a>
                        </div>
                  </div>
            )
      }

      // Word documents
      if (fileType === 'application/msword' || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            // Create a component for word documents
            const WordDocumentComponent = () => {
                  // Use effect to render the document after component mounts
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
                                          download={fileInfo.fileName || 'document.docx'}
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

            return <WordDocumentComponent />
      }

      // Default download option for other file types
      return (
            <div
                  style={{
                        padding: '20px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        textAlign: 'center',
                  }}
            >
                  <div style={{ marginBottom: '20px' }}>
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                              <polyline points="13 2 13 9 20 9"></polyline>
                        </svg>
                        <h3 style={{ margin: '10px 0', fontSize: '18px' }}>File: {fileInfo.fileName || 'Unknown'}</h3>
                        <p>Type: {fileType}</p>
                  </div>
                  <a
                        href={fileURL}
                        download={fileInfo.fileName || 'file'}
                        style={{
                              color: '#fff',
                              backgroundColor: '#4285f4',
                              padding: '10px 15px',
                              borderRadius: '4px',
                              textDecoration: 'none',
                              display: 'inline-block',
                        }}
                  >
                        Download File
                  </a>
            </div>
      )
}

export default FilePreview
