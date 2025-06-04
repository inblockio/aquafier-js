import path from "path";
import { fileURLToPath } from "url";

const getAquaAssetDirectory = (): string => {
    // Get the equivalent of __dirname in ES modules
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    return process.env.UPLOAD_DIR || path.join(__dirname, '../../assets');

}
const getFileUploadDirectory = (): string => {
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

/**
 * Reads a File object as text
 * @param file The File object to read
 * @returns Promise that resolves with the file contents as string
 */
function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            if (event.target?.result) {
                resolve(event.target.result as string);
            } else {
                reject(new Error("Failed to read file content"));
            }
        };

        reader.onerror = (error) => {
            reject(error);
        };

        reader.readAsText(file);
    });
}

/**
 * Reads a File object as ArrayBuffer
 * @param file The File object to read
 * @returns Promise that resolves with the file contents as ArrayBuffer
 */
function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            if (event.target?.result) {
                resolve(event.target.result as ArrayBuffer);
            } else {
                reject(new Error("Failed to read file content"));
            }
        };

        reader.onerror = (error) => {
            reject(error);
        };

        reader.readAsArrayBuffer(file);
    });
}


const readFileContent = async (file: File): Promise<string | Uint8Array> => {
    if (isTextFile(file)) {
        // If it's a text file, read as text
        return await readFileAsText(file);
    } else {
        console.log("binary data....")
        // Otherwise for binary files, read as ArrayBuffer
        const res = await readFileAsArrayBuffer(file)
        return new Uint8Array(res);

    }
};


// More comprehensive function to check if a file is text-based
const isTextFile = (file: File): boolean => {
    // Check by MIME type first (most reliable when available)
    if (file.type) {
        // Common text MIME types
        if (file.type.startsWith('text/')) return true;

        // Text-based formats with application/ prefix
        if (/^application\/(json|xml|javascript|x-javascript|ecmascript|x-ecmascript|typescript|x-typescript|ld\+json|graphql|yaml|x-yaml|x-www-form-urlencoded)/.test(file.type)) {
            return true;
        }

        // Some markdown types
        if (/^text\/(markdown|x-markdown|md)/.test(file.type)) {
            return true;
        }
    }

    // Check by file extension as fallback
    const textExtensions = [
        // Programming languages
        '.txt', '.csv', '.json', '.xml', '.html', '.htm', '.css', '.js', '.jsx', '.ts', '.tsx',
        '.md', '.markdown', '.rs', '.py', '.rb', '.c', '.cpp', '.h', '.hpp', '.cs', '.java',
        '.kt', '.kts', '.swift', '.php', '.go', '.pl', '.pm', '.lua', '.sh', '.bash', '.zsh',
        '.sql', '.r', '.dart', '.scala', '.groovy', '.m', '.mm',

        // Config files
        '.yml', '.yaml', '.toml', '.ini', '.cfg', '.conf', '.config', '.properties',
        '.env', '.gitignore', '.gitattributes', '.editorconfig', '.babelrc', '.eslintrc',
        '.prettierrc', '.stylelintrc', '.npmrc', '.yarnrc',

        // Documentation
        '.rst', '.adoc', '.tex', '.latex', '.rtf', '.log', '.svg',

        // Data formats
        '.csv', '.tsv', '.plist', '.graphql', '.gql'
    ];

    return textExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
};


const extensions = (): string[] => {
    return [
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
        '.diff', '.patch',

        // Non-text file extensions
        '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.zip', '.rar', '.exe', '.dll', '.so', '.dylib'
    ];
}

// Determine if the file is a text file based on filename extension
const isTextFileUsingName = (filename: string): boolean => {

    const ext = path.extname(filename).toLowerCase();
    return extensions().includes(ext);
};



/**
 * Estimates the size in bytes that a string would occupy if saved to a file
 * Uses UTF-8 encoding rules where ASCII chars take 1 byte and others take 2-4 bytes
 * @param str Input string to estimate size for
 * @returns Estimated size in bytes
 */
 function estimateStringFileSize(str: string): number {
    if (!str) return 0;

    return str.split('').reduce((acc, char) => {
        const code = char.charCodeAt(0);
        // UTF-8 encoding rules:
        // 1 byte for ASCII (0-127)
        // 2 bytes for extended ASCII (128-2047)
        // 3 bytes for most other characters (2048-65535)
        // 4 bytes for remaining Unicode (65536+)
        if (code < 128) return acc + 1;
        if (code < 2048) return acc + 2;
        if (code < 65536) return acc + 3;
        return acc + 4;
    }, 0);
}


const isTextFileProbability = async (buffer: Buffer, filename: string): Promise<boolean> => {
    // First check by extension
    const textExtensions = extensions();
    const ext = path.extname(filename).toLowerCase();

    // Known binary extensions that should never be treated as text
    const binaryExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.zip', '.rar', '.exe', '.dll', '.so', '.dylib'];
    if (binaryExtensions.includes(ext)) {
        return false;
    }

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

export { streamToBuffer, isTextFile, readFileContent, estimateStringFileSize, isTextFileUsingName, isTextFileProbability, getFileUploadDirectory, getAquaAssetDirectory, readFileAsArrayBuffer, readFileAsText };