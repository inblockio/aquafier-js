import { useState } from "react";
import { LuCircleCheck, LuCircleX, LuCopy, LuLogOut, LuWallet } from "react-icons/lu";
import { ClipLoader } from "react-spinners";
import { SiweMessage, generateNonce } from "siwe";
import { SESSION_COOKIE_NAME } from "../../utils/constants";
import axios from "axios";
import { useStore } from "zustand";
// import appStore from "../store";
import { BrowserProvider, ethers } from "ethers";

import { fetchFiles, formatCryptoAddress, generateAvatar, getCookie, setCookie } from "../../utils/functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/shadcn/ui/dialog";
import { Button } from "@/components/shadcn/ui/button";
import appStore from "@/store";

const CustomCopyButton = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <button 
      data-testid="custom-copy-button"  
      onClick={copyToClipboard}
      className="gap-2 sm outline"
    >
      {copied ? "Copied" : "Copy Address"}
      <LuCopy size={16} />
    </button>
  );
};

export const ConnectWallet: React.FC<{dataTestId: string}> = ({dataTestId}) => {
  const { setMetamaskAddress, session, setFiles, avatar, setAvatar, setUserProfile, backend_url, setSession } = useStore(appStore);

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connectionState, setConnectionState] = useState<"idle" | "connecting" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [_progress, setProgress] = useState(0);

  const iconSize = 120;

  const resetState = () => {
    setConnectionState("idle");
    setProgress(0);
  };

  function createSiweMessage(address: string, statement: string) {
    const domain = window.location.host;
    const origin = window.location.origin;
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const message = new SiweMessage({
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
        // Toaster ignored as requested

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
                // Toaster ignored as requested
                window.location.href = "https://metamask.io/download/";
              }
            }, 2000);
          }, 1000);
        } catch (e) {
          console.error("Deep link error:", e);
          // Toaster ignored as requested
          window.location.href = "https://metamask.io/download/";
        }
      } else {
        // Toaster ignored as requested
        console.log("MetaMask is not installed. Please install it to connect.");
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
    // Toaster ignored as requested
  };

  const signOutFromSiweSession = async () => {
    setLoading(true);
    try {
      const nonce = getCookie("pkc_nonce");
      const url = `${backend_url}/session`;
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
      }
    } catch (error: any) {
      console.log("error", error)
      setMetamaskAddress(null);
      setAvatar(undefined);
      setSession(null)
      setFiles([]);
    }
    setLoading(false);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          data-testid={dataTestId}
          size="sm"
          className="gap-2"
          onClick={() => {
            setIsOpen(true);
            !session && signAndConnect();
          }}
        >
          <LuWallet size={16} />
          {session ? formatCryptoAddress(session?.address, 3, 3) : "Sign In"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="bg-blue-50 dark:bg-gray-800/30 -mx-6 -mt-6 px-6 py-4">
          <DialogTitle className="text-gray-800 dark:text-white font-medium">
            {session ? "Account" : "Sign In"}
          </DialogTitle>
        </DialogHeader>
        <div className="py-6">
          {session ? (
            <div className="flex flex-col items-center gap-5">
              <div className="flex justify-center">
                Avatar Placeholder
                {/* <Avatar className="h-20 w-20">
                  <AvatarImage src={avatar} alt="Avatar" />
                  <AvatarFallback>
                    {session?.address?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar> */}
              </div>
              <p className="font-mono text-sm">
                {formatCryptoAddress(session?.address, 10, 10)}
              </p>
              <CustomCopyButton value={`${session?.address}`} />
              <Button 
                data-testid="sign-out-button" 
                disabled={loading}
                onClick={signOutFromSiweSession}
                className="gap-2"
              >
                {loading ? "Signing Out..." : "Sign Out"}
                <LuLogOut size={16} />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-10">
              {connectionState === "connecting" && (
                <>
                  <ClipLoader
                    color={"#3b82f6"}
                    loading={loading}
                    size={150}
                    aria-label="Loading Spinner"
                    data-testid="loader"
                  />
                  <p className="text-sm">Connecting to wallet...</p>
                </>
              )}
              {connectionState === "success" && (
                <>
                  <LuCircleCheck strokeWidth="1px" color="green" size={iconSize} />
                  <p className="text-sm text-green-700">
                    Successfully connected!
                  </p>
                </>
              )}
              {connectionState === "error" && (
                <>
                  <LuCircleX color="red" strokeWidth="1px" size={iconSize} />
                  <div className="flex flex-col items-center gap-0">
                    <p className="text-sm text-red-700">
                      Error connecting to wallet
                    </p>
                    <p className="text-sm text-red-700">
                      {message ?? ""}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};