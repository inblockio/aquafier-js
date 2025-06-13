
import React, { useEffect, useState } from 'react';
import {
    Text,
    Heading,
    Stack,
    Grid,
    GridItem,
    Spinner,
} from '@chakra-ui/react';
// import { Card } from '@chakra-ui/react';
// import { FaCheck, FaQuestionCircle, FaBriefcase, FaBook, FaCoffee, FaAward, FaUser } from 'react-icons/fa';
import { Alert } from "../../../components/chakra-ui/alert"
import appStore from '../../../store';
import { useStore } from "zustand"
import { ContractDocumentViewProps, SignatureData, SummaryDetailsDisplayData } from '../../../types/types';
import { AquaTree, getGenesisHash, OrderRevisionInAquaTree, reorderAquaTreeRevisionsProperties, Revision } from 'aqua-js-sdk';
import { ensureDomainUrlHasSSL, getHighestFormIndex, isAquaTree } from '../../../utils/functions';

import { PDFDisplayWithJustSimpleOverlay } from './components/signature_overlay';
import PdfSigner from './PdfSigner';
import { toaster } from '../../../components/chakra-ui/toaster';
import SignatureItem from '../../../components/pdf/SignatureItem';



export const ContractDocumentView: React.FC<ContractDocumentViewProps> = ({ setActiveStep }) => {



    const [pdfLoadingFile, setLoadingPdfFile] = useState<boolean>(true);
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [pdfURLObject, setPdfURLObject] = useState<string | null>(null);
    const [signatures, setSignatures] = useState<SignatureData[]>([]);
    // const [signaturesData, setSignaturesData] = useState<SignatureData[]>([]);
    const [signaturesLoading, setSignaturesLoading] = useState<boolean>(false);
    // const [userCanSign, setUserCanSign] = useState<boolean>(false);
    // const [authorizedSigners, setAuthorizedSigners] = useState<string[]>([]);
    const { selectedFileInfo, session } = useStore(appStore);



    useEffect(() => {
        initializeComponent();
    }, []);


    // useEffect(() => {
    //     initializeComponent()
    // }, [JSON.stringify(selectedFileInfo), selectedFileInfo])



    const getSignatureRevionHashes = (hashesToLoopPar: Array<string>): Array<SummaryDetailsDisplayData> => {

        const signatureRevionHashes: Array<SummaryDetailsDisplayData> = []


        for (let i = 0; i < hashesToLoopPar.length; i += 3) {


            const batch = hashesToLoopPar.slice(i, i + 3);
            //  // console.log(`Processing batch ${i / 3 + 1}:`, batch);


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
            // console.log("fetched: ", response, "content type:", contentType);

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

    const findImageUrl = (fileHash: string): string | null => {
        for (const fileObject of selectedFileInfo!.fileObject) {
            const fileContent = fileObject.fileContent;

            if (typeof fileContent === 'string' && fileContent.includes(fileHash)) {
                return fileContent;
            }
        }

        return null;
    };
    const loadSignatures = async (): Promise<SignatureData[]> => {
        let sigData: SignatureData[] = []
        const orderedTree = OrderRevisionInAquaTree(selectedFileInfo!.aquaTree!)
        const revisions = orderedTree.revisions
        const revisionHashes = Object.keys(revisions)
        let fourthItmeHashOnwards: string[] = [];
        let signatureRevionHashes: Array<SummaryDetailsDisplayData> = []

        if (revisionHashes.length > 4) {
            // remove the first 4 elements from the revision list 
            fourthItmeHashOnwards = revisionHashes.slice(4);

            console.log(`fourthItmeHashOnwards data 00 ${JSON.stringify(fourthItmeHashOnwards, null, 4)}`)
            signatureRevionHashes = getSignatureRevionHashes(fourthItmeHashOnwards)
        }

        console.log(`signatureRevionHashes data 00 ${JSON.stringify(signatureRevionHashes, null, 4)}`)

        for (let sigHash of signatureRevionHashes) {


            let revisionSigImage = selectedFileInfo!.aquaTree!.revisions[sigHash.revisionHashWithSinatureRevision]
            const linkRevisionWithSignaturePositions: Revision = selectedFileInfo!.aquaTree!.revisions[sigHash.revisionHashWithSignaturePosition];
            const revisionMetMask: Revision = selectedFileInfo!.aquaTree!.revisions[sigHash.revisionHashMetamask];

            // const fileHash = revisionSigImage.link_file_hashes![0]!;
            // console.log(`fileHash ${fileHash}`)





            // get the name
            let referenceRevisin: string = revisionSigImage.link_verification_hashes![0]
            let name = "name-err"
            let imageDataUrl = ""
            for (let item of selectedFileInfo?.fileObject ?? []) {
                let isAquaTreeItem = isAquaTree(item.fileContent)
                // console.log(`isAquaTreeItem ${isAquaTreeItem} loopin gfile objects ${JSON.stringify(item, null, 4)}`)
                if (isAquaTreeItem) {
                    //  // console.log(`looping aqua tree`)
                    let aquaTreeGeneral = item.fileContent as AquaTree
                    let aquaTree = reorderAquaTreeRevisionsProperties(aquaTreeGeneral)
                    let allHashes = Object.keys(aquaTree.revisions)
                    //  // console.log(`looping aqua tree allHashes ${allHashes}`)
                    if (allHashes.includes(referenceRevisin)) {
                        let genesisHash = getGenesisHash(aquaTree)!
                        // console.log(`include genesisHash ${genesisHash}`)
                        let genRevision = aquaTree.revisions[genesisHash]
                        name = genRevision["forms_name"]


                        //the image url
                        //seconnd last or 3 one
                        let signatureRevisionHash: string = allHashes[2]
                        let signatureRevision: Revision = aquaTree.revisions[signatureRevisionHash]
                        if (signatureRevision.revision_type != "link") {
                            throw Error(`Error expected link`)
                        }
                        let imgFileHash = signatureRevision.link_file_hashes![0];
                        let imageUrl = findImageUrl(imgFileHash)

                        if (imageUrl) {
                            // console.log(` imageUrl ==  ${imageUrl}`)
                            const image = await fetchImage(imageUrl);
                            if (image) {
                                imageDataUrl = image
                            } else {
                                // Read default preview image from public folder and convert to data URL
                                try {
                                    const response = await fetch('/preview.png');
                                    if (response.ok) {
                                        const blob = await response.blob();
                                        imageDataUrl = await new Promise<string>((resolve) => {
                                            const reader = new FileReader();
                                            reader.onloadend = () => resolve(reader.result as string);
                                            reader.readAsDataURL(blob);
                                        });
                                    }
                                } catch (error) {
                                    console.error('Error loading preview.png:', error);
                                    imageDataUrl = "errror"; // fallback to empty string
                                }
                            }
                        }
                        break;
                    }
                }
            }


            let revisionSigPosition: Revision | null = null;

            let revisionHashWithPositions = linkRevisionWithSignaturePositions.link_verification_hashes![0]
            console.log(`revisionSigPosition === ${revisionHashWithPositions}`);

            for (let item of selectedFileInfo?.fileObject ?? []) {
                let isAquaTreeItem = isAquaTree(item.fileContent)
                if (isAquaTreeItem) {
                    let aquaTreeGeneral = item.fileContent as AquaTree
                    let aquaTree = reorderAquaTreeRevisionsProperties(aquaTreeGeneral)
                    let allHashes = Object.keys(aquaTree.revisions)
                    //  // console.log(`looping aqua tree allHashes ${allHashes}`)
                    if (allHashes.includes(revisionHashWithPositions)) {
                        revisionSigPosition = aquaTree.revisions[revisionHashWithPositions]
                    }
                }
            }

            if (revisionSigPosition != null) {
                console.log(`revisionSigPosition ===== ${JSON.stringify(revisionSigPosition, null, 4)}`)
                if (sigHash.revisionHashWithSignaturePositionCount == 0) {

                    let signatureDetails: SignatureData = {
                        id: sigHash.revisionHashWithSignaturePosition, // Use the hash key instead of revision.revision_hash
                        height: revisionSigPosition.forms_height_0,
                        width: revisionSigPosition.forms_width_0,
                        x: revisionSigPosition.forms_x_0,
                        y: revisionSigPosition.forms_y_0,
                        page: revisionSigPosition.forms_page_0,
                        name: name,
                        walletAddress: revisionMetMask.signature_wallet_address ?? "error",
                        // ISSUE 2: created_at doesn't exist, use local_timestamp instead
                        createdAt: new Date(
                            revisionSigPosition.local_timestamp
                                ? `${revisionSigPosition.local_timestamp.slice(0, 4)}-${revisionSigPosition.local_timestamp.slice(4, 6)}-${revisionSigPosition.local_timestamp.slice(6, 8)}T${revisionSigPosition.local_timestamp.slice(8, 10)}:${revisionSigPosition.local_timestamp.slice(10, 12)}:${revisionSigPosition.local_timestamp.slice(12, 14)}`
                                : Date.now()
                        ),
                        dataUrl: imageDataUrl,
                        hash: sigHash.revisionHashWithSignaturePosition, // Use the hash key
                        isDragging: false,
                        signatureId: sigHash.revisionHashWithSignaturePosition, // Use the hash key
                        type: "signature",
                        imageWidth: 100,
                        imageHeight: 120,
                        imageAlt: 'err -img not found',
                        rotation: 0
                    };
                    sigData.push(signatureDetails)
                } else {
                    const randomArray = Array.from({ length: sigHash.revisionHashWithSignaturePositionCount + 1 }, () => Math.random());
                    for (let index = 0; index < randomArray.length; index++) {
                        // console.log(`Looping  ${index}`)
                        let signatureDetails: SignatureData = {
                            id: `${sigHash.revisionHashWithSignaturePosition}_${index}`, // Make unique IDs for multiple signatures
                            height: revisionSigPosition[`forms_height_${index}`],
                            width: revisionSigPosition[`forms_width_${index}`],
                            x: revisionSigPosition[`forms_x_${index}`],
                            y: revisionSigPosition[`forms_y_${index}`],
                            page: revisionSigPosition[`forms_page_${index}`],
                            name: name,
                            walletAddress: revisionMetMask.signature_wallet_address ?? "error",
                            createdAt: new Date(
                                revisionSigPosition.local_timestamp
                                    ? `${revisionSigPosition.local_timestamp.slice(0, 4)}-${revisionSigPosition.local_timestamp.slice(4, 6)}-${revisionSigPosition.local_timestamp.slice(6, 8)}T${revisionSigPosition.local_timestamp.slice(8, 10)}:${revisionSigPosition.local_timestamp.slice(10, 12)}:${revisionSigPosition.local_timestamp.slice(12, 14)}`
                                    : Date.now()
                            ),
                            dataUrl: imageDataUrl,
                            hash: sigHash.revisionHashWithSignaturePosition,
                            isDragging: false,
                            signatureId: `${sigHash.revisionHashWithSignaturePosition}_${index}`,// Make unique signature IDs
                            type: "signature",
                            imageWidth: 100,
                            imageHeight: 120,
                            imageAlt: 'error -img not found.',
                            rotation: 0
                        };
                        sigData.push(signatureDetails)
                    }
                }
            } else {
                console.log(`signature positions not found   searchiong for gensis ${revisionHashWithPositions} `)
                // we try with fetching the image 
                //  ......    
            }
        }

        // console.log(`sigData length  ${JSON.stringify(sigData, null, 4)}`)
        return sigData;
    }

    const initializeComponent = async () => {
        try {
            // Load PDF first
            const pdfFile = await fetchPDFfile();
            setPdfFile(pdfFile);
            setLoadingPdfFile(false);


            let shouldLoad = shouldLoadSignatures()
            // console.log(`Should load ${shouldLoad + "="} ....`)

            if (shouldLoad) {
                setSignaturesLoading(true);
                const allSignatures: SignatureData[] = await loadSignatures();

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
        // return <Text style={{whiteSpace: "pre-wrap", wordBreak: "break-all"}}>{JSON.stringify(signatures, null, 4)}</Text>
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
                setActiveStep={setActiveStep}
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

