import path from "path";
import { fileURLToPath } from "url";

const getFileUploadDirectory =(): string =>{
  // Get the equivalent of __dirname in ES modules
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  return process.env.UPLOAD_DIR || path.join(__dirname, '../../media');
   
}
const streamToBuffer = async (stream: NodeJS.ReadableStream): Promise<Buffer> => {
    const chunks: Uint8Array[] = [];
    return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
    });
};


const extensions= (): string[] =>{
    return     [
        // Plain text
        '.txt', '.text', '.log', '.me', '.readme',

        // Source code files
        '.js', '.jsx', '.ts', '.tsx', '.java', '.c', '.cpp', '.h', '.hpp',
        '.cs', '.py', '.rb', '.php', '.go', '.rs', '.swift', '.kt', '.scala',
        '.groovy', '.pl', '.pm', '.t', '.sh', '.bash', '.zsh', '.fish',
        '.ps1', '.psm1', '.bat', '.cmd', '.asm', '.s', '.lua', '.r', '.d',
        '.dart', '.m', '.mm', '.f', '.f90', '.f95', '.for', '.tcl', '.vb',
        '.vbs', '.elm', '.ex', '.exs', '.erl', '.hrl', '.clj', '.cljs',
        '.lisp', '.lsp', '.ml', '.mli', '.fs', '.fsx', '.v', '.zig',

        // Web development
        '.html', '.htm', '.css', '.scss', '.sass', '.less', '.svg', '.xml',
        '.xsl', '.xslt', '.json', '.yaml', '.yml', '.toml', '.ini', '.env',
        '.htaccess', '.jsx', '.tsx',

        // Document formats
        '.md', '.markdown', '.rst', '.rtf', '.tex', '.latex', '.wiki',
        '.csv', '.tsv', '.ics', '.vcf',

        // Configuration files
        '.conf', '.config', '.cfg', '.properties', '.plist', '.rc',
        '.gitignore', '.gitconfig', '.gitattributes', '.editorconfig',
        '.dockerignore', '.npmrc', '.babelrc', '.eslintrc', '.prettierrc',
        '.stylelintrc',

        // Data exchange
        '.sql', '.graphql', '.gql', '.proto',

        // Misc
        '.diff', '.patch'
    ];
}
// Determine if the file is a text file based on filename extension
const isTextFile = (filename: string): boolean => {
 
    const ext = path.extname(filename).toLowerCase();
    return extensions().includes(ext);
};

const isTextFileProbability = async (buffer: Buffer, filename: string): Promise<boolean> => {
    // First check by extension
    const textExtensions = extensions();
    const ext = path.extname(filename).toLowerCase();
    
    // Known text extension
    if (textExtensions.includes(ext)) {
      return true;
    }
    
    // For unknown extensions, try to detect if it's text by examining the buffer
    // Check if buffer contains any null bytes (common in binary files)
    for (let i = 0; i < Math.min(buffer.length, 1024); i++) {
      if (buffer[i] === 0) {
        return false; // Contains null byte, likely binary
      }
    }
    
    // Additional check: high ratio of printable ASCII characters suggests text
    let printableChars = 0;
    const sampleSize = Math.min(buffer.length, 1024);
    for (let i = 0; i < sampleSize; i++) {
      const byte = buffer[i];
      if ((byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13) {
        printableChars++;
      }
    }
    
    const textRatio = printableChars / sampleSize;
    return textRatio > 0.9; // If more than 90% is printable ASCII, consider it text
  };
export { streamToBuffer, isTextFile, isTextFileProbability , getFileUploadDirectory};