import { onMount, Suspense, type Component } from 'solid-js';
import { A, useLocation } from '@solidjs/router';
import { hydrateStore, appStoreActions } from './store';
import { initializeBackendUrl } from './utils/constants';
import { startApm } from './init/apm';
import { setUpSentry } from './init/sentry';

const App: Component<{ children: Element }> = (props) => {
  const location = useLocation();

  onMount(async () => {
    await hydrateStore();

    // Properly handle async initialization
    const initBackend = async () => {
      // SolidJS: Import actions directly, no useStore hook needed
      const { setBackEndUrl, setWebConfig } = appStoreActions;
      
      const { backend_url, config, apmConfig } = await initializeBackendUrl();
      startApm(apmConfig);
      setBackEndUrl(backend_url);
      setUpSentry(config);
      setWebConfig(config);

      // Conditionally import AppKit based on AUTH_PROVIDER
      if (config.AUTH_PROVIDER === 'wallet_connect') {
        await import('./config/appkit');
        console.log('AppKit initialized for wallet_connect');
        
      }
    };

    initBackend();
  });

  return (
    <>
      {/* <nav class="bg-gray-200 text-gray-900 px-4">
        <ul class="flex items-center">
          <li class="py-2 px-4">
            <A href="/" class="no-underline hover:underline">
              Home
            </A>
          </li>
          <li class="py-2 px-4">
            <A href="/about" class="no-underline hover:underline">
              About
            </A>
          </li>
          <li class="py-2 px-4">
            <A href="/error" class="no-underline hover:underline">
              Error
            </A>
          </li>

          <li class="text-sm flex items-center space-x-1 ml-auto">
            <span>URL:</span>
            <input
              class="w-75px p-1 bg-white text-sm rounded-lg"
              type="text"
              readOnly
              value={location.pathname}
            />
          </li>
        </ul>
      </nav> */}

      <main>
        <Suspense>{props.children}</Suspense>
      </main>
    </>
  );
};

export default App;