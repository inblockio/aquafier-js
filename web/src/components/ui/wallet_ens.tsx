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
    useEffect(() => {
        const fetchEnsName = async () => {
            let actualUrlToFetch = ensureDomainUrlHasSSL(`${backend_url}/user_ens/${walletAddress}`)

            setIsLoading(true)

            // Fetch the file from the URL
            const response = await fetch(actualUrlToFetch, {
                method: 'GET',
                headers: {
                    'Nonce': session?.nonce ?? "--error--" // Add the nonce directly as a custom header if needed
                }
            });

            setIsLoading(false)
            if (response.status == 200) {
                // Parse the response body as JSON
                const data = await response.json();

                if (data.success) {
                    setEnsName(data.ens);
                } else {
                    setEnsName(walletAddress);
                }
            } else {
                setEnsName(walletAddress)
            }
        }
        fetchEnsName();
    }, [])
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