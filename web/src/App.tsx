import LoadConfiguration from './components/config'
import { initializeBackendUrl } from './utils/constants'
import { useEffect } from 'react'
import appStore from './store'
import { useStore } from 'zustand'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ErrorBoundary from './components/error_boundary'
import Loading from './pages/loading'
import PdfSigner from './pages/aqua_sign_wokflow/ContractDocument/PdfSigner'
import FilesPage from './pages/files/files'
import Home from './pages/home'
import TailwindMainLayout from './layouts/TailwindMainLayout'
import PageNotFound from './pages/page_not_found'
import InfoPage from './pages/info_page'
import SettingsPage from './pages/user_settings/settings_page'
import TemplatesPage from './pages/templates_page'
import CreateFormInstance from './pages/create_form_instance'
import NewShadcnLayoutWithSidebar from './layouts/NewShadcnLayoutWithSidebar'
import PdfWorkflowPage from './pages/aqua_sign_wokflow/PdfWorkflowPage'
import DomainAttestationPage from './pages/domain_attestation'
import FilesSharedContracts from './pages/files_share/files_shared_contracts'
import WorkflowsTablePage from './pages/aqua_sign_wokflow/WorkflowsTablePage'
import SharePage from './pages/share_page'
import TermsAndConditions from './pages/legal/TermsAndConditions'
import PrivacyPolicy from './pages/legal/PrivacyPolicy'
import ClaimsAndAttestationPage from './pages/claim_and_attestation'
import ClaimsWorkflowPage from './pages/claims_workflow/claimsWorkflowPage'
import ClaimsWorkflowPageV2 from './pages/v2_claims_workflow/claimsWorkflowPage'
// Import appkit config to initialize AppKit at module level
// import './config/appkit'

import { WebConfig } from './types/types'
import * as Sentry from "@sentry/react";
import { init as initApm } from '@elastic/apm-rum'
import { APMConfig } from "@/types/apm.ts";
import ContactsPageV2 from './pages/contacts/contactsV2'


function startApm(config: APMConfig) {
    if (config.enabled && config.serviceName && config.serverUrl) {
        initApm({
            serviceName: config.serviceName,
            serverUrl: config.serverUrl,
            distributedTracing: true,
            // Exclude WalletConnect/Reown domains from distributed tracing to avoid CORS issues
            distributedTracingOrigins: [
                /^http?:\/\/localhost/,
                /^https?:\/\/.*\.inblock\.io/,
                /^https?:\/\/aquafier\./,
                // Exclude WalletConnect/Reown RPC endpoints
                "!https://rpc.walletconnect.org",
                "!https://rpc.walletconnect.com",
                "!https://relay.walletconnect.com",
                "!https://relay.walletconnect.org",
                "!https://explorer-api.walletconnect.com",
                "!https://keys.walletconnect.com"
            ]
        })
    }
}

function App() {
    const { setBackEndUrl, setWebConfig } = useStore(appStore)

    const setUpSentry = (config: WebConfig) => {
        // Initialize Sentry for error tracking
        // Initialize Sentry for error tracking and performance monitoring
        if (config.SENTRY_DSN) {

            Sentry.init({
                dsn: config.SENTRY_DSN,
                // Setting this option to true will send default PII data to Sentry.
                // For example, automatic IP address collection on events
                sendDefaultPii: true,
                integrations: [
                    Sentry.browserTracingIntegration(),
                    Sentry.replayIntegration()
                ],
                // Tracing
                tracesSampleRate: 1.0, //  Capture 100% of the transactions
                // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
                // Exclude WalletConnect/Reown domains to avoid CORS issues
                tracePropagationTargets: [
                    "localhost",
                    /^https:\/\/dev\.inblock\.io\//,
                    /^https:\/\/aquafier\.inblock\.io\//,
                    /^http:\/\/localhost:5173\//
                ],
                // Session Replay
                replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
                replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.,
                // Enable logs to be sent to Sentry
                enableLogs: true
            });
        }


    }

    const initBackend = async () => {
        const { backend_url, config, apmConfig } = await initializeBackendUrl()
        startApm(apmConfig)
        setBackEndUrl(backend_url)
        setUpSentry(config)
        setWebConfig(config)


        // Conditionally import AppKit based on AUTH_PROVIDER
        if (config.AUTH_PROVIDER === 'wallet_connect') {
            await import('./config/appkit')
            // console.log('AppKit initialized for wallet_connect')
        }
    }

    useEffect(() => {
        initBackend()
    }, []) // Empty dependency array means this runs once on mount

    console.log("nothing")


    return (
        <BrowserRouter>
            <LoadConfiguration />
            <ErrorBoundary>
            <Routes>
                <Route path="/" element={<TailwindMainLayout />}>
                        <Route index element={<Home />} />
                        <Route path="terms-and-conditions" element={<TermsAndConditions />} />
                        <Route path="privacy-policy" element={<PrivacyPolicy />} />
                    </Route>

                <Route path="/app" element={<NewShadcnLayoutWithSidebar />}>

                        <Route index element={<FilesPage />} />
                        <Route path="templates" element={<TemplatesPage />} />
                        <Route path="shared-contracts" element={<FilesSharedContracts />} />
                        <Route path="shared-contracts/:identifier" element={<SharePage />} />

                        <Route path="workflows" element={<WorkflowsTablePage />} />
                        <Route path="claims_and_attestation" element={<ClaimsAndAttestationPage />} />
                        <Route path="contact_list" element={<ContactsPageV2 />} />
                        <Route path="claims/workflow" element={<ClaimsWorkflowPage />} />
                        <Route path="claims/workflow/:walletAddress" element={<ClaimsWorkflowPageV2 />} />

                        <Route path="pdf/workflow" element={<PdfWorkflowPage />} />
                        <Route path="pdf-signer" element={<PdfSigner fileData={null} setActiveStep={_one => {
                        }} />} />
                        <Route path="files_workflows" element={<FilesPage />} />
                        <Route path="domain_attestation" element={<DomainAttestationPage />} />



                        <Route path="info" element={<InfoPage />} />
                        <Route path="settings" element={<SettingsPage />} />

                        <Route path="form-instance/:templateName" element={<CreateFormInstance />} />
                        <Route path="loading" element={<Loading />} />
                    </Route>

                <Route path="*" element={<PageNotFound />} />
            </Routes>
            </ErrorBoundary>
        </BrowserRouter>
    )
}

export default App
