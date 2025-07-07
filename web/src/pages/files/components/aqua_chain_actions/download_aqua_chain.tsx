
import { LuDownload } from "react-icons/lu"
import { ensureDomainUrlHasSSL, extractFileHash, isAquaTree } from "../../../../utils/functions"
import { useStore } from "zustand"
import appStore from "../../../../store"
import { ApiFileInfo } from "../../../../models/FileInfo"

import { useState } from "react"
import Aquafier, { AquaTree, Revision } from "aqua-js-sdk"
import JSZip from "jszip";
import { AquaJsonInZip, AquaNameWithHash } from "../../../../models/Aqua"
import { toaster } from "@/components/shadcn/ui/use-toast"




export const DownloadAquaChain = ({ file }: { file: ApiFileInfo }) => {
    const { session } = useStore(appStore)
    const [downloading, setDownloading] = useState(false)


    const downloadLinkAquaJson = async () => {
        const zip = new JSZip();
        let aquafier = new Aquafier();
        let mainAquaFileName = "";
        let mainAquaHash = "";
        // fetch the genesis 
        let revisionHashes = Object.keys(file.aquaTree!.revisions!)
        for (let revisionHash of revisionHashes) {
            let revisionData = file.aquaTree!.revisions![revisionHash];
            if (revisionData.previous_verification_hash == null || revisionData.previous_verification_hash == "") {
                mainAquaHash = revisionHash;
                break;
            }
        }
        mainAquaFileName = file.aquaTree!.file_index[mainAquaHash];

        zip.file(`${mainAquaFileName}.aqua.json`, JSON.stringify(file.aquaTree));

        let nameWithHashes: Array<AquaNameWithHash> = []
        for (let fileObj of file.fileObject) {
            if (typeof fileObj.fileContent === 'string' && fileObj.fileContent.startsWith('http')) {
                try {
                    let actualUrlToFetch = ensureDomainUrlHasSSL(fileObj.fileContent)

                    // Fetch the file from the URL
                    const response = await fetch(actualUrlToFetch, {
                        method: 'GET',
                        headers: {
                            'Nonce': session?.nonce ?? "--error--" // Add the nonce directly as a custom header if needed
                        }
                    });
                    const blob = await response.blob();

                    let hashData = extractFileHash(fileObj.fileContent)
                    if (hashData == undefined) {
                        hashData = aquafier.getFileHash(blob.toString())
                    }

                    nameWithHashes.push({
                        name: fileObj.fileName,
                        hash: hashData
                    })

                    zip.file(fileObj.fileName, blob, { binary: true })
                } catch (error) {
                    console.error(`Error downloading ${fileObj.fileName}:`, error);
                    toaster.create({
                        description: `Error downloading ${fileObj.fileName}: ${error}`,
                        type: "error"
                    });
                }
            } else {
                // Check if the file is an AquaTree (likely a JSON file) or a regular text file
                if (isAquaTree(fileObj.fileContent)) {
                    // It's an AquaTree, so stringify it as JSON
                    zip.file(fileObj.fileName, JSON.stringify(fileObj.fileContent as AquaTree));
                } else if (typeof fileObj.fileContent === 'string') {
                    // It's a plain text file, so add it directly without JSON.stringify
                    zip.file(fileObj.fileName, fileObj.fileContent);
                } else {
                    // For other types, use JSON.stringify (objects, etc.)
                    zip.file(fileObj.fileName, JSON.stringify(fileObj.fileContent));
                }
            }
        }

        //create aqua.json
        let aquaObject: AquaJsonInZip = {
            'genesis': mainAquaFileName,
            'name_with_hash': nameWithHashes
        };
        zip.file('aqua.json', JSON.stringify(aquaObject))

        let nameWithoutExtension = mainAquaFileName.replace(/\.[^/.]+$/, "");
        // Generate the zip file
        zip.generateAsync({ type: "blob" }).then((blob) => {
            // Create a download link
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);

            link.download = `${nameWithoutExtension}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    const downloadSimpleAquaJson = async () => {

        // Convert the PageData object to a formatted JSON string
        const jsonString = JSON.stringify(file.aquaTree, null, 2);

        // Create a Blob from the JSON string
        const blob = new Blob([jsonString], { type: 'application/json' });

        // Create a URL for the Blob
        const url = URL.createObjectURL(blob);

        // Create a temporary anchor element and trigger the download
        const a = document.createElement('a');
        a.href = url;
        a.download = `${file.fileObject[0].fileName}.aqua.json`;
        document.body.appendChild(a);
        a.click();

        // Clean up
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toaster.create({
            description: `Aqua Chain Downloaded successfully`,
            type: "success"
        })



        // Loop through each file object and download the content
        for (const fileObj of file.fileObject) {
            // Check if fileContent is a string (URL)
            if (typeof fileObj.fileContent === 'string' && fileObj.fileContent.startsWith('http')) {
                try {
                    let actualUrlToFetch = ensureDomainUrlHasSSL(fileObj.fileContent)



                    // Fetch the file from the URL
                    const response = await fetch(actualUrlToFetch, {
                        method: 'GET',
                        headers: {
                            'Nonce': session?.nonce ?? "--error--" // Add the nonce directly as a custom header if needed
                        }
                    });
                    const blob = await response.blob();

                    // Create URL from blob
                    const url = URL.createObjectURL(blob);

                    // Create temporary anchor and trigger download
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileObj.fileName;
                    document.body.appendChild(a);
                    a.click();

                    // Clean up
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                } catch (error) {
                    console.error(`Error downloading ${fileObj.fileName}:`, error);
                    toaster.create({
                        description: `Error downloading ${fileObj.fileName}: ${error}`,
                        type: "error"
                    });
                }
            }
        }

    }
    const downloadAquaJson = async () => {
        try {


            setDownloading(true)
            let containsLink = false;
            //check if it contains a link revision
            let allHashes = Object.keys(file.aquaTree!.revisions!)
            for (let hashItem of allHashes) {
                let revision: Revision = file.aquaTree!.revisions![hashItem];
                if (revision.revision_type == "link") {
                    containsLink = true;
                    break
                }
            }

            if (containsLink) {
                await downloadLinkAquaJson()
            } else {
                await downloadSimpleAquaJson()
            }


            toaster.create({
                description: `Files downloaded successfully`,
                type: "success"
            });
            setDownloading(false)
        } catch (error) {
            toaster.create({
                description: `Error downloading JSON: ${error}`,
                type: "error"
            })

            setDownloading(false)
        }

    }

    return (
        <>
            {/* Sign Button */}
            <button
                data-testid="download-aqua-tree-button"
                onClick={() => {
                    if (!downloading) {
                        downloadAquaJson();
                    } else {
                        toaster.create({
                            description: "Signing is already in progress",
                            type: "info"
                        })
                    }
                }}
                className={`flex items-center space-x-1 bg-[#F3E8FE] text-purple-700 px-3 py-2 rounded transition-colors text-xs ${downloading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[#E8D5FE]'}`}
                disabled={downloading}
            >
                {downloading ? (
                    <>
                        <svg className="animate-spin h-3 w-3 mr-1 text-purple-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                        </svg>
                        <span>Download...</span>
                    </>
                ) : (
                    <>
                        <LuDownload className="w-3 h-3" />
                        <span>Download</span>
                    </>
                )}
            </button>
        </>
    )
}

