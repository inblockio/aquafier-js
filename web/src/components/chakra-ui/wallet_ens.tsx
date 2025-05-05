import { useEffect, useState } from "react"
import { useStore } from "zustand"
import { ClipboardIconButton, ClipboardRoot } from "./clipboard"
import { Group, Text, Spinner } from "@chakra-ui/react"
import { ensureDomainUrlHasSSL } from "../../utils/functions"

import appStore from "../../store"

export interface WalletEnsViewData {
    walletAddress: string
}

export const WalletEnsView = ({ walletAddress }: WalletEnsViewData) => {
    const [ensName, setEnsName] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const { session, backend_url } = useStore(appStore)
    


    const fetchData = async () =>{
        const controller = new AbortController();
        const signal = controller.signal;
        
        const fetchEnsName = async () => {
            try {
                let actualUrlToFetch = ensureDomainUrlHasSSL(`${backend_url}/user_ens/${walletAddress}`)
                setIsLoading(true)

                // Fetch the file from the URL with the abort signal
                const response = await fetch(actualUrlToFetch, {
                    method: 'GET',
                    headers: {
                        'Nonce': session?.nonce ?? "--error--"
                    },
                    signal: signal // Pass the abort signal to fetch
                });

                setIsLoading(false)
                if (response.status == 200) {
                    const data = await response.json();

                    if (data.success) {
                        setEnsName(data.ens);
                    } else {
                        setEnsName(walletAddress);
                    }
                } else {
                    setEnsName(walletAddress)
                }
            } catch (e) {
                // Check if this was an abort error
                if ((e as Error).name === 'AbortError') {
                    console.log('Fetch request was aborted due to timeout');
                } else {
                    console.log(`Error fetching ens ${e}`)
                }
                setIsLoading(false);
                setEnsName(walletAddress);
            }
        }
        
        fetchEnsName();

        // Set up the timeout to abort the request after 5 seconds
        const timeoutId = setTimeout(() => {
            controller.abort(); // This will cancel the fetch request
            setIsLoading(false);
            setEnsName(walletAddress);
        }, 9000);

        // Clean up function
        return () => {
            clearTimeout(timeoutId);
            controller.abort(); // Also cancel the request if component unmounts
        };
    }
    useEffect(() => {
       
        fetchData()
    }, [walletAddress, backend_url, session]); // Added missing dependencies

    useEffect(() => {
        fetchData()
    }, []);

    return (
        <Group textAlign={'start'} w={'100%'}>
            <Text>Wallet Address:</Text>

            {isLoading ? (
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
        </Group>
    )
}
