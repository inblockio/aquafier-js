
import { LuDock } from "react-icons/lu";
import axios from "axios";
import { useStore } from "zustand";
import appStore from "../../store";
import { useState } from "react";
import { ApiFileInfo } from "../../models/FileInfo";
import { checkIfFileExistInUserFiles } from "../../utils/functions";
import { maxFileSizeForUpload } from "../../utils/constants";
import { IDropzoneAction } from "../../types/types";
import { toaster } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";





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
        <Button
            data-testid="create-form-3-button"
            size="sm"
            variant="secondary"
            className="w-[130px] bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border-yellow-300"
            onClick={uploadFile}
            disabled={uploadedIndexes.includes(fileIndex) || uploaded}
        >
            {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
                <LuDock className="h-4 w-4 mr-2" />
            )}
            Create Form
        </Button>
    )
}
