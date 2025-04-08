import { useEffect, useState } from "react"

import { ClipboardIconButton, ClipboardRoot } from "./clipboard"l
import { LuCheck, LuChevronDown, LuChevronUp, LuExternalLink, LuEye, LuX } from "react-icons/lu"
import { Box, Card, Collapsible, Drawer, For, GridItem, Group, Icon, IconButton, Link, Portal, SimpleGrid, Span, Text, VStack } from "@chakra-ui/react"

export interface WalletEnsViewData {
    walletAddress: string
}
export const WalletEnsView = ({ walletAddress }: WalletEnsViewData) => {
    const [ensName, setEnsName] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {

    })
    return (
        <Group textAlign={'start'} w={'100%'}>
            <Text>{ensName}</Text>
            <Group>
                <Text fontFamily={"monospace"} textWrap={'wrap'} wordBreak={'break-word'}>{ensName}</Text>
                <ClipboardRoot value={walletAddress} hidden={false}>
                    <ClipboardIconButton size={'2xs'} />
                </ClipboardRoot>
            </Group>
        </Group>
    )

}