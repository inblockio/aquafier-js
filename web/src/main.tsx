import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import * as Sentry from "@sentry/react";


// Initialize Sentry for error tracking and performance monitoring
if (import.meta.env.VITE_SENTRY_DSN) {

  Sentry.init({
    dsn: "https://b71c74bbb56568b9af96dc877476a715@o4506135316987904.ingest.us.sentry.io/4509835029839872",
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
    // https://dev.inblock.io/
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


// Create a single root with all providers
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
