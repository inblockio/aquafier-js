import { useState } from 'react';
import {
    Box,
    Text,
    Stack,
    Center} from '@chakra-ui/react';
// import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PDFJSViewer } from 'pdfjs-react-viewer';
import { useColorMode } from '../../../components/chakra-ui/color-mode';
import { SignaturePosition, SignatureData, IQuickSignature } from "../../../types/types"


export const SignatureOverlay = ({ position, currentPage, signatures, pdfMainContainerRef, handleDragStart }: { position: SignaturePosition, currentPage: number, signatures: SignatureData[], pdfMainContainerRef: React.RefObject<HTMLDivElement>, handleDragStart?: (e: React.MouseEvent | React.TouchEvent, id: string) => void }) => {
    if (!pdfMainContainerRef) return null;
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
            onMouseDown={(e) => handleDragStart?.(e, position.id)}
            onTouchStart={(e) => handleDragStart?.(e, position.id)}
            border={position.isDragging ? "2px dashed blue" : "none"}
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
                    minHeight="40px"
                    minWidth={"150px"}
                />
                <Text fontSize="xs" color="gray.600">{signature.name}</Text>
                <Text fontSize="xs" overflow={'hidden'} color="gray.600">{signature.walletAddress}</Text>
            </Stack>
        </Box>
    );
};


export const SimpleSignatureOverlay = ({ signature, currentPage }: { signature: IQuickSignature, currentPage: number }) => {
    // const { colorMode } = useColorMode();
    // const isDarkMode = colorMode === "dark";
    return (
        <Box
            display={Number(currentPage) === Number(signature.page) ? "block" : "none"}
            position="absolute"
            left={`${Number(signature.x) * 100}%`}
            top={`${(1 - Number(signature.y)) * 100}%`}
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
                    backgroundImage={`url(${signature.image})`}
                    backgroundSize="contain"
                    backgroundRepeat="no-repeat"
                    backgroundPosition="left"
                    minHeight="40px"
                    minWidth={"150px"}
                />
                <Text fontSize="xs" color="gray.600">{signature.name}</Text>
                <Text fontSize="xs" overflow={'hidden'} color="gray.600">{signature.walletAddress}</Text>
            </Stack>
        </Box>
    )
}


export const PDFDisplayWithJustSimpleOverlay = ({ pdfUrl, signatures }: { pdfUrl: string, signatures: IQuickSignature[] }) => {
    const { colorMode } = useColorMode();
    const [currentPage, setCurrentPage] = useState<number>(1);

    return (
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
                        pdfUrl={pdfUrl}
                        onPageChange={(page) => {
                            setCurrentPage(page)
                        }}
                    />
                </Box>
            </Center>

            {/* Signature overlays */}
            {signatures.map((signature, index) => (
                <>
                    {
                        Number(currentPage) === Number(signature.page) ? (
                            <SimpleSignatureOverlay key={index} signature={signature} currentPage={currentPage}
                            />
                        ) : null
                    }
                </>
            ))}
        </Box>
    )
}
