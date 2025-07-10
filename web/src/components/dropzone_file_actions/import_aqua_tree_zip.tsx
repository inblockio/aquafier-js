import { LuSave } from "react-icons/lu";
import axios from "axios";
import { useStore } from "zustand";
import appStore from "../../store";
import { useState } from "react";
import { toast } from "sonner";

import JSZip from "jszip";
import { IDropzoneAction } from "../../types/types";
import { Button } from "@/components/shadcn/ui/button";






export const ImportAquaTreeZip = ({ file, uploadedIndexes, fileIndex, updateUploadedIndex }: IDropzoneAction) => {

    const [uploading, setUploading] = useState(false)
    const [uploaded, setUploaded] = useState(false)

    const { metamaskAddress, setFiles, backend_url, session } = useStore(appStore)



    const uploadFileData = async () => {



        if (!file) {
            toast.info("No file selected!");
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
            toast.success("File uploaded successfully");
            updateUploadedIndex(fileIndex)
            return;
        } catch (error) {
            setUploading(false)
            toast.error(`Failed to upload file: ${error}`);
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
                    toast.info("Aqua Json not found.");
                    return;
                }

                await uploadFileData()


            } catch (error) {
                console.error("Error reading ZIP file:", error);
                toast.error("Failed to read ZIP file.");
            }
        };

        reader.readAsArrayBuffer(file);

    };

    return (
        <Button 
            data-testid="action-import-82-button" 
            size="sm" 
            variant="outline" 
            className="w-20 bg-green-50 hover:bg-green-100 text-green-700" 
            onClick={importFile} 
            disabled={uploadedIndexes.includes(fileIndex) || uploaded}
        >
            {uploading ? (
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-green-700 border-t-transparent"></span>
            ) : (
                <LuSave className="mr-2 h-4 w-4" />
            )}
            Import
        </Button>
    )
}

