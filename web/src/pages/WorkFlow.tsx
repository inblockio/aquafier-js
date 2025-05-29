
import React, { useCallback, useEffect, useState } from 'react';
import {
    Box,
    Flex,
    Text,
    Circle,
    Icon,
    VStack,
    // HStack,
    Container,
    Heading,
    Stack,
    Grid,
    GridItem,
    Spinner
} from '@chakra-ui/react';
import { Timeline } from "@chakra-ui/react"
// import { Card } from '@chakra-ui/react';
// import { FaCheck, FaQuestionCircle, FaBriefcase, FaBook, FaCoffee, FaAward, FaUser } from 'react-icons/fa';
import { FaCheck, FaQuestionCircle, FaUser } from 'react-icons/fa';
import { Alert } from "../components/chakra-ui/alert"
import appStore from '../store';
import { useStore } from "zustand"
import { SignaturePosition, SummaryDetailsDisplayData, WorkFlowTimeLine } from '../types/types';
import Aquafier, { AquaTree, AquaTreeWrapper, FileObject, getGenesisHash, OrderRevisionInAquaTree, Revision } from 'aqua-js-sdk';
import { convertTemplateNameToTitle, dummyCredential, ensureDomainUrlHasSSL, estimateFileSize, fetchFiles, isAquaTree, isWorkFlowData, timeToHumanFriendly, getHighestFormIndex, getFileName, getFileHashFromUrl, fetchFileData, isArrayBufferText, getAquaTreeFileObject } from '../utils/functions';

import PdfSigner, { PDFDisplayWithJustSimpleOverlay } from './PdfSigner';
import { toaster } from '../components/chakra-ui/toaster';
import axios from 'axios';
import { ApiFileInfo } from '../models/FileInfo';
import SignatureItem from '../components/pdf/SignatureItem';
// import { file } from 'jszip';
import { useNavigate } from 'react-router-dom';
import { LuCheck, LuPackage, LuShip } from 'react-icons/lu';
import { IDrawerStatus, VerificationHashAndResult } from '../models/AquaTreeDetails';
import { ItemDetail } from '../components/ItemDetails';



const ContractInformationView = () => {

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
    const displayBasedOnVerificationStatusText = (verificationResults: any) => {
        if (!isVerificationComplete(verificationResults)) {
            return "Verifying Aqua tree";
        }
        return isVerificationSuccessful(verificationResults) ? "This work flow  is valid.It can be trusted " : "This workflow  is invalid, it cannot be trusted";
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

    useEffect(() => {
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
    }, [])



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
                >
                    <Text textAlign="center">{remainSigners.length} {remainSigners.length > 1 ? <>signatures</> : <>signature</>} pending for workflow to be completed</Text>
                </Box>

            </>
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
                    >
                        <Text textAlign="center">No signatures detected</Text>
                    </Box> : <>

                        {


                            signatureRevionHashesData.map((signatureRevionHasheItem) => {


                                let singatureRevisionItem = selectedFileInfo!.aquaTree!.revisions[signatureRevionHasheItem.revisionHashMetamask]
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
                                            signed the document {fileNameData}, &nbsp;
                                            {signatureRevionHasheItem.revisionHashWithSignaturePositionCount > 1 ? <span>{signatureRevionHasheItem.revisionHashWithSignaturePositionCount} times</span> : <span>Once</span>}
                                            &nbsp;  at   {timeToHumanFriendly(singatureRevisionItem.local_timestamp)} </Text>
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

interface ContractDocumentViewProps {
    setActiveStep: (step: number) => void
}


const ContractDocumentView: React.FC<ContractDocumentViewProps> = ({ setActiveStep }) => {



    const [pdfLoadingFile, setLoadingPdfFile] = useState<boolean>(true);
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [pdfURLObject, setPdfURLObject] = useState<string | null>(null);
    const [signatures, setSignatures] = useState<any[]>([]);
    const [signaturesLoading, setSignaturesLoading] = useState<boolean>(false);
    const [userCanSign, setUserCanSign] = useState<boolean>(false);
    // const [authorizedSigners, setAuthorizedSigners] = useState<string[]>([]);
    const { selectedFileInfo, setSelectedFileInfo, session, backend_url, setFiles } = useStore(appStore);
    const [submittingSignatureData, setSubmittingSignatureData] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        initializeComponent();
    }, []);



    const fetchImage = async (fileUrl: string) => {
        try {
            const actualUrlToFetch = ensureDomainUrlHasSSL(fileUrl);
            const response = await fetch(actualUrlToFetch, {
                headers: {
                    nonce: `${session?.nonce}`
                }
            });

            if (!response.ok) {
                console.error("FFFailed to fetch file:", response.status, response.statusText);
                return null;
            }

            // Get content type from headers
            let contentType = response.headers.get("Content-Type") || "";
            console.log("fetched: ", response, "content type:", contentType);

            // If content type is missing or generic, try to detect from URL
            if (contentType === "application/octet-stream" || contentType === "") {
                contentType = "image/png";
            }

            if (contentType.startsWith("image")) {
                const arrayBuffer = await response.arrayBuffer();
                // Ensure we use the PDF content type
                const blob = new Blob([arrayBuffer], { type: contentType });
                return URL.createObjectURL(blob);
            }

            return null;
        } catch (error) {
            console.error("Error fetching file:", error);
            return null;
        }
    }






    const saveAquaTree = async (aquaTree: AquaTree, fileObject: FileObject, isFinal: boolean = false, isWorkflow: boolean = false, template_id: string): Promise<Boolean> => {
        try {
            const url = `${backend_url}/explorer_aqua_file_upload`;

            // Create a FormData object to send multipart data
            let formData = new FormData();

            // Add the aquaTree as a JSON file
            const aquaTreeBlob = new Blob([JSON.stringify(aquaTree)], { type: 'application/json' });
            formData.append('file', aquaTreeBlob, fileObject.fileName);

            // Add the account from the session
            formData.append('account', session?.address || '');
            formData.append('is_workflow', `${isWorkflow}`);


            //workflow specifi

            formData.append('template_id', template_id);


            // Check if we have an actual file to upload as an asset
            if (fileObject.fileContent) {
                // Set has_asset to true
                formData.append('has_asset', 'true');

                // FIXED: Properly handle the file content as binary data
                // If fileContent is already a Blob or File object, use it directly
                if (fileObject.fileContent instanceof Blob || fileObject.fileContent instanceof File) {
                    formData.append('asset', fileObject.fileContent, fileObject.fileName);
                }
                // If it's an ArrayBuffer or similar binary data
                else if (fileObject.fileContent instanceof ArrayBuffer ||
                    fileObject.fileContent instanceof Uint8Array) {
                    const fileBlob = new Blob([fileObject.fileContent], { type: 'application/octet-stream' });
                    formData.append('asset', fileBlob, fileObject.fileName);
                }
                // If it's a base64 string (common for image data)
                else if (typeof fileObject.fileContent === 'string' && fileObject.fileContent.startsWith('data:')) {
                    // Convert base64 to blob
                    const response = await fetch(fileObject.fileContent);
                    const blob = await response.blob();
                    formData.append('asset', blob, fileObject.fileName);
                }
                // Fallback for other string formats (not recommended for binary files)
                else if (typeof fileObject.fileContent === 'string') {
                    const fileBlob = new Blob([fileObject.fileContent], { type: 'text/plain' });
                    formData.append('asset', fileBlob, fileObject.fileName);
                }
                // If it's something else (like an object), stringify it (not recommended for files)
                else {
                    console.warn('Warning: fileContent is not in an optimal format for file upload');
                    const fileBlob = new Blob([JSON.stringify(fileObject.fileContent)], { type: 'application/json' });
                    formData.append('asset', fileBlob, fileObject.fileName);
                }

            } else {
                formData.append('has_asset', 'false');
            }

            const response = await axios.post(url, formData, {
                headers: {
                    "nonce": session?.nonce,
                    // Don't set Content-Type header - axios will set it automatically with the correct boundary
                }
            });

            if (response.status === 200 || response.status === 201) {
                if (isFinal) {
                    console.log(`Is finale ${isFinal}`)
                }
                // setFiles(response.data.files);
                // toaster.create({
                //     description: `Aqua tree created successfully`,
                //     type: "success"
                // });
                // // onClose();
                // setOpen(false)
                // setModalFormErorMessae("")
                // setSelectedTemplate(null)
                // setFormData({})
                // }

                console.log(`Got back a 200..`)
            }
            return true



        } catch (error) {
            toaster.create({
                title: 'Error uploading aqua tree',
                description: error instanceof Error ? error.message : 'Unknown error',
                type: 'error',
                duration: 5000,
            });

            return false
        }
    };



    const submitSignatureData = async (signaturePosition: SignaturePosition[], signAquaTree: ApiFileInfo[]) => {
        // Early validation
        if (signAquaTree.length === 0) {
            toaster.create({
                description: `Signature not found`,
                type: "error"
            });
            return;
        }

        setSubmittingSignatureData(true);

        try {
            const aquafier = new Aquafier();

            // Step 1: Create signature form data
            const signForm = createSignatureFormData(signaturePosition);
            console.log(`Page data ${JSON.stringify(signForm, null, 4)}`);

            // Step 2: Create user signature data aqua tree
            const userSignatureDataAquaTree = await createUserSignatureAquaTree(aquafier, signForm);
            if (!userSignatureDataAquaTree) return;

            // Step 3: Link main document with user signature data
            const linkedAquaTreeWithUserSignatureData = await linkMainDocumentWithSignatureData(
                aquafier,
                userSignatureDataAquaTree
            );
            if (!linkedAquaTreeWithUserSignatureData) return;

            // Step 4: Link signature tree with the document
            const linkedAquaTreeWithSignature = await linkSignatureTreeToDocument(
                aquafier,
                linkedAquaTreeWithUserSignatureData,
                signAquaTree[0]
            );
            if (!linkedAquaTreeWithSignature) return;


            // Step 5: Sign with MetaMask
            const metaMaskSignedAquaTree = await signWithMetaMask(aquafier, structuredClone(linkedAquaTreeWithSignature));
            if (!metaMaskSignedAquaTree) return;

            // Step 6: Save both revisions to server (only after successful MetaMask signing)
            await saveRevisionsToServer([
                linkedAquaTreeWithUserSignatureData,
                linkedAquaTreeWithSignature,
                metaMaskSignedAquaTree
            ]);


            // Step 7: Update UI and refresh files
            await updateUIAfterSuccess();

            // step 8 
            // check if the owner of the document is a different wallet address send him the above revsions
            // send the revision to the other wallet address if possible
            await shareRevisionsToOwnerOfDocument([
                linkedAquaTreeWithUserSignatureData,
                linkedAquaTreeWithSignature,
                metaMaskSignedAquaTree
            ])
        } catch (error) {
            console.error('Error in submitSignatureData:', error);
            showError('An unexpected error occurred during signature submission');
        } finally {
            setSubmittingSignatureData(false);
        }
    };

    // Helper function to create signature form data
    const createSignatureFormData = (signaturePosition: SignaturePosition[]) => {
        const signForm: { [key: string]: string | number } = {};

        signaturePosition.forEach((signaturePositionItem, index) => {
            const pageIndex = signaturePositionItem.pageIndex + 1;
            signForm[`x_${index}`] = parseFloat(signaturePositionItem.x.toFixed(16));
            signForm[`y_${index}`] = parseFloat(signaturePositionItem.y.toFixed(16));
            signForm[`page_${index}`] = pageIndex.toString();
            signForm[`width_${index}`] = signaturePositionItem.width.toString();
            signForm[`height_${index}`] = signaturePositionItem.height.toString();
        });

        return signForm;
    };

    // Helper function to create user signature aqua tree
    const createUserSignatureAquaTree = async (aquafier: Aquafier, signForm: any) => {
        const jsonString = JSON.stringify(signForm, null, 2);
        const estimateSize = estimateFileSize(jsonString);

        const fileObjectUserSignature: FileObject = {
            fileContent: jsonString,
            fileName: `user_signature_data.json`,
            path: './',
            fileSize: estimateSize
        };

        const userSignatureDataAquaTree = await aquafier.createGenesisRevision(
            fileObjectUserSignature,
            true,
            false,
            false
        );

        if (userSignatureDataAquaTree.isErr()) {
            showError('Signature data creation failed');
            return null;
        }

        console.log(`👁️‍🗨️👁️‍🗨️ AquaTree form ${JSON.stringify(userSignatureDataAquaTree.data.aquaTree!, null, 4)} \n jsonString ${jsonString}`);

        // Save to server
        await saveAquaTree(userSignatureDataAquaTree.data.aquaTree!, fileObjectUserSignature, true, true, "");

        return {
            aquaTree: userSignatureDataAquaTree.data.aquaTree!,
            fileObject: fileObjectUserSignature
        };
    };

    // Helper function to link main document with signature data
    const linkMainDocumentWithSignatureData = async (aquafier: Aquafier, userSignatureData: any) => {
        const sigFileObject = getAquaTreeFileObject(selectedFileInfo!) ?? selectedFileInfo?.fileObject[0];

        const aquaTreeWrapper: AquaTreeWrapper = {
            aquaTree: selectedFileInfo!.aquaTree!,
            revision: "",
            fileObject: sigFileObject
        };

        const userSignatureDataAquaTreeWrapper: AquaTreeWrapper = {
            aquaTree: userSignatureData.aquaTree,
            revision: "",
            fileObject: userSignatureData.fileObject
        };

        const resLinkedAquaTreeWithUserSignatureData = await aquafier.linkAquaTree(
            aquaTreeWrapper,
            userSignatureDataAquaTreeWrapper
        );

        if (resLinkedAquaTreeWithUserSignatureData.isErr()) {
            showError('Signature data not appended to main tree successfully');
            return null;
        }

        return resLinkedAquaTreeWithUserSignatureData.data.aquaTree!;
    };

    // Helper function to link signature tree to document
    const linkSignatureTreeToDocument = async (aquafier: Aquafier, linkedAquaTree: any, signatureInfo: ApiFileInfo) => {
        const linkedAquaTreeWrapper: AquaTreeWrapper = {
            aquaTree: linkedAquaTree,
            revision: "",
            fileObject: getAquaTreeFileObject(selectedFileInfo!) ?? selectedFileInfo?.fileObject[0]
        };

        const signatureFileObject = getAquaTreeFileObject(signatureInfo) ?? signatureInfo.fileObject[0];
        const signatureAquaTreeWrapper: AquaTreeWrapper = {
            aquaTree: signatureInfo.aquaTree!,
            revision: "",
            fileObject: signatureFileObject
        };

        const resLinkedAquaTree = await aquafier.linkAquaTree(linkedAquaTreeWrapper, signatureAquaTreeWrapper);

        if (resLinkedAquaTree.isErr()) {
            showError('Signature tree not appended to main tree successfully');
            return null;
        }

        return resLinkedAquaTree.data.aquaTree!;
    };

    // Helper function to sign with MetaMask
    const signWithMetaMask = async (aquafier: Aquafier, aquaTree: AquaTree) => {
        const signatureFileObject = getAquaTreeFileObject(selectedFileInfo!) ?? selectedFileInfo?.fileObject[0];
        //getAquaTreeFileObject(aquaTree) ?? signAquaTree[0].fileObject[0];

        const aquaTreeWrapper: AquaTreeWrapper = {
            aquaTree: aquaTree,
            revision: "",
            fileObject: signatureFileObject
        };

        const resLinkedMetaMaskSignedAquaTree = await aquafier.signAquaTree(
            aquaTreeWrapper,
            'metamask',
            dummyCredential()
        );

        if (resLinkedMetaMaskSignedAquaTree.isErr()) {
            showError('MetaMask signature not appended to main tree successfully');
            return null;
        }

        return resLinkedMetaMaskSignedAquaTree.data.aquaTree!;
    };

    const shareRevisionsToOwnerOfDocument = async (aquaTrees: AquaTree[]) => {

        //get genesis hash
        let genesisHash = getGenesisHash(selectedFileInfo!.aquaTree!)

        if (genesisHash) {

            let revision = selectedFileInfo!.aquaTree!.revisions[genesisHash];
            let sender: string | undefined = revision['forms_sender'];
            let signers: string | undefined = revision['forms_signers']

            if (sender == undefined) {
                showError("Workflow sender not found");
                return
            }

            if (signers == undefined) {
                showError("Workflow signers not found");
                return
            }

            if (signers.includes(',')) {
                let allSigners: string[] = signers.split(",")

                for (let aSigner of allSigners) {

                    // dont resend the revision to the user as this was handled before this function call
                    if (aSigner != session?.address) {
                        await saveRevisionsToServerForUser(aquaTrees, aSigner)
                    }
                }
            }

            if (sender != signers) {
                //send the signatures to workflow creator 
                await saveRevisionsToServerForUser(aquaTrees, sender)
            }


        }

    }

    // Helper function to save multiple revisions to server
    const saveRevisionsToServerForUser = async (aquaTrees: AquaTree[], address: string) => {

        console.log(`aquaTrees ${aquaTrees.length}`)
        for (let index = 0; index < aquaTrees.length; index++) {
            const aquaTree = aquaTrees[index];

            console.log(`aquaTrees ${index}  ${JSON.stringify(aquaTree, null, 4)}`)
            try {
                const revisionHashes = Object.keys(aquaTree.revisions);
                const lastHash = revisionHashes[revisionHashes.length - 1];
                const lastRevision = aquaTree.revisions[lastHash];

                const url = `${backend_url}/tree/user`;
                const actualUrlToFetch = ensureDomainUrlHasSSL(url);

                const response = await axios.post(actualUrlToFetch, {
                    revision: lastRevision,
                    revisionHash: lastHash,
                    address: address
                }, {
                    headers: {
                        nonce: session?.nonce
                    }
                });

                if (response.status === 200 || response.status === 201) {
                    console.log(`💯 Revision ${index + 1} saved successfully to the API`);
                    // todo a method to notify the other user should go here
                }

            } catch (error) {
                console.error(`Error saving revision ${index + 1}:`, error);
                throw new Error(`Error saving revision ${index + 1} to server`);
            }
        }

    };
    // Helper function to save multiple revisions to server
    const saveRevisionsToServer = async (aquaTrees: AquaTree[]) => {

        console.log(`aquaTrees ${aquaTrees.length}`)
        for (let index = 0; index < aquaTrees.length; index++) {
            const aquaTree = aquaTrees[index];

            console.log(`aquaTrees ${index}  ${JSON.stringify(aquaTree, null, 4)}`)
            try {
                const revisionHashes = Object.keys(aquaTree.revisions);
                const lastHash = revisionHashes[revisionHashes.length - 1];
                const lastRevision = aquaTree.revisions[lastHash];

                const url = `${backend_url}/tree`;
                const actualUrlToFetch = ensureDomainUrlHasSSL(url);

                const response = await axios.post(actualUrlToFetch, {
                    revision: lastRevision,
                    revisionHash: lastHash,
                }, {
                    headers: {
                        nonce: session?.nonce
                    }
                });

                if (response.status === 200 || response.status === 201) {
                    console.log(`💯 Revision ${index + 1} saved successfully to the API`);

                }

            } catch (error) {
                console.error(`Error saving revision ${index + 1}:`, error);
                throw new Error(`Error saving revision ${index + 1} to server`);
            }
        }

    };

    // Helper function to update UI after success
    const updateUIAfterSuccess = async () => {
        try {
            // Fetch updated files
            const url2 = `${backend_url}/explorer_files`;
            const files = await fetchFiles(`${session?.address}`, url2, `${session?.nonce}`);
            setFiles(files);

            // Find and update selected file
            const selectedFileGenesisHash = getGenesisHash(selectedFileInfo!.aquaTree!);
            const selectedFile = files.find((data) => getGenesisHash(data.aquaTree!) === selectedFileGenesisHash);

            if (selectedFile) {
                setSelectedFileInfo(selectedFile);
                toaster.create({
                    description: `Document signed successfully`,
                    type: "success"
                });
                setActiveStep(1);
            } else {
                throw new Error('Updated file not found');
            }
        } catch (error) {
            toaster.create({
                description: `An error occurred, redirecting to home`,
                type: "error"
            });

            setTimeout(() => {
                window.location.reload();
            }, 150);
            navigate("/");
        }
    };

    // Helper function to show error messages
    const showError = (message: string) => {
        toaster.create({
            description: message,
            type: "error"
        });
    };



    const initializeComponent = async () => {
        try {
            // Load PDF first
            const pdfFile = await fetchPDFfile();
            setPdfFile(pdfFile);
            setLoadingPdfFile(false);

            // Check authorization and load signatures
            const { canSign, signers } = checkUserAuthorization();
            setUserCanSign(canSign);
            console.log(`sigers ${signers}`)
            //   setAuthorizedSigners(signers);

            if (shouldLoadSignatures()) {
                setSignaturesLoading(true);
                const allSignatures = await loadSignatures();
                setSignatures(allSignatures);
                setSignaturesLoading(false);
            }
        } catch (error) {
            console.error("Error initializing component:", error);
            setLoadingPdfFile(false);
            setSignaturesLoading(false);
        }
    };

    const fetchPDFfile = async (): Promise<File | null> => {
        try {
            if (!selectedFileInfo?.aquaTree?.revisions) {
                throw new Error("Selected file info or revisions not found");
            }

            const allHashes = Object.keys(selectedFileInfo.aquaTree.revisions);
            const pdfLinkRevision = selectedFileInfo.aquaTree.revisions[allHashes[2]];

            if (!pdfLinkRevision?.link_verification_hashes?.[0]) {
                throw new Error("PDF link revision not found");
            }

            const pdfHash = pdfLinkRevision.link_verification_hashes[0];
            const pdfName = selectedFileInfo.aquaTree.file_index?.[pdfHash];

            if (!pdfName) {
                throw new Error("PDF name not found in index");
            }

            const pdfFileObject = selectedFileInfo.fileObject.find(
                (e) => e.fileName === pdfName
            );

            if (!pdfFileObject) {
                throw new Error("PDF file object not found");
            }

            const fileContentUrl = pdfFileObject.fileContent;
            if (typeof fileContentUrl === 'string' && fileContentUrl.startsWith('http')) {
                return await fetchFileFromUrl(fileContentUrl, pdfName);
            }

            return null;
        } catch (error) {
            console.error("Error fetching PDF file:", error);
            return null;
        }
    };

    const fetchFileFromUrl = async (fileContentUrl: string, fileName: string): Promise<File> => {
        const actualUrlToFetch = ensureDomainUrlHasSSL(fileContentUrl);
        const response = await fetch(actualUrlToFetch, {
            headers: { nonce: `${session?.nonce}` }
        });

        if (!response.ok) {
            toaster.create({
                description: `${fileName} not found in system`,
                type: "error"
            });
            throw new Error(`Failed to fetch file: ${response.status}`);
        }

        let contentType = response.headers.get("Content-Type") || "";

        // Detect content type from URL if missing
        if (contentType === "application/octet-stream" || contentType === "") {
            if (fileContentUrl.toLowerCase().endsWith(".pdf")) {
                contentType = "application/pdf";
            }
        }

        const arrayBuffer = await response.arrayBuffer();
        const finalContentType = contentType || "application/pdf";
        const blob = new Blob([arrayBuffer], { type: finalContentType });
        const urlObject = URL.createObjectURL(blob);

        setPdfURLObject(urlObject);

        return new File([blob], fileName, {
            type: finalContentType,
            lastModified: Date.now(),
        });
    };

    const checkUserAuthorization = (): { canSign: boolean; signers: string[] } => {
        if (!selectedFileInfo?.aquaTree?.revisions) {
            return { canSign: false, signers: [] };
        }

        const allHashes = Object.keys(selectedFileInfo.aquaTree.revisions);
        const firstRevision = selectedFileInfo.aquaTree.revisions[allHashes[0]];

        if (!firstRevision?.forms_signers) {
            return { canSign: false, signers: [] };
        }

        const signers = firstRevision.forms_signers
            .split(",")
            .map((signer: string) => signer.trim());

        const canSign = signers.includes(session?.address);

        return { canSign, signers };
    };

    const shouldLoadSignatures = (): boolean => {
        if (!selectedFileInfo?.aquaTree?.revisions) return false;

        const revisionHashes = Object.keys(selectedFileInfo.aquaTree.revisions);
        return revisionHashes.length >= 5; // Document has signatures
    };

    const loadSignatures = async (): Promise<any[]> => {
        try {
            console.log("Identifying link revisions")
            const linkRevisionsThatWeNeed = identifySignatureRevisions();
            console.log("Link revisions that we need", linkRevisionsThatWeNeed)
            const signatures = await Promise.all(
                linkRevisionsThatWeNeed.map(linkRevision => processSignatureRevision(linkRevision))
            );

            return signatures.filter(signature => signature !== null);
        } catch (error) {
            console.error("Error loading signatures:", error);
            return [];
        }
    };

    const identifySignatureRevisions = () => {
        if (!selectedFileInfo?.aquaTree?.revisions) return [];

        const revisionHashes = Object.keys(selectedFileInfo.aquaTree.revisions);
        const aquaTreeFileIndexKeys = selectedFileInfo.aquaTree.file_index || {};

        // Find signature-related hashes
        const aquaTreeFileIndexKeysWithSignature = Object.keys(aquaTreeFileIndexKeys)
            .filter(key => aquaTreeFileIndexKeys[key].includes("signature"));

        const linkRevisionsThatWeNeed: any[] = [];

        for (let i = 0; i < revisionHashes.length; i++) {
            const currentHash = revisionHashes[i];
            const nextHash = revisionHashes[i + 1];
            const currentRevision = selectedFileInfo.aquaTree.revisions[currentHash];
            const nextRevision = selectedFileInfo.aquaTree.revisions[nextHash];

            console.log("Next revision", nextRevision)

            if (isValidSignatureRevisionPair(currentRevision, nextRevision, currentHash)) {
                const linkVerificationHash = currentRevision.link_verification_hashes![0];

                if (aquaTreeFileIndexKeysWithSignature.includes(linkVerificationHash)) {
                    if (nextRevision.revision_type === "link") {
                        linkRevisionsThatWeNeed.push({
                            revision: currentRevision,
                            revisionHash: currentHash,
                            linkHash: linkVerificationHash,
                            nextRevisionHash: nextHash,
                            nextRevision: nextRevision,
                            nextLinkHash: nextRevision.link_verification_hashes![0]
                        });
                    }
                }
            }
        }

        return linkRevisionsThatWeNeed;
    };

    const isValidSignatureRevisionPair = (currentRevision: any, nextRevision: any, currentHash: string): boolean => {
        return (
            currentRevision &&
            currentRevision.revision_type === "link" &&
            nextRevision &&
            nextRevision.previous_verification_hash === currentHash &&
            currentRevision.link_verification_hashes &&
            currentRevision.link_verification_hashes.length > 0
        );
    };

    const processSignatureRevision = async (linkRevision: any): Promise<any | null> => {
        try {
            console.log("----- Link Revision: ", linkRevision)
            const { positionAquaTree, signatureDetailsAquaTree } = findRelatedAquaTrees(linkRevision);
            console.log("----- Position Aqua Tree: ", positionAquaTree)
            console.log("----- Signature Details Aqua Tree: ", signatureDetailsAquaTree)

            if (!positionAquaTree || !signatureDetailsAquaTree) {
                return null;
            }

            const signatureDetails = extractSignaturePosition(positionAquaTree, linkRevision.linkHash);
            await populateSignatureDetails(signatureDetails, signatureDetailsAquaTree, linkRevision.nextLinkHash);

            return signatureDetails;
        } catch (error) {
            console.error("Error processing signature revision:", error);
            return null;
        }
    };

    const findRelatedAquaTrees = (linkRevision: any) => {
        let positionAquaTree: AquaTree | null = null;
        let signatureDetailsAquaTree: AquaTree | null = null;

        for (const fileObject of selectedFileInfo!.fileObject) {
            const content = fileObject.fileContent;

            if (typeof content === 'object' && content !== null && 'revisions' in content) {
                const aquaTree = content as AquaTree;
                const aquaTreeRevisions = Object.keys(aquaTree.revisions);

                if (aquaTreeRevisions.includes(linkRevision.linkHash)) {
                    positionAquaTree = aquaTree;
                }

                if (aquaTreeRevisions.includes(linkRevision.nextLinkHash)) {
                    signatureDetailsAquaTree = aquaTree;
                }

                if (positionAquaTree && signatureDetailsAquaTree) {
                    break;
                }
            }
        }

        return { positionAquaTree, signatureDetailsAquaTree };
    };

    const extractSignaturePosition = (aquaTree: AquaTree, linkHash: string) => {
        const revision = aquaTree.revisions[linkHash];
        console.log("----- LInk HASH: ", linkHash)

        return {
            height: revision.forms_height_0,
            width: revision.forms_width_0,
            x: revision.forms_x_0,
            y: revision.forms_y_0,
            page: revision.forms_page_0,
            name: "",
            walletAddress: "",
            image: ""
        };
    };

    const populateSignatureDetails = async (signatureDetails: any, aquaTree: AquaTree, _nextLinkHash: string) => {
        const reorderedTree = OrderRevisionInAquaTree(aquaTree);
        const hashes = Object.keys(reorderedTree.revisions);
        const formRevision = reorderedTree.revisions[hashes[0]];

        if (formRevision.revision_type === "form") {
            signatureDetails.name = formRevision.forms_name;
            signatureDetails.walletAddress = formRevision.forms_wallet_address;
        }

        // Load signature image
        const linkRevisionWithFile = reorderedTree.revisions[hashes[2]];
        if (linkRevisionWithFile?.revision_type === "link" &&
            linkRevisionWithFile!.link_file_hashes!.length > 0) {

            const fileHash = linkRevisionWithFile.link_file_hashes![0]!;
            const imageUrl = findImageUrl(fileHash);

            if (imageUrl) {
                const image = await fetchImage(imageUrl);
                if (image) {
                    signatureDetails.image = image;
                }
            }
        }
    };

    const findImageUrl = (fileHash: string): string | null => {
        for (const fileObject of selectedFileInfo!.fileObject) {
            const fileContent = fileObject.fileContent;

            if (typeof fileContent === 'string' && fileContent.includes(fileHash)) {
                return fileContent;
            }
        }

        return null;
    };

    const renderContent = () => {
        if (pdfLoadingFile) {
            return (
                <Stack>
                    <Spinner size="xl" color="blue.500" />
                    <Heading size="lg" color="gray.700">
                        Loading PDF
                    </Heading>
                </Stack>
            );
        }

        // if (!userCanSign) {
        //     return (
        //         <Alert status="info" variant="solid" title="You are not a signer of this document">
        //             {authorizedSigners.map((signer: string, index: number) => (
        //                 <Text key={index}>{signer}</Text>
        //             ))}
        //         </Alert>
        //     );
        // }

        if (signaturesLoading) {
            return (
                <Stack>
                    <Spinner size="lg" color="blue.500" />
                    <Heading size="md" color="gray.700">
                        Loading signatures...
                    </Heading>
                </Stack>
            );
        }

        const isUserSignatureIncluded = signatures.some((sig) => sig.walletAddress === session?.address);

        if (isUserSignatureIncluded) {
            return (
                <Grid templateColumns="repeat(4, 1fr)">
                    <GridItem colSpan={{ base: 12, md: 3 }}>
                        <PDFDisplayWithJustSimpleOverlay
                            pdfUrl={pdfURLObject!}
                            signatures={signatures}
                        />
                    </GridItem>
                    <GridItem colSpan={{ base: 12, md: 1 }}>
                        <Stack>
                            <Text fontWeight={700}>Signatures</Text>
                            {signatures.map((signature: any, index: number) => (
                                <SignatureItem signature={signature} key={index} />
                            ))}
                        </Stack>
                    </GridItem>
                </Grid>
            );
        }

        return (
            <PdfSigner
                userCanSign={userCanSign}
                existingSignatures={signatures}
                file={pdfFile}
                submitSignature={submitSignatureData}
                submittingSignatureData={submittingSignatureData}
            />
        );
    };

    // Error boundary for the component
    if (!selectedFileInfo?.aquaTree?.revisions) {
        return (
            <Alert status="error" variant="solid" title="Error: Document data not found" />
        );
    }

    const firstRevision = selectedFileInfo.aquaTree.revisions[Object.keys(selectedFileInfo.aquaTree.revisions)[0]];
    if (!firstRevision?.forms_signers) {
        return (
            <Alert status="error" variant="solid" title="Error: Signers not found" />
        );
    }

    return <>{renderContent()}</>;
}



export default function WorkFlowPage() {

    const [activeStep, setActiveStep] = useState(1);
    const [timeLineTitle, setTimeLineTitle] = useState("");

    const [error, setError] = useState("");
    const [timeLineItems, setTimeLineItems] = useState<Array<WorkFlowTimeLine>>([]);
    const { selectedFileInfo, formTemplates } = useStore(appStore);

    function loadTimeline() {
        let items: Array<WorkFlowTimeLine> = []

        items.push({
            id: 1,
            completed: true,
            content: <ContractInformationView />,
            icon: FaUser,
            revisionHash: "",
            title: "Contract Information"
        })

        items.push({
            id: 2,
            completed: false,
            content: <ContractDocumentView setActiveStep={(index) => {
                setActiveStep(index)
            }} />,
            icon: FaUser,
            revisionHash: "",
            title: "Contract Document"
        })

        setTimeLineItems(items)

    }


    const loadData = () => {
        if (selectedFileInfo) {

            const templateNames = formTemplates.map((e) => e.name)
            let { isWorkFlow, workFlow } = isWorkFlowData(selectedFileInfo.aquaTree!, templateNames)

            if (!isWorkFlow) {
                setError("The selected Aqua - Tree is not workflow")
                return
            }

            setTimeLineTitle(convertTemplateNameToTitle(workFlow));



            (async () => {
                await loadTimeline()
            })();

        }
    }

    useEffect(() => {
        loadData()
    }, [])

    useEffect(() => {
        loadData()
    }, [JSON.stringify(selectedFileInfo)])




    // Find the currently active content
    const activeContent = () => timeLineItems.find(item => item.id === activeStep)?.content;


    const aquaTreeTimeLine = () => {
        return <Container py={8} px={4} mx="auto">
            <Heading textAlign="center" mb={10}>{timeLineTitle}</Heading>

            {/* Horizontal Timeline */}
            <Box w="full" mb={12} overflowX="auto">
                <Flex minW="max-content" px={4}>
                    {timeLineItems.map((item, index) => (
                        <React.Fragment key={item.id}>
                            {/* Timeline Item */}
                            <VStack
                                cursor="pointer"
                                mx={4}
                                onClick={() => setActiveStep(item.id)}
                            >
                                <Circle
                                    size="40px"
                                    bg={
                                        activeStep === item.id
                                            ? 'blue.500'
                                            : item.completed
                                                ? 'green.100'
                                                : 'gray.100'
                                    }
                                    color={
                                        activeStep === item.id
                                            ? 'white'
                                            : item.completed
                                                ? 'green.500'
                                                : 'gray.400'
                                    }
                                >
                                    <Icon as={item.icon} boxSize={4} />
                                </Circle>

                                {/* Status indicator */}
                                <Circle
                                    size="20px"
                                    bg={item.completed ? 'green.500' : 'gray.200'}
                                    color={item.completed ? 'white' : 'gray.500'}
                                    mt={2}
                                >
                                    <Icon as={item.completed ? FaCheck : FaQuestionCircle} boxSize={3} />
                                </Circle>

                                <Text
                                    color={activeStep === item.id ? 'blue.500' : 'gray.600'}
                                    fontWeight={activeStep === item.id ? 'medium' : 'normal'}
                                    fontSize="sm"
                                    mt={2}
                                >
                                    {item.title}
                                </Text>
                            </VStack>

                            {/* Connector line between timeline items */}
                            {index < timeLineItems.length - 1 && (
                                <Flex alignItems="center" flex="1">
                                    <hr
                                        style={{
                                            width: '100%',
                                            height: '2px',
                                            border: 'none',
                                            backgroundColor: index < activeStep - 1 || (index === activeStep - 1 && timeLineItems[activeStep - 1].completed)
                                                ? '#48BB78' // green.500 equivalent
                                                : '#E2E8F0' // gray.200 equivalent
                                        }}
                                    />
                                </Flex>
                            )}
                        </React.Fragment>
                    ))}
                </Flex>
            </Box>

            {/* Content Area */}
            <Box mt={8} p={4}>
                {activeContent()}
            </Box>
        </Container>
    }

    const workFlowPageData = () => {

        if (error.length > 0) {
            return <Alert status="error" title="" variant="solid"   >
                {error}
            </Alert>
        }
        if (selectedFileInfo == null) {
            return <Alert status="error" title="" variant="solid"   >
                Selected file not found
            </Alert>
        }



        return aquaTreeTimeLine()
    }


    return (
        <>
            {workFlowPageData()}
        </>
    );
}

