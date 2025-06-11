import { useState, useRef, useEffect } from 'react';
import {
    Box,
    Button,
    Text,
    Stack,
    Input,
    Heading,
    HStack,
    Slider,
    IconButton,
    FieldLabel,
    Grid,
    GridItem,
    Center,
    Container,
    Spinner,
    List,
    Group
} from '@chakra-ui/react';
import { useBoolean } from '@chakra-ui/hooks';
// import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PDFDocument } from 'pdf-lib';
import SignatureCanvas from 'react-signature-canvas';
import { FaUndo, FaPlus } from 'react-icons/fa';
import appStore from '../../../store';
import { useStore } from "zustand";
import { toaster } from '../../../components/chakra-ui/toaster';
import { Field } from '../../../components/chakra-ui/field';
import { DialogBody, DialogContent, DialogHeader, DialogRoot } from '../../../components/chakra-ui/dialog';
import { PDFJSViewer } from 'pdfjs-react-viewer';
import { useColorMode } from '../../../components/chakra-ui/color-mode';
import { PdfControls } from '../../../components/FilePreview';
import axios from 'axios';
import { ApiFileInfo } from '../../../models/FileInfo';
import { dataURLToFile, dummyCredential, ensureDomainUrlHasSSL, estimateFileSize, fetchFiles, getAquaTreeFileName, getGenesisHash, getLatestApiFileInfObject, getRandomNumber, timeStampToDateObject } from '../../../utils/functions';
import Aquafier, { AquaTree, AquaTreeWrapper, FileObject, getAquaTreeFileObject } from 'aqua-js-sdk';
import { SignatureData } from "../../../types/types"
import { LuTrash } from 'react-icons/lu';
import { SignatureOverlay, SimpleSignatureOverlay } from './components/signature_overlay';
import { useNavigate } from 'react-router-dom';




interface PdfSignerProps {

    file: File | null;
    setActiveStep: (page: number) => void;
    documentSignatures?: SignatureData[]
}

const PdfSigner: React.FC<PdfSignerProps> = ({ file, setActiveStep, documentSignatures }) => {

    const { formTemplates, systemFileInfo, selectedFileInfo, setSelectedFileInfo, setFiles } = useStore(appStore)
    // State for PDF document
    const [pdfFile, setPdfFile] = useState<File | null>(file);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [_pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
    const [creatingUserSignature, setCreatingUserSignature] = useState<boolean>(false);
    const [signers, setSigners] = useState<string[]>([]);
    const [allSignersBeforeMe, setAllSignersBeforeMe] = useState<string[]>([]);
    const [userCanSign, setUserCanSign] = useState<boolean>(false);

    // const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);

    // State for signatures
    const signatureRef = useRef<SignatureCanvas | null>(null);
    const [mySignaturesAquaTree, setMySignaturesAquaTree] = useState<Array<ApiFileInfo>>([]);
    const [mySignatureData, setMySignatureData] = useState<Array<SignatureData>>([]);


    const [signaturesInDocument, setSignaturesInDocument] = useState<SignatureData[]>(documentSignatures || []);

    const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(null);
    const [signerName, setSignerName] = useState<string>('John Doe');
    const [signaturePositions, setSignaturePositions] = useState<SignatureData[]>([]);
    const [placingSignature, setPlacingSignature] = useState<boolean>(false);
    const [signatureSize, setSignatureSize] = useState<number>(330);

    const [submittingSignatureData, setSubmittingSignatureData] = useState(false);

    // Modal state
    const [isOpen, setIsOpen] = useState(false);
    const { colorMode } = useColorMode();


    // Get wallet address from store
    const { session, backend_url } = useStore(appStore);

    // PDF viewer container ref
    const pdfContainerRef = useRef<HTMLDivElement>(null);
    const pdfMainContainerRef = useRef<HTMLDivElement>(null);


    const navigate = useNavigate();



    const saveRevisionsToServerForUser = async (aquaTrees: AquaTree[], address: string) => {

        // console.log(`aquaTrees ${aquaTrees.length}`)
        for (let index = 0; index < aquaTrees.length; index++) {
            const aquaTree = aquaTrees[index];

            // console.log(`aquaTrees ${index}  ${JSON.stringify(aquaTree, null, 4)}`)
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
                    orginAddress: session?.address
                }, {
                    headers: {
                        nonce: session?.nonce
                    }
                });

                if (response.status === 200 || response.status === 201) {
                    // console.log(`💯 Revision ${index + 1} saved successfully to the API`);
                    // todo a method to notify the other user should go here
                }

            } catch (error) {
                console.error(`Error saving revision ${index + 1}:`, error);
                throw new Error(`Error saving revision ${index + 1} to server`);
            }
        }

    };


    // Helper function to show error messages
    const showError = (message: string) => {
        toaster.create({
            description: message,
            type: "error"
        });
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

        // console.log(`👁️‍🗨️👁️‍🗨️ AquaTree form ${JSON.stringify(userSignatureDataAquaTree.data.aquaTree!, null, 4)} \n jsonString ${jsonString}`);

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
    const linkSignatureTreeToDocument = async (aquafier: Aquafier, linkedAquaTree: any) => {
        const linkedAquaTreeWrapper: AquaTreeWrapper = {
            aquaTree: linkedAquaTree,
            revision: "",
            fileObject: getAquaTreeFileObject(selectedFileInfo!) ?? selectedFileInfo?.fileObject[0]
        };

        if (selectedSignatureId == null) {
            throw Error(`selected signature id is null `)
        }
        // const signatureFileObject = getAquaTreeFileObject(signatureInfo) ?? signatureInfo.fileObject[0];
        let sigData: ApiFileInfo | undefined = undefined

        for (const e of mySignaturesAquaTree) {
            let allHashes = Object.keys(e.aquaTree?.revisions ?? {});
            if (allHashes.includes(selectedSignatureId)) {
                sigData = e;
                break;
            }
        }


        if (sigData == undefined) {
            throw Error(`signature api data not found `)
        }

        // let genHa
        const signatureAquaTreeWrapper: AquaTreeWrapper = {
            aquaTree: sigData.aquaTree!,
            revision: "",
            fileObject: getAquaTreeFileObject(sigData)
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
    const saveRevisionsToServer = async (aquaTrees: AquaTree[]) => {

        // console.log(`aquaTrees ${aquaTrees.length}`)
        for (let index = 0; index < aquaTrees.length; index++) {
            const aquaTree = aquaTrees[index];

            // console.log(`aquaTrees ${index}  ${JSON.stringify(aquaTree, null, 4)}`)
            try {
                const revisionHashes = Object.keys(aquaTree.revisions);
                const lastHash = revisionHashes[revisionHashes.length - 1];
                const lastRevision = aquaTree.revisions[lastHash];

                const url = `${backend_url}/tree`;
                const actualUrlToFetch = ensureDomainUrlHasSSL(url);

                const response = await axios.post(actualUrlToFetch, {
                    revision: lastRevision,
                    revisionHash: lastHash,
                    orginAddress: session?.address
                }, {
                    headers: {
                        nonce: session?.nonce
                    }
                });

                if (response.status === 200 || response.status === 201) {
                    // console.log(`💯 Revision ${index + 1} saved successfully to the API`);

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


    const submitSignatureData = async (signaturePosition: SignatureData[]) => {
       

        setSubmittingSignatureData(true);

        try {
            const aquafier = new Aquafier();

            // Step 1: Create signature form data
            const signForm = createSignatureFormData(signaturePosition);


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


    // Handle file upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                setPdfFile(file);

                // Create object URL for display
                const fileUrl = URL.createObjectURL(file);
                setPdfUrl(fileUrl);

                // Load PDF document using pdf-lib
                const arrayBuffer = await file.arrayBuffer();
                const pdfDoc = await PDFDocument.load(arrayBuffer);
                setPdfDoc(pdfDoc);
                // setNumPages(pdfDoc.getPageCount());
                // setCurrentPage(1);

                toaster.create({
                    title: "PDF loaded successfully",
                    type: "success",
                    duration: 3000,
                });
            } catch (error) {
                console.error("Error loading PDF:", error);
                toaster.create({
                    title: "Error loading PDF",
                    description: "Please try another file",
                    type: "error",
                    duration: 3000,
                });
            }
        }
    };

    // Clear signature canvas
    const clearSignature = () => {
        if (signatureRef.current) {
            signatureRef.current.clear();
            // Don't clear all signatures, just reset the canvas
        }
    };

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

    const createWorkflowFromTemplate = async (): Promise<Boolean> => {

        const selectedTemplate = formTemplates.find((e) => e.name == "user_signature")

        if (!selectedTemplate) {
            toaster.create({
                description: `User Signature template not found`,
                type: "error"
            })
            return false
        }


        if (systemFileInfo.length == 0) {
            toaster.create({
                description: `Aqua tree for templates not found`,
                type: "error"
            })
            return false
        }

        if (!signatureRef.current) {
            toaster.create({
                description: `Signature image not found`,
                type: "error"
            })
            return false
        }

        if (session?.address == undefined) {
            toaster.create({
                description: `Wallet address not found`,
                type: "error"
            })
            return false
        }


        let templateApiFileInfo = systemFileInfo.find((e) => {
            let nameExtract = getAquaTreeFileName(e!.aquaTree!);
            let selectedName = `${selectedTemplate?.name}.json`
            console.log(`nameExtract ${nameExtract} == selectedName ${selectedName}`)
            return nameExtract == selectedName
        })
        if (!templateApiFileInfo) {
            toaster.create({
                description: `Aqua tree for ${selectedTemplate?.name} not found`,
                type: "error"
            })
            return false
        }

        const dataUrl = signatureRef.current.toDataURL('image/png');


        const epochInSeconds = Math.floor(Date.now() / 1000);
        const lastFiveCharactersOfWalletAddres = session?.address.slice(-5);
        const signatureFileName = `user_signature_${lastFiveCharactersOfWalletAddres}_${epochInSeconds}.png`
        const signatureFile = dataURLToFile(dataUrl, signatureFileName);



        setSignaturePositions([])


        let formData = {
            'name': signerName,
            'wallet_address': session!.address,
            'image': signatureFile
        }
        let aquafier = new Aquafier();
        const filteredData: Record<string, string | number> = {};

        Object.entries(formData).forEach(([key, value]) => {
            // Only include values that are not File objects
            if (!(value instanceof File)) {
                filteredData[key] = value;
            }
        });


        let estimateize = estimateFileSize(JSON.stringify(formData));



        const jsonString = JSON.stringify(formData, null, 4);

        const randomNumber = getRandomNumber(100, 1000);
        let lastSixChar = session?.address.substring(session?.address.length - 6)
        const fileObject: FileObject = {
            fileContent: jsonString,
            fileName: `${selectedTemplate?.name ?? "template"}-${lastSixChar}-${randomNumber}.json`,
            path: './',
            fileSize: estimateize
        }
        let genesisAquaTree = await aquafier.createGenesisRevision(fileObject, true, false, false)

        if (genesisAquaTree.isOk()) {

            // create a link revision with the systems aqua tree 
            let mainAquaTreeWrapper: AquaTreeWrapper = {
                aquaTree: genesisAquaTree.data.aquaTree!!,
                revision: "",
                fileObject: fileObject
            }
            let linkedAquaTreeFileObj = getAquaTreeFileObject(templateApiFileInfo);

            if (!linkedAquaTreeFileObj) {
                toaster.create({
                    description: `system Aqua tee has error`,
                    type: "error"
                })
                return false
            }
            let linkedToAquaTreeWrapper: AquaTreeWrapper = {
                aquaTree: templateApiFileInfo.aquaTree!!,
                revision: "",
                fileObject: linkedAquaTreeFileObj
            }
            let linkedAquaTreeResponse = await aquafier.linkAquaTree(mainAquaTreeWrapper, linkedToAquaTreeWrapper)

            if (linkedAquaTreeResponse.isErr()) {
                toaster.create({
                    description: `Error linking aqua tree`,
                    type: "error"
                })
                return false
            }

            let aquaTreeData = linkedAquaTreeResponse.data.aquaTree!!

            let containsFileData = selectedTemplate?.fields.filter((e) => e.type == "file" || e.type == "image")
            if (containsFileData && containsFileData.length > 0) {

                // for (let index = 0; index < containsFileData.length; index++) {
                //     const element = containsFileData[index];
                //     const file: File = formData[element['name']] as File

                // Create an array to store all file processing promises
                const fileProcessingPromises = containsFileData.map(async (element) => {
                    const file: File = formData['image'];

                    // Check if file exists
                    if (!file) {
                        console.warn(`No file found for field: ${element.name}`);
                        return null;
                    }

                    try {
                        // Convert File to Uint8Array
                        const arrayBuffer = await file.arrayBuffer();
                        const uint8Array = new Uint8Array(arrayBuffer);

                        // Create the FileObject with properties from the File object
                        const fileObjectPar: FileObject = {
                            fileContent: uint8Array,
                            fileName: file.name,
                            path: "./",
                            fileSize: file.size
                        };

                        return fileObjectPar;
                        // After this you can use fileObjectPar with aquafier.createGenesisRevision() or other operations
                    } catch (error) {
                        console.error(`Error processing file ${file.name}:`, error);
                        return null;
                    }
                });

                // Wait for all file processing to complete
                try {
                    const fileObjects = await Promise.all(fileProcessingPromises);
                    // Filter out null results (from errors)
                    const validFileObjects = fileObjects.filter(obj => obj !== null) as FileObject[];

                    // Now you can use validFileObjects
                    console.log(`Processed ${validFileObjects.length} files successfully`);

                    // Example usage with each file object:
                    for (let item of validFileObjects) {
                        let aquaTreeResponse = await aquafier.createGenesisRevision(item)

                        if (aquaTreeResponse.isErr()) {
                            console.error("Error linking aqua tree:", aquaTreeResponse.data.toString());

                            toaster.create({
                                title: 'Error  linking aqua',
                                description: 'Error  linking aqua',
                                type: 'error',
                                duration: 5000,
                            });
                            return false
                        }
                        // upload the single aqua tree 
                        let resApi = await saveAquaTree(aquaTreeResponse.data.aquaTree!!, item, false, true, selectedTemplate.id)
                        if (resApi == false) {
                            toaster.create({
                                title: "An Error  occured saving signature",
                                type: "error",
                                duration: 3000,
                            });
                            return false
                        }
                        // linke it to main aqua tree
                        const aquaTreeWrapper: AquaTreeWrapper = {
                            aquaTree: aquaTreeData,
                            revision: "",
                            fileObject: fileObject
                        }

                        const aquaTreeWrapper2: AquaTreeWrapper = {
                            aquaTree: aquaTreeResponse.data.aquaTree!!,
                            revision: "",
                            fileObject: item
                        }

                        let res = await aquafier.linkAquaTree(aquaTreeWrapper, aquaTreeWrapper2)
                        if (res.isErr()) {
                            console.error("Error linking aqua tree:", aquaTreeResponse.data.toString());

                            toaster.create({
                                title: 'Error  linking aqua',
                                description: 'Error  linking aqua',
                                type: 'error',
                                duration: 5000,
                            });
                            return false
                        }
                        aquaTreeData = res.data.aquaTree!!

                    }

                } catch (error) {
                    console.error("Error processing files:", error);

                    toaster.create({
                        title: 'Error proceessing files',
                        description: 'Error proceessing files',
                        type: 'error',
                        duration: 5000,
                    });
                    return false
                }

            }
            const aquaTreeWrapper: AquaTreeWrapper = {
                aquaTree: aquaTreeData,
                revision: "",
                fileObject: fileObject
            }

            // sign the aqua chain
            let signRes = await aquafier.signAquaTree(aquaTreeWrapper, "metamask", dummyCredential())

            if (signRes.isErr()) {
                toaster.create({
                    description: `Error signing failed`,
                    type: "error"
                })
                return false
            } else {
                console.log("signRes.data", signRes.data)
                fileObject.fileContent = formData
                const resApi = await saveAquaTree(signRes.data.aquaTree!!, fileObject, true, true, selectedTemplate.id)

                if (resApi == false) {
                    toaster.create({
                        title: "An Error  occured saving signature",
                        type: "error",
                        duration: 3000,
                    });
                    return false
                }

                let genHash = getGenesisHash(signRes.data.aquaTree!!)
                if (genHash == null || genHash == undefined) {
                    toaster.create({
                        title: 'Error  Aqua tree - Genesis hash not found',
                        description: 'Error - Genesis hash not found',
                        type: 'error',
                        duration: 5000,
                    });
                }


                setSignerName("")
                return true
            }

        } else {

            toaster.create({
                title: 'Error creating Aqua tree from template',
                description: 'Error creating Aqua tree from template',
                type: 'error',
                duration: 5000,
            });

            return false
        }
    }

    // Save signature from canvas
    const saveSignature = async () => {
        setCreatingUserSignature(true);
        if (signatureRef.current && !signatureRef.current.isEmpty()) {

            if (signaturePositions.length > 0) {
                const userConfirmed = confirm("Your document will lose all the signatures appended. Do you want to continue?");
                if (!userConfirmed) {
                    setSignerName("")
                    setIsOpen(false);

                    // Clear the canvas for next signature
                    if (signatureRef.current) {
                        signatureRef.current.clear();
                    }

                    return; // Exit if user clicks "Cancel" (No)
                }
            }

            let resp = await createWorkflowFromTemplate()
            if (resp) {
                await loadUserSignatures(true)

                setIsOpen(false);
                setCreatingUserSignature(false);

                // Clear the canvas for next signature
                if (signatureRef.current) {
                    signatureRef.current.clear();
                }


                toaster.create({
                    title: "Signature saved",
                    description: "You can now place it on the document",
                    type: "success",
                    duration: 3000,
                });



                // If user is in placing mode, allow them to place the signature
                if (!placingSignature) {
                    setPlacingSignature(true);
                    toaster.create({
                        title: "Click on the PDF to place your signature",
                        type: "info",
                        duration: 3000,
                    });
                }
            }
        } else {
            setCreatingUserSignature(false);

            toaster.create({
                title: "Please draw a signature first",
                type: "warning",
                duration: 3000,
            });
        }
    };

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

    // Handle click on PDF to place signature
    const handlePdfClick = async (e: React.MouseEvent<HTMLDivElement>) => {
        if (!placingSignature || !pdfMainContainerRef.current || !selectedSignatureId) return;

        // const selectedSignature = mySignaturesAquaTree.find(sig => getGenesisHash(sig.aquaTree!!) === selectedSignatureId);
        // if (!selectedSignature) return;

        // Get the PDF container dimensions
        const rect = pdfMainContainerRef.current.getBoundingClientRect();

        // Find the actual PDF element within the container
        const pdfElement = pdfMainContainerRef.current.querySelector('.react-pdf__Page');
        const pdfRect = pdfElement ? pdfElement.getBoundingClientRect() : rect;

        // Calculate position relative to the PDF element, not the container
        const x = e.clientX - pdfRect.left;
        const y = e.clientY - pdfRect.top;

        // Calculate relative position (0-1) for PDF coordinates
        const relativeX = x / pdfRect.width;
        const relativeY = 1 - (y / pdfRect.height); // Invert Y for PDF coordinates

        // Calculate width and height relative to PDF
        const relativeWidth = signatureSize / pdfRect.width;
        const relativeHeight = (signatureSize / 2) / pdfRect.height;


        // console.log("Selected signature aqua tree is: ", selectedSignatureAquaTree)

        let selectedSignatureAquaTree = mySignaturesAquaTree.find((item) => getGenesisHash(item.aquaTree!!) == selectedSignatureId)

        if (!selectedSignatureAquaTree) {

            toaster.create({
                title: "Selected siignature not found",
                type: "error",
                duration: 3000,
            });
            return
        }
        let genesisHash = getGenesisHash(selectedSignatureAquaTree?.aquaTree!!)
        let genesisFilename = selectedSignatureAquaTree?.aquaTree?.file_index[genesisHash!!]
        let fileobject = selectedSignatureAquaTree?.fileObject.find(file => file.fileName === genesisFilename!!)

        if (!fileobject) {
            console.error("File object not found for signature:", selectedSignatureId);
            throw Error("File object not found for signature: " + selectedSignatureId);
        }

        let mySignatureDataItem = mySignatureData.find((e) => e.hash == genesisHash)
        if (!selectedSignatureAquaTree) {

            toaster.create({
                title: "Selected siignature data not found",
                type: "error",
                duration: 3000,
            });
            return
        }
        const newPosition: SignatureData = {
            id: crypto.randomUUID(),
            page: currentPage - 1,
            x: relativeX,
            y: relativeY,
            width: relativeWidth,
            height: relativeHeight,
            signatureId: selectedSignatureId,
            hash: genesisHash!!,
            name: selectedSignatureAquaTree?.aquaTree?.revisions[genesisHash!!]?.forms_name,
            walletAddress: selectedSignatureAquaTree?.aquaTree?.revisions[genesisHash!!]?.forms_wallet_address,
            dataUrl: mySignatureDataItem!.dataUrl,
            createdAt: timeStampToDateObject(selectedFileInfo?.aquaTree?.revisions[genesisHash!!]?.local_timestamp!!) ?? new Date()
        };

        setSignaturePositions(prev => [...prev, newPosition]);
        setPlacingSignature(false);

        toaster.create({
            title: "Signature placed",
            description: "You can drag the signature to adjust its position",
            type: "success",
            duration: 3000,
        });
    };


    // Handle signature dragging
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useBoolean(false);

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent, id: string) => {
        e.stopPropagation();
        setActiveDragId(id);
        setIsDragging.on();
    };

    // Helper function to get position from either mouse or touch event
    const getEventPosition = (e: MouseEvent | TouchEvent) => {
        // Touch event
        if ('touches' in e && e.touches.length > 0) {
            return {
                clientX: e.touches[0].clientX,
                clientY: e.touches[0].clientY
            };
        }
        // Mouse event
        return {
            clientX: (e as MouseEvent).clientX,
            clientY: (e as MouseEvent).clientY
        };
    };

    const handleDragMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging || !activeDragId || !pdfMainContainerRef.current) return;

        e.preventDefault();

        // Get the PDF container dimensions
        const rect = pdfMainContainerRef.current.getBoundingClientRect();

        // Find the actual PDF element within the container
        const pdfElement = pdfMainContainerRef.current.querySelector('.react-pdf__Page');
        const pdfRect = pdfElement ? pdfElement.getBoundingClientRect() : rect;

        // Get position from either mouse or touch event
        const { clientX, clientY } = getEventPosition(e);

        // Calculate position relative to the PDF element, not the container
        const x = clientX - pdfRect.left;
        const y = clientY - pdfRect.top;

        // Calculate relative position (0-1) for PDF coordinates
        const relativeX = x / pdfRect.width;
        const relativeY = 1 - (y / pdfRect.height); // Invert Y for PDF coordinates

        setSignaturePositions(prev => prev.map(pos => {
            if (pos.id === activeDragId) {
                return {
                    ...pos,
                    x: relativeX,
                    y: relativeY,
                    isDragging: true
                };
            }
            return pos;
        }));
    };

    const handleDragEnd = () => {
        if (!isDragging) return;

        setSignaturePositions(prev => prev.map(pos => ({
            ...pos,
            isDragging: false
        })));

        setActiveDragId(null);
        setIsDragging.off();

        toaster.create({
            title: "Signature position updated",
            type: "success",
            duration: 2000,
        });
    };


    // Component for signature display on PDF
    const handlePageChange = (pageNumber: number, _totalPages: number) => {
        setCurrentPage(pageNumber);
    };

    const loadUserSignatures = async (selectSignature: boolean = false) => {

        if (backend_url == "http://0.0.0.0:0" || backend_url == "https://0.0.0.0:0") {

            console.log(`load signature is aborted  as url is ${backend_url} `)
            return
        }
        if (session?.address == undefined || session?.address == "") {

            console.log(`load signature is aborted  as session is ${session?.address} `)
            return
        }

        // proceed as url and session is set
        let url = `${backend_url}/tree/user_signatures`
        try {
            let response = await axios.get(url, {
                headers: {
                    "nonce": session?.nonce
                }
            })

            const userSignaturesApiInfo: Array<ApiFileInfo> = response.data.data
            // Make the logic here work with the current Signature Interface


            setMySignaturesAquaTree(userSignaturesApiInfo)

            let apiSigntures: SignatureData[] = []
            // first revision should be a form
            // second revision is a link to signature aqua tree template
            // third revision should  be link to sinature image
            // fourth revision is a signature
            for (let userSignature of userSignaturesApiInfo) {

                // all hashes 
                let allHashes = Object.keys(userSignature.aquaTree!.revisions!);

                let firstRevision = userSignature.aquaTree?.revisions[allHashes[0]]
                if (!firstRevision) {
                    console.log(`📢📢 first revision does not exist, this should be investigated`)
                    continue
                }
                if (!firstRevision.forms_wallet_address) {
                    console.log(`📢📢 first revision does not contain wallet address, this should be investigated`)
                    continue
                }
                if (!firstRevision.forms_name) {
                    console.log(`📢📢 first revision does not contain signature name, this should be investigated`)
                    continue
                }
                let sinatureAquaTreeName = userSignature.aquaTree?.file_index[allHashes[0]]
                if (!sinatureAquaTreeName) {
                    console.log(`📢📢 aqua tree sintaure instance unique na`)
                    continue
                }
                let thirdRevision = userSignature.aquaTree?.revisions[allHashes[2]]
                if (!thirdRevision) {
                    console.log(`📢📢 third revision does not exist, this should be investigated`)
                    continue
                }
                if (!thirdRevision.link_verification_hashes) {
                    console.log(`📢📢 third revision link_verification_hashes is undefined, this should be investigated`)
                    continue
                }
                let signatureHash = thirdRevision.link_verification_hashes[0]
                let signatureImageName = userSignature.aquaTree?.file_index[signatureHash]
                if (!signatureImageName) {
                    console.log(`📢📢 signature Image Name not found in index, this should be investigated`)

                    continue
                }

                let signatureImageObject = userSignature.fileObject.find((e) => e.fileName == signatureImageName)
                if (!signatureImageObject) {
                    console.log(`📢📢 file object does not contain the signature image object, this should be investigated`)

                    continue
                }


                let forthRevision = userSignature.aquaTree?.revisions[allHashes[3]]
                if (!thirdRevision) {
                    console.log(`📢📢 forth revision does not exist, this should be investigated`)
                    continue
                }

                if (forthRevision?.signature_wallet_address != session.address) {
                    console.log(` 🤫🤫 skip signature as its not mine`)
                    continue
                }
                console.log(`&&& signatureImageName ${signatureImageName} Data ${JSON.stringify(signatureImageObject, null, 4)}`)

                let fileContentUrl = signatureImageObject.fileContent

                if (typeof fileContentUrl === 'string' && fileContentUrl.startsWith('http')) {



                    let dataUrl = await fetchImage(fileContentUrl);

                    if (!dataUrl) {
                        dataUrl = '/images/placeholder-img.png';
                    }

                    // Add to signature
                    let sign: SignatureData = {
                        id: crypto.randomUUID(),
                        hash: getGenesisHash(userSignature.aquaTree!) ?? "err",
                        name: firstRevision.forms_name,
                        walletAddress: firstRevision.forms_wallet_address,
                        dataUrl: dataUrl,
                        createdAt: timeStampToDateObject(firstRevision.local_timestamp) ?? new Date(),
                        page: 0, // Default to 0, will be updated when placed
                        x: 0, // Default to 0, will be updated when placeholder
                        y: 0, // Default to 0, will be updated when placeholder
                        width: 0, // Default width, will be updated when placed
                        height: 0, // Default height, will be updated when placed
                        isDragging: false, // Default to false, will be updated when dragging
                        signatureId: signatureHash, // Use the signature hash as the ID
                    };
                    apiSigntures.push(sign)
                }
            }


            console.log(`Signatures length ${apiSigntures.length} now update state`)


            // Update mySignatureData with the fetched signatures
            setMySignatureData(apiSigntures)


            if (selectSignature) {
                if (apiSigntures.length > 0) {
                    let latestSignature = getLatestApiFileInfObject(userSignaturesApiInfo);
                    if (latestSignature) {
                        let genHash = getGenesisHash(latestSignature.aquaTree!!);
                        console.log(`selectSignature genHash ${genHash} now update state`)
                        setSelectedSignatureId(genHash);
                    }
                }
            }



        } catch (e) {
            console.log(`loadUserSignatures Error ${e}`)
        }
    }


    const signatureSideBar = () => {


        if (signers.length == 0) {
            return <Text>Signers for  document workflow not found</Text>
        }


        if (!signers.includes(session!.address)) {
            return <Group>
                <Text>Signers</Text>
                <List.Root>
                    {
                        signers.map((e) => {
                            return <List.Item>{e}</List.Item>
                        })
                    }

                </List.Root>
            </Group>
        }


        if (allSignersBeforeMe.length > 0) {
            return <Stack
                gap={4}
                align="stretch"
                p={4}
                border="1px solid"
                borderColor={colorMode === "dark" ? "gray.800" : "gray.100"}
                borderRadius="md"
            >
                <Text fontSize={'md'} >The following wallet address need to sign before you can. </Text>

                <List.Root as="ol" listStyle="decimal">
                    {
                        allSignersBeforeMe.map((e) => {
                            return <List.Item>{e}</List.Item>
                        })
                    }
                </List.Root>



            </Stack>
        }



        return <GridItem colSpan={{ base: 12, md: 1 }} h={{ base: "fit-content", md: "100%" }} overflow={{ base: "hidden", md: "auto" }}>
            {/* Signature tools */}
            {userSignatureDetails()}
        </GridItem>

    }

    const userSignatureDetails = () => {

        return <Stack
            gap={4}
            align="stretch"
            p={4}
            border="1px solid"
            borderColor={colorMode === "dark" ? "gray.800" : "gray.100"}
            borderRadius="md"
        >
            <Button
                colorScheme="blue"
                onClick={() => setIsOpen(true)}
            >
                <FaPlus />
                Create Signature
            </Button>

            {/* Signature List */}
            {mySignaturesAquaTree.length > 0 && (
                <>
                    <Stack>
                        <Text fontWeight="bold" mt={2}>Your Signatures:</Text>
                        <Box maxH="200px" overflowY="auto" border="1px solid" borderColor="gray.200" borderRadius="md">
                            <Stack gap={0}>
                                {(() => {
                                    // const signature = signatures.find((signature) => signature.walletAddress === session?.address);
                                    const signature = mySignatureData.find(sig => sig.hash === selectedSignatureId || sig.id === selectedSignatureId);
                                    if (!signature) {
                                        return <div style={{ whiteSpace: "pre-wrap" }}>Signature not found  </div>
                                    }

                                    return signature ? (
                                        <Box
                                            key={signature.hash}
                                            p={2}
                                            cursor="pointer"
                                            // bg={selectedSignatureId === signature.id ? "blue.50" : "transparent"}
                                            bg={"blue.50"}
                                            _hover={{ bg: "gray.50" }}
                                            onClick={() => {
                                                console.log(`Signature clicked ${JSON.stringify(signature, null, 4)} -- ${signature.hash} -- ${signature.id}`)

                                            }}
                                        >
                                            <HStack>

                                                <Box
                                                    width="60px"
                                                    height="40px"
                                                    backgroundImage={`url(${signature.dataUrl})`}
                                                    backgroundSize="contain"
                                                    backgroundRepeat="no-repeat"
                                                    backgroundPosition="center"
                                                    border="1px solid"
                                                    borderColor="gray.200"
                                                    borderRadius="sm"
                                                />
                                                <Stack gap={0}>
                                                    <Text fontSize="sm" fontWeight="medium">{signature.name}</Text>
                                                    <Text fontSize="xs" color="gray.600">
                                                        {signature.walletAddress.length > 10
                                                            ? `${signature.walletAddress.substring(0, 6)}...${signature.walletAddress.substring(signature.walletAddress.length - 4)}`
                                                            : signature.walletAddress
                                                        }
                                                    </Text>
                                                </Stack>
                                            </HStack>
                                        </Box>
                                    ) : null;
                                })()}
                            </Stack>
                        </Box>
                    </Stack>
                    <Stack>
                        <Text fontWeight="bold" mt={2}>Other Signatures:</Text>
                        <Box maxH="200px" overflowY="auto" border="1px solid" borderColor="gray.200" borderRadius="md">
                            <Stack gap={0}>
                                {signaturesInDocument
                                    // .filter((signature) => signature.walletAddress !== session?.address)
                                    // .filter((signature, index, self) =>
                                    //     index === self.findIndex(s => s.walletAddress === signature.walletAddress)
                                    // )
                                    .map((signature) => (
                                        <Box
                                            key={signature.id}
                                            p={2}
                                            cursor="pointer"
                                            bg={selectedSignatureId === signature.id ? "blue.50" : "transparent"}
                                            _hover={{ bg: "gray.50" }}
                                            onClick={() => {
                                                if (session?.address === signature.walletAddress) {
                                                    setSelectedSignatureId(signature.id);
                                                }
                                            }}
                                        >
                                            <HStack>
                                                <Box
                                                    width="60px"
                                                    height="40px"
                                                    backgroundImage={`url(${signature.dataUrl})`}
                                                    backgroundSize="contain"
                                                    backgroundRepeat="no-repeat"
                                                    backgroundPosition="center"
                                                    border="1px solid"
                                                    borderColor="gray.200"
                                                    borderRadius="sm"
                                                />
                                                <Stack gap={0}>
                                                    <Text fontSize="sm" fontWeight="medium">{signature.name}</Text>
                                                    <Text fontSize="xs" color="gray.600">
                                                        {signature.walletAddress.length > 10
                                                            ? `${signature.walletAddress.substring(0, 6)}...${signature.walletAddress.substring(signature.walletAddress.length - 4)}`
                                                            : signature.walletAddress
                                                        }
                                                    </Text>
                                                </Stack>
                                            </HStack>
                                        </Box>
                                    ))}
                            </Stack>
                        </Box>
                    </Stack>
                </>
            )}

            {selectedSignatureId && (
                <>
                    <Text fontWeight="bold" mt={2}>Selected Signature: </Text>
                    {(() => {
                        const selectedSignature = mySignatureData.find(sig => sig.hash.trim() === selectedSignatureId.trim());
                        if (!selectedSignature) return <>Error</>;

                        return (
                            <Box
                                border="1px solid"
                                borderColor="gray.200"
                                p={2}
                                borderRadius="md"
                                height="80px"
                                backgroundImage={`url(${selectedSignature.dataUrl})`}
                                backgroundSize="contain"
                                backgroundRepeat="no-repeat"
                                backgroundPosition="center"
                            />
                        );
                    })()}

                    <Field display={"none"}>
                        <FieldLabel>Signature Size: {signatureSize}px</FieldLabel>
                        <Slider.Root
                            min={280}
                            max={450}
                            step={1}
                            defaultValue={[signatureSize]}
                            size={'lg'} key={'lg'}
                            width={"250px"}
                            value={[signatureSize]}
                            onValueChange={(changedValue) => {
                                console.log(`slider value ${JSON.stringify(changedValue)}`)
                                const newValue = changedValue.value[0]
                                console.log(`slider value ${newValue}`)

                                setSignatureSize(newValue);
                                // if (Array.isArray(changedValue)) {
                                // setSignatureSize(changedValue.value[0]);
                                // }
                            }}
                        >
                            <Slider.Control>
                                <Slider.Track>
                                    <Slider.Range />
                                </Slider.Track>
                                <Slider.Thumb index={0} />
                            </Slider.Control>
                        </Slider.Root>
                    </Field>



                    <Button
                        colorScheme="teal"
                        onClick={() => setPlacingSignature(true)}
                    >
                        Place Signature on Document
                    </Button>

                    {/* Signatures placed on document */}
                    {signaturePositions.length > 0 && (
                        <>
                            <Text fontWeight="bold" mt={2}>Signatures on Document:</Text>
                            <Box maxH="150px" overflowY="auto" border="1px solid" borderColor="gray.200" borderRadius="md">
                                <Stack gap={0}>
                                    {signaturePositions.map((position) => {
                                        // const signature = signaturesInDocument.find(sig => sig.id === position.signatureId);
                                        // if (!signature) return null;

                                        return (
                                            <HStack key={position.id} p={2} justify="space-between">
                                                <HStack>
                                                    <Box
                                                        width="40px"
                                                        height="30px"
                                                        backgroundImage={`url(${position.dataUrl})`}
                                                        backgroundSize="contain"
                                                        backgroundRepeat="no-repeat"
                                                        backgroundPosition="center"
                                                        border="1px solid"
                                                        borderColor="gray.200"
                                                        borderRadius="sm"
                                                    />
                                                    <Text fontSize="xs">{position.name} (Page {position.page + 1})</Text>

                                                    <IconButton variant={'outline'} size={'2xs'} onClick={(e) => {
                                                        e.preventDefault();

                                                        console.log(`B4 Delete ${JSON.stringify(signaturePositions, null, 4)}`)
                                                        let newData: SignatureData[] = [];
                                                        for (let item of signaturePositions) {
                                                            console.log(`item id ${item.id} -- ${position.id}`)
                                                            if (item.id != position.id) {
                                                                newData.push(item)
                                                            }
                                                        }

                                                        console.log(`After Delete ${JSON.stringify(newData, null, 4)}`)
                                                        setSignaturePositions(newData)
                                                    }}>
                                                        <LuTrash size={'10px'} color='red' />
                                                    </IconButton>
                                                </HStack>
                                            </HStack>
                                        );
                                    })}
                                </Stack>
                            </Box>
                        </>
                    )}

                    {signaturePositions.length > 0 && (
                        <Text fontSize="sm" color="gray.600">
                            Tip: You can drag placed signatures to adjust their position
                        </Text>
                    )}

                    {placingSignature && (
                        <Text color="blue.500">
                            Click on the document to place your signature
                        </Text>
                    )}
                </>
            )}

            {/* <Button
            colorScheme="green"
            // disabled={!pdfDoc || !signatureDataUrl || signaturePositions.length === 0}
            onClick={generateSignedPdf}
        >
            <FaDownload />
            Download Signed PDF
        </Button> */}

            <Button
                colorPalette={'green'} variant={'solid'}
                colorScheme="white"
                disabled={submittingSignatureData}
                // disabled={!pdfDoc || !signatureDataUrl || signaturePositions.length === 0}
                onClick={async (e) => {
                    e.preventDefault()
                    if (signaturePositions.length == 0) {

                        toaster.create({
                            description: `No signature detected in document`,
                            type: "error"
                        })
                        return
                    }
                    await submitSignatureData(signaturePositions)
                }}
            >
                Sign document
            </Button>
        </Stack>
    }

    // const _handleCreateSignatureData = async () => {

    //     const apiSigntures: SignatureData[] = [];
    //     for (let i = 0; i < mySignaturesAquaTree.length; i++) {


    //         let userSignature = mySignaturesAquaTree[i]
    //         // all hashes 
    //         let allHashes = Object.keys(userSignature.aquaTree!.revisions!);

    //         let firstRevision = userSignature.aquaTree?.revisions[allHashes[0]]
    //         if (!firstRevision) {
    //             console.log(`📢📢 first revision does not exist, this should be investigated`)
    //             continue
    //         }
    //         if (!firstRevision.forms_wallet_address) {
    //             console.log(`📢📢 first revision does not contain wallet address, this should be investigated`)
    //             continue
    //         }
    //         if (!firstRevision.forms_name) {
    //             console.log(`📢📢 first revision does not contain signature name, this should be investigated`)
    //             continue
    //         }
    //         let sinatureAquaTreeName = userSignature.aquaTree?.file_index[allHashes[0]]
    //         if (!sinatureAquaTreeName) {
    //             console.log(`📢📢 aqua tree sintaure instance unique na`)
    //             continue
    //         }
    //         let thirdRevision = userSignature.aquaTree?.revisions[allHashes[2]]
    //         if (!thirdRevision) {
    //             console.log(`📢📢 third revision does not exist, this should be investigated`)
    //             continue
    //         }
    //         if (!thirdRevision.link_verification_hashes) {
    //             console.log(`📢📢 third revision link_verification_hashes is undefined, this should be investigated`)
    //             continue
    //         }
    //         let signatureHash = thirdRevision.link_verification_hashes[0]
    //         let signatureImageName = userSignature.aquaTree?.file_index[signatureHash]
    //         if (!signatureImageName) {
    //             console.log(`📢📢 signature Image Name not found in index, this should be investigated`)

    //             continue
    //         }

    //         let signatureImageObject = userSignature.fileObject.find((e) => e.fileName == signatureImageName)
    //         if (!signatureImageObject) {
    //             console.log(`📢📢 file object does not contain the signature image object, this should be investigated`)

    //             continue
    //         }


    //         let forthRevision = userSignature.aquaTree?.revisions[allHashes[3]]
    //         if (!thirdRevision) {
    //             console.log(`📢📢 forth revision does not exist, this should be investigated`)
    //             continue
    //         }

    //         if (forthRevision?.signature_wallet_address != session?.address) {
    //             console.log(` 🤫🤫 skip signature as its not mine`)
    //             continue
    //         }
    //         console.log(`&&& signatureImageName ${signatureImageName} Data ${JSON.stringify(signatureImageObject, null, 4)}`)

    //         let fileContentUrl = signatureImageObject.fileContent

    //         if (typeof fileContentUrl === 'string' && fileContentUrl.startsWith('http')) {



    //             let dataUrl = await fetchImage(fileContentUrl);

    //             if (!dataUrl) {
    //                 dataUrl = '/images/placeholder-img.png';
    //             }

    //             // Add to signature
    //             let sign: SignatureData = {
    //                 id: crypto.randomUUID(),
    //                 hash: getGenesisHash(userSignature.aquaTree!) ?? "err",
    //                 name: firstRevision.forms_name,
    //                 walletAddress: firstRevision.forms_wallet_address,
    //                 dataUrl: dataUrl,
    //                 createdAt: timeStampToDateObject(firstRevision.local_timestamp) ?? new Date(),
    //                 page: 0, // Default to 0, will be updated when placed
    //                 x: 0, // Default to 0, will be updated when placeholder
    //                 y: 0, // Default to 0, will be updated when placeholder
    //                 width: 0, // Default width, will be updated when placed
    //                 height: 0, // Default height, will be updated when placed
    //                 isDragging: false, // Default to false, will be updated when dragging
    //                 signatureId: signatureHash, // Use the signature hash as the ID
    //             };
    //             apiSigntures.push(sign)
    //         }

    //     }

    //     setMySignatureData(apiSigntures)

    //     let selectedSignatureAquaTree = null

    //     if (mySignaturesAquaTree.length > 1) {
    //         // Loop through aquatrees
    //         for (let i = 0; i < mySignaturesAquaTree.length; i++) {
    //             let apiFileInfo = mySignaturesAquaTree[i]
    //             let disOrderedAquaTree = apiFileInfo.aquaTree
    //             let genesisHash = getGenesisHash(disOrderedAquaTree!!)
    //             let genesisRevision = disOrderedAquaTree?.revisions[genesisHash!!]

    //             if (!selectedSignatureAquaTree) {
    //                 selectedSignatureAquaTree = apiFileInfo
    //             }
    //             else {
    //                 let aquaTreeTimestamp = selectedSignatureAquaTree?.aquaTree?.revisions[getGenesisHash(selectedSignatureAquaTree?.aquaTree!!)!!]?.timestamp!!
    //                 if (genesisRevision?.local_timestamp!! > aquaTreeTimestamp) {
    //                     selectedSignatureAquaTree = apiFileInfo
    //                 }
    //             }
    //         }
    //         // Get genesis revision
    //         // Read timestamp
    //         // check if it is the latest one
    //         // Assign it to selected signature aquatree
    //     }
    //     else {
    //         selectedSignatureAquaTree = mySignaturesAquaTree[0]
    //     }

    //     console.log("Selected signature aqua tree is: ", selectedSignatureAquaTree)

    //     let genesisHash = getGenesisHash(selectedSignatureAquaTree?.aquaTree!!)

    //     setSelectedSignatureId(genesisHash!!)

    // }

    // Add event listeners for drag operations
    useEffect(() => {
        if (isDragging) {
            // Mouse events
            document.addEventListener('mousemove', handleDragMove as any);
            document.addEventListener('mouseup', handleDragEnd);

            // Touch events for mobile
            document.addEventListener('touchmove', handleDragMove as any, { passive: false });
            document.addEventListener('touchend', handleDragEnd);
            document.addEventListener('touchcancel', handleDragEnd);
        }

        return () => {
            // Clean up all event listeners
            document.removeEventListener('mousemove', handleDragMove as any);
            document.removeEventListener('mouseup', handleDragEnd);
            document.removeEventListener('touchmove', handleDragMove as any);
            document.removeEventListener('touchend', handleDragEnd);
            document.removeEventListener('touchcancel', handleDragEnd);
        };
    }, [isDragging, activeDragId]);

    // Effect to update signature positions when window is resized
    useEffect(() => {

        loadUserSignatures(true)



        let signers: string[] = [];
        let allHashes = Object.keys(selectedFileInfo!.aquaTree!.revisions!);
        let firstRevision = selectedFileInfo!.aquaTree?.revisions[allHashes[0]]

        if (firstRevision?.forms_signers) {
            if (firstRevision.forms_signers.includes(",")) {
                signers = firstRevision.forms_signers.split(",").map((e: string) => e.trim())
            } else {
                signers.push(firstRevision?.forms_signers)
            }
        }

        setSigners(signers)



        let fourthItmeHashOnwards = allHashes.slice(4);
        let allSignersData = [...signers]

        try {
            if (signers.includes(session!.address)) {
                setUserCanSign(true)

                let indexOfMyWalletAddress = signers.indexOf(session!.address);
                console.log(`beffore index of my wallet ${indexOfMyWalletAddress}`)
                //get all previous signature 

                let index = 0
                for (let i = 0; i < fourthItmeHashOnwards.length; i += 3) {


                    const batch = fourthItmeHashOnwards.slice(i, i + 3);
                    // let hashSigPosition = batch[0] ?? ""
                    // let hashSigRev = batch[1] ?? ""
                    let hashSigMetamak = batch[2] ?? ""

                    let revision = selectedFileInfo!.aquaTree!.revisions![hashSigMetamak];

                    allSignersData = allSignersData.filter(item => item !== revision.signature_wallet_address); //pop()


                    index += 1
                }

                let indexOfMyWalletAddressAfter = allSignersData.indexOf(session!.address)
                console.log(` index ${index} index of my wallet b4 ${indexOfMyWalletAddress} after ${indexOfMyWalletAddressAfter}`)

                let allSignersBeforeMe = allSignersData.slice(0, indexOfMyWalletAddressAfter)
                // if (indexOfMyWalletAddress != index) {
                setAllSignersBeforeMe(allSignersBeforeMe)


            }
        } catch (e) {
            console.log(`Error PDF Signer -  ${e}`)
        }


        if (file) {
            (async () => {
                setPdfFile(file);

                // Create object URL for display
                const fileUrl = URL.createObjectURL(file);
                setPdfUrl(fileUrl);

                // Load PDF document using pdf-lib
                const arrayBuffer = await file.arrayBuffer();
                const pdfDoc = await PDFDocument.load(arrayBuffer);
                setPdfDoc(pdfDoc);
            })()
        }



        const handleResize = () => {
            // Force re-render to update signature positions
            setSignaturePositions(prev => [...prev]);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        loadUserSignatures(true)

    }, [backend_url, session, session?.address]);

    useEffect(() => {
        // Load user signatures when component mounts
        if (documentSignatures) {
            setSignaturesInDocument(documentSignatures);
        }
    }, [JSON.stringify(documentSignatures)]);


    return (
        <Container maxW="container.xl" py={"6"} h={"calc(100vh - 70px)"} overflow={{ base: "scroll", md: "hidden" }}>
            <Heading mb={5}>PDF Signer</Heading>

            {/* File upload section */}
            {pdfFile == null ? <Stack gap={4} align="stretch" mb={6} >
                <Field>
                    <FieldLabel>Upload PDF Document</FieldLabel>
                    <Input
                        type="file"
                        onChange={handleFileUpload}
                        p={1}
                    />
                </Field>

                {/* todo fix me */}
                {/* {pdfFile  != null ?  
                    <Text>
                        File: {pdfFile.name} ({Math.round(pdfFile!.size / 1024)} KB)
                    </Text>
                : <></>} */}
            </Stack> : <></>}

            {/* PDF viewer and signature tools */}
            {pdfUrl && (
                <Grid templateColumns="repeat(4, 1fr)" gap="6"
                    h={{ base: "fit-content", md: "calc(100vh - 120px - 150px)" }} overflow={{ base: "scroll", md: "hidden" }}
                >
                    {/* PDF viewer */}
                    <GridItem colSpan={{ base: 12, md: userCanSign ? 3 : 4 }} h={"100%"} overflow={"scroll"} >
                        <Box
                            position="relative"
                            border="1px solid"

                            borderColor={colorMode === "dark" ? "gray.800" : "gray.100"}
                            borderRadius="md"
                            ref={pdfContainerRef}
                            onClick={handlePdfClick}
                            py={"4"}
                            cursor={placingSignature ? "crosshair" : "default"}
                        >
                            <Center>
                                <Box ref={pdfMainContainerRef} w={'fit-content'}>
                                    <PDFJSViewer
                                        pdfUrl={pdfUrl}
                                        onPageChange={handlePageChange}
                                        renderControls={PdfControls}
                                    // onDocumentLoad={(totalPages) => setNumPages(totalPages)}
                                    />
                                </Box>
                            </Center>

                            {/* Signature overlays */}
                            {signaturePositions.map((position, index) => {

                                console.log(`@@@@@@@@@@@@@@@@@ 7777  Signature position ${JSON.stringify(position, null, 4)}`)
                                return <SignatureOverlay key={index}
                                    currentPage={currentPage}
                                    signature={position}
                                    pdfMainContainerRef={pdfMainContainerRef}
                                    handleDragStart={handleDragStart}
                                />


                            })}

                            {signaturesInDocument?.map((signature, index) => (
                                <SimpleSignatureOverlay key={index} signature={signature} currentPage={currentPage}
                                />
                            ))}
                        </Box>
                    </GridItem>

                    {signatureSideBar()}
                </Grid>
            )}

            {/* Signature drawing modal */}
            <DialogRoot open={isOpen}
                onOpenChange={e => setIsOpen(e.open)}
                size="md">
                <DialogContent borderRadius={{ base: 0, md: 'xl' }}>
                    <DialogHeader py={"3"} px={"5"}>
                        <Text>Draw Signature</Text>
                    </DialogHeader>
                    <DialogBody>
                        <Stack gap={4}>
                            <Field>
                                <FieldLabel>Signer Name</FieldLabel>
                                <Input
                                    value={signerName}
                                    onChange={(e) => setSignerName(e.target.value)}
                                    placeholder="Enter your name"
                                    borderRadius={"lg"}
                                />
                            </Field>

                            <Text>Wallet Address: {session?.address ?
                                `${session?.address.substring(0, 6)}...${session?.address.substring(session?.address.length - 4)}` :
                                'Not connected'
                            }</Text>

                            <Box
                                border="1px solid"
                                borderColor="gray.200"
                                width="100%"
                                height="200px"
                                bg="white"
                            >
                                <SignatureCanvas
                                    ref={signatureRef}
                                    canvasProps={{
                                        style: {
                                            maxWidth: "100%"
                                        },
                                        width: 500,
                                        height: 200,
                                        className: 'signature-canvas',
                                    }}
                                    backgroundColor="transparent"
                                />
                            </Box>

                            <HStack>
                                <IconButton
                                    aria-label="Clear signature"
                                    onClick={clearSignature}
                                >
                                    <FaUndo />
                                </IconButton>
                                <Button disabled={creatingUserSignature} colorScheme="blue" onClick={saveSignature}>


                                    {creatingUserSignature ? <>
                                        <Spinner size="inherit" color="inherit" />
                                        loading
                                    </> : <span>Save Signature</span>}
                                </Button>
                            </HStack>
                        </Stack>
                    </DialogBody>
                </DialogContent>
            </DialogRoot>
        </Container>
    );
};

// Add PDF.js types to window object
declare global {
    interface Window {
        pdfjsLib: any;
    }
}

export default PdfSigner