
import React, { useEffect, useState } from 'react';
import {
    Text,
    Heading,
    Stack,
    Grid,
    GridItem,
    Spinner
} from '@chakra-ui/react';
// import { Card } from '@chakra-ui/react';
// import { FaCheck, FaQuestionCircle, FaBriefcase, FaBook, FaCoffee, FaAward, FaUser } from 'react-icons/fa';
import { Alert } from "../../../components/chakra-ui/alert"
import appStore from '../../../store';
import { useStore } from "zustand"
import { ContractDocumentViewProps,  SignatureData } from '../../../types/types';
import Aquafier, { AquaTree, AquaTreeWrapper, FileObject, getGenesisHash, OrderRevisionInAquaTree } from 'aqua-js-sdk';
import { dummyCredential, ensureDomainUrlHasSSL, estimateFileSize, fetchFiles, getAquaTreeFileObject } from '../../../utils/functions';

import { PDFDisplayWithJustSimpleOverlay } from '../../PdfSigner/components/signature_overlay';
import PdfSigner from '../../PdfSigner/PdfSigner';
import { toaster } from '../../../components/chakra-ui/toaster';
import axios from 'axios';
import { ApiFileInfo } from '../../../models/FileInfo';
import SignatureItem from '../../../components/pdf/SignatureItem';
import { useNavigate } from 'react-router-dom';





export const ContractDocumentView: React.FC<ContractDocumentViewProps> = ({ setActiveStep }) => {



    const [pdfLoadingFile, setLoadingPdfFile] = useState<boolean>(true);
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [pdfURLObject, setPdfURLObject] = useState<string | null>(null);
    const [signatures, setSignatures] = useState< SignatureData[]>([]);
        // const [signaturesData, setSignaturesData] = useState<SignatureData[]>([]);
    const [signaturesLoading, setSignaturesLoading] = useState<boolean>(false);
    // const [userCanSign, setUserCanSign] = useState<boolean>(false);
    // const [authorizedSigners, setAuthorizedSigners] = useState<string[]>([]);
    const { selectedFileInfo, setSelectedFileInfo, session, backend_url, setFiles } = useStore(appStore);
    const [submittingSignatureData, setSubmittingSignatureData] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        initializeComponent();
    }, []);


    useEffect(() => {
        initializeComponent()
    }, [JSON.stringify(selectedFileInfo), selectedFileInfo])



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


    const submitSignatureData = async (signaturePosition: SignatureData[], signAquaTree: ApiFileInfo[]) => {
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
            await shareRevisionsToOwnerAnOtherSignersOfDocument([
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
    const createSignatureFormData = (signaturePosition: SignatureData[]) => {
        const signForm: { [key: string]: string | number } = {};

        signaturePosition.forEach((signaturePositionItem, index) => {
            const pageIndex = signaturePositionItem.page + 1;
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

    const shareRevisionsToOwnerAnOtherSignersOfDocument = async (aquaTrees: AquaTree[]) => {

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
                    address: address,
                    orginAddress : session?.address
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
            // const { canSign, signers } = checkUserAuthorization();
            // setUserCanSign(canSign);
            // console.log(`sigers ${signers}`)
            //   setAuthorizedSigners(signers);

            if (shouldLoadSignatures()) {
                setSignaturesLoading(true);
                const allSignatures : SignatureData[] = await loadSignatures();
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


    const shouldLoadSignatures = (): boolean => {
        if (!selectedFileInfo?.aquaTree?.revisions) return false;

        const revisionHashes = Object.keys(selectedFileInfo.aquaTree.revisions);
        return revisionHashes.length >= 5; // Document has signatures
    };

    const loadSignatures = async (): Promise< SignatureData[]> => {
        try {
            console.log("Identifying link revisions")
            const linkRevisionsThatWeNeed = identifySignatureRevisions();
            console.log("Link revisions that we need", linkRevisionsThatWeNeed)
            const signaturesItem = await Promise.all(
                linkRevisionsThatWeNeed.map(linkRevision => processSignatureRevision(linkRevision))
            );

            return signaturesItem.filter((signature : SignatureData |  null) => signature !== null);
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

    const processSignatureRevision = async (linkRevision: any): Promise<SignatureData | null> => {
        try {
            console.log("----- Link Revision: ", linkRevision)
            const { positionAquaTree, signatureDetailsAquaTree } = findRelatedAquaTrees(linkRevision);
            console.log("----- Position Aqua Tree: ", positionAquaTree)
            console.log("----- Signature Details Aqua Tree: ", signatureDetailsAquaTree)

            if (!positionAquaTree || !signatureDetailsAquaTree) {
                return null;
            }

            let signatureDetails : SignatureData = extractSignaturePosition(positionAquaTree, linkRevision.linkHash);
            signatureDetails = await populateSignatureDetails(signatureDetails, signatureDetailsAquaTree, linkRevision.nextLinkHash);

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

    const extractSignaturePosition = (aquaTree: AquaTree, linkHash: string ) : SignatureData => {
        const revision = aquaTree.revisions[linkHash];
       

        return {
            id: revision.revision_hash || "",
            height: revision.forms_height_0,
            width: revision.forms_width_0,
            x: revision.forms_x_0,
            y: revision.forms_y_0,
            page: revision.forms_page_0,
            name: "",
            walletAddress: "",
            createdAt: new Date(revision.created_at || Date.now()),
            dataUrl: "",
            hash:revision.revision_hash,
            isDragging: false,
            signatureId: revision.revision_hash // Assuming revision_hash is used as signatureId

        };
    };

    const populateSignatureDetails = async (signatureDetails:  SignatureData, aquaTree: AquaTree, _nextLinkHash: string) :  Promise<SignatureData> => {
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
                    signatureDetails.dataUrl = image;
                }
            }
        }

        return signatureDetails;
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
                    <GridItem colSpan={{ base: 12, md: 1 }} m={5}>
                        <Stack>
                            <Text fontWeight={700}>Signatures in document</Text>
                            {signatures.map((signature: SignatureData, index: number) => (
                                <SignatureItem signature={signature} key={index} />
                            ))}
                        </Stack>
                    </GridItem>
                </Grid>
            );
        }

        return (
            <PdfSigner
                documentSignatures={signatures}
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

