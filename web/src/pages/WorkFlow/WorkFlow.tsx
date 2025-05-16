import React, { useEffect, useState } from 'react';
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
    Stack
} from '@chakra-ui/react';
// import { Card } from '@chakra-ui/react';
// import { FaCheck, FaQuestionCircle, FaBriefcase, FaBook, FaCoffee, FaAward, FaUser } from 'react-icons/fa';
import { FaAward, FaBook, FaCheck, FaQuestionCircle, FaUser, FaSignal, FaSignature, FaEraser } from 'react-icons/fa';
import { Alert } from "../../components/chakra-ui/alert"
import appStore from '../../store';
import { useStore } from "zustand"
import { SignaturePosition, WorkFlowTimeLine } from '../../types/types';
import { RevisionVerificationStatus } from '../../types/types';
import Aquafier, { AquaTreeWrapper, FileObject, getAquaTreeFileObject, OrderRevisionInAquaTree } from 'aqua-js-sdk';
import { convertTemplateNameToTitle, ensureDomainUrlHasSSL, estimateFileSize, isWorkFlowData } from '../../utils/functions';
import { PDFJSViewer } from 'pdfjs-react-viewer';
import PdfSigner from '../PdfSigner';
import { toaster } from '../../components/chakra-ui/toaster';
import axios from 'axios';
import { ApiFileInfo } from '../../models/FileInfo';

export default function WorkFlowPage() {
    const [activeStep, setActiveStep] = useState(1);
    const [timeLineTitle, setTimeLineTitle] = useState("");
    const [error, setError] = useState("");
    const [aquaTreeVerificationWithStatuses, setAquaTreeVerificationWithStatuses] = useState<Array<RevisionVerificationStatus>>([]);
    const [timeLineItems, setTimeLineItems] = useState<Array<WorkFlowTimeLine>>([]);
    const { selectedFileInfo, setSelectedFileInfo, formTemplates, session, backend_url } = useStore(appStore);


    useEffect(() => {
        async function loadTimeline() {
            let items: Array<WorkFlowTimeLine> = []
            // Get the first two elements
            // const _firstTwo = aquaTreeVerificationWithStatuses.slice(0, 2);
            // console.log("First two elements:", firstTwo); // [1, 2]

            items.push({
                id: 1,
                completed: true,
                content: genesisContent(),
                icon: FaUser,
                revisionHash: "",
                title: "Contract Creation"
            })


            // Get the rest of the elements (from index 2 onward)
            const rest = aquaTreeVerificationWithStatuses.slice(3);


            for (const [indexItem, item] of rest.entries()) { // aquaTreeVerificationWithStatuses.entries()) {

                let index = indexItem + 2;
                console.log(`Index: ${index}, Item:`, item);


                // if(index==3){
                //     continue
                // }
                let titleData = getTitleToDisplay(index)
                let iconData = getIconToDisplay(index)
                let contentData = await getContentToDisplay(index)

                items.push({
                    id: index,
                    completed: item.isVerified,
                    content: contentData,
                    icon: iconData,
                    revisionHash: item.revisionHash,
                    title: titleData
                })

                // Now you have both the numeric index and the actual item
                // setTimeLineItems((items) => {
                //     let existingData = items.find((e) => e.revisionHash == item.revisionHash)
                //     if (existingData) {
                //         items.filter((e) => e.revisionHash != item.revisionHash)
                //         items.push({
                //             id: index,
                //             completed: true,
                //             content: contentData,
                //             icon: iconData,
                //             revisionHash: item.revisionHash,
                //             title: titleData
                //         })
                //     } else {
                //     }
                //     return items
                // })


            }

            console.log(`****************** index ${items.length} -- `)

            if (items.length == 2) {

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

            console.log(`###############################################`)
            console.log(`items ${JSON.stringify(items, null, 4)}`)


            setTimeLineItems(items)

        }

        loadTimeline()

    }, [aquaTreeVerificationWithStatuses])



    useEffect(() => {
        loadData()

    }, [])

    useEffect(() => {


        loadData()

    }, [selectedFileInfo])



    const loadData = () => {
        if (selectedFileInfo) {


            const templateNames = formTemplates.map((e) => e.name)
            let { isWorkFlow, workFlow } = isWorkFlowData(selectedFileInfo.aquaTree!, templateNames)

            if (!isWorkFlow) {

                setError("The selected Aqua - Tree is not workflow")
                return

            }
            setTimeLineTitle(convertTemplateNameToTitle(workFlow))

            let intialData: Array<RevisionVerificationStatus> = []
            for (const [hash, revision] of Object.entries(selectedFileInfo!.aquaTree!.revisions!!)) {
                console.log(`Hash ${hash} Revision ${JSON.stringify(revision)}`)
                intialData.push({
                    isVerified: false,
                    revision: revision,
                    revisionHash: hash,
                    verficationStatus: null,
                    logData: []
                })
            }

            setAquaTreeVerificationWithStatuses(intialData)

            let aquafier = new Aquafier();

            // // loop verifying each revision
            for (const [hash, revision] of Object.entries(selectedFileInfo!.aquaTree!.revisions!!)) {
                //self invoking function that is async
                (async () => {

                    let verificationData = await aquafier.verifyAquaTreeRevision(selectedFileInfo!.aquaTree!, revision, hash, selectedFileInfo.fileObject);
                    // Update the item with matching hash in a functional manner
                    setAquaTreeVerificationWithStatuses(prevStatuses => {
                        return prevStatuses.map(status => {
                            if (status.revisionHash === hash) {
                                return {
                                    ...status,
                                    verficationStatus: verificationData.isOk() ? true : false, // assuming verificationData is boolean
                                    isVerified: true,
                                    logData: verificationData.isErr() ? verificationData.data : []
                                };
                            }
                            return status;
                        });
                    });
                })()
            }
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

    const submitSignatureData = async (signaturePosition: SignaturePosition[], signAquaTree: ApiFileInfo[]) => {

        if (signAquaTree.length == 0) {
            toaster.create({
                description: `Sinature not found`,
                type: "error"
            })
            return
        }

        let aquafier = new Aquafier();

        let signForm: {
            [key: string]: string | number;
        } = {}


        for (const [index, signaturePositionItem] of signaturePosition.entries()) {

            signForm[`x_${index}`] = signaturePositionItem.x
            signForm[`y_${index}`] = signaturePositionItem.y
            signForm[`page_${index}`] = signaturePositionItem.pageIndex
            signForm[`width_${index}`] = signaturePositionItem.width
            signForm[`height_${index}`] = signaturePositionItem.height

        }


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
            toaster.create({
                description: `Sinature data creation failed`,
                type: "error"
            })
            return
        }


        // linked 
        let aquaTreeWrapper: AquaTreeWrapper = {
            aquaTree: selectedFileInfo!.aquaTree!,
            revision: "",
            fileObject: getAquaTreeFileObject(selectedFileInfo!) ?? selectedFileInfo?.fileObject[0]
        }

        let userSignatureDataAquaTreeWrapper: AquaTreeWrapper = {
            aquaTree: userSignatureDataAquaTree!.data.aquaTree!,
            revision: "",
            fileObject:fileObjectUserSignature
        }

        let resLinkedAquaTreeWithUserSignatureData = await aquafier.linkAquaTree(aquaTreeWrapper, userSignatureDataAquaTreeWrapper)

        if (resLinkedAquaTreeWithUserSignatureData.isErr()) {

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
        let aquaTreeWrapperLinked: AquaTreeWrapper = {
            aquaTree: signatureAquaTree,
            revision: "",
            fileObject: getAquaTreeFileObject(signAquaTree[0]!) ??signAquaTree[0].fileObject[0]
        }
        let resLinkedAquaTree = await aquafier.linkAquaTree(linkedAquaTreeWithUserSignatureDataWrapper, aquaTreeWrapperLinked)

        if (resLinkedAquaTree.isErr()) {

            toaster.create({
                description: `Sinature tree not appended to main tree succefully `,
                type: "error"
            })
            return

        }


        //save the last link revision to db

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



            toaster.create({
                description: `Linking successfull`,
                type: "success"
            })




            if (response.status === 200 || response.status === 201) {


                console.log(`💯 form with signature data saved sussefully to the api `)

            }
        } catch (e) {

            toaster.create({
                description: `Error saving link revsion of signature tree `,
                type: "error"
            })

            return
        }




        let data = selectedFileInfo
        data!.aquaTree = resLinkedAquaTree.data.aquaTree
        setSelectedFileInfo(data!!)


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
                console.error("Failed to fetch file:", response.status, response.statusText);
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

    const getContentToDisplay = async (index: number) => {

        // const orderedTree = OrderRevisionInAquaTree(selectedFileInfo!.aquaTree!)
        // console.log("File objects", orderedTree.file_index)
        // const revisions = orderedTree.revisions
        // const revisionHashes = Object.keys(revisions)
        // console.log("selected file info: ", selectedFileInfo?.fileObject)

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
            console.log("objectURL", pdfUrl)
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
                if (firstRevision.forms_signers == session?.address) {

                    //check if the document is signed
                    if (Object.keys(selectedFileInfo!.aquaTree!.revisions).length >= 5) {

                        return <Text>Pdf signed</Text>
                    } else {

                        return <PdfSigner file={pdfFile} submitSignature={submitSignatureData} />
                    }
                } else {
                    return <Alert status="info" variant="solid" title={`Error signers should be ${firstRevision?.forms_signers}`} />
                }
            } else {
                return <Alert status="error" variant="solid" title={"Error signers not found"} />
            }



        }

        if (index == 5) {
            return <>Index 5</>
        }

        return <>..</>

    }

    const genesisContent = () => {
        const orderedTree = OrderRevisionInAquaTree(selectedFileInfo!.aquaTree!)
        const revisions = orderedTree.revisions
        const revisionHashes = Object.keys(revisions)
        const revision = revisions[revisionHashes[0]]
        return (
            <Stack>
                <Text>A contract has been shared with you to sign. If you accept the contract, you will be able to sign it.</Text>
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

        if (timeLineItems.length == 0) {
            return <Alert status="info" title="" variant="solid"   >
                Aqua Tree time line data not found
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