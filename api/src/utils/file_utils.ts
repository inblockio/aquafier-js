import path from "path";
import {fileURLToPath} from "url";
import * as process from "node:process";
import * as fs from "node:fs";
import {getBucketName, getMinioClient, minioClientCompleted} from "./s3Utils";
import stream from "node:stream";

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


/**
 * Determine whether S3/MinIO storage is available and ready.
 *
 * If a MinIO client is configured, this function verifies the configured bucket exists and will create it if missing.
 * Returns true when the client is configured and the bucket is ensured; returns false if no client is configured or if any error occurs while checking/creating the bucket.
 *
 * Note: On error this function logs a warning and returns false (it does not throw).
 *
 * @returns True when S3/MinIO is available and the bucket is ensured, otherwise false.
 */
async function s3Available(): Promise<boolean> {
    if (minioClientCompleted()) {
        try {
            const minioClient = getMinioClient();
            if (!await minioClient.bucketExists(getBucketName())) {
                await minioClient.makeBucket(getBucketName());
            }
        } catch (e) {
            console.warn("Cannot use the s3 store!", e);
            return false
        }
        return true;
    }
    return false;
}

/**
 * Persist binary content either to S3 (MinIO) or to the local filesystem and return the stored path.
 *
 * If S3/MinIO is available (s3Available() returns true) the function uploads `content` to the configured bucket
 * and returns a path of the form `s3:<bucket>/<filename>`. Otherwise it writes `content` to
 * `<fileSystemPath>/<filename>` on the local filesystem and returns that file system path.
 *
 * @param fileSystemPath - Local directory to use when S3 is not available.
 * @param filename - Name (key) to use for the stored file.
 * @param content - Binary content to persist (provided as a Buffer or Buffer-like object).
 * @returns The storage path where the file was written: either `s3:<bucket>/<filename>` or the local file path.
 */
async function persistFile(fileSystemPath: string, filename: string, content: Buffer<ArrayBuffer>): Promise<string> {
    if (await s3Available()) {
        const minioClient = getMinioClient();
        await minioClient.putObject(getBucketName(), filename, content)
        return path.join('s3:', getBucketName(), filename);
    } else {
        const filePath = path.join(fileSystemPath, filename);
        await fs.promises.writeFile(filePath, content);
        return filePath;
    }
}

/**
 * Retrieve a file from S3 (MinIO) or the local filesystem as a Buffer.
 *
 * If `path` contains the prefix `s3:` the function attempts to read from the configured MinIO/S3 bucket:
 * the expected format is `s3:/<bucket>/<key>` (one leading slash after `s3:`). When S3 is available the object
 * is streamed and concatenated into a single Buffer which is returned.
 *
 * If `path` does not contain `s3:` the function reads and returns the local file synchronously via `fs.readFileSync`.
 *
 * @param path - Either a local filesystem path or an S3 path of the form `s3:/bucket/key`.
 * @returns A Buffer with the file contents, or `undefined` when an S3 path is supplied but S3/MinIO is not available.
 */
async function getFile(path: string): Promise<Buffer | undefined> {
    if (path.includes("s3:")) {
        if (await s3Available()) {
            const cleanedPath = path.replace("s3:/", "");
            const bucket = cleanedPath.substring(0, cleanedPath.indexOf("/"));
            const filePath = cleanedPath.substring(cleanedPath.indexOf("/") + 1);
            const data = await getMinioClient().getObject(bucket, filePath)
            let chunks: Buffer[] = []; // Fixed: Simple Buffer array instead of union type
            data.on("data", (chunk: Buffer) => {
                chunks.push(chunk);
            })
            return new Promise((resolve, reject) => {
                data.on('end', () => {
                    const objectData = Buffer.concat(chunks); // Combine all chunks into a single Buffer (byte array)
                    resolve(objectData);
                });

                data.on('error', (err) => {
                    reject(err);
                });
            });
        }
    } else {
        return fs.readFileSync(path);
    }
}

/**
 * Return the size (in bytes) of a file identified by a local path or an S3-style path.
 *
 * If `path` contains the prefix `s3:` (for example `"s3://bucket/key"`), the function will try to
 * use the configured MinIO/S3 client to stat the object and return its size. If the S3 client is
 * not available the function returns `undefined`. If statting the object fails, the function
 * returns `null`.
 *
 * For non-S3 paths the function returns the local filesystem file size (in bytes).
 *
 * @param path - Local filesystem path or an S3-style path prefixed with `s3:` (e.g. `"s3://bucket/key"`).
 * @returns The file size in bytes, `null` if stat on S3 failed, or `undefined` when S3 is chosen but not available.
 */
async function getFileSize(path: string): Promise<number | undefined | null> {
    if (path.includes("s3:")) {
        if (await s3Available()) {
            const cleanedPath = path.replace("s3:/", "");
            const bucket = cleanedPath.substring(0, cleanedPath.indexOf("/"));
            const filePath = cleanedPath.substring(cleanedPath.indexOf("/") + 1);
            try {
                const data = await getMinioClient().statObject(bucket, filePath)
                return data.size;
            } catch (e) {
                console.error(e);
                return null
            }
        }
    } else {
        return fs.statSync(path).size;
    }
}

/**
 * Delete a file from either S3/MinIO (when the path contains `s3:`) or the local filesystem.
 *
 * For S3 paths the function expects a path containing `s3:` and of the form `s3:/<bucket>/<key>` (the code strips the `s3:/` prefix, extracts bucket and key, and calls the MinIO client to remove the object). If S3 is not available the function is a no-op.
 *
 * @param path - File path to delete. Use a local filesystem path for local files or an S3-style path containing `s3:` for objects in the configured MinIO/S3 bucket.
 * @throws When removing a local file fails (filesystem errors) or when the MinIO client fails to remove the object.
 */
async function deleteFile(path: string): Promise<void> {
    if (path.includes("s3:")) {
        if (await s3Available()) {
            const cleanedPath = path.replace("s3:/", "");
            const bucket = cleanedPath.substring(0, cleanedPath.indexOf("/"));
            const filePath = cleanedPath.substring(cleanedPath.indexOf("/") + 1);
            await getMinioClient().removeObject(bucket, filePath)
        }
    } else {
        fs.unlinkSync(path);
        return;
    }
}

export {
    streamToBuffer,
    isTextFile,
    readFileContent,
    estimateStringFileSize,
    isTextFileUsingName,
    isTextFileProbability,
    getFileUploadDirectory,
    getAquaAssetDirectory,
    readFileAsArrayBuffer,
    readFileAsText,
    persistFile,
    getFile,
    getFileSize,
    deleteFile
};