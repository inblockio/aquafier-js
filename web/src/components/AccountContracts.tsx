import { useEffect, useState } from "react";
import { DialogBody, DialogCloseTrigger, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./chakra-ui/dialog";
import { Circle, Dialog, Float, HStack, IconButton, Stack, Text } from "@chakra-ui/react";
import { LuLink2, LuShare2 } from "react-icons/lu";
import { useStore } from 'zustand'
import appStore from '../store'
import axios from "axios";
import { Link } from "react-router-dom";
import { IAccountContracts } from "../types/index";

export default function AccountContracts({ inline, open, updateOpenStatus }: IAccountContracts) {
    const [contracts, setContracts] = useState<any[]>([])
    const { backend_url, session } = useStore(appStore)

    const loadAccountSharedContracts = async () => {
        const url = `${backend_url}/contracts`;
        const response = await axios.get(url, {
            params: {
                receiver: session?.address
            },
            headers: {
                'nonce': session?.nonce
            }
        });
        if (response.status === 200) {
            setContracts(response.data?.contracts)
        }
    }

    // console.log(contracts)

    useEffect(() => {
        loadAccountSharedContracts()
    }, [backend_url, session])

    return (
        <>
            <Dialog.Root size={"md"} lazyMount open={open}
            // onOpenChange={(e) => updateOpenStatus?.(e.open)}
            >
                <DialogTrigger asChild >
                    <IconButton
                        size={"sm"}
                        borderRadius={"md"}
                        hidden={inline}
                        onClick={() => updateOpenStatus?.(true)}
                    >
                        <LuShare2 />
                        <Float>
                            <Circle size="5" bg="black" color="white">
                                {contracts?.length || 0}
                            </Circle>
                        </Float>
                    </IconButton>
                </DialogTrigger>
                <DialogContent borderRadius={"xl"} overflow={"hidden"}>
                    <DialogHeader py={"3"} px={"5"} bg={{ base: "rgb(188 220 255 / 22%)", _dark: "rgba(0, 0, 0, 0.3)" }}>
                        <DialogTitle fontWeight={500} color={"gray.800"} _dark={{ color: "white" }}>
                            Shared Contracts
                        </DialogTitle>
                    </DialogHeader>
                    <DialogBody py={"8"} px={"5"}>
                        <Stack>
                            {contracts?.map((contract, i: number) => (
                                <HStack key={`${contract.hash}-${i}`}>
                                    <IconButton>
                                        {i + 1}
                                    </IconButton>
                                    <Text flex={1} wordBreak={'break-word'}>{contract.sender}</Text>
                                    <Link to={`/share/${contract.hash}`}>
                                        <IconButton onClick={() => { updateOpenStatus?.(false) }}>
                                            <LuLink2 />
                                        </IconButton>
                                    </Link>
                                </HStack>
                            ))}
                        </Stack>
                    </DialogBody>
                    <DialogCloseTrigger onClick={() => updateOpenStatus?.(false)} />
                </DialogContent>
            </Dialog.Root>
        </>
    );
}
