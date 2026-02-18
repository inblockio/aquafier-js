import { FileObject } from 'aqua-js-sdk'
import { useFileLoader } from '@/hooks/useFileLoader'
import { isJSONKeyValueStringContent } from '@/utils/functions'
import {
      PdfPreview,
      ImagePreview,
      MarkdownPreview,
      JsonPreview,
      CodePreview,
      MediaPreview,
      WordPreview,
      DownloadFallback,
} from './renderers'

interface IFilePreview {
      fileInfo: FileObject
      latestRevisionHash: string
}

export const FilePreview: React.FC<IFilePreview> = ({ fileInfo, latestRevisionHash }) => {
      const {
            fileType,
            fileURL,
            textContent,
            isLoading,
            convertedHeicUrl,
            isHeic,
            wordContainerRef,
            markdownContainerRef,
            renderMarkdown,
            renderWordDocument,
      } = useFileLoader(fileInfo)

      if (isLoading) return <p>Loading...</p>

      // Image files
      if (fileType.startsWith('image/')) {
            return <ImagePreview fileURL={fileURL} isHeic={isHeic} convertedHeicUrl={convertedHeicUrl} />
      }

      // PDF files
      if (fileType === 'application/pdf') {
            return <PdfPreview fileType={fileType} fileURL={fileURL} fileInfo={fileInfo} latestRevisionHash={latestRevisionHash} />
      }

      // Markdown files
      if (fileType === 'text/markdown') {
            return <MarkdownPreview renderMarkdown={renderMarkdown} markdownContainerRef={markdownContainerRef} />
      }

      // JSON files
      if (fileType === 'application/json' || isJSONKeyValueStringContent(textContent)) {
            return <JsonPreview textContent={textContent} />
      }

      // Code and text files with syntax highlighting
      if (fileType.startsWith('text/') || fileType === 'application/xml') {
            return <CodePreview textContent={textContent} fileType={fileType} />
      }

      // Audio files
      if (fileType.startsWith('audio/')) {
            return <MediaPreview fileURL={fileURL} fileType={fileType} fileName={fileInfo.fileName || ''} />
      }

      // Video files
      if (fileType.startsWith('video/') || (fileInfo.fileName && /\.(mp4|webm|mov|avi|mkv|flv|wmv|m4v)$/i.test(fileInfo.fileName))) {
            return <MediaPreview fileURL={fileURL} fileType={fileType} fileName={fileInfo.fileName || ''} />
      }

      // Word documents
      if (fileType === 'application/msword' || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            return <WordPreview renderWordDocument={renderWordDocument} wordContainerRef={wordContainerRef} fileURL={fileURL} fileName={fileInfo.fileName || ''} />
      }

      // Default download option for other file types
      return <DownloadFallback fileURL={fileURL} fileType={fileType} fileName={fileInfo.fileName || ''} />
}

export default FilePreview
