import { Image } from "@chakra-ui/react";
import { fileType } from "../utils/functions";
import { FileObject } from "aqua-js-sdk";
import { useEffect, useState } from "react";
import { useStore } from "zustand";
import appStore from "../store";


interface IFilePreview {
    fileInfo: FileObject
}

const FilePreviewOld = ({ fileInfo }: IFilePreview) => {

    if (fileInfo == undefined) {
        return (<div>

        </div>)
    }

    const fileTypeInfo = fileType(fileInfo.fileName);

    // const pageData: PageData = JSON.parse(fileInfo.page_data)

    // if (pageData && pageData?.pages != null && pageData?.pages.length!! > 0) {
    // const firstPage = pageData!.pages[0]; // Get the first page
    // const firstRevisionKey = Object.keys(firstPage.revisions)[0]; // Get the first revision key
    // const firstRevision = firstPage.revisions[firstRevisionKey]; // Get the first revision
    // const fileContent = firstRevision.content.file; // Get file content
    const fileContent = fileInfo.fileContent



    if (fileContent && fileTypeInfo === "Image") {
        const base64String = `data:image/png;base64,${fileContent}`;
        return <Image src={base64String} borderRadius={'xl'} fit={'contain'} />
    }
    else if (fileContent && fileTypeInfo === "Video") {
        const base64String = `data:video/mp4;base64,${fileContent}`;
        return (
            <video
                controls
                width="100%"
                style={{ borderRadius: '12px' }}
            >
                <source src={base64String} type="video/mp4" />
                Your browser does not support the video tag.
            </video>
        );
    }
    else if (fileContent && fileTypeInfo === "Music") {
        const base64String = `data:audio/mp3;base64,${fileContent}`;
        return (
            <audio
                controls
                style={{ borderRadius: '12px', width: '100%' }}
            >
                <source src={base64String} type="audio/mp3" />
                Your browser does not support the audio tag.
            </audio>
        );
    } else if (fileContent && fileTypeInfo === "Document") {


        if (fileTypeInfo.replace(/\s+/g, '') == "application/pdf") {

            const base64String = `data:application/pdf;base64,${fileContent}`;
            return (
                <object
                    data={base64String}
                    type="application/pdf"
                    width="100%"
                    height="800px"
                    className="rounded-xl"
                    style={{
                        borderRadius: '12px',
                        width: '100%',
                        border: 'none',
                        height: '800px'
                    }}
                >
                    <param name="view" value="FitH" />
                    <param name="pagemode" value="none" />
                </object>
            );
        } else if (["text/plain", "text/csv", "text/json"].includes(fileTypeInfo.replace(/\s+/g, ''))) {
            // Decode base64 to string
            const decodedContent = atob(fileContent);

            console.log("decodedContent ==>", decodedContent)

            // Determine syntax highlighting and formatting based on file type
            let formattedContent = decodedContent;
            if (fileTypeInfo.replace(/\s+/g, '') === "text/json") {
                try {
                    // Pretty print JSON with indentation
                    formattedContent = JSON.stringify(JSON.parse(decodedContent), null, 2);
                } catch (error) {
                    console.error("Error parsing json for preview ", error)
                    // If JSON parsing fails, show original content
                    formattedContent = decodedContent;
                }
            }

            console.log("formattedContent ==> ", formattedContent)

            return (
                <div
                    style={{
                        backgroundColor: '#f4f4f4',
                        color: "black",
                        borderRadius: '12px',
                        padding: '15px',
                        maxHeight: '600px',
                        overflowY: 'auto',
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                    }}
                >
                    {formattedContent}
                </div>
            );
        } else {
            console.log("document not captured ", fileTypeInfo)
        }
        // }
    }
    return <div >
        <Image id="base64Image" alt="Base64 Image" src="/images/preview.jpg" />
    </div>
}

// File type signature definitions
interface FileSignature {
    signature: number[];
    offset?: number;
    type: string;
    extension: string;
}

const fileSignatures: FileSignature[] = [
    // Images
    { signature: [0x89, 0x50, 0x4E, 0x47], type: 'image/png', extension: 'png' },
    { signature: [0xFF, 0xD8, 0xFF], type: 'image/jpeg', extension: 'jpg' },
    { signature: [0x47, 0x49, 0x46, 0x38], type: 'image/gif', extension: 'gif' },
    { signature: [0x42, 0x4D], type: 'image/bmp', extension: 'bmp' },
    { signature: [0x52, 0x49, 0x46, 0x46], type: 'image/webp', extension: 'webp' }, // RIFF....WEBP

    // PDFs
    { signature: [0x25, 0x50, 0x44, 0x46], type: 'application/pdf', extension: 'pdf' }, // %PDF

    // Text files - UTF-8 BOM
    { signature: [0xEF, 0xBB, 0xBF], type: 'text/plain', extension: 'txt' },

    // Audio
    { signature: [0x49, 0x44, 0x33], type: 'audio/mp3', extension: 'mp3' }, // ID3 tag for MP3
    { signature: [0xFF, 0xFB], type: 'audio/mp3', extension: 'mp3' }, // MP3 without ID3
    { signature: [0x4F, 0x67, 0x67, 0x53], type: 'audio/ogg', extension: 'ogg' }, // OggS
    { signature: [0x52, 0x49, 0x46, 0x46], type: 'audio/wav', extension: 'wav' }, // RIFF....WAVE

    // Video
    { signature: [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], offset: 4, type: 'video/mp4', extension: 'mp4' }, // ftyp
    { signature: [0x1A, 0x45, 0xDF, 0xA3], type: 'video/webm', extension: 'webm' }, // EBML
    { signature: [0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70], offset: 4, type: 'video/quicktime', extension: 'mov' }, // ftyp

    // Documents
    { signature: [0x50, 0x4B, 0x03, 0x04], type: 'application/zip', extension: 'zip' }, // PK..
    { signature: [0x50, 0x4B, 0x03, 0x04], type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extension: 'docx' }, // DOCX (also PK..)
    { signature: [0xD0, 0xCF, 0x11, 0xE0], type: 'application/msword', extension: 'doc' }, // DOC
    { signature: [0x7B, 0x5C, 0x72, 0x74], type: 'application/rtf', extension: 'rtf' }, // {\rt
];

const detectFileType = (uint8Array: Uint8Array): string => {
    // Check for ASCII text files (simple heuristic)
    let isAsciiText = true;
    const sampleSize = Math.min(uint8Array.length, 500); // Check first 500 bytes
    for (let i = 0; i < sampleSize; i++) {
        // Outside printable ASCII range and not a common control character
        if ((uint8Array[i] < 32 || uint8Array[i] > 126) &&
            ![9, 10, 13].includes(uint8Array[i])) {
            isAsciiText = false;
            break;
        }
    }

    if (isAsciiText) {
        return 'text/plain';
    }

    // Check for binary signatures
    for (const fileType of fileSignatures) {
        const offset = fileType.offset || 0;
        if (uint8Array.length < offset + fileType.signature.length) {
            continue;
        }

        let match = true;
        for (let i = 0; i < fileType.signature.length; i++) {
            if (uint8Array[offset + i] !== fileType.signature[i]) {
                match = false;
                break;
            }
        }

        if (match) {
            return fileType.type;
        }
    }

    // Default to octet-stream if no match
    return 'application/octet-stream';
};

const FilePreview: React.FC<IFilePreview> = ({ fileInfo }) => {
    const [fileType, setFileType] = useState<string>("");
    const [fileURL, setFileURL] = useState<string>("");
    const [textContent, setTextContent] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const { session } = useStore(appStore);

    useEffect(() => {
        const fetchFile = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(fileInfo.fileContent as string, {
                    headers: {
                        nonce: `${session?.nonce}`
                    }
                });
                if (!response.ok) throw new Error("Failed to fetch file");

                // Get MIME type from headers
                let contentType = response.headers.get("Content-Type") || "";

                // Clone the response so we can use it twice
                const responseClone = response.clone();

                // Convert to Blob
                const blob = await response.blob();

                // If it's octet-stream or unknown, try to detect from content
                if (contentType === "application/octet-stream" || contentType === "") {
                    const arrayBuffer = await blob.arrayBuffer();
                    const uint8Array = new Uint8Array(arrayBuffer);
                    contentType = detectFileType(uint8Array);

                    // If detected as text, read the text content
                    if (contentType === "text/plain") {
                        try {
                            const text = await responseClone.text();
                            setTextContent(text);
                        } catch (error) {
                            console.error("Error reading text content:", error);
                        }
                    }
                } else if (contentType === "text/plain") {
                    // If already identified as text, read the text content
                    try {
                        const text = await responseClone.text();
                        setTextContent(text);
                    } catch (error) {
                        console.error("Error reading text content:", error);
                    }
                }

                setFileType(contentType);

                // Create URL
                const objectURL = URL.createObjectURL(blob);
                setFileURL(objectURL);
            } catch (error) {
                console.error("Error fetching file:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchFile();

        return () => {
            if (fileURL) URL.revokeObjectURL(fileURL);
        };
    }, [fileInfo.fileContent, session?.nonce]);

    if (isLoading) return <p>Loading...</p>;

    // Render based on file type
    if (fileType.startsWith("image/")) {
        return <img src={fileURL} alt="Fetched file" className="max-w-full h-auto" />;
    }

    if (fileType === "application/pdf") {
        return (
            <iframe
                src={fileURL}
                width="100%"
                height="600px"
                title="PDF Viewer"
            ></iframe>
        );
    }

    if (fileType === "text/plain") {
        return (
            <div style={{
                whiteSpace: "pre-wrap",  // Preserves spaces and line breaks
                wordBreak: "break-word"   // Prevents overflow on long words
            }}>
                {textContent}
            </div>
        );
    }

    if (fileType.startsWith("audio/")) {
        return (
            <audio controls className="w-full">
                <source src={fileURL} type={fileType} />
                Your browser does not support the audio element.
            </audio>
        );
    }

    if (fileType.startsWith("video/")) {
        return (
            <video controls className="max-w-full h-auto">
                <source src={fileURL} type={fileType} />
                Your browser does not support the video element.
            </video>
        );
    }

    // Default download option for other file types
    return (
        <a href={fileURL} download className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Download File
        </a>
    );
};

export default FilePreview;