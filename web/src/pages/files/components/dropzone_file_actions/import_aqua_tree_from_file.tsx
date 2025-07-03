import { LuImport } from "react-icons/lu";
import { Button } from "../../../../components/chakra-ui/button";
import axios from "axios";
import { useStore } from "zustand";
import appStore from "../../../../store";
import { useState } from "react";
import { ApiFileInfo } from "../../../../models/FileInfo";
import { toaster } from "../../../../components/chakra-ui/toaster";
import { IDropzoneAction } from "../../../../types/types";




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
        <Button data-testid="import-action-42-button" size={'xs'} colorPalette={'blackAlpha'} variant={'subtle'} w={'80px'} onClick={importAquaChain} disabled={uploadedIndexes.includes(fileIndex) || uploaded} loading={uploading}>
            <LuImport />
            Import
        </Button>
    )
}



