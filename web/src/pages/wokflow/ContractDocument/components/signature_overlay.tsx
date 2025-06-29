import { useEffect, useState } from 'react';
import {
    Box,
    Text,
    Stack,
} from '@chakra-ui/react';
// import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
// import { PDFJSViewer } from 'pdfjs-react-viewer';
import { useColorMode } from '../../../../components/chakra-ui/color-mode';
import { SignatureData } from "../../../../types/types"
import { EasyPDFRenderer } from '../signer/SignerPage';
import { handleLoadFromUrl } from '../../../../utils/functions';
import { toaster } from '../../../../components/chakra-ui/toaster';


export const SignatureOverlay = ({ signature, currentPage, pdfMainContainerRef, handleDragStart }: { signature: SignatureData, currentPage: number, pdfMainContainerRef: React.RefObject<HTMLDivElement>, handleDragStart?: (e: React.MouseEvent | React.TouchEvent, id: string) => void }) => {
    if (!pdfMainContainerRef) return null;
    if (signature.page !== currentPage || !signature.signatureId) return null;

    // console.log(`Signature overlay ${JSON.stringify(position, null, 2)} ---- ${JSON.stringify(signatures, null, 2)}`);
    // const signature = signatures.find(sig => sig.id === position.signatureId);
    // if (!signature) return <></>;

    // return <Text>{JSON.stringify(position, null, 4)}</Text>
    // Find the actual PDF element for proper positioning
    const pdfElement = pdfMainContainerRef.current?.querySelector('.react-pdf__Page');
    const pdfRect = pdfElement?.getBoundingClientRect();

    // if (!pdfElement || !pdfRect) return null;
    console.log("PDF rect", pdfRect)
    return (
        <Box
            position="absolute"
            left={`calc(${Number(signature.x) * 100}% - 40px)`} // Adjusted for better visibility
            top={`calc(${(1 - Number(signature.y)) * 100}% )`} // Adjusted for better visibility
            transform="translate(-50%, -50%)"
            backgroundSize="contain"
            backgroundRepeat="no-repeat"
            backgroundPosition="center"
            pointerEvents="auto"
            cursor={signature.isDragging ? "grabbing" : "grab"}
            zIndex={signature.isDragging ? 20 : 10}
            onMouseDown={(e) => handleDragStart?.(e, signature.id)}
            onTouchStart={(e) => handleDragStart?.(e, signature.id)}
            border={signature.isDragging ? "2px dashed blue" : "none"}
            transition="border 0.2s ease"
            overflow={"hidden"}
            _hover={{ boxShadow: "0 0 0 1px blue" }}
            style={{
                // width: `${position.width * 100}%`,
                maxWidth: "250px",
                // height: `${position.height * 100}%`,
                // backgroundColor: 'rgba(255, 255, 255, 0.9)',
                padding: '4px',
                borderRadius: '4px',
                border: "1px solid rgb(216, 216, 216)"
            }}
        >
            <Stack gap={1} justifyContent={"flex-start"} height="100%">
                {/* <Text fontSize="xs" color="gray.600" style={{ overflow: 'auto', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{signature.name}</Text>
                <Box
                    flex="1"
                    backgroundImage={`url(${signature.dataUrl})`}
                    backgroundSize="contain"
                    backgroundRepeat="no-repeat"
                    backgroundPosition="left"
                    minHeight="40px"
                />
                <Text fontSize="xs" color="gray.600" style={{ overflow: 'auto', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{signature.walletAddress}</Text> */}
                <Box
                    flex="1"
                    backgroundImage={`url(${signature.dataUrl})`}
                    backgroundSize="contain"
                    backgroundRepeat="no-repeat"
                    backgroundPosition="left"
                    width={"240px"}
                    height={"290px"}
                    minHeight="40px"
                    minWidth={"150px"}
                />
                <Text fontSize="xs" color="gray.600">{signature.name}</Text>
                <Text fontSize="xs" overflow={'hidden'} color="gray.600">{signature.walletAddress}</Text>
            </Stack>
        </Box>
    );
};


export const SimpleSignatureOverlay = ({ signature, currentPage }: { signature: SignatureData, currentPage: number }) => {
    // const { colorMode } = useColorMode();
    // const isDarkMode = colorMode === "dark";
    return (
        <Box
            display={Number(currentPage) === Number(signature.page) ? "block" : "none"}
            position="absolute"
            left={`calc(${Number(signature.x) * 100}% - 40px)`} // Adjusted for better visibility
            top={`calc(${(1 - Number(signature.y)) * 100}% - 40px)`} // Adjusted for better visibility
            transform={`translate(-${Number(signature.width) * 50}%, -${Number(signature.height) * 50}%)`}
            backgroundSize="contain"
            backgroundRepeat="no-repeat"
            backgroundPosition="center"
            pointerEvents="auto"
            transition="border 0.2s ease"
            overflow={"hidden"}
            // border={"2px solid red"}
            // _hover={{ boxShadow: "0 0 0 1px rgba(255, 255, 255, 0.9)" }}
            style={{
                // width: `${Number(signature.width) * 100}%`,
                maxWidth: "250px",
                // height: `${Number(signature.height) * 100}%`,
                // backgroundColor: 'rgba(104, 12, 12, 0.9)',
                padding: '4px',
                borderRadius: '4px',
                border: "1px solid rgb(216, 216, 216)"
            }}
        >
            <Stack gap={1} justifyContent={"flex-start"} height="100%" borderRadius={"lg"} style={{
                padding: "6px"
            }}>
                <Box
                    flex="1"
                    backgroundImage={`url(${signature.dataUrl})`}
                    backgroundSize="contain"
                    backgroundRepeat="no-repeat"
                    backgroundPosition="left"
                    width={"240px"}
                    height={"290px"}
                    minHeight="40px"
                    minWidth={"150px"}
                />
                <Text fontSize="xs" color="gray.600">{signature.name}</Text>
                <Text fontSize="xs" overflow={'hidden'} color="gray.600">{signature.walletAddress}</Text>
            </Stack>
        </Box>
    )
}


export const PDFDisplayWithJustSimpleOverlay = ({ pdfUrl, signatures }: { pdfUrl: string, signatures: SignatureData[], annotationsInDocument :SignatureData[]  }) => {
    const { colorMode } = useColorMode();
    const [pdfFile, setPdfFile] = useState<File | null>(null);

    useEffect(() => {
        const loadPdf = async () => {
            try {
                const result = await handleLoadFromUrl(pdfUrl, "Contract document.pdf", toaster);
                if (!result.error) {
                    setPdfFile(result.file);
                }
            } catch (error) {
                console.error("Error loading PDF:", error);
            }
        };
        loadPdf();

    }, [pdfUrl]);

    if (!pdfFile) return <p>Loading PDF...</p>;

    return (
        <Box
            position="relative"
            border="1px solid"
            borderColor={colorMode === "dark" ? "gray.800" : "gray.100"}
            borderRadius="md"
            py={"4"}
        >
            <EasyPDFRenderer
                pdfFile={pdfFile}
                annotationsInDocument={signatures}
                annotations={signatures.map((signature) => ({
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

                }))}
            />
        </Box>
    )
}

