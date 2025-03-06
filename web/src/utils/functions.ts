import { ethers } from "ethers";
import { ApiFileInfo } from "../models/FileInfo";
import { documentTypes, imageTypes, musicTypes, videoTypes } from "./constants";
import { AvatarGenerator } from 'random-avatar-generator';
import { AquaTree, FileObject } from "aqua-js-sdk";
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

export async function getCurrentNetwork() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            console.log("Current chain ID:", chainId);
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
            console.log("Network switched successfully");
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

        const res = response;
        const logs: Array<string> = res.logs
        logs.forEach((item) => {
            console.log("**>" + item + "\n.")
        })

        // console.log("fetchFiles Response " + response.body)

        // Parse the response body as JSON
        const data = res.files;

        // Assuming the API returns an array of FileInfo objects
        const files: Array<ApiFileInfo> = data.map((item: any) => ({
            id: item.id,
            name: item.name,
            extension: item.extension,
            page_data: item.page_data,
            mode: item.mode,
            owner: item.owner,
        }));

        return files;
    } catch (error) {
        console.error("Error fetching files:", error);
        return [];
    }
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
export function estimateFileSize(fileObject: FileObject): number {

    const { fileContent } = fileObject;
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



export const getLastRevisionVerificationHash = (aquaTree: AquaTree) => {
    const revisonHashes = Object.keys(aquaTree.revisions)
    const hash = revisonHashes[revisonHashes.length - 1]
    return hash
}

export function filterFilesByType(files: ApiFileInfo[], fileType: string): ApiFileInfo[] { // "image" | "document" | "music" | "video"


    switch (fileType) {
        case "image":
            return files.filter(file => {
                return imageTypes.includes(getFileExtension(file.fileObject.fileName).replace(/\s+/g, ''))
            });
        case "document":
            return files.filter(file => documentTypes.includes(getFileExtension(file.fileObject.fileName).replace(/\s+/g, '')));
        case "music":
            return files.filter(file => musicTypes.includes(getFileExtension(file.fileObject.fileName).replace(/\s+/g, '')));
        case "video":
            return files.filter(file => videoTypes.includes(getFileExtension(file.fileObject.fileName).replace(/\s+/g, '')));
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

function getExtensionFromMime(mimeType: string | number) {
    const mimeToExt = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'application/pdf': 'pdf',
        'text/plain': 'txt',
        'application/zip': 'zip'
    };
    return mimeToExt[mimeType] || null;
}

function getExtensionFromBytes(hex: string) {
    const magicNumbers = {
        'ffd8ff': 'jpg',
        '89504e47': 'png',
        '47494638': 'gif',
        '25504446': 'pdf',
        '504b0304': 'zip'
    };
    for (const [magic, ext] of Object.entries(magicNumbers)) {
        if (hex.startsWith(magic)) {
            return ext;
        }
    }
    return null;
}


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

export function fileType(file: ApiFileInfo): string {
    if (imageTypes.includes(file.extension.replace(/\s+/g, ''))) {
        return "Image";
    } else if (documentTypes.includes(file.extension.replace(/\s+/g, ''))) {
        return "Document";
    } else if (musicTypes.includes(file.extension.replace(/\s+/g, ''))) {
        return "Music";
    } else if (videoTypes.includes(file.extension.replace(/\s+/g, ''))) {
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
