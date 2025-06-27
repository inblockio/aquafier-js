
import { LuDock } from "react-icons/lu";
import { Button } from "../chakra-ui/button";
import axios from "axios";
import { useStore } from "zustand";
import appStore from "../../store";
import { useState } from "react";
import { ApiFileInfo } from "../../models/FileInfo";
import { toaster } from "../chakra-ui/toaster";
import { checkIfFileExistInUserFiles } from "../../utils/functions";

import { maxFileSizeForUpload } from "../../utils/constants";
import { IDropzoneAction } from "../../types/types";





export const FormRevisionFile = ({ file, uploadedIndexes, fileIndex, updateUploadedIndex }: IDropzoneAction) => {

    const [uploading, setUploading] = useState(false)
    const [uploaded, setUploaded] = useState(false)

    const { metamaskAddress, setFiles, files, backend_url, session } = useStore(appStore)



    const uploadFile = async () => {

        let fileExist = await checkIfFileExistInUserFiles(file, files)

        if (fileExist) {
            toaster.create({
                description: "You already have the file. Delete before importing this",
                type: "info"
            })
            return
        }




        if (!file) {
            toaster.create({
                description: "No file selected!",
                type: "info"
            })
            return;
        }


        if (file.size > maxFileSizeForUpload) {
            toaster.create({
                description: "File size exceeds 200MB limit. Please upload a smaller file.",
                type: "error"
            })
            return;
        }

        const formData = new FormData();
        formData.append('isForm', 'true');
        formData.append('file', file);
        formData.append('account', `${metamaskAddress}`);

        setUploading(true)
        try {
            const url = `${backend_url}/explorer_files`
            //  console.log("url ", url)
            const response = await axios.post(url, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    "nonce": session?.nonce
                },
            });

            const res = response.data

            const fileInfo: ApiFileInfo = {
                aquaTree: res.aquaTree,
                fileObject: [res.fileObject],
                linkedFileObjects: [],
                mode: "private",
                owner: metamaskAddress ?? ""
            }
            // const base64Content = await encodeFileToBase64(file);
            // Assuming the API returns an array of FileInfo objects
            // const fileInfo: ApiFileInfo = {
            //     fileObject: {
            //         fileName: res.file.name,
            //         fileContent: base64Content,
            //         path: "aqua::",
            //     },
            //     // name: res.file.name,
            //     // extension: res.file.extension,
            //     // page_data: res.file.page_data,
            //     mode: res.file.mode,
            //     owner: res.file.owner,
            //     aquaTree: null,
            //     linkedFileObjects: []
            // };

            setFiles([...files, fileInfo])
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
    };

    return (
        <Button data-testid="close-form-3-button" size={'xs'} colorPalette={'yellow'} variant={'subtle'} w={'120px'} onClick={uploadFile} disabled={uploadedIndexes.includes(fileIndex) || uploaded} loading={uploading}>
            <LuDock />
            Create Form.
        </Button>
    )
}
