import { LuImport } from "react-icons/lu";
import axios from "axios";
import { useStore } from "zustand";
import appStore from "../../store";
import { useState } from "react";
import { ApiFileInfo } from "../../models/FileInfo";
import { IDropzoneAction } from "../../types/types";
import { toast } from "sonner";
import { Button } from "@/components/shadcn/ui/button";




export const ImportAquaChainFromFile = ({ file, uploadedIndexes, fileIndex, updateUploadedIndex }: IDropzoneAction) => {

    const [uploading, setUploading] = useState(false)
    const [uploaded, setUploaded] = useState(false)

    const { metamaskAddress, setFiles, files, backend_url } = useStore(appStore)

    const importAquaChain = async () => {

        if (!file) {
            toast.error("No file selected!");
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('account', "example");
        setUploading(true)
        try {
            const url = `${backend_url}/explorer_aqua_file_upload`;
            //  console.log("importAquaChain url ", url)
            const response = await axios.post(url, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    "metamask_address": metamaskAddress
                },
            });

            const res = response.data

            // let logs: Array<string> = res.logs
            // logs.forEach((item) => {
            //    //  console.log("**>" + item + "\n.")
            // })
            ////  console.log("Upload res: ", res)
            // Assuming the API returns an array of FileInfo objects
            // const file: ApiFileInfo = {
            // id: res.file.id,
            // name: res.file.name,
            // extension: res.file.extension,
            // page_data: res.file.page_data,
            // mode: user_profile.fileMode ?? "",
            // owner: metamaskAddress ?? "",
            // };

            const file: ApiFileInfo = res
            setFiles([...files, file])
            // setUploadedFilesIndexes(value => [...value, fileIndex])
            toast.success("Aqua Chain imported successfully");
            setUploading(false)
            setUploaded(true)
            updateUploadedIndex(fileIndex)
            return;
        } catch (error) {
            setUploading(false)
            toast.error(`Failed to import chain: ${error}`);
        }
    };

    return (
        <Button 
            data-testid="import-action-42-button" 
            size="sm" 
            variant="outline" 
            className="w-20 bg-gray-100 hover:bg-gray-200 text-gray-800" 
            onClick={importAquaChain} 
            disabled={uploadedIndexes.includes(fileIndex) || uploaded}
        >
            {uploading ? (
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-800 border-t-transparent"></span>
            ) : (
                <LuImport className="mr-2 h-4 w-4" />
            )}
            Import
        </Button>
    )
}



