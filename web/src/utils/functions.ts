// import { ethers } from "ethers";
import { ApiFileInfo } from "../models/FileInfo";
import { documentTypes, imageTypes, musicTypes, videoTypes } from "./constants";
// import { AvatarGenerator } from 'random-avatar-generator';
import Aquafier, { AquaTree, CredentialsData, FileObject, Revision } from "aqua-js-sdk";
import jdenticon from "jdenticon/standalone";

export function formatCryptoAddress(address?: string, start: number = 10, end: number = 4, message?: string): string {
    if (!address) return message ?? "NO ADDRESS"
    if (address?.length < (start + end)) {
        // throw new Error(`Address must be at least ${start + end} characters long.`);
        return address
    }

    const firstPart = address?.slice(0, start);
    const lastPart = address?.slice(-end);
    return `${firstPart}...${lastPart}`;
}

export function remove0xPrefix(input: string): string {
    // Check if the input string starts with '0x'
    if (input.startsWith('0x')) {
        // Remove the prefix and return the remaining string
        return input.slice(2);
    }
    // Return the original string if it doesn't start with '0x'
    return input;
}

export function getCookie(name: string) {
    const value = `; ${document.cookie}`;
    const parts: any = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return null;
}

export function setCookie(name: string, value: string, expirationTime: Date) {
    const expirationDate = new Date(expirationTime);
    // For UTC cookie settings
    // document.cookie = `${name}=${value}; expires=${expirationDate.toUTCString()}; path=/; Secure; SameSite=Strict`;
    document.cookie = `${name}=${value}; expires=${expirationDate}; path=/; Secure; SameSite=Strict`;
}

export function getAquaTreeFileObject(fileInfo: ApiFileInfo): FileObject | undefined {

    let mainAquaFileName = "";
    let mainAquaHash = "";
    // fetch the genesis 
    let revisionHashes = Object.keys(fileInfo.aquaTree!.revisions!)
    for (let revisionHash of revisionHashes) {
        let revisionData = fileInfo.aquaTree!.revisions![revisionHash];
        if (revisionData.previous_verification_hash == null || revisionData.previous_verification_hash == "") {
            mainAquaHash = revisionHash;
            break;
        }
    }
    mainAquaFileName = fileInfo.aquaTree!.file_index[mainAquaHash];

    return fileInfo.fileObject.find((e) => e.fileName == mainAquaFileName);


}

export function getGenesisHash(aquaTree: AquaTree): string | null {
    let aquaTreeGenesisHash: string | null = null;
    let allAquuaTreeHashes = Object.keys(aquaTree!.revisions);

    for (let hash of allAquuaTreeHashes) {
        let revisionItem = aquaTree!.revisions[hash];
        if (revisionItem.previous_verification_hash == "" || revisionItem.previous_verification_hash == null || revisionItem.previous_verification_hash == undefined) {

            aquaTreeGenesisHash = hash //revisionItem.previous_verification_hash
            break;

        }
    }

    return aquaTreeGenesisHash
}

export async function getCurrentNetwork() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            //  console.log("Current chain ID:", chainId);
            return chainId;
        } catch (error) {
            console.error("Error fetching chain ID:", error);
        }
    } else {
        console.error("MetaMask is not installed.");
    }
}

export async function switchNetwork(chainId: string) {
    // const chainId = '0x89'; // Example: Polygon Mainnet chain ID
    if (typeof window.ethereum !== 'undefined') {
        try {
            // Check if the network is already set
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId }],
            });
            //  console.log("Network switched successfully");
        } catch (error) {
            // If the network is not added, request MetaMask to add it

        }
    } else {
        console.error("MetaMask is not installed.");
    }
}


export async function fetchFiles(publicMetaMaskAddress: string, url: string, nonce: string): Promise<Array<ApiFileInfo>> {
    try {

        const query = await fetch(url, {
            method: 'GET',
            headers: {
                'metamask_address': publicMetaMaskAddress,
                'nonce': nonce
            },
        });
        const response = await query.json()

        if (!query.ok) {
            throw new Error(`HTTP error! status: ${query.status}`);
        }

        return response.data;

    } catch (error) {
        console.error("Error fetching files:", error);
        return [];
    }
}

/**
 * Validates an AquaTree object to ensure all required properties exist and are valid
 * @param tree The AquaTree object to validate
 * @returns boolean indicating whether the tree is valid
 */
export function validateAquaTree(tree: AquaTree): [boolean, string] {
    // Check if tree is null or undefined
    if (!tree) {
        return [false, "aqua tree is null"];
    }

    // Check if required top-level properties exist
    if (!tree.revisions || !tree.file_index) {
        return [false, "revsions and file index must exist in an aqua tree"];
    }

    // Check if revisions is a valid object
    if (typeof tree.revisions !== 'object' || Array.isArray(tree.revisions)) {
        return [false, "revision does not contain revisions"];
    }

    // Check if file_index is a valid object
    if (typeof tree.file_index !== 'object' || Array.isArray(tree.file_index)) {
        return [false, "file index does not contain values "];
    }

    // Validate each revision
    for (const hash in tree.revisions) {
        const revision = tree.revisions[hash];

        console.log(`Revision --  ${JSON.stringify(revision)}`)
        // Check required fields for all revisions
        if (revision.previous_verification_hash === undefined || revision.previous_verification_hash === null) {
            return [false, "A revision must contain previous_verification_hash"];
        }
        if (revision.local_timestamp === undefined || revision.local_timestamp === null) {
            return [false, "A revision must contain local_timestamp "];
        }
        if (!revision.revision_type === undefined || revision.local_timestamp === null) {
            return [false, "A revision must contain  revision_type"];
        }

        // Validate revision_type is one of the allowed values
        const validRevisionTypes = ['file', 'witness', 'signature', 'form', 'link'];
        if (!validRevisionTypes.includes(revision.revision_type)) {
            return [false, `unknown revision type ${revision.revision_type}`];
        }

        // Check type-specific required fields
        // Check type-specific required fields
        switch (revision.revision_type) {
            case 'file':
                if (revision.file_hash === undefined || revision.file_hash === null) {
                    return [false, "file revision must contain file_hash"];
                }
                if (revision.file_nonce === undefined || revision.file_nonce === null) {
                    return [false, "file revision must contain file_nonce"];
                }
                break;
            case 'witness':
                if (revision.witness_merkle_root === undefined || revision.witness_merkle_root === null) {
                    return [false, "witness revision must contain witness_merkle_root"];
                }
                if (revision.witness_timestamp === undefined || revision.witness_timestamp === null) {
                    return [false, "witness revision must contain witness_timestamp"];
                }
                if (revision.witness_network === undefined || revision.witness_network === null) {
                    return [false, "witness revision must contain witness_network"];
                }
                if (revision.witness_smart_contract_address === undefined || revision.witness_smart_contract_address === null) {
                    return [false, "witness revision must contain witness_smart_contract_address"];
                }
                if (revision.witness_transaction_hash === undefined || revision.witness_transaction_hash === null) {
                    return [false, "witness revision must contain witness_transaction_hash"];
                }
                if (revision.witness_sender_account_address === undefined || revision.witness_sender_account_address === null) {
                    return [false, "witness revision must contain witness_sender_account_address"];
                }
                break;
            case 'signature':
                if (revision.signature === undefined || revision.signature === null) {
                    return [false, "signature revision must contain signature"];
                }
                if (revision.signature_public_key === undefined || revision.signature_public_key === null) {
                    return [false, "signature revision must contain signature_public_key"];
                }
                if (revision.signature_type === undefined || revision.signature_type === null) {
                    return [false, "signature revision must contain signature_type"];
                }
                break;
            case 'link':
                if (revision.link_type === undefined || revision.link_type === null) {
                    return [false, "link revision must contain link_type"];
                }
                if (revision.link_verification_hashes === undefined || revision.link_verification_hashes === null) {
                    return [false, "link revision must contain link_verification_hashes"];
                }
                if (!Array.isArray(revision.link_verification_hashes)) {
                    return [false, "link revision's link_verification_hashes must be an array"];
                }
                if (revision.link_verification_hashes.length === 0) {
                    return [false, "link revision's link_verification_hashes must not be empty"];
                }
                break;
        }
    }

    // Check if the file_index contains at least one entry
    if (Object.keys(tree.file_index).length === 0) {
        return [false, "file_index is empty"];
    }

    // If all checks pass, return true
    return [true, "valid aqua tree"];
}


/**
 * Reads a File object as text
 * @param file The File object to read
 * @returns Promise that resolves with the file contents as string
 */
export function readFileAsText(file: File): Promise<string> {
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
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
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

/**
 * Reads a File object as Data URL
 * @param file The File object to read
 * @returns Promise that resolves with the file contents as Data URL string
 */
export function readFileAsDataURL(file: File): Promise<string> {
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

        reader.readAsDataURL(file);
    });
}

export function getFileCategory(extension: string): string | null {
    // Remove the leading dot if present (e.g., ".png" becomes "png")
    // const ext = extension.startsWith('.') ? extension.slice(1).toLowerCase() : extension.toLowerCase();
    const extParts = extension.split('/')
    const ext = extParts[extParts.length - 1]

    // Map of file categories with extensions
    const fileCategories: Record<string, string> = {
        // Image
        jpg: "Image",
        jpeg: "Image",
        png: "Image",
        gif: "Image",
        svg: "Image",
        webp: "Image",
        bmp: "Image",
        ico: "Image",
        // Audio
        mp3: "Audio",
        wav: "Audio",
        ogg: "Audio",
        mp4: "Video",
        webm: "Video",
        // Documents
        pdf: "Document",
        doc: "Document",
        docx: "Document",
        xls: "Document",
        xlsx: "Document",
        ppt: "Document",
        pptx: "Document",
        txt: "Document",
        html: "Document",
        css: "Document",
        js: "Document",
        json: "Document",
        xml: "Document",
        zip: "Archive",
        rar: "Archive",
        "7z": "Archive",
    }

    // Loop through each category and look for the extension


    // Return null if not found
    return fileCategories[ext];
}


export function calculateContentSize(content: string | Buffer | Blob): number {
    if (typeof content === "string") {
        // For a string, return the number of bytes by encoding it into UTF-8
        return new TextEncoder().encode(content).length;
    }
    else if (Buffer.isBuffer(content)) {
        // For a Buffer, return its length directly (in bytes)
        return content.length;
    }
    else if (content instanceof Blob) {
        // For a Blob (File), return the size property (in bytes)
        return content.size;
    }

    throw new Error("Unsupported content type");
}

//sumFileContentSize
export function estimateFileSize(fileContent: string | AquaTree): number {

    let fileSize = 0;

    if (typeof fileContent === 'string') {
        if (isBase64(fileContent)) {
            fileSize = calculateBase64Size(fileContent);
        } else {
            fileSize = new TextEncoder().encode(fileContent).length; // UTF-8 size
        }
    } else if (typeof fileContent === 'object') {
        const jsonString = JSON.stringify(fileContent);
        fileSize = new TextEncoder().encode(jsonString).length;
    } else {
        throw new Error("Unsupported fileContent type");
    }

    return fileSize;
}

// Function to check if a string is Base64 encoded
function isBase64(str: string) {
    if (typeof str !== 'string') return false;
    return /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/.test(str);
}

// Function to calculate decoded file size from base64
function calculateBase64Size(base64String: string) {
    const padding = (base64String.endsWith("==") ? 2 : base64String.endsWith("=") ? 1 : 0);
    return (base64String.length * 3) / 4 - padding;
}



/**
 * Converts a Blob (typically from an HTTP response) to a base64 string
 * 
 * @param blob - The Blob object returned from fetch or XMLHttpRequest
 * @returns Promise that resolves with the base64 string (without the data URL prefix)
 */
export function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            if (typeof reader.result === 'string') {
                // Extract just the base64 part by removing the data URL prefix
                // (e.g., "data:application/octet-stream;base64,")
                const base64String = reader.result.split(',')[1];
                resolve(base64String);
            } else {
                reject(new Error('FileReader did not return a string'));
            }
        };

        reader.onerror = (error) => {
            reject(new Error(`FileReader error: ${error}`));
        };

        // Read the blob as a data URL which gives us a base64 representation
        reader.readAsDataURL(blob);
    });
}


// Function to convert file to base64
export async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
                const base64String = reader.result.split(',')[1]
                resolve(base64String)
            } else {
                reject(new Error('Failed to convert file to base64'))
            }
        }
        reader.onerror = error => reject(error)
    })
}

// More comprehensive function to check if a file is text-based
export const isTextFile = (file: File): boolean => {
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

export const checkIfFileExistInUserFiles = async (file: File, files: ApiFileInfo[]): Promise<boolean> => {

    let fileExists = false;
    // read the file and get the file hash 
    let fileContent = await readFileContent(file)
    let aquafier = new Aquafier()
    let fileHash = aquafier.getFileHash(fileContent)
    console.log(`type of ${typeof (fileContent)} file hash generated  ${fileHash} `)

    // loop through all the files the user has 
    for (let fileItem of files) {
        console.log(`looping ${JSON.stringify(fileItem.aquaTree)}`)
        let aquaTree: AquaTree = fileItem.aquaTree!!
        //loop through the revisions
        // check if revsion type is file then compare the file hash if found exit loop
        let revisionsData: Array<Revision> = Object.values(aquaTree.revisions)
        for (let revision of revisionsData) {
            console.log(`--> looping ${JSON.stringify(revision)}`)
            if (revision.revision_type == "file") {
                console.log(`$$$ FILE -->looping ${revision.file_hash}`)
                if (revision.file_hash === fileHash) {
                    fileExists = true
                    break
                }
            }
        }

    }

    return fileExists

}
export const readFileContent = async (file: File): Promise<string | Uint8Array> => {
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


export function timeToHumanFriendly(timestamp: string | undefined, showFull: boolean = false): string {
    if (!timestamp) {
        return '-';
    }

    // Extract the date components
    const year = timestamp.substring(0, 4);
    const month = Number(timestamp.substring(4, 6)) - 1; // Months are zero-indexed in JS
    const day = timestamp.substring(6, 8);
    const hours = timestamp.substring(8, 10);
    const minutes = timestamp.substring(10, 12);
    const seconds = timestamp.substring(12, 14);

    // Create a new Date object
    const date = new Date(Date.UTC(Number(year), month, Number(day), Number(hours), Number(minutes), Number(seconds)));

    // Format options
    const dateOptions: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    const fullOptions: Intl.DateTimeFormatOptions = {
        ...dateOptions,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'UTC',
    };

    // Return formatted string based on showFull
    return date.toLocaleDateString('en-US', showFull ? fullOptions : dateOptions);
}

export function dummyCredential(): CredentialsData {
    return {
        mnemonic: "",
        nostr_sk: "",
        did_key: "",
        alchemy_key: "",
        witness_eth_network: "sepolia",
        witness_method: "metamask"
    }
}

export function areArraysEqual(array1: Array<string>, array2: Array<string>) {
    //  console.log(`areArraysEqual array1 ${array1} == array2 ${array2} `)
    // Check if arrays have the same length
    if (array1.length !== array2.length) {
        return false;
    }

    // Create a copy of array2 to modify
    const array2Copy = [...array2];

    // Check each element in array1
    for (const item of array1) {
        const index = array2Copy.indexOf(item);

        // If element not found in array2Copy
        if (index === -1) {
            return false;
        }

        // Remove the found element from array2Copy
        array2Copy.splice(index, 1);
    }

    // If we've removed all elements from array2Copy, arrays are equal
    return array2Copy.length === 0;
}


export function fetchLinkedFileName(aquaTree: AquaTree, revision: Revision): string {
    if (revision.link_verification_hashes == undefined) {
        return "--error--."
    }
    let lonkedHash = revision.link_verification_hashes![0];
    if (lonkedHash == undefined) {
        return "--error--.."
    }
    let name = aquaTree.file_index[lonkedHash];
    if (name == undefined) {
        return "--error--..."
    }
    return name
}

export function displayTime(input: number | string): string {
    // Handle number input
    if (typeof input === 'number') {
        // Convert to string for consistent processing
        input = input.toString();
    }

    // Handle string input
    if (typeof input === 'string') {
        // Check if string contains only numbers
        if (/^\d+$/.test(input)) {
            // If it's a 14-digit number (YYYYMMDDhhmmss format)
            if (input.length === 14) {
                const year = input.substring(0, 4);
                const month = parseInt(input.substring(4, 6)) - 1; // JS months are 0-indexed
                const day = input.substring(6, 8);
                const hour = input.substring(8, 10);
                const minute = input.substring(10, 12);
                const second = input.substring(12, 14);

                const date = new Date(
                    parseInt(year),
                    month,
                    parseInt(day),
                    parseInt(hour),
                    parseInt(minute),
                    parseInt(second)
                );

                return date.toDateString(); // Returns format like "Thu Mar 20 2025"
            }
            // Regular Unix timestamp (seconds since epoch)
            else {
                const date = new Date(parseInt(input, 10) * 1000); // Convert seconds to milliseconds
                return date.toDateString();
            }
        } else {
            // String contains non-numeric characters, just display it
            return input;
        }
    }

    // Handle invalid input
    return "Invalid input";
}

export const getFileHashFromUrl = (url: string) => {
    // Using a regular expression to match the file ID
    const regex = /\/files\/([a-f0-9]+)/;
    const match = url.match(regex);

    // Return the captured group if found, otherwise empty string
    return match ? match[1] : '';
}


export const getFileName = (aquaTree: AquaTree) => {

    let hashes = Object.keys(aquaTree!.revisions);
    let fileIndexhash = "";
    for (let item of hashes) {
        let revision = aquaTree!.revisions[item];
        if (revision.previous_verification_hash == null || revision.previous_verification_hash == "") {
            fileIndexhash = item;
            break
        }
    }

    let name = aquaTree!.file_index[fileIndexhash];
    //  console.log(`getFileName ${name} from hash ${fileIndexhash}`)
    return name;

}

export function extractFileHash(url: string): string | undefined {
    try {
        const urlObj = new URL(url);
        const parts = urlObj.pathname.split('/');
        return parts.pop(); // Get the last part of the URL path
    } catch (error) {
        console.error('Invalid URL:', error);
        return undefined;
    }
}

/**
 * Estimates the size in bytes that a string would occupy if saved to a file
 * Uses UTF-8 encoding rules where ASCII chars take 1 byte and others take 2-4 bytes
 * @param str Input string to estimate size for
 * @returns Estimated size in bytes
 */
export function estimateStringFileSize(str: string): number {
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

export const getLastRevisionVerificationHash = (aquaTree: AquaTree) => {
    const revisonHashes = Object.keys(aquaTree.revisions)
    const hash = revisonHashes[revisonHashes.length - 1]
    return hash
}

export function filterFilesByType(files: ApiFileInfo[], fileType: string): ApiFileInfo[] { // "image" | "document" | "music" | "video"


    switch (fileType) {
        case "image":
            return files.filter(file => {
                return imageTypes.includes(getFileExtension(file.fileObject[0].fileName).replace(/\s+/g, ''))
            });
        case "document":
            return files.filter(file => documentTypes.includes(getFileExtension(file.fileObject[0].fileName).replace(/\s+/g, '')));
        case "music":
            return files.filter(file => musicTypes.includes(getFileExtension(file.fileObject[0].fileName).replace(/\s+/g, '')));
        case "video":
            return files.filter(file => videoTypes.includes(getFileExtension(file.fileObject[0].fileName).replace(/\s+/g, '')));
        default:
            return [];
    }
}

export function humanReadableFileSize(size: number): string {
    const units = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    let index = 0;

    // Convert size in bytes to the appropriate unit
    while (size >= 1024 && index < units.length - 1) {
        size /= 1024;
        index++;
    }

    // Return the size formatted with 2 decimal places, along with the appropriate unit
    return `${size.toFixed(2)} ${units[index]}`;
}


export function readJsonFile(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
        if (file.type !== "application/json") {
            reject(new Error("The file is not a JSON file."));
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            try {
                const json = JSON.parse(reader.result as string);
                resolve(json);
            } catch (error) {
                reject(new Error("Error parsing JSON content."));
            }
        };

        reader.onerror = () => {
            reject(new Error("Error reading the file."));
        };

        reader.readAsText(file);
    });
}

export const isJSONFile = (fileName: string) => {
    return fileName.trim().toLowerCase().endsWith('.json');
}

/**
 * Checks if the file content is a valid JSON with a simple key-string/value-string structure
 * @param fileContent The content of the file to check
 * @returns boolean indicating if the content is a valid JSON with key-string/value-string structure
 */
export const isJSONKeyValueStringContent = (fileContent: string): boolean => {
    try {
        // First check if it's valid JSON
        const parsedContent = JSON.parse(fileContent);

        // Check if it's an object (not an array or primitive)
        if (typeof parsedContent !== 'object' || parsedContent === null || Array.isArray(parsedContent)) {
            return false;
        }

        // Check if all keys map to string values
        return Object.entries(parsedContent).every(([_, value]) => typeof value === 'string');
    } catch (error) {
        // If JSON.parse throws an error, it's not valid JSON
        return false;
    }
};

export const isZipFile = (fileName: string) => {
    return fileName.trim().toLowerCase().endsWith('.zip');
}
// export function generateAvatar(_address: string) {
//     const address = ethers.getAddress(_address)
//     const generator = new AvatarGenerator()
//     return generator.generateRandomAvatar(address)
// }


// Utility function to determine file type and potentially rename
export const determineFileType = async (file: File): Promise<File> => {
    // If file already has an extension, return as is
    if (file.name.includes('.')) return file;

    try {
        // Attempt to read the file contents
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Advanced MIME type detection using file signatures
        let extension = '';
        let detectedMimeType = '';

        // PDF signature
        if (uint8Array[0] === 0x25 && uint8Array[1] === 0x50 && uint8Array[2] === 0x44 && uint8Array[3] === 0x46) {
            extension = '.pdf';
            detectedMimeType = 'application/pdf';
        }
        // PNG signature
        else if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4E && uint8Array[3] === 0x47) {
            extension = '.png';
            detectedMimeType = 'image/png';
        }
        // JPEG signature
        else if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8 && uint8Array[2] === 0xFF) {
            extension = '.jpg';
            detectedMimeType = 'image/jpeg';
        }
        // JSON signature (looks like a JSON object or array start)
        else if (uint8Array[0] === 0x7B || uint8Array[0] === 0x5B) {
            try {
                // Attempt to parse as JSON
                const jsonTest = new TextDecoder().decode(uint8Array);
                JSON.parse(jsonTest);
                extension = '.json';
                detectedMimeType = 'application/json';
            } catch {
                // Not a valid JSON
            }
        }
        // Excel XLSX signature
        else if (
            uint8Array[0] === 0x50 && uint8Array[1] === 0x4B &&
            uint8Array[2] === 0x03 && uint8Array[3] === 0x04
        ) {
            extension = '.xlsx';
            detectedMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        }
        // CSV/Text detection (try to parse as CSV or check for text-like content)
        else {
            try {
                const text = new TextDecoder().decode(uint8Array);
                // Check if content looks like CSV (contains commas or semicolons)
                if (/[,;]/.test(text)) {
                    extension = '.csv';
                    detectedMimeType = 'text/csv';
                } else {
                    extension = '.txt';
                    detectedMimeType = 'text/plain';
                }
            } catch {
                extension = '.bin';
                detectedMimeType = 'application/octet-stream';
            }
        }

        // If no extension was detected, fall back to original file type or generic
        if (!extension) {
            extension = file.type ? `.${file.type.split('/').pop()}` : '.bin';
            detectedMimeType = file.type || 'application/octet-stream';
        }

        // Create a new file with the determined extension
        const renamedFile = new File([uint8Array], `${file.name}${extension}`, {
            type: detectedMimeType,
            lastModified: file.lastModified
        });

        return renamedFile;
    } catch (error) {
        console.error('Error determining file type:', error);

        // Fallback: use file type or add a generic extension
        const fallbackExtension = file.type
            ? `.${file.type.split('/').pop()}`
            : (file.name.includes('.') ? '' : '.bin');

        const fallbackFile = new File(
            [await file.arrayBuffer()],
            `${file.name}${fallbackExtension}`,
            {
                type: file.type || 'application/octet-stream',
                lastModified: file.lastModified
            }
        );

        return fallbackFile;
    }
}


export function getFileExtension(fileName: string): string {
    // If the file name contains a dot, extract the extension

    const extMatch = fileName.match(/\.([0-9a-z]+)$/i);
    if (extMatch) {
        return extMatch[1];
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

    return "";
}

// function getExtensionFromMime(mimeType: string | number) {
//     const mimeToExt = {
//         'image/jpeg': 'jpg',
//         'image/png': 'png',
//         'image/gif': 'gif',
//         'application/pdf': 'pdf',
//         'text/plain': 'txt',
//         'application/zip': 'zip'
//     };
//     return mimeToExt[mimeType] || null;
// }

// function getExtensionFromBytes(hex: string) {
//     const magicNumbers = {
//         'ffd8ff': 'jpg',
//         '89504e47': 'png',
//         '47494638': 'gif',
//         '25504446': 'pdf',
//         '504b0304': 'zip'
//     };
//     for (const [magic, ext] of Object.entries(magicNumbers)) {
//         if (hex.startsWith(magic)) {
//             return ext;
//         }
//     }
//     return null;
// }


// const b64toBlob = (b64Data: string, contentType = "", sliceSize = 512) => {
//     const byteCharacters = atob(b64Data);
//     const byteArrays = [];

//     for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
//         const slice = byteCharacters.slice(offset, offset + sliceSize);

//         const byteNumbers = new Array(slice.length);
//         for (let i = 0; i < slice.length; i++) {
//             byteNumbers[i] = slice.charCodeAt(i);
//         }

//         const byteArray = new Uint8Array(byteNumbers);
//         byteArrays.push(byteArray);
//     }

//     const blob = new Blob(byteArrays, { type: contentType });
//     return blob;
// };

export function fileType(fileName: string): string {
    let extension = getFileExtension(fileName)
    if (imageTypes.includes(extension.replace(/\s+/g, ''))) {
        return "Image";
    } else if (documentTypes.includes(extension.replace(/\s+/g, ''))) {
        return "Document";
    } else if (musicTypes.includes(extension.replace(/\s+/g, ''))) {
        return "Music";
    } else if (videoTypes.includes(extension.replace(/\s+/g, ''))) {
        return "Video";
    } else {
        return "unknown";
    }
}

// function detectExtension(extensionId: string) {
//     return new Promise((resolve) => {
//       // Try to access the extension's global object
//       if (window[`chrome_${extensionId}`] || 
//           (window.chrome && window.chrome.runtime && window.chrome.runtime.id === extensionId)) {
//         resolve(true);
//       }

//       // Alternative method using runtime messaging
//       try {
//         chrome.runtime.sendMessage(extensionId, { type: 'ping' }, (response: any) => {
//           resolve(!!response);
//         });
//       } catch (error) {
//         resolve(false);
//       }
//     });
//   }

export function encodeFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
}


export function generateAvatar(seed: string, size = 200) {
    const svg = jdenticon.toSvg(seed, size);
    return `data:image/svg+xml;base64,${btoa(svg)}`;
}


export function ensureDomainUrlHasSSL(actualUrlToFetch: string): string {
    // check if the file hash exist 
    console.log(`==URL Data before ${actualUrlToFetch}`)
    if (actualUrlToFetch.includes("inblock.io")) {
        if (!actualUrlToFetch.includes("https")) {
            actualUrlToFetch = actualUrlToFetch.replace("http", "https")
        }
    }
    console.log(`==URL Data after ${actualUrlToFetch}`)
    return actualUrlToFetch
}