import { createSignal, onMount } from 'solid-js';
import { ensureDomainUrlHasSSL, fetchFiles, generateAvatar, setCookie } from '../../utils/functions';
import { generateNonce, SiweMessage } from 'siwe';
import { SESSION_COOKIE_NAME } from '../../utils/constants';
import axios from 'axios';

import appStore, { appStoreActions } from '../../store';
import { BrowserProvider, ethers } from 'ethers';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '../../components/ui/alert';

// Types
type ConnectionState = 'idle' | 'connecting' | 'success' | 'error';

// Error codes enum
const METAMASK_ERRORS = {
  USER_REJECTED_REQUEST: 4001,
  ALREADY_PROCESSING: -32002,
} as const;

// Constants
const MOBILE_BREAKPOINT = 768;
const CONNECTION_TIMEOUT = 5000;
const SESSION_SUCCESS_DELAY = 2000;

// --- Utility functions ---
const timeoutPromise = async <T,>(
  promise: Promise<T>,
  ms: number,
  errorMsg = 'Request timed out'
): Promise<T> => {
  let timeoutId: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMsg)), ms);
  });
  return Promise.race([promise.finally(() => clearTimeout(timeoutId)), timeout]);
};

const isMobileDevice = (): boolean =>
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
  window.innerWidth <= MOBILE_BREAKPOINT;

const isMetaMaskInstalled = (): boolean => {
  const { ethereum } = window as any;
  return !!(ethereum && ethereum.isMetaMask);
};

const isMetaMaskBrowser = (): boolean => {
  const { ethereum } = window as any;
  return !!(ethereum && ethereum.isMetaMask && ethereum.selectedAddress);
};

// Detect installed wallets (same as your React version)
const detectInstalledWallets = (): { wallets: string[]; hasMultiple: boolean; hasMetaMask: boolean } => {
  const { ethereum } = window as any;
  const wallets: string[] = [];
  if (!ethereum) return { wallets: [], hasMultiple: false, hasMetaMask: false };

  if (ethereum.isMetaMask) wallets.push('MetaMask');
  if (ethereum.isCoinbaseWallet || ethereum.isCoinbaseBrowser) wallets.push('Coinbase Wallet');
  if (ethereum.isRabby) wallets.push('Rabby');
  if (ethereum.isBraveWallet) wallets.push('Brave Wallet');
  if (ethereum.isPhantom) wallets.push('Phantom');
  if (ethereum.isTrust) wallets.push('Trust Wallet');
  if (ethereum.isRainbow) wallets.push('Rainbow Wallet');

  if (ethereum.providers && Array.isArray(ethereum.providers)) {
    ethereum.providers.forEach((p: any) => {
      if (p.isMetaMask && !wallets.includes('MetaMask')) wallets.push('MetaMask');
      if (p.isCoinbaseWallet && !wallets.includes('Coinbase Wallet')) wallets.push('Coinbase Wallet');
      if (p.isRabby && !wallets.includes('Rabby')) wallets.push('Rabby');
      if (p.isBraveWallet && !wallets.includes('Brave Wallet')) wallets.push('Brave Wallet');
    });
  }

  if (wallets.length === 0 && ethereum) wallets.push('Unknown Wallet');
  return { wallets, hasMultiple: wallets.length > 1, hasMetaMask: wallets.includes('MetaMask') };
};

const createSiweMessage = (address: string, statement: string): string => {
  const domain = window.location.host;
  const origin = window.location.origin;
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const message = new SiweMessage({
    domain,
    address,
    statement,
    uri: origin,
    version: '1',
    chainId: 2,
    nonce: generateNonce(),
    expirationTime: expiry,
    issuedAt: new Date().toISOString(),
  });

  return message.prepareMessage();
};

// --- Main Component ---
export const ConnectWalletPageMetamask = () => {
  const { backend_url, session } = appStore;
  const { setMetamaskAddress, setFiles, setAvatar, setUserProfile, setSession } = appStoreActions;

  // --- State (Solid signals) ---
  const [isConnecting, setIsConnecting] = createSignal(false);
  const [connectionState, setConnectionState] = createSignal<ConnectionState>('idle');
  const [error, setError] = createSignal('');
  const [hasMultipleWallets, setHasMultipleWallets] = createSignal(false);
  const [detectedWallets, setDetectedWallets] = createSignal<string[]>([]);

  const resetState = () => {
    setConnectionState('idle');
    setError('');
    setIsConnecting(false);
  };

  const checkForMultipleWallets = (): boolean => {
    const walletInfo = detectInstalledWallets();
    console.log('wallet info', walletInfo);
    setDetectedWallets(walletInfo.wallets);
    setHasMultipleWallets(walletInfo.hasMultiple);

    if (walletInfo.hasMultiple) {
      const msg = `Multiple wallets detected: ${walletInfo.wallets.join(', ')}. Please disable all except MetaMask.`;
      setError(msg);
      toast.error(msg);
      return false;
    }

    if (walletInfo.wallets.length === 0) {
      const msg = 'No wallet detected. Please install MetaMask to continue.';
      setError(msg);
      toast.error(msg);
      return false;
    }

    if (!walletInfo.hasMetaMask) {
      const msg = `Only ${walletInfo.wallets[0]} detected. This app requires MetaMask.`;
      setError(msg);
      toast.error(msg);
      return false;
    }

    setError('');
    return true;
  };

  const handleRetryWalletCheck = () => {
    if (checkForMultipleWallets()) {
      toast.success('MetaMask is ready! Click "Sign in" to continue.');
      setHasMultipleWallets(false);
    }
  };

  const generateDeepLinkUrls = (): string[] => {
    const currentUrl = window.location.href;
    const dappPath = `${window.location.host}${window.location.pathname}${window.location.search}`;
    return [
      `https://metamask.app.link/dapp/${dappPath}`,
      `metamask://dapp/${dappPath}`,
      `https://metamask.app.link/dapp/${currentUrl}`,
      `https://metamask.app.link/browser?url=${currentUrl}`,
    ];
  };

  const handleMobileConnection = async () => {
    const urls = generateDeepLinkUrls();
    try {
      const link = document.createElement('a');
      link.href = urls[1];
      link.click();
      await new Promise((r) => setTimeout(r, 2000));
      if (document.hasFocus()) window.location.href = urls[0];
    } catch (err) {
      toast.error('MetaMask not found. Redirecting to download.');
      window.open('https://metamask.io/download/', '_blank');
    }
  };

  const handleMobileFlow = async () => {
    if (!isMetaMaskInstalled()) return handleMobileConnection();
    if (isMetaMaskBrowser()) return connectWithMetaMask();

    if (window.confirm("Open this page in MetaMask's built-in browser?")) {
      return handleMobileConnection();
    }
    return connectWithMetaMask();
  };

  const handleDesktopFlow = async () => {
    if (!isMetaMaskInstalled()) {
      toast.error('MetaMask not installed.');
      window.open('https://metamask.io/download/', '_blank');
      return;
    }
    await connectWithMetaMask();
  };

  const getErrorMessage = (error: any): string => {
    if (error.message?.includes('timed out'))
      return 'MetaMask took too long. Please unlock your wallet.';
    switch (error.code) {
      case METAMASK_ERRORS.USER_REJECTED_REQUEST:
        return 'You rejected the connection request.';
      case METAMASK_ERRORS.ALREADY_PROCESSING:
        return 'MetaMask is already processing. Please check it.';
      default:
        if (error.message?.includes('User rejected')) return 'You rejected signing the message.';
        return error.message || 'An error occurred.';
    }
  };

  const getMetaMaskProvider = (): any => {
    const { ethereum } = window as any;
    if (!ethereum) throw new Error('No Ethereum provider found');
    if (ethereum.providers && Array.isArray(ethereum.providers)) {
      const provider = ethereum.providers.find((p: any) => p.isMetaMask);
      if (provider) return provider;
      throw new Error('MetaMask provider not found among multiple wallets');
    }
    if (ethereum.isMetaMask) return ethereum;
    throw new Error('MetaMask is not the active provider');
  };

  const connectWithMetaMask = async () => {
    setConnectionState('connecting');
    try {
      const metamaskProvider = getMetaMaskProvider();
      const provider = new BrowserProvider(metamaskProvider);

      await metamaskProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x1' }],
      });

      const accountsResponse = await timeoutPromise(
        metamaskProvider.request({ method: 'eth_requestAccounts' }),
        CONNECTION_TIMEOUT
      );
      const accounts = Array.isArray(accountsResponse) ? accountsResponse : [];
      if (accounts.length === 0) throw new Error('No accounts found');

      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const message = createSiweMessage(address, 'Sign in with Ethereum to the app.');
      const signature = await timeoutPromise(
        signer.signMessage(message),
        CONNECTION_TIMEOUT,
        'Signature request timed out.'
      );

      const url = ensureDomainUrlHasSSL(`${backend_url}/session`);
      const response = await axios.post(url, { message, signature, domain: window.location.host });

      if (response.status === 200 || response.status === 201) {
        const data = response.data;
        const backendAddr = data?.session?.address;
        const walletAddress = backendAddr ? ethers.getAddress(backendAddr) : ethers.getAddress(address);

        setMetamaskAddress(walletAddress);
        setAvatar(generateAvatar(walletAddress));
        setCookie(SESSION_COOKIE_NAME, `${data.session.nonce}`, new Date(data?.session?.expiration_time));
        setConnectionState('success');
        setUserProfile({ ...data.user_settings });
        setSession({ ...data.session });

        const filesApi = await fetchFiles(session!.address, `${backend_url}/explorer_files`, session!.nonce);
        setFiles({ fileData: filesApi.files, pagination: filesApi.pagination, status: 'loaded' });

        toast.success('Sign in successful');
        setTimeout(resetState, SESSION_SUCCESS_DELAY);
      }
    } catch (err: any) {
      console.error('MetaMask connection error:', err);
      const msg = getErrorMessage(err);
      setConnectionState('error');
      setError(msg);
      toast.error(msg);
      setIsConnecting(false);
    }
  };

  const handleSignAndConnect = async () => {
    if (session) return;
    if (!checkForMultipleWallets()) return;
    setIsConnecting(true);
    setError('');
    try {
      if (isMobileDevice()) await handleMobileFlow();
      else await handleDesktopFlow();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setConnectionState('error');
      setError(msg);
      toast.error(msg);
    } finally {
      setIsConnecting(false);
    }
  };

  // --- JSX ---
  if (error()) {
    console.error('Error:', error());
  }

  return (
    <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl shadow-lg border border-gray-200 p-8 w-full max-w-md">
        <div class="text-center mb-8">
          <div class="w-16 h-16 bg-gradient-to-br from-orange-500 to-purple-300 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 mb-2">Welcome to Aquafier.</h1>
          <p class="text-gray-600 text-sm">Connect your Web3 wallet to get started</p>
        </div>

        {error() && (
          <Alert class="mb-6 border-red-200 bg-red-50">
            <AlertDescription class="text-red-700 text-sm">{error()}</AlertDescription>
          </Alert>
        )}

        {hasMultipleWallets() && detectedWallets().length > 0 && (
          <div class="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p class="text-sm font-medium text-yellow-900 mb-2">Detected wallets:</p>
            <ul class="text-sm text-yellow-800 list-disc list-inside mb-3">
              {detectedWallets().map((wallet) => (
                <li>{wallet}</li>
              ))}
            </ul>
            <button
              onClick={handleRetryWalletCheck}
              class="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Retry Connection Check
            </button>
          </div>
        )}

        <button
          onClick={handleSignAndConnect}
          disabled={isConnecting() || hasMultipleWallets()}
          class="w-full bg-black hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          {isConnecting() ? (
            <>
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Connecting...
            </>
          ) : (
            <>
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.483 6.125C3.483 5.504 3.987 5 4.608 5h14.784c.621 0 1.125.504 1.125 1.125v11.75c0 .621-.504 1.125-1.125 1.125H4.608c-.621 0-1.125-.504-1.125-1.125V6.125zM5.233 6.75v10.5h13.534V6.75H5.233z" />
                <path d="M7.5 9.75h9v1.5h-9v-1.5zm0 3h6v1.5h-6v-1.5z" />
              </svg>
              Sign in
            </>
          )}
        </button>

        <div class="mt-6 text-center">
          <p class="text-xs text-gray-500">
            By connecting, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};
