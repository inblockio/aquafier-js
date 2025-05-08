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
import { useColorMode } from '../components/chakra-ui/color-mode';
import { PDFJSViewer } from 'pdfjs-react-viewer';

// Interface for signature position
interface SignaturePosition {
    id: string;
    pageIndex: number;
    x: number; // PDF coordinates (0-1)
    y: number; // PDF coordinates (0-1)
    width: number; // PDF relative width (0-1)
    height: number; // PDF relative height (0-1)
    isDragging?: boolean;
}

const PdfSigner = () => {
    // State for PDF document
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pdfDimensions, setPdfDimensions] = useState<{ width: number; height: number } | null>(null);

    // State for signature
    const signatureRef = useRef<SignatureCanvas | null>(null);
    const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
    const [signerName, setSignerName] = useState<string>('');
    const [signaturePositions, setSignaturePositions] = useState<SignaturePosition[]>([]);
    const [placingSignature, setPlacingSignature] = useState<boolean>(false);
    const [signatureSize, setSignatureSize] = useState<number>(150);

    // Modal state
    const [isOpen, setIsOpen] = useState(false);
    const { colorMode } = useColorMode();

    // Get wallet address from store
    const { session } = useStore(appStore);

    // Refs
    const pdfContainerRef = useRef<HTMLDivElement>(null);
    const pdfViewerRef = useRef<HTMLDivElement>(null);

    // Handle file upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                setPdfFile(file);
                const fileUrl = URL.createObjectURL(file);
                setPdfUrl(fileUrl);

                // Load PDF document using pdf-lib to get accurate dimensions
                const arrayBuffer = await file.arrayBuffer();
                const pdfDoc = await PDFDocument.load(arrayBuffer);
                setPdfDoc(pdfDoc);

                // Get dimensions of the first page
                const firstPage = pdfDoc.getPage(0);
                setPdfDimensions({
                    width: firstPage.getWidth(),
                    height: firstPage.getHeight()
                });

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
            setSignatureDataUrl(null);
        }
    };

    // Save signature from canvas
    const saveSignature = () => {
        if (signatureRef.current && !signatureRef.current.isEmpty()) {
            const dataUrl = signatureRef.current.toDataURL('image/png');
            setSignatureDataUrl(dataUrl);
            setIsOpen(false);

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
        if (!placingSignature || !pdfViewerRef.current || !signatureDataUrl || !pdfDimensions) return;

        const rect = pdfViewerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Calculate PDF coordinates (0-1)
        const relativeX = x / rect.width;
        const relativeY = 1 - (y / rect.height); // Invert Y for PDF coordinates

        // Calculate signature dimensions in PDF units (maintaining aspect ratio)
        const aspectRatio = 2; // Signature aspect ratio (width/height)
        const pdfAspectRatio = pdfDimensions.width / pdfDimensions.height;
        
        // Calculate width and height in PDF units (0-1)
        const relativeWidth = (signatureSize / pdfDimensions.width) * pdfAspectRatio;
        const relativeHeight = (signatureSize / aspectRatio) / pdfDimensions.height;

        const newPosition: SignaturePosition = {
            id: crypto.randomUUID(),
            pageIndex: currentPage - 1,
            x: relativeX,
            y: relativeY,
            width: relativeWidth,
            height: relativeHeight
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
        if (!pdfDoc || !signatureDataUrl || signaturePositions.length === 0) {
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

            // Embed the signature image
            const signatureImage = await signedPdfDoc.embedPng(signatureDataUrl);

            // Add signature to each position
            for (const position of signaturePositions) {
                const page = signedPdfDoc.getPage(position.pageIndex);
                const { width, height } = page.getSize();

                // Calculate position in PDF units
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
                page.drawText(signerName, {
                    x: signatureLeftEdge,
                    y: signatureY - (position.height * height / 2) - 12,
                    size: fontSize,
                    font,
                    color: rgb(0, 0, 0),
                });

                // Draw wallet address
                const shortenedAddress = session?.address || 'No wallet connected';
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

    const getEventPosition = (e: MouseEvent | TouchEvent) => {
        if ('touches' in e && e.touches.length > 0) {
            return {
                clientX: e.touches[0].clientX,
                clientY: e.touches[0].clientY
            };
        }
        return {
            clientX: (e as MouseEvent).clientX,
            clientY: (e as MouseEvent).clientY
        };
    };

    const handleDragMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging || !activeDragId || !pdfViewerRef.current) return;
        e.preventDefault();

        const rect = pdfViewerRef.current.getBoundingClientRect();
        const { clientX, clientY } = getEventPosition(e);

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        // Calculate PDF coordinates (0-1)
        const relativeX = x / rect.width;
        const relativeY = 1 - (y / rect.height);

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

    // Add event listeners for drag operations
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleDragMove as any);
            document.addEventListener('mouseup', handleDragEnd);
            document.addEventListener('touchmove', handleDragMove as any, { passive: false });
            document.addEventListener('touchend', handleDragEnd);
            document.addEventListener('touchcancel', handleDragEnd);
        }

        return () => {
            document.removeEventListener('mousemove', handleDragMove as any);
            document.removeEventListener('mouseup', handleDragEnd);
            document.removeEventListener('touchmove', handleDragMove as any);
            document.removeEventListener('touchend', handleDragEnd);
            document.removeEventListener('touchcancel', handleDragEnd);
        };
    }, [isDragging, activeDragId]);

    // Component for signature display on PDF
    const SignatureOverlay = ({ position }: { position: SignaturePosition }) => {
        if (position.pageIndex !== currentPage - 1 || !signatureDataUrl) return null;

        return (
            <Box
                position="absolute"
                left={`${position.x * 100}%`}
                top={`${(1 - position.y) * 100}%`}
                transform="translate(-50%, -50%)"
                pointerEvents="auto"
                cursor={position.isDragging ? "grabbing" : "grab"}
                zIndex={position.isDragging ? 20 : 10}
                onMouseDown={(e) => handleDragStart(e, position.id)}
                onTouchStart={(e) => handleDragStart(e, position.id)}
                border={position.isDragging ? "2px dashed blue" : "none"}
                transition="border 0.2s ease"
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
                        backgroundImage={`url(${signatureDataUrl})`}
                        backgroundSize="contain"
                        backgroundRepeat="no-repeat"
                        backgroundPosition="left"
                        minHeight="40px"
                    />
                    <Text fontSize="xs" color="gray.600" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {session?.address ? `${session.address.substring(0, 6)}...${session.address.slice(-4)}` : 'No wallet'}
                    </Text>
                    <Text fontSize="xs" color="gray.600" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {signerName}
                    </Text>
                </Stack>
            </Box>
        );
    };

    // Simple PDF viewer using an iframe
    const SimplePdfViewer = ({ url }: { url: string }) => {
        return (
            <Box
                ref={pdfViewerRef}
                position="relative"
                width="100%"
                height="100%"
                minHeight="500px"
            >
                <iframe
                    src={`${url}#toolbar=0&navpanes=0&scrollbar=0&page=${currentPage}`}
                    width="100%"
                    height="100%"
                    style={{ border: 'none' }}
                    title="PDF Viewer"
                />
            </Box>
        );
    };
    return (
        <Container maxW="container.xl" py={"6"} h={"calc(100vh - 70px)"} overflow={{base: "scroll", md: "hidden"}}>
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
                h={{base: "fit-content", md: "calc(100vh - 120px - 130px)"}} overflow={{base: "scroll", md: "hidden"}}
                >
                    {/* PDF viewer */}
                    <GridItem colSpan={{ base: 12, md: 3 }} h={"100%"} overflow={"hidden"} >
                        <Box
                            position="relative"
                            border="1px solid"
                            borderColor={colorMode === "dark" ? "gray.800" : "gray.100"}
                            borderRadius="md"
                            ref={pdfContainerRef}
                            onClick={handlePdfClick}
                            py={"4"}
                            cursor={placingSignature ? "crosshair" : "default"}
                            height="100%"
                        >
                            <SimplePdfViewer url={pdfUrl} />

                            {/* Signature overlays */}
                            {signaturePositions.map((position) => (
                                <SignatureOverlay key={position.id} position={position} />
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

                            {signatureDataUrl && (
                                <>
                                    <Text fontWeight="bold">Your Signature:</Text>
                                    <Box
                                        border="1px solid"
                                        borderColor="gray.200"
                                        p={2}
                                        borderRadius="md"
                                        height="80px"
                                        backgroundImage={`url(${signatureDataUrl})`}
                                        backgroundSize="contain"
                                        backgroundRepeat="no-repeat"
                                        backgroundPosition="center"
                                    />

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
                                        disabled={!signatureDataUrl}
                                        onClick={() => setPlacingSignature(true)}
                                    >
                                        Place Signature on Document
                                    </Button>

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