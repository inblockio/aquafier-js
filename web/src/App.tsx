import { ethers } from 'ethers'
import LoadConfiguration from './components/config'
import { initializeBackendUrl } from './utils/constants'
import { useEffect } from 'react'
import appStore from './store'
import { useStore } from 'zustand'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ErrorBoundary from './components/error_boundary'
import Loading from './pages/loading'
import PdfSigner from './pages/aqua_sign_wokflow/ContractDocument/PdfSigner'
import FilesPage from './pages/files'
import Home from './pages/home'
import TailwindMainLayout from './layouts/TailwindMainLayout'
import PageNotFound from './pages/page_not_found'
import InfoPage from './pages/info_page'
import SettingsPage from './pages/settings_page'
import TemplatesPage from './pages/templates_page'
import CreateFormInstance from './pages/create_form_instance'
import NewShadcnLayoutWithSidebar from './layouts/NewShadcnLayoutWithSidebar'
import PdfWorkflowPage from './pages/aqua_sign_wokflow/PdfWorkflowPage'
import DomainAttestationPage from './pages/domain_attestation'
import FilesSharedContracts from './pages/files_shared_contracts'
import WorkflowsTablePage from './pages/aqua_sign_wokflow/WorkflowsTablePage'
import SharePage from './pages/share_page'
import TermsAndConditions from './pages/legal/TermsAndConditions'
import PrivacyPolicy from './pages/legal/PrivacyPolicy'
import ClaimsAndAttestationPage from './pages/claim_and_attestation'
import ClaimsWorkflowPage from './pages/claims_workflow/claimsWorkflowPage'
import ClaimsWorkflowPageV2 from './pages/v2_claims_workflow/claimsWorkflowPage'
import WalletAutosuggestDemo from './pages/demo_auto_suggest'

declare global {
      interface Window {
            ethereum?: ethers.Eip1193Provider
      }
}

function App() {
      const { setBackEndUrl } = useStore(appStore)

      useEffect(() => {
            //  console.log("backedn url is", backend_url);
            // Properly handle async initialization
            const initBackend = async () => {
                  const url = await initializeBackendUrl()
                  setBackEndUrl(url)
            }

            initBackend()
      }, []) // Empty dependency array means this runs once on mount

      return (
            <BrowserRouter>
                  <LoadConfiguration />
                  <ErrorBoundary>
                        <Routes>
                              {/* Routes with Tailwind UI (no MainLayout wrapper) */}

                              <Route path="/" element={<TailwindMainLayout />}>
                                    <Route index element={<Home />} />
                                    <Route path="terms-and-conditions" element={<TermsAndConditions />} />
                                    <Route path="privacy-policy" element={<PrivacyPolicy />} />
                              </Route>
   
                              {/* All file routes using Tailwind */}
                              <Route path="/app" element={<NewShadcnLayoutWithSidebar />}>
                                    <Route index element={<FilesPage />} />
                                    <Route path="demo-auto-suggest" element={<WalletAutosuggestDemo />} />
                                    <Route path="pdf/workflow" element={<PdfWorkflowPage />} />
                                    <Route path="claims/workflow" element={<ClaimsWorkflowPage />} />
                                    <Route path="claims/workflow/:walletAddress" element={<ClaimsWorkflowPageV2 />} />
                                    <Route path="files_workflows" element={<FilesPage />} />
                                    <Route path="domain_attestation" element={<DomainAttestationPage />} />
                                    <Route path="claims_and_attestation" element={<ClaimsAndAttestationPage />} />

                                    <Route path="templates" element={<TemplatesPage />} />

                                    <Route path="shared-contracts" element={<FilesSharedContracts />} />
                                    <Route path="shared-contracts/:identifier" element={<SharePage />} />

                                    <Route path="settings" element={<SettingsPage />} />
                                    <Route path="info" element={<InfoPage />} />
                                    <Route path="workflows" element={<WorkflowsTablePage />} />
                                    <Route path="form-instance/:templateName" element={<CreateFormInstance />} />
                                    <Route path="loading" element={<Loading />} />
                                    <Route path="pdf-signer" element={<PdfSigner fileData={null} setActiveStep={_one => {}} />} />
                              </Route>


                              <Route path="*" element={<PageNotFound />} />
                        </Routes>
                  </ErrorBoundary>
            </BrowserRouter>
      )
}

export default App
