// Define file extensions to content type mappings
export const fileExtensionMap: { [key: string]: string } = {
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

// Language mapping for syntax highlighting labels
export const languageMap: { [key: string]: string } = {
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

// Helper function to get content type from file extension
export const getContentTypeFromFileName = (fileName: string): string => {
      if (!fileName) return 'application/octet-stream'

      const extension = fileName.split('.').pop()?.toLowerCase() || ''
      return fileExtensionMap[extension] || 'application/octet-stream'
}

// Helper function to get language label from content type
export const getLanguageFromType = (type: string): string => {
      return languageMap[type] || ''
}
