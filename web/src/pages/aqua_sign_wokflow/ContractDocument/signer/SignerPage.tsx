import { useState, useCallback, useEffect } from 'react'
import type { Annotation } from './types'
import PdfViewer from './pdf-viewer'
import AnnotationSidebar from './annotation-sidebar'
import { ZoomIn, ZoomOut, ArrowLeft, ArrowRight } from 'lucide-react'
import { SignatureData } from '../../../../types/types'
import { LuInfo } from 'react-icons/lu'
import { Button } from '../../../../components/ui/button'
import { Slider } from '../../../../components/ui/slider'
// import { ScrollArea } from '@/components/ui/scroll-area';

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
    pdfFile: File | null
    annotations: Annotation[]
    annotationsInDocument: SignatureData[]
    onAnnotationAdd: (newAnnotationData: Annotation) => void
    onAnnotationUpdate: (updatedAnnotation: Annotation) => void
    onAnnotationDelete: (id: string) => void
    selectedTool: 'text' | 'image' | 'profile' | 'signature' | null
    selectedAnnotationId: string | null
    onAnnotationSelect: (id: string | null) => void
    onAnnotationRotate: (direction: 'cw' | 'ccw') => void
}

function PdfRendererComponent({
    pdfFile,
    annotations,
    annotationsInDocument,
    onAnnotationAdd,
    onAnnotationUpdate,
    onAnnotationDelete,
    selectedTool,
    selectedAnnotationId,
    onAnnotationSelect,
}: PdfRendererProps) {
    const [currentPage, setCurrentPage] = useState(1)
    const [numPages, setNumPages] = useState(0)
    const [scale, setScale] = useState(1.15)

    return (
        <div className="h-auto md:h-full w-full max-h-auto md:max-h-full max-w-full">
            {pdfFile && (
                <div className="!h-[60px] !max-h-[60px] w-full flex items-center justify-center gap-2 p-2 bg-gray-100 border-b border-gray-300">
                    <Button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        variant="ghost"
                        size="icon"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <p className="text-sm font-medium text-gray-700">
                        Page {currentPage} of {numPages}
                    </p>
                    <Button
                        onClick={() =>
                            setCurrentPage(p => Math.min(numPages, p + 1))
                        }
                        disabled={currentPage >= numPages || numPages === 0}
                        variant="ghost"
                        size="icon"
                    >
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                        onClick={() => setScale(s => Math.max(0.25, s - 0.25))}
                        variant="ghost"
                        size="icon"
                    >
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <div className="w-full md:w-1/5">
                        <Slider
                            value={[scale]}
                            min={0.25}
                            max={3}
                            step={0.01}
                            onValueChange={(value: any) => setScale(value[0])}
                        />
                    </div>
                    <Button
                        onClick={() => setScale(s => Math.min(3, s + 0.25))}
                        variant="ghost"
                        size="icon"
                    >
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                </div>
            )}
            <div
                className={
                    'h-auto md:h-[calc(100%-60px)] w-full md:w-full max-h-auto md:max-h-full !max-w-full overflow-x-auto px-[10px]'
                }
            >
                {/* <ScrollArea className='h-auto md:h-full'> */}
                <PdfViewer
                    file={pdfFile}
                    annotations={annotations}
                    annotationsInDocument={annotationsInDocument}
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
                {/* </ScrollArea> */}
            </div>
        </div>
    )
}

// Memoize the PdfRenderer component to prevent unnecessary re-renders
// export const PdfRenderer = React.memo(PdfRendererComponent, (prevProps, nextProps) => {
//   // Only re-render if file or annotations change
//   return (
//     prevProps.pdfFile === nextProps.pdfFile &&
//     prevProps.annotations === nextProps.annotations
//   );
// });

export const PdfRenderer = PdfRendererComponent

interface EasyPDFRendererProps {
    pdfFile: File | null
    annotations: Annotation[]
    annotationsInDocument: SignatureData[]
}

export const EasyPDFRenderer = ({
    pdfFile,
    annotations,
    annotationsInDocument,
}: EasyPDFRendererProps) => {
    // console.log("existing annotations: ", annotations)
    return (
        <PdfRenderer
            pdfFile={pdfFile}
            annotations={annotations.map((anno: any) => ({
                ...anno,
                type: 'signature' as any,
                dataUrl: anno.dataUrl || anno.imageSrc,
            }))}
            annotationsInDocument={annotationsInDocument}
            onAnnotationAdd={(_newAnnotationData: Omit<Annotation, 'id'>) => {}}
            onAnnotationUpdate={(_updatedAnnotation: Annotation) => {}}
            onAnnotationDelete={(_id: string) => {}}
            selectedTool={'text'}
            selectedAnnotationId={null}
            onAnnotationSelect={(_annotatedid: string | null) => {}}
            onAnnotationRotate={(_direction: 'cw' | 'ccw') => {}}
        />
    )
}

interface PdfSignerProps {
    file: File | null
    mySignatures: SignatureData[]
    annotationsInDocument: SignatureData[]
    displayUserSignatures?: () => void
    selectSignature: (id: string) => void
    selectedSignatureHash?: string | null
    onAnnotationUpdate: (positions: SignatureData[]) => void
    handleSignatureSubmission: () => void
    submittingSignatureData: boolean
    signaturesInDocument: SignatureData[]
}

export default function SignerPage({
    file,
    mySignatures,
    annotationsInDocument,
    displayUserSignatures,
    selectSignature,
    selectedSignatureHash,
    onAnnotationUpdate,
    handleSignatureSubmission,
    submittingSignatureData,
    signaturesInDocument,
}: PdfSignerProps) {
    const pdfFile = file
    // const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [annotations, setAnnotations] = useState<Annotation[]>([])
    const [selectedTool, setSelectedTool] = useState<
        'text' | 'image' | 'profile' | null
    >(null)
    const [_selectedSignatureHash, setSelectedSignatureHash] = useState<
        string | null
    >(null)
    const [canPlaceSignature, setCanPlaceSignature] = useState(false)
    // const [currentPage, setCurrentPage] = useState(1);
    // const [numPages, setNumPages] = useState(0);
    // const [scale, setScale] = useState(1.0);
    const [selectedAnnotationId, setSelectedAnnotationId] = useState<
        string | null
    >(null)

    const addAnnotation = useCallback(
        (newAnnotationData: Annotation) => {
            const id =
                Date.now().toString() +
                Math.random().toString(36).substring(2, 9)
            const selectedSignatureInfo = mySignatures.find(
                signature => signature.hash === _selectedSignatureHash
            )
            console.log('Here', _selectedSignatureHash, mySignatures)
            if (!selectedSignatureInfo) {
                return
            }
            const newAnnotation = {
                ...newAnnotationData,
                id,
                imageSrc:
                    selectedSignatureInfo.dataUrl ?? '/images/preview.jpg',
                name: selectedSignatureInfo.name,
                walletAddress: selectedSignatureInfo.walletAddress,
            }
            setAnnotations((prev: any) => [...prev, newAnnotation])
            setSelectedTool(null)
            setCanPlaceSignature(false)
            setSelectedSignatureHash(null)
            setSelectedAnnotationId(id)
        },
        [mySignatures, _selectedSignatureHash]
    )

    const updateAnnotation = useCallback((updatedAnnotation: Annotation) => {
        setAnnotations(prev =>
            prev.map(anno =>
                anno.id === updatedAnnotation.id ? updatedAnnotation : anno
            )
        )
    }, [])

    const deleteAnnotation = useCallback(
        (id: string) => {
            setAnnotations(prev => prev.filter(anno => anno.id !== id))
            if (selectedAnnotationId === id) {
                setSelectedAnnotationId(null)
            }
        },
        [selectedAnnotationId]
    )

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
        if (!selectedAnnotationId) return
        const annotation = annotations.find(a => a.id === selectedAnnotationId)
        if (annotation) {
            const currentRotation = annotation.rotation || 0
            const newRotation =
                direction === 'cw'
                    ? (currentRotation + 15) % 360
                    : (currentRotation - 15 + 360) % 360
            updateAnnotation({ ...annotation, rotation: newRotation })
        }
    }

    useEffect(() => {
        if (onAnnotationUpdate) {
            const newSignatureDataPositions: SignatureData[] = annotations.map(
                (annotation: any) => ({
                    id: annotation.id,
                    height: 0,
                    width: 0,
                    x: annotation.x,
                    y: annotation.y,
                    page: annotation.page,
                    name: annotation.name,
                    walletAddress: annotation.walletAddress,
                    hash: '',
                    createdAt: new Date(),
                    dataUrl: annotation.imageSrc,
                    isDragging: false,
                    signatureId: '',
                    type: annotation.type ?? 'signature',
                    rotation: annotation.rotation ?? 0,
                    imageWidth: annotation.imageWidth ?? '140px',
                    imageHeight: annotation.imageHeight ?? '80px',
                    imageAlt: annotation.imageAlt ?? annotation.name ?? '',
                })
            )
            onAnnotationUpdate(newSignatureDataPositions)
        }
    }, [annotations])

    useEffect(() => {
        if (signaturesInDocument) {
            const existingAnnotations = signaturesInDocument.map(signature => ({
                // ...signature,
                type: 'profile' as const,
                imageAlt: signature.name,
                rotation: 0,
                imageSrc: signature.dataUrl,
                imageWidth: '140px',
                imageHeight: '80px',
                page: parseInt(signature.page.toString()),
                id: signature.id,
                x: signature.x,
                y: signature.y,
                name: signature.name,
                walletAddress: signature.walletAddress,
            }))
            console.log('Existing: ', existingAnnotations)
            setAnnotations(prev => [...prev, ...existingAnnotations])
        }
    }, [signaturesInDocument])

    return (
        <div className="h-auto md:h-full">
            <div className="h-auto md:h-full">
                <div className="grid grid-cols-12 gap-0 h-auto md:h-full">
                    <div className="bg-gray-100 col-span-12 md:col-span-9 overflow-x-auto overflow-y-scroll h-full">
                        <div className="h-auto md:h-full p-0 m-0">
                            <PdfRenderer
                                pdfFile={pdfFile}
                                annotations={annotations}
                                annotationsInDocument={annotationsInDocument}
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
                        </div>
                    </div>
                    <div className="col-span-12 md:col-span-3 bg-gray-100 overflow-hidden">
                        <div className="p-4 h-auto md:h-full overflow-y-scroll overflow-x-hidden break-words">
                            <div className="flex flex-col space-y-4">
                                {mySignatures.length > 0 ? (
                                    <div className="flex flex-col space-y-2 bg-white p-2">
                                        <h2 className="font-medium text-lg">
                                            My Signature(s)
                                        </h2>
                                        {mySignatures.map(signature => (
                                            <div
                                                key={signature.hash}
                                                className={`p-2 cursor-pointer rounded-md ${selectedSignatureHash === signature.hash ? 'bg-blue-50 border-blue-600' : 'bg-gray-100 border-transparent'} hover:bg-blue-50 border-2`}
                                                onClick={() => {
                                                    console.log(
                                                        `Signature clicked ${JSON.stringify(signature, null, 4)} -- ${signature.hash} -- ${signature.id}`
                                                    )
                                                    setSelectedTool('profile')
                                                    selectSignature(
                                                        signature.hash
                                                    )
                                                    setSelectedSignatureHash(
                                                        signature.hash
                                                    )
                                                }}
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div
                                                        className="w-[60px] h-[40px] bg-contain bg-no-repeat bg-center border border-gray-200 rounded-sm"
                                                        style={{
                                                            backgroundImage: `url(${signature.dataUrl})`,
                                                        }}
                                                    />
                                                    <div className="flex flex-col space-y-0">
                                                        <p className="text-sm font-medium">
                                                            {signature.name}
                                                        </p>
                                                        <p className="text-xs text-gray-600">
                                                            {signature
                                                                .walletAddress
                                                                .length > 10
                                                                ? `${signature.walletAddress.substring(0, 6)}...${signature.walletAddress.substring(signature.walletAddress.length - 4)}`
                                                                : signature.walletAddress}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <>
                                        {displayUserSignatures
                                            ? displayUserSignatures()
                                            : null}
                                    </>
                                )}

                                {canPlaceSignature ? (
                                    <div className="bg-blue-50 border border-blue-200  rounded-lg p-3 flex items-start space-x-3">
                                        <LuInfo className="h-5 w-5 mt-0.5" />
                                        <div>
                                            <p className="font-medium">
                                                Click on the document to place
                                                your signature.
                                            </p>
                                        </div>
                                    </div>
                                ) : null}

                                <Button
                                    data-testid="action-add-signature-11-button"
                                    onClick={() => {
                                        setSelectedTool('profile')
                                        setSelectedSignatureHash(
                                            selectedSignatureHash as any
                                        )
                                        setCanPlaceSignature(true)
                                    }}
                                >
                                    Add Signature
                                </Button>

                                <AnnotationSidebar
                                    annotations={annotations}
                                    onAnnotationUpdate={updateAnnotation}
                                    onAnnotationDelete={deleteAnnotation}
                                    selectedAnnotationId={selectedAnnotationId}
                                    onAnnotationSelect={setSelectedAnnotationId}
                                />
                                <div>
                                    <Button
                                        data-testid="action-sign-signature-111-button"
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        disabled={annotations.length === 0}
                                        // disabled={!pdfDoc || !signatureDataUrl || signaturePositions.length === 0}
                                        onClick={handleSignatureSubmission}
                                    >
                                        {submittingSignatureData ? (
                                            <>
                                                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em]"></span>
                                                Processing...
                                            </>
                                        ) : (
                                            'Sign document'
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
