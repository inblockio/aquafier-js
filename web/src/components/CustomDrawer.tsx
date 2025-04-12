import { useEffect, useState } from "react"
import { Button } from "./chakra-ui/button"
import { LuChevronDown, LuChevronUp, LuEye } from "react-icons/lu"
import { Box, Card, Collapsible, For, GridItem, SimpleGrid, VStack } from "@chakra-ui/react"
import { TimelineRoot } from "./chakra-ui/timeline"
import { ensureDomainUrlHasSSL, getFileName, isArrayBufferText } from "../utils/functions"
import { Alert } from "./chakra-ui/alert"
import Aquafier, { FileObject } from "aqua-js-sdk"
import FilePreview from "./FilePreview"
import { IChainDetailsBtn, ICompleteChainView, IDrawerStatus, } from "../models/AquaTreeDetails"
import { RevisionDetailsSummary, RevisionDisplay } from "./aquaTreeRevisionDetails"
import { useStore } from "zustand"
import appStore from "../store"


export const ChainDetailsBtn = ({ callBack }: IChainDetailsBtn) => {

    return (
        <Button size={'xs'} colorPalette={'green'} variant={'subtle'} w={'100px'} onClick={callBack}>
            <LuEye />
            Details
        </Button>
    )
}

export const CompleteChainView = ({ fileInfo, callBack }: ICompleteChainView) => {


    const [showMoreDetails, setShowMoreDetails] = useState(false)
    const { session } = useStore(appStore)

    const [verificationResults, setVerificationResults] = useState<Map<string, boolean>>(new Map())

    const fetchFileData = async (url: string): Promise<string | ArrayBuffer | null> => {
        try {
            // const fileContentUrl: string = fileInfo.fileContent as string
            // console.log("File content url: ", url)

            let actualUrlToFetch = ensureDomainUrlHasSSL(url)

            const response = await fetch(actualUrlToFetch, {
                headers: {
                    nonce: `${session?.nonce}`
                }
            });
            if (!response.ok) throw new Error("Failed to fetch file");

            // Get MIME type from headers
            let contentType = response.headers.get("Content-Type") || "";
            //// console.log("Original Content-Type from headers:", contentType);

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

                return arrayBuffer;

            }
        } catch (e) {
            // console.log(`error occured fetch file ${e}`)
            return null
        }
    }

    const isVerificationSuccessful = (_verificationResults: Map<string, boolean>): boolean => {
        for (const value of _verificationResults.values()) {
            // // console.log(`Values ${value}`)
            if (!value) {
                return false
            }
        }
        return true;
    }

    const displayColorBasedOnVerificationStatusLight = (_verificationResults: Map<string, boolean>) => {
        if (!isVerificationComplete()) {
            return "grey"
        }

        return isVerificationSuccessful(_verificationResults) ? 'green.100' : 'red.100'
    }

    const displayColorBasedOnVerificationStatusDark = (_verificationResults: Map<string, boolean>) => {
        if (!isVerificationComplete()) {
            return "whitesmoke"
        }

        return isVerificationSuccessful(_verificationResults) ? 'green.900' : 'red.900'
    }

    const verifyAquaTreeRevisions = async () => {

        let aquafier = new Aquafier();
        let _drawerStatus: IDrawerStatus = {
            colorLight: "",
            colorDark: "",
            fileName: "",
            isVerificationSuccessful: false
        }



        let fileName = getFileName(fileInfo?.aquaTree!);
        // setFileName(fileName)
        _drawerStatus.fileName = fileName
        // verify revision
        let revisionHashes = Object.keys(fileInfo.aquaTree!.revisions!);



        let fileObjectVerifier: FileObject[] = [];

        for (let file of fileInfo.fileObject) {

            // console.log(`File loop name ${file.fileName} url  ${file.fileContent} type ${typeof file.fileContent}  `)
            if (typeof file.fileContent == 'string' && (file.fileContent.startsWith("http://") || file.fileContent.startsWith("https://"))) {
                let fileData = await fetchFileData(file.fileContent);
                // console.log(`console log type of string == >${fileData} `)

                if (fileData == null) {
                    console.error(`💣💣💣Unable to fetch file  from  ${file.fileContent}`)
                } else {
                    let fileItem = file
                    // Then in your loop:
                    if (fileData instanceof ArrayBuffer) {
                        if (isArrayBufferText(fileData)) {
                            // Convert to string
                            const decoder = new TextDecoder();
                            fileItem.fileContent = decoder.decode(fileData);
                        } else {
                            // Keep as binary
                            fileItem.fileContent = new Uint8Array(fileData);
                        }
                    } else if (typeof fileData === 'string') {
                        fileItem.fileContent = fileData;
                    } else {
                        console.error('Unexpected fileData type:', fileData);
                    }
                    fileObjectVerifier.push(fileItem)
                }
            } else {
                fileObjectVerifier.push(file)
            }

        }

        let allRevisionsVerificationsStatus: Map<string, boolean> = new Map()

        for (let revisionHash of revisionHashes) {
            let revision = fileInfo.aquaTree!.revisions![revisionHash];

            let verificationResult = await aquafier.verifyAquaTreeRevision(fileInfo.aquaTree!, revision, revisionHash, fileObjectVerifier)

            // console.log(`hash ${revisionHash} \n revision  ${JSON.stringify(revision, null, 4)} SDK DATA ${JSON.stringify(verificationResult, null, 4)}  \n is oky-> ${verificationResult.isOk()} \n file object ${JSON.stringify(fileObjectVerifier, null, 4)}`)

            if (verificationResult.isOk()) {
                allRevisionsVerificationsStatus.set(revisionHash, true);
            } else {
                allRevisionsVerificationsStatus.set(revisionHash, false);
            }
        }

        setVerificationResults(allRevisionsVerificationsStatus)
        let _isVerificationSuccesful = isVerificationSuccessful(allRevisionsVerificationsStatus)
        _drawerStatus.isVerificationSuccessful = _isVerificationSuccesful
        _drawerStatus.colorDark = displayColorBasedOnVerificationStatusDark(allRevisionsVerificationsStatus)
        _drawerStatus.colorLight = displayColorBasedOnVerificationStatusLight(allRevisionsVerificationsStatus)
        callBack(_drawerStatus)
    }

    const isVerificationComplete = (): boolean => {

        // // console.log(`result ${verificationResults.size}  vs aquq tree ${Object.keys(fileInfo.aquaTree!.revisions!).length}`)
        return verificationResults.size == Object.keys(fileInfo.aquaTree!.revisions!).length

    }

    const displayBasedOnVerificationStatusText = () => {
        if (!isVerificationComplete()) {
            return "Verifying Aqua tree"
        }
        return isVerificationSuccessful(verificationResults) ? "This aqua tree  is valid" : "This aqua tree is invalid"
    }
    const displayColorBasedOnVerificationAlert = () => {
        if (!isVerificationComplete()) {
            return "info"
        }

        return isVerificationSuccessful(verificationResults) ? 'success' : 'error'
    }

    useEffect(() => {
        verifyAquaTreeRevisions()
    }, [fileInfo])

   

    return (
        <>
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

                                    <RevisionDetailsSummary isVerificationComplete={isVerificationComplete()} isVerificationSuccess={isVerificationSuccessful(verificationResults)} fileInfo={fileInfo} />

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

        </>
    )
}
