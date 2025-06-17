import { useEffect, useState, useCallback } from "react"
import { Button } from "./chakra-ui/button"
import { LuChevronDown, LuChevronUp, LuEye } from "react-icons/lu"
import { Box, Card, Collapsible, For, GridItem, SimpleGrid, VStack } from "@chakra-ui/react"
import { TimelineRoot } from "./chakra-ui/timeline"
import { ensureDomainUrlHasSSL, getAquaTreeFileName, getAquaTreeFileObject, getFileName, isArrayBufferText, isWorkFlowData } from "../utils/functions"
import { Alert } from "./chakra-ui/alert"
import Aquafier, { FileObject, LogData } from "aqua-js-sdk"
import FilePreview from "./FilePreview"
import { IChainDetailsBtn, ICompleteChainView, IDrawerStatus, VerificationHashAndResult, } from "../models/AquaTreeDetails"
import { RevisionDetailsSummary, RevisionDisplay } from "./aquaTreeRevisionDetails"
import { useStore } from "zustand"
import appStore from "../store"
import { getFileHashFromUrl } from "../utils/functions";
import { ApiFileInfo } from "../models/FileInfo"
import { toaster } from "./chakra-ui/toaster"
import { LogViewer } from "./logs/LogViewer"
// import { toaster } from "./chakra-ui/toaster"


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

    const [isSelectedFileAWorkFlow, setSelectedFileAWorkFlow] = useState(false)
    const { session, setApiFileData, apiFileData, systemFileInfo, user_profile } = useStore(appStore)
    const [deletedRevisions, setDeletedRevisions] = useState<string[]>([])
    const [verificationResults, setVerificationResults] = useState<VerificationHashAndResult[]>([])
    const [allLogs, setAllLogs] = useState<LogData[]>([])
    const [isProcessing, setIsProcessing] = useState(false)

    // Memoized fetch function to prevent recreation on each render
    const fetchFileData = async (url: string): Promise<string | ArrayBuffer | null> => {
        try {
            const actualUrlToFetch = ensureDomainUrlHasSSL(url);

            const response = await fetch(actualUrlToFetch, {
                headers: {
                    nonce: `${session?.nonce}`
                }
            });
            if (!response.ok) throw new Error("Failed to fetch file");

            // Get MIME type from headers
            const contentType = response.headers.get("Content-Type") || "";

            // Process based on content type
            if (contentType.startsWith("text/") ||
                contentType === "application/json" ||
                contentType === "application/xml" ||
                contentType === "application/javascript") {
                return await response.text();
            } else {
                return await response.arrayBuffer();
            }
        } catch (e) {
            console.error("Error fetching file:", e);
            return null;
        }
    }

    // Memoized verification status check to prevent recalculation
    const isVerificationSuccessful = useCallback((_verificationResults: VerificationHashAndResult[]): boolean => {
        for (const item of _verificationResults.values()) {
            if (!item.isSuccessful) {
                return false;
            }
        }
        return true;
    }, []);

    // Memoized color functions to prevent recalculation
    const displayColorBasedOnVerificationStatusLight = useCallback((_verificationResults: VerificationHashAndResult[]) => {
        if (!isVerificationComplete(_verificationResults)) {
            return "grey";
        }
        return isVerificationSuccessful(_verificationResults) ? 'green.100' : 'red.100';
    }, []);

    const displayColorBasedOnVerificationStatusDark = useCallback((_verificationResults: VerificationHashAndResult[]) => {
        if (!isVerificationComplete(_verificationResults)) {
            return "whitesmoke";
        }
        return isVerificationSuccessful(_verificationResults) ? 'green.900' : 'red.900';
    }, []);

    // Optimized verification function with parallel processing
    const verifyAquaTreeRevisions = async (fileInfo: ApiFileInfo) => {
        if (!fileInfo?.aquaTree || !fileInfo?.fileObject || isProcessing) return;

        setIsProcessing(true);

        try {
            const aquafier = new Aquafier();
            const _drawerStatus: IDrawerStatus = {
                colorLight: "",
                colorDark: "",
                fileName: "",
                isVerificationSuccessful: false
            };

            // Set file name
            const fileName = getFileName(fileInfo.aquaTree);
            _drawerStatus.fileName = fileName;

            // Get revision hashes
            const revisionHashes = Object.keys(fileInfo.aquaTree.revisions || {});

            // Create a map for quick cache lookup
            const cacheMap = new Map();
            if (Array.isArray(apiFileData)) {
                apiFileData.forEach(item => {
                    if (item && item.fileHash) {
                        cacheMap.set(item.fileHash, item.fileData);
                    }
                });
            }

            // Process files in parallel
            const filePromises = [];
            const fileObjectVerifier: FileObject[] = [];

            for (const file of fileInfo.fileObject) {
                if (typeof file.fileContent === 'string' &&
                    (file.fileContent.startsWith("http://") || file.fileContent.startsWith("https://"))) {

                    const fileContentUrl = file.fileContent;
                    const fileHash = getFileHashFromUrl(fileContentUrl);

                    // Check cache first
                    let fileData = fileHash.length > 0 ? cacheMap.get(fileHash) : null;

                    if (!fileData) {
                        // If not in cache, create a promise to fetch it
                        const fetchPromise = fetchFileData(fileContentUrl).then(data => {

                            if (data && fileHash.length > 0) {
                                // Update cache
                                // setApiFileData((prev: any) => {
                                //     const prevArray = Array.isArray(prev) ? prev : [];
                                //     return [...prevArray, { fileHash, fileData: data }];
                                // });
                                let dd = Array.isArray(apiFileData) ? [...apiFileData] : [];
                                dd.push({ fileHash, fileData })
                                setApiFileData(dd)
                                return { file, data };
                            }
                            return null;
                        });
                        filePromises.push(fetchPromise);
                    } else {
                        // If in cache, process immediately
                        const fileItem = { ...file };
                        if (fileData instanceof ArrayBuffer) {
                            if (isArrayBufferText(fileData)) {
                                fileItem.fileContent = new TextDecoder().decode(fileData);
                            } else {
                                fileItem.fileContent = new Uint8Array(fileData);
                            }
                        } else if (typeof fileData === 'string') {
                            fileItem.fileContent = fileData;
                        }
                        fileObjectVerifier.push(fileItem);
                    }
                } else {
                    // Non-URL files can be added directly
                    fileObjectVerifier.push(file);
                }
            }

            // Wait for all file fetches to complete
            if (filePromises.length > 0) {
                const fetchedFiles = await Promise.all(filePromises);

                // Process fetched files
                for (const result of fetchedFiles) {
                    if (result) {
                        const { file, data } = result;
                        const fileItem = { ...file };

                        if (data instanceof ArrayBuffer) {
                            if (isArrayBufferText(data)) {
                                // console.log("is array buffr text .....")
                                fileItem.fileContent = new TextDecoder().decode(data);
                            } else {
                                fileItem.fileContent = new Uint8Array(data);
                            }
                        } else if (typeof data === 'string') {
                            fileItem.fileContent = data;
                        }

                        fileObjectVerifier.push(fileItem);
                    }
                }
            }

            let containsWitness= false
            for(let item of revisionHashes){
                let revisionItem = fileInfo.aquaTree.revisions[item]
                if(revisionItem.revision_type=="witness"){
                    containsWitness= true
                    break;
                }
            }

            if(containsWitness){
// Toast to warn the user if they are using default alchemykey
            if (user_profile?.alchemy_key == "") {
                toaster.create({
                    description: `Please add your alchemy key to avoid rate limiting`,
                    type: "warning"
                })
            }else if(user_profile?.alchemy_key == "ZaQtnup49WhU7fxrujVpkFdRz4JaFRtZ"){
                toaster.create({
                    description: `You are using default alchemy key. Please update it in settings to get better results`,
                    type: "warning"
                })
            }
            }


            

            // Process revisions in parallel where possible
            const verificationPromises = revisionHashes.map(async revisionHash => {
                
                const revision = fileInfo.aquaTree!.revisions[revisionHash];

                const result = await aquafier.verifyAquaTreeRevision(
                    fileInfo.aquaTree!,
                    revision,
                    revisionHash,
                    fileObjectVerifier,
                    {
                        mnemonic: "",
                        nostr_sk: "",
                        did_key: "",
                        alchemy_key: user_profile?.alchemy_key ?? "",
                        witness_eth_network: user_profile?.witness_network ?? "sepolia",
                        witness_method: "metamask",
                    }
                )
                // console.log("Hash: ", revisionHash, "\nResult", result)
                return ({
                    hash: revisionHash,
                    isSuccessful: result.isOk(),
                    logs: result.isOk() ? result.data.logData : result.data
                })
            });

            // Wait for all verifications to complete
            const allRevisionsVerificationsStatus = await Promise.all(verificationPromises);
            // console.log("allRevisionsVerificationsStatus", allRevisionsVerificationsStatus)

            // Update state and callback
            setVerificationResults(allRevisionsVerificationsStatus);
            setAllLogs(allRevisionsVerificationsStatus.map(item => item.logs).flat());
            const _isVerificationSuccessful = isVerificationSuccessful(allRevisionsVerificationsStatus);
            _drawerStatus.isVerificationSuccessful = _isVerificationSuccessful;
            _drawerStatus.colorDark = displayColorBasedOnVerificationStatusDark(allRevisionsVerificationsStatus);
            _drawerStatus.colorLight = displayColorBasedOnVerificationStatusLight(allRevisionsVerificationsStatus);
            callBack(_drawerStatus);
        } catch (error) {
            console.error("Error verifying AquaTree revisions:", error);
        } finally {
            setIsProcessing(false);
        }
    }

    // Memoized verification completion check
    const isVerificationComplete = useCallback((_verificationResults: VerificationHashAndResult[]): boolean => {
        return selectedFileInfo?.aquaTree?.revisions ?
            _verificationResults.length === Object.keys(selectedFileInfo.aquaTree.revisions).length : false;
    }, [selectedFileInfo?.aquaTree?.revisions]);

    // Memoized display text function
    const displayBasedOnVerificationStatusText = (verificationResults: any) => {
        if (!isVerificationComplete(verificationResults)) {
            return "Verifying Aqua tree";
        }
        return isVerificationSuccessful(verificationResults) ? "This aqua tree is valid" : "This aqua tree is invalid";
    }

    // Memoized alert color function
    const displayColorBasedOnVerificationAlert = (verificationResults: any): "info" | "success" | "error" => {
        if (!isVerificationComplete(verificationResults)) {
            return "info";
        }
        return isVerificationSuccessful(verificationResults) ? 'success' : 'error';
    }

    // Optimized useEffect with proper dependencies
    useEffect(() => {
        if (selectedFileInfo) {
            verifyAquaTreeRevisions(selectedFileInfo);

            let someData = systemFileInfo.map((e) => {
                try {
                    return getAquaTreeFileName(e.aquaTree!!)
                } catch (e) {
                    // console.log("Error")
                    return ""
                }
            })
            let { isWorkFlow } = isWorkFlowData(selectedFileInfo.aquaTree!!, someData);
            // console.log(`Drawer selected file aqua tree is workflow ${isWorkFlow} -- workflow name ${workFlow}`)
            if (isWorkFlow) {
                setSelectedFileAWorkFlow(true)
            }

        }
    }, [
        // Only re-run when the number of revisions changes or when deletions happen
        JSON.stringify(selectedFileInfo),
        Object.keys(selectedFileInfo?.aquaTree?.revisions ?? {}).length,
        deletedRevisions.length
    ]);

    // Memoized delete revision function
    const deleteRevision = useCallback((revisionHash: string) => {
        setDeletedRevisions(prev => [...prev, revisionHash]);
    }, []);

    return (
        <>
            <Box>
                <SimpleGrid columns={{ base: 1, md: 5 }}>
                    <GridItem colSpan={{ base: 1, md: 3 }}>
                        <Card.Root border={'none'} shadow={'none'} borderRadius={'xl'}>
                            <Card.Body overflow={"hidden"}>
                                <FilePreview fileInfo={getAquaTreeFileObject(selectedFileInfo!!)!!} />
                            </Card.Body>
                        </Card.Root>
                    </GridItem>
                    <GridItem colSpan={{ base: 1, md: 2 }}>
                        <Card.Root borderRadius={'lg'} shadow={"none"}>
                            <Card.Body>
                                <VStack gap={'4'}>
                                    <Alert status={displayColorBasedOnVerificationAlert(verificationResults)} title={displayBasedOnVerificationStatusText(verificationResults)} />
                                    
                                    <RevisionDetailsSummary  isWorkFlow={isSelectedFileAWorkFlow} isVerificationComplete={isVerificationComplete(verificationResults)} isVerificationSuccess={isVerificationSuccessful(verificationResults)} fileInfo={selectedFileInfo!!} />

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
                                    <LogViewer logs={allLogs as any} title="Verification Logs" />
                                </VStack>
                            </Card.Body>
                        </Card.Root>
                    </GridItem>
                </SimpleGrid>
            </Box>

        </>
    )
}
