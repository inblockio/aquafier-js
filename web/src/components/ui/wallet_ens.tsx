import { useCallback, useEffect, useState } from "react"
import { useStore } from "zustand"
// import { Button } from "@/components/ui/button"
import { Copy, Loader2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import appStore from "@/store"
import { ensureDomainUrlHasSSL, formatCryptoAddress } from "@/utils/functions"
import { Button } from "../ui/button"


export interface WalletEnsViewData {
    walletAddress: string
    inline?: boolean
}

export const WalletEnsView = ({ walletAddress, inline = false }: WalletEnsViewData) => {
    const [ensName, setEnsName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { session, backend_url } = useStore(appStore);

    const fetchData = useCallback(async () => {
        const controller = new AbortController();
        try {
            setIsLoading(true);
            const url = ensureDomainUrlHasSSL(`${backend_url}/user_ens/${walletAddress}`);
            const response = await fetch(url, {
                headers: { 'Nonce': session?.nonce ?? "--error--" },
                signal: controller.signal,
            });

            if (response.ok) {
                const data = await response.json();
                setEnsName(data.success ? data.ens : walletAddress);
            } else {
                setEnsName(walletAddress);
            }
        } catch (e) {
            if ((e as Error).name !== 'AbortError') {
                console.error(`Error fetching ENS: ${e}`);
                setEnsName(walletAddress);
            }
        } finally {
            setIsLoading(false);
        }

        const timeoutId = setTimeout(() => controller.abort(), 9000);
        return () => {
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, [walletAddress, backend_url, session?.nonce]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(walletAddress);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    return (
        <>
            {
                inline ? (
                    <TooltipProvider>
                        <Tooltip delayDuration={200}>
                            <TooltipTrigger asChild>
                                <span className="cursor-help">
                                    {ensName ? ensName.length > 35 ? formatCryptoAddress(walletAddress, 10, 4) : ensName : formatCryptoAddress(walletAddress, 10, 4)}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{walletAddress}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ) : (
                    <div className="flex flex-col items-start w-full gap-2">
                        <span className="text-sm font-medium">Wallet Address :</span>

                        {
                            isLoading ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                    <span className="text-xs">Checking ENS</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm break-words break-all">{ensName}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={copyToClipboard}
                                        className="h-6 w-6 p-0"
                                    >
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                </div>
                            )
                        }
                    </div>
                )
            }
        </>
    )
}