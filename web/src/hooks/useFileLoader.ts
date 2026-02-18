import { FileObject } from 'aqua-js-sdk'
import { useEffect, useRef, useState } from 'react'
import { useStore } from 'zustand'
import appStore from '../store'
import {
      ensureDomainUrlHasSSL,
      isHttpUrl,
      isValidUrl,
} from '../utils/functions'
import { getContentTypeFromFileName } from '@/components/file_preview/constants'
import heic2any from 'heic2any'
import apiClient from '@/api/axiosInstance'

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

export function useFileLoader(fileInfo: FileObject) {
      const { session } = useStore(appStore)
      const [fileType, setFileType] = useState<string>('')
      const [fileURL, setFileURL] = useState<string>('')
      const [textContent, setTextContent] = useState<string>('')
      const [isLoading, setIsLoading] = useState<boolean>(true)
      const [_pdfBlob, setPdfBlob] = useState<Blob | null>(null)
      const [wordBlob, setWordBlob] = useState<Blob | null>(null)
      const [convertedHeicUrl, setConvertedHeicUrl] = useState<string | null>(null)
      const [isHeic, setIsHeic] = useState<boolean>(false)

      const wordContainerRef = useRef<HTMLDivElement>(null)
      const markdownContainerRef = useRef<HTMLDivElement>(null)

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

      return {
            fileType,
            fileURL,
            textContent,
            isLoading,
            wordBlob,
            convertedHeicUrl,
            isHeic,
            pdfBlob: _pdfBlob,
            wordContainerRef,
            markdownContainerRef,
            renderMarkdown,
            renderWordDocument,
      }
}
