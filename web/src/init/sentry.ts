  import { WebConfig } from '../types/types'
import * as Sentry from "@sentry/react";

 export const setUpSentry = (config: WebConfig) => {
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