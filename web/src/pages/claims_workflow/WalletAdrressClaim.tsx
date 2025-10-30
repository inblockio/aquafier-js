import { createSignal, createEffect, lazy, Suspense, Show } from "solid-js";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../../components/ui/hover_card";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { ArrowRightLeft } from "lucide-solid";
import CopyButton from "../../components/ui/copy_button";
import appStore, { appStoreActions } from "../../store";

import { generateAvatar, getWalletClaims } from "../../utils/functions";
import type { IIdentityClaimDetails } from "../../types/types";

const WalletAddressProfile = lazy(() => import("./WalletAddressProfile"));

interface WalletAddressClaimProps {
  walletAddress: string;
  isShortened?: boolean;
  avatarOnly?: boolean;
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase();

export default function WalletAddressClaim(props: WalletAddressClaimProps) {
  const [identityClaimDetails, setIdentityClaimDetails] = createSignal<IIdentityClaimDetails | null>(null);
  const [showWalletAddress, setShowWalletAddress] = createSignal(false);
  const [open, setOpen] = createSignal(false);

  // const { files, systemFileInfo, setSelectedFileInfo } = useStore(appStore);
const { setSelectedFileInfo } = appStoreActions;
  const handleClick = () => setOpen(true);

  createEffect(() => {
    const details = getWalletClaims(appStore.systemFileInfo, appStore.files.fileData, props.walletAddress, setSelectedFileInfo);
    setIdentityClaimDetails(details);
  });

  return (
    <HoverCard open={open()} onOpenChange={setOpen}>
      <HoverCardTrigger>
        <div class="inline-block w-full">
          <Show
            when={props.avatarOnly}
            fallback={
              <div class="p-0 flex gap-2 items-center flex-wrap break-all">
                <p
                  class="p-0 text-xs flex-1 cursor-pointer font-mono font-medium"
                  style={{
                    "word-break": "break-all",
                    "word-wrap": "break-word",
                    "text-wrap": "wrap",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClick();
                  }}
                >
                  {showWalletAddress() ? props.walletAddress : identityClaimDetails()?.name || props.walletAddress}
                </p>
                <CopyButton text={`${props.walletAddress}`} isIcon={true} />
                <Show when={identityClaimDetails()}>
                  <ArrowRightLeft
                    size={16}
                    class="cursor-pointer"
                    onClick={() => setShowWalletAddress((p) => !p)}
                  />
                </Show>
              </div>
            }
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar
                  class="h-8 w-8 border-2 rounded-full border-blue-500 cursor-pointer"
                  onClick={handleClick}
                >
                  <AvatarImage src={generateAvatar(props.walletAddress)} alt="Avatar" />
                  <AvatarFallback class="text-xs">{getInitials(props.walletAddress)}</AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <span class="flex gap-0 items-center">
                  <p class="text-sm">
                    {showWalletAddress()
                      ? props.walletAddress
                      : identityClaimDetails()?.name || props.walletAddress}
                  </p>
                  <CopyButton text={`${props.walletAddress}`} isIcon={true} />
                  <Show when={identityClaimDetails()}>
                    <ArrowRightLeft
                      size={16}
                      class="cursor-pointer"
                      onClick={() => setShowWalletAddress((p) => !p)}
                    />
                  </Show>
                </span>
              </TooltipContent>
            </Tooltip>
          </Show>
        </div>
      </HoverCardTrigger>

      <HoverCardContent class="w-[350px] p-0">
        <Suspense fallback={<p class="p-6">Loading...</p>}>
          <WalletAddressProfile
            walletAddress={props.walletAddress}
            showShadow={false}
            noBg={true}
          />
        </Suspense>
      </HoverCardContent>
    </HoverCard>
  );
}
