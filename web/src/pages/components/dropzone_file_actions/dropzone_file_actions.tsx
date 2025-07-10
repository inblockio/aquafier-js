import React, { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, Folder } from 'lucide-react';
import { checkIfFileExistInUserFiles, isAquaTree, isJSONFile, isJSONKeyValueStringContent, isZipFile, readFileContent } from '@/utils/functions';

import { LuTrash2, LuUpload } from 'react-icons/lu';
import { maxFileSizeForUpload } from '../../../utils/constants';
import { useStore } from 'zustand';
import appStore from '../../../store';
import axios from 'axios';
import { ApiFileInfo } from '../../../models/FileInfo';
import { DropEvent, FileItemWrapper } from '@/types/types';
import { toaster } from '@/components/shadcn/ui/use-toast';



const FileDropZone = () => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [filesList, setFilesList] = useState<FileItemWrapper[]>([]);
     const { files, setFiles, session , backend_url } = useStore(appStore)

  const handleDragOver = useCallback((e: { preventDefault: () => void; }) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: { preventDefault: () => void; }) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const uploadFile = async (fileData: FileItemWrapper) => {

    // let aquafier = new Aquafier();
    // let fileContent = await  readFileContent()
    // const existingChainFile = files.find(_file => _file.fileObject.find((e) => e.fileName == file.name) != undefined)
    if (!fileData.file) {
      toaster.create({
        description: "No file selected!",
        type: "info"
      })
      return;
    }

    let fileExist = await checkIfFileExistInUserFiles(fileData.file, files)

    if (fileExist) {
      toaster.create({
        description: "You already have the file. Delete before importing this",
        type: "info"
      })
      // updateUploadedIndex(fileIndex)

      return
    }

    if (fileData.file.size > maxFileSizeForUpload) {
      toaster.create({
        description: "File size exceeds 200MB limit. Please upload a smaller file.",
        type: "error"
      })
      return;
    }

    let metamaskAddress= session?.address ?? ""
    const formData = new FormData();
    formData.append('file', fileData.file);
    formData.append('account', `${metamaskAddress}`);


    setFilesList(prev => {
      let newFilesList = prev.map((item) => {
        if (item.file.name === fileData.file.name) {
          return { ...item, isLoading: true }; // Set loading state for the current file
        }
        return item; // Keep other items unchanged
      });
      return newFilesList;
    });
   


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



      let newFilesData = [...files, fileInfo];
      setFiles(newFilesData);
      

      setFilesList(prev => {
      let newFilesList = prev.map((item) => {
        if (item.file.name === fileData.file.name) {
          return { ...item, isLoading: false }; // Set loading state for the current file
        }
        return item; // Keep other items unchanged
      });
      return newFilesList;
    });
      toaster.create({
        description: "File uploaded successfuly",
        type: "success"
      })
    
      return;
    } catch (error) {
      // setUploading(false)
      toaster.create({
        description: `Failed to upload file: ${error}`,
        type: "error"
      })
    }
  };



  useEffect(() => {
    // This effect runs whenever the files state changes
    // You can perform any side effects here, like logging or updating other states
    console.log("Files updated:", filesList.length);
    (async () => {

      let newFileData = filesList.filter(fileData => !fileData.isLoading);
      if (newFileData.length === 0) return; // No new files to process

      //todo update the file state 
      // You can perform any asynchronous operations here if needed
      for (const fileData of newFileData) {
        if (fileData.isLoading) continue; // Skip if already processed
        fileData.isLoading = true; // Set loading state
        await checkFileContent(fileData.file, fileData.isJson, fileData.isZip);
        fileData.isLoading = false; // Reset loading state after processing
      }

    })()

  }, [filesList])

  const checkFileContent = async (file: File, isJson: boolean, isZip: boolean) => {
    if (isJson) {
      try {
        let content = await readFileContent(file);
        let contentStr = content as string
        let isForm = isJSONKeyValueStringContent(contentStr);
        if (isForm) {
          setFilesList((prev: FileItemWrapper[]) => [
            ...prev,
            {
              file,
              isJson,
              isLoading: false, // Initially set to true while processing
              isZip: isZip,
              isJsonForm: true, // Default value, will be updated after reading content
              isJsonAquaTreeData: false // Default value, will be updated after reading content
            }
          ]);
          return;
        }

        let jsonData = JSON.parse(contentStr);
        let isAquaTreeData = isAquaTree(jsonData);
        let r = typeof jsonData === 'object'
        let r2 = 'revisions' in jsonData
        let r3 = 'file_index' in jsonData
        console.log(`isAquaTreeData  ${isAquaTreeData} contentStr ${contentStr} r ${r} r2 ${r2} r3 ${r3}`)
        if (isAquaTreeData) {
          setFilesList((prev: FileItemWrapper[]) => [
            ...prev,
            {
              file,
              isJson,
              isLoading: false, // Initially set to true while processing
              isZip: isZip,
              isJsonForm: false, // Default value, will be updated after reading content
              isJsonAquaTreeData: true // Default value, will be updated after reading content
            }
          ]);
          return;
        }


      } catch (error) {
        console.error("Error reading file content:", error);
        toaster.create({
          description: `An error occurred while reading the file content. Please try again.`,
          type: "error"
        })
      }
    }
  };


  const handleFile = useCallback((file: File) => {
    const isJson = isJSONFile(file.name)

    const isZIp = isZipFile(file.name)

    if (isJson) {
      checkFileContent(file, isJson, isZIp);
    } else {
      setFilesList((prev: FileItemWrapper[]) => [
        ...prev,
        {
          file,
          isJson,
          isLoading: false, // Initially set to true while processing
          isZip: isZIp,
          isJsonForm: false, // Default value, will be updated after reading content
          isJsonAquaTreeData: false // Default value, will be updated after reading content
        }
      ]);
    }




  }, []);

  const handleDrop = useCallback((e: DropEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;
    droppedFiles.forEach(file => handleFile(file));
    // setFiles((prev: File[]) => [...prev, ...droppedFiles]);
  }, []);

  interface FileSelectEvent extends React.ChangeEvent<HTMLInputElement> { }

  const handleFileSelect = useCallback((e: FileSelectEvent) => {
    const selectedFiles = Array.from(e.target.files ?? []);
    if (selectedFiles.length === 0) return;
    selectedFiles.forEach(file => handleFile(file));
    // setFiles((prev: File[]) => [...prev, ...selectedFiles]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFilesList(prev => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto p-6 items-center justify-center">
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-12 text-center transition-colors  max-w-full items-center justify-center 
          ${isDragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Folder Icon */}
        <div className="mb-4 flex justify-center">
          <div className="relative" onClick={() => {
            const input = document.getElementById('file-input');
            if (input) input.click();
          }}>
            <Folder className="w-16 h-16 text-gray-400" />
            <div className="absolute inset-0 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="mb-6">
          <p className="text-gray-600 text-lg mb-2">
            Drop anything here or{' '}
            <button
              className="text-blue-600 hover:text-blue-800 font-medium underline"
              onClick={() => {

              }}
            >
              create a workflow
            </button>
          </p>
        </div>

        {/* Upload Button */}
        <div className="flex justify-center">
          <label
            htmlFor="file-input"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 cursor-pointer transition-colors"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </label>
          <input
            id="file-input"
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* Drag overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-blue-100 bg-opacity-50 rounded-lg flex items-center justify-center">
            <div className="text-blue-600 font-medium">Drop files here</div>
          </div>
        )}
      </div>

      {/* File List */}
      {filesList.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Uploaded Files</h3>
          <div className="space-y-2">
            {filesList.map((fileData, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{fileData.file.name}</p>
                    <p className="text-xs text-gray-500">{(fileData.file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  {fileData.isLoading ? (
                    <button className="flex items-center gap-2 text-white text-sm font-medium bg-gray-800 w-[100px] px-2 py-1 rounded cursor-not-allowed" disabled>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                      </svg>
                      Loading
                    </button>
                  ) : (
                    <button data-testid="action-upload-51-button" className="flex items-center gap-1 text-white hover:text-white-700 text-sm font-medium bg-gray-800 w-[80px] px-2 py-1 rounded" onClick={() => uploadFile(fileData)}>
                      <LuUpload />
                      Upload
                    </button>
                  )}
                  <button data-testid="action-upload-51-button" className="flex items-center gap-1 text-white hover:text-white-700 text-sm font-medium bg-red-600 w-[80px] px-2 py-1 rounded"
                    onClick={() => removeFile(index)}
                  >
                    <LuTrash2 />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileDropZone;