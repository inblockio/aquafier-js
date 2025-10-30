import { Component, createSignal, onMount, Show } from 'solid-js';
import { A, useLocation, useNavigate } from '@solidjs/router';
import { Button } from '../../components/ui/button';
import { Github } from 'lucide-solid';
import { BsTwitter } from 'solid-icons/bs';
import { FaBrandsFacebook, FaBrandsLinkedinIn } from 'solid-icons/fa';
import { appStore, appStoreActions } from '../../store';
import { WebConfig } from '../../types/types';

const Header: Component = () => {

  const navigate = useNavigate();
  return (
    <header class="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div class="container flex h-16 max-w-screen-2xl items-center mx-auto px-2">
        <nav class="hidden flex-1 md:flex items-center space-x-4 lg:space-x-6 justify-between">
          <A href="/" class="flex items-center space-x-2 group">
            <div class="relative overflow-hidden p-1">
              <img class="h-[40px]" src="/images/logo.png" alt="Logo" />
            </div>
          </A>
          <div class="flex items-center space-x-6 lg:space-x-8">
            <a
              href="/#features"
              class="text-sm font-medium text-muted-foreground transition-all duration-300 hover:text-orange-500 relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-gradient-to-r after:from-primary after:to-orange-500 after:transition-all after:duration-300 hover:after:w-full"
            >
              Features
            </a>
            <a
              href="/#how-it-works"
              class="text-sm font-medium text-muted-foreground transition-all duration-300 hover:text-orange-500 relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-gradient-to-r after:from-primary after:to-orange-500 after:transition-all after:duration-300 hover:after:w-full"
            >
              How It Works
            </a>
            <a
              href="/#prototypes"
              class="text-sm font-medium text-muted-foreground transition-all duration-300 hover:text-orange-500 relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-gradient-to-r after:from-primary after:to-orange-500 after:transition-all after:duration-300 hover:after:w-full"
            >
              Prototypes
            </a>
            <a
              href="/#vision"
              class="text-sm font-medium text-muted-foreground transition-all duration-300 hover:text-orange-500 relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-gradient-to-r after:from-primary after:to-orange-500 after:transition-all after:duration-300 hover:after:w-full"
            >
              Vision
            </a>
            <a
              href="/#contact"
              class="text-sm font-medium text-muted-foreground transition-all duration-300 hover:text-orange-500 relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-gradient-to-r after:from-primary after:to-orange-500 after:transition-all after:duration-300 hover:after:w-full"
            >
              Contact
            </a>
          </div>
        </nav>
        <nav class="flex items-center space-x-2 group md:hidden">
          <A href="/" class="flex items-center space-x-2 group">
            <div class="relative overflow-hidden">
              <img class="h-[34px]" src="/images/logo.png" alt="Logo" />
            </div>
          </A>
        </nav>
        <div class="flex flex-1 items-center justify-end space-x-3">
          <Button variant="outline" onClick={() => {
            const url = "https://github.com/inblockio";
            window.open(url, "_blank");

          }} class="border-orange-500/30 hover:border-orange-500 hover:bg-orange-500/5 transition-all duration-300">
            <Github class="mr-2 h-4 w-4 text-orange-500" />
            GitHub
          </Button>
          <Button onClick={() => {
            navigate("/app")
          }} 
           class="bg-gradient-to-r from-gray-900 to-orange-600 hover:from-orange-600 hover:to-gray-900 text-white transition-all duration-300 shadow-md hover:shadow-lg"
>
          Go to App
          </Button>
        </div>
      </div>
    </header>
  );
}

const Footer: Component = () => (
  <footer class="bg-gradient-to-b from-orange-900 to-orange-950 text-orange-100/80">
    <div class="container mx-auto px-4 py-12">
      <div class="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-8">
        <div class="md:col-span-2 lg:col-span-2">
          <div class="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" class="h-6 w-6 text-orange-300">
              <rect width="256" height="256" fill="none"></rect>
              <path
                d="M48,208a16,16,0,0,1-16-16V64a16,16,0,0,1,16-16H208"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="16"
              ></path>
              <path
                d="M208,208a16,16,0,0,0,16-16V93.3a15.9,15.9,0,0,0-4.7-11.3l-58.6-58.6a15.9,15.9,0,0,0-11.3-4.7H96a16,16,0,0,0-16,16v88"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="16"
              ></path>
              <polyline points="152 24 152 88 216 88" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></polyline>
            </svg>
            <span class="font-bold text-lg font-headline text-orange-100">Aqua Protocol</span>
          </div>
          <p class="mt-4 text-sm">A Cryptographic Trust Protocol for Decentralized Data Integrity.</p>
        </div>
        <div>
          <h4 class="font-headline font-semibold text-orange-100">Protocol</h4>
          <ul class="mt-4 space-y-2 text-sm">
            <li>
              <a href="/#features" class="hover:text-orange-300 transition-colors">
                Features
              </a>
            </li>
            <li>
              <a href="/#how-it-works" class="hover:text-orange-300 transition-colors">
                How It Works
              </a>
            </li>
            <li>
              <a href="/#prototypes" class="hover:text-orange-300 transition-colors">
                Prototypes
              </a>
            </li>
            <li>
              <a href="/#vision" class="hover:text-orange-300 transition-colors">
                Vision
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 class="font-headline font-semibold text-orange-100">Company</h4>
          <ul class="mt-4 space-y-2 text-sm">
            <li>
              <A href="#" class="hover:text-orange-300 transition-colors">
                About Us
              </A>
            </li>
            <li>
              <a href="mailto:demo@inblock.io" class="hover:text-orange-300 transition-colors">
                Contact
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 class="font-headline font-semibold text-orange-100">Connect</h4>
          <div class="mt-4 flex space-x-4">
            <a href="#" class="hover:text-orange-300 transition-colors">
              <BsTwitter />
            </a>
            <a href="#" class="hover:text-orange-300 transition-colors">
              <FaBrandsFacebook />
            </a>
            <a href="#" class="hover:text-orange-300 transition-colors">
              <FaBrandsLinkedinIn />
            </a>
          </div>
        </div>
      </div>
      <div class="mt-8 pt-8 border-t border-orange-800 text-center text-sm">
        <div class="flex justify-center space-x-6 mb-4">
          <A href="/terms-and-conditions" class="hover:text-orange-300 transition-colors">
            Terms & Conditions
          </A>
          <A href="/privacy-policy" class="hover:text-orange-300 transition-colors">
            Privacy Policy
          </A>
        </div>
        <p>&copy; {new Date().getFullYear()} Aqua Protocol. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

const MainLayout: Component<{ children?: any }> = (props) => {
  const [loadingConfig, setLoadingConfig] = createSignal(true);
  const [webConfigData, setWebConfigData] = createSignal<WebConfig>(appStore.webConfig);
  let navigate = useNavigate();
  const getLogoUrl = (config: WebConfig): string | undefined => {
    if (typeof config.CUSTOM_LOGO_URL === 'string') {
      if (config.CUSTOM_LOGO_URL.startsWith('http://') ||
        config.CUSTOM_LOGO_URL.startsWith('https://') ||
        config.CUSTOM_LOGO_URL.startsWith('/')) {
        console.log("Custom logo url ", config.CUSTOM_LOGO_URL);
        return config.CUSTOM_LOGO_URL;
      }
      if (config.CUSTOM_LOGO_URL === "true") {
        return undefined;
      }
      return '/images/logo.png';
    }
    if (!config.CUSTOM_LOGO_URL) {
      return '/images/logo.png';
    }
    return undefined;
  };

  onMount(async () => {
    if (!appStore.webConfig.BACKEND_URL || appStore.webConfig.BACKEND_URL === "BACKEND_URL_PLACEHOLDER") {
      setLoadingConfig(true);
      try {
        const config: WebConfig = await fetch('/config.json').then(res => res.json());
        appStoreActions.setWebConfig(config);
        setWebConfigData(config);
      } catch (error) {
        console.error('Failed to load config:', error);
      } finally {
        setLoadingConfig(false);
      }
    } else {
      setWebConfigData(appStore.webConfig);
      setLoadingConfig(false);
    }
  });

  return (
    <>
      <Show when={loadingConfig()}>
        <div class="min-h-screen flex items-center justify-center">
          <div class="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
        </div>
      </Show>

      <Show when={!loadingConfig()}>
        <Show
          when={webConfigData().CUSTOM_LANDING_PAGE_URL === 'true' || webConfigData().CUSTOM_LANDING_PAGE_URL === true}
          fallback={
            <div class="bg-background text-foreground font-body flex flex-col min-h-screen">
              <Header />
              <main class="flex-grow">
                {props.children}
              </main>
              <Footer />
            </div>
          }
        >
          <div class="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-4">
            <div class="max-w-2xl mx-auto text-center space-y-8">
              {/* Logo Section */}
              <div class="flex justify-center mb-8">
                <Show when={getLogoUrl(webConfigData())}>
                  {(logoUrl) => (
                    <img
                      src={logoUrl()}
                      alt="Logo"
                      class="h-20 w-auto object-contain"
                    />
                  )}
                </Show>
              </div>

              {/* Welcome Section */}
              <div class="space-y-4">
                <h1 class="text-4xl md:text-5xl font-bold text-gray-900 font-headline">
                  Welcome to {webConfigData().CUSTOM_NAME}.
                </h1>
                <p class="text-xl text-gray-600 leading-relaxed max-w-xl mx-auto">
                  {webConfigData().CUSTOM_DESCRIPTION}
                </p>
              </div>

              {/* Description */}
              <div class="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-orange-100">
                <p class="text-gray-700 text-lg leading-relaxed">
                  Experience the future of data verification and integrity.
                  Our protocol ensures your data remains tamper-proof and verifiable
                  through advanced cryptographic techniques.
                </p>
              </div>

              {/* Action Button */}
              <div class="pt-4">
                <Button
                  onClick={() => {
                    navigate("/app")
                  }}
                  size="lg"
                  class="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <span class="flex items-center space-x-2">
                    <span>Launch Application</span>
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </Button>
              </div>

              {/* Footer Note */}
              <div class="pt-8">
                <p class="text-sm text-gray-500">
                  {webConfigData().CUSTOM_NAME} © {new Date().getFullYear()}. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </Show>
      </Show>
    </>
  );
};

export default MainLayout;