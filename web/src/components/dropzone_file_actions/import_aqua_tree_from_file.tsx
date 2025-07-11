import { LuImport } from "react-icons/lu";
import axios from "axios";
import { useStore } from "zustand";
import appStore from "../../store";
import { useState } from "react";
import { ApiFileInfo } from "../../models/FileInfo";
import { IDropzoneAction } from "../../types/types";
import { Button } from "@/components/ui/button";
import { toaster } from "@/components/ui/use-toast";




export const ImportAquaChainFromFile = ({ file, uploadedIndexes, fileIndex, updateUploadedIndex }: IDropzoneAction) => {

    const [uploading, setUploading] = useState(false)
    const [uploaded, setUploaded] = useState(false)

    const { metamaskAddress, setFiles, files, backend_url } = useStore(appStore)

    const importAquaChain = async () => {

        if (!file) {
            toaster.create({
                description: "No file selected!",
                type: "error"
            })
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
            toaster.create({
                description: "Aqua Chain imported successfully",
                type: "success"
            })
            setUploading(false)
            setUploaded(true)
            updateUploadedIndex(fileIndex)
            return;
        } catch (error) {
            setUploading(false)
            toaster.create({
                description: `Failed to import chain: ${error}`,
                type: "error"
            })
        }
    };

    return (
        <Button
            data-testid="import-action-42-button"
            size="sm"
            className="w-[80px] flex items-center gap-1 text-muted-foreground"
            onClick={importAquaChain}
            disabled={uploadedIndexes.includes(fileIndex) || uploaded}
        >
            {uploading ? (
                <span className="w-4 h-4 animate-spin border-2 border-muted-foreground border-t-transparent rounded-full" />
            ) : (
                <LuImport className="w-4 h-4" />
            )}
            Import
        </Button>
    )
}



