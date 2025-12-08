import { APMConfig } from "@/types/apm"
import { WebConfig } from "../types/types"
import { Building2, CheckCircle, CreditCard, Droplet, FileText, Globe, Mail, PenTool, Phone, Shield, User, UserCircle } from "lucide-react"
// import {APMConfig} from "@/types/apm.ts";

export const SEPOLIA_SMART_CONTRACT_ADDRESS = '0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611'
export const SYSTEM_WALLET_ADDRESS = "0xfabacc150f2a0000000000000000000000000000"

export const maxUserFileSizeForUpload = 1024 * 1024 * 1000 // 1 GB in bytes
export const maxFileSizeForUpload = 200 * 1024 * 1024 // 200MB in bytes

export const SESSION_COOKIE_NAME = 'pkc_nonce'
export const ERROR_TEXT = '--error--'
export const ERROR_UKNOWN = '--unknown--'
export const ETH_CHAINID_MAP: Record<string, string> = {
      mainnet: '0x1',
      sepolia: '0xaa36a7',
      holesky: '0x4268',
}
export const ETH_CHAINID_MAP_NUMBERS: Record<string, number> = {
      mainnet: 1,
      sepolia: 11155111,
      holesky: 17000,
}

export const ETH_CHAIN_ADDRESSES_MAP: Record<string, string> = {
      mainnet: '0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611',
      sepolia: '0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611',
      holesky: '0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611',
}

export const WITNESS_NETWORK_MAP: Record<string, string> = {
      mainnet: 'https://etherscan.io/tx',
      sepolia: 'https://sepolia.etherscan.io/tx',
      holesky: 'https://holesky.etherscan.io/tx',
}

// constants

export const imageTypes = [
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/svg+xml',
      'image/webp',
      'image/bmp',
      'image/heic',
      'image/heif',
]
export const documentTypes = ['application/pdf', 'text/plain', 'text/csv', 'text/json', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
export const musicTypes = ['audio/mpeg', 'audio/wav']
export const videoTypes = ['video/mp4', 'video/mpeg', 'video/webm']

// Function to initialize the backend URL
// Function to initialize the backend URL
export const initializeBackendUrl = async (): Promise<{
      backend_url: string,
      config: WebConfig,
      apmConfig: APMConfig
}> => {
      let BACKEND_URL = 'http://localhost:3000'
      let configObj: WebConfig = {}
      let apmConfig: APMConfig = new APMConfig();
      try {
            // Fetch the config.json file from the public folder
            const response = await fetch('/config.json')

            // Check if the response is successful
            if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`)
            }

            // Parse the JSON
            const configData = await response.json()

            //prepare APM-Config
            apmConfig = new APMConfig();
            apmConfig.enabled = configData.APM_ENABLED;
            apmConfig.serverUrl = configData.APM_SERVER_URL;
            apmConfig.serviceName = configData.APM_SERVICE_NAME;

            configObj = configData

            // Update the BACKEND_URL
            BACKEND_URL = configData.BACKEND_URL || 'http://localhost:3000'
            if (BACKEND_URL == 'BACKEND_URL_PLACEHOLDER') {
                  BACKEND_URL = 'http://localhost:3000'
            }

            // Check if URL doesn't start with http:// or https:// and prepend http://
            if (!BACKEND_URL.startsWith('http://') && !BACKEND_URL.startsWith('https://')) {
                  BACKEND_URL = 'http://' + BACKEND_URL
            }

            if (BACKEND_URL.includes('inblock.io')) {
                  BACKEND_URL = BACKEND_URL.replace('http:', 'https:')
            }

            // Handle duplicated inblock.io domains (e.g., https://dev.inblock.io/dev-api.inblock.io/session)
            if (BACKEND_URL.includes('inblock.io') && BACKEND_URL.match(/inblock\.io.*inblock\.io/)) {
                  // Remove the duplicated domain part
                  BACKEND_URL = BACKEND_URL.replace(/^(https?:\/\/[^\/]+)\/[^\/]*inblock\.io/, '$1')
            }
      } catch (err) {
            // If there's an error, it will use the default URL
            console.error('Error reading config:', err)
      }

      return { backend_url: BACKEND_URL, config: configObj, apmConfig: apmConfig }
}

export const testWitness = {
      previous_verification_hash: '0x8fe3842787eb5d37c2fb170906a3d4c73c32b9dab7aab4525a06199fe9b9c823',
      nonce: 'AEkjaXCgfD2rP8ZGS-Xhl4eeksNRVOYlykWACBvVeXA',
      local_timestamp: '20250123170100',
      revision_type: 'witness',
      witness_merkle_root: '0x8fe3842787eb5d37c2fb170906a3d4c73c32b9dab7aab4525a06199fe9b9c823',
      witness_timestamp: 1737651670.714,
      witness_network: 'sepolia',
      witness_smart_contract_address: '0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611',
      witness_transaction_hash: '0x5e251cbb45b6d10967d62699c72cf4b2461a77c44328672ba1e4f89e5315ab06',
      witness_sender_account_address: '0x254b0d7b63342fcb8955db82e95c21d72efdb6f7',
      leaves: [
            '122094ad4bd3302e0938a87a23d9d225f7bf7962c47b3f2ca0734a30a357c8af581b',
            '122071e44dd2406c0cb8aa408bb100702e82bd6fd1374493c858cfbb19c19a19bc1a',
            '1220e5896acf99aa79b74150e7a4a3c0b2d14b3583f01e5bc73f456913ab6fa27502',
            '12205f2bd542312d5563dc0fcc1e84db920de97f5da850cb61c0a4b91df7552107d7',
            '12202387faa774e45da95f88d24b6a5981e5249bb5a822d96adde2bb2675233f28e3',
            '122048dbbf279f071b09a08b27e71f9592cd47a22627890ce99d0f4359d8634aa340',
            '122023c4cad70ac832482ba0f59c1bea74a7af2aea0632c0ce96f2648feea788efea',
            '1220f7e65f1e66f9c6d7bfb490efc48870000f403db539a6c871baf723c7cd1ade6d',
            '1220e67624049b6137c2adabdc54291ad7ed20c9d75b70948f416d9bb50e7776168b',
            '1220a1b2e489fa5eece8dba25e3eddc67203da69c98559e4c964dbdd6d4da3095b62',
            '1220c828259c0c516bfe3bbf3d67027eae72ddd3cba24286a41db24c8a835b197e9c',
      ],
}

export const API_ENDPOINTS = {
      NOTIFICATIONS: '/notifications',
      NOTIFICATIONS_READ_ALL: '/notifications/read-all',
      MARK_NOTIFICATION_AS_READ: '/notifications/:id/read',
      GET_PER_TYPE: 'tree/per_type',
      USER_STATS: 'user_data_stats',
      ALL_USER_FILES: 'tree/all_files',
      USER_AQUA_FILES: 'tree/aqua_files',
      SYSTEM_AQUA_FILES: 'system/aqua_tree',
      SYSTEM_AQUA_FILES_NAMES: 'system/aqua_tree/names',
      LINKED_FILES: '/tree/by_genesis_hash',
      SEND_NOTIFICATION: 'api/notifications/:wallet_address',
      GET_AQUA_TREE: 'tree/revision_hash',
      TRIGGER_WEBSOCKET: 'trigger/websocket'
}


export const iconMap: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
      access_agreement: Shield,
      aqua_sign: Droplet,
      cheque: CreditCard,
      dba_claim: Building2,
      identity_attestation: CheckCircle,
      identity_claim: User,
      user_signature: PenTool,
      domain_claim: Globe,
      email_claim: Mail,
      phone_number_claim: Phone,
      user_profile: UserCircle
};

export const getClaimIcon = (claimType: string) => {
      return iconMap[claimType] || FileText;
};

export const IDENTITY_CLAIMS = ['identity_claim', 'user_signature', 'email_claim', 'phone_number_claim', 'domain_claim', 'identity_attestation']

export const CLAIMS = new Set([
    "user_profile",
    "identity_claim",
    "identity_attestation",
    "domain_claim",
    "email_claim",
    "phone_number_claim",
    "user_signature",
]);