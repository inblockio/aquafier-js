

export const SEPOLIA_SMART_CONTRACT_ADDRESS = "0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611"

// export const await API_ENDPOINT() =  //import.meta.env.VITE_API_ENDPOINT

// export const await API_ENDPOINT() = `http://${import.meta.env.VITE_REMOTE || '127.0.0.1'}:${ import.meta.env.VITE_REMOTE_PORT || 3600}`;


export const maxFileSizeForUpload = 200 * 1024 * 1024; // 200MB in bytes

export const SESSION_COOKIE_NAME = "pkc_nonce"

export const ETH_CHAINID_MAP: Record<string, string> = {
  'mainnet': '0x1',
  'sepolia': '0xaa36a7',
  'holesky': '0x4268',
}

export const ETH_CHAIN_ADDRESSES_MAP: Record<string, string> = {
  'mainnet': '0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611',
  'sepolia': '0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611',
  'holesky': '0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611',
}

export const WITNESS_NETWORK_MAP: Record<string, string> = {
  'mainnet': 'https://etherscan.io/tx',
  'sepolia': 'https://sepolia.etherscan.io/tx',
  'holesky': 'https://holesky.etherscan.io/tx',
}


// constants 

export const imageTypes = ["image/png", "image/jpeg", "image/gif", "image/svg+xml"];
export const documentTypes = ["application/pdf", "text/plain", "text/csv", "text/json", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
export const musicTypes = ["audio/mpeg", "audio/wav"];
export const videoTypes = ["video/mp4", "video/mpeg", "video/webm"];





// Function to initialize the backend URL
export const initializeBackendUrl = async (): Promise<string> => {
  let BACKEND_URL = "http://127.0.0.1:3000";
  try {
    // Fetch the config.json file from the public folder
    const response = await fetch('/config.json');

    // Check if the response is successful
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Parse the JSON
    const configData = await response.json();

    //  console.log("Data from config ", configData);
    // Update the BACKEND_URL
    BACKEND_URL = configData.BACKEND_URL || "http://127.0.0.1:3000";
    if (BACKEND_URL == "BACKEND_URL_PLACEHOLDER") {
      BACKEND_URL = "http://127.0.0.1:3000";
    }

    console.log("Config Backend URL", BACKEND_URL);
    if (BACKEND_URL.includes("inblock.io")) {
      BACKEND_URL = BACKEND_URL.replace("http:", "https:")
    }
    console.log("Config Backend URL Replaced http with https", BACKEND_URL);
  } catch (err) {
    // If there's an error, it will use the default URL
    console.error('Error reading config:', err);
  }

  return BACKEND_URL;
};


// const BACKEND_URL = "0.0.0.0.0";
// Generate endpoints function
// export const ENDPOINTS = () => ({
// SIWE_SIGN_IN: `${BACKEND_URL}/siwe`,
// FETCH_ADDRESS_BY_NONCE: `${BACKEND_URL}/session`,
// SIWE_SIGN_OUT: `${BACKEND_URL}/siwe_logout`,

// FETCH_USER_PROFILE: `${BACKEND_URL}/explorer_fetch_user_settings`,
// UPDATE_USER_PROFILE: `${BACKEND_URL}/explorer_update_user_settings`,

// EXPOLORER_FETCH_FILES: `${BACKEND_URL}/explorer_files`,
// SIGN_FILE: `${BACKEND_URL}/explorer_sign_revision`,
// WITNESS_FILE: `${BACKEND_URL}/explorer_witness_file`,
// DELETE_FILE: `${BACKEND_URL}/explorer_delete_file`,
// UPLOAD_FILE: `${BACKEND_URL}/explorer_file_upload`,
// IMPORT_AQUA_CHAIN: `${BACKEND_URL}/explorer_aqua_file_upload`,
// DELETE_ALL_FILES: `${BACKEND_URL}/explorer_delete_all_files`,
// });


export const testWitness = {
  "previous_verification_hash": "0x8fe3842787eb5d37c2fb170906a3d4c73c32b9dab7aab4525a06199fe9b9c823",
  "nonce": "AEkjaXCgfD2rP8ZGS-Xhl4eeksNRVOYlykWACBvVeXA",
  "local_timestamp": "20250123170100",
  "revision_type": "witness",
  "witness_merkle_root": "0x8fe3842787eb5d37c2fb170906a3d4c73c32b9dab7aab4525a06199fe9b9c823",
  "witness_timestamp": 1737651670.714,
  "witness_network": "sepolia",
  "witness_smart_contract_address": "0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611",
  "witness_transaction_hash": "0x5e251cbb45b6d10967d62699c72cf4b2461a77c44328672ba1e4f89e5315ab06",
  "witness_sender_account_address": "0x254b0d7b63342fcb8955db82e95c21d72efdb6f7",
  "leaves": [
    "122094ad4bd3302e0938a87a23d9d225f7bf7962c47b3f2ca0734a30a357c8af581b",
    "122071e44dd2406c0cb8aa408bb100702e82bd6fd1374493c858cfbb19c19a19bc1a",
    "1220e5896acf99aa79b74150e7a4a3c0b2d14b3583f01e5bc73f456913ab6fa27502",
    "12205f2bd542312d5563dc0fcc1e84db920de97f5da850cb61c0a4b91df7552107d7",
    "12202387faa774e45da95f88d24b6a5981e5249bb5a822d96adde2bb2675233f28e3",
    "122048dbbf279f071b09a08b27e71f9592cd47a22627890ce99d0f4359d8634aa340",
    "122023c4cad70ac832482ba0f59c1bea74a7af2aea0632c0ce96f2648feea788efea",
    "1220f7e65f1e66f9c6d7bfb490efc48870000f403db539a6c871baf723c7cd1ade6d",
    "1220e67624049b6137c2adabdc54291ad7ed20c9d75b70948f416d9bb50e7776168b",
    "1220a1b2e489fa5eece8dba25e3eddc67203da69c98559e4c964dbdd6d4da3095b62",
    "1220c828259c0c516bfe3bbf3d67027eae72ddd3cba24286a41db24c8a835b197e9c"
  ]
}