

import type React from 'react';
import { useEffect, useRef, useState, useCallback } from 'react';
import type { Annotation, TextAnnotation, ImageAnnotation, ProfileAnnotation } from './types';
import { SignatureData } from '../../../../../types/types';

interface PdfViewerProps {
  file: File | null;
  annotations: Annotation[];
  annotationsInDocument: SignatureData[];
  onAnnotationAdd: (annotation: Annotation) => void;
  onAnnotationUpdate: (annotation: Annotation) => void;
  onAnnotationDelete: (id: string) => void;
  selectedTool: 'text' | 'image' | 'profile' | 'signature' | null;
  currentPage: number;
  onPageChange: (page: number) => void;
  numPages: number;
  setNumPages: (numPages: number) => void;
  scale: number;
  setScale: (scale: number) => void;
  selectedAnnotationId?: string | null;
  onAnnotationSelect: (id: string | null) => void;
}

type ResizeHandleType = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

interface ResizeState {
  annotationId: string;
  handle: ResizeHandleType;
  targetPropertyPrefix?: 'image';
  initialAnnotation: Annotation;
  initialPageDimensions: { width: number; height: number };
  startX: number;
  startY: number;
  initialPixelWidth: number;
  initialPixelHeight: number;
  initialAnnotationXPercent: number;
  initialAnnotationYPercent: number;
}


const PdfViewer: React.FC<PdfViewerProps> = ({
  file,
  annotations,
  annotationsInDocument,
  onAnnotationAdd,
  onAnnotationUpdate,
  // onAnnotationDelete,
  selectedTool,
  currentPage,
  onPageChange,
  numPages,
  setNumPages,
  scale,
  // setScale,
  selectedAnnotationId,
  onAnnotationSelect,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null); // Track current render task
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [isPdfjsLibLoaded, setIsPdfjsLibLoaded] = useState(false);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [pdfLoadingError, setPdfLoadingError] = useState<string | null>(null);

  const [draggingAnnotationId, setDraggingAnnotationId] = useState<string | null>(null);
  const [dragStartOffset, setDragStartOffset] = useState<{ x: number; y: number } | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
      setIsPdfjsLibLoaded(true);
    } else if (typeof window !== 'undefined') {
      console.warn('PDF.js library (window.pdfjsLib) not found on component mount.');
      setPdfLoadingError("PDF viewer library failed to load. Please try refreshing the page.");
    }
  }, []);

  useEffect(() => {
    if (!file || !isPdfjsLibLoaded) {
      setPdfDoc(null);
      setNumPages(0);
      setPageDimensions({ width: 0, height: 0 });
      if (!file || (file && !isPdfjsLibLoaded && !pdfLoadingError?.includes("library failed to load"))) {
        setPdfLoadingError(null);
      }
      if (file && !isPdfjsLibLoaded && !pdfLoadingError) {
        setPdfLoadingError("PDF viewer library is not ready. Waiting for it to load...");
      }
      return;
    }

    setPdfLoadingError(null);
    const reader = new FileReader();
    reader.onload = async (e) => {
      if (!e.target?.result) {
        setPdfLoadingError("Failed to read file.");
        return;
      }
      const typedArray = new Uint8Array(e.target.result as ArrayBuffer);
      try {
        const loadingTask = window.pdfjsLib.getDocument({ data: typedArray });
        const pdf = await loadingTask.promise;

        if (pdf.numPages === 0) {
          setPdfLoadingError("The PDF document has no pages.");
          setPdfDoc(null);
          setNumPages(0);
          onPageChange(0);
          return;
        }

        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        if (currentPage === 0 && pdf.numPages > 0) {
          onPageChange(1);
        } else if (currentPage > pdf.numPages) {
          onPageChange(pdf.numPages);
        } else if (currentPage === 0 && pdf.numPages === 0) {
          onPageChange(0);
        } else if (currentPage < 1 && pdf.numPages > 0) {
          onPageChange(1);
        }
      } catch (error) {
        console.error("Error loading PDF document:", error);
        setPdfLoadingError(`Error loading PDF: ${error instanceof Error ? error.message : String(error)}`);
        setPdfDoc(null);
        setNumPages(0);
        onPageChange(0);
      }
    };
    reader.onerror = (error) => {
      console.error("Error reading file with FileReader:", error);
      setPdfLoadingError("Error reading file. Please ensure it's a valid PDF.");
    };
    reader.readAsArrayBuffer(file);
  }, [file, isPdfjsLibLoaded, setNumPages, onPageChange, currentPage, pdfLoadingError]);

  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || currentPage <= 0 || currentPage > numPages) {
      if (pdfDoc && (currentPage <= 0 || currentPage > numPages) && numPages > 0) {
        setPdfLoadingError(`Cannot render page ${currentPage}: page number is out of range (1-${numPages}).`);
      } else if (!pdfDoc && file && isPdfjsLibLoaded) {
        // This state is handled by the useEffect for PDF loading
      }
      if (!pdfDoc && !pdfLoadingError) setPageDimensions({ width: 0, height: 0 }); // Clear dimensions if no doc and no explicit error
      return;
    }

    try {
      setPdfLoadingError(null);

      // Cancel any existing render task
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }

      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) {
        console.error("Failed to get 2D context from canvas.");
        setPdfLoadingError("Failed to initialize canvas for PDF rendering.");
        setPageDimensions({ width: 0, height: 0 });
        return;
      }

      // Clear the canvas before rendering
      context.clearRect(0, 0, canvas.width, canvas.height);

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      // Store the render task reference
      renderTaskRef.current = page.render(renderContext);

      try {
        await renderTaskRef.current.promise;
        setPageDimensions({ width: viewport.width, height: viewport.height });
        renderTaskRef.current = null; // Clear reference after successful render
      } catch (error: any) {
        // Only handle non-cancellation errors
        if (error.name !== 'RenderingCancelledException') {
          throw error;
        }
        // If cancelled, don't update dimensions or throw error
        renderTaskRef.current = null;
      }
    } catch (error) {
      console.error(`Error rendering PDF page ${currentPage}:`, error);
      setPdfLoadingError(`Error rendering page ${currentPage}: ${error instanceof Error ? error.message : String(error)}`);
      setPageDimensions({ width: 0, height: 0 });
      renderTaskRef.current = null;
    }
  }, [pdfDoc, currentPage, scale, numPages, file, isPdfjsLibLoaded, pdfLoadingError]);

  // Cleanup render task on unmount or when dependencies change
  useEffect(() => {
    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [pdfDoc, currentPage, scale]);

  useEffect(() => {
    if (pdfDoc && currentPage > 0 && currentPage <= numPages && isPdfjsLibLoaded) {
      renderPage();
    } else {
      if (!pdfDoc && file && isPdfjsLibLoaded && !pdfLoadingError) {
        // PDF is not loaded yet, but library is ready and file exists
      } else if (pdfDoc && (currentPage <= 0 || currentPage > numPages) && numPages > 0 && !pdfLoadingError) {
        setPdfLoadingError(`Cannot render page ${currentPage}: page number is out of range (1-${numPages}).`);
      } else if (!pdfDoc && !file) {
        setPageDimensions({ width: 0, height: 0 });
        setPdfLoadingError(null);
      }
    }
  }, [pdfDoc, currentPage, numPages, scale, isPdfjsLibLoaded, renderPage, file, pdfLoadingError]);

  const handleAnnotationMouseDown = useCallback((event: React.MouseEvent, annotation: Annotation) => {
    // This will ALWAYS print, regardless of any conditions
    // console.log(`at the root ... - Annotation ID: ${annotation.id}, Type: ${annotation.type}`);
    // console.log('Event details:', {
    //   target: event.target,
    //   currentTarget: event.currentTarget,
    //   clientX: event.clientX,
    //   clientY: event.clientY
    // });

    // Check if it's a resize handle - if so, don't proceed with drag logic but still log
    if ((event.target as HTMLElement).dataset.resizeHandle) {
      // console.log('Resize handle clicked, returning early');
      return;
    }

    // Prevent default behavior and stop propagation
    event.preventDefault();
    event.stopPropagation();

    // Select the annotation
    onAnnotationSelect(annotation.id);

    if (!canvasRef.current) {
      // console.log('Canvas ref not available');
      return;
    }

    const canvasRect = canvasRef.current.getBoundingClientRect();

    const clickXCanvasPercent = ((event.clientX - canvasRect.left) / canvasRect.width) * 100;
    const clickYCanvasPercent = ((event.clientY - canvasRect.top) / canvasRect.height) * 100;

    // console.log('Setting drag start offset:', {
    //   x: clickXCanvasPercent - annotation.x,
    //   y: clickYCanvasPercent - annotation.y
    // });

    setDragStartOffset({
      x: clickXCanvasPercent - annotation.x,
      y: clickYCanvasPercent - annotation.y,
    });
    setDraggingAnnotationId(annotation.id);
  }, [onAnnotationSelect, canvasRef]);
  const handleDragMove = useCallback((event: MouseEvent) => {
    if (!draggingAnnotationId || !dragStartOffset || !canvasRef.current || !viewerRef.current) return;

    const currentAnnotation = annotations.find(a => a.id === draggingAnnotationId);
    if (!currentAnnotation) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();

    const mouseXOnCanvas = event.clientX - canvasRect.left;
    const mouseYOnCanvas = event.clientY - canvasRect.top;

    let newX = (mouseXOnCanvas / canvasRect.width) * 100 - dragStartOffset.x;
    let newY = (mouseYOnCanvas / canvasRect.height) * 100 - dragStartOffset.y;

    newX = Math.max(0, Math.min(newX, 99.9));
    newY = Math.max(0, Math.min(newY, 99.9));

    onAnnotationUpdate({
      ...currentAnnotation,
      x: newX,
      y: newY,
    });
  }, [draggingAnnotationId, dragStartOffset, annotations, onAnnotationUpdate, canvasRef, viewerRef]);

  const handleDragEnd = useCallback(() => {
    if (draggingAnnotationId) {
      setDraggingAnnotationId(null);
      setDragStartOffset(null);
    }
  }, [draggingAnnotationId]);

  const handleResizeMouseDown = useCallback((
    event: React.MouseEvent,
    annotation: Annotation,
    handle: ResizeHandleType,
    targetPropertyPrefix?: 'image'
  ) => {
    event.preventDefault();
    event.stopPropagation();
    onAnnotationSelect(annotation.id);

    let elementToMeasureId = annotation.id;
    if (targetPropertyPrefix === 'image' && annotation.type === 'profile') {
      elementToMeasureId = `${annotation.id}-image`;
    }

    const annotationElement = viewerRef.current?.querySelector(`[data-annotation-id="${elementToMeasureId}"]`) as HTMLElement;

    if (!annotationElement || !pageDimensions.width || !pageDimensions.height) return;

    const rect = annotationElement.getBoundingClientRect();
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    const initialPixelWidth = rect.width;
    const initialPixelHeight = rect.height;

    let initialElementXPercent = annotation.x;
    let initialElementYPercent = annotation.y;

    setResizeState({
      annotationId: annotation.id,
      handle,
      targetPropertyPrefix,
      initialAnnotation: { ...annotation },
      initialPageDimensions: { ...pageDimensions },
      startX: event.clientX,
      startY: event.clientY,
      initialPixelWidth: initialPixelWidth,
      initialPixelHeight: initialPixelHeight,
      initialAnnotationXPercent: initialElementXPercent,
      initialAnnotationYPercent: initialElementYPercent,
    });
  }, [onAnnotationSelect, pageDimensions, canvasRef]);

  const handleResizeMouseMove = useCallback((event: MouseEvent) => {
    if (!resizeState || !pageDimensions.width || !pageDimensions.height || !canvasRef.current) return;
    event.preventDefault();

    const {
      annotationId,
      handle,
      targetPropertyPrefix,
      // initialAnnotation,
      initialPageDimensions,
      startX,
      startY,
      initialPixelWidth,
      initialPixelHeight,
      initialAnnotationXPercent,
      initialAnnotationYPercent,
    } = resizeState;

    const currentAnnotation = annotations.find(a => a.id === annotationId);
    if (!currentAnnotation) return;

    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;

    let newPixelWidth = initialPixelWidth;
    let newPixelHeight = initialPixelHeight;
    let newBlockXPercent = initialAnnotationXPercent;
    let newBlockYPercent = initialAnnotationYPercent;

    if (handle.includes('Right')) {
      newPixelWidth = initialPixelWidth + deltaX;
    }
    if (handle.includes('Left')) {
      newPixelWidth = initialPixelWidth - deltaX;
      const dxPercentChange = (deltaX / initialPageDimensions.width) * 100;
      newBlockXPercent = initialAnnotationXPercent + dxPercentChange;
    }
    if (handle.includes('bottom')) {
      newPixelHeight = initialPixelHeight + deltaY;
    }
    if (handle.includes('top')) {
      newPixelHeight = initialPixelHeight - deltaY;
      const dyPercentChange = (deltaY / initialPageDimensions.height) * 100;
      newBlockYPercent = initialAnnotationYPercent + dyPercentChange;
    }

    const minPixelSize = 20;
    newPixelWidth = Math.max(newPixelWidth, minPixelSize);
    newPixelHeight = Math.max(newPixelHeight, minPixelSize);

    const finalWidthPercentString = `${((newPixelWidth / initialPageDimensions.width) * 100).toFixed(2)}%`;
    const finalHeightPercentString = `${((newPixelHeight / initialPageDimensions.height) * 100).toFixed(2)}%`;

    const currentWidthPercentNum = parseFloat(finalWidthPercentString);

    newBlockXPercent = Math.max(0, Math.min(newBlockXPercent, 100 - currentWidthPercentNum));
    newBlockYPercent = Math.max(0, Math.min(newBlockYPercent, 100 - parseFloat(finalHeightPercentString)));

    let updatedAnno = { ...currentAnnotation };

    if (currentAnnotation.type === 'image') {
      updatedAnno = {
        ...currentAnnotation,
        x: newBlockXPercent,
        y: newBlockYPercent,
        width: finalWidthPercentString,
        height: finalHeightPercentString,
      };
    } else if (currentAnnotation.type === 'profile' && targetPropertyPrefix === 'image') {
      updatedAnno = {
        ...currentAnnotation,
        x: newBlockXPercent,
        y: newBlockYPercent,
        imageWidth: finalWidthPercentString,
        imageHeight: finalHeightPercentString,
      };
    }

    onAnnotationUpdate(updatedAnno);

  }, [resizeState, annotations, onAnnotationUpdate, pageDimensions, canvasRef]);

  const handleResizeMouseUp = useCallback(() => {
    if (resizeState) {
      setResizeState(null);
    }
  }, [resizeState]);

  useEffect(() => {
    if (draggingAnnotationId) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
      return () => {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
    if (resizeState) {
      document.addEventListener('mousemove', handleResizeMouseMove);
      document.addEventListener('mouseup', handleResizeMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleResizeMouseMove);
        document.removeEventListener('mouseup', handleResizeMouseUp);
      };
    }
  }, [draggingAnnotationId, handleDragMove, handleDragEnd, resizeState, handleResizeMouseMove, handleResizeMouseUp]);

  const handleViewerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (draggingAnnotationId || resizeState) return;

    const target = event.target as HTMLElement;
    if ((target === viewerRef.current || target === canvasRef.current) && !selectedTool && !target.dataset.resizeHandle) {
      onAnnotationSelect(null);
    }

    if (!selectedTool || !viewerRef.current || !pageDimensions.width || !pageDimensions.height || !pdfDoc) return;
    if (target.dataset.resizeHandle || target.closest('[data-annotation-id]')) return;

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    const xRelativeToCanvas = event.clientX - canvasRect.left;
    const yRelativeToCanvas = event.clientY - canvasRect.top;

    const xPercent = (xRelativeToCanvas / canvasRect.width) * 100;
    const yPercent = (yRelativeToCanvas / canvasRect.height) * 100;

    if (xPercent < 0 || xPercent > 100 || yPercent < 0 || yPercent > 100) return;

    if (selectedTool === 'text') {
      const newAnnotation: TextAnnotation = {
        id: crypto.randomUUID(),
        type: 'text',
        page: currentPage,
        x: Math.max(0, Math.min(xPercent, 99.9)),
        y: Math.max(0, Math.min(yPercent, 99.9)),
        width: 20,
        height: 5,
        text: 'New Text',
        fontSize: '12pt',
        fontFamily: 'PT Sans',
        color: '#000000',
        rotation: 0,
      };
      onAnnotationAdd(newAnnotation);
    }
    else if (selectedTool === 'image' || selectedTool === 'profile') {
      if (selectedTool === 'image') {
        const newAnnotation: ImageAnnotation = {
          id: crypto.randomUUID(),
          type: 'image',
          page: currentPage,
          x: Math.max(0, Math.min(xPercent, 99.9)),
          y: Math.max(0, Math.min(yPercent, 99.9)),
          width: "25%",
          height: "15%",
          src: "/images/preview.jpg",
          alt: 'User image',
          rotation: 0,
        };
        onAnnotationAdd(newAnnotation);
      }
      else if (selectedTool === 'profile') {
        const newAnnotation: ProfileAnnotation = {
          id: crypto.randomUUID(),
          type: 'profile',
          page: currentPage,
          x: Math.max(0, Math.min(xPercent, 99.9)),
          y: Math.max(0, Math.min(yPercent, 99.9)),
          name: 'User Name',
          walletAddress: '0x123...',
          imageSrc: "/images/preview.jpg",
          imageAlt: 'Profile picture',
          imageWidth: '50px',
          imageHeight: '50px',
          rotation: 0,
          nameFontSize: "12pt",
          nameColor: '#333333',
          walletAddressFontSize: "10pt",
          walletAddressColor: '#555555',
        };
        onAnnotationAdd(newAnnotation);
      }
    } else if (selectedTool === 'signature') {
      const newAnnotation: SignatureData = {
        id: crypto.randomUUID(),
        type: 'signature',
        page: currentPage,
        x: Math.max(0, Math.min(xPercent, 99.9)),
        y: Math.max(0, Math.min(yPercent, 99.9)),
        name: 'User Name',
        walletAddress: '0x123...',
        // imageSrc: "/images/preview.jpg",
        imageAlt: 'Profile picture',
        width: 300,
        height: 250,
        rotation: 0,
        hash: "err",
        dataUrl: "err",
        createdAt: new Date(),

        nameFontSize: "12pt",
        nameColor: '#333333',
        walletAddressFontSize: "10pt",
        walletAddressColor: '#555555',
        imageWidth: 200,
        imageHeight: 100
      };
      onAnnotationAdd(newAnnotation);
    }
  };

  const annotationsInDocumentOnCurrentPage = annotationsInDocument.filter((anno) => anno.page == currentPage);
  // console.log(`annotationsInDocumentOnCurrentPage ${annotationsInDocumentOnCurrentPage.length} currentPage  ${currentPage} annotationsInDocument ${JSON.stringify(annotationsInDocument, null, 4)}`)
  let annotationsOnCurrentPage = annotations.filter((anno) => anno.page === currentPage);

  if (annotationsInDocumentOnCurrentPage.length > 1) {
    annotationsOnCurrentPage = annotationsOnCurrentPage.filter((e) =>
      !annotationsInDocumentOnCurrentPage.some((exist) => exist.id == e.id)
    )
  }
  const renderResizeHandle = (
    anno: Annotation,
    handleType: ResizeHandleType,
    targetPropertyPrefix?: 'image'
  ) => {
    let cursorStyle = 'default';
    let positionStyle: React.CSSProperties = {};

    switch (handleType) {
      case 'topLeft': cursorStyle = 'nwse-resize'; positionStyle = { top: '-5px', left: '-5px' }; break;
      case 'topRight': cursorStyle = 'nesw-resize'; positionStyle = { top: '-5px', right: '-5px' }; break;
      case 'bottomLeft': cursorStyle = 'nesw-resize'; positionStyle = { bottom: '-5px', left: '-5px' }; break;
      case 'bottomRight': cursorStyle = 'nwse-resize'; positionStyle = { bottom: '-5px', right: '-5px' }; break;
    }

    return (
      <div
        data-resize-handle={handleType}
        className="absolute w-3 h-3 bg-primary border border-primary-foreground rounded-full shadow-md"
        style={{ ...positionStyle, cursor: cursorStyle, zIndex: 20 }}
        onMouseDown={(e) => handleResizeMouseDown(e, anno, handleType, targetPropertyPrefix)}
      />
    );
  };

  function calculateMaxScaleForCanvas(): number {
    if (!pageDimensions) {
      return 1
    }
    const contentWidth = pageDimensions.width; // Replace with your content's original width
    const canvasWidth = pageDimensions.width;  // Replace with your canvas width

    return canvasWidth / contentWidth;
  }

  const maxAllowedScale = calculateMaxScaleForCanvas(); // You'll need to implement this
  const effectiveScale = Math.min(scale, 1, maxAllowedScale);

  // TODO: FIX ME --- This any array is quite not well
  const cleanSignatureToAvoidRepeating = (): any[] => {
    // Given this two arrays, return a single array without repeating either annotations by id
    // [...annotationsOnCurrentPage, ...annotationsInDocumentOnCurrentPage]
    const uniqueAnnotations = annotationsOnCurrentPage.map((anno) => {
      return {
        ...anno,
        type: "signature" as any,
        // dataUrl: anno["imageSrc"],
      }
    })
    annotationsInDocumentOnCurrentPage.forEach((anno) => {
      if (!annotationsOnCurrentPage.some((exist) => exist.id == anno.id)) {
        uniqueAnnotations.push({
          ...anno,
          type: "signature" as any,
          // dataUrl: anno.imageSrc,
        })
      }
    })
    return uniqueAnnotations
  }

  return (
    <div className="py-4 px-2 w-full max-w-full overflow-x-auto" ref={viewerRef} onClick={handleViewerClick}>
      {!file && <p className="text-gray-700 dark:text-gray-400">Upload a PDF to start annotating.</p>}
      {file && !isPdfjsLibLoaded && !pdfLoadingError && <p className="text-gray-700 dark:text-gray-400">Initializing PDF viewer...</p>}
      {pdfLoadingError && <p className="text-center px-4">{pdfLoadingError}</p>}

      {file && isPdfjsLibLoaded && !pdfLoadingError && (
        <>
          {!pdfDoc && !pdfLoadingError && (
            <p className="text-gray-700 dark:text-gray-400">Loading PDF document...</p>
          )}
          {pdfDoc && (
            <div
              className="mx-auto relative flex flex-col justify-start items-center w-fit"
            >
              <div
                className="relative w-fit shadow-lg bg-white"
                style={
                  pageDimensions.width > 0 && pageDimensions.height > 0
                    ? { width: pageDimensions.width, height: pageDimensions.height }
                    : { width: 1, height: 1, visibility: 'hidden' }
                }
              >
                <canvas ref={canvasRef} />
                {pageDimensions.width > 0 && cleanSignatureToAvoidRepeating().map((anno) => {
                  const isSelected = selectedAnnotationId === anno.id || draggingAnnotationId === anno.id || resizeState?.annotationId === anno.id;
                  let baseStyle: React.CSSProperties = {
                    position: 'absolute',
                    left: `${anno.x}%`,
                    top: `${anno.y}%`,
                    // transform: `rotate(${anno.rotation || 0}deg)`,
                    transformOrigin: 'top left',
                    border: isSelected ? '2px solid rgb(26, 146, 216)' : '1px dashed black',
                    cursor: draggingAnnotationId === anno.id || resizeState?.annotationId === anno.id ? 'grabbing' : 'move',
                    userSelect: 'none',
                    boxSizing: 'border-box',
                    transform: `scale(${effectiveScale})`
                  };

                  if (anno.type === 'text') {
                    const textStyle: React.CSSProperties = {
                      ...baseStyle,
                      width: `${anno.width}%`,
                    };
                    return (
                      <div key={anno.id} style={textStyle} data-ai-hint="text annotation" data-annotation-id={anno.id}
                        onMouseDown={(e) => handleAnnotationMouseDown(e, anno)}>
                        <textarea
                          value={anno.text}
                          onChange={(e) => onAnnotationUpdate({ ...anno, text: e.target.value })}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: '100%',
                            fontSize: `${anno.fontSize}pt`,
                            fontFamily: anno.fontFamily,
                            color: anno.color,
                            border: 'none',
                            background: 'transparent',
                            resize: 'none',
                            overflow: 'auto',
                            padding: '2px',
                            boxSizing: 'border-box',
                            cursor: 'text',
                            minHeight: '20px',
                          }}
                        />
                      </div>
                    );
                  } else if (anno.type === 'image') {
                    const imageStyle: React.CSSProperties = {
                      ...baseStyle,
                      width: anno.width,
                      height: anno.height,
                    };
                    return (
                      <div key={anno.id} style={imageStyle} data-ai-hint="image content" data-annotation-id={anno.id}
                        onMouseDown={(e) => handleAnnotationMouseDown(e, anno)}>
                        <img
                          src={anno.src}
                          alt={anno.alt}
                          style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
                        />
                        {isSelected && (
                          <>
                            {renderResizeHandle(anno, 'topLeft')}
                            {renderResizeHandle(anno, 'topRight')}
                            {renderResizeHandle(anno, 'bottomLeft')}
                            {renderResizeHandle(anno, 'bottomRight')}
                          </>
                        )}
                      </div>
                    );
                  }
                  else if (anno.type === 'profile') {
                    const profileAnno = anno as ProfileAnnotation;
                    const profileStyle: React.CSSProperties = {
                      ...baseStyle,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      padding: '5px',
                      backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    };
                    return (
                      <div key={anno.id} style={profileStyle} data-ai-hint="profile annotation" data-annotation-id={anno.id}
                        onMouseDown={(e) => handleAnnotationMouseDown(e, anno)}>
                        <div
                          className="relative"
                          style={{ width: profileAnno.imageWidth, height: profileAnno.imageHeight }}
                          data-annotation-id={`${anno.id}-image`}
                        >
                          <img
                            src={profileAnno.imageSrc}
                            alt={profileAnno.imageAlt}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
                          />
                          {isSelected && (
                            <>
                              {renderResizeHandle(anno, 'topLeft', 'image')}
                              {renderResizeHandle(anno, 'topRight', 'image')}
                              {renderResizeHandle(anno, 'bottomLeft', 'image')}
                              {renderResizeHandle(anno, 'bottomRight', 'image')}
                            </>
                          )}
                        </div>
                        <div style={{
                          fontSize: profileAnno.nameFontSize || "12pt",
                          color: profileAnno.nameColor || '#333333',
                          fontWeight: 'bold',
                          pointerEvents: 'none'
                        }}>
                          {profileAnno.name}
                        </div>
                        <div style={{
                          fontSize: profileAnno.walletAddressFontSize || "10pt",
                          color: profileAnno.walletAddressColor || '#555555',
                          pointerEvents: 'none',
                          wordBreak: 'break-all'
                        }}>
                          {profileAnno.walletAddress}
                        </div>
                      </div>
                    );
                  }
                  else if (anno.type === 'signature') {
                    const profileAnno = anno as SignatureData;
                    const profileStyle: React.CSSProperties = {
                      ...baseStyle,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      padding: '5px',
                      backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    };
                    // return <Text>here</Text>
                    return (
                      <div key={anno.id} style={profileStyle} data-ai-hint="profile annotation" data-annotation-id={anno.id}
                        onMouseDown={(e) => handleAnnotationMouseDown(e, anno)}>
                        <div
                          className="relative"
                          // style={{ width: profileAnno.imageWidth, height: profileAnno.imageHeight }}
                          data-annotation-id={`${anno.id}-image`}
                        >
                          <img
                            src={profileAnno.dataUrl}
                            alt={profileAnno.imageAlt}
                            style={{ 
                              // Fixed image width to avoid distorting the image with height
                              width: "150px", 
                              // height: profileAnno.imageHeight,
                               objectFit: 'cover', pointerEvents: 'none' 
                              }}
                          />
                          {isSelected && (
                            <>
                              {renderResizeHandle(anno, 'topLeft', 'image')}
                              {renderResizeHandle(anno, 'topRight', 'image')}
                              {renderResizeHandle(anno, 'bottomLeft', 'image')}
                              {renderResizeHandle(anno, 'bottomRight', 'image')}
                            </>
                          )}
                        </div>
                        <div style={{
                          fontSize: profileAnno.nameFontSize || "12pt",
                          color: profileAnno.nameColor || '#333333',
                          fontWeight: 'bold',
                          pointerEvents: 'none'
                        }}>
                          {profileAnno.name}
                        </div>
                        <div style={{
                          fontSize: profileAnno.walletAddressFontSize || "10pt",
                          color: profileAnno.walletAddressColor || '#555555',
                          pointerEvents: 'none',
                          wordBreak: 'break-all'
                        }}>
                          {profileAnno.walletAddress}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}

                {/* I have squashed this to avoid repeating annotations */}
                {annotationsInDocumentOnCurrentPage.map((profileAnno) => {
                  let baseStyle: React.CSSProperties = {
                    position: 'absolute',
                    left: `${profileAnno.x}%`,
                    top: `${profileAnno.y}%`,
                    // marginTop: '3px',
                    // transform: `rotate(${profileAnno.rotation || 0}deg)`,
                    transformOrigin: 'top left',
                    // border: isSelected ? '2px solid rgb(26, 146, 216)' : '1px dashed black',
                    border: '1px solid black',
                    cursor: 'pointer',// draggingAnnotationId === anno.id || resizeState?.annotationId === anno.id ? 'grabbing' : 'move',
                    userSelect: 'none',
                    boxSizing: 'border-box',
                    // scale: scale
                  };
                  //  const profileAnno = anno as SignatureData;
                  const profileStyle: React.CSSProperties = {
                    ...baseStyle,
                    flexDirection: 'column',
                    gap: '4px',
                    padding: '5px',
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    // Lets hide this one
                    // display: 'flex',
                    display: 'none'
                  };
                  // return <Text>here</Text>
                  return (
                    <div key={profileAnno.id} style={profileStyle} data-ai-hint="profile annotation" data-annotation-id={profileAnno.id}
                      onMouseDown={(e) => handleAnnotationMouseDown(e, profileAnno)}>
                      <div
                        className="relative"
                        style={{ width: profileAnno.imageWidth, height: profileAnno.imageHeight }}
                        data-annotation-id={`${profileAnno.id}-image`}
                      >

                        <div
                        className='relative w-full h-full'
                          style={{
                            backgroundImage: `url(${profileAnno.dataUrl})`,
                            backgroundSize: "contain",
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "center",
                            minWidth: "200px",  // Ensure minimum size
                            minHeight: "100px"
                        }}
                        />


                      </div>
                      <div style={{
                        fontSize: profileAnno.nameFontSize || "12pt",
                        color: profileAnno.nameColor || '#333333',
                        fontWeight: 'bold',
                        pointerEvents: 'none'
                      }}>
                        {profileAnno.name}
                      </div>
                      <div style={{
                        fontSize: profileAnno.walletAddressFontSize || "10pt",
                        color: profileAnno.walletAddressColor || '#555555',
                        pointerEvents: 'none',
                        wordBreak: 'break-all'
                      }}>
                        {profileAnno.walletAddress}
                      </div>
                    </div>
                  );
                })}

              </div>
              {pdfDoc && pageDimensions.width === 0 && currentPage > 0 && currentPage <= numPages && !pdfLoadingError && (
                <p className='absolute' style={{ color: "gray.700" }}>Rendering page {currentPage}...</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PdfViewer;

