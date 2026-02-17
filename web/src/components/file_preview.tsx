import {FileObject} from 'aqua-js-sdk'
import {useEffect, useRef, useState} from 'react'
import {useStore} from 'zustand'
import appStore from '../store'
import {
    ensureDomainUrlHasSSL,
    handleLoadFromUrl,
    isHttpUrl,
    isJSONKeyValueStringContent,
    isValidUrl
} from '../utils/functions'
import {FilePreviewAquaTreeFromTemplate} from './file_preview_aqua_tree_from_template'
import {EasyPDFRenderer} from '@/pages/pdf_workflow/pdf-viewer/SignerPage'
import heic2any from "heic2any"
import apiClient from '@/api/axiosInstance'

// Define file extensions to content type mappings
const fileExtensionMap: { [key: string]: string } = {
      // Images
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp',
      svg: 'image/svg+xml',
      ico: 'image/x-icon',
      heic: 'image/heic',
      heif: 'image/heif',
      tiff: 'image/tiff',
      tif: 'image/tiff',

      // Documents
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      doc: 'application/msword',
      
      // Text formats
      txt: 'text/plain',
      md: 'text/markdown',
      markdown: 'text/markdown',
      json: 'application/json',
      xml: 'application/xml',
      html: 'text/html',
      htm: 'text/html',
      css: 'text/css',
      js: 'text/javascript',
      ts: 'text/typescript',
      jsx: 'text/javascript',
      tsx: 'text/typescript',
      py: 'text/x-python',
      java: 'text/x-java',
      c: 'text/x-c',
      cpp: 'text/x-c++',
      h: 'text/x-c',
      cs: 'text/x-csharp',
      php: 'text/x-php',
      rb: 'text/x-ruby',
      go: 'text/x-go',
      rs: 'text/x-rust',
      swift: 'text/x-swift',
      kt: 'text/x-kotlin',
      sql: 'text/x-sql',
      sh: 'text/x-sh',
      yaml: 'text/yaml',
      yml: 'text/yaml',
      toml: 'text/x-toml',
      ini: 'text/plain',
      cfg: 'text/plain',
      conf: 'text/plain',
      log: 'text/plain',
      csv: 'text/csv',
      tsv: 'text/tab-separated-values',
      
      // Spreadsheets
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      xls: 'application/vnd.ms-excel',
      ods: 'application/vnd.oasis.opendocument.spreadsheet',
      
      // Presentations
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ppt: 'application/vnd.ms-powerpoint',
      odp: 'application/vnd.oasis.opendocument.presentation',
      
      // Archives
      zip: 'application/zip',
      rar: 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
      tar: 'application/x-tar',
      gz: 'application/gzip',
      
      // Video
      mp4: 'video/mp4',
      webm: 'video/webm',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      mkv: 'video/x-matroska',
      flv: 'video/x-flv',
      wmv: 'video/x-ms-wmv',
      m4v: 'video/x-m4v',
      
      // Audio
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      flac: 'audio/flac',
      m4a: 'audio/mp4',
      aac: 'audio/aac',
      wma: 'audio/x-ms-wma',
      opus: 'audio/opus',
}

interface IFilePreview {
      fileInfo: FileObject
      latestRevisionHash: string
}

interface IPdfViewerComponent {
      fileType: string
      fileURL: string
      fileInfo: FileObject
      latestRevisionHash: string
}

function PdfViewerComponent({ fileType, fileURL, fileInfo, latestRevisionHash }: IPdfViewerComponent) {
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

// Add declaration for docx-preview global type
declare global {
      interface Window {
            docx: {
                  renderAsync: (blob: Blob, container: HTMLElement, viewerOptions: any, renderOptions: any) => Promise<void>
            }
            marked?: {
                  parse: (markdown: string) => string
            }
      }
}

export const FilePreview: React.FC<IFilePreview> = ({ fileInfo, latestRevisionHash }) => {
      const { session } = useStore(appStore)
      const [fileType, setFileType] = useState<string>('')
      const [fileURL, setFileURL] = useState<string>('')
      const [textContent, setTextContent] = useState<string>('')
      const [isLoading, setIsLoading] = useState<boolean>(true)
      const [_pdfBlob, setPdfBlob] = useState<Blob | null>(null)
      const [wordBlob, setWordBlob] = useState<Blob | null>(null)

      const wordContainerRef = useRef<HTMLDivElement>(null)
      const markdownContainerRef = useRef<HTMLDivElement>(null)

      // Helper function to get content type from file extension
      const getContentTypeFromFileName = (fileName: string): string => {
            if (!fileName) return 'application/octet-stream'

            const extension = fileName.split('.').pop()?.toLowerCase() || ''
            return fileExtensionMap[extension] || 'application/octet-stream'
      }

      // Function to load marked.js for Markdown rendering
      const loadMarkedScript = () => {
            return new Promise<void>((resolve, reject) => {
                  if (window.marked) {
                        resolve()
                        return
                  }

                  const script = document.createElement('script')
                  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/marked/11.1.1/marked.min.js'
                  script.async = true

                  script.onload = () => {
                        setTimeout(() => resolve(), 100)
                  }

                  script.onerror = () => {
                        console.error('Failed to load marked.js')
                        reject(new Error('Failed to load marked.js'))
                  }

                  document.body.appendChild(script)
            })
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

      const renderMarkdown = async () => {
            if (fileType === 'text/markdown' && textContent && markdownContainerRef.current) {
                  try {
                        await loadMarkedScript()

                        if (!window.marked) {
                              throw new Error('marked.js library not available')
                        }

                        const html = window.marked.parse(textContent)
                        if (markdownContainerRef.current) {
                              markdownContainerRef.current.innerHTML = html
                        }
                  } catch (error: any) {
                        console.error('Error rendering Markdown:', error)
                        
                        if (markdownContainerRef.current) {
                              markdownContainerRef.current.innerHTML = `
                                    <div style="text-align: center; padding: 20px;">
                                          <p>Unable to render Markdown.</p>
                                          <p>Error: ${error.message || 'Unknown error'}</p>
                                    </div>
                              `
                        }
                  }
            }
      }

      const renderWordDocument = async () => {
            if ((fileType === 'application/msword' || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') && wordBlob && wordContainerRef.current) {
                  try {
                        await loadDocxPreviewScript()
                        await new Promise(resolve => setTimeout(resolve, 200))

                        if (!window.docx) {
                              throw new Error('docx-preview library not available')
                        }

                        if (wordContainerRef.current) {
                              wordContainerRef.current.innerHTML = ''

                              if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                                    const docxBlob = new Blob([await wordBlob.arrayBuffer()], {
                                          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                                    })

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
                        if (typeof fileInfo.fileContent === 'string' && isValidUrl(fileInfo.fileContent) && isHttpUrl(fileInfo.fileContent)) {
                              const fileContentUrl = fileInfo.fileContent
                              const actualUrlToFetch = ensureDomainUrlHasSSL(fileContentUrl)

                              const response = await apiClient.get(actualUrlToFetch, {
                                    headers: {
                                          nonce: `${session?.nonce}`,
                                    },
                                    responseType: 'arraybuffer',
                              })

                              let contentType = response.headers['content-type'] || ''

                              if (contentType === 'application/octet-stream' || contentType === '') {
                                    contentType = getContentTypeFromFileName(fileInfo.fileName || '')
                              }

                              const arrayBuffer = response.data

                              // For text-based content types (expanded list)
                              if (contentType.startsWith('text/') || 
                                  contentType === 'application/json' || 
                                  contentType === 'application/xml' ||
                                  contentType === 'application/javascript') {
                                    try {
                                          const decoder = new TextDecoder('utf-8')
                                          const text = decoder.decode(arrayBuffer)
                                          setTextContent(text)
                                    } catch (error) {
                                          console.error('Error decoding text content:', error)
                                    }
                              }

                              const blob = new Blob([arrayBuffer], { type: contentType })
                              setFileType(contentType)

                              if (contentType === 'application/pdf') {
                                    setPdfBlob(blob)
                              } else if (contentType.includes('wordprocessing') || contentType === 'application/msword') {
                                    setWordBlob(blob)
                              }

                              const objectURL = URL.createObjectURL(blob)
                              setFileURL(objectURL)
                        }
                        else if (fileInfo.fileContent && typeof fileInfo.fileContent !== 'string') {
                              const contentType = getContentTypeFromFileName(fileInfo.fileName || '')

                              const blob = new Blob([fileInfo.fileContent as BlobPart], {
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
                        else if (typeof fileInfo.fileContent === 'string') {
                              setTextContent(fileInfo.fileContent)
                              const contentType = getContentTypeFromFileName(fileInfo.fileName || '')
                              setFileType(contentType || 'text/plain')
                        }
                  } catch (error) {
                        console.error('Error processing file:', error)
                  } finally {
                        setIsLoading(false)
                  }
            }

            fetchFile()

            return () => {
                  if (fileURL) URL.revokeObjectURL(fileURL)
            }
      }, [fileInfo.fileSize, session?.nonce])

      const [convertedHeicUrl, setConvertedHeicUrl] = useState<string | null>(null)
      const [isHeic, setIsHeic] = useState<boolean>(false)

      useEffect(() => {
            const convertIfHeic = async () => {
                  if (fileType === 'image/heic' || fileType === 'image/heif') {
                        setIsHeic(true)
                        try {
                              const response = await fetch(fileURL)
                              const blob = await response.blob()

                              const convertedBlob = await heic2any({
                                    blob,
                                    toType: 'image/jpeg',
                                    quality: 0.9
                              })

                              const newUrl = URL.createObjectURL(convertedBlob as Blob)
                              setConvertedHeicUrl(newUrl)
                        } catch (err) {
                              console.error("HEIC conversion failed:", err)
                        }
                  } else {
                        setConvertedHeicUrl(null)
                  }
            }

            if (fileURL) {
                  convertIfHeic()
            }
      }, [fileType, fileURL])

      if (isLoading) return <p>Loading...</p>

      // Image files
      if (fileType.startsWith('image/')) {
            if(isHeic && convertedHeicUrl == null ){
                  return <p>Loading Heic Image...</p>
            }
            
            const previewUrl = convertedHeicUrl || fileURL
            return (
                  <div className='p-2 max-h-[100%] overflow-y-auto'>
                        <img src={previewUrl} alt="File preview" style={{ maxWidth: '100%', height: 'auto' }} />
                  </div>
            )
      }

      // PDF files
      if (fileType === 'application/pdf') {
            return <PdfViewerComponent fileType={fileType} fileURL={fileURL} fileInfo={fileInfo} latestRevisionHash={latestRevisionHash} />
      }

      // Markdown files
      if (fileType === 'text/markdown') {
            const MarkdownComponent = () => {
                  useEffect(() => {
                        renderMarkdown()
                  }, [])

                  return (
                        <div className="p-4 max-h-[600px] overflow-auto">
                              <div
                                    ref={markdownContainerRef}
                                    className="markdown-preview prose prose-sm max-w-none"
                                    style={{
                                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                          lineHeight: '1.6',
                                          color: '#333',
                                    }}
                              >
                                    {/* Markdown will be rendered here */}
                              </div>
                              <style>{`
                                    .markdown-preview h1 { font-size: 2em; font-weight: bold; margin: 0.67em 0; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
                                    .markdown-preview h2 { font-size: 1.5em; font-weight: bold; margin: 0.75em 0; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
                                    .markdown-preview h3 { font-size: 1.17em; font-weight: bold; margin: 0.83em 0; }
                                    .markdown-preview h4 { font-size: 1em; font-weight: bold; margin: 1em 0; }
                                    .markdown-preview h5 { font-size: 0.83em; font-weight: bold; margin: 1.17em 0; }
                                    .markdown-preview h6 { font-size: 0.67em; font-weight: bold; margin: 1.33em 0; }
                                    .markdown-preview p { margin: 1em 0; }
                                    .markdown-preview ul, .markdown-preview ol { margin: 1em 0; padding-left: 2em; }
                                    .markdown-preview li { margin: 0.5em 0; }
                                    .markdown-preview code { background-color: #f6f8fa; padding: 0.2em 0.4em; border-radius: 3px; font-family: monospace; font-size: 0.9em; }
                                    .markdown-preview pre { background-color: #f6f8fa; padding: 1em; border-radius: 3px; overflow-x: auto; }
                                    .markdown-preview pre code { background-color: transparent; padding: 0; }
                                    .markdown-preview blockquote { border-left: 4px solid #ddd; padding-left: 1em; color: #666; margin: 1em 0; }
                                    .markdown-preview a { color: #0366d6; text-decoration: none; }
                                    .markdown-preview a:hover { text-decoration: underline; }
                                    .markdown-preview table { border-collapse: collapse; width: 100%; margin: 1em 0; }
                                    .markdown-preview th, .markdown-preview td { border: 1px solid #ddd; padding: 0.5em; text-align: left; }
                                    .markdown-preview th { background-color: #f6f8fa; font-weight: bold; }
                                    .markdown-preview img { max-width: 100%; height: auto; }
                                    .markdown-preview hr { border: none; border-top: 1px solid #eee; margin: 2em 0; }
                              `}</style>
                        </div>
                  )
            }

            return <MarkdownComponent />
      }

      // JSON files
      if (fileType === 'application/json' || isJSONKeyValueStringContent(textContent)) {
            return (
                  <div className="p-2 h-full overflow-y-auto">
                        <FilePreviewAquaTreeFromTemplate formData={JSON.parse(textContent)} />
                  </div>
            )
      }

      // Code and text files with syntax highlighting
      if (fileType.startsWith('text/') || fileType === 'application/xml') {
            const getLanguageFromType = (type: string): string => {
                  const langMap: { [key: string]: string } = {
                        'text/javascript': 'javascript',
                        'text/typescript': 'typescript',
                        'text/x-python': 'python',
                        'text/x-java': 'java',
                        'text/x-c': 'c',
                        'text/x-c++': 'cpp',
                        'text/x-csharp': 'csharp',
                        'text/x-php': 'php',
                        'text/x-ruby': 'ruby',
                        'text/x-go': 'go',
                        'text/x-rust': 'rust',
                        'text/x-swift': 'swift',
                        'text/x-kotlin': 'kotlin',
                        'text/x-sql': 'sql',
                        'text/x-sh': 'bash',
                        'text/html': 'html',
                        'text/css': 'css',
                        'text/yaml': 'yaml',
                        'text/x-toml': 'toml',
                        'application/xml': 'xml',
                  }
                  return langMap[type] || ''
            }

            const language = getLanguageFromType(fileType)

            return (
                  <div
                        style={{
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                              fontSize: '14px',
                              padding: '15px',
                              backgroundColor: '#f6f8fa',
                              border: '1px solid #d1d5da',
                              borderRadius: '6px',
                              maxHeight: '600px',
                              overflow: 'auto',
                              lineHeight: '1.5',
                        }}
                  >
                        {language && (
                              <div style={{ 
                                    fontSize: '12px', 
                                    color: '#6a737d', 
                                    marginBottom: '10px',
                                    fontWeight: 'bold' 
                              }}>
                                    {language.toUpperCase()}
                              </div>
                        )}
                        <code>{textContent}</code>
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

      // Video files
      if (fileType.startsWith('video/') || (fileInfo.fileName && /\.(mp4|webm|mov|avi|mkv|flv|wmv|m4v)$/i.test(fileInfo.fileName))) {
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
            const WordDocumentComponent = () => {
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

// import {FileObject} from 'aqua-js-sdk'
// import {useEffect, useRef, useState} from 'react'
// import {useStore} from 'zustand'
// import appStore from '../store'
// import {
//     ensureDomainUrlHasSSL,
//     handleLoadFromUrl,
//     isHttpUrl,
//     isJSONKeyValueStringContent,
//     isValidUrl
// } from '../utils/functions'
// import {FilePreviewAquaTreeFromTemplate} from './file_preview_aqua_tree_from_template'
// import {EasyPDFRenderer} from '@/pages/pdf_workflow/pdf-viewer/SignerPage'
// import heic2any from "heic2any"

// // Define file extensions to content type mappings
// const fileExtensionMap: { [key: string]: string } = {
//       // Images
//       jpg: 'image/jpeg',
//       jpeg: 'image/jpeg',
//       png: 'image/png',
//       gif: 'image/gif',
//       webp: 'image/webp',
//       bmp: 'image/bmp',
//       heic: 'image/heic',
//       heif: 'image/heif',

//       // Documents
//       pdf: 'application/pdf',
//       docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
//       doc: 'application/msword',
//       txt: 'text/plain',
//       json: 'application/json',
//       xml: 'application/xml',
//       csv: 'text/csv',

//       // Video
//       mp4: 'video/mp4',
//       webm: 'video/webm',
//       mov: 'video/quicktime',
//       avi: 'video/x-msvideo',
//       mkv: 'video/x-matroska',
//       // Audio
//       mp3: 'audio/mpeg',
//       wav: 'audio/wav',
//       ogg: 'audio/ogg',
//       flac: 'audio/flac',
//       m4a: 'audio/mp4',
// }

// interface IFilePreview {
//       fileInfo: FileObject
// }

// interface IPdfViewerComponent {
//       fileType: string
//       fileURL: string
//       fileInfo: FileObject
// }

// function PdfViewerComponent({ fileType, fileURL, fileInfo }: IPdfViewerComponent) {
//       const [pdfFile, setPdfFile] = useState<File | null>(null)

//       useEffect(() => {
//             if (fileType === 'application/pdf') {
//                   const loadPdf = async () => {
//                         try {
//                               // todo fix me @kenn or @Dalmas
//                               const result = await handleLoadFromUrl(fileURL, fileInfo.fileName || '', {})
//                               if (!result.error) {
//                                     setPdfFile(result.file)
//                               }
//                         } catch (error) {
//                               console.error('Error loading PDF:', error)
//                         }
//                   }
//                   loadPdf()
//             }
//       }, [fileType, fileURL, fileInfo.fileName])

//       if (!pdfFile) return <p>Loading PDF...</p>

//       return <EasyPDFRenderer pdfFile={pdfFile} annotations={[]} annotationsInDocument={[]} />
// }

// // Add declaration for docx-preview global type
// declare global {
//       interface Window {
//             docx: {
//                   renderAsync: (blob: Blob, container: HTMLElement, viewerOptions: any, renderOptions: any) => Promise<void>
//             }
//       }
// }

// const FilePreview: React.FC<IFilePreview> = ({ fileInfo }) => {
//       const { session } = useStore(appStore)
//       const [fileType, setFileType] = useState<string>('')
//       const [fileURL, setFileURL] = useState<string>('')
//       const [textContent, setTextContent] = useState<string>('')
//       const [isLoading, setIsLoading] = useState<boolean>(true)
//       const [_pdfBlob, setPdfBlob] = useState<Blob | null>(null)
//       const [wordBlob, setWordBlob] = useState<Blob | null>(null)

//       const wordContainerRef = useRef<HTMLDivElement>(null)

//       // Helper function to get content type from file extension
//       const getContentTypeFromFileName = (fileName: string): string => {
//             if (!fileName) return 'application/octet-stream'

//             const extension = fileName.split('.').pop()?.toLowerCase() || ''
//             return fileExtensionMap[extension] || 'application/octet-stream'
//       }

//       // Function to load docx-preview script
//       const loadDocxPreviewScript = () => {
//             return new Promise<void>((resolve, reject) => {
//                   if (window.docx) {
//                         resolve()
//                         return
//                   }

//                   // Load JSZip first (required by docx-preview)
//                   const jsZipScript = document.createElement('script')
//                   jsZipScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
//                   jsZipScript.async = true

//                   jsZipScript.onload = () => {
//                         // Then load docx-preview
//                         const docxScript = document.createElement('script')
//                         docxScript.src = 'https://cdn.jsdelivr.net/npm/docx-preview@0.1.20/dist/docx-preview.min.js'
//                         docxScript.async = true

//                         docxScript.onload = () => {
//                               // Small delay to ensure script is fully initialized
//                               setTimeout(() => resolve(), 100)
//                         }

//                         docxScript.onerror = () => {
//                               console.error('Failed to load docx-preview')
//                               reject(new Error('Failed to load docx-preview'))
//                         }

//                         document.body.appendChild(docxScript)
//                   }

//                   jsZipScript.onerror = () => {
//                         console.error('Failed to load JSZip')
//                         reject(new Error('Failed to load JSZip'))
//                   }

//                   document.body.appendChild(jsZipScript)
//             })
//       }

//       const renderWordDocument = async () => {
//             if ((fileType === 'application/msword' || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') && wordBlob && wordContainerRef.current) {
//                   try {
//                         // Load the libraries
//                         await loadDocxPreviewScript()

//                         // Wait a bit to ensure everything is loaded
//                         await new Promise(resolve => setTimeout(resolve, 200))

//                         // Verify window.docx exists
//                         if (!window.docx) {
//                               throw new Error('docx-preview library not available')
//                         }

//                         // Clear any previous content
//                         if (wordContainerRef.current) {
//                               wordContainerRef.current.innerHTML = ''

//                               // For DOCX files
//                               if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
//                                     // Create a new blob to ensure it's processed correctly
//                                     const docxBlob = new Blob([await wordBlob.arrayBuffer()], {
//                                           type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
//                                     })

//                                     // Use docx-preview to render the document
//                                     await window.docx.renderAsync(docxBlob, wordContainerRef.current, null, {
//                                           className: 'docx-preview',
//                                           inWrapper: true,
//                                           ignoreWidth: false,
//                                           ignoreHeight: false,
//                                           defaultFont: {
//                                                 family: 'Arial',
//                                                 size: 12,
//                                           },
//                                     })
//                               } else {
//                                     // For DOC files, we can't use docx-preview directly
//                                     // Show a message that DOC files can't be previewed
//                                     if (wordContainerRef.current) {
//                                           wordContainerRef.current.innerHTML = `
//                     <div style="text-align: center; padding: 20px;">
//                         <p>Preview not available for .DOC files (only .DOCX is supported).</p>
//                         <p>Please download the file to view it.</p>
//                     </div>
//                 `
//                                     }
//                               }
//                         }
//                   } catch (error: any) {
//                         console.error('Error rendering Word document with docx-preview:', error)

//                         // Display error message in the container
//                         if (wordContainerRef.current) {
//                               wordContainerRef.current.innerHTML = `
//                 <div style="text-align: center; padding: 20px;">
//                     <p>Unable to preview this document.</p>
//                     <p>Error: ${error.message || 'Unknown error'}</p>
//                     <p>Please download the file to view it.</p>
//                 </div>
//             `
//                         }
//                   }
//             }
//       }

//       useEffect(() => {
//             const fetchFile = async () => {
//                   setIsLoading(true)
//                   try {
//                         // Handle if fileContent is a URL
//                         if (typeof fileInfo.fileContent === 'string' && isValidUrl(fileInfo.fileContent) && isHttpUrl(fileInfo.fileContent)) { //&& fileInfo.fileContent.startsWith('http')) {
//                               // Ensure the URL has SSL
//                               const fileContentUrl = fileInfo.fileContent
//                               const actualUrlToFetch = ensureDomainUrlHasSSL(fileContentUrl)

//                               const response = await fetch(actualUrlToFetch, {
//                                     headers: {
//                                           nonce: `${session?.nonce}`,
//                                     },
//                               })

//                               if (!response.ok) throw new Error('Failed to fetch file')

//                               // Get content type from headers or from file extension
//                               let contentType = response.headers.get('Content-Type') || ''

//                               // If content type is missing or generic, try to detect from filename
//                               if (contentType === 'application/octet-stream' || contentType === '') {
//                                     contentType = getContentTypeFromFileName(fileInfo.fileName || '')
//                               }

//                               // Clone response and get data
//                               const arrayBuffer = await response.arrayBuffer()

//                               // For text-based content types
//                               if (contentType.startsWith('text/') || contentType === 'application/json' || contentType === 'application/xml') {
//                                     try {
//                                           const decoder = new TextDecoder('utf-8')
//                                           const text = decoder.decode(arrayBuffer)
//                                           setTextContent(text)
//                                     } catch (error) {
//                                           console.error('Error decoding text content:', error)
//                                     }
//                               }

//                               // Create blob with correct content type
//                               const blob = new Blob([arrayBuffer], { type: contentType })

//                               setFileType(contentType)

//                               // Store PDF blob for direct rendering if needed
//                               if (contentType === 'application/pdf') {
//                                     setPdfBlob(blob)
//                               } else if (contentType.includes('wordprocessing') || contentType === 'application/msword') {
//                                     setWordBlob(blob)
//                               }

//                               // Create URL from blob
//                               const objectURL = URL.createObjectURL(blob)
//                               setFileURL(objectURL)
//                         }
//                         // Handle if fileContent is binary data (Uint8Array or similar)
//                         else if (fileInfo.fileContent && typeof fileInfo.fileContent !== 'string') {
//                               // Determine content type from filename
//                               const contentType = getContentTypeFromFileName(fileInfo.fileName || '')

//                               // Create blob with detected content type
//                               const blob = new Blob([fileInfo.fileContent as BlobPart], {
//                                     type: contentType,
//                               })

//                               setFileType(contentType)

//                               if (contentType === 'application/pdf') {
//                                     setPdfBlob(blob)
//                               } else if (contentType.includes('wordprocessing') || contentType === 'application/msword') {
//                                     setWordBlob(blob)
//                               }

//                               const objectURL = URL.createObjectURL(blob)
//                               setFileURL(objectURL)
//                         }
//                         // Handle if fileContent is plain text
//                         else if (typeof fileInfo.fileContent === 'string') {
//                               setTextContent(fileInfo.fileContent)
//                               setFileType('text/plain')
//                         }
//                   } catch (error) {
//                         console.error('Error processing file:', error)
//                   } finally {
//                         setIsLoading(false)
//                   }
//             }

//             fetchFile()

//             // Cleanup function to revoke object URL
//             return () => {
//                   if (fileURL) URL.revokeObjectURL(fileURL)
//             }
//       }, [fileInfo.fileSize, session?.nonce])

//       const [convertedHeicUrl, setConvertedHeicUrl] = useState<string | null>(null)
//       const [isHeic, setIsHeic] = useState<boolean>(false)

//       useEffect(() => {
//             const convertIfHeic = async () => {
//                   if (fileType === 'image/heic' || fileType === 'image/heif') {
//                         setIsHeic(true)
//                         try {
//                               const response = await fetch(fileURL)
//                               const blob = await response.blob()

//                               const convertedBlob = await heic2any({
//                                     blob,
//                                     toType: 'image/jpeg', // or 'image/png'
//                                     quality: 0.9
//                               })

//                               const newUrl = URL.createObjectURL(convertedBlob as Blob)
//                               setConvertedHeicUrl(newUrl)
//                         } catch (err) {
//                               console.error("HEIC conversion failed:", err)
//                         }
//                   } else {
//                         setConvertedHeicUrl(null) // clear old state
//                   }
//             }

//             if (fileURL) {
//                   convertIfHeic()
//             }
//       }, [fileType, fileURL])

//       if (isLoading) return <p>Loading...</p>

//       // Render based on file type
//       // Image files
//       if (fileType.startsWith('image/')) {

//             if(isHeic && convertedHeicUrl == null ){
//                   return <p>Loading Heic Image...</p>
//             }
//             // return <img src={fileURL} alt="File preview" style={{ maxWidth: '100%', height: 'auto' }} />
//             const previewUrl = convertedHeicUrl || fileURL
//             return (
//                   <div className='p-2 max-h-[100%] overflow-y-auto'>
//                         <img src={previewUrl} alt="File preview" style={{ maxWidth: '100%', height: 'auto' }} />
//                   </div>
//             )

//       }

//       // PDF files
//       if (fileType === 'application/pdf') {
//             return <PdfViewerComponent fileType={fileType} fileURL={fileURL} fileInfo={fileInfo} />
//       }

//       // Text files
//       if (fileType.startsWith('text/') || fileType === 'application/json' || fileType === 'application/xml') {
//             const newTxtContent = textContent
//             const isJson = isJSONKeyValueStringContent(newTxtContent)
 
//             if (fileType === 'application/json' || isJson) {
//                   return (
//                         <div className="p-2">
//                               <FilePreviewAquaTreeFromTemplate formData={JSON.parse(newTxtContent)} />
//                         </div>
//                   )
//             }
//             return (
//                   <div
//                         style={{
//                               whiteSpace: 'pre-wrap',
//                               wordBreak: 'break-word',
//                               fontFamily: 'monospace',
//                               padding: '10px',
//                               border: '1px solid #ccc',
//                               borderRadius: '4px',
//                               maxHeight: '600px',
//                               overflow: 'auto',
//                         }}
//                   >
//                         {newTxtContent}
//                   </div>
//             )
//       }

//       // Audio files
//       if (fileType.startsWith('audio/')) {
//             return (
//                   <div>
//                         <audio controls style={{ width: '100%' }}>
//                               <source src={fileURL} type={fileType} />
//                               Your browser does not support the audio element.
//                         </audio>
//                         <div style={{ marginTop: '10px' }}>
//                               <a href={fileURL} download={fileInfo.fileName || 'audio'} style={{ color: 'blue', textDecoration: 'underline' }}>
//                                     Download audio file
//                               </a>
//                         </div>
//                   </div>
//             )
//       }

//       // Video files - improved handling
//       if (fileType.startsWith('video/') || (fileInfo.fileName && /\.(mp4|webm|mov|avi|mkv)$/i.test(fileInfo.fileName))) {
//             // Force content type for video if filename matches but type doesn't
//             const videoType = fileType.startsWith('video/') ? fileType : 'video/mp4'

//             return (
//                   <div>
//                         <video
//                               controls
//                               style={{
//                                     maxWidth: '100%',
//                                     height: 'auto',
//                                     backgroundColor: '#000',
//                                     borderRadius: '4px',
//                               }}
//                         >
//                               <source src={fileURL} type={videoType} />
//                               Your browser does not support the video element.
//                         </video>
//                         <div style={{ marginTop: '10px' }}>
//                               <a href={fileURL} download={fileInfo.fileName || 'video'} style={{ color: 'blue', textDecoration: 'underline' }}>
//                                     Download video file
//                               </a>
//                         </div>
//                   </div>
//             )
//       }

//       // Word documents
//       if (fileType === 'application/msword' || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
//             // Create a component for word documents
//             const WordDocumentComponent = () => {
//                   // Use effect to render the document after component mounts
//                   useEffect(() => {
//                         renderWordDocument()
//                   }, [])

//                   return (
//                         <div>
//                               <div
//                                     ref={wordContainerRef}
//                                     className="word-preview-container"
//                                     style={{
//                                           padding: '20px',
//                                           border: '1px solid #ddd',
//                                           borderRadius: '4px',
//                                           overflow: 'auto',
//                                     }}
//                               >
//                                     {/* docx-preview will render content here */}
//                               </div>
//                               <div style={{ marginTop: '15px', textAlign: 'center' }}>
//                                     <a
//                                           href={fileURL}
//                                           download={fileInfo.fileName || 'document.docx'}
//                                           style={{
//                                                 color: '#fff',
//                                                 backgroundColor: '#4285f4',
//                                                 padding: '10px 15px',
//                                                 borderRadius: '4px',
//                                                 textDecoration: 'none',
//                                                 display: 'inline-block',
//                                           }}
//                                     >
//                                           Download Word Document
//                                     </a>
//                               </div>
//                         </div>
//                   )
//             }

//             return <WordDocumentComponent />
//       }

//       // Default download option for other file types
//       return (
//             <div
//                   style={{
//                         padding: '20px',
//                         border: '1px solid #ddd',
//                         borderRadius: '4px',
//                         textAlign: 'center',
//                   }}
//             >
//                   <div style={{ marginBottom: '20px' }}>
//                         <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
//                               <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
//                               <polyline points="13 2 13 9 20 9"></polyline>
//                         </svg>
//                         <h3 style={{ margin: '10px 0', fontSize: '18px' }}>File: {fileInfo.fileName || 'Unknown'}</h3>
//                         <p>Type: {fileType}</p>
//                   </div>
//                   <a
//                         href={fileURL}
//                         download={fileInfo.fileName || 'file'}
//                         style={{
//                               color: '#fff',
//                               backgroundColor: '#4285f4',
//                               padding: '10px 15px',
//                               borderRadius: '4px',
//                               textDecoration: 'none',
//                               display: 'inline-block',
//                         }}
//                   >
//                         Download File
//                   </a>
//             </div>
//       )
// }

// export default FilePreview
