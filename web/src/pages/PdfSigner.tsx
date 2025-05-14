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
    Container
} from '@chakra-ui/react';
import { useBoolean } from '@chakra-ui/hooks';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import SignatureCanvas from 'react-signature-canvas';
import { FaUndo, FaDownload, FaPlus } from 'react-icons/fa';
import appStore from '../store';
import { useStore } from "zustand";
import { toaster } from '../components/chakra-ui/toaster';
import { Field } from '../components/chakra-ui/field';
import { DialogBody, DialogContent, DialogHeader, DialogRoot } from '../components/chakra-ui/dialog';
import { PDFJSViewer } from 'pdfjs-react-viewer';
import { useColorMode } from '../components/chakra-ui/color-mode';
import { PdfControls } from '../components/FilePreview';
import axios from 'axios';
import { ApiFileInfo } from '../models/FileInfo';
import { blobToDataURL, ensureDomainUrlHasSSL, timeStampToDateObject } from '../utils/functions';

// Interface for signature position
interface SignaturePosition {
    id: string;
    pageIndex: number;
    x: number;
    y: number;
    width: number;
    height: number;
    isDragging?: boolean;
    signatureId?: string; // Reference to the signature that was placed
}

// Interface for signature data
interface SignatureData {
    id: string;
    dataUrl: string;
    walletAddress: string;
    name: string;
    createdAt: Date;
}

const PdfSigner = () => {
    // State for PDF document
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
    // const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);

    // State for signatures
    const signatureRef = useRef<SignatureCanvas | null>(null);
    const [signatures, setSignatures] = useState<SignatureData[]>([]);
    const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(null);
    const [signerName, setSignerName] = useState<string>('');
    const [signaturePositions, setSignaturePositions] = useState<SignaturePosition[]>([]);
    const [placingSignature, setPlacingSignature] = useState<boolean>(false);
    const [signatureSize, setSignatureSize] = useState<number>(150);

    // Modal state
    const [isOpen, setIsOpen] = useState(false);
    const { colorMode } = useColorMode();


    // Get wallet address from store
    const { session, backend_url } = useStore(appStore);

    // PDF viewer container ref
    const pdfContainerRef = useRef<HTMLDivElement>(null);
    const pdfMainContainerRef = useRef<HTMLDivElement>(null);


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

    // Save signature from canvas
    const saveSignature = () => {
        if (signatureRef.current && !signatureRef.current.isEmpty()) {
            const dataUrl = signatureRef.current.toDataURL('image/png');

            // Create a new signature object with unique ID
            const newId = crypto.randomUUID();
            const newSignature: SignatureData = {
                id: newId,
                dataUrl,
                walletAddress: session?.address || 'No wallet connected',
                name: signerName || 'Unnamed Signature',
                createdAt: new Date()
            };

            // Add the new signature to the array
            console.log('Adding new signature:', newSignature);
            setSignatures(prevSignatures => {
                const updatedSignatures = [...prevSignatures, newSignature];
                console.log('Updated signatures array:', updatedSignatures);
                return updatedSignatures;
            });

            // Select the newly created signature
            setSelectedSignatureId(newId);
            setIsOpen(false);

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
        } else {
            toaster.create({
                title: "Please draw a signature first",
                type: "warning",
                duration: 3000,
            });
        }
    };

    // Handle click on PDF to place signature
    const handlePdfClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!placingSignature || !pdfMainContainerRef.current || !selectedSignatureId) return;

        const selectedSignature = signatures.find(sig => sig.id === selectedSignatureId);
        if (!selectedSignature) return;

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

        const newPosition: SignaturePosition = {
            id: crypto.randomUUID(),
            pageIndex: currentPage - 1,
            x: relativeX,
            y: relativeY,
            width: relativeWidth,
            height: relativeHeight,
            signatureId: selectedSignatureId
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

    // Generate signed PDF
    const generateSignedPdf = async () => {
        if (!pdfDoc || signatures.length === 0 || signaturePositions.length === 0) {
            toaster.create({
                title: "Missing information",
                description: "Please upload a PDF, create a signature, and place it on the document",
                type: "warning",
                duration: 3000,
            });
            return;
        }

        try {
            // Create a copy of the PDF
            const pdfBytes = await pdfDoc.save();
            const signedPdfDoc = await PDFDocument.load(pdfBytes);

            // Create a map of signature images for quick lookup
            const signatureImagesMap = new Map();

            // Embed all signature images that are used in positions
            for (const signature of signatures) {
                if (signaturePositions.some(pos => pos.signatureId === signature.id)) {
                    const signatureImage = await signedPdfDoc.embedPng(signature.dataUrl);
                    signatureImagesMap.set(signature.id, signatureImage);
                }
            }

            // Add signature to each position
            for (const position of signaturePositions) {
                if (!position.signatureId) continue;

                const signature = signatures.find(sig => sig.id === position.signatureId);
                if (!signature) continue;

                const signatureImage = signatureImagesMap.get(position.signatureId);
                if (!signatureImage) continue;

                const page = signedPdfDoc.getPage(position.pageIndex);
                const { width, height } = page.getSize();

                // Calculate position without manual adjustments
                const signatureX = position.x * width;
                const signatureY = position.y * height;

                // Draw signature image
                page.drawImage(signatureImage, {
                    x: signatureX - (position.width * width / 2),
                    y: signatureY - (position.height * height / 2),
                    width: position.width * width,
                    height: position.height * height,
                });

                // Add name and wallet address below signature
                const font = await signedPdfDoc.embedFont(StandardFonts.Helvetica);
                const fontSize = 10;

                // Calculate the left edge of the signature image
                const signatureLeftEdge = signatureX - (position.width * width / 2);

                // Draw name aligned with the left edge of the signature
                page.drawText(signature.name, {
                    x: signatureLeftEdge,
                    y: signatureY - (position.height * height / 2) - 12,
                    size: fontSize,
                    font,
                    color: rgb(0, 0, 0),
                });

                // Draw wallet address
                const shortenedAddress = signature.walletAddress;

                // Draw wallet address aligned with the left edge of the signature
                page.drawText(shortenedAddress, {
                    x: signatureLeftEdge,
                    y: signatureY - (position.height * height / 2) - 24,
                    size: fontSize,
                    font,
                    color: rgb(0, 0, 0),
                });
            }

            // Save the signed PDF
            const signedPdfBytes = await signedPdfDoc.save();

            // Create a blob and download link
            const blob = new Blob([signedPdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            // Create download link and trigger download
            const link = document.createElement('a');
            link.href = url;
            link.download = `signed_${pdfFile?.name || 'document.pdf'}`;
            link.click();

            // Clean up
            URL.revokeObjectURL(url);

            toaster.create({
                title: "PDF signed successfully",
                description: "Your signed document has been downloaded",
                type: "success",
                duration: 3000,
            });
        } catch (error) {
            console.error("Error generating signed PDF:", error);
            toaster.create({
                title: "Error signing PDF",
                description: "An error occurred while generating the signed PDF",
                type: "error",
                duration: 3000,
            });
        }
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
    const SignatureOverlay = ({ position }: { position: SignaturePosition }) => {
        if (position.pageIndex !== currentPage - 1 || !position.signatureId) return null;

        const signature = signatures.find(sig => sig.id === position.signatureId);
        if (!signature) return null;
        console.log("Signature overlay", position)
        // Find the actual PDF element for proper positioning
        const pdfElement = pdfMainContainerRef.current?.querySelector('.react-pdf__Page');
        const pdfRect = pdfElement?.getBoundingClientRect();

        // if (!pdfElement || !pdfRect) return null;
        console.log("PDF rect", pdfRect)
        return (
            <Box
                position="absolute"
                left={`${position.x * 100}%`}
                top={`${(1 - position.y) * 100}%`}
                transform="translate(-50%, -50%)"
                backgroundSize="contain"
                backgroundRepeat="no-repeat"
                backgroundPosition="center"
                pointerEvents="auto"
                cursor={position.isDragging ? "grabbing" : "grab"}
                zIndex={position.isDragging ? 20 : 10}
                onMouseDown={(e) => handleDragStart(e, position.id)}
                onTouchStart={(e) => handleDragStart(e, position.id)}
                border={position.isDragging ? "2px dashed blue" : "none"}
                transition="border 0.2s ease"
                overflow={"hidden"}
                _hover={{ boxShadow: "0 0 0 1px blue" }}
                style={{
                    width: `${position.width * 100}%`,
                    height: `${position.height * 100}%`,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    padding: '4px',
                    borderRadius: '4px'
                }}
            >
                <Stack gap={1} justifyContent={"flex-start"} height="100%">
                    <Box
                        flex="1"
                        backgroundImage={`url(${signature.dataUrl})`}
                        backgroundSize="contain"
                        backgroundRepeat="no-repeat"
                        backgroundPosition="left"
                        minHeight="40px"
                    />
                    <Text fontSize="xs" color="gray.600" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{signature.walletAddress}</Text>
                    <Text fontSize="xs" color="gray.600" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{signature.name}</Text>
                </Stack>
            </Box>
        );
    };

    const handlePageChange = (pageNumber: number, _totalPages: number) => {
        setCurrentPage(pageNumber);
    };

    const loadUserSignatures = async () => {

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
                
                console.log(`&&& signatureImageName ${signatureImageName} Data ${JSON.stringify(signatureImageObject,null, 4)}`)

                let fileContentUrl = signatureImageObject.fileContent

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
                            description: `${signatureImageName} not found in system`,
                            type: "error"
                        })
                        continue
                        // throw new Error("Failed to fetch file");
                    }

                    // Get content type from headers or from file extension
                    // Get content type from headers or from file extension
                    let contentType = response.headers.get("Content-Type") || "image/png";
                    console.log(`Content type ${contentType}`);

                    // Get the blob from the response
                    // const blob = await response.blob();

                    // Clone response and get data
                    const arrayBuffer = await response.arrayBuffer();


                    // Create blob with correct content type
                    const blob = new Blob([arrayBuffer], { type: contentType });



                    // Convert blob to base64 data URL
                    const dataUrl = await blobToDataURL(blob);

                    console.log(`## dataUrl ${dataUrl}`);



                    // Add to signature
                    let sign: SignatureData = {
                        id: sinatureAquaTreeName,
                        name: firstRevision.forms_name,
                        walletAddress: firstRevision.forms_wallet_address,
                        dataUrl: dataUrl,
                        createdAt: timeStampToDateObject(firstRevision.local_timestamp) ?? new Date()
                    };
                    apiSigntures.push(sign)
                }
            }


            console.log(`Signatures length ${apiSigntures.length} now update state`)


            // setSignatures([...signatures, ...apiSigntures])
            // Filter out duplicates before adding to state
            setSignatures(prevSignatures => {
                // Create a map of existing signatures by ID for quick lookup
                const existingSignatureIds = new Set(prevSignatures.map(sig => sig.id));

                // Only add signatures that don't already exist
                const newSignatures = apiSigntures.filter(sig => !existingSignatureIds.has(sig.id));

                console.log(`Adding ${newSignatures.length} new signatures, filtered out ${apiSigntures.length - newSignatures.length} duplicates`);

                return [...prevSignatures, ...newSignatures];
            });


        } catch (e) {
            console.log(`loadUserSignatures Error ${e}`)
        }
    }

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

        loadUserSignatures()


        const handleResize = () => {
            // Force re-render to update signature positions
            setSignaturePositions(prev => [...prev]);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // console.log("Signatures", signatures)
    // console.log("Signature positions", signaturePositions)

    useEffect(() => {

        loadUserSignatures()

    }, [backend_url, session, session?.address]);

    return (
        <Container maxW="container.xl" py={"6"} h={"calc(100vh - 70px)"} overflow={{ base: "scroll", md: "hidden" }}>
            <Heading mb={5}>PDF Signer</Heading>

            {/* File upload section */}
            <Stack gap={4} align="stretch" mb={6} >
                <Field>
                    <FieldLabel>Upload PDF Document</FieldLabel>
                    <Input
                        type="file"
                        onChange={handleFileUpload}
                        p={1}
                    />
                </Field>

                {pdfFile && (
                    <Text>
                        File: {pdfFile.name} ({Math.round(pdfFile.size / 1024)} KB)
                    </Text>
                )}
            </Stack>

            {/* PDF viewer and signature tools */}
            {pdfUrl && (
                <Grid templateColumns="repeat(4, 1fr)" gap="6"
                    h={{ base: "fit-content", md: "calc(100vh - 120px - 150px)" }} overflow={{ base: "scroll", md: "hidden" }}
                >
                    {/* PDF viewer */}
                    <GridItem colSpan={{ base: 12, md: 3 }} h={"100%"} overflow={"scroll"} >
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
                            {signaturePositions.map((position, index) => (
                                <SignatureOverlay key={index} position={position} />
                            ))}
                        </Box>
                    </GridItem>
                    <GridItem colSpan={{ base: 12, md: 1 }} h={{ base: "fit-content", md: "100%" }} overflow={{ base: "hidden", md: "auto" }}>
                        {/* Signature tools */}
                        <Stack
                            gap={4}
                            align="stretch"
                            p={4}
                            border="1px solid"
                            borderColor={colorMode === "dark" ? "gray.800" : "gray.100"}
                            borderRadius="md"
                        >
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

                            <Button
                                colorScheme="blue"
                                onClick={() => setIsOpen(true)}
                            >
                                <FaPlus />
                                Create Signature
                            </Button>

                            {/* Signature List */}
                            {signatures.length > 0 && (
                                <>
                                    <Text fontWeight="bold" mt={2}>Your Signatures:</Text>
                                    <Box maxH="200px" overflowY="auto" border="1px solid" borderColor="gray.200" borderRadius="md">
                                        <Stack gap={0}>
                                            {signatures.map((signature) => (
                                                <Box
                                                    key={signature.id}
                                                    p={2}
                                                    cursor="pointer"
                                                    bg={selectedSignatureId === signature.id ? "blue.50" : "transparent"}
                                                    _hover={{ bg: "gray.50" }}
                                                    onClick={() => {
                                                        setSelectedSignatureId(signature.id);
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
                                </>
                            )}

                            {selectedSignatureId && (
                                <>
                                    <Text fontWeight="bold" mt={2}>Selected Signature:</Text>
                                    {(() => {
                                        const selectedSignature = signatures.find(sig => sig.id === selectedSignatureId);
                                        if (!selectedSignature) return null;

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

                                    <Field>
                                        <FieldLabel>Signature Size: {signatureSize}px</FieldLabel>
                                        <Slider.Root
                                            min={50}
                                            max={300}
                                            step={1}
                                            value={[signatureSize]}
                                            onValueChange={(value) => {
                                                if (Array.isArray(value)) {
                                                    setSignatureSize(value[0]);
                                                }
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
                                                        const signature = signatures.find(sig => sig.id === position.signatureId);
                                                        if (!signature) return null;

                                                        return (
                                                            <HStack key={position.id} p={2} justify="space-between">
                                                                <HStack>
                                                                    <Box
                                                                        width="40px"
                                                                        height="30px"
                                                                        backgroundImage={`url(${signature.dataUrl})`}
                                                                        backgroundSize="contain"
                                                                        backgroundRepeat="no-repeat"
                                                                        backgroundPosition="center"
                                                                        border="1px solid"
                                                                        borderColor="gray.200"
                                                                        borderRadius="sm"
                                                                    />
                                                                    <Text fontSize="xs">{signature.name} (Page {position.pageIndex + 1})</Text>
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

                            <Button
                                colorScheme="green"
                                // disabled={!pdfDoc || !signatureDataUrl || signaturePositions.length === 0}
                                onClick={generateSignedPdf}
                            >
                                <FaDownload />
                                Download Signed PDF
                            </Button>
                        </Stack>
                    </GridItem>
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
                                        className: 'signature-canvas'
                                    }}
                                    backgroundColor="white"
                                />
                            </Box>

                            <HStack>
                                <IconButton
                                    aria-label="Clear signature"
                                    onClick={clearSignature}
                                >
                                    <FaUndo />
                                </IconButton>
                                <Button colorScheme="blue" onClick={saveSignature}>
                                    Save Signature
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