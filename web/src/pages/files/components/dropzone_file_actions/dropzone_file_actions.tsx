import React, { useState, useCallback } from 'react';
import { Upload, FileText, Folder } from 'lucide-react';
import { isAquaTree, isJSONFile, isJSONKeyValueStringContent, isZipFile, readFileContent } from '@/utils/functions';
import { toaster } from '@/components/chakra-ui/toaster';

interface FileItemWrapper {
  file: File;
  isJson: boolean;
  isLoading: boolean;
  isZip?: boolean;
  isJsonForm?: boolean;
  isJsonAquaTreeData?: boolean;
}
const FileDropZone = () => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState<FileItemWrapper[]>([]);


  const handleDragOver = useCallback((e: { preventDefault: () => void; }) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: { preventDefault: () => void; }) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  interface DropEvent extends React.DragEvent<HTMLDivElement> { }
  // interface ChangeEvent extends React.ChangeEvent<HTMLInputElement> {}

  const checkFileContent = async (file: File, isJson: boolean, isZip: boolean) => {
    if (isJson) {
      try {
        let content = await readFileContent(file);
        let contentStr = content as string
        let isForm = isJSONKeyValueStringContent(contentStr);
        if (isForm) {
          setFiles((prev: FileItemWrapper[]) => [
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
          setFiles((prev: FileItemWrapper[]) => [
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
      setFiles((prev: FileItemWrapper[]) => [
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
    setFiles(prev => prev.filter((_, i) => i !== index));
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
      {files.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Uploaded Files</h3>
          <div className="space-y-2">
            {files.map((fileData, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{fileData.file.name}</p>
                    <p className="text-xs text-gray-500">{(fileData.file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileDropZone;