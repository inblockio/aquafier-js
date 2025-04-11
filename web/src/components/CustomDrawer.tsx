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
import { Box, Card, Collapsible, Drawer, For, GridItem, Portal, SimpleGrid, VStack } from "@chakra-ui/react"
import { TimelineRoot } from "./chakra-ui/timeline"
import { ensureDomainUrlHasSSL, getFileName } from "../utils/functions"
import { Alert } from "./chakra-ui/alert"
import Aquafier, { FileObject } from "aqua-js-sdk"
import { WitnessAquaChain, SignAquaChain, DeleteAquaChain } from "./aqua_chain_actions"
import FilePreview from "./FilePreview"
import { useStore } from "zustand"
import appStore from "../store"
import { AquaTreeDetails, } from "../models/AquaTreeDetails"
import ShareButtonAction from "./actions/ShareButtonAction"
import { RevisionDetailsSummary, RevisionDisplay } from "./aquaTreeRevisionDetails"



export const ChainDetailsBtn = ({ fileInfo, session }: AquaTreeDetails) => {


    const [showMoreDetails, setShowMoreDetails] = useState(false)

    const { backend_url } = useStore(appStore)
    const [isOpen, setIsOpen] = useState(false)
    const [fileName, setFileName] = useState<string>("")

    const [verificationResults, setVerificationResults] = useState<Map<string, boolean>>(new Map())

    const fetchFileData = async (url: string): Promise<string | Uint8Array<ArrayBufferLike> | null> => {
        try {
            // const fileContentUrl: string = fileInfo.fileContent as string
            console.log("File content url: ", url)

            let actualUrlToFetch = ensureDomainUrlHasSSL(url)

            const response = await fetch(actualUrlToFetch, {
                headers: {
                    nonce: `${session?.nonce}`
                }
            });
            if (!response.ok) throw new Error("Failed to fetch file");

            // Get MIME type from headers
            let contentType = response.headers.get("Content-Type") || "";
            //console.log("Original Content-Type from headers:", contentType);

            // Clone the response for potential text extraction
            const responseClone = response.clone();



            if (contentType.startsWith("text/") ||
                contentType === "application/json" ||
                contentType === "application/xml" ||
                contentType === "application/javascript") {

                return await responseClone.text();
            } else {


                // Get the raw data as ArrayBuffer and convert to Uint8Array
                const arrayBuffer = await response.arrayBuffer();
                return new Uint8Array(arrayBuffer);

            }
        } catch (e) {
            console.log(`error occured fetch file ${e}`)
            return null
        }
    }
    const verifyAquaTreeRevisions = async () => {

        let aquafier = new Aquafier();



        let fileName = getFileName(fileInfo?.aquaTree!);
        setFileName(fileName)
        // verify revision
        let revisionHashes = Object.keys(fileInfo.aquaTree!.revisions!);
        for (let revisionHash of revisionHashes) {
            let revision = fileInfo.aquaTree!.revisions![revisionHash];

            let fileObject: FileObject[] = [];

            for (let file of fileInfo.fileObject) {

                if (typeof file.fileContent == 'string') {
                    let fileData = await fetchFileData(file.fileContent);

                    if (fileData == null) {
                        console.error(`💣💣💣Unable to fetch file  from  ${file.fileContent}`)
                    } else {
                        let fileItem = file
                        fileItem.fileContent = fileData
                        fileObject.push(fileItem)
                    }
                } else {
                    fileObject.push(file)
                }

            }


            let verificationResult = await aquafier.verifyAquaTreeRevision(fileInfo.aquaTree!, revision, revisionHash, fileObject)

            console.log(`hash ${revisionHash} \n revision  ${JSON.stringify(revision, null, 4)} SDK DATA ${JSON.stringify(verificationResult, null, 4)}  \n is oky-> ${verificationResult.isOk()}`)
            // Create a new Map reference for the state update
            setVerificationResults(prevResults => {
                const newResults = new Map(prevResults);
                if (verificationResult.isOk()) {
                    newResults.set(revisionHash, true);
                } else {
                    newResults.set(revisionHash, false);
                }
                return newResults;
            });
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

    const isVerificationComplete = (): boolean => {

        // console.log(`result ${verificationResults.size}  vs aquq tree ${Object.keys(fileInfo.aquaTree!.revisions!).length}`)
        return verificationResults.size == Object.keys(fileInfo.aquaTree!.revisions!).length

    }

    const isVerificationSuccessful = (): boolean => {
        for (const value of verificationResults.values()) {
            // console.log(`Values ${value}`)
            if (!value) {
                return false
            }
        }
        return true;
    }


    const displayColorBasedOnVerificationStatusLight = () => {
        if (!isVerificationComplete()) {
            return "grey"
        }

        return isVerificationSuccessful() ? 'green.100' : 'red.100'
    }
    const displayColorBasedOnVerificationStatusDark = () => {
        if (!isVerificationComplete()) {
            return "whitesmoke"
        }

        return isVerificationSuccessful() ? 'green.900' : 'red.900'
    }
    const displayBasedOnVerificationStatusText = () => {
        if (!isVerificationComplete()) {
            return "Verifying Aqua tree"
        }
        return isVerificationSuccessful() ? "This aqua tree  is valid" : "This aqua tree is invalid"
    }
    const displayColorBasedOnVerificationAlert = () => {
        if (!isVerificationComplete()) {
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
