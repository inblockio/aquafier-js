import { useState } from "react";
import { Button } from "../button";
import { DialogBody, DialogCloseTrigger, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../dialog";
import { Center, Dialog, Text, VStack } from "@chakra-ui/react";
import { LuCircleCheck, LuCircleX, LuLogOut, LuWallet } from "react-icons/lu";
import ReactLoading from "react-loading";
import { fetchFiles, formatCryptoAddress, generateAvatar, getCookie, setCookie } from "../../../utils/functions";
import { SiweMessage, generateNonce } from "siwe";
import { SESSION_COOKIE_NAME } from "../../../utils/constants";
import axios from "axios";
import { useStore } from "zustand";
import appStore from "../../../store";
import { BrowserProvider, ethers } from "ethers";
import { Avatar } from "../avatar";
import { toaster } from "../toaster";

export default function ConnectWallet() {
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
    console.log("Connecting");

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
        console.log("Signature", signature)
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


  // const signAndConnect = async () => {
  //   console.log("Connecting");

  //   // Check if on mobile device
  //   const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  //   // If MetaMask is available, proceed with connection
  //   if (window.ethereum) {
  //     setLoading(true);
  //     setConnectionState("connecting");
  //     const provider = new BrowserProvider(window.ethereum);
  //     try {
  //       // Connect wallet
  //       await window.ethereum.request({ method: "eth_requestAccounts" });
  //       const signer = await provider.getSigner();

  //       // Create a SIWE msg for signing
  //       const domain = window.location.host;
  //       const message = createSiweMessage(signer.address, "Sign in with Ethereum to the app.");

  //       const signature = await signer.signMessage(message);

  //       const url = `${backend_url}/session`;
  //       const response = await axios.post(url, {
  //         "message": message,
  //         "signature": signature,
  //         "domain": domain
  //       });

  //       if (response.status === 200 || response.status === 201) {
  //         const responseData = response.data;
  //         const walletAddress = ethers.getAddress(responseData?.session?.address);
  //         setMetamaskAddress(walletAddress);
  //         const avatar = generateAvatar(walletAddress);
  //         setAvatar(avatar);
  //         const expirationDate = new Date(responseData?.session?.expiration_time);
  //         setCookie(SESSION_COOKIE_NAME, `${responseData.session.nonce}`, expirationDate);
  //         setConnectionState("success");

  //         setUserProfile({
  //           ...response.data.user_settings,
  //         });

  //         setSession({
  //           ...response.data.session
  //         });

  //         const url = `${backend_url}/explorer_files`;
  //         const files = await fetchFiles(walletAddress, url, responseData.session.nonce);
  //         setFiles(files);
  //       }

  //       setLoading(false);
  //       setMessage(null);
  //       toaster.create({
  //         description: "Sign In successful",
  //         type: "success",
  //       });

  //       setTimeout(() => {
  //         setIsOpen(false);
  //         resetState();
  //         setLoading(false);
  //         setMessage(null);
  //       }, 2000);
  //     } catch (error : any) {
  //       if (error.toString().includes("4001")) {
  //         setConnectionState("error");
  //         setLoading(false);
  //         setMessage("You have rejected signing the message.");
  //       } else {
  //         setConnectionState("error");
  //         setLoading(false);
  //         setMessage("An error occurred while connecting.");
  //       }
  //     }
  //   } else {
  //     // MetaMask is not installed
  //     if (isMobile) {
  //       // // On mobile, try deep linking to MetaMask
  //       // const currentUrl = encodeURIComponent(window.location.href);

  //       // // Universal link pattern for MetaMask
  //       // const metamaskDeepLink = `https://metamask.app.link/dapp/${domain}${window.location.pathname}`;

  //       // // Alternative formats for different devices
  //       // const metamaskAppLink = `metamask://dapp/${domain}${window.location.pathname}`;

  //       // On mobile, try deep linking to MetaMask
  //       const currentDomain = window.location.host;
  //       const currentPath = window.location.pathname;

  //       // Universal link pattern for MetaMask
  //       const metamaskDeepLink = `https://metamask.app.link/dapp/${currentDomain}${currentPath}`;

  //       // Alternative formats for different devices
  //       const metamaskAppLink = `metamask://dapp/${currentDomain}${currentPath}`;


  //       try {
  //         // Try the primary deep link first
  //         window.location.href = metamaskDeepLink;

  //         // Set a timeout to try the alternative link if the first one doesn't work
  //         setTimeout(() => {
  //           // If we're still here after a brief delay, try the alternative format
  //           window.location.href = metamaskAppLink;

  //           // Finally, if deep linking fails, offer to download MetaMask
  //           setTimeout(() => {
  //             if (!window.ethereum) {
  //               toaster.create({
  //                 description: "MetaMask is not installed. Redirecting to download page.",
  //                 type: "info",
  //               });
  //               window.location.href = "https://metamask.io/download/";
  //             }
  //           }, 1500);
  //         }, 1000);
  //       } catch (e) {
  //         // If there's an error with the deep link, redirect to MetaMask download
  //         toaster.create({
  //           description: "Failed to open MetaMask. You may need to install it first.",
  //           type: "error",
  //         });
  //         window.location.href = "https://metamask.io/download/";
  //       }
  //     } else {
  //       // On desktop, show an alert or toast
  //       toaster.create({
  //         description: "MetaMask is not installed. Please install it to connect.",
  //         type: "error",
  //       });
  //     }
  //   }
  // };

  // const signAndConnect = async () => {
  //   console.log("Connecting")
  //   if (window.ethereum) {
  //     setLoading(true);
  //     setConnectionState("connecting");
  //     const provider = new BrowserProvider(window.ethereum);
  //     try {
  //       // Connect wallet
  //       await window.ethereum.request({ method: "eth_requestAccounts" });
  //       const signer = await provider.getSigner();

  //       // Create a SIWE msg for signing
  //       const domain = window.location.host;
  //       const message = createSiweMessage(signer.address, "Sign in with Ethereum to the app.");

  //       const signature = await signer.signMessage(message);

  //       // const formData = new URLSearchParams();

  //       // formData.append("message", message);
  //       // formData.append("signature", remove0xPrefix(signature));
  //       // formData.append("domain", domain);

  //       const url = `${backend_url}/session`;
  //       ////  console.log("url is ", url);
  //       // const response = await axios.post(url, formData, {
  //       //   headers: {
  //       //     "Content-Type": "application/x-www-form-urlencoded",
  //       //   },
  //       // });

  //       const response = await axios.post(url, {
  //         "message": message,
  //         "signature": signature,
  //         "domain": domain
  //       });

  //       if (response.status === 200 || response.status === 201) {
  //         // if (signature) {
  //        //  console.log(response.data)
  //           const responseData = response.data;
  //           const walletAddress = ethers.getAddress(responseData?.session?.address);
  //           setMetamaskAddress(walletAddress);
  //           const avatar = generateAvatar(walletAddress);
  //           setAvatar(avatar);
  //           const expirationDate = new Date(responseData?.session?.expiration_time);
  //           setCookie(SESSION_COOKIE_NAME, `${responseData.session.nonce}`, expirationDate);
  //           setConnectionState("success");

  //           // network: response.data.user_profile.chain,
  //           // domain: response.data.user_profile.domain_name,
  //           // fileMode: response.data.user_profile.file_mode,
  //           // contractAddress: response.data.user_profile.contract_address,
  //           setUserProfile({
  //             ...response.data.user_settings,
  //           });

  //           setSession({
  //             ...response.data.session
  //           })

  //           const url = `${backend_url}/explorer_files`;
  //          //  console.log("url is ", url);

  //           const files = await fetchFiles(walletAddress, url,responseData.session.nonce );

  //          //  console.log(`Files ..........${files}`)
  //           setFiles(files);
  //         // }
  //       }
  //       setLoading(false);
  //       setMessage(null);
  //       toaster.create({
  //         description: "Sign In successful",
  //         type: "success",
  //       });
  //       setTimeout(() => {
  //         setIsOpen(false);
  //         resetState();
  //         setLoading(false);
  //         setMessage(null);
  //       }, 2000);
  //     } catch (error: any) {
  //       if (error.toString().includes("4001")) {
  //         setConnectionState("error");
  //         setLoading(false);
  //         setMessage("You have rejected signing the message.");
  //       } else {
  //         setConnectionState("error");
  //         setLoading(false);
  //       }
  //     }
  //   } else {
  //     if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
  //       if (!window.ethereum) {
  //         window.location.href = "metamask://dapp/https://aquafier.inblock.io/";
  //       }
  //     }
  //     alert("MetaMask is not installed");
  //   }
  // };

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
      }
    } catch (error: any) {
      if (error?.response?.status === 404) {
        setMetamaskAddress(null);
        setAvatar(undefined);
        setSession(null)
        setFiles([]);
      }
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
