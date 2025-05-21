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
    GridItem
} from '@chakra-ui/react';
import { Timeline } from "@chakra-ui/react"
// import { Card } from '@chakra-ui/react';
// import { FaCheck, FaQuestionCircle, FaBriefcase, FaBook, FaCoffee, FaAward, FaUser } from 'react-icons/fa';
import { FaAward, FaBook, FaCheck, FaQuestionCircle, FaUser, FaSignal, FaSignature, FaEraser } from 'react-icons/fa';
import { Alert } from "../../components/chakra-ui/alert"
import appStore from '../../store';
import { useStore } from "zustand"
import { SignaturePosition, SummaryDetailsDisplayData, WorkFlowTimeLine } from '../../types/types';
import Aquafier, { AquaTree, AquaTreeWrapper, FileObject, getAquaTreeFileObject, getGenesisHash, OrderRevisionInAquaTree, Revision } from 'aqua-js-sdk';
import { convertTemplateNameToTitle, dummyCredential, ensureDomainUrlHasSSL, estimateFileSize, fetchFiles, isAquaTree, isWorkFlowData, timeToHumanFriendly, getHighestFormIndex, getFileName, getFileHashFromUrl, fetchFileData, isArrayBufferText } from '../../utils/functions';
import { PDFJSViewer } from 'pdfjs-react-viewer';
import PdfSigner, { PDFDisplayWithJustSimpleOverlay } from '../PdfSigner';
import { toaster } from '../../components/chakra-ui/toaster';
import axios from 'axios';
import { ApiFileInfo } from '../../models/FileInfo';
import SignatureItem from '../../components/pdf/SignatureItem';
// import { file } from 'jszip';
import { useNavigate } from 'react-router-dom';
import { LuCheck, LuPackage, LuShip } from 'react-icons/lu';
import { IDrawerStatus, VerificationHashAndResult } from '../../models/AquaTreeDetails';
import { ItemDetail } from '../../components/ItemDetails';

const ContractSummaryView = () => {
    const [verificationResults, setVerificationResults] = useState<VerificationHashAndResult[]>([])
    const [isProcessing, setIsProcessing] = useState(false)
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
            let data: SummaryDetailsDisplayData = {
                revisionHashWithSignaturePositionCount: signaturePositionCount,
                revisionHashWithSignaturePosition: hashSigPosition,
                revisionHashWithSinatureRevision: hashSigRev,
                revisionHashMetamask: hashSigMetamak,
            }

            signatureRevionHashes.push(data)

        }


        return signatureRevionHashes
    }


    const orderedTree = OrderRevisionInAquaTree(selectedFileInfo!.aquaTree!)
    // console.log("File objects", orderedTree.file_index)
    const revisions = orderedTree.revisions
    const revisionHashes = Object.keys(revisions)

    const firstHash: string = revisionHashes[0];
    const firstRevision: Revision = selectedFileInfo!.aquaTree!.revisions[firstHash]

    const pdfHash = revisionHashes[2];
    const thirdRevision: Revision = selectedFileInfo!.aquaTree!.revisions[pdfHash]
    let hashOfLinkedDocument = thirdRevision.link_verification_hashes![0]!
    let fileName = selectedFileInfo!.aquaTree!.file_index[hashOfLinkedDocument]


    const creatorSignatureHash = revisionHashes[3];
    const signatureRevision: Revision | undefined = selectedFileInfo!.aquaTree!.revisions[creatorSignatureHash]


    let fourthItmeHashOnwards: string[] = [];
    let signatureRevionHashes: Array<SummaryDetailsDisplayData> = []

    if (revisionHashes.length > 4) {
        // remove the first 4 elements from the revision list 
        fourthItmeHashOnwards = revisionHashes.slice(4);
        // console.log(`revisionHashes  ${revisionHashes} --  ${typeof revisionHashes}`)
        // console.log(`fourthItmeHashOnwards  ${fourthItmeHashOnwards}`)
        signatureRevionHashes = getSignatureRevionHashes(fourthItmeHashOnwards)
        // console.log(`signatureRevionHashes  ${JSON.stringify(signatureRevionHashes, null, 4)}`)

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

            // Process revisions in parallel where possible
            const verificationPromises = revisionHashes.map(async revisionHash => {
                const revision = fileInfo.aquaTree!.revisions[revisionHash];
                const result = await aquafier.verifyAquaTreeRevision(
                    fileInfo.aquaTree!,
                    revision,
                    revisionHash,
                    fileObjectVerifier
                )
                // console.log("Hash: ", revisionHash, "\nResult", result)
                return ({
                    hash: revisionHash,
                    isSuccessful: result.isOk()
                })
            });

            // Wait for all verifications to complete
            const allRevisionsVerificationsStatus = await Promise.all(verificationPromises);
            // console.log("allRevisionsVerificationsStatus", allRevisionsVerificationsStatus)

            // Update state and callback
            setVerificationResults(allRevisionsVerificationsStatus);
            const _isVerificationSuccessful = isVerificationSuccessful(allRevisionsVerificationsStatus);
            _drawerStatus.isVerificationSuccessful = _isVerificationSuccessful;
            _drawerStatus.colorDark = displayColorBasedOnVerificationStatusDark(allRevisionsVerificationsStatus);
            _drawerStatus.colorLight = displayColorBasedOnVerificationStatusLight(allRevisionsVerificationsStatus);
            // callBack(_drawerStatus);
        } catch (error) {
            // console.error("Error verifying AquaTree revisions:", error);
        } finally {
            setIsProcessing(false);
        }
    }

    useEffect(() => {
        if(selectedFileInfo){
            verifyAquaTreeRevisions(selectedFileInfo)
        }
    }, [selectedFileInfo])


    return <Timeline.Root >
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

                    {signatureRevision ?
                        <Text textStyle="md">
                            User with address {signatureRevision.signature_wallet_address} , created the workflow at &nbsp;{timeToHumanFriendly(firstRevision.local_timestamp, true)}
                        </Text>
                        : <Alert status="error" title="" variant="solid"   >
                            Creator Signature not detected
                        </Alert>}
                </Timeline.Description>
                <Text textStyle="sm">
                    Document <strong>{fileName}</strong>  was selected for signing
                </Text>
            </Timeline.Content>
        </Timeline.Item>


        {
            signatureRevionHashes.length == 0 ? <Box
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
                    signatureRevionHashes.map((signatureRevionHasheItem) => {


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
                                <Timeline.Description> <Text textStyle="md"> User with address {singatureRevisionItem.signature_wallet_address}
                                    signed the document {fileName}, &nbsp;
                                    {signatureRevionHasheItem.revisionHashWithSignaturePositionCount > 1 ? <span>{signatureRevionHasheItem.revisionHashWithSignaturePositionCount} times</span> : <span>Once</span>}
                                    &nbsp;  at   {timeToHumanFriendly(singatureRevisionItem.local_timestamp)} </Text>
                                </Timeline.Description>
                            </Timeline.Content>
                        </Timeline.Item>
                    })

                }
                {
                    <Timeline.Item>
                        <Timeline.Connector>
                            <Timeline.Separator />
                            <Timeline.Indicator>
                                <LuPackage />
                            </Timeline.Indicator>
                        </Timeline.Connector>
                        <Timeline.Content>
                            <Timeline.Title textStyle="sm">Workflow Completed</Timeline.Title>
                            <Timeline.Description>


                                <Alert status={displayColorBasedOnVerificationAlert(verificationResults)} title={displayBasedOnVerificationStatusText(verificationResults)} />


                                {/* {alertcontainsInvalidRevsion.length > 0 ?
                                    <Alert status="error" title="" variant="solid"   >
                                        Workflow is not valid
                                    </Alert>

                                    :
                                    <Alert status="success" title="" variant="solid"   >
                                        Workflow  validated succceffully
                                    </Alert>

                                } */}

                            </Timeline.Description>
                        </Timeline.Content>
                    </Timeline.Item>
                }
            </>
        }

    </Timeline.Root>
}

export default function WorkFlowPage() {
    const [activeStep, setActiveStep] = useState(1);
    const [timeLineTitle, setTimeLineTitle] = useState("");
    const [error, setError] = useState("");
    const [timeLineItems, setTimeLineItems] = useState<Array<WorkFlowTimeLine>>([]);
    const { selectedFileInfo, setSelectedFileInfo, formTemplates, session, backend_url, setFiles } = useStore(appStore);
    const [submittingSignatureData, setSubmittingSignatureData] = useState(false);

    const navigate = useNavigate()



    async function loadTimeline() {
        let items: Array<WorkFlowTimeLine> = []

        let index = 0;
        for (const [hash, revision] of Object.entries(selectedFileInfo!.aquaTree!.revisions!!)) {
            console.log(`Hash ${hash} Revision ${JSON.stringify(revision)}`)


            if (index == 1) {
                // Get the first two elements
                items.push({
                    id: 1,
                    completed: true,
                    content: genesisContent(),
                    icon: FaUser,
                    revisionHash: "",
                    title: "Contract Creation"
                })
            }

            if (index == 2 || index == 4) {
                let titleData = getTitleToDisplay(index)
                let iconData = getIconToDisplay(index)
                let contentData = await getContentToDisplay(index)


                // let isVerified = aquaTreeVerificationWithStatuses.find((e) => e.revisionHash == hash)


                items.push({
                    id: index,
                    completed: false,
                    content: contentData,
                    icon: iconData,
                    revisionHash: hash,
                    title: titleData
                })

            }


            index += 1
        }


        if (Object.values(selectedFileInfo!.aquaTree!.revisions).length == 7) {

            let titleData5 = getTitleToDisplay(5)
            let iconData5 = getIconToDisplay(5)
            let contentData5 = await getContentToDisplay(5)

            items.push({
                id: 5,
                completed: true,
                content: contentData5,
                icon: iconData5,
                revisionHash: "",
                title: titleData5
            })
        }




        // not signed by user 
        if (Object.keys(selectedFileInfo!.aquaTree!.revisions!!).length == 4) {

            let index4 = 4
            let titleData4 = await getTitleToDisplay(index4)
            let iconData4 = getIconToDisplay(index4)
            let contentData4 = await getContentToDisplay(index4)

            items.push({
                id: 4,
                completed: false,
                content: contentData4,
                icon: iconData4,
                revisionHash: "",
                title: titleData4
            })



            let titleData5 = getTitleToDisplay(5)
            let iconData5 = getIconToDisplay(5)
            let contentData5 = await getContentToDisplay(5)

            items.push({
                id: 5,
                completed: false,
                content: contentData5,
                icon: iconData5,
                revisionHash: "",
                title: titleData5
            })
        }



        setTimeLineItems(items)

    }



    useEffect(() => {
        loadData()
    }, [])

    useEffect(() => {
        loadData()
    }, [JSON.stringify(selectedFileInfo)])

    const loadData = () => {
        if (selectedFileInfo) {

            const templateNames = formTemplates.map((e) => e.name)
            let { isWorkFlow, workFlow } = isWorkFlowData(selectedFileInfo.aquaTree!, templateNames)

            if (!isWorkFlow) {
                setError("The selected Aqua - Tree is not workflow")
                return
            }

            setTimeLineTitle(convertTemplateNameToTitle(workFlow))


            loadTimeline()

        }
    }

    const getTitleToDisplay = (index: number) => {

        if (index == 0 || index == 1) {
            return "Contract Creation"
        }

        if (index == 2) {
            return "Contract Document"
        }

        if (index == 3) {
            return "Creator Signature"
        }

        if (index == 4) {
            return "Recepient Signature"
        }

        if (index == 5) {
            return "Contract Summary"
        }
        return ""
    }

    const getIconToDisplay = (index: number) => {

        if (index == 0 || index == 1) {
            return FaUser
        }

        if (index == 2) {
            return FaBook
        }

        if (index == 3) {
            return FaSignal
        }

        if (index == 4) {
            return FaSignature
        }


        if (index == 4) {
            return FaAward
        }


        return FaEraser
    }

    const getContentToDisplay = async (index: number) => {



        if (index == 0 || index == 1) {
            return genesisContent()
        }

        if (index == 2) {
            const fileObjects = selectedFileInfo?.fileObject
            const actualPdf = fileObjects?.find((e) => e.fileName.endsWith(".pdf"))
            const fileUrl = actualPdf?.fileContent
            const pdfUrl = await fetchFile(fileUrl as string)
            if (!pdfUrl) {
                return <>No PDF found</>
            }
            return <PDFJSViewer pdfUrl={pdfUrl} />
        }

        if (index == 3) {

            if (selectedFileInfo == null) {
                return <Text>An error occured</Text>
            }
            // all hashes 
            let allHashes = Object.keys(selectedFileInfo.aquaTree!.revisions!);



            let signRevision = selectedFileInfo.aquaTree?.revisions[allHashes[3]]
            if (!signRevision) {
                return <Text>signature not found</Text>
            }


            return <Stack>
                Wallet {signRevision.signature_wallet_address} signed the document.

            </Stack>
        }

        if (index == 4) {
            // const fileObjects = selectedFileInfo?.fileObject
            // const actualPdf = fileObjects?.find((e) => e.fileName.endsWith(".pdf"))
            // const fileUrl = actualPdf?.fileContent
            // const pdfUrl = await fetchFile(fileUrl as string)

            let pdfFile = await fetchPDFfile()
            if (!pdfFile) {
                return <>No PDF found</>
            }

            let allHashes = Object.keys(selectedFileInfo!.aquaTree!.revisions!);

            let firstRevision = selectedFileInfo!.aquaTree?.revisions[allHashes[0]]

            if (firstRevision?.forms_signers) {
                let signers = firstRevision.forms_signers.split(",").map((e: string) => e.trim())
                if (signers.includes(session?.address)) {

                    //check if the document is signed
                    if (Object.keys(selectedFileInfo!.aquaTree!.revisions).length >= 5) {
                        const userSignatureAquaTree = selectedFileInfo!.fileObject.find((e) => e.fileName === "user_signature_data.json.aqua.json")
                        if (!userSignatureAquaTree) {
                            return <>No signature found</>
                        }
                        const signatureAquatTree: AquaTree = userSignatureAquaTree.fileContent as AquaTree
                        const revisionHashes = Object.keys(signatureAquatTree.revisions)
                        const revision = signatureAquatTree.revisions[revisionHashes[0]]

                        const fileObjects = selectedFileInfo?.fileObject
                        const actualPdf = fileObjects?.find((e) => e.fileName.endsWith(".pdf"))
                        const fileUrl = actualPdf?.fileContent
                        if (!fileUrl) {
                            return <>No PDF found</>
                        }
                        const pdfUrl = await fetchFile(fileUrl as string)
                        const signature_0_Position = {
                            height: revision.forms_height_0,
                            width: revision.forms_width_0,
                            x: revision.forms_x_0,
                            y: revision.forms_y_0,
                            page: revision.forms_page_0,//revision.forms_page_0,
                            name: "",
                            walletAddress: "",
                            image: ""
                        }

                        let signatureImageUrl: string | object | AquaTree | Uint8Array<ArrayBufferLike> | Record<string, string> | undefined = undefined
                        const signatureImageUrl1: string | object | AquaTree | Uint8Array<ArrayBufferLike> | Record<string, string> | undefined = selectedFileInfo?.fileObject?.find((e) => e.fileName === "signature.png")?.fileContent


                        if (!signatureImageUrl1) {

                            //fetch all aqua tree
                            const allAquaTrees = selectedFileInfo?.fileObject.filter((e) => isAquaTree(e.fileContent)) ?? []

                            const getFifthRevision = Object.values(selectedFileInfo!.aquaTree!.revisions!!)[5]

                            if (getFifthRevision) {
                                if (getFifthRevision.revision_type == "link") {
                                    for (let item of allAquaTrees) {
                                        const itemAquaTree: AquaTree = item.fileContent as AquaTree
                                        let allRevisionHashes = Object.keys(itemAquaTree.revisions)

                                        let linkedHash = getFifthRevision.link_verification_hashes![0]
                                        if (allRevisionHashes.includes(linkedHash)) {

                                            //get the revision previous

                                            let previousHash = itemAquaTree.revisions[linkedHash].previous_verification_hash

                                            let imageRevision = itemAquaTree.revisions[previousHash]

                                            if (imageRevision.revision_type == "link") {
                                                let imgaeRevisionHash = imageRevision.link_verification_hashes![0]!;

                                                let imageName = itemAquaTree.file_index[imgaeRevisionHash]

                                                if (imageName) {
                                                    signatureImageUrl = selectedFileInfo?.fileObject?.find((e) => e.fileName === imageName)?.fileContent
                                                }

                                            }
                                        }
                                    }
                                }

                            }



                        } else {
                            signatureImageUrl = signatureImageUrl1
                        }

                        if (!signatureImageUrl) {
                            return <>No signature image url found</>
                        }
                        const image = await fetchImage(signatureImageUrl as string)
                        if (!image) {
                            return <>No signature image found</>
                        }

                        // Getting name and address

                        const fileObject = selectedFileInfo?.fileObject?.find((e) => (testStringWith3Numbers(e.fileName) && e.fileName.endsWith(".json.aqua.json")))
                        if (!fileObject) {
                            return <>No signature data found</>
                        }
                        const signatureFormData = fileObject.fileContent as AquaTree
                        const keys = Object.keys(signatureFormData.file_index)
                        let hash = ""
                        for (let i = 0; i < keys.length; i++) {
                            if (signatureFormData.file_index[keys[i]] === fileObject.fileName.replace(".aqua.json", "")) {
                                hash = keys[i]
                                break
                            }
                        }
                        const actualRevision = signatureFormData.revisions[hash]
                        signature_0_Position.name = actualRevision.forms_name
                        signature_0_Position.walletAddress = actualRevision.forms_wallet_address
                        signature_0_Position.image = image

                        return (
                            <Grid templateColumns="repeat(4, 1fr)">
                                <GridItem colSpan={{ base: 12, md: 3 }}>
                                    {/* <PDFJSViewer pdfUrl={pdfUrl!} />  */}
                                    <PDFDisplayWithJustSimpleOverlay pdfUrl={pdfUrl!} signatures={[signature_0_Position]} />
                                </GridItem>
                                <GridItem colSpan={{ base: 12, md: 1 }}>
                                    <Stack>
                                        <Text fontWeight={700}>Signatures</Text>
                                        <SignatureItem signature={signature_0_Position} />
                                    </Stack>
                                </GridItem>
                            </Grid>
                        )
                    } else {

                        return <PdfSigner file={pdfFile} submitSignature={submitSignatureData} submittingSignatureData={submittingSignatureData} />
                    }
                } else {
                    return (
                        <Alert status="info" variant="solid" title={`You are not a signer of this document`}>
                            {
                                signers.map((signer: string, index: number) => {
                                    return <Text key={index}>{signer.trim()}</Text>
                                })
                            }
                        </Alert>
                    )
                }
            } else {
                return <Alert status="error" variant="solid" title={"Error signers not found"} />
            }



        }

        if (index == 5) {
            return <ContractSummaryView />
        }

        return <>..</>

    }

    //aqua sign revision sequesn.
    // 1. form (sender , reciever ets)
    // 2. link to sign aqua tree
    // 3. link to pdf aqua tree
    // 4. etherium sign

    // 5. link form with signature positions *100 -- form 
    // 6. link to signture aqua tree. == genesiis file break -- signature
    // 7. metamask sign -- signature
    

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

        if (signAquaTree.length == 0) {
            toaster.create({
                description: `Sinature not found`,
                type: "error"
            })
            return
        }

        setSubmittingSignatureData(true);

        let aquafier = new Aquafier();

        let signForm: {
            [key: string]: string | number;
        } = {}


        for (const [index, signaturePositionItem] of signaturePosition.entries()) {

            let pageIndex = signaturePositionItem.pageIndex + 1
            // if (pageIndex == 0) {
            //     pageIndex += 1
            // }
            signForm[`x_${index}`] = parseFloat(signaturePositionItem.x.toFixed(16));
            signForm[`y_${index}`] = parseFloat(signaturePositionItem.y.toFixed(16));
            signForm[`page_${index}`] = pageIndex.toString()
            signForm[`width_${index}`] = signaturePositionItem.width.toString()
            signForm[`height_${index}`] = signaturePositionItem.height.toString()

        }


        console.log(`Page data ${JSON.stringify(signForm, null, 4)}`)


        const jsonString = JSON.stringify(signForm, null, 2);

        let estimateize = estimateFileSize(JSON.stringify(signForm));

        const fileObjectUserSignature: FileObject = {
            fileContent: jsonString,
            fileName: `user_signature_data.json`,
            path: './',
            fileSize: estimateize
        }



        let userSignatureDataAquaTree = await aquafier.createGenesisRevision(fileObjectUserSignature, true, false, false)

        if (userSignatureDataAquaTree.isErr()) {
            setSubmittingSignatureData(false);

            toaster.create({
                description: `Sinature data creation failed`,
                type: "error"
            })
            return
        }
        // save aqua tree to the server

        console.log(`👁️‍🗨️👁️‍🗨️ Aqutree form ${JSON.stringify(userSignatureDataAquaTree.data.aquaTree!, null, 4)}  \n jsonString  ${jsonString} `)
        await saveAquaTree(userSignatureDataAquaTree.data.aquaTree!, fileObjectUserSignature, true, true, "")


        let sigFileObject = getAquaTreeFileObject(selectedFileInfo!) ?? selectedFileInfo?.fileObject[0]
        // linked 
        let aquaTreeWrapper: AquaTreeWrapper = {
            aquaTree: selectedFileInfo!.aquaTree!,
            revision: "",
            fileObject: sigFileObject
        }



        let userSignatureDataAquaTreeWrapper: AquaTreeWrapper = {
            aquaTree: userSignatureDataAquaTree!.data.aquaTree!,
            revision: "",
            fileObject: fileObjectUserSignature
        }

        let resLinkedAquaTreeWithUserSignatureData = await aquafier.linkAquaTree(aquaTreeWrapper, userSignatureDataAquaTreeWrapper)

        if (resLinkedAquaTreeWithUserSignatureData.isErr()) {

            setSubmittingSignatureData(false);

            toaster.create({
                description: `Sinature data not appended to main tree succefully `,
                type: "error"
            })
            return

        }

        //save the last link revision to db


        try {
            let newAquaTree = resLinkedAquaTreeWithUserSignatureData.data.aquaTree!
            let revisionHashes = Object.keys(newAquaTree.revisions)
            const lastHash = revisionHashes[revisionHashes.length - 1]
            const lastRevision = resLinkedAquaTreeWithUserSignatureData.data.aquaTree?.revisions[lastHash]
            // send to server
            const url = `${backend_url}/tree`;

            const response = await axios.post(url, {
                "revision": lastRevision,
                "revisionHash": lastHash,

            }, {
                headers: {
                    "nonce": session?.nonce
                }
            });

            if (response.status === 200 || response.status === 201) {


                console.log(`💯 form with signature position saved sussefully to the api `)

            }
        } catch (e) {

            setSubmittingSignatureData(false);

            toaster.create({
                description: `Error saving link revsion of signature locations `,
                type: "error"
            })
            return

        }





        let linkedAquaTreeWithUserSignatureDataWrapper: AquaTreeWrapper = {
            aquaTree: resLinkedAquaTreeWithUserSignatureData.data.aquaTree!,
            revision: "",
            fileObject: fileObjectUserSignature
        }

        let signatureAquaTree = signAquaTree[0].aquaTree!;
        let signatureFileObject = getAquaTreeFileObject(signAquaTree[0]!) ?? signAquaTree[0].fileObject[0]
        let aquaTreeWrapperLinked: AquaTreeWrapper = {
            aquaTree: signatureAquaTree,
            revision: "",
            fileObject: signatureFileObject
        }


        let resLinkedAquaTree = await aquafier.linkAquaTree(linkedAquaTreeWithUserSignatureDataWrapper, aquaTreeWrapperLinked)

        if (resLinkedAquaTree.isErr()) {

            setSubmittingSignatureData(false);

            toaster.create({
                description: `Sinature tree not appended to main tree succefully `,
                type: "error"
            })
            return

        }


        //save the last link revision to db -- signature aqua tree pdf 

        try {

            let newAquaTree = resLinkedAquaTree.data.aquaTree!
            let revisionHashes = Object.keys(newAquaTree.revisions)
            const lastHash = revisionHashes[revisionHashes.length - 1]
            const lastRevision = resLinkedAquaTree.data.aquaTree?.revisions[lastHash]
            // send to server
            const url = `${backend_url}/tree`;

            const actualUrlToFetch = ensureDomainUrlHasSSL(url);


            const response = await axios.post(actualUrlToFetch, {
                "revision": lastRevision,
                "revisionHash": lastHash,

            }, {
                headers: {
                    "nonce": session?.nonce
                }
            });




            //


            if (response.status === 200 || response.status === 201) {


                console.log(`💯 form with signature data saved sussefully to the api `)

            }




        } catch (e) {

            setSubmittingSignatureData(false);

            toaster.create({
                description: `Error saving link revsion of signature tree `,
                type: "error"
            })

            return
        }


        // meta mask sign 
        let aquaTreeWrappersignatureLinked: AquaTreeWrapper = {
            aquaTree: resLinkedAquaTree.data!.aquaTree!,
            revision: "",
            fileObject: signatureFileObject
        }

        let resLinkedMetaMaskSignedAquaTree = await aquafier.signAquaTree(aquaTreeWrappersignatureLinked, 'metamask', dummyCredential())

        if (resLinkedMetaMaskSignedAquaTree.isErr()) {

            setSubmittingSignatureData(false);

            toaster.create({
                description: `Metamask Sinature  not appended to main tree succefully `,
                type: "error"
            })
            return

        }


        //save the last  revision to db

        try {

            let newAquaTree = resLinkedMetaMaskSignedAquaTree.data.aquaTree!
            let revisionHashes = Object.keys(newAquaTree.revisions)
            const lastHash = revisionHashes[revisionHashes.length - 1]
            const lastRevision = resLinkedMetaMaskSignedAquaTree.data.aquaTree?.revisions[lastHash]
            // send to server
            const url = `${backend_url}/tree`;

            const actualUrlToFetch = ensureDomainUrlHasSSL(url);


            const response = await axios.post(actualUrlToFetch, {
                "revision": lastRevision,
                "revisionHash": lastHash,

            }, {
                headers: {
                    "nonce": session?.nonce
                }
            });
            //


            if (response.status === 200 || response.status === 201) {


                console.log(`💯 form with signature metamask data saved sussefully to the api `)

            }




        } catch (e) {

            setSubmittingSignatureData(false);

            toaster.create({
                description: `Error saving link revsion of signature tree `,
                type: "error"
            })

            return
        }




        //fetch user all files 



        const url2 = `${backend_url}/explorer_files`;
        const files = await fetchFiles(`${session?.address}`, url2, `${session?.nonce}`);
        setFiles(files);


        let selectedFileGenesisHash = getGenesisHash(selectedFileInfo!.aquaTree!)
        let seletctedFile = files.find((data) => getGenesisHash(data.aquaTree!) == selectedFileGenesisHash)

        if (seletctedFile) {

            setSelectedFileInfo(seletctedFile!)

            toaster.create({
                description: `Document Signed successfully`,
                type: "success"
            })


            setActiveStep(5)

        } else {

            toaster.create({
                description: `An error occured, redirecting to home`,
                type: "error"
            })

            setTimeout(() => {
                window.location.reload()
            }, 150)
            navigate("/")

        }


        // let data = selectedFileInfo
        // data!.aquaTree = resLinkedAquaTree.data.aquaTree
        // data!.fileObject = allfileObjects;
        // setSelectedFileInfo(data!!)


    }

    // Helper function to get content type from file extension
    // const getContentTypeFromFileName = (fileName: string): string => {
    //     if (!fileName) return "application/octet-stream";
    //     const extension = fileName.split('.').pop()?.toLowerCase() || "";
    //     if (extension === "pdf") return "application/pdf";
    //     return "application/octet-stream";
    // };

    // console.log("fie: ", selectedFileInfo)

    //tod replace this methd with fetchPDFfile
    const fetchFile = async (fileUrl: string) => {
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
                if (fileUrl.toLowerCase().endsWith(".pdf")) {
                    contentType = "application/pdf";
                    console.log("Determined content type from filename:", contentType);
                }
            }

            if (contentType.startsWith("image")) {
                const arrayBuffer = await response.arrayBuffer();
                // Ensure we use the PDF content type
                const blob = new Blob([arrayBuffer], { type: contentType });
                return URL.createObjectURL(blob);
            }

            // Process PDF files
            if (contentType === "application/pdf" || fileUrl.toLowerCase().endsWith(".pdf")) {
                const arrayBuffer = await response.arrayBuffer();
                // Ensure we use the PDF content type
                const blob = new Blob([arrayBuffer], { type: "application/pdf" });
                return URL.createObjectURL(blob);
            }

            return null;
        } catch (error) {
            console.error("Error fetching file:", error);
            return null;
        }
    }

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


    const fetchPDFfile = async (): Promise<File | null> => {

        try {

            if (!selectedFileInfo) {
                console.log(`📢📢 selected file not found, this should be investigated`)
                throw Error("Fix me")
            }
            // all hashes 
            let allHashes = Object.keys(selectedFileInfo.aquaTree!.revisions!);

            let firstRevision = selectedFileInfo.aquaTree?.revisions[allHashes[0]]
            if (!firstRevision) {
                console.log(`📢📢 first revision does not exist, this should be investigated`)
                throw Error("Fix me 2")
            }

            let pdfLinkRevision = selectedFileInfo.aquaTree?.revisions[allHashes[2]]
            if (!pdfLinkRevision) {
                console.log(`📢📢 pdf link revision does not exist, this should be investigated`)
                throw Error("Fix me 3")
            }


            if (!pdfLinkRevision.link_verification_hashes) {
                console.log(`📢📢 pdf link revision link_verification_hashes is undefined, this should be investigated`)
                throw Error("Fix me 4")
            }
            let pdfHash = pdfLinkRevision.link_verification_hashes[0]
            let pdfName = selectedFileInfo.aquaTree?.file_index[pdfHash]
            if (!pdfName) {
                console.log(`📢📢 pdf Name not found in index, this should be investigated`)

                throw Error("Fix me 5")
            }



            let pdfFileObject = selectedFileInfo.fileObject.find((e) => e.fileName == pdfName)
            if (!pdfFileObject) {
                console.log(`📢📢 file object does not contain the signature pdf object, this should be investigated`)


                throw Error("Fix me 6")
            }

            console.log(`&&& pdfName ${pdfName} Data ${JSON.stringify(pdfFileObject, null, 4)}`)

            let fileContentUrl = pdfFileObject.fileContent

            if (typeof fileContentUrl === 'string' && fileContentUrl.startsWith('http')) {

                const actualUrlToFetch = ensureDomainUrlHasSSL(fileContentUrl);
                console.log(`Fetch url ${fileContentUrl}  new ${actualUrlToFetch}`)

                const response = await fetch(actualUrlToFetch, {
                    headers: {
                        nonce: `${session?.nonce}`
                    }
                });

                if (!response.ok) {
                    toaster.create({
                        description: `${pdfName} not found in system`,
                        type: "error"
                    })

                    throw Error("Fix me 7")
                }

                // Get content type from headers or from file extension
                // Get content type from headers or from file extension
                let contentType = response.headers.get("Content-Type") || "application/pdf";
                console.log(`Content type ${contentType}`);

                // Get the blob from the response
                // const blob = await response.blob();

                // Clone response and get data
                const arrayBuffer = await response.arrayBuffer();


                // Create blob with correct content type
                const blob = new Blob([arrayBuffer], { type: contentType });


                // Convert Blob to File
                const file = new File([blob], pdfName, {
                    type: contentType,
                    lastModified: Date.now(),
                });


                return file
            }

            return null

        } catch (error) {
            console.error("Error fetching file:", error);
            return null;
        }
    }


    /*
        check whether a string contains a number
        input: user_signature-753.json
    */
    const testStringWith3Numbers = (str: string) => {
        const stringArray = str.split("")
        for (let i = 0; i < stringArray.length; i++) {
            let num = Number(stringArray[i])
            if (!isNaN(num)) {
                return true
            }
        }
        return false
    }




    const genesisContent = () => {
        const orderedTree = OrderRevisionInAquaTree(selectedFileInfo!.aquaTree!)
        const revisions = orderedTree.revisions
        const revisionHashes = Object.keys(revisions)
        const revision = revisions[revisionHashes[0]]
        let contractCreatorAddress = "";
        let creatorSignatureRevision = revisions[revisionHashes[3]] // fourth revision
        if (creatorSignatureRevision.revision_type == "signature") {
            contractCreatorAddress = creatorSignatureRevision.signature_wallet_address ?? ""
        }
        return (
            <Stack>
                {contractCreatorAddress == session?.address ?
                    <Text>Your wallet address  created this workflow wallet  address </Text> : <>

                        <ItemDetail label="Wallet address:"
                            displayValue={contractCreatorAddress}
                            value={contractCreatorAddress} showCopyIcon={true}
                        />
                        <Text>{contractCreatorAddress} created the workflow</Text>
                    </>
                }
                <Text>Creation date {timeToHumanFriendly(revision.local_timestamp, true)}</Text>
                <Text>Contract Name: {selectedFileInfo!.aquaTree!.file_index[revisionHashes[0]]}</Text>
                <Heading size="md" fontWeight={700}>All signers</Heading>
                {
                    revision.forms_signers.split(",").map((signer: string, index: number) => {
                        return <Alert key={index} title={signer} />
                    })
                }
            </Stack>
        )
    }

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

        // if (timeLineItems.length == 0) {
        //     return <Alert status="info" title="" variant="solid"   >
        //         Aqua Tree time line data not found
        //     </Alert>
        // }



        return aquaTreeTimeLine()
    }


    return (
        <>
            {workFlowPageData()}
        </>
    );
}