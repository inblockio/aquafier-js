import {  Group, Text } from "@chakra-ui/react";
import { ClipboardIconButton, ClipboardRoot } from "./chakra-ui/clipboard";
import { IItemDetailData } from "../models/AquaTreeDetails"


export const ItemDetail = ({ label, value, displayValue, showCopyIcon }: IItemDetailData) => {

    return (
        <Group textAlign={'start'} w={'100%'}>
            <Text>{label}</Text>
            <Group>
                <Text fontFamily={"monospace"} textWrap={'wrap'} wordBreak={'break-word'}>{displayValue}</Text>
                <ClipboardRoot value={value} hidden={!showCopyIcon}>
                    <ClipboardIconButton size={'2xs'} />
                </ClipboardRoot>
            </Group>
        </Group>
    )
}