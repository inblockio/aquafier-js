import { useEffect } from "react";
import { copyToClipboardModern } from "../../utils/functions";

import { toaster } from "../chakra-ui/toaster";
import { DialogBody, DialogCloseTrigger, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../chakra-ui/dialog";
import { Circle, Dialog, Float, HStack, IconButton, Stack, Text } from "@chakra-ui/react";
import { LuCopy, LuExternalLink, LuShare2 } from "react-icons/lu";
import { useStore } from 'zustand'
import appStore from '../../store'
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { IAccountContracts } from "../../types/index";

export default function AccountContracts({ inline, open, updateOpenStatus }: IAccountContracts) {
    // const [contracts, setContracts] = useState<any[]>([])
    const { backend_url, session, setContracts, contracts } = useStore(appStore)

    let navigate = useNavigate();

    const loadAccountSharedContracts = async () => {
        if (!session) {
            return
        }
        try {
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
        } catch (error) {
            console.error(error)
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
                    id="contracts-shared-button-id"
                     data-testid="contracts-shared-button"
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
                            {
                                contracts?.length === 0 ? (
                                    <Text>No shared contracts found</Text>
                                ) : (
                                    contracts?.map((contract, i: number) => (
                                        <HStack key={`${contract.hash}-${i}`}>
                                            <IconButton data-testid={"shared-button-count-" + i} onClick={() => {
                                                // to navigate  to={`/share/${contract.hash}`
                                                updateOpenStatus?.(false)
                                                navigate(`/share/${contract.hash}`, { replace: true });
                                            }}>
                                                {i + 1}
                                            </IconButton>
                                            <Text flex={1} wordBreak={'break-word'}>{contract.sender}</Text>
                                            <Link to={`/share/${contract.hash}`}>
                                                <IconButton onClick={() => { updateOpenStatus?.(false) }}>
                                                    {/* <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0z"></path><path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"></path></svg> */}
                                                    <LuExternalLink />
                                                </IconButton>
                                            </Link>
                                            <IconButton data-testid={"shared-button-copy-" + i} onClick={async () => {
                                                let res = await copyToClipboardModern(`${window.location.href}/share/${contract.hash}`)
                                                if (res) {

                                                    toaster.create({
                                                        title: "Link copied ot clipoboard",
                                                        description: "",
                                                        type: "success",
                                                        duration: 3000,
                                                        // placement: "bottom-end"
                                                    });
                                                } else {

                                                    toaster.create({
                                                        description: `Error witnessing failed`,
                                                        type: "error"
                                                    })
                                                }
                                            }}>
                                                <Stack>
                                                    <LuCopy size={12} title="copy" />
                                                    {/* <Span fontSize={'x-small'} padding={0} mt={0}>copy</Span> */}
                                                </Stack>
                                            </IconButton>
                                        </HStack>
                                    )))}
                        </Stack>
                    </DialogBody>
                    <DialogCloseTrigger onClick={() => updateOpenStatus?.(false)} />
                </DialogContent>
            </Dialog.Root>
        </>
    );
}
