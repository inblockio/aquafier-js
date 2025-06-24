import { useCallback, useEffect, useState } from "react"
import { useStore } from "zustand"
import { ClipboardIconButton, ClipboardRoot } from "./clipboard"
import { Group, Text, Spinner, Span } from "@chakra-ui/react"
import { ensureDomainUrlHasSSL, formatCryptoAddress } from "../../utils/functions"

import appStore from "../../store"
import { Tooltip } from "./tooltip"

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

    return (
        <>
            {
                inline ? (
                    <>
                        <Tooltip content={walletAddress} openDelay={200} closeDelay={100}>
                            <Span>
                                {ensName ? ensName.length > 35 ? formatCryptoAddress(walletAddress, 10, 4) : ensName : formatCryptoAddress(walletAddress, 10, 4)}
                            </Span>
                        </Tooltip>
                    </>
                ) : (
                    <Group textAlign={'start'} w={'100%'}>
                        <Text>Wallet Address :</Text >

                        {
                            isLoading ? (
                                <>
                                    <Spinner size="sm" color="blue.500" />
                                    <Text fontSize={8}>Checking ENS</Text>
                                </>
                            ) : (
                                <>
                                    <Group>
                                        <Text fontFamily={"monospace"} textWrap={'wrap'} wordBreak={'break-word'}>{ensName}</Text>
                                        <ClipboardRoot value={walletAddress} hidden={false}>
                                            <ClipboardIconButton size={'2xs'} />
                                        </ClipboardRoot>
                                    </Group>
                                </>
                            )}
                    </Group >
                )
            }
        </>
    )
}
