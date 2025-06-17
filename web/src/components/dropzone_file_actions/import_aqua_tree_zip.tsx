import { LuScan } from "react-icons/lu";
import { Button } from "../chakra-ui/button";
import axios from "axios";
import { useStore } from "zustand";
import appStore from "../../store";
import { useState } from "react";
import { toaster } from "../chakra-ui/toaster";

import JSZip from "jszip";
import { IDropzoneAction } from "../../types/types";






export const ImportAquaTreeZip = ({ file, uploadedIndexes, fileIndex, updateUploadedIndex }: IDropzoneAction) => {

    const [uploading, setUploading] = useState(false)
    const [uploaded, setUploaded] = useState(false)

    const { metamaskAddress, setFiles, backend_url, session } = useStore(appStore)



    const uploadFileData = async () => {



        if (!file) {
            toaster.create({
                description: "No file selected!",
                type: "info"
            })
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('account', `${metamaskAddress}`);

        setUploading(true)
        try {
            const url = `${backend_url}/explorer_aqua_zip`
            //  console.log("url ", url)
            const response = await axios.post(url, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    "nonce": session?.nonce
                },
            });

            // return all user files
            const res = response.data


            setFiles([...res.data])
            setUploaded(true)
            setUploading(false)
            toaster.create({
                description: "File uploaded successfuly",
                type: "success"
            })
            updateUploadedIndex(fileIndex)
            return;
        } catch (error) {
            setUploading(false)
            toaster.create({
                description: `Failed to upload file: ${error}`,
                type: "error"
            })
        }
    }

    const importFile = async () => {


        const reader = new FileReader();

        reader.onload = async function (_e) {

            try {

                let hasAquaJson = false
                const zip = new JSZip();
                const zipData = await zip.loadAsync(file);
                for (const fileName in zipData.files) {
                    if (fileName == 'aqua.json') {
                        hasAquaJson = true
                        break;
                    }
                }
                if (!hasAquaJson) {
                    toaster.create({
                        description: "Aqua Json not found.",
                        type: "info"
                    })
                    return
                }

                await uploadFileData()


            } catch (error) {
                console.error("Error reading ZIP file:", error);
                alert("Failed to read ZIP file.");
            }
        };

        reader.readAsArrayBuffer(file);

    };

    return (
        <Button size={'xs'} colorPalette={'blackAlpha'} variant={'subtle'} w={'80px'} onClick={importFile} disabled={uploadedIndexes.includes(fileIndex) || uploaded} loading={uploading}>
            <LuScan />
            Import
        </Button>
    )
}

