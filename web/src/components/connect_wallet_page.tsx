import { useState } from "react";
// import { Button } from "./chakra-ui/button";
// import { DialogBody, DialogCloseTrigger, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./chakra-ui/dialog";
// import { Center, Dialog, Text, VStack } from "@chakra-ui/react";
import { LuCircleCheck, LuCircleX, LuCopy, LuLogOut, LuWallet } from "react-icons/lu";
// import ReactLoading from "react-loading";
import { ClipLoader } from "react-spinners";
import { fetchFiles, formatCryptoAddress, generateAvatar, getCookie, setCookie } from "../utils/functions";
import { SiweMessage, generateNonce } from "siwe";
import { SESSION_COOKIE_NAME } from "../utils/constants";
import axios from "axios";
import { useStore } from "zustand";
import appStore from "../store";
import { BrowserProvider, ethers } from "ethers";

// import { Button } from "./components//ui/button";
// import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from ".//components//ui/dialog";
// import { Avatar, AvatarFallback, AvatarImage } from ".//components//ui/avatar";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
// import { Alert, AlertDescription } from ".//components//ui/alert";

const CustomCopyButton = ({ value }: { value: string }) => {
  // const clipboard = useClipboard({ value: value })
  return (
    <Button data-testid="custom-copy-button" variant="default" size="sm" onClick={() => navigator.clipboard.writeText(value)} className="flex items-center gap-2 rounded-md">
      {"Copy Address"}
      <LuCopy />
    </Button>
  )
}



export const ConnectWalletPage: React.FC<{ dataTestId: string }> = ({ dataTestId }) => {
  const { setMetamaskAddress, session, setFiles, avatar, setAvatar, setUserProfile, backend_url, setSession } = useStore(appStore);

  const [isConnecting, setIsConnecting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connectionState, setConnectionState] = useState<"idle" | "connecting" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  // const [avatar, setAvatar] = useState("")
  const [_progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const iconSize = "120px";

  const resetState = () => {
    setConnectionState("idle");
    setProgress(0);
  };

  function createSiweMessage(address: string, statement: string) {
    // const scheme = window.location.protocol.slice(0, -1);
    const domain = window.location.host;
    const origin = window.location.origin;
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const message = new SiweMessage({
      // Setting scheme is giving out lots of headaches
      // scheme: scheme,
      domain,
      address,
      statement,
      uri: origin,
      version: "1",
      chainId: 2,
      nonce: generateNonce(),
      expirationTime: expiry,
      issuedAt: new Date(Date.now()).toISOString(),
    });
    return message.prepareMessage();
  }

  const signAndConnect = async () => {
    console.log("Connecting to wallet");

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Function to check if MetaMask is installed
    const isMetaMaskInstalled = () => !!window.ethereum;

    if (isMetaMaskInstalled()) {
      setLoading(true);
      setConnectionState("connecting");
      const provider = new BrowserProvider(window.ethereum!);

      try {
        // Request connection
        await window.ethereum!.request({ method: "eth_requestAccounts" });
        const signer = await provider.getSigner();

        // Generate SIWE message
        const domain = window.location.host;
        const message = createSiweMessage(signer.address, "Sign in with Ethereum to the app.");
        const signature = await signer.signMessage(message);
        // console.log("--Signature", signature)
        // console.log("-- Adress", signer.address)
        // Send session request
        const response = await axios.post(`${backend_url}/session`, {
          message,
          signature,
          domain
        });

        if (response.status === 200 || response.status === 201) {
          const responseData = response.data;
          const walletAddress = ethers.getAddress(responseData?.session?.address);
          setMetamaskAddress(walletAddress);
          setAvatar(generateAvatar(walletAddress));

          setCookie(SESSION_COOKIE_NAME, `${responseData.session.nonce}`,
            new Date(responseData?.session?.expiration_time));

          setConnectionState("success");
          setUserProfile({ ...response.data.user_settings });
          setSession({ ...response.data.session });

          const files = await fetchFiles(walletAddress, `${backend_url}/explorer_files`, responseData.session.nonce);
          setFiles(files);
        }

        setLoading(false);
        setMessage(null);
        toast("Sign In successful", {
          description: "Sign In successful",
        });

        setTimeout(() => {
          setIsOpen(false);
          resetState();
          setLoading(false);
          setMessage(null);
        }, 2000);
      } catch (error: any) {
        console.error("Error connecting:", error);
        setConnectionState("error");
        setLoading(false);
        setMessage(error.toString().includes("4001") ?
          "You have rejected signing the message." :
          "An error occurred while connecting.");
        toast(error.toString().includes("4001") ?
          "You have rejected signing the message." :
          "An error occurred while connecting.");
      }
    } else {
      // Handle mobile deep linking if MetaMask is not installed
      if (isMobile) {
        const currentDomain = window.location.host;
        const currentPath = window.location.pathname;

        const metamaskDeepLink = `https://metamask.app.link/dapp/${currentDomain}${currentPath}`;
        const metamaskAppLink = `metamask://dapp/${currentDomain}${currentPath}`;

        try {
          // Open MetaMask deep link in a new tab
          window.open(metamaskDeepLink, "_self");

          // If MetaMask doesn't open, fall back to alternative link
          setTimeout(() => {
            window.open(metamaskAppLink, "_self");

            // If still no response, redirect to MetaMask download page
            setTimeout(() => {
              if (!isMetaMaskInstalled()) {
                toast("MetaMask is not installed. Redirecting to download page.");
                window.location.href = "https://metamask.io/download/";
              }
            }, 2000);
          }, 1000);
        } catch (e) {
          console.error("Deep link error:", e);
          toast("Failed to open MetaMask. You may need to install it first.");
          window.location.href = "https://metamask.io/download/";
        }
      } else {
        toast("MetaMask is not installed. Please install it to connect.");
      }
    }
  };


  const signOut = () => {
    setLoading(true);
    setCookie(SESSION_COOKIE_NAME, "", new Date("1970-01-01T00:00:00Z"));
    setMetamaskAddress(null);
    setAvatar(undefined);
    setLoading(false);
    setIsOpen(false);
    toast("Signed out successfully");
  };

  const signOutFromSiweSession = async () => {
    setLoading(true);
    try {
      // const formData = new URLSearchParams();
      const nonce = getCookie("pkc_nonce");
      // formData.append("nonce", nonce);

      const url = `${backend_url}/session`;
      //  console.log("url is ", url);
      const response = await axios.delete(url, {
        params: {
          nonce
        }
      });

      if (response.status === 200) {
        signOut();
        setMetamaskAddress(null);
        setAvatar(undefined);
        setSession(null)
        setFiles([]);
        // disConnectWebsocket()
      }
    } catch (error: any) {
      console.log("error", error)
      // if (error?.response?.status === 404 || error?.response?.status === 401) {
      setMetamaskAddress(null);
      setAvatar(undefined);
      setSession(null)
      setFiles([]);
      // }
    }
    setLoading(false);
    setIsOpen(false);
    toast("Signed out successfully");
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-purple-300 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to Aquafier
          </h1>
          <p className="text-gray-600 text-sm">
            Connect your Web3 wallet to get started
          </p>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
        )}


        <button
          onClick={() => {
            setIsOpen(true);
            !session && signAndConnect();
          }}
          data-testid="sign-in-button-page"
          disabled={isConnecting}
          className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          {isConnecting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Connecting...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.483 6.125C3.483 5.504 3.987 5 4.608 5h14.784c.621 0 1.125.504 1.125 1.125v11.75c0 .621-.504 1.125-1.125 1.125H4.608c-.621 0-1.125-.504-1.125-1.125V6.125zM5.233 6.75v10.5h13.534V6.75H5.233z" />
                <path d="M7.5 9.75h9v1.5h-9v-1.5zm0 3h6v1.5h-6v-1.5z" />
              </svg>
              Sign in
            </>
          )}
        </button>

        {/* {account ? (
          <div className="text-center">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-green-700 font-medium">Connected!</p>
              <p className="text-xs text-green-600 mt-1 break-all">
                {account}
              </p>
            </div>
            <button
              onClick={() => {
                setAccount('');
                setError('');
              }}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Disconnect
            </button>
          </div>
        ) : (
          
        )} */}

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            By connecting, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );

 
}


// import { useState, useEffect } from "react";
// import { LuCircleCheck, LuCircleX, LuCopy, LuLogOut, LuWallet } from "react-icons/lu";
// import { ClipLoader } from "react-spinners";
// import { fetchFiles, formatCryptoAddress, generateAvatar, getCookie, setCookie } from "../utils/functions";
// import { SiweMessage, generateNonce } from "siwe";
// import { SESSION_COOKIE_NAME } from "../utils/constants";
// // import axios from "axios"; // You'll need to use your existing axios import
// import { useStore } from "zustand";
// import appStore from "../store";
// import { BrowserProvider, ethers } from "ethers";

// import { Button } from ".//components//ui/button";
// import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from ".//components//ui/dialog";
// import { Avatar, AvatarFallback, AvatarImage } from ".//components//ui/avatar";
// import { toast } from "sonner";
// import { Alert, AlertDescription } from ".//components//ui/alert";
// import { useNavigate } from "react-router-dom";
// import axios from "axios";

// // Wallet configuration
// const WALLET_CONFIG = {
//   metamask: {
//     name: 'MetaMask',
//     icon: (
//       <svg className="w-8 h-8" viewBox="0 0 142 136.878" xmlns="http://www.w3.org/2000/svg">
//         <path fill="#FF5C16" d="M132.682,132.192l-30.583-9.106l-23.063,13.787l-16.092-0.007l-23.077-13.78l-30.569,9.106L0,100.801
//     l9.299-34.839L0,36.507L9.299,0l47.766,28.538h27.85L132.682,0l9.299,36.507l-9.299,29.455l9.299,34.839L132.682,132.192z"/>
//         <path fill="#FF5C16" d="M9.305,0l47.767,28.558l-1.899,19.599L9.305,0z M39.875,100.814l21.017,16.01l-21.017,6.261
//     C39.875,123.085,39.875,100.814,39.875,100.814z M59.212,74.345l-4.039-26.174L29.317,65.97l-0.014-0.007v0.013l0.08,18.321
//     l10.485-9.951L59.212,74.345z M132.682,0L84.915,28.558l1.893,19.599L132.682,0z M102.113,100.814l-21.018,16.01
//     l21.018,6.261V100.814z M112.678,65.975h0.007v-0.013l-0.006,0.007L86.815,48.171l-4.039,26.174h19.336l10.492,9.95
//     C112.604,84.295,112.678,65.975,112.678,65.975z"/>
//         <path fill="#E34807" d="M39.868,123.085l-30.569,9.106L0,100.814h39.868V123.085z M59.205,74.338l5.839,37.84l-8.093-21.04
//     L29.37,84.295l10.491-9.956h19.344L59.205,74.338z M102.112,123.085l30.57,9.106l9.299-31.378h-39.869V123.085z M82.776,74.338
//     l-5.839,37.84l8.092-21.04l27.583-6.843l-10.498-9.956H82.776z"/>
//         <path fill="#FF8D5D" d="M0,100.801l9.299-34.839h19.997l0.073,18.327l27.584,6.843l8.092,21.039l-4.16,4.633l-21.017-16.01H0
//     V100.801z M141.981,100.801l-9.299-34.839h-19.998l-0.073,18.327l-27.582,6.843l-8.093,21.039l4.159,4.633l21.018-16.01h39.868
//     V100.801z M84.915,28.538h-27.85l-1.891,19.599l9.872,64.013h11.891l9.878-64.013L84.915,28.538z"/>
//         <path fill="#661800" d="M9.299,0L0,36.507l9.299,29.455h19.997l25.87-17.804L9.299,0z M53.426,81.938h-9.059l-4.932,4.835
//     l17.524,4.344l-3.533-9.186V81.938z M132.682,0l9.299,36.507l-9.299,29.455h-19.998L86.815,48.158L132.682,0z M88.568,81.938
//     h9.072l4.932,4.841l-17.544,4.353l3.54-9.201V81.938z M79.029,124.385l2.067-7.567l-4.16-4.633h-11.9l-4.159,4.633l2.066,7.567"/>
//         <path fill="#C0C4CD" d="M79.029,124.384v12.495H62.945v-12.495H79.029z" />
//         <path fill="#E7EBF6" d="M39.875,123.072l23.083,13.8v-12.495l-2.067-7.566C60.891,116.811,39.875,123.072,39.875,123.072z
//     M102.113,123.072l-23.084,13.8v-12.495l2.067-7.566C81.096,116.811,102.113,123.072,102.113,123.072z"/>
//       </svg>


//     ),
//     description: 'Connect with MetaMask wallet',
//     blockchain: 'ethereum',
//     detect: () => typeof window !== 'undefined' && window.ethereum?.isMetaMask
//   },
//   phantom: {
//     name: 'Phantom',
//     icon: (
//       <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
//         <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="#8B5CF6" />
//         <circle cx="9" cy="9" r="1.5" fill="white" />
//         <circle cx="15" cy="9" r="1.5" fill="white" />
//         <path d="M8 13.5c0 2.21 1.79 4 4 4s4-1.79 4-4" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
//       </svg>
//     ),
//     description: 'Connect with Phantom wallet',
//     blockchain: 'solana',
//     detect: () => typeof window !== 'undefined' && window.solana?.isPhantom
//   },
//   coinbase: {
//     name: 'Coinbase Wallet',
//     icon: (
//       <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
//         <rect width="24" height="24" rx="12" fill="#0052FF" />
//         <rect x="8" y="8" width="8" height="8" rx="2" fill="white" />
//       </svg>
//     ),
//     description: 'Connect with Coinbase wallet',
//     blockchain: 'ethereum',
//     detect: () => typeof window !== 'undefined' && window.ethereum?.isCoinbaseWallet
//   },
//   walletconnect: {
//     name: 'WalletConnect',
//     icon: (
//       <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
//         <path d="M5 9c3.5-3.5 9.5-3.5 13 0l.5.5c.2.2.2.5 0 .7l-1.5 1.5c-.1.1-.3.1-.4 0l-.7-.7c-2.5-2.5-6.5-2.5-9 0l-.7.7c-.1.1-.3.1-.4 0L4.5 10.2c-.2-.2-.2-.5 0-.7L5 9z" fill="#3B99FC" />
//         <path d="M19.5 12.5l1.3 1.3c.2.2.2.5 0 .7l-6 6c-.2.2-.5.2-.7 0l-4.2-4.2c-.1-.1-.1-.1 0-.2l4.2-4.2c.2-.2.5-.2.7 0l4.7 4.7z" fill="#3B99FC" />
//       </svg>
//     ),
//     description: 'Connect with WalletConnect',
//     blockchain: 'ethereum',
//     detect: () => false // Only show when explicitly implemented
//   },
//   // Add more wallet configurations as needed
//   trust: {
//     name: 'Trust Wallet',
//     icon: (
//       <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
//         <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" fill="#3375BB" />
//       </svg>
//     ),
//     description: 'Connect with Trust Wallet',
//     blockchain: 'ethereum',
//     detect: () => typeof window !== 'undefined' && window.ethereum?.isTrust
//   },
//   brave: {
//     name: 'Brave Wallet',
//     icon: (
//       <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
//         <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#FB542B" />
//       </svg>
//     ),
//     description: 'Connect with Brave Wallet',
//     blockchain: 'ethereum',
//     detect: () => typeof window !== 'undefined' && window.ethereum?.isBraveWallet
//   },
//   rabby: {
//     name: 'Rabby Wallet',
//     icon: (
//       <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
//         <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#7084FF" />
//       </svg>
//     ),
//     description: 'Connect with Rabby Wallet',
//     blockchain: 'ethereum',
//     detect: () => typeof window !== 'undefined' && window.ethereum?.isRabby
//   }
// };

// const CustomCopyButton = ({ value }: { value: string }) => {
//   return (
//     <Button
//       data-testid="custom-copy-button"
//       variant="default"
//       size="sm"
//       onClick={() => navigator.clipboard.writeText(value)}
//       className="flex items-center gap-2 rounded-md"
//     >
//       Copy Address
//       <LuCopy />
//     </Button>
//   );
// };

// export const ConnectWalletPage: React.FC<{ dataTestId: string }> = ({ dataTestId }) => {
//   const { setMetamaskAddress, session, setFiles, avatar, setAvatar, setUserProfile, backend_url, setSession } = useStore(appStore);

//   const [isConnecting, setIsConnecting] = useState(false);
//   const [isOpen, setIsOpen] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [connectionState, setConnectionState] = useState<"idle" | "connecting" | "success" | "error">("idle");
//   const [message, setMessage] = useState<string | null>(null);
//   const [error, setError] = useState('');
//   const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
//   const [showWalletSelection, setShowWalletSelection] = useState(true);
//   const [detectedWallets, setDetectedWallets] = useState<Array<{ id: string; config: any }>>([]);

//   let navigate = useNavigate();

//   // Detect wallets on component mount and periodically
//   useEffect(() => {
//     const detectWallets = () => {
//       const detected = Object.entries(WALLET_CONFIG)
//         .filter(([id, config]) => config.detect())
//         .map(([id, config]) => ({ id, config }));

//       setDetectedWallets(detected);
//     };

//     // Initial detection
//     detectWallets();

//     // Set up interval to periodically check for new wallets
//     const interval = setInterval(detectWallets, 2000);

//     // Also listen for wallet injection events
//     const handleEthereumEvents = () => {
//       setTimeout(detectWallets, 1000); // Small delay to allow wallet to fully initialize
//     };

//     window.addEventListener('ethereum#initialized', handleEthereumEvents);

//     return () => {
//       clearInterval(interval);
//       window.removeEventListener('ethereum#initialized', handleEthereumEvents);
//     };
//   }, []);

//   useEffect(() => {

//   }, []);


//   const resetState = () => {
//     setConnectionState("idle");
//     setShowWalletSelection(true);
//     setSelectedWallet(null);
//   };

//   function createSiweMessage(address: string, statement: string) {
//     const domain = window.location.host;
//     const origin = window.location.origin;
//     const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
//     const message = new SiweMessage({
//       domain,
//       address,
//       statement,
//       uri: origin,
//       version: "1",
//       chainId: 2,
//       nonce: generateNonce(),
//       expirationTime: expiry,
//       issuedAt: new Date(Date.now()).toISOString(),
//     });
//     return message.prepareMessage();
//   }

//   const connectMetaMask = async () => {
//     console.log("Connecting to MetaMask");
//     const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

//     if (window.ethereum?.isMetaMask) {
//       setLoading(true);
//       setConnectionState("connecting");
//       const provider = new BrowserProvider(window.ethereum);

//       try {
//         await window.ethereum.request({ method: "eth_requestAccounts" });
//         const signer = await provider.getSigner();

//         const domain = window.location.host;
//         const message = createSiweMessage(signer.address, "Sign in with Ethereum to the app.");
//         const signature = await signer.signMessage(message);

//         const response = await axios.post(`${backend_url}/session`, {
//           message,
//           signature,
//           domain
//         });

//         if (response.status === 200 || response.status === 201) {
//           const responseData = response.data;
//           const walletAddress = ethers.getAddress(responseData?.session?.address);
//           setMetamaskAddress(walletAddress);
//           setAvatar(generateAvatar(walletAddress));

//           setCookie(SESSION_COOKIE_NAME, `${responseData.session.nonce}`,
//             new Date(responseData?.session?.expiration_time));

//           setConnectionState("success");
//           setUserProfile({ ...response.data.user_settings });
//           setSession({ ...response.data.session });

//           const files = await fetchFiles(walletAddress, `${backend_url}/explorer_files`, responseData.session.nonce);
//           setFiles(files);


//           navigate("/")
//         }

//         setLoading(false);
//         setMessage(null);
//         toast("Sign In successful", {
//           description: "MetaMask connected successfully",
//         });

//         setTimeout(() => {
//           setIsOpen(false);
//           resetState();
//           setLoading(false);
//           setMessage(null);
//         }, 2000);
//       } catch (error: any) {
//         console.error("Error connecting:", error);
//         setConnectionState("error");
//         setLoading(false);
//         setMessage(error.toString().includes("4001") ?
//           "You have rejected signing the message." :
//           "An error occurred while connecting.");
//         toast(error.toString().includes("4001") ?
//           "You have rejected signing the message." :
//           "An error occurred while connecting.");
//       }
//     } else {
//       if (isMobile) {
//         const currentDomain = window.location.host;
//         const currentPath = window.location.pathname;
//         const metamaskDeepLink = `https://metamask.app.link/dapp/${currentDomain}${currentPath}`;

//         try {
//           window.open(metamaskDeepLink, "_self");
//           setTimeout(() => {
//             if (!window.ethereum?.isMetaMask) {
//               toast("MetaMask is not installed. Redirecting to download page.");
//               window.location.href = "https://metamask.io/download/";
//             }
//           }, 2000);
//         } catch (e) {
//           console.error("Deep link error:", e);
//           toast("Failed to open MetaMask. You may need to install it first.");
//           window.location.href = "https://metamask.io/download/";
//         }
//       } else {
//         toast("MetaMask is not installed. Please install it to connect.");
//         window.open("https://metamask.io/download/", "_blank");
//       }
//     }
//   };

//   const connectPhantom = async () => {
//     console.log("Connecting to Phantom");

//     if (window.solana?.isPhantom) {
//       setLoading(true);
//       setConnectionState("connecting");

//       try {
//         const response = await window.solana.connect();
//         const publicKey = response.publicKey.toString();

//         // For Phantom, you might need to implement a different signing mechanism
//         // This is a simplified example - you'd need to adapt based on your backend
//         toast("Phantom connected successfully", {
//           description: `Connected with address: ${publicKey.substring(0, 8)}...`,
//         });

//         setConnectionState("success");
//         setLoading(false);

//         setTimeout(() => {
//           setIsOpen(false);
//           resetState();
//           setLoading(false);
//           setMessage(null);
//         }, 2000);

//       } catch (error: any) {
//         console.error("Error connecting to Phantom:", error);
//         setConnectionState("error");
//         setLoading(false);
//         setMessage("Failed to connect to Phantom wallet");
//         toast("Failed to connect to Phantom wallet");
//       }
//     } else {
//       toast("Phantom wallet is not installed. Please install it to connect.");
//       window.open("https://phantom.app/", "_blank");
//     }
//   };

//   const connectCoinbase = async () => {
//     console.log("Connecting to Coinbase Wallet");

//     if (window.ethereum?.isCoinbaseWallet) {
//       // Similar to MetaMask but for Coinbase
//       toast("Coinbase Wallet connection coming soon!");
//     } else {
//       toast("Coinbase Wallet is not installed. Please install it to connect.");
//       window.open("https://www.coinbase.com/wallet", "_blank");
//     }
//   };

//   const connectWalletConnect = async () => {
//     console.log("Connecting with WalletConnect");
//     toast("WalletConnect integration coming soon!");
//   };

//   const connectGenericEthereumWallet = async (walletName: string) => {
//     console.log(`Connecting to ${walletName}`);

//     if (window.ethereum) {
//       setLoading(true);
//       setConnectionState("connecting");

//       try {
//         // Request account access
//         await window.ethereum.request({ method: 'eth_requestAccounts' });

//         // For now, just show success - you can implement full SIWE flow later
//         toast(`${walletName} connected successfully`);
//         setConnectionState("success");

//         setTimeout(() => {
//           setIsOpen(false);
//           resetState();
//           setLoading(false);
//           setMessage(null);
//         }, 2000);

//       } catch (error: any) {
//         console.error(`Error connecting to ${walletName}:`, error);
//         setConnectionState("error");
//         setLoading(false);
//         setMessage(`Failed to connect to ${walletName}`);
//         toast(`Failed to connect to ${walletName}`);
//       }
//     } else {
//       toast(`${walletName} is not available. Please install it to connect.`);
//     }
//   };

//   const handleWalletConnection = async (walletId: string) => {
//     setSelectedWallet(walletId);
//     setShowWalletSelection(false);
//     setIsConnecting(true);

//     switch (walletId) {
//       case 'metamask':
//         await connectMetaMask();
//         break;
//       case 'phantom':
//         await connectPhantom();
//         break;
//       case 'coinbase':
//         await connectCoinbase();
//         break;
//       case 'walletconnect':
//         await connectWalletConnect();
//         break;
//       case 'trust':
//       case 'brave':
//       case 'rabby':
//         await connectGenericEthereumWallet(WALLET_CONFIG[walletId].name);
//         break;
//       default:
//         toast("Wallet not supported yet");
//     }

//     setIsConnecting(false);
//   };

//   const signOut = () => {
//     setLoading(true);
//     setCookie(SESSION_COOKIE_NAME, "", new Date("1970-01-01T00:00:00Z"));
//     setMetamaskAddress(null);
//     setAvatar(undefined);
//     setLoading(false);
//     setIsOpen(false);
//     toast("Signed out successfully");
//   };

//   const signOutFromSiweSession = async () => {
//     setLoading(true);
//     try {
//       const nonce = getCookie("pkc_nonce");
//       const url = `${backend_url}/session`;
//       const response = await axios.delete(url, {
//         params: { nonce }
//       });

//       if (response.status === 200) {
//         signOut();
//         setMetamaskAddress(null);
//         setAvatar(undefined);
//         setSession(null);
//         setFiles([]);
//       }
//     } catch (error: any) {
//       console.log("error", error);
//       setMetamaskAddress(null);
//       setAvatar(undefined);
//       setSession(null);
//       setFiles([]);
//     }
//     setLoading(false);
//     setIsOpen(false);
//     toast("Signed out successfully");
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
//       <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 w-full max-w-md">
//         <div className="text-center mb-8">
//           <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-purple-300 rounded-full flex items-center justify-center mx-auto mb-4">
//             <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
//               <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
//             </svg>
//           </div>
//           <h1 className="text-2xl font-bold text-gray-900 mb-2">
//             Welcome to Aquafier
//           </h1>
//           <p className="text-gray-600 text-sm">
//             Connect your Web3 wallet to get started
//           </p>
//         </div>

//         {error && (
//           <Alert className="mb-6 border-red-200 bg-red-50">
//             <AlertDescription className="text-red-700">
//               {error}
//             </AlertDescription>
//           </Alert>
//         )}

//         {session ? (
//           // Existing session UI
//           <div className="text-center">
//             <div className="flex flex-col gap-5 items-center">
//               <div className="relative group">
//                 <Avatar className="size-20 border-2 border-primary/20 hover:border-primary/50 transition-all duration-300">
//                   <AvatarImage src={avatar} alt="User Avatar" />
//                   <AvatarFallback className="bg-primary/10 text-primary font-semibold">
//                     {session?.address ? session.address.substring(2, 4).toUpperCase() : "UN"}
//                   </AvatarFallback>
//                 </Avatar>
//                 <div className="absolute -bottom-1 -right-1 bg-green-500 h-3 w-3 rounded-full border-2 border-white" title="Connected" />
//               </div>

//               <div className="flex flex-col items-center gap-2 w-full">
//                 <p className="font-mono text-sm bg-gray-100 px-3 py-1 rounded-full">
//                   {formatCryptoAddress(session?.address, 10, 10)}
//                 </p>
//                 <CustomCopyButton value={`${session?.address}`} />
//               </div>

//               <Button
//                 data-testid="sign-out-button"
//                 className="rounded-md w-full mt-4 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
//                 onClick={signOutFromSiweSession}
//               >
//                 <LuLogOut className="h-4 w-4" />
//                 Sign Out
//               </Button>
//             </div>
//           </div>
//         ) : showWalletSelection ? (
//           // Wallet selection UI - only show detected wallets
//           <div className="space-y-3">
//             <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
//               Detected Wallets ({detectedWallets.length})  {detectedWallets.length == 0 ? <></>: <>, click on any below</> }
//             </h3>

//             {detectedWallets.length === 0 ? (
//               <Alert className="border-orange-200 bg-orange-50">
//                 <LuWallet className="h-4 w-4 text-orange-600" />
//                 <AlertDescription className="text-orange-700">
//                   <div className="space-y-3">
//                     <p className="font-medium">No wallets detected</p>
//                     <p className="text-sm">
//                       Please install a Web3 wallet to connect to Aquafier. Popular options include:
//                     </p>
//                     <div className="flex flex-wrap gap-2">
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         className="text-orange-700 border-orange-300 hover:bg-orange-100"
//                         onClick={() => window.open("https://metamask.io/download/", "_blank")}
//                       >
//                         Install MetaMask
//                       </Button>
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         className="text-orange-700 border-orange-300 hover:bg-orange-100"
//                         onClick={() => window.open("https://phantom.app/", "_blank")}
//                       >
//                         Install Phantom
//                       </Button>
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         className="text-orange-700 border-orange-300 hover:bg-orange-100"
//                         onClick={() => window.open("https://www.coinbase.com/wallet", "_blank")}
//                       >
//                         Install Coinbase
//                       </Button>
//                     </div>
//                     <p className="text-xs text-orange-600">
//                       After installation, refresh this page to connect your wallet.
//                     </p>
//                   </div>
//                 </AlertDescription>
//               </Alert>
//             ) : (
//               detectedWallets.map(({ id, config }) => (
//                 <button
//                   key={id}
//                   onClick={() => handleWalletConnection(id)}
//                   disabled={isConnecting}
//                   className="w-full p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 flex items-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed group"
//                 >
//                   <div className="flex-shrink-0">
//                     {config.icon}
//                   </div>
//                   <div className="text-left flex-1">
//                     <div className="font-medium text-gray-900 group-hover:text-gray-700">
//                       {config.name}
//                     </div>
//                     <div className="text-sm text-gray-600">
//                       {config.description}
//                     </div>
//                   </div>
//                   <div className="flex items-center gap-2">
//                     <div className="w-2 h-2 bg-green-500 rounded-full" title="Detected" />
//                     <div className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">
//                       {config.blockchain}
//                     </div>
//                   </div>
//                 </button>
//               ))
//             )}
//           </div>
//         ) : (
//           // Connection status UI
//           <div className="flex flex-col gap-6 items-center justify-center py-8">
//             {connectionState === "connecting" && (
//               <>
//                 <ClipLoader
//                   color={"#3B82F6"}
//                   loading={loading}
//                   size={60}
//                   className="mx-auto"
//                   aria-label="Loading Spinner"
//                   data-testid="loader"
//                 />
//                 <div className="text-center">
//                   <p className="text-lg font-medium text-gray-900">Connecting...</p>
//                   <p className="text-sm text-gray-600">
//                     Please check your {WALLET_CONFIG[selectedWallet]?.name} wallet
//                   </p>
//                 </div>
//               </>
//             )}
//             {connectionState === "success" && (
//               <>
//                 <LuCircleCheck className="text-green-500" size={60} />
//                 <div className="text-center">
//                   <p className="text-lg font-medium text-green-700">Successfully connected!</p>
//                   <p className="text-md text-gray-600">Welcome to Aquafier</p>
//                   <p className="text-sm text-gray-600">Redirecting in a few</p>
//                 </div>
//               </>
//             )}
//             {connectionState === "error" && (
//               <>
//                 <LuCircleX className="text-red-500" size={60} />
//                 <div className="text-center">
//                   <p className="text-lg font-medium text-red-700">Connection failed</p>
//                   <p className="text-sm text-gray-600">{message}</p>
//                   <Button
//                     onClick={resetState}
//                     className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
//                   >
//                     Try Again
//                   </Button>
//                 </div>
//               </>
//             )}
//           </div>
//         )}

//         <div className="mt-6 text-center">
//           <p className="text-xs text-gray-500">
//             By connecting, you agree to our Terms of Service and Privacy Policy
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// };