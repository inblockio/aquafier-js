import { useEffect, useState } from 'react';
// import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
// import { PDFJSViewer } from 'pdfjs-react-viewer';
import { SignatureData } from "../../../../../types/types"
import { EasyPDFRenderer } from '../signer/SignerPage';
import { handleLoadFromUrl } from '../../../../../utils/functions';
import { toast } from 'sonner';


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
        <div
            className="absolute overflow-hidden hover:shadow-[0_0_0_1px_blue] transition-[border] duration-200 ease-in-out"
            style={{
                left: `calc(${Number(signature.x) * 100}% - 40px)`, // Adjusted for better visibility
                top: `calc(${(1 - Number(signature.y)) * 100}%)`, // Adjusted for better visibility
                transform: "translate(-50%, -50%)",
                backgroundSize: "contain",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                pointerEvents: "auto",
                cursor: signature.isDragging ? "grabbing" : "grab",
                zIndex: signature.isDragging ? 20 : 10,
                border: signature.isDragging ? "2px dashed blue" : "none",
                maxWidth: "250px",
                padding: '4px',
                borderRadius: '4px',
                borderColor: "rgb(216, 216, 216)"
            }}
            onMouseDown={(e) => handleDragStart?.(e, signature.id)}
            onTouchStart={(e) => handleDragStart?.(e, signature.id)}
        >
            <div className="flex flex-col gap-1 justify-start h-full">
                {/* Commented out section preserved
                <p className="text-xs text-gray-600 overflow-auto text-ellipsis whitespace-nowrap">{signature.name}</p>
                <div
                    className="flex-1 bg-contain bg-no-repeat bg-left min-h-[40px]"
                    style={{ backgroundImage: `url(${signature.dataUrl})` }}
                />
                <p className="text-xs text-gray-600 overflow-auto text-ellipsis whitespace-nowrap">{signature.walletAddress}</p> */}
                <div
                    className="flex-1 bg-contain bg-no-repeat bg-left min-h-[40px] min-w-[150px]"
                    style={{
                        backgroundImage: `url(${signature.dataUrl})`,
                        width: "240px",
                        height: "290px"
                    }}
                />
                <p className="text-xs text-gray-600">{signature.name}</p>
                <p className="text-xs text-gray-600 overflow-hidden">{signature.walletAddress}</p>
            </div>
        </div>
    );
};


export const SimpleSignatureOverlay = ({ signature, currentPage }: { signature: SignatureData, currentPage: number }) => {
    // const { colorMode } = useColorMode();
    // const isDarkMode = colorMode === "dark";
    return (
        <div
            className="absolute overflow-hidden transition-[border] duration-200 ease-in-out pointer-events-auto"
            style={{
                display: Number(currentPage) === Number(signature.page) ? "block" : "none",
                left: `calc(${Number(signature.x) * 100}% - 40px)`, // Adjusted for better visibility
                top: `calc(${(1 - Number(signature.y)) * 100}% - 40px)`, // Adjusted for better visibility
                transform: `translate(-${Number(signature.width) * 50}%, -${Number(signature.height) * 50}%)`,
                backgroundSize: "contain",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                // width: `${Number(signature.width) * 100}%`,
                maxWidth: "250px",
                // height: `${Number(signature.height) * 100}%`,
                // backgroundColor: 'rgba(104, 12, 12, 0.9)',
                padding: '4px',
                borderRadius: '4px',
                border: "1px solid rgb(216, 216, 216)"
                // border: "2px solid red"
                // boxShadow: "0 0 0 1px rgba(255, 255, 255, 0.9)"
            }}
        >
            <div 
                className="flex flex-col gap-1 justify-start h-full rounded-lg" 
                style={{ padding: "6px" }}
            >
                <div
                    className="flex-1 bg-contain bg-no-repeat bg-left min-h-[40px] min-w-[150px]"
                    style={{
                        backgroundImage: `url(${signature.dataUrl})`,
                        width: "240px",
                        height: "290px"
                    }}
                />
                <p className="text-xs text-gray-600">{signature.name}</p>
                <p className="text-xs text-gray-600 overflow-hidden">{signature.walletAddress}</p>
            </div>
        </div>
    )
}


export const PDFDisplayWithJustSimpleOverlay = ({ pdfUrl, signatures }: { pdfUrl: string, signatures: SignatureData[], annotationsInDocument :SignatureData[]  }) => {
    const [pdfFile, setPdfFile] = useState<File | null>(null);

    useEffect(() => {
        const loadPdf = async () => {
            try {
                const result = await handleLoadFromUrl(pdfUrl, "Contract document.pdf", toast);
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
        <div
            className='relative border-1 border-gray-200 radius-md py-4'
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
        </div>
    )
}

