import { useState } from "react";
// import { Button } from "./chakra-ui/button";
// import { DialogBody, DialogCloseTrigger, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./chakra-ui/dialog";
// import { Center, Dialog, Text, VStack } from "@chakra-ui/react";
import { LuCopy } from "react-icons/lu";
// import ReactLoading from "react-loading";
import { fetchFiles, generateAvatar,  setCookie } from "../utils/functions";
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

export const CustomCopyButton = ({ value }: { value: string }) => {
  // const clipboard = useClipboard({ value: value })
  return (
    <Button data-testid="custom-copy-button" variant="default" size="sm" onClick={() => navigator.clipboard.writeText(value)} className="flex items-center gap-2 rounded-md">
      {"Copy Address"}
      <LuCopy />
    </Button>
  )
}



export const ConnectWalletPage = ( ) => {
  const { setMetamaskAddress, session, setFiles, setAvatar, setUserProfile, backend_url, setSession } = useStore(appStore);

  const [isConnecting, _setIsConnecting] = useState(false);
  const [_isOpen, setIsOpen] = useState(false);
  const [_loading, setLoading] = useState(false);
  const [_connectionState, setConnectionState] = useState<"idle" | "connecting" | "success" | "error">("idle");
  const [_message, setMessage] = useState<string | null>(null);
  // const [avatar, setAvatar] = useState("")
  const [_progress, setProgress] = useState(0);
  const [error, _setError] = useState('');

  // const _iconSize = "120px";

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


  // const signOut = () => {
  //   setLoading(true);
  //   setCookie(SESSION_COOKIE_NAME, "", new Date("1970-01-01T00:00:00Z"));
  //   setMetamaskAddress(null);
  //   setAvatar(undefined);
  //   setLoading(false);
  //   setIsOpen(false);
  //   toast("Signed out successfully");
  // };

  // const _signOutFromSiweSession = async () => {
  //   setLoading(true);
  //   try {
  //     // const formData = new URLSearchParams();
  //     const nonce = getCookie("pkc_nonce");
  //     // formData.append("nonce", nonce);

  //     const url = `${backend_url}/session`;
  //     //  console.log("url is ", url);
  //     const response = await axios.delete(url, {
  //       params: {
  //         nonce
  //       }
  //     });

  //     if (response.status === 200) {
  //       signOut();
  //       setMetamaskAddress(null);
  //       setAvatar(undefined);
  //       setSession(null)
  //       setFiles([]);
  //       // disConnectWebsocket()
  //     }
  //   } catch (error: any) {
  //     console.log("error", error)
  //     // if (error?.response?.status === 404 || error?.response?.status === 401) {
  //     setMetamaskAddress(null);
  //     setAvatar(undefined);
  //     setSession(null)
  //     setFiles([]);
  //     // }
  //   }
  //   setLoading(false);
  //   setIsOpen(false);
  //   toast("Signed out successfully");
  // };


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

