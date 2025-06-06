import { useState } from "react";
import { Button } from "./chakra-ui/button";
import { DialogBody, DialogCloseTrigger, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./chakra-ui/dialog";
import { Center, Dialog, Text, VStack } from "@chakra-ui/react";
import { LuCircleCheck, LuCircleX, LuCopy, LuLogOut, LuWallet } from "react-icons/lu";
import ReactLoading from "react-loading";
import { fetchFiles, formatCryptoAddress, generateAvatar, getCookie, setCookie } from "../utils/functions";
import { SiweMessage, generateNonce } from "siwe";
import { SESSION_COOKIE_NAME } from "../utils/constants";
import axios from "axios";
import { useStore } from "zustand";
import appStore from "../store";
import { BrowserProvider, ethers } from "ethers";
import { Avatar } from "./chakra-ui/avatar";
import { toaster } from "./chakra-ui/toaster";

import { useClipboard } from "@chakra-ui/react"

const CustomCopyButton = ({ value }: { value: string }) => {
  const clipboard = useClipboard({ value: value })
  return (
    <Button variant="surface" size="sm" onClick={clipboard.copy} borderRadius={"md"}>
      {clipboard.copied ? "Copied" : "Copy Address"}
      <LuCopy />
    </Button>
  )
}



export const  ConnectWallet: React.FC = () => {
  const { setMetamaskAddress, session, setFiles, avatar, setAvatar, setUserProfile, backend_url, setSession } = useStore(appStore);

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connectionState, setConnectionState] = useState<"idle" | "connecting" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  // const [avatar, setAvatar] = useState("")
  const [_progress, setProgress] = useState(0);

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
        toaster.create({
          description: "Sign In successful",
          type: "success",
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
                toaster.create({
                  description: "MetaMask is not installed. Redirecting to download page.",
                  type: "info",
                });
                window.location.href = "https://metamask.io/download/";
              }
            }, 2000);
          }, 1000);
        } catch (e) {
          console.error("Deep link error:", e);
          toaster.create({
            description: "Failed to open MetaMask. You may need to install it first.",
            type: "error",
          });
          window.location.href = "https://metamask.io/download/";
        }
      } else {
        toaster.create({
          description: "MetaMask is not installed. Please install it to connect.",
          type: "error",
        });
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
    toaster.create({
      description: "Signed out successfully",
      type: "success",
    });
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
  };

  return (
    <Dialog.Root placement={"center"} size={"sm"} open={isOpen} onOpenChange={(details) => setIsOpen(details.open)}>
      <DialogTrigger asChild>
        <Button
          size={"sm"}
          borderRadius={"md"}
          onClick={() => {
            setIsOpen(true);
            !session && signAndConnect();
          }}
        >
          <LuWallet />
          {session ? formatCryptoAddress(session?.address, 3, 3) : "Sign In"}
        </Button>
      </DialogTrigger>
      <DialogContent borderRadius={"2xl"} overflow={"hidden"}>
        <DialogHeader py={"3"} px={"5"} bg={{ base: "rgb(188 220 255 / 22%)", _dark: "rgba(0, 0, 0, 0.3)" }}>
          <DialogTitle fontWeight={500} color={"gray.800"} _dark={{ color: "white" }}>
            {session ? "Account" : "Sign In"}
          </DialogTitle>
        </DialogHeader>
        <DialogBody py={"8"} px={"5"}>
          {session ? (
            <VStack gap={5}>
              <Center>
                <Avatar src={avatar} size={"2xl"} loading="eager" />
              </Center>
              <Text fontFamily={"monospace"}>{formatCryptoAddress(session?.address, 10, 10)}</Text>
              <CustomCopyButton value={`${session?.address}`} />
              <Button borderRadius={"md"} loading={loading} onClick={signOutFromSiweSession}>
                Sign Out
                <LuLogOut />
              </Button>
            </VStack>
          ) : (
            <VStack gap={"10"}>
              {connectionState === "connecting" && (
                <>
                  <ReactLoading type={"spin"} color={"blue"} height={iconSize} width={iconSize} />
                  <Text fontSize={"md"}>Connecting to wallet...</Text>
                </>
              )}
              {connectionState === "success" && (
                <>
                  <LuCircleCheck strokeWidth="1px" color="green" size={iconSize} />
                  <Text fontSize={"md"} color={"green.700"}>
                    Successfully connected!
                  </Text>
                </>
              )}
              {connectionState === "error" && (
                <>
                  <LuCircleX color="red" strokeWidth="1px" size={iconSize} />
                  <VStack gap={0}>
                    <Text fontSize={"md"} color={"red.700"}>
                      Error connecting to wallet
                    </Text>
                    <Text fontSize={"md"} color={"red.700"}>
                      {message ?? ""}
                    </Text>
                  </VStack>
                </>
              )}
            </VStack>
          )}
        </DialogBody>
        <DialogCloseTrigger />
      </DialogContent>
    </Dialog.Root>
  );
}
