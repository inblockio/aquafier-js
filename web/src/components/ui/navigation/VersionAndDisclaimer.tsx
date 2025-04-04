import { useEffect, useState } from "react";
import { Button } from "../button";
import { DialogBody, DialogCloseTrigger, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../dialog";
import { Center, Dialog, Link, Spacer, Text, VStack } from "@chakra-ui/react";
import { LuMessageCircleWarning } from "react-icons/lu";
import { useStore } from 'zustand'
import appStore from '../../../store'
import { Alert } from "../alert";
import axios from "axios";
import { toaster } from "../toaster";
import VersionDetails from "../../../models/VersionDetails";

export default function VersionAndDisclaimer() {
    //   const {  es, avatar, setAvatar, setUserProfile, backend_url } = useStore(appStore);

    const { backend_url } = useStore(appStore)

    const [isOpen, setIsOpen] = useState(false);
    const [versionDetails, setVersionDetails] = useState<VersionDetails>({
        backend: "1.2.X",
        frontend: "1.2.X",
        aquifier: "1.2.X",
        protocol: "1.2.X"
    });






    const fetchVersionDetails = async () => {
        try {
            const url = `${backend_url}/version`

            const response = await axios.get(url)

            const res: VersionDetails = await response.data;


            if (response.status === 200) {
                setVersionDetails(res)
            }
        } catch (e: unknown) {
           //  console.log("Error fetching version ", e)
            toaster.create({
                description: "Error fetching version details",
                type: "error"
            })
        }
    }

    useEffect(() => {
        if (!backend_url.includes("0.0.0.0")) {
            fetchVersionDetails()
        }
    }, [backend_url])

    return (
        <Dialog.Root placement={"center"} size={"sm"} open={isOpen} onOpenChange={(details) => setIsOpen(details.open)}>
            <DialogTrigger asChild>
                <Button
                    size={"sm"}
                    borderRadius={"md"}
                    onClick={() => {
                        setIsOpen(true);
                        // !metamaskAddress && signAndConnect();
                    }}
                >
                    <LuMessageCircleWarning />
                    Info
                </Button>
            </DialogTrigger>
            <DialogContent borderRadius={"2xl"} overflow={"hidden"}>
                <DialogHeader py={"3"} px={"5"} bg={{ base: "rgb(188 220 255 / 22%)", _dark: "rgba(0, 0, 0, 0.3)" }}>
                    <DialogTitle fontWeight={500} color={"gray.800"} _dark={{ color: "white" }}>
                        Product Infomation
                    </DialogTitle>
                </DialogHeader>
                <DialogBody py={"8"} px={"5"}>

                    <VStack gap={5}>

                        <Center>
                            Product Verion Details
                        </Center>
                        <Text fontFamily={"monospace"}>aquafier Version : {versionDetails.aquifier}  </Text>
                        <Text fontFamily={"monospace"}>protocol Version : {versionDetails.protocol} </Text>
                        <Spacer height={30} />

                        <Alert status="error" title="" variant="solid"   >
                            This is prototype software,use it with caution.
                        </Alert>

                       <Text>
                       This software is developed by <Link href="https://inblock.io/" target="_blank"  style={{"color":"blue"}}>inblock.io</Link> assets GmbH <br/> </Text>
                        <Text>
                        The source code can be found:  <Link href="https://github.com/inblockio" target="_blank" style={{"color":"blue"}}>Inblock</Link>

                       </Text>
                        <Button borderRadius={"md"} onClick={() => {
                            setIsOpen(!isOpen);
                        }}>
                            close
                            {/* <LuClose /> */}
                        </Button>
                    </VStack>

                </DialogBody>
                <DialogCloseTrigger />
            </DialogContent>
        </Dialog.Root>
    );
}
