import { useEffect, useState } from "react"
import { Button } from "./chakra-ui/button"
import { LuChevronDown, LuChevronUp, LuEye } from "react-icons/lu"
import { Box, Card, Collapsible, For, GridItem, SimpleGrid, VStack } from "@chakra-ui/react"
import { TimelineRoot } from "./chakra-ui/timeline"
import { ensureDomainUrlHasSSL, getAquaTreeFileObject, getFileName, isArrayBufferText } from "../utils/functions"
import { Alert } from "./chakra-ui/alert"
import Aquafier, { FileObject } from "aqua-js-sdk"
import FilePreview from "./FilePreview"
import { IChainDetailsBtn, ICompleteChainView, IDrawerStatus, VerificationHashAndResult, } from "../models/AquaTreeDetails"
import { RevisionDetailsSummary, RevisionDisplay } from "./aquaTreeRevisionDetails"
import { useStore } from "zustand"
import appStore from "../store"
import { ApiFileInfo } from "../models/FileInfo"


export const ChainDetailsBtn = ({ callBack }: IChainDetailsBtn) => {

    return (
        <Button size={'xs'} colorPalette={'green'} variant={'subtle'} w={'100px'} onClick={callBack}>
            <LuEye />
            Details
        </Button>
    )
}

export const CompleteChainView = ({ callBack, selectedFileInfo }: ICompleteChainView) => {

    const [showMoreDetails, setShowMoreDetails] = useState(false)
    const { session } = useStore(appStore)
    const [deletedRevisions, setDeletedRevisions] = useState<string[]>([])

    const [verificationResults, setVerificationResults] = useState<VerificationHashAndResult[]>([])

    const fetchFileData = async (url: string): Promise<string | ArrayBuffer | null> => {
        try {
            // const fileContentUrl: string = selectedFileInfo.fileContent as string

            let actualUrlToFetch = ensureDomainUrlHasSSL(url)

            const response = await fetch(actualUrlToFetch, {
                headers: {
                    nonce: `${session?.nonce}`
                }
            });
            if (!response.ok) throw new Error("Failed to fetch file");

            // Get MIME type from headers
            let contentType = response.headers.get("Content-Type") || "";

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
            return null
        }
    }

    const isVerificationSuccessful = (_verificationResults: VerificationHashAndResult[]): boolean => {
        for (const item of _verificationResults.values()) {
            // // console.log(`Values ${value}`)
            if (!item.isSuccessful) {
                return false
            }
        }
        return true;
    }

    const displayColorBasedOnVerificationStatusLight = (_verificationResults: VerificationHashAndResult[]) => {
        if (!isVerificationComplete(_verificationResults)) {
            return "grey"
        }

        return isVerificationSuccessful(_verificationResults) ? 'green.100' : 'red.100'
    }

    const displayColorBasedOnVerificationStatusDark = (_verificationResults: VerificationHashAndResult[]) => {
        if (!isVerificationComplete(_verificationResults)) {
            return "whitesmoke"
        }

        return isVerificationSuccessful(_verificationResults) ? 'green.900' : 'red.900'
    }

    const verifyAquaTreeRevisions = async (fileInfo: ApiFileInfo) => {
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
        let revisionHashes = Object.keys(fileInfo?.aquaTree!.revisions!);



        let fileObjectVerifier: FileObject[] = [];

        for (let file of fileInfo?.fileObject!!) {

            if (typeof file.fileContent == 'string' && (file.fileContent.startsWith("http://") || file.fileContent.startsWith("https://"))) {
                let fileData = await fetchFileData(file.fileContent);

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

        let allRevisionsVerificationsStatus: VerificationHashAndResult[] = []

        for (let revisionHash of revisionHashes) {
            let revision = fileInfo?.aquaTree!.revisions![revisionHash];

            let verificationResult = await aquafier.verifyAquaTreeRevision(fileInfo?.aquaTree!, revision!!, revisionHash, fileObjectVerifier)
            console.log(`111. Revision: ${revisionHash}`, verificationResult)
            if (verificationResult.isOk()) {
                allRevisionsVerificationsStatus.push({ hash: revisionHash, isSuccessful: true });
            } else {
                allRevisionsVerificationsStatus.push({ hash: revisionHash, isSuccessful: false });
            }
        }

        setVerificationResults(allRevisionsVerificationsStatus)
        let _isVerificationSuccesful = isVerificationSuccessful(allRevisionsVerificationsStatus)
        _drawerStatus.isVerificationSuccessful = _isVerificationSuccesful
        _drawerStatus.colorDark = displayColorBasedOnVerificationStatusDark(allRevisionsVerificationsStatus)
        _drawerStatus.colorLight = displayColorBasedOnVerificationStatusLight(allRevisionsVerificationsStatus)
        callBack(_drawerStatus)
    }

    const isVerificationComplete = (_verificationResults: VerificationHashAndResult[]): boolean => {

        // // console.log(`result ${verificationResults.size}  vs aquq tree ${Object.keys(selectedFileInfo.aquaTree!.revisions!).length}`)
        return _verificationResults.length === Object.keys(selectedFileInfo?.aquaTree!.revisions!).length

    }

    const displayBasedOnVerificationStatusText = (_verificationResults: VerificationHashAndResult[]) => {
        if (!isVerificationComplete(_verificationResults)) {
            return "Verifying Aqua tree"
        }
        return isVerificationSuccessful(verificationResults) ? "This aqua tree  is valid" : "This aqua tree is invalid"
    }
    const displayColorBasedOnVerificationAlert = (_verificationResults: VerificationHashAndResult[]) => {
        if (!isVerificationComplete(_verificationResults)) {
            return "info"
        }

        return isVerificationSuccessful(verificationResults) ? 'success' : 'error'
    }

    useEffect(() => {
        if(selectedFileInfo){
            verifyAquaTreeRevisions(selectedFileInfo)
        }
    }, [Object.keys(selectedFileInfo?.aquaTree?.revisions ?? {}).length, deletedRevisions])
   
    const deleteRevision = (revisionHash: string) => {
        setDeletedRevisions(prev => [...prev, revisionHash])
    }

    return (
        <>
            <Box>
                <SimpleGrid columns={{ base: 1, md: 5 }}>
                    <GridItem colSpan={{ base: 1, md: 3 }}>
                        <Card.Root border={'none'} shadow={'none'} borderRadius={'xl'}>
                            <Card.Body>
                                <FilePreview fileInfo={getAquaTreeFileObject(selectedFileInfo!!)!!} />
                            </Card.Body>
                        </Card.Root>
                    </GridItem>
                    <GridItem colSpan={{ base: 1, md: 2 }}>
                        <Card.Root borderRadius={'lg'} shadow={"none"}>
                            <Card.Body>
                                <VStack gap={'4'}>
                                    <Alert status={displayColorBasedOnVerificationAlert(verificationResults)} title={displayBasedOnVerificationStatusText(verificationResults)} />

                                    <RevisionDetailsSummary isVerificationComplete={isVerificationComplete(verificationResults)} isVerificationSuccess={isVerificationSuccessful(verificationResults)} fileInfo={selectedFileInfo!!} />

                                    <Box w={'100%'}>
                                        <Collapsible.Root open={showMoreDetails}>
                                            <Collapsible.Trigger w="100%" py={'md'} onClick={() => setShowMoreDetails(open => !open)} cursor={'pointer'}>
                                                <Alert w={'100%'} status={"info"} textAlign={'start'} title={showMoreDetails ? `Show less Details` : `Show more Details`} icon={showMoreDetails ? <LuChevronUp /> : <LuChevronDown />} />
                                            </Collapsible.Trigger>
                                            <Collapsible.Content py={'4'}>

                                                {
                                                    selectedFileInfo?.aquaTree ?
                                                        <TimelineRoot size="lg" variant="subtle">
                                                            <For
                                                                each={Object.keys(selectedFileInfo?.aquaTree!.revisions!!).filter(revisionHash => !deletedRevisions.includes(revisionHash))}
                                                            >
                                                                {(revisionHash, index) => (
                                                                    <RevisionDisplay key={`revision_${index}`}
                                                                        fileInfo={selectedFileInfo!!}
                                                                        revision={selectedFileInfo?.aquaTree!.revisions[revisionHash]!!}
                                                                        revisionHash={revisionHash}
                                                                        isVerificationComplete={isVerificationComplete(verificationResults)}
                                                                        verificationResults={verificationResults}
                                                                        isDeletable={index === Object.keys(selectedFileInfo?.aquaTree!.revisions!!).length - 1}
                                                                        deleteRevision={deleteRevision}
                                                                        index={index}
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
