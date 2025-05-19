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
    Stack,
    Grid,
    GridItem,
    Center
} from '@chakra-ui/react';
// import { Card } from '@chakra-ui/react';
// import { FaCheck, FaQuestionCircle, FaBriefcase, FaBook, FaCoffee, FaAward, FaUser } from 'react-icons/fa';
import { FaAward, FaBook, FaCheck, FaQuestionCircle, FaUser, FaSignal, FaSignature, FaEraser } from 'react-icons/fa';
import { Alert } from "../../components/chakra-ui/alert"
import appStore from '../../store';
import { useStore } from "zustand"
import { SignaturePosition, WorkFlowTimeLine } from '../../types/types';
import { RevisionVerificationStatus } from '../../types/types';
import Aquafier, { AquaTree, AquaTreeWrapper, FileObject, getAquaTreeFileObject, OrderRevisionInAquaTree } from 'aqua-js-sdk';
import { convertTemplateNameToTitle, ensureDomainUrlHasSSL, estimateFileSize, isWorkFlowData } from '../../utils/functions';
import { PDFJSViewer } from 'pdfjs-react-viewer';
import PdfSigner, { SimpleSignatureOverlay } from '../PdfSigner';
import { toaster } from '../../components/chakra-ui/toaster';
import axios from 'axios';
import { ApiFileInfo } from '../../models/FileInfo';
import SignatureItem from '../../components/pdf/SignatureItem';
import { CompleteChainView } from '../../components/CustomDrawer';
import { useColorMode } from '../../components/chakra-ui/color-mode';

export default function WorkFlowPage() {
    const [activeStep, setActiveStep] = useState(1);
    const [timeLineTitle, setTimeLineTitle] = useState("");
    const [error, setError] = useState("");
    const [aquaTreeVerificationWithStatuses, setAquaTreeVerificationWithStatuses] = useState<Array<RevisionVerificationStatus>>([]);
    const [timeLineItems, setTimeLineItems] = useState<Array<WorkFlowTimeLine>>([]);
    const { selectedFileInfo, setSelectedFileInfo, formTemplates, session, backend_url } = useStore(appStore);
    const { colorMode } = useColorMode();
    const [currentPage, setCurrentPage] = useState(1);


    //aqua sign revision sequesn.
    // 1. form (sender , reciever ets)
    // 2. link to sign aqua tree
    // 3. link to pdf aqua tree
    // 4. etherium sign
    // 5. form with signature positions
    // 6. link to signture aqua tree.

    useEffect(() => {
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


                    let isVerified = aquaTreeVerificationWithStatuses.find((e) => e.revisionHash == hash)


                    items.push({
                        id: index,
                        completed: isVerified?.isVerified ?? false,
                        content: contentData,
                        icon: iconData,
                        revisionHash: hash,
                        title: titleData
                    })

                }


                index += 1
            }


            if (Object.values(selectedFileInfo!.aquaTree!.revisions).length == 6) {

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

        let aquafier = new Aquafier();

        let signForm: {
            [key: string]: string | number;
        } = {}


        for (const [index, signaturePositionItem] of signaturePosition.entries()) {

            let pageIndex = signaturePositionItem.pageIndex +1
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
            toaster.create({
                description: `Sinature data creation failed`,
                type: "error"
            })
            return
        }
        // save aqua tree to the server

        console.log(`👁️‍🗨️👁️‍🗨️ Aqutree form ${JSON.stringify(userSignatureDataAquaTree.data.aquaTree!, null, 4)}  \n jsonString  ${jsonString} `)
        await saveAquaTree(userSignatureDataAquaTree.data.aquaTree!, fileObjectUserSignature, true, true, "")


        // linked 
        let aquaTreeWrapper: AquaTreeWrapper = {
            aquaTree: selectedFileInfo!.aquaTree!,
            revision: "",
            fileObject: getAquaTreeFileObject(selectedFileInfo!) ?? selectedFileInfo?.fileObject[0]
        }

        let userSignatureDataAquaTreeWrapper: AquaTreeWrapper = {
            aquaTree: userSignatureDataAquaTree!.data.aquaTree!,
            revision: "",
            fileObject: fileObjectUserSignature
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
            fileObject: getAquaTreeFileObject(signAquaTree[0]!) ?? signAquaTree[0].fileObject[0]
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

    console.log(selectedFileInfo)

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
                            page: 1,//revision.forms_page_0,
                            name: "",
                            walletAddress: "",
                            image: ""
                        }

                        const signatureImageUrl = selectedFileInfo?.fileObject?.find((e) => e.fileName === "signature.png")?.fileContent
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
                                    <Box
                                        position="relative"
                                        border="1px solid"
                                        borderColor={colorMode === "dark" ? "gray.800" : "gray.100"}
                                        borderRadius="md"
                                        py={"4"}
                                    >
                                        <Center>
                                            <Box w={'fit-content'}>
                                                <PDFJSViewer
                                                    pdfUrl={pdfUrl!}
                                                    onPageChange={(page) => {
                                                        setCurrentPage(page)
                                                    }}
                                                />
                                            </Box>
                                        </Center>


                                        <Text>{currentPage}----{JSON.stringify(signature_0_Position)}</Text>
                                        {/* Signature overlays */}
                                        {[signature_0_Position].map((position, index) => (
                                            <>
                                                {
                                                    Number(currentPage) === Number(position.page) ? (
                                                        <SimpleSignatureOverlay key={index} signature={position}
                                                        />
                                                    ) : (
                                                        <>Found nothing to render</>
                                                    )
                                                }
                                            </>
                                        ))}
                                    </Box>
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

                        return <PdfSigner file={pdfFile} submitSignature={submitSignatureData} />
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
            return (
                <CompleteChainView selectedFileInfo={selectedFileInfo!} callBack={() => { }} />
            )
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