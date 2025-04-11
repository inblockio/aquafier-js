import { useEffect, useState } from "react"
import {
    DrawerActionTrigger,
    DrawerBackdrop,
    DrawerBody,
    DrawerContent,
    DrawerFooter,
    DrawerRoot,
    DrawerTitle,

} from "./chakra-ui/drawer"
import { Button } from "./chakra-ui/button"
import { LuChevronDown, LuChevronUp, LuEye, LuX } from "react-icons/lu"
import { Box, Card, Collapsible, Drawer, For, GridItem, Portal, SimpleGrid,  VStack } from "@chakra-ui/react"
import { TimelineRoot } from "./chakra-ui/timeline"
import { getFileName } from "../utils/functions"
import { Alert } from "./chakra-ui/alert"
import Aquafier from "aqua-js-sdk"
import { WitnessAquaChain, SignAquaChain, DeleteAquaChain } from "./aqua_chain_actions"
import FilePreview from "./FilePreview"
import { useStore } from "zustand"
import appStore from "../store"
import { AquaTreeDetails, } from "../models/AquaTreeDetails"
import ShareButtonAction from "./actions/ShareButtonAction"
import { RevisionDetailsSummary , RevisionDisplay } from "./aquaTreeRevisionDetails"



export const ChainDetailsBtn = ({ fileInfo, session }: AquaTreeDetails) => {


    const [showMoreDetails, setShowMoreDetails] = useState(false)

    const { backend_url } = useStore(appStore)
    const [isOpen, setIsOpen] = useState(false)
    const [fileName, setFileName] = useState<string>("")

    const [verificationResults, setVerificationResults] = useState<Map<string, boolean>>(new Map())

    const verifyAquaTreeRevisions = async () => {
        let fileName = getFileName(fileInfo?.aquaTree!);
        setFileName(fileName)
        // verify revision
        let aquafier = new Aquafier();
        let revisionHashes = Object.keys(fileInfo.aquaTree!.revisions!);
        for (let revisionHash of revisionHashes) {
            let revision = fileInfo.aquaTree!.revisions![revisionHash];
            let verificationResult = await aquafier.verifyAquaTreeRevision(fileInfo.aquaTree!, revision, revisionHash, [...fileInfo.fileObject])

            let data = verificationResults;
            if (verificationResult.isOk()) {
                data.set(revisionHash, true)
            } else {
                data.set(revisionHash, false)
            }
            setVerificationResults(data)
        }
    }

    useEffect(() => {
        verifyAquaTreeRevisions()
    }, [fileInfo])

    useEffect(() => {
        if (isOpen) {
            const modalElement = document.getElementById('aqua-chain-details-modal');
            const customEvent = new CustomEvent('REPLACE_ADDRESSES', {
                detail: {
                    element: modalElement,
                },
            });
            window.dispatchEvent(customEvent);
        }
    }, [isOpen])

    const isVerificationComplete = (): boolean => verificationResults.size < Object.keys(fileInfo.aquaTree!.revisions!).length


    function isVerificationSuccessful(): boolean {
        for (const value of verificationResults.values()) {
            if (!value) { // Equivalent to value === false
                return true;
            }
        }
        return false;
    }


    const displayColorBasedOnVerificationStatusLight = () => {
        if (isVerificationComplete()) {
            return "grey"
        }

        return isVerificationSuccessful() ? 'green.100' : 'red.100'
    }
    const displayColorBasedOnVerificationStatusDark = () => {
        if (isVerificationComplete()) {
            return "whitesmoke"
        }

        return isVerificationSuccessful() ? 'green.900' : 'red.900'
    }
    const displayBasedOnVerificationStatusText = () => {
        if (isVerificationComplete()) {
            return "Verifying Aqua tree"
        }
        return isVerificationSuccessful() ? "This aqua tree  is valid" : "This aqua tree is invalid"
    }
    const displayColorBasedOnVerificationAlert = () => {
        if (isVerificationComplete()) {
            return "info"
        }

        return isVerificationSuccessful() ? 'success' : 'error'
    }
    return (
        <>
            <Button size={'xs'} colorPalette={'green'} variant={'subtle'} w={'100px'} onClick={() => setIsOpen(true)}>
                <LuEye />
                Details
            </Button>

            <DrawerRoot open={isOpen} size={{ base: 'full', mdToXl: "xl" }} id="aqua-chain-details-modal"
                onOpenChange={(e) => setIsOpen(e.open)} closeOnEscape={true} >


                <Portal>
                    <DrawerBackdrop />
                    <Drawer.Positioner>
                        <DrawerContent borderLeftRadius={'xl'} overflow={'hidden'}>
                            <Drawer.Header bg={{ base: displayColorBasedOnVerificationStatusLight(), _dark: displayColorBasedOnVerificationStatusDark() }}>
                                <DrawerTitle flex="1">{fileName}</DrawerTitle>
                                <Button
                                    position="absolute"
                                    right="8px"
                                    top="8px"
                                    colorPalette="whitesmoke"
                                    variant="solid"
                                    size="md"
                                    onClick={() => setIsOpen(false)}
                                    aria-label="Close drawer"
                                >
                                    <LuX />
                                </Button>
                            </Drawer.Header>
                            <DrawerBody py={'lg'} px={1}>
                                <Box>
                                    <SimpleGrid columns={{ base: 1, md: 5 }}>
                                        <GridItem colSpan={{ base: 1, md: 3 }}>
                                            <Card.Root border={'none'} shadow={'none'} borderRadius={'xl'}>
                                                <Card.Body>
                                                    <FilePreview fileInfo={fileInfo.fileObject[0]} />
                                                </Card.Body>
                                            </Card.Root>
                                        </GridItem>
                                        <GridItem colSpan={{ base: 1, md: 2 }}>
                                            <Card.Root borderRadius={'lg'} shadow={"none"}>
                                                <Card.Body>
                                                    <VStack gap={'4'}>
                                                        <Alert status={displayColorBasedOnVerificationAlert()} title={displayBasedOnVerificationStatusText()} />

                                                        <RevisionDetailsSummary isVerificationComplete={isVerificationComplete()} isVerificationSuccess={isVerificationSuccessful()} fileInfo={fileInfo} />
                                                        <Box w={'100%'}>
                                                            <Collapsible.Root open={showMoreDetails}>
                                                                <Collapsible.Trigger w="100%" py={'md'} onClick={() => setShowMoreDetails(open => !open)} cursor={'pointer'}>
                                                                    <Alert w={'100%'} status={"info"} textAlign={'start'} title={showMoreDetails ? `Show less Details` : `Show more Details`} icon={showMoreDetails ? <LuChevronUp /> : <LuChevronDown />} />
                                                                </Collapsible.Trigger>
                                                                <Collapsible.Content py={'4'}>

                                                                    {
                                                                        fileInfo.aquaTree ?
                                                                            <TimelineRoot size="lg" variant="subtle" maxW="xl">
                                                                                <For
                                                                                    each={Object.keys(fileInfo.aquaTree!.revisions)}
                                                                                >
                                                                                    {(revisionHash, index) => (
                                                                                        <RevisionDisplay key={`revision_${index}`}
                                                                                            fileInfo={fileInfo}
                                                                                            revision={fileInfo.aquaTree!.revisions[revisionHash]}
                                                                                            revisionHash={revisionHash}
                                                                                            isVerificationComplete={isVerificationComplete()}
                                                                                            verificationResults={verificationResults}

                                                                                        />

                                                                                    )}
                                                                                </For>
                                                                            </TimelineRoot>
                                                                            : <></>
                                                                    }
                                                                </Collapsible.Content>
                                                            </Collapsible.Root>
                                                        </Box>
                                                        {/* <Box minH={'400px'} /> */}
                                                    </VStack>
                                                </Card.Body>
                                            </Card.Root>
                                        </GridItem>
                                    </SimpleGrid>
                                </Box>

                            </DrawerBody>
                            <DrawerFooter flexWrap={'wrap'}>
                                <DrawerActionTrigger asChild>
                                    <Button variant="outline" size={'sm'}>Close</Button>
                                </DrawerActionTrigger>
                                <ShareButtonAction nonce={session?.nonce ?? ""} item={fileInfo} />
                                <WitnessAquaChain apiFileInfo={fileInfo} backendUrl={backend_url} nonce={session?.nonce ?? ""} revision="" />
                                <SignAquaChain apiFileInfo={fileInfo} backendUrl={backend_url} nonce={session?.nonce ?? ""} revision="" />
                                <DeleteAquaChain apiFileInfo={fileInfo} backendUrl={backend_url} nonce={session?.nonce ?? ""} revision="" />
                            </DrawerFooter>

                        </DrawerContent>
                    </Drawer.Positioner>
                </Portal>

            </DrawerRoot>

        </>
    )
}
