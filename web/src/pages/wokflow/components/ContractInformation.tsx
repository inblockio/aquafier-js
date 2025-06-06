

import { useCallback, useEffect, useState } from 'react';
import {
    Box,
    Text,
    VStack,
    Heading,
    Stack,
    Spinner,
    Button
} from '@chakra-ui/react';
import { Timeline } from "@chakra-ui/react"
// import { Card } from '@chakra-ui/react';
// import { FaCheck, FaQuestionCircle, FaBriefcase, FaBook, FaCoffee, FaAward, FaUser } from 'react-icons/fa';
import { Alert } from "../../../components/chakra-ui/alert"
import appStore from '../../../store';
import { useStore } from "zustand"
import { ContractDocumentViewProps, SummaryDetailsDisplayData } from '../../../types/types';
import Aquafier, { AquaTree, FileObject, OrderRevisionInAquaTree, Revision } from 'aqua-js-sdk';
import { isAquaTree, timeToHumanFriendly, getHighestFormIndex, getFileName, getFileHashFromUrl, fetchFileData, isArrayBufferText } from '../../../utils/functions';

import { ApiFileInfo } from '../../../models/FileInfo';
// import { file } from 'jszip';
import { LuCheck, LuFile, LuPackage, LuShip } from 'react-icons/lu';
import { IDrawerStatus, VerificationHashAndResult } from '../../../models/AquaTreeDetails';
import { ItemDetail } from '../../../components/ItemDetails';




export const ContractInformationView: React.FC<ContractDocumentViewProps> = ({ setActiveStep, updateDocumentIconInWorkflowTabs }) => {



    const [isLoading, setIsLoading] = useState(true);
    const [signatureRevionHashesData, setSignatureRevionHashes] = useState<SummaryDetailsDisplayData[]>([])
    const [creatorEthreiumSignatureRevisionData, setCreatorEthreiumSignatureRevisionData] = useState<Revision | undefined>(undefined)
    const [firstRevisionData, setFirstRevisionData] = useState<Revision | undefined>(undefined);
    const [fileNameData, setFileNameData] = useState<string>("");
    const [contractCreatorAddress, setContractCreatorAddress] = useState<string>("")
    const [isProcessing, setIsProcessing] = useState(false)
    const [verificationResults, setVerificationResults] = useState<VerificationHashAndResult[]>([])


    // let firstRevisionHash = selectedFileInfo
    const { selectedFileInfo, apiFileData, setApiFileData, session } = useStore(appStore)

    const getSignatureRevionHashes = (hashesToLoopPar: Array<string>): Array<SummaryDetailsDisplayData> => {

        const signatureRevionHashes: Array<SummaryDetailsDisplayData> = []


        for (let i = 0; i < hashesToLoopPar.length; i += 3) {


            const batch = hashesToLoopPar.slice(i, i + 3);
            console.log(`Processing batch ${i / 3 + 1}:`, batch);


            let signaturePositionCount = 0
            let hashSigPosition = batch[0] ?? ""
            let hashSigRev = batch[1] ?? ""
            let hashSigMetamak = batch[2] ?? ""
            let walletAddress = "";

            if (hashSigPosition.length > 0) {
                let allAquaTrees = selectedFileInfo?.fileObject.filter((e) => isAquaTree(e.fileContent))

                let hashSigPositionHashString = selectedFileInfo!.aquaTree!.revisions[hashSigPosition].link_verification_hashes![0];

                if (allAquaTrees) {
                    for (let anAquaTree of allAquaTrees) {
                        let allHashes = Object.keys(anAquaTree)
                        if (allHashes.includes(hashSigPositionHashString)) {

                            let aquaTreeData = anAquaTree.fileContent as AquaTree
                            let revData = aquaTreeData.revisions[hashSigPositionHashString]
                            signaturePositionCount = getHighestFormIndex(revData)

                            break
                        }
                    }


                }

            }

            let metaMaskRevision = selectedFileInfo!.aquaTree!.revisions[hashSigMetamak];
            if (metaMaskRevision) {
                walletAddress = metaMaskRevision.signature_wallet_address ?? ""
            }
            let data: SummaryDetailsDisplayData = {
                revisionHashWithSignaturePositionCount: signaturePositionCount,
                revisionHashWithSignaturePosition: hashSigPosition,
                revisionHashWithSinatureRevision: hashSigRev,
                revisionHashMetamask: hashSigMetamak,
                walletAddress: walletAddress
            }

            signatureRevionHashes.push(data)

        }


        return signatureRevionHashes
    }

    // Memoized display text function
    const displayBasedOnWorkflowStatusText = (isComplete: boolean) => {
        return isComplete ? "This work flow  is complete. " : "This workflow  is incomplete";
    }

    const displayBasedOnVerificationStatusText = (verificationResults: any) => {
        if (!isVerificationComplete(verificationResults)) {
            return "Verifying Aqua tree";
        }
        return isVerificationSuccessful(verificationResults) ? "This work flow  is valid. " : "This workflow  is invalid. It cannot be trusted";
    }

    // Memoized alert color function
    const displayColorBasedOnVerificationAlert = (verificationResults: any): "info" | "success" | "error" => {
        if (!isVerificationComplete(verificationResults)) {
            return "info";
        }
        return isVerificationSuccessful(verificationResults) ? 'success' : 'error';
    }

    // Memoized verification completion check
    const isVerificationComplete = useCallback((_verificationResults: VerificationHashAndResult[]): boolean => {
        return selectedFileInfo?.aquaTree?.revisions ?
            _verificationResults.length === Object.keys(selectedFileInfo.aquaTree.revisions).length : false;
    }, [selectedFileInfo?.aquaTree?.revisions]);

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
                        const fetchPromise = fetchFileData(fileContentUrl, session!.nonce).then(data => {

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


            console.log(`---< fileobject ${fileObjectVerifier.map((e) => e.fileName).toString()} ll file names`)

            // Process revisions in parallel where possible
            const verificationPromises = revisionHashes.map(async revisionHash => {
                const revision = fileInfo.aquaTree!.revisions[revisionHash];
                const result = await aquafier.verifyAquaTreeRevision(
                    fileInfo.aquaTree!,
                    revision,
                    revisionHash,
                    fileObjectVerifier
                )
                console.log("Hash: ", revisionHash, "\nResult", result)
                return ({
                    hash: revisionHash,
                    isSuccessful: result.isOk()
                })
            });

            // Wait for all verifications to complete
            const allRevisionsVerificationsStatus = await Promise.all(verificationPromises);
            console.log("allRevisionsVerificationsStatus", allRevisionsVerificationsStatus)

            // Update state and callback
            setVerificationResults(allRevisionsVerificationsStatus);
            const _isVerificationSuccessful = isVerificationSuccessful(allRevisionsVerificationsStatus);
            _drawerStatus.isVerificationSuccessful = _isVerificationSuccessful;
            _drawerStatus.colorDark = displayColorBasedOnVerificationStatusDark(allRevisionsVerificationsStatus);
            _drawerStatus.colorLight = displayColorBasedOnVerificationStatusLight(allRevisionsVerificationsStatus);
            // callBack(_drawerStatus);
        } catch (error) {
            console.error("Error verifying AquaTree revisions:", error);
        } finally {
            setIsProcessing(false);
            setIsLoading(false);
        }
    }

    const intializeContractInformation = () => {

        if (selectedFileInfo) {


            const orderedTree = OrderRevisionInAquaTree(selectedFileInfo!.aquaTree!)


            // const orderedTree = OrderRevisionInAquaTree(selectedFileInfo!.aquaTree!)
            // const revisions = orderedTree.revisions
            // const revisionHashes = Object.keys(revisions)
            // const revision = revisions[revisionHashes[0]]
            // let contractCreatorAddress = "";
            // let creatorSignatureRevision = revisions[revisionHashes[3]] // fourth revision
            // if (creatorSignatureRevision.revision_type == "signature") {
            //     contractCreatorAddress = creatorSignatureRevision.signature_wallet_address ?? ""
            // }


            // console.log("File objects", orderedTree.file_index)
            const revisions = orderedTree.revisions
            const revisionHashes = Object.keys(revisions)

            const firstHash: string = revisionHashes[0];
            const firstRevision: Revision = selectedFileInfo!.aquaTree!.revisions[firstHash]
            setFirstRevisionData(firstRevision)

            const pdfHash = revisionHashes[2];
            const thirdRevision: Revision = selectedFileInfo!.aquaTree!.revisions[pdfHash]
            let hashOfLinkedDocument = thirdRevision.link_verification_hashes![0]!
            let fileName = selectedFileInfo!.aquaTree!.file_index[hashOfLinkedDocument]
            setFileNameData(fileName)
            const creatorSignatureHash = revisionHashes[3];
            const signatureRevision: Revision | undefined = selectedFileInfo!.aquaTree!.revisions[creatorSignatureHash]
            setCreatorEthreiumSignatureRevisionData(signatureRevision)
            if (signatureRevision.revision_type == "signature") {
                setContractCreatorAddress(signatureRevision.signature_wallet_address ?? "--eror--")
            }

            let fourthItmeHashOnwards: string[] = [];
            let signatureRevionHashes: Array<SummaryDetailsDisplayData> = []

            if (revisionHashes.length > 4) {
                // remove the first 4 elements from the revision list 
                fourthItmeHashOnwards = revisionHashes.slice(4);
                // console.log(`revisionHashes  ${revisionHashes} --  ${typeof revisionHashes}`)
                // console.log(`fourthItmeHashOnwards  ${fourthItmeHashOnwards}`)
                signatureRevionHashes = getSignatureRevionHashes(fourthItmeHashOnwards)
                // console.log(`signatureRevionHashes  ${JSON.stringify(signatureRevionHashes, null, 4)}`)

                setSignatureRevionHashes(signatureRevionHashes)
            }

            verifyAquaTreeRevisions(selectedFileInfo)
        }
    }
    useEffect(() => {
        intializeContractInformation()
    }, [])


    useEffect(() => {
        intializeContractInformation()
    }, [JSON.stringify(selectedFileInfo), selectedFileInfo])


    const genesisContent = () => {

        return (
            <Stack>
                {contractCreatorAddress == session?.address ?
                    <Text>Your wallet address created this workflow </Text> : <>

                        <ItemDetail label="Wallet address:"
                            displayValue={contractCreatorAddress}
                            value={contractCreatorAddress} showCopyIcon={true}
                        />
                        <Text>{contractCreatorAddress} created the workflow</Text>
                    </>
                }
                <Text>Creation date {timeToHumanFriendly(firstRevisionData?.local_timestamp, true)}</Text>
                <Text>Contract Name: {fileNameData}</Text>

                <Heading size="md" fontWeight={700}>All signers</Heading>
                {
                    firstRevisionData?.forms_signers.split(",").map((signer: string, index: number) => {
                        let item = signatureRevionHashesData.find((e) => e.walletAddress == signer)
                        if (item) {
                            return <Alert status="success" key={index} title={signer} />
                        } else {
                            return <Alert status="info" key={index} title={signer} />
                        }
                    })
                }
            </Stack>
        )
    }

    const OpenDocumentButton = () => {
        return <Button size={'lg'}  colorPalette={'green'} variant={'subtle'} w={'200px'} onClick={() => {
            setActiveStep(2) // Open the contract document
        }} >
            <LuFile />
            Open  Document
        </Button>
    }
    const isWorkFLowCompleted = () => {
        let signers: string[] = firstRevisionData?.forms_signers.split(",")

        let signatureRevionHashesDataAddress = signatureRevionHashesData.map((e) => e.walletAddress)
        let remainSigners = signers.filter((item) => !signatureRevionHashesDataAddress.includes(item))



        if (remainSigners.length > 0) {

            return <>
                <Box
                    maxW="60%"
                    borderWidth="1px"
                    borderStyle="dotted"
                    borderColor="gray.300"
                    p={4}
                    marginLeft={10}
                    marginTop={4}
                    borderRadius="md"
                    alignContent={"center"}
                    display="flex" flexDirection="column" justifyContent="center" alignItems="center"
                >
                    <Text textAlign="center" my={3} >{remainSigners.length} {remainSigners.length > 1 ? <>signatures</> : <>signature</>} pending for workflow to be completed</Text>

                    <>{OpenDocumentButton()}</>
                </Box>

            </>
        }




        if (isVerificationComplete(verificationResults) && isVerificationSuccessful(verificationResults)) {
            updateDocumentIconInWorkflowTabs(true)
        }

        return <Timeline.Item>
            <Timeline.Connector>
                <Timeline.Separator />
                <Timeline.Indicator>
                    <LuPackage />
                </Timeline.Indicator>
            </Timeline.Connector>
            <Timeline.Content>
                <Timeline.Title textStyle="sm">Workflow Completed </Timeline.Title>
                <Timeline.Description>
                    <Alert status={remainSigners.length > 0 ? "info" : "success"} title={displayBasedOnWorkflowStatusText(remainSigners.length == 0)} />
                    <Box my={3}></Box>
                    <Alert status={displayColorBasedOnVerificationAlert(verificationResults)} title={displayBasedOnVerificationStatusText(verificationResults)} />
                </Timeline.Description>
            </Timeline.Content>
        </Timeline.Item>
    }

    const displayData = () => {

        if (isLoading) {
            return <Box
                minH="100vh"
                bg="gray.50"
                display="flex"
                alignItems="center"
                justifyContent="center"
            >
                <VStack>
                    {/* Loading Spinner */}
                    <Spinner size="xl" color="blue.500" />

                    {/* Loading Text */}
                    <Heading size="lg" color="gray.700">
                        Loading...
                    </Heading>
                    <Text color="gray.500">
                        Please wait while we prepare your content
                    </Text>
                </VStack>
            </Box>
        }




        return <Box>
            {genesisContent()}


            <Text mt={15} mb={10} fontSize={"3xl"}>Workflow activity timeline </Text>
            <Timeline.Root >
                <Timeline.Item>
                    <Timeline.Connector>
                        <Timeline.Separator />
                        <Timeline.Indicator>
                            <LuShip />
                        </Timeline.Indicator>
                    </Timeline.Connector>
                    <Timeline.Content>
                        <Timeline.Title><Text textStyle="lg">Work flow created</Text></Timeline.Title>
                        <Timeline.Description>

                            {creatorEthreiumSignatureRevisionData ?
                                <Text textStyle="md">
                                    User with address {creatorEthreiumSignatureRevisionData.signature_wallet_address} , created the workflow at &nbsp;{timeToHumanFriendly(firstRevisionData?.local_timestamp, true)}
                                </Text>
                                : <Alert status="error" title="" variant="solid"   >
                                    Creator Signature not detected
                                </Alert>}
                        </Timeline.Description>
                        <Text textStyle="sm">
                            Document <strong>{fileNameData}</strong>  was selected for signing
                        </Text>
                    </Timeline.Content>
                </Timeline.Item>


                {
                    signatureRevionHashesData.length == 0 ? <Box
                        maxW="60%"
                        borderWidth="1px"
                        borderStyle="dotted"
                        borderColor="gray.300"
                        p={4}
                        marginTop={4}
                        borderRadius="md"
                        alignContent={"center"}
                        display="flex" flexDirection="column" justifyContent="center" alignItems="center" marginLeft={10}
                    >

                        <Text textAlign="center" my={3}>No signatures detected</Text>
                        {OpenDocumentButton()}
                    </Box> : <>

                        {


                            signatureRevionHashesData.map((signatureRevionHasheItem) => {


                                let singatureRevisionItem = selectedFileInfo!.aquaTree!.revisions[signatureRevionHasheItem.revisionHashMetamask]
                                if (!singatureRevisionItem) {
                                    return <Alert status="error" title="Signature revision not found" key={signatureRevionHasheItem.revisionHashMetamask} />
                                }
                                return <Timeline.Item>
                                    <Timeline.Connector>
                                        <Timeline.Separator minH="160px" />
                                        <Timeline.Indicator>
                                            <LuCheck />
                                        </Timeline.Indicator>
                                    </Timeline.Connector>
                                    <Timeline.Content>
                                        <Timeline.Title textStyle="sm"><Text textStyle="lg">Signature detected</Text></Timeline.Title>
                                        <Timeline.Description> <Text textStyle="md"> User with address {singatureRevisionItem.signature_wallet_address} &nbsp;
                                            signed the document , &nbsp;
                                            {signatureRevionHasheItem.revisionHashWithSignaturePositionCount > 1 ? <span>{signatureRevionHasheItem.revisionHashWithSignaturePositionCount} times</span> : <span>Once</span>}
                                            &nbsp;  at   {timeToHumanFriendly(singatureRevisionItem.local_timestamp, true)} </Text>
                                        </Timeline.Description>
                                    </Timeline.Content>
                                </Timeline.Item>
                            })

                        }



                        {
                            isWorkFLowCompleted()
                        }
                    </>
                }

            </Timeline.Root>
        </Box>
    }

    return <>{displayData()}</>

}