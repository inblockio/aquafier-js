import { Component, createSignal } from 'solid-js';

import { Loader2 } from 'lucide-solid';
import axios from 'axios';
import toast from 'solid-toast';
import { appStore, appStoreActions } from '../../store';
import { ApiFileInfo } from '../../models/FileInfo';
import { checkIfFileExistInUserFiles } from '../../utils/functions';
import { maxFileSizeForUpload } from '../../utils/constants';
import { IDropzoneAction } from '../../types/types';
import { Button } from '../ui/button';

export const FormRevisionFile: Component<IDropzoneAction> = (props) => {
  const [uploading, setUploading] = createSignal(false);

  const uploadFile = async () => {
    if (uploading()) {
      toast.error('Wait for upload to complete');
      return;
    }

    const fileExist = await checkIfFileExistInUserFiles(
      props.file, 
      appStore.files.fileData
    );

    if (fileExist) {
      toast.error('You already have the file. Delete before importing this');
      return;
    }

    if (!props.file) {
      toast.error('No file selected!');
      return;
    }

    if (props.file.size > maxFileSizeForUpload) {
      toast.error('File size exceeds 200MB limit. Please upload a smaller file.');
      return;
    }

    const formData = new FormData();
    formData.append('isForm', 'true');
    formData.append('file', props.file);
    formData.append('account', `${appStore.metamaskAddress}`);

    setUploading(true);
    
    try {
      const url = `${appStore.backend_url}/explorer_files`;
      const response = await axios.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          nonce: appStore.session?.nonce,
        },
      });

      const res = response.data;

      const fileInfo: ApiFileInfo = {
        aquaTree: res.aquaTree,
        fileObject: [res.fileObject],
        linkedFileObjects: [],
        mode: 'private',
        owner: appStore.metamaskAddress ?? '',
      };

      appStoreActions.setFiles({ 
        fileData: [...appStore.files.fileData, fileInfo], 
        status: 'loaded' 
      });

      setUploading(false);
      toast.success('File uploaded successfully');
      props.removeFilesListForUpload(props.filesWrapper);
      
    } catch (error) {
      setUploading(false);
      toast.error(`Failed to upload file: ${error}`);
    }
  };

  return (
    <Button
      data-testid="create-form-3-button"
      size="sm"
      variant="secondary"
      class="w-[130px] bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border-yellow-300"
      onClick={uploadFile}
    >
      {uploading() ? (
        <Loader2 class="h-4 w-4 animate-spin mr-2" />
      ) : (
      //   <LuDock class="h-4 w-4 mr-2" />
        <svg class="h-4 w-4 mr-2 lucide lucide-dock-icon lucide-dock"  xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M2 8h20"/><rect width="20" height="16" x="2" y="4" rx="2"/><path d="M6 16h12"/></svg>
      )}
      Create Form
    </Button>
  );
};