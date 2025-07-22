import React, { useRef, useState } from "react";
import { LuImport } from "react-icons/lu";
import { useStore } from "zustand";
import appStore from "../../store";
import { 
    readFileAsText, 
    validateAquaTree, 
    getFileName, 
    readFileContent, 
    getGenesisHash, 
    ensureDomainUrlHasSSL, 
    isAquaTree, 
    allLinkRevisionHashes, 
    getAquaTreeFileName, 
    dummyCredential
} from "../../utils/functions";
import Aquafier, { AquaTree, CredentialsData, FileObject } from "aqua-js-sdk";
import { IDropzoneAction2, UploadLinkAquaTreeExpectedData } from "../../types/types";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import {  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

 
export const ImportAquaTree = ({ aquaFile, uploadedIndexes, fileIndex, updateUploadedIndex }: IDropzoneAction2) => {
    let aquafier = new Aquafier();
    const [uploading, setUploading] = useState(false);
    const [uploaded, setUploaded] = useState(false);
    const [requiredFileHash, setRequiredFileHash] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFileName, setSelectedFileName] = useState<string>("");
    const [isOpen, setIsOpen] = useState(false);
    const [allFileObjectWrapper, setAllFileObjectsWrapper] = useState<Array<{
        file: File,
        fileObject: FileObject
    }>>([]);
    const [expectedFile, setExpectedFile] = useState<UploadLinkAquaTreeExpectedData | null>(null);

    const { files, metamaskAddress, setFiles, backend_url, session, user_profile } = useStore(appStore);

    const uploadFileData = async (aquaFile: File, assetFile: File | null, isWorkflow: boolean = false) => {
        const formData = new FormData();
        formData.append('file', aquaFile);
        formData.append('has_asset', `${assetFile != null}`);
        formData.append('asset', assetFile ?? aquaFile);
        formData.append('account', `${metamaskAddress}`);
        formData.append('is_workflow', `${isWorkflow}`);

        setUploading(true);
        try {
            const url = `${backend_url}/explorer_aqua_file_upload`;
            const response = await fetch(url, {
                method: 'POST',
                body: formData,
                headers: {
                    "nonce": session?.nonce || ""
                }});

            const responseData = await response.json();
            setFiles([...responseData.files]);
            setUploaded(true);
            setUploading(false);
            setSelectedFileName("");
            toast({
                description: "File uploaded successfully",
                variant: "default"
            });
            updateUploadedIndex(fileIndex);
            return;
        } catch (error) {
            setUploading(false);
            setSelectedFileName("");
            toast({
                description: `Failed to upload file: ${error}`,
                variant: "destructive"
            });
        }
    };

    const importLinkedFile = async (aquaTree: AquaTree) => {
        let mainAquaFileObject: FileObject = {
            fileContent: aquaTree,
            fileName: aquaFile.name,
            fileSize: aquaFile.size,
            path: ""
        };

        const newFileObjects = [{ fileObject: mainAquaFileObject, file: aquaFile }];
        setAllFileObjectsWrapper(newFileObjects);

        let genHash = getGenesisHash(aquaTree);
        if (genHash == null) {
            toast({
                description: `Genesis Revision not found`,
                variant: "destructive"
            });
            return;
        }

        console.log(`genHash -- ${genHash}`);
        let genRevision = aquaTree.revisions[genHash!!];
        let actualUrlToFetch = ensureDomainUrlHasSSL(backend_url);
        console.log(`revision  ${JSON.stringify(genRevision, null, 2)}`);
        console.log(`file hash +++ ${genRevision.file_hash}`);

        const response = await fetch(`${actualUrlToFetch}/files/${genRevision.file_hash}`, {
            method: 'GET',
            headers: {
                'Nonce': session?.nonce ?? "--error--"
            }
        });

        if (!response.ok) {
            setExpectedFile({
                displayText: `please upload ${aquaTree.file_index[genHash]}`,
                exectedFileHash: genRevision.file_hash!!,
                expectedFileName: aquaTree.file_index[genHash],
                itemRevisionHash: "",
                isAquaFile: false
            });
            setIsOpen(true);
        } else {
            const allAquaTrees = newFileObjects.filter((e) => isAquaTree(e.fileObject.fileContent));
            const missingFile = checkAllFilesAvailable(allAquaTrees, newFileObjects);
            if (missingFile) {
                setExpectedFile(missingFile);
                setIsOpen(true);
                return;
            }
        }
    };

    const findFileRevision = (aquaTree: AquaTree): string => {
        let genHash = getGenesisHash(aquaTree);
        if (genHash == null) {
            return "";
        }
        const fileRevision = aquaTree.revisions[genHash];
        return fileRevision?.file_hash ?? "";
    };

    const userHasAquaTreeByGenesis = (importedGenesisHash: string): boolean => {
        return files.some(userFile => {
            const aquaTreeGenesisHash = getGenesisHash(userFile.aquaTree!!);
            return aquaTreeGenesisHash === importedGenesisHash;
        });
    };

    const hasLinkRevisions = (aquaTree: AquaTree): boolean => {
        return Object.values(aquaTree.revisions).some(item => item.revision_type === "link");
    };

    const importSimpleAquaFileFile = async (aquaTree: AquaTree) => {
        try {
            setUploading(true);

            let [isValidAquaTree, failureReason] = validateAquaTree(aquaTree);
            console.log(`is aqua tree valid ${isValidAquaTree} failure reason ${failureReason}`);
            if (!isValidAquaTree) {
                setUploading(false);
                toast({
                    description: `Aqua tree has an error: ${failureReason}`,
                    variant: "destructive"
                });
                return;
            }

            const fileHash = findFileRevision(aquaTree);
            let actualUrlToFetch = ensureDomainUrlHasSSL(backend_url);

            const response = await fetch(`${actualUrlToFetch}/files/${fileHash}`, {
                method: 'GET',
                headers: {
                    'Nonce': session?.nonce ?? "--error--"
                }
            });

            if (!response.ok) {
                if (fileHash) {
                    setRequiredFileHash(fileHash);
                    setIsOpen(true);
                    return;
                } else {
                    setUploading(false);
                    toast({
                        description: `Could not determine required file hash from AquaTree`,
                        variant: "destructive"
                    });
                    return;
                }
            }

            console.log(`Response ok, fetching file content for ${fileHash}`);
            const blob: Blob = await response.blob();
            let fileName = getFileName(aquaTree);
            const arrayBuffer = await blob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            let fileObject: FileObject = {
                fileContent: uint8Array,
                fileName: fileName,
                path: "./",
                fileSize: blob.size
            };

            console.log(`here fileObject ${JSON.stringify(fileObject, null, 2)}`);
            if (hasLinkRevisions(aquaTree)) {
                console.log(`has link revisions`);
                setUploading(false);
                toast({
                    description: `Aqua tree has a link revision please import the Aquatree using the zip format`,
                    variant: "destructive"
                });
                return;
            }

            let dummyCreds : CredentialsData= dummyCredential()
            dummyCreds.alchemy_key = user_profile.alchemy_key; 
            console.log(`dummyCreds ${JSON.stringify(dummyCreds, null, 2)}`);
            let result = await aquafier.verifyAquaTree(aquaTree, [fileObject], dummyCreds);
 console.log(`result of verifyAquaTree ${JSON.stringify(result, null, 2)}`);
            if (result.isErr()) {
                setUploading(false);
                toast({
                    description: `Aqua tree is not valid: ${JSON.stringify(result)}`,
                    variant: "destructive"
                });
                return;
            }

            let importedAquaTreeGenesisHash = getGenesisHash(aquaTree);

            if (userHasAquaTreeByGenesis(importedAquaTreeGenesisHash!)) {
                setUploading(false);
                toast({
                    description: `Aqua tree exists already in your files`,
                    variant: "destructive"
                });
                return;
            }
            console.log(`importedAquaTreeGenesisHash ${importedAquaTreeGenesisHash}`);

            await uploadFileData(aquaFile, null, false);

        } catch (e) {
            setUploading(false);
            toast({
                description: `Failed to import aqua tree file: ${e}`,
                variant: "destructive"
            });
        }
    };

    const findMissingFileForLinkHash = (
        aquaTreeItem: AquaTree,
        linkHash: string,
        newFileObjects: Array<{ file: File, fileObject: FileObject }>
    ): UploadLinkAquaTreeExpectedData | null => {
        const revisionItem = aquaTreeItem.revisions[linkHash];
        const fileRevisionHash = revisionItem.link_verification_hashes![0];
        const fileName = aquaTreeItem.file_index[fileRevisionHash];
        const aquaFile = `${fileName}.aqua.json`;

        const aquaFileItemObject = newFileObjects.find((e) => e.fileObject.fileName === aquaFile);
        if (!aquaFileItemObject) {
            return {
                displayText: `please upload ${aquaFile}.`,
                exectedFileHash: "",
                itemRevisionHash: fileRevisionHash,
                expectedFileName: aquaFile,
                isAquaFile: true
            };
        }

        const fileItemObject = newFileObjects.find((e) => e.fileObject.fileName === fileName);
        if (!fileItemObject) {
            const aquaFileItemObject = newFileObjects.find((e) => e.fileObject.fileName === aquaFile);
            if (!aquaFileItemObject) {
                return {
                    displayText: `please upload ${aquaFile} .`,
                    exectedFileHash: "",
                    itemRevisionHash: fileRevisionHash,
                    expectedFileName: aquaFile,
                    isAquaFile: true
                };
            }

            let aquaTree: AquaTree;
            let contentData = aquaFileItemObject.fileObject.fileContent;
            if (typeof contentData == 'string') {
                aquaTree = JSON.parse(aquaFileItemObject.fileObject.fileContent as string);
            } else if (typeof contentData === 'object') {
                aquaTree = aquaFileItemObject.fileObject.fileContent as AquaTree;
            } else {
                throw Error(`An error occured. could not deduce aqua tree`);
            }
            let genHash = getGenesisHash(aquaTree);
            if (genHash == null) {
                throw Error(`Genesis hash cannot be null for ${aquaFileItemObject.fileObject.fileName}`);
            }
            let genRevision = aquaTree.revisions[genHash];
            let fileHash = genRevision.file_hash;

            return {
                displayText: `please upload ${fileName}`,
                exectedFileHash: fileHash ?? "errors",
                expectedFileName: fileName,
                itemRevisionHash: fileRevisionHash,
                isAquaFile: false
            };
        }

        return null;
    };

    const checkAllFilesAvailable = (
        allAquaTrees: Array<{ file: File, fileObject: FileObject }>,
        newFileObjects: Array<{ file: File, fileObject: FileObject }>
    ): UploadLinkAquaTreeExpectedData | null => {
        for (const aFileObject of allAquaTrees) {
            const aquaTreeItem: AquaTree = aFileObject.fileObject.fileContent as AquaTree;
            const linkHashes = allLinkRevisionHashes(aquaTreeItem);

            if (linkHashes.length > 0) {
                for (const linkHash of linkHashes) {
                    const missingFile = findMissingFileForLinkHash(aquaTreeItem, linkHash, newFileObjects);
                    if (missingFile) {
                        return missingFile;
                    }
                }
            }
        }
        return null;
    };

    const inspectMultiFileUpload = async (filePar: File) => {
        if (!expectedFile) {
            toast({
                description: "An internal error occured",
                variant: "destructive"
            });
            return;
        }

        const fileDataContent = await readFileContent(filePar);
        console.log(`expectedFile ${JSON.stringify(expectedFile, null, 2)}`);

        if (!expectedFile.expectedFileName.endsWith(`.aqua.json`)) {
            const fileHash = aquafier.getFileHash(fileDataContent);

            console.log(`calculated fileHash ${fileHash} and from chain ${expectedFile.exectedFileHash} file name ${filePar.name}`);
            if (fileHash.trim() != expectedFile.exectedFileHash.trim()) {
                toast({
                    description: "Dropped file hash doesn't match the required hash in the AquaTree..",
                    variant: "destructive"
                });
                return;
            }
        } else {
            let aquaTreeItem: AquaTree = JSON.parse(fileDataContent as string);
            let allHashes = Object.keys(aquaTreeItem.revisions);
            console.log(`All hashes ${allHashes} --`);
            if (allHashes.includes(expectedFile.itemRevisionHash)) {
                console.log(`Its okay continue ......`);
            } else {
                toast({
                    description: "Aqua file does not contain " + expectedFile.itemRevisionHash,
                    variant: "destructive"
                });
                return;
            }
        }

        if (filePar.name != expectedFile.expectedFileName) {
            toast({
                description: "Please rename the file to " + expectedFile.expectedFileName,
                variant: "destructive"
            });
            return;
        }

        let fileData = fileDataContent;
        if (filePar.name.endsWith(`.aqua.json`)) {
            fileData = JSON.parse(fileDataContent as string);
        }
        const fileObject: FileObject = {
            fileContent: fileData,
            fileName: filePar.name,
            fileSize: filePar.size,
            path: ""
        };

        console.log(`New file object ${JSON.stringify(fileObject, null, 4)}`);

        const newFileObjects = allFileObjectWrapper;
        newFileObjects.push({
            file: filePar, fileObject: fileObject
        });

        console.log(`--- inspectMultiFileUpload continue ${JSON.stringify(newFileObjects, null, 4)} `);
        setAllFileObjectsWrapper(newFileObjects);

        const allAquaTrees = newFileObjects.filter((e) => isAquaTree(e.fileObject.fileContent));

        const missingFile = checkAllFilesAvailable(allAquaTrees, newFileObjects);
        if (missingFile) {
            console.log(`missingFile ${JSON.stringify(missingFile, null, 2)}`);
            setExpectedFile(missingFile);
            setIsOpen(true);
            toast({
                description: `Please upload ${missingFile.expectedFileName}`,
                variant: "destructive"
            });
            return;
        }
        console.log(`allAquaTrees contrinue to upload  ${JSON.stringify(allAquaTrees, null, 4)}`);

        for (const item of allAquaTrees) {
            console.log(` looping aqua tree file ${item.file.name} `);
            if (aquaFile.name == item.file.name) {
                console.log(`skip main file .. ${aquaFile.name}`);
            } else {
                const aquaTreeItem: AquaTree = item.fileObject.fileContent as AquaTree;
                const fileName = getAquaTreeFileName(aquaTreeItem);
                const fileObjWrapper = newFileObjects.find((e) => e.fileObject.fileName === fileName);

                if (!fileObjWrapper) {
                    toast({
                        description: `An internal error occured , cannot find file ${fileName}`,
                        variant: "destructive"
                    });
                    return false;
                }

                await uploadFileData(item.file, fileObjWrapper.file, true);
            }
        }

        const fileContent = await readFileAsText(aquaFile);
        const aquaTree: AquaTree = JSON.parse(fileContent);
        const fileName = getAquaTreeFileName(aquaTree);
        const fileObjWrapper = newFileObjects.find((e) => e.fileObject.fileName === fileName);

        await uploadFileData(aquaFile, fileObjWrapper?.file!, false);
    };

    const importFile = async () => {
        const fileContent = await readFileAsText(aquaFile);
        const aquaTree: AquaTree = JSON.parse(fileContent);
        const hasLinkRevision = hasLinkRevisions(aquaTree);
        console.log(`one here ${hasLinkRevision}`);
        if (hasLinkRevision) {
            await importLinkedFile(aquaTree);
        } else {
            await importSimpleAquaFileFile(aquaTree);
        }
    };

    const modalSelectedFile = async (selectedFile: File) => {
        if (requiredFileHash) {
            let fileDataContent = await readFileContent(selectedFile);
            const fileHash = aquafier.getFileHash(fileDataContent);
            console.log(`calculated fileHash ${fileHash} and from chain ${requiredFileHash} file name ${selectedFile.name}`);
            if (fileHash !== requiredFileHash) {
                toast({
                    description: "Dropped file hash doesn't match the required hash in the AquaTree..",
                    variant: "destructive"
                });
            } else {
                setSelectedFileName(selectedFile.name);
                setIsOpen(false);

                try {
                    await uploadFileData(aquaFile, selectedFile, false);
                } catch (error) {
                    toast({
                        description: `Error processing: ${error instanceof Error ? error.message : String(error)}`,
                        variant: "destructive"
                    });
                    setUploading(false);
                }
            }
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (expectedFile == null) {
                await modalSelectedFile(file);
            } else {
                await inspectMultiFileUpload(file);
            }
        }
    };

    const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();

        if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
            const file = event.dataTransfer.files[0];
            await modalSelectedFile(file);
        }
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
    };

    const closeModal = () => {
        setUploading(false);
        setIsOpen(false);
    };

    return (
        <>
            <Button 
                data-testid="action-import-93-button" 
                size="sm" 
                variant="outline"
                className="w-24 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                onClick={importFile} 
                disabled={uploadedIndexes.includes(fileIndex) || uploaded}
            >
                {uploading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-700"></div>
                ) : (
                    <LuImport className="w-4 h-4 mr-1" />
                )}
                Import
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-2xl w-[90%] mx-auto mt-12 rounded-2xl shadow-2xl bg-white border border-gray-200 p-6">
                    <DialogHeader className="border-b border-gray-200 pb-3">
                        <DialogTitle className="text-lg font-medium">
                            Please provide the required file
                        </DialogTitle>
                    </DialogHeader>

                    <div className="py-4">
                        <div className="flex flex-col items-center space-y-4">
                            <p className="text-sm text-black text-center">
                                {expectedFile == null ? (
                                    <span>We couldn't fetch the file associated with this AquaTree. Please select or drop the file:</span>
                                ) : (
                                    <span>{expectedFile.displayText}</span>
                                )}
                            </p>

                            <div
                                className="border-2 border-dashed border-gray-300 rounded-lg p-6 w-full text-center bg-gray-50 hover:bg-gray-100 transition-colors"
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                            >
                                <p className="mb-2 text-sm text-black">Drag and drop file here</p>
                                <p className="text-sm text-black mb-3">or</p>
                                <Button
                                    data-testid="action-select-file-06-button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="bg-black text-white hover:bg-gray-800"
                                    size="sm"
                                >
                                    Select File
                                </Button>
                                <Input
                                    type="file"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                />
                            </div>

                            {selectedFileName.length > 0 && (
                                <p className="text-sm text-gray-600">Selected: {selectedFileName}</p>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="border-t border-gray-200 pt-3">
                        <Button
                            data-testid="action-cancel-77-button"
                            variant="outline"
                            onClick={closeModal}
                            className="bg-black text-white hover:bg-gray-800"
                        >
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};