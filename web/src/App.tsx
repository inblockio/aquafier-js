import { ethers } from 'ethers';
import MainLayout, { MainLayoutHolder } from './layouts/MainLayout'
import Home from './pages/home/Home'
import LoadConfiguration from './components/config';
import { initializeBackendUrl } from './utils/constants';
import { useEffect } from 'react'
import appStore from './store';
import { useStore } from "zustand"
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import SharePage from './pages/SharePage';
import Loading from './pages/Loading';
import AquaForms from './pages/AquaForms';
import FormGenerator from './pages/FormGenerator';
import AttestationAddresses from './pages/AttestationAddresses';
import PdfSigner from './pages/wokflow/ContractDocument/PdfSigner';
import WorkFlowPage from './pages/wokflow/WorkFlow';
import FilesPage from './pages/files/files';
import HomeV2 from './pages/home/HomeV2';
import TailwindLayout from './layouts/TailwindLayout';
import FilesSettings from './pages/files/files_settings';

declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider;
  }
}



function App() {
  const { setBackEndUrl } = useStore(appStore)


  useEffect(() => {
    //  console.log("backedn url is", backend_url);
    // Properly handle async initialization
    const initBackend = async () => {
      const url = await initializeBackendUrl();
      setBackEndUrl(url);
    };

    initBackend();
  }, []); // Empty dependency array means this runs once on mount

  return (
    <BrowserRouter>
      <LoadConfiguration />
      <Routes>
        {/* Routes with Tailwind UI (no MainLayout wrapper) */}
        <Route path="/home" element={<HomeV2 />} />

        {/* All file routes using Tailwind */}
        <Route path="/files" element={<TailwindLayout />}>
          <Route index element={<FilesPage />} />
          <Route path="files_shared" element={<FilesPage />} />
          <Route path="files_workflows" element={<FilesPage />} />
          <Route path="files_templates" element={<FilesPage />} />
          <Route path="files_docs" element={<FilesPage />} />
          <Route path="files_attestation" element={<FilesPage />} />
          <Route path="files_info" element={<FilesPage />} />
          <Route path="files_settings" element={<FilesSettings />} />
          <Route path="files_document_signature" element={<FilesPage />} />
          <Route path="files_domain_attestation" element={<FilesPage />} />
        </Route>


        {/* Routes with Chakra UI (wrapped in MainLayout) */}
        <Route path="/" element={<MainLayoutHolder />} >
          <Route index element={<Home />} />
          <Route path="/loading" element={<Loading />} />
          <Route path="/share/:identifier" element={<SharePage />} />
          <Route path="/aqua-forms" element={<AquaForms />} />
          <Route path="/pdf-signer" element={<PdfSigner fileData={null} setActiveStep={(_one) => { }} />} />
          <Route path="/workflow" element={<WorkFlowPage />} />
          <Route path="/form-generator" element={<FormGenerator />} />
          <Route path="/attestation_addresses" element={<AttestationAddresses />} />
        </Route>
        <Route path="*" element={<>404 page not found</>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App