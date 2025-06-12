
import { useState, useCallback, useEffect } from 'react';
import type { Annotation } from './types';
import PdfViewer from './pdf-viewer';
import AnnotationSidebar from './annotation-sidebar';
import { ZoomIn, ZoomOut, ArrowLeft, ArrowRight } from 'lucide-react';
import { Grid, GridItem, HStack, IconButton, Stack, Box, Text, Heading } from '@chakra-ui/react';
import { Button } from '../../../../components/chakra-ui/button';
import { Slider } from '../../../../components/ui/slider';
import { SignatureData } from '../../../../types/types';
import { Alert } from '../../../../components/chakra-ui/alert';
import { LuInfo } from 'react-icons/lu';

// const parseFontSizeToPoints = (fontSizeString: string, defaultSize: number = 12): number => {
//   if (!fontSizeString || typeof fontSizeString !== 'string') return defaultSize;

//   const value = parseFloat(fontSizeString);
//   if (isNaN(value)) return defaultSize;

//   if (fontSizeString.toLowerCase().endsWith('pt')) {
//     return value;
//   } else if (fontSizeString.toLowerCase().endsWith('px')) {
//     // Common conversion: 1px = 0.75pt (for 96 DPI assumption where 1pt = 1/72 inch)
//     // Or, for pdf-lib, sometimes treating px as pt directly is fine for visual consistency.
//     // Let's treat px as pt for simplicity here, can be refined.
//     return value;
//   } else if (fontSizeString.toLowerCase().endsWith('em')) {
//     return value * defaultSize; // Assuming 1em = defaultSize (e.g., 12pt)
//   }
//   // If no unit, assume points
//   return value;
// };

interface PdfRendererProps {
  pdfFile: File | null;
  annotations: Annotation[];
  onAnnotationAdd: (newAnnotationData: Omit<Annotation, 'id'>) => void;
  onAnnotationUpdate: (updatedAnnotation: Annotation) => void;
  onAnnotationDelete: (id: string) => void;
  selectedTool: 'text' | 'image' | 'profile' | null;
  selectedAnnotationId: string | null;
  onAnnotationSelect: (id: string | null) => void;
  onAnnotationRotate: (direction: 'cw' | 'ccw') => void;
}

export function PdfRenderer({
  pdfFile,
  annotations,
  onAnnotationAdd,
  onAnnotationUpdate,
  onAnnotationDelete,
  selectedTool,
  selectedAnnotationId,
  onAnnotationSelect,
  // onAnnotationRotate,
}: PdfRendererProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);

  return (
    <Box >
      {pdfFile && (
        <HStack gap={2} borderBottom={`1px solid`} borderColor={"gray.300"} p={2} justify={'center'} align={"center"} bg={"gray.100"}>
          <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} variant="ghost" size="md"><ArrowLeft /></Button>
          <Text fontSize={"sm"} fontWeight={400} color={"gray.700"} className="text-sm font-medium">Page {currentPage} of {numPages}</Text>
          <IconButton onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} disabled={currentPage >= numPages || numPages === 0} variant="subtle" size="md"><ArrowRight /></IconButton>
          <IconButton onClick={() => setScale(s => Math.max(0.25, s - 0.25))} variant="subtle" size="md"><ZoomOut /></IconButton>
          <Slider
            value={[scale]}
            min={0.25} max={3} step={0.01}
            onValueChange={(value) => setScale(value.value[0])}
            w={{ base: "210%", md: "20%" }}
          />
          <IconButton onClick={() => setScale(s => Math.min(3, s + 0.25))} variant="ghost" size="md"><ZoomIn /></IconButton>
        </HStack>
      )}
      <Box bg={"gray.100"}>
        <PdfViewer
          file={pdfFile}
          annotations={annotations}
          onAnnotationAdd={onAnnotationAdd}
          onAnnotationUpdate={onAnnotationUpdate}
          onAnnotationDelete={onAnnotationDelete}
          selectedTool={selectedTool}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          numPages={numPages}
          setNumPages={setNumPages}
          scale={scale}
          setScale={setScale}
          selectedAnnotationId={selectedAnnotationId}
          onAnnotationSelect={onAnnotationSelect}
        />
      </Box>
    </Box>
  );
}

interface EasyPDFRendererProps {
  pdfFile: File | null;
  annotations: Annotation[];
}

export const EasyPDFRenderer = ({ pdfFile, annotations }: EasyPDFRendererProps) => {
  console.log("existing annotations: ", annotations)
  return (
    <PdfRenderer
      pdfFile={pdfFile}
      annotations={annotations}
      onAnnotationAdd={(_newAnnotationData: Omit<Annotation, 'id'>) => { }}
      onAnnotationUpdate={(_updatedAnnotation: Annotation) => { }}
      onAnnotationDelete={(_id: string) => { }}
      selectedTool={"text"}
      selectedAnnotationId={null}
      onAnnotationSelect={(_annotatedid: string | null) => { }}
      onAnnotationRotate={(_direction: 'cw' | 'ccw') => { }}
    />
  )
}



interface PdfSignerProps {
  file: File | null;
  mySignatures: SignatureData[]
  displayUserSignatures?: () => void
  selectSignature: (id: string) => void
  selectedSignatureHash?: string | null
  onAnnotationUpdate: (positions: SignatureData[]) => void
  handleSignatureSubmission: () => void
  submittingSignatureData: boolean
  signaturesInDocument: SignatureData[]
}


export default function SignerPage({ file, mySignatures, displayUserSignatures, selectSignature, selectedSignatureHash,
  onAnnotationUpdate, handleSignatureSubmission, submittingSignatureData, signaturesInDocument }: PdfSignerProps) {
  const pdfFile = file
  // const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedTool, setSelectedTool] = useState<'text' | 'image' | 'profile' | null>(null);
  const [_selectedSignatureHash, setSelectedSignatureHash] = useState<string | null>(null)
  const [canPlaceSignature, setCanPlaceSignature] = useState(false)
  // const [currentPage, setCurrentPage] = useState(1);
  // const [numPages, setNumPages] = useState(0);
  // const [scale, setScale] = useState(1.0);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);

  const addAnnotation = useCallback((newAnnotationData: Omit<Annotation, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const selectedSignatureInfo = mySignatures.find(signature => signature.hash === _selectedSignatureHash)
    console.log("Here", _selectedSignatureHash, mySignatures)
    if (!selectedSignatureInfo) {
      return
    }
    const newAnnotation = {
      ...newAnnotationData, id,
      imageSrc: selectedSignatureInfo.dataUrl ?? "/images/preview.jpg",
      name: selectedSignatureInfo.name,
      walletAddress: selectedSignatureInfo.walletAddress
    };
    setAnnotations((prev: any) => [...prev, newAnnotation]);
    setSelectedTool(null);
    setCanPlaceSignature(false)
    setSelectedSignatureHash(null)
    setSelectedAnnotationId(id);
  }, [mySignatures, _selectedSignatureHash]);

  const updateAnnotation = useCallback((updatedAnnotation: Annotation) => {
    setAnnotations((prev) =>
      prev.map((anno) => (anno.id === updatedAnnotation.id ? updatedAnnotation : anno))
    );
  }, []);

  const deleteAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((anno) => anno.id !== id));
    if (selectedAnnotationId === id) {
      setSelectedAnnotationId(null);
    }
  }, [selectedAnnotationId]);

  // TIP: Do not remove
  // const parseDimension = (dimension: string, pageDimension: number, defaultPercentage: number): number => {
  //   if (dimension.endsWith('%')) {
  //     const num = parseFloat(dimension);
  //     return isNaN(num) ? (defaultPercentage / 100) * pageDimension : (num / 100) * pageDimension;
  //   } else if (dimension.endsWith('px') || dimension.endsWith('pt')) {
  //     const num = parseFloat(dimension);
  //     return isNaN(num) ? (defaultPercentage / 100) * pageDimension : num;
  //   } else if (dimension.endsWith('em')) {
  //     const num = parseFloat(dimension);
  //     return isNaN(num) ? (defaultPercentage / 100) * pageDimension : num * 12; // Assuming 1em = 12pt
  //   } else if (!isNaN(parseFloat(dimension))) {
  //     return parseFloat(dimension);
  //   }
  //   return (defaultPercentage / 100) * pageDimension;
  // };

  // FEATURE: This method will help us do the download of the pdf
  // const handleDownload = async () => {
  //   if (!pdfFile) {
  //     toaster.create({ title: "No PDF", description: "Please upload or load a PDF file first.", type: "error" });
  //     return;
  //   }

  //   try {
  //     const existingPdfBytes = await pdfFile.arrayBuffer();
  //     const pdfDoc = await PDFDocument.load(existingPdfBytes);
  //     const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  //     const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  //     for (const anno of annotations) {
  //       const page = pdfDoc.getPage(anno.page - 1);
  //       const { width: pageWidth, height: pageHeight } = page.getSize();

  //       const annoXPercent = anno.x;
  //       const annoYPercent = anno.y;
  //       const annoX = (annoXPercent / 100) * pageWidth;

  //       // Base Y for pdf-lib (bottom of the element)
  //       // anno.y is percentage from top of page. pdf-lib y is from bottom of page.
  //       // We will calculate y for each element within ProfileAnnotation specifically.

  //       if (anno.type === 'text') {
  //         const textAnno = anno as TextAnnotation;
  //         const colorString = textAnno.color.startsWith('#') ? textAnno.color.substring(1) : textAnno.color;
  //         const r = parseInt(colorString.substring(0, 2), 16) / 255;
  //         const g = parseInt(colorString.substring(2, 4), 16) / 255;
  //         const b = parseInt(colorString.substring(4, 6), 16) / 255;

  //         const annoTextWidth = (textAnno.width / 100) * pageWidth;
  //         const fontSizeInPoints = parseFontSizeToPoints(textAnno.fontSize, 12);
  //         // For text, anno.y is the top of the text block.
  //         const textYPdfLib = pageHeight - (annoYPercent / 100 * pageHeight) - fontSizeInPoints;


  //         page.drawText(textAnno.text, {
  //           x: annoX,
  //           y: textYPdfLib,
  //           size: fontSizeInPoints,
  //           font: helveticaFont,
  //           color: rgb(r, g, b),
  //           lineHeight: fontSizeInPoints * 1.2,
  //           maxWidth: annoTextWidth,
  //           rotate: degrees(anno.rotation || 0),
  //         });
  //       } else if (anno.type === 'image') {
  //         const imgAnno = anno as ImageAnnotation;
  //         const finalAnnoWidthInPoints = parseDimension(imgAnno.width, pageWidth, 25);
  //         const finalAnnoHeightInPoints = parseDimension(imgAnno.height, pageHeight, 15);
  //         const annoImgYPdfLib = pageHeight - (annoYPercent / 100 * pageHeight) - finalAnnoHeightInPoints;

  //         try {
  //           let imageBytes: ArrayBuffer;
  //           if (imgAnno.src.startsWith('data:image')) {
  //             const base64Data = imgAnno.src.split(',')[1];
  //             imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
  //           } else {
  //             const response = await fetch(imgAnno.src);
  //             imageBytes = await response.arrayBuffer();
  //           }

  //           let pdfImage;
  //           if (imgAnno.src.includes('png')) {
  //             pdfImage = await pdfDoc.embedPng(imageBytes);
  //           } else if (imgAnno.src.includes('jpeg') || imgAnno.src.includes('jpg')) {
  //             pdfImage = await pdfDoc.embedJpg(imageBytes);
  //           } else {
  //             console.warn(`Unsupported image type for annotation ${imgAnno.id}`);
  //             toaster.create({ title: "Image Error", description: `Unsupported image type: ${imgAnno.alt}`, type: "error" });
  //             continue;
  //           }

  //           page.drawImage(pdfImage, {
  //             x: annoX,
  //             y: annoImgYPdfLib,
  //             width: finalAnnoWidthInPoints,
  //             height: finalAnnoHeightInPoints,
  //             rotate: degrees(anno.rotation || 0),
  //           });
  //         } catch (error) {
  //           console.error(`Failed to embed image for annotation ${imgAnno.id}:`, error);
  //           toaster.create({ title: "Image Error", description: `Could not embed image: ${imgAnno.alt}`, type: "error" });
  //         }
  //       } else if (anno.type === 'profile') {
  //         const profileAnno = anno as ProfileAnnotation;
  //         let currentYOffsetFromTopPercent = profileAnno.y; // Start with the annotation's y
  //         const profileRotation = degrees(profileAnno.rotation || 0);

  //         // 1. Draw Image
  //         const imgWidthPoints = parseDimension(profileAnno.imageWidth, pageWidth, 20); // Default 20% width
  //         const imgHeightPoints = parseDimension(profileAnno.imageHeight, pageHeight, 10); // Default 10% height
  //         const imgYPdfLib = pageHeight - (currentYOffsetFromTopPercent / 100 * pageHeight) - imgHeightPoints;

  //         try {
  //           let imageBytes: ArrayBuffer;
  //           if (profileAnno.imageSrc.startsWith('data:image')) {
  //             const base64Data = profileAnno.imageSrc.split(',')[1];
  //             imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
  //           } else {
  //             const response = await fetch(profileAnno.imageSrc);
  //             imageBytes = await response.arrayBuffer();
  //           }

  //           let pdfImage;
  //           if (profileAnno.imageSrc.includes('png')) {
  //             pdfImage = await pdfDoc.embedPng(imageBytes);
  //           } else if (profileAnno.imageSrc.includes('jpeg') || profileAnno.imageSrc.includes('jpg')) {
  //             pdfImage = await pdfDoc.embedJpg(imageBytes);
  //           } else {
  //             console.warn(`Unsupported image type for profile annotation ${profileAnno.id}`);
  //             toaster.create({ title: "Profile Image Error", description: `Unsupported image: ${profileAnno.imageAlt}`, type: "error" });
  //           }
  //           if (pdfImage) {
  //             page.drawImage(pdfImage, {
  //               x: annoX,
  //               y: imgYPdfLib,
  //               width: imgWidthPoints,
  //               height: imgHeightPoints,
  //               rotate: profileRotation,
  //             });
  //           }
  //         } catch (error) {
  //           console.error(`Failed to embed profile image for annotation ${profileAnno.id}:`, error);
  //           toaster.create({ title: "Profile Image Error", description: `Could not embed image: ${profileAnno.imageAlt}`, type: "error" });
  //         }
  //         currentYOffsetFromTopPercent += (imgHeightPoints / pageHeight * 100) + 1; // Add 1% spacing

  //         // 2. Draw Name
  //         const nameFontSize = parseFontSizeToPoints(profileAnno.nameFontSize || "12pt", 12);
  //         const nameColorStr = profileAnno.nameColor || '#000000';
  //         const nameR = parseInt(nameColorStr.substring(1, 3), 16) / 255;
  //         const nameG = parseInt(nameColorStr.substring(3, 5), 16) / 255;
  //         const nameB = parseInt(nameColorStr.substring(5, 7), 16) / 255;
  //         const nameYPdfLib = pageHeight - (currentYOffsetFromTopPercent / 100 * pageHeight) - nameFontSize;

  //         page.drawText(profileAnno.name, {
  //           x: annoX,
  //           y: nameYPdfLib,
  //           size: nameFontSize,
  //           font: helveticaBoldFont,
  //           color: rgb(nameR, nameG, nameB),
  //           rotate: profileRotation,
  //           maxWidth: pageWidth * 0.8,
  //         });
  //         currentYOffsetFromTopPercent += (nameFontSize * 1.5 / pageHeight * 100) + 0.5; // Add 0.5% spacing

  //         // 3. Draw Wallet Address
  //         const walletFontSize = parseFontSizeToPoints(profileAnno.walletAddressFontSize || "10pt", 10);
  //         const walletColorStr = profileAnno.walletAddressColor || '#333333';
  //         const walletR = parseInt(walletColorStr.substring(1, 3), 16) / 255;
  //         const walletG = parseInt(walletColorStr.substring(3, 5), 16) / 255;
  //         const walletB = parseInt(walletColorStr.substring(5, 7), 16) / 255;
  //         const walletYPdfLib = pageHeight - (currentYOffsetFromTopPercent / 100 * pageHeight) - walletFontSize;

  //         page.drawText(profileAnno.walletAddress, {
  //           x: annoX,
  //           y: walletYPdfLib,
  //           size: walletFontSize,
  //           font: helveticaFont,
  //           color: rgb(walletR, walletG, walletB),
  //           rotate: profileRotation,
  //           maxWidth: pageWidth * 0.8,
  //         });
  //       }
  //     }

  //     const pdfBytes = await pdfDoc.save();
  //     const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  //     const link = document.createElement('a');
  //     link.href = URL.createObjectURL(blob);
  //     link.download = `${pdfFile.name.replace('.pdf', '')}_annotated.pdf`;
  //     document.body.appendChild(link);
  //     link.click();
  //     document.body.removeChild(link);
  //     toaster.create({ title: "Download Started", description: "Your annotated PDF is downloading." });
  //   } catch (error) {
  //     console.error("Failed to save PDF:", error);
  //     toaster.create({ title: "Download Failed", description: "Could not generate the annotated PDF.", type: "error" });
  //   }
  // };

  const handleAnnotationRotation = (direction: 'cw' | 'ccw') => {
    if (!selectedAnnotationId) return;
    const annotation = annotations.find(a => a.id === selectedAnnotationId);
    if (annotation) {
      const currentRotation = annotation.rotation || 0;
      const newRotation = direction === 'cw' ? (currentRotation + 15) % 360 : (currentRotation - 15 + 360) % 360;
      updateAnnotation({ ...annotation, rotation: newRotation });
    }
  };

  useEffect(() => {
    if (onAnnotationUpdate) {
      let newSignatureDataPositions: SignatureData[] = annotations.map((annotation: any) => ({
        id: annotation.id,
        height: 0,
        width: 0,
        x: annotation.x,
        y: annotation.y,
        page: annotation.page,
        name: annotation.name,
        walletAddress: annotation.walletAddress,
        hash: "",
        createdAt: new Date(),
        dataUrl: annotation.imageSrc,
        isDragging: false,
        signatureId: "",
      }))
      onAnnotationUpdate(newSignatureDataPositions)
    }
  }, [annotations])

  useEffect(() => {

    if (signaturesInDocument) {
      const existingAnnotations = signaturesInDocument.map((signature) => ({
        // ...signature,
        type: "profile" as const,
        imageAlt: signature.name,
        rotation: 0,
        imageSrc: signature.dataUrl,
        imageWidth: "140px",
        imageHeight: "80px",
        page: parseInt(signature.page.toString()),
        "id": signature.id,
        "x": signature.x,
        "y": signature.y,
        "name": signature.name,
        "walletAddress": signature.walletAddress,

      }))
      console.log("Existing: ", existingAnnotations)
      setAnnotations(prev => [...prev, ...existingAnnotations])
    }
  }, [signaturesInDocument])

  return (
    <Box h={"100%"}>
      {/* <Box h={"70px"} p={4}>
        <Container>
          <Stack gap={4} align={"center"}>
            <HStack className="flex items-center gap-2 flex-wrap" gap={2}>
              <Input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
                ref={fileInputRef}
                id="pdf-upload"
              />
              <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                <FileUp className="mr-2 h-4 w-4" /> Upload PDF
              </Button>
              <Button
                variant={selectedTool === 'text' ? 'ghost' : 'outline'}
                onClick={() => setSelectedTool(selectedTool === 'text' ? null : 'text')}
                disabled={!pdfFile}
              >
                <Type className="mr-2 h-4 w-4" /> Add Text
              </Button>
              <Button
                variant={selectedTool === 'image' ? 'ghost' : 'outline'}
                onClick={() => setSelectedTool(selectedTool === 'image' ? null : 'image')}
                disabled={!pdfFile}
              >
                <ImagePlus className="mr-2 h-4 w-4" /> Add Image
              </Button>
              <Button
                variant={selectedTool === 'profile' ? 'ghost' : 'outline'}
                onClick={() => setSelectedTool(selectedTool === 'profile' ? null : 'profile')}
                disabled={!pdfFile}
              >
                <UserCircle className="mr-2 h-4 w-4" /> Add Profile
              </Button>
              <Button onClick={handleDownload} disabled={!pdfFile}>
                <Download className="mr-2 h-4 w-4" /> Download
              </Button>
            </HStack>
          </Stack>
        </Container>
      </Box> */}
      <Box h={"100%"}>
        <Grid
          // templateRows="repeat(2, 1fr)"
          templateColumns="repeat(12, 1fr)"
          gap={0}
          h={"100%"}
        >
          <GridItem bg={"gray.100"} colSpan={{ base: 12, md: 9 }} overflowX={"auto"} overflowY={"scroll"} height={"100%"}>
            <Box h={"100%"} p={0} m={0} >
              {/* {pdfFile && (
                <HStack gap={6} borderBottom={`1px solid`} borderColor={"gray.300"} p={2} justify={'center'} align={"center"} className="bg-muted/30 p-2 border-b flex items-center justify-center gap-4 print:hidden">
                  <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} variant="ghost" size="md"><ArrowLeft /></Button>
                  <Text fontSize={"sm"} fontWeight={400} color={"gray.700"} className="text-sm font-medium">Page {currentPage} of {numPages}</Text>
                  <IconButton onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} disabled={currentPage >= numPages || numPages === 0} variant="subtle" size="md"><ArrowRight /></IconButton>
                  <IconButton onClick={() => setScale(s => Math.max(0.25, s - 0.25))} variant="subtle" size="md"><ZoomOut /></IconButton>
                  <Slider
                    value={[scale]}
                    min={0.25} max={3} step={0.01}
                    onValueChange={(value) => setScale(value.value[0])}
                    w={{ base: "210%", md: "20%" }}
                  />
                  <IconButton onClick={() => setScale(s => Math.min(3, s + 0.25))} variant="ghost" size="md"><ZoomIn /></IconButton>
                  {selectedAnnotationId && (
                    <>
                      <IconButton onClick={() => handleAnnotationRotation('ccw')} variant="ghost" size="md" title="Rotate Counter-Clockwise"><RotateCcw /></IconButton>
                      <IconButton onClick={() => handleAnnotationRotation('cw')} variant="ghost" size="md" title="Rotate Clockwise"><RotateCw /></IconButton>
                    </>
                  )}
                </HStack>
              )} */}
              <PdfRenderer
                pdfFile={pdfFile}
                annotations={annotations}
                onAnnotationAdd={addAnnotation}
                onAnnotationUpdate={updateAnnotation}
                onAnnotationDelete={deleteAnnotation}
                selectedTool={selectedTool}
                // currentPage={currentPage}
                // onPageChange={setCurrentPage}
                // numPages={numPages}
                // setNumPages={setNumPages}
                // scale={scale}
                // setScale={setScale}
                selectedAnnotationId={selectedAnnotationId}
                onAnnotationSelect={setSelectedAnnotationId}
                onAnnotationRotate={handleAnnotationRotation}
              />
            </Box>
          </GridItem>
          <GridItem colSpan={{ base: 12, md: 3 }} bg={"gray.100"} overflow={"hidden"}>
            <Box p={4} h={"100%"} overflowY={"scroll"} overflowX={"hidden"} wordBreak={"break-word"}>
              <Stack>
                {
                  mySignatures.length > 0 ? (
                    <Stack bg={"white"} p={2}>
                      <Heading fontWeight={500}>My Signature(s)</Heading>
                      {
                        mySignatures.map((signature) => (
                          <Box
                            key={signature.hash}
                            p={2}
                            cursor="pointer"
                            borderRadius={"md"}
                            borderEndRadius={"md"}
                            bg={selectedSignatureHash === signature.hash ? "blue.50" : "gray.100"}
                            _hover={{ bg: "blue.50" }}
                            border={"2px solid"}
                            borderColor={selectedSignatureHash === signature.hash ? "blue.600" : "transparent"}
                            onClick={() => {
                              console.log(`Signature clicked ${JSON.stringify(signature, null, 4)} -- ${signature.hash} -- ${signature.id}`)
                              setSelectedTool("profile");
                              selectSignature(signature.hash)
                              setSelectedSignatureHash(signature.hash)
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
                        ))
                      }
                    </Stack>
                  ) : (
                    <>
                      {displayUserSignatures ? displayUserSignatures() : null}
                    </>
                  )
                }

                {canPlaceSignature ? (
                  <Alert colorPalette={"blue"} variant={"subtle"} title="Click on the document to place your signature" icon={<LuInfo />} />
                ) : null}

                <Button onClick={() => {
                  setSelectedTool("profile");
                  setSelectedSignatureHash(selectedSignatureHash as any)
                  setCanPlaceSignature(true)
                }}>
                  Add Signature
                </Button>

                <AnnotationSidebar
                  annotations={annotations}
                  onAnnotationUpdate={updateAnnotation}
                  onAnnotationDelete={deleteAnnotation}
                  selectedAnnotationId={selectedAnnotationId}
                  onAnnotationSelect={setSelectedAnnotationId}
                />
                <Box>
                  <Button
                    colorPalette={'green'} variant={'solid'}
                    colorScheme="white"
                    disabled={annotations.length === 0}
                    // disabled={!pdfDoc || !signatureDataUrl || signaturePositions.length === 0}
                    onClick={handleSignatureSubmission}
                    loading={submittingSignatureData}
                  >
                    Sign document
                  </Button>
                </Box>
              </Stack>
            </Box>
          </GridItem>
          {/* </div> */}
        </Grid>
      </Box>
    </Box>
  );
}
