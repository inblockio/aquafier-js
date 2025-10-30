import { createSignal, onMount, Show } from 'solid-js';
import appStore, { appStoreActions } from '../../store';
import { WebConfig } from '../../types/types';
import { ConnectWalletPageMetamask } from './connect_wallet_page_metmask';
import { ConnectWalletPageAppKit } from './connect_wallet_page_appkit';

export const ConnectWalletPage = () => {
  const { setWebConfig } = appStoreActions;
  const [webConfigData, setWebConfigData] = createSignal<WebConfig | null>(null);
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  onMount(async () => {
    try {
      const storeConfig = appStore.webConfig;

      // Check if we already have valid config in store
      if (storeConfig?.AUTH_PROVIDER && storeConfig?.BACKEND_URL) {
        console.log(`Using existing config: ${JSON.stringify(storeConfig)}`);
        setWebConfigData(storeConfig);
        return;
      }

      // Otherwise fetch fresh config
      console.log('Fetching config...');
      const response = await fetch('/config.json');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch config: ${response.status}`);
      }
      
      const config: WebConfig = await response.json();
      console.log(`ConnectWalletPage Here ... data ${JSON.stringify(config)}`);
      
      setWebConfig(config);
      setWebConfigData(config);
    } catch (err) {
      console.error('Error loading config:', err);
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      console.log('Finished loading config.');
      setIsLoading(false);
    }
  });

  return (
    <Show when={!isLoading()} fallback={<div>Loading...</div>}>
      <Show when={!error()} fallback={<div>Error: {error()}</div>}>
        <Show when={webConfigData()} fallback={<div>No configuration available</div>}>
          {(config) => {
            const authProvider = config().AUTH_PROVIDER;
            
            if (authProvider === 'metamask') {
              return <ConnectWalletPageMetamask />;
            }

            if (authProvider === 'wallet_connect') {
              return <ConnectWalletPageAppKit />;
            }

            return <div>Auth provider Config is unknown: {authProvider}</div>;
          }}
        </Show>
      </Show>
    </Show>
  );
};