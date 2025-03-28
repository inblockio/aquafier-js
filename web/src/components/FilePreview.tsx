// import { Image } from "@chakra-ui/react";
// import { fileType } from "../utils/functions";
import { FileObject } from "aqua-js-sdk";
import { useEffect, useState } from "react";
import { useStore } from "zustand";
import appStore from "../store";


interface IFilePreview {
    fileInfo: FileObject
}

// const FilePreviewOld = ({ fileInfo }: IFilePreview) => {

//     if (fileInfo == undefined) {
//         return (<div>

//         </div>)
//     }

//     const fileTypeInfo = fileType(fileInfo.fileName);

//     // const pageData: PageData = JSON.parse(fileInfo.page_data)

//     // if (pageData && pageData?.pages != null && pageData?.pages.length!! > 0) {
//     // const firstPage = pageData!.pages[0]; // Get the first page
//     // const firstRevisionKey = Object.keys(firstPage.revisions)[0]; // Get the first revision key
//     // const firstRevision = firstPage.revisions[firstRevisionKey]; // Get the first revision
//     // const fileContent = firstRevision.content.file; // Get file content
//     const fileContent = fileInfo.fileContent



//     if (fileContent && fileTypeInfo === "Image") {
//         const base64String = `data:image/png;base64,${fileContent}`;
//         return <Image src={base64String} borderRadius={'xl'} fit={'contain'} />
//     }
//     else if (fileContent && fileTypeInfo === "Video") {
//         const base64String = `data:video/mp4;base64,${fileContent}`;
//         return (
//             <video
//                 controls
//                 width="100%"
//                 style={{ borderRadius: '12px' }}
//             >
//                 <source src={base64String} type="video/mp4" />
//                 Your browser does not support the video tag.
//             </video>
//         );
//     }
//     else if (fileContent && fileTypeInfo === "Music") {
//         const base64String = `data:audio/mp3;base64,${fileContent}`;
//         return (
//             <audio
//                 controls
//                 style={{ borderRadius: '12px', width: '100%' }}
//             >
//                 <source src={base64String} type="audio/mp3" />
//                 Your browser does not support the audio tag.
//             </audio>
//         );
//     } else if (fileContent && fileTypeInfo === "Document") {


//         if (fileTypeInfo.replace(/\s+/g, '') == "application/pdf") {

//             const base64String = `data:application/pdf;base64,${fileContent}`;
//             return (
//                 <object
//                     data={base64String}
//                     type="application/pdf"
//                     width="100%"
//                     height="800px"
//                     className="rounded-xl"
//                     style={{
//                         borderRadius: '12px',
//                         width: '100%',
//                         border: 'none',
//                         height: '800px'
//                     }}
//                 >
//                     <param name="view" value="FitH" />
//                     <param name="pagemode" value="none" />
//                 </object>
//             );
//         } else if (["text/plain", "text/csv", "text/json"].includes(fileTypeInfo.replace(/\s+/g, ''))) {
//             // Decode base64 to string
//             const decodedContent = atob(fileContent);

//            //  console.log("decodedContent ==>", decodedContent)

//             // Determine syntax highlighting and formatting based on file type
//             let formattedContent = decodedContent;
//             if (fileTypeInfo.replace(/\s+/g, '') === "text/json") {
//                 try {
//                     // Pretty print JSON with indentation
//                     formattedContent = JSON.stringify(JSON.parse(decodedContent), null, 2);
//                 } catch (error) {
//                     console.error("Error parsing json for preview ", error)
//                     // If JSON parsing fails, show original content
//                     formattedContent = decodedContent;
//                 }
//             }

//            //  console.log("formattedContent ==> ", formattedContent)

//             return (
//                 <div
//                     style={{
//                         backgroundColor: '#f4f4f4',
//                         color: "black",
//                         borderRadius: '12px',
//                         padding: '15px',
//                         maxHeight: '600px',
//                         overflowY: 'auto',
//                         fontFamily: 'monospace',
//                         whiteSpace: 'pre-wrap',
//                         wordBreak: 'break-word'
//                     }}
//                 >
//                     {formattedContent}
//                 </div>
//             );
//         } else {
//            //  console.log("document not captured ", fileTypeInfo)
//         }
//         // }
//     }
//     return <div >
//         <Image id="base64Image" alt="Base64 Image" src="/images/preview.jpg" />
//     </div>
// }

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
                const fileContentUrl: string = fileInfo.fileContent as string
                console.log("File content url: ", fileContentUrl)

                let actualUrlToFetch = fileContentUrl

                console.log(`== Data before ${actualUrlToFetch}`)
                if(actualUrlToFetch.includes("inblock.io")){
                    
                    actualUrlToFetch = actualUrlToFetch.replace("http", "https")
                }
                console.log(`== Data after ${actualUrlToFetch}`)

                const response = await fetch(actualUrlToFetch, {
                    headers: {
                        nonce: `${session?.nonce}`
                    }
                });
                if (!response.ok) throw new Error("Failed to fetch file");

                // Get MIME type from headers
                let contentType = response.headers.get("Content-Type") || "";
                console.log("Original Content-Type from headers:", contentType);

                // Clone the response for potential text extraction
                const responseClone = response.clone();
                
                // Get the raw data as ArrayBuffer first
                const arrayBuffer = await response.arrayBuffer();
                console.log("ArrayBuffer size:", arrayBuffer.byteLength);
                
                // If content type is missing or generic, try to detect it
                if (contentType === "application/octet-stream" || contentType === "") {
                    const uint8Array = new Uint8Array(arrayBuffer);
                    contentType = detectFileType(uint8Array);
                    console.log("Detected file type:", contentType);
                }
                
                // For PDF files, ensure proper content type
                if (contentType === "application/pdf" || 
                    (fileInfo.fileName && fileInfo.fileName.toLowerCase().endsWith(".pdf"))) {
                    contentType = "application/pdf";
                }
                
                // Handle audio files
                if (contentType.startsWith("audio/") || 
                    (fileInfo.fileName && (/\.(mp3|wav|ogg|aac|flac|m4a)$/i).test(fileInfo.fileName))) {
                    if (!contentType.startsWith("audio/")) {
                        // Set a default audio MIME type if needed
                        contentType = "audio/mpeg";
                    }
                }
                
                // Handle video files
                if (contentType.startsWith("video/") || 
                    (fileInfo.fileName && (/\.(mp4|webm|ogg|mov|avi|wmv|flv|mkv)$/i).test(fileInfo.fileName))) {
                    if (!contentType.startsWith("video/")) {
                        // Set a default video MIME type if needed
                        contentType = "video/mp4";
                    }
                }
                
                // Handle text-based content types
                if (contentType.startsWith("text/") || 
                    contentType === "application/json" ||
                    contentType === "application/xml" ||
                    contentType === "application/javascript") {
                    try {
                        const text = await responseClone.text();
                        setTextContent(text);
                    } catch (error) {
                        console.error("Error reading text content:", error);
                        // Try decoding the array buffer as UTF-8 text as fallback
                        try {
                            const decoder = new TextDecoder("utf-8");
                            const text = decoder.decode(arrayBuffer);
                            setTextContent(text);
                        } catch (decodeError) {
                            console.error("Error decoding text content:", decodeError);
                        }
                    }
                }
                
                // Create a proper blob with the correct content type
                const blob = new Blob([arrayBuffer], { type: contentType });
                console.log("Created blob with type:", contentType, "size:", blob.size);
                
                setFileType(contentType);
                console.log("Final content type set to:", contentType);
                
                // Create URL from the properly typed blob
                const objectURL = URL.createObjectURL(blob);
                console.log("Object URL created:", objectURL);
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

    console.log("Rendering file with type:", fileType);
    
    // Render based on file type
    if (fileType.startsWith("image/")) {
        return <img src={fileURL} alt="Fetched file" style={{ maxWidth: "100%", height: "auto" }} />;
    }

    if (fileType === "application/pdf") {
        return (
            <object
                data={fileURL}
                type="application/pdf"
                width="100%"
                height="600px"
                style={{ border: "none" }}
            >
                <p>Unable to display PDF file. <a href={fileURL} target="_blank" rel="noopener noreferrer">Download</a> instead.</p>
            </object>
        );
    }

    if (fileType.startsWith("text/") || 
        fileType === "application/json" || 
        fileType === "application/xml" || 
        fileType === "application/javascript") {
        return (
            <div style={{
                whiteSpace: "pre-wrap",  // Preserves spaces and line breaks
                wordBreak: "break-word",  // Prevents overflow on long words
                fontFamily: "monospace",
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                maxHeight: "600px",
                overflow: "auto"
            }}>
                {textContent}
            </div>
        );
    }

    if (fileType.startsWith("audio/")) {
        return (
            <div>
                <audio controls style={{ width: "100%" }}>
                    <source src={fileURL} type={fileType} />
                    Your browser does not support the audio element.
                </audio>
                <div style={{ marginTop: "10px" }}>
                    <a href={fileURL} download={fileInfo.fileName || "audio"} style={{ color: "blue", textDecoration: "underline" }}>
                        Download audio file
                    </a>
                </div>
            </div>
        );
    }

    if (fileType.startsWith("video/")) {
        return (
            <div>
                <video controls style={{ maxWidth: "100%", height: "auto", backgroundColor: "#000" }}>
                    <source src={fileURL} type={fileType} />
                    Your browser does not support the video element.
                </video>
                <div style={{ marginTop: "10px" }}>
                    <a href={fileURL} download={fileInfo.fileName || "video"} style={{ color: "blue", textDecoration: "underline" }}>
                        Download video file
                    </a>
                </div>
            </div>
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