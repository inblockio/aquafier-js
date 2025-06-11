import { ethers } from 'ethers';
import MainLayout from './layouts/MainLayout'
import Home from './pages/Home'
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
// import Aquafier from 'aqua-js-sdk';
declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider;
  }
}

function App() {
  const {  setBackEndUrl } = useStore(appStore)


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
      <MainLayout>
        <Routes>
          <Route path="" element={<Home />} />
          
          <Route path="/loading" element={<Loading />} />
          <Route path="/share/:identifier" element={<SharePage />} />
          <Route path="/aqua-forms" element={<AquaForms /> } />
          <Route path="/pdf-signer" element={<PdfSigner  file={null}  setActiveStep={(_one)=>{

          }}/> } />
          <Route path="/workflow" element={<WorkFlowPage /> } />
          <Route path="/form-generator" element={<FormGenerator />} />
          <Route path="/attestation_addresses" element={<AttestationAddresses /> } />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  )
}

export default App