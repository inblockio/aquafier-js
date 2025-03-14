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

const FilePreview: React.FC<IFilePreview> = ({ fileInfo }) => {
    const [fileType, setFileType] = useState<string>("");
    const [fileBlob, setFileBlob] = useState<Blob | null>(null);
    const [fileURL, setFileURL] = useState<string>("");
    const { session } = useStore(appStore);
    console.log(fileBlob)
    useEffect(() => {
        const fetchFile = async () => {
            try {
                const response = await fetch(fileInfo.fileContent as string, {
                    method: "GET",
                    headers: {
                        nonce: `${session?.nonce}`
                    }
                });
                console.log(response)
                const blob = await response.blob();
                setFileBlob(blob);
                setFileType(blob.type);
                setFileURL(URL.createObjectURL(blob));
            } catch (error) {
                console.error("Error fetching file:", error);
            }
        };
        fetchFile();
    }, [fileInfo.fileContent]);

    if (!fileBlob) return <p>Loading...</p>;

    if (fileType.startsWith("image")) {
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

    return (
        <a href={fileURL} download>
            Download File
        </a>
    );
};


export default FilePreview