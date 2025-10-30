import appStore from "../../store";
import { ConnectWalletPage } from "../auth/connect_wallet_page";

// src/App.tsx
export default function AquafireApp() {

  const {  webConfig, session } = appStore;


  if (!session) {

    return (  <>
    <ConnectWalletPage />
    </>);

  }
  return (
    <div class="min-h-screen bg-gray-100 flex items-center justify-center">
      <h1 class="text-3xl font-bold text-blue-600">
        Tailwind + SolidJS ✅
      </h1>
    </div>
  );
}