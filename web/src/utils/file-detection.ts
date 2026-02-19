import { documentTypes, imageTypes, musicTypes, videoTypes } from './constants'
import { AquaTree } from 'aqua-js-sdk'
import { ApiFileInfo } from '../models/FileInfo'

export function getFileCategory(extension: string): string | null {
      // Remove the leading dot if present (e.g., ".png" becomes "png")
      // const ext = extension.startsWith('.') ? extension.slice(1).toLowerCase() : extension.toLowerCase();
      const extParts = extension.split('/')
      const ext = extParts[extParts.length - 1]

      // Map of file categories with extensions
      const fileCategories: Record<string, string> = {
            // Image
            jpg: 'Image',
            jpeg: 'Image',
            png: 'Image',
            gif: 'Image',
            svg: 'Image',
            webp: 'Image',
            bmp: 'Image',
            ico: 'Image',
            // Audio
            mp3: 'Audio',
            wav: 'Audio',
            ogg: 'Audio',
            mp4: 'Video',
            webm: 'Video',
            // Documents
            pdf: 'Document',
            doc: 'Document',
            docx: 'Document',
            xls: 'Document',
            xlsx: 'Document',
            ppt: 'Document',
            pptx: 'Document',
            txt: 'Document',
            html: 'Document',
            css: 'Document',
            js: 'Document',
            json: 'Document',
            xml: 'Document',
            zip: 'Archive',
            rar: 'Archive',
            '7z': 'Archive',
      }

      // Loop through each category and look for the extension

      // Return null if not found
      return fileCategories[ext]
}

export const isTextFile = (file: File): boolean => {
      // Check by MIME type first (most reliable when available)
      if (file.type) {
            // Common text MIME types
            if (file.type.startsWith('text/')) return true

            // Text-based formats with application/ prefix
            if (/^application\/(json|xml|javascript|x-javascript|ecmascript|x-ecmascript|typescript|x-typescript|ld\+json|graphql|yaml|x-yaml|x-www-form-urlencoded)/.test(file.type)) {
                  return true
            }

            // Some markdown types
            if (/^text\/(markdown|x-markdown|md)/.test(file.type)) {
                  return true
            }
      }

      // Check by file extension as fallback
      const textExtensions = [
            // Programming languages
            '.txt',
            '.csv',
            '.json',
            '.xml',
            '.html',
            '.htm',
            '.css',
            '.js',
            '.jsx',
            '.ts',
            '.tsx',
            '.md',
            '.markdown',
            '.rs',
            '.py',
            '.rb',
            '.c',
            '.cpp',
            '.h',
            '.hpp',
            '.cs',
            '.java',
            '.kt',
            '.kts',
            '.swift',
            '.php',
            '.go',
            '.pl',
            '.pm',
            '.lua',
            '.sh',
            '.bash',
            '.zsh',
            '.sql',
            '.r',
            '.dart',
            '.scala',
            '.groovy',
            '.m',
            '.mm',

            // Config files
            '.yml',
            '.yaml',
            '.toml',
            '.ini',
            '.cfg',
            '.conf',
            '.config',
            '.properties',
            '.env',
            '.gitignore',
            '.gitattributes',
            '.editorconfig',
            '.babelrc',
            '.eslintrc',
            '.prettierrc',
            '.stylelintrc',
            '.npmrc',
            '.yarnrc',

            // Documentation
            '.rst',
            '.adoc',
            '.tex',
            '.latex',
            '.rtf',
            '.log',
            '.svg',

            // Data formats
            '.csv',
            '.tsv',
            '.plist',
            '.graphql',
            '.gql',
      ]

      return textExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
}

export const isArrayBufferText = (buffer: ArrayBuffer): boolean => {
      // Convert the ArrayBuffer to a Uint8Array
      const uint8Array = new Uint8Array(buffer)

      // If buffer is too small, it's likely not a valid file
      if (uint8Array.length < 4) {
            // Default to text for very small buffers
            return true
      }

      // Check for common binary file signatures (magic numbers)

      // Check for PDF signature: %PDF-
      if (uint8Array.length >= 5 && uint8Array[0] === 37 && uint8Array[1] === 80 && uint8Array[2] === 68 && uint8Array[3] === 70 && uint8Array[4] === 45) {
            return false
      }

      // Check for JPEG signature: FF D8 FF
      if (uint8Array.length >= 3 && uint8Array[0] === 0xff && uint8Array[1] === 0xd8 && uint8Array[2] === 0xff) {
            return false
      }

      // Check for PNG signature: 89 50 4E 47 0D 0A 1A 0A
      if (
            uint8Array.length >= 8 &&
            uint8Array[0] === 0x89 &&
            uint8Array[1] === 0x50 &&
            uint8Array[2] === 0x4e &&
            uint8Array[3] === 0x47 &&
            uint8Array[4] === 0x0d &&
            uint8Array[5] === 0x0a &&
            uint8Array[6] === 0x1a &&
            uint8Array[7] === 0x0a
      ) {
            return false
      }

      // Check for GIF signatures: GIF87a or GIF89a
      if (
            uint8Array.length >= 6 &&
            uint8Array[0] === 0x47 &&
            uint8Array[1] === 0x49 &&
            uint8Array[2] === 0x46 &&
            uint8Array[3] === 0x38 &&
            (uint8Array[4] === 0x37 || uint8Array[4] === 0x39) &&
            uint8Array[5] === 0x61
      ) {
            return false
      }

      // Check for BMP signature: BM
      if (uint8Array.length >= 2 && uint8Array[0] === 0x42 && uint8Array[1] === 0x4d) {
            return false
      }

      // Check for WEBP signature: RIFF....WEBP
      if (
            uint8Array.length >= 12 &&
            uint8Array[0] === 0x52 &&
            uint8Array[1] === 0x49 &&
            uint8Array[2] === 0x46 &&
            uint8Array[3] === 0x46 &&
            uint8Array[8] === 0x57 &&
            uint8Array[9] === 0x45 &&
            uint8Array[10] === 0x42 &&
            uint8Array[11] === 0x50
      ) {
            return false
      }

      // Check for SVG signature: typically starts with <?xml or <svg
      // SVG is actually text-based (XML), but we might want to treat it as a binary format
      // depending on your application's needs
      if (uint8Array.length >= 5) {
            // Check for <?xml
            const possibleXml = uint8Array[0] === 0x3c && uint8Array[1] === 0x3f && uint8Array[2] === 0x78 && uint8Array[3] === 0x6d && uint8Array[4] === 0x6c

            // Check for <svg
            const possibleSvg = uint8Array.length >= 4 && uint8Array[0] === 0x3c && uint8Array[1] === 0x73 && uint8Array[2] === 0x76 && uint8Array[3] === 0x67

            // If SVG should be treated as binary, uncomment:
            if (possibleXml || possibleSvg) return false
      }

      // Check for TIFF signature: 49 49 2A 00 (little endian) or 4D 4D 00 2A (big endian)
      if (
            uint8Array.length >= 4 &&
            ((uint8Array[0] === 0x49 && uint8Array[1] === 0x49 && uint8Array[2] === 0x2a && uint8Array[3] === 0x00) ||
                  (uint8Array[0] === 0x4d && uint8Array[1] === 0x4d && uint8Array[2] === 0x00 && uint8Array[3] === 0x2a))
      ) {
            return false
      }

      // Check if the byte sequence looks like text
      // 1. Check for null bytes (usually not in text files)
      // 2. Check for high ratio of printable ASCII characters
      // 3. Check for high ratio of control characters

      // Check first 1000 bytes or the whole buffer, whichever is smaller
      const bytesToCheck = Math.min(1000, uint8Array.length)
      let textCharCount = 0
      let nullByteCount = 0
      let controlCharCount = 0

      for (let i = 0; i < bytesToCheck; i++) {
            const byte = uint8Array[i]

            // Count null bytes
            if (byte === 0) {
                  nullByteCount++
            }

            // Count control characters (0-8, 14-31, 127)
            // Exclude common whitespace (9-13: tab, LF, VT, FF, CR)
            if ((byte >= 0 && byte <= 8) || (byte >= 14 && byte <= 31) || byte === 127) {
                  controlCharCount++
            }

            // Count printable ASCII characters (32-126) plus common whitespace (9-13)
            if ((byte >= 32 && byte <= 126) || (byte >= 9 && byte <= 13)) {
                  textCharCount++
            }
      }

      // If more than 3% are null bytes, probably not text
      if (nullByteCount > bytesToCheck * 0.03) {
            return false
      }

      // If more than 10% are control characters (excluding whitespace), probably not text
      if (controlCharCount > bytesToCheck * 0.1) {
            return false
      }

      // If more than 85% are printable characters, probably text
      return textCharCount > bytesToCheck * 0.85
}

export const isJSONFile = (fileName: string) => {
      return fileName.trim().toLowerCase().endsWith('.json')
}

export const isZipFile = (fileName: string) => {
      return fileName.trim().toLowerCase().endsWith('.zip')
}

export const isPDFFile = (fileName: string) => {
      return fileName.trim().toLowerCase().endsWith('.pdf')
}

export function getFileExtension(fileName: string): string {
      // If the file name contains a dot, extract the extension

      const extMatch = fileName.match(/\.([0-9a-z]+)$/i)
      if (extMatch) {
            return extMatch[1]
      }

      //todo fix me
      //  _fileContent :  string | ArrayBuffer | null
      // if (fileContent instanceof File || fileContent instanceof Blob) {
      //     return new Promise((resolve, reject) => {
      //         const reader = new FileReader();
      //         reader.onloadend = function(event) {
      //             const uint = new Uint8Array(event.target.result);
      //             const hex = uint.slice(0, 4).reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');
      //             resolve(getExtensionFromBytes(hex) || getExtensionFromMime(file.type));
      //         };
      //         reader.onerror = reject;
      //         reader.readAsArrayBuffer(fileContent.slice(0, 4));
      //     });
      // }

      return ''
}

export function fileType(fileName: string): string {
      const extension = getFileExtension(fileName)
      if (imageTypes.includes(extension.replace(/\s+/g, ''))) {
            return 'Image'
      } else if (documentTypes.includes(extension.replace(/\s+/g, ''))) {
            return 'Document'
      } else if (musicTypes.includes(extension.replace(/\s+/g, ''))) {
            return 'Music'
      } else if (videoTypes.includes(extension.replace(/\s+/g, ''))) {
            return 'Video'
      } else {
            return 'unknown'
      }
}

export const determineFileType = async (file: File): Promise<File> => {
      // If file already has an extension, return as is
      if (file.name.includes('.')) return file

      try {
            // Attempt to read the file contents
            const arrayBuffer = await file.arrayBuffer()
            const uint8Array = new Uint8Array(arrayBuffer)

            // Advanced MIME type detection using file signatures
            let extension = ''
            let detectedMimeType = ''

            // Helper function to check bytes at specific positions
            const checkBytes = (positions: number[], values: number[]): boolean => {
                  return values.every((value, index) => uint8Array[positions[index]] === value)
            }

            // Helper function to check string at position
            const checkString = (position: number, str: string): boolean => {
                  const bytes = new TextEncoder().encode(str)
                  return bytes.every((byte, index) => uint8Array[position + index] === byte)
            }

            // PDF signature
            if (checkBytes([0, 1, 2, 3], [0x25, 0x50, 0x44, 0x46])) {
                  extension = '.pdf'
                  detectedMimeType = 'application/pdf'
            }
            // PNG signature
            else if (checkBytes([0, 1, 2, 3], [0x89, 0x50, 0x4e, 0x47])) {
                  extension = '.png'
                  detectedMimeType = 'image/png'
            }
            // JPEG signature
            else if (checkBytes([0, 1, 2], [0xff, 0xd8, 0xff])) {
                  extension = '.jpg'
                  detectedMimeType = 'image/jpeg'
            }
            // HEIC/HEIF signatures
            else if (uint8Array.length >= 12 &&
                  checkBytes([0, 1, 2, 3], [0x00, 0x00, 0x00, 0x18]) &&
                  checkString(4, 'ftyp') &&
                  (checkString(8, 'heic') || checkString(8, 'heix'))) {
                  extension = '.heic'
                  detectedMimeType = 'image/heic'
            }
            // Alternative HEIC signature
            else if (uint8Array.length >= 12 &&
                  checkString(4, 'ftyp') &&
                  (checkString(8, 'heic') || checkString(8, 'heix') || checkString(8, 'heim') || checkString(8, 'heis'))) {
                  extension = '.heic'
                  detectedMimeType = 'image/heic'
            }
            // HEIF signature
            else if (uint8Array.length >= 12 &&
                  checkString(4, 'ftyp') &&
                  (checkString(8, 'mif1') || checkString(8, 'heif'))) {
                  extension = '.heif'
                  detectedMimeType = 'image/heif'
            }
            // GIF signatures
            else if ((checkString(0, 'GIF87a') || checkString(0, 'GIF89a'))) {
                  extension = '.gif'
                  detectedMimeType = 'image/gif'
            }
            // WebP signature
            else if (checkString(0, 'RIFF') && uint8Array.length >= 12 && checkString(8, 'WEBP')) {
                  extension = '.webp'
                  detectedMimeType = 'image/webp'
            }
            // BMP signature
            else if (checkBytes([0, 1], [0x42, 0x4d])) {
                  extension = '.bmp'
                  detectedMimeType = 'image/bmp'
            }
            // TIFF signatures
            else if ((checkBytes([0, 1, 2, 3], [0x49, 0x49, 0x2a, 0x00]) ||
                  checkBytes([0, 1, 2, 3], [0x4d, 0x4d, 0x00, 0x2a]))) {
                  extension = '.tiff'
                  detectedMimeType = 'image/tiff'
            }
            // ICO signature
            else if (checkBytes([0, 1, 2, 3], [0x00, 0x00, 0x01, 0x00])) {
                  extension = '.ico'
                  detectedMimeType = 'image/x-icon'
            }
            // SVG signature (XML-based)
            else if (checkString(0, '<?xml') || checkString(0, '<svg')) {
                  try {
                        const text = new TextDecoder().decode(uint8Array)
                        if (text.includes('<svg') || text.includes('xmlns="http://www.w3.org/2000/svg"')) {
                              extension = '.svg'
                              detectedMimeType = 'image/svg+xml'
                        }
                  } catch {
                        // Not SVG
                  }
            }
            // MP4 signatures
            else if (uint8Array.length >= 12 &&
                  checkString(4, 'ftyp') &&
                  (checkString(8, 'mp41') || checkString(8, 'mp42') || checkString(8, 'isom') ||
                        checkString(8, 'M4V ') || checkString(8, 'M4A '))) {
                  extension = '.mp4'
                  detectedMimeType = 'video/mp4'
            }
            // AVI signature
            else if (checkString(0, 'RIFF') && uint8Array.length >= 12 && checkString(8, 'AVI ')) {
                  extension = '.avi'
                  detectedMimeType = 'video/x-msvideo'
            }
            // MOV signature (QuickTime)
            else if (uint8Array.length >= 12 &&
                  checkString(4, 'ftyp') &&
                  checkString(8, 'qt  ')) {
                  extension = '.mov'
                  detectedMimeType = 'video/quicktime'
            }
            // MP3 signature
            else if (checkBytes([0, 1], [0xff, 0xfb]) || checkString(0, 'ID3')) {
                  extension = '.mp3'
                  detectedMimeType = 'audio/mpeg'
            }
            // WAV signature
            else if (checkString(0, 'RIFF') && uint8Array.length >= 12 && checkString(8, 'WAVE')) {
                  extension = '.wav'
                  detectedMimeType = 'audio/wav'
            }
            // OGG signature
            else if (checkString(0, 'OggS')) {
                  extension = '.ogg'
                  detectedMimeType = 'audio/ogg'
            }
            // ZIP signature (also covers XLSX, DOCX, etc.)
            else if (checkBytes([0, 1, 2, 3], [0x50, 0x4b, 0x03, 0x04]) ||
                  checkBytes([0, 1, 2, 3], [0x50, 0x4b, 0x05, 0x06]) ||
                  checkBytes([0, 1, 2, 3], [0x50, 0x4b, 0x07, 0x08])) {
                  // Need to check if it's a specific Office format
                  try {
                        const text = new TextDecoder().decode(uint8Array.slice(0, 1024))
                        if (text.includes('word/')) {
                              extension = '.docx'
                              detectedMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                        } else if (text.includes('xl/')) {
                              extension = '.xlsx'
                              detectedMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                        } else if (text.includes('ppt/')) {
                              extension = '.pptx'
                              detectedMimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
                        } else {
                              extension = '.zip'
                              detectedMimeType = 'application/zip'
                        }
                  } catch {
                        extension = '.zip'
                        detectedMimeType = 'application/zip'
                  }
            }
            // RAR signature
            else if (checkString(0, 'Rar!')) {
                  extension = '.rar'
                  detectedMimeType = 'application/vnd.rar'
            }
            // 7z signature
            else if (checkBytes([0, 1, 2, 3, 4, 5], [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])) {
                  extension = '.7z'
                  detectedMimeType = 'application/x-7z-compressed'
            }
            // TAR signature
            else if (uint8Array.length >= 262 &&
                  checkString(257, 'ustar')) {
                  extension = '.tar'
                  detectedMimeType = 'application/x-tar'
            }
            // GZIP signature
            else if (checkBytes([0, 1, 2], [0x1f, 0x8b, 0x08])) {
                  extension = '.gz'
                  detectedMimeType = 'application/gzip'
            }
            // MS Office legacy formats
            else if (checkBytes([0, 1, 2, 3, 4, 5, 6, 7], [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
                  // Could be DOC, XLS, or PPT - default to DOC
                  extension = '.doc'
                  detectedMimeType = 'application/msword'
            }
            // RTF signature
            else if (checkString(0, '{\\rtf1')) {
                  extension = '.rtf'
                  detectedMimeType = 'application/rtf'
            }
            // XML signature
            else if (checkString(0, '<?xml')) {
                  extension = '.xml'
                  detectedMimeType = 'application/xml'
            }
            // HTML signature
            else if (checkString(0, '<!DOCTYPE html') || checkString(0, '<html') || checkString(0, '<!doctype html')) {
                  extension = '.html'
                  detectedMimeType = 'text/html'
            }
            // JSON signature (looks like a JSON object or array start)
            else if (uint8Array[0] === 0x7b || uint8Array[0] === 0x5b) {
                  try {
                        // Attempt to parse as JSON
                        const jsonTest = new TextDecoder().decode(uint8Array)
                        JSON.parse(jsonTest)
                        extension = '.json'
                        detectedMimeType = 'application/json'
                  } catch {
                        // Not a valid JSON
                  }
            }
            // CSS signature
            else if (uint8Array.length > 0) {
                  try {
                        const text = new TextDecoder().decode(uint8Array.slice(0, 1024))
                        if (/^[\s]*[.#@]/.test(text) || text.includes('{') && text.includes('}') && text.includes(':')) {
                              extension = '.css'
                              detectedMimeType = 'text/css'
                        }
                  } catch {
                        // Not CSS
                  }
            }
            // JavaScript signature
            else if (uint8Array.length > 0) {
                  try {
                        const text = new TextDecoder().decode(uint8Array.slice(0, 1024))
                        if (text.includes('function') || text.includes('var ') || text.includes('const ') ||
                              text.includes('let ') || text.includes('=>') || text.includes('')) {
                              extension = '.js'
                              detectedMimeType = 'application/javascript'
                        }
                  } catch {
                        // Not JavaScript
                  }
            }

            // If still no extension detected, try text-based detection
            if (!extension) {
                  try {
                        const text = new TextDecoder().decode(uint8Array)
                        // Check if content looks like CSV (contains commas or semicolons)
                        if (/[,;]/.test(text) && text.split('\n').length > 1) {
                              extension = '.csv'
                              detectedMimeType = 'text/csv'
                        }
                        // Check if it's a tab-separated file
                        else if (/\t/.test(text) && text.split('\n').length > 1) {
                              extension = '.tsv'
                              detectedMimeType = 'text/tab-separated-values'
                        }
                        // Check if it looks like code
                        else if (text.includes('#include') || text.includes('import ') || text.includes('from ')) {
                              extension = '.txt'
                              detectedMimeType = 'text/plain'
                        }
                        // Default to text
                        else {
                              extension = '.txt'
                              detectedMimeType = 'text/plain'
                        }
                  } catch {
                        extension = '.bin'
                        detectedMimeType = 'application/octet-stream'
                  }
            }

            // If no extension was detected, fall back to original file type or generic
            if (!extension) {
                  extension = file.type ? `.${file.type.split('/').pop()}` : '.bin'
                  detectedMimeType = file.type || 'application/octet-stream'
            }

            // Create a new file with the determined extension
            const renamedFile = new File([uint8Array], `${file.name}${extension}`, {
                  type: detectedMimeType,
                  lastModified: file.lastModified,
            })

            return renamedFile
      } catch (error) {
            console.error('Error determining file type:', error)

            // Fallback: use file type or add a generic extension
            const fallbackExtension = file.type ? `.${file.type.split('/').pop()}` : file.name.includes('.') ? '' : '.bin'

            const fallbackFile = new File([await file.arrayBuffer()], `${file.name}${fallbackExtension}`, {
                  type: file.type || 'application/octet-stream',
                  lastModified: file.lastModified,
            })

            return fallbackFile
      }
}

export function filterFilesByType(files: ApiFileInfo[], fileType: string): ApiFileInfo[] {
      // "image" | "document" | "music" | "video"

      switch (fileType) {
            case 'image':
                  return files.filter(file => {
                        return imageTypes.includes(getFileExtension(file.fileObject[0].fileName).replace(/\s+/g, ''))
                  })
            case 'document':
                  return files.filter(file => documentTypes.includes(getFileExtension(file.fileObject[0].fileName).replace(/\s+/g, '')))
            case 'music':
                  return files.filter(file => musicTypes.includes(getFileExtension(file.fileObject[0].fileName).replace(/\s+/g, '')))
            case 'video':
                  return files.filter(file => videoTypes.includes(getFileExtension(file.fileObject[0].fileName).replace(/\s+/g, '')))
            default:
                  return []
      }
}

export function calculateContentSize(content: string | Buffer | Blob): number {
      if (typeof content === 'string') {
            // For a string, return the number of bytes by encoding it into UTF-8
            return new TextEncoder().encode(content).length
      } else if (Buffer.isBuffer(content)) {
            // For a Buffer, return its length directly (in bytes)
            return content.length
      } else if (content instanceof Blob) {
            // For a Blob (File), return the size property (in bytes)
            return content.size
      }

      throw new Error('Unsupported content type')
}

export function estimateFileSize(fileContent: string | AquaTree): number {
      let fileSize = 0

      if (typeof fileContent === 'string') {
            if (isBase64(fileContent)) {
                  fileSize = calculateBase64Size(fileContent)
            } else {
                  fileSize = new TextEncoder().encode(fileContent).length // UTF-8 size
            }
      } else if (typeof fileContent === 'object') {
            const jsonString = JSON.stringify(fileContent)
            fileSize = new TextEncoder().encode(jsonString).length
      } else {
            throw new Error('Unsupported fileContent type')
      }

      return fileSize
}

// Function to check if a string is Base64 encoded
export function isBase64(str: string) {
      if (typeof str !== 'string') return false
      return /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/.test(str)
}

// Function to calculate decoded file size from base64
export function calculateBase64Size(base64String: string) {
      const padding = base64String.endsWith('==') ? 2 : base64String.endsWith('=') ? 1 : 0
      return (base64String.length * 3) / 4 - padding
}

export function estimateStringFileSize(str: string): number {
      if (!str) return 0

      return str.split('').reduce((acc, char) => {
            const code = char.charCodeAt(0)
            // UTF-8 encoding rules:
            // 1 byte for ASCII (0-127)
            // 2 bytes for extended ASCII (128-2047)
            // 3 bytes for most other characters (2048-65535)
            // 4 bytes for remaining Unicode (65536+)
            if (code < 128) return acc + 1
            if (code < 2048) return acc + 2
            if (code < 65536) return acc + 3
            return acc + 4
      }, 0)
}

export const isJSONKeyValueStringContent = (fileContent: string): boolean => {
      try {
            // First check if it's valid JSON
            JSON.parse(fileContent)
            return true
      } catch (error) {
            // If JSON.parse throws an error, it's not valid JSON
            return false
      }
}
