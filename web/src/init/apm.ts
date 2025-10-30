import { APMConfig } from "../types/apm";
import { init as initApm } from '@elastic/apm-rum'

export function startApm(config: APMConfig) {
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
