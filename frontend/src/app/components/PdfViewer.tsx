"use client";

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { AlertCircle } from 'lucide-react';

// Dynamic imports to avoid SSR issues
let Document: any;
let Page: any;
let pdfjs: any;

interface PdfViewerProps {
  fileUrl: string;
}

export default function PdfViewer({ fileUrl }: PdfViewerProps) {
  const [isClient, setIsClient] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  console.log('PdfViewer render:', { fileUrl, isClient, Document: !!Document, Page: !!Page });

  // Initialize client and load react-pdf
  useEffect(() => {
    setIsClient(true);
    
    // Set up the worker immediately
    if (typeof window !== 'undefined') {
      import('react-pdf').then((module) => {
        const { pdfjs } = module;
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
        console.log('PDF.js worker set to:', pdfjs.GlobalWorkerOptions.workerSrc);
        console.log('PDF.js version:', pdfjs.version);
      }).catch(error => {
        console.error('Failed to import react-pdf:', error);
        setLoadError('Failed to load PDF viewer components');
      });
    }
    
    // Dynamically import react-pdf components
    import('react-pdf').then((module) => {
      Document = module.Document;
      Page = module.Page;
      pdfjs = module.pdfjs;
      console.log('React-PDF components loaded:', { Document: !!Document, Page: !!Page, pdfjs: !!pdfjs });
    }).catch(error => {
      console.error('Failed to load react-pdf components:', error);
      setLoadError('Failed to load PDF viewer components');
    });
    
    // Import CSS for annotations and text layer
    if (typeof window !== 'undefined') {
      // @ts-ignore - CSS imports for react-pdf
      import('react-pdf/dist/Page/AnnotationLayer.css').catch(() => {});
      // @ts-ignore - CSS imports for react-pdf
      import('react-pdf/dist/Page/TextLayer.css').catch(() => {});
    }
  }, []);

  // Reset state when fileUrl changes
  useEffect(() => {
    if (fileUrl) {
      console.log('FileUrl changed:', fileUrl);
      setPageNumber(1);
      setScale(1.0);
      setRotation(0);
      setNumPages(null);
      setIsLoading(true);
      setLoadError(null);
    } else {
      setIsLoading(false);
      setLoadError(null);
    }
  }, [fileUrl]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    console.log('PDF loaded successfully:', { numPages, fileUrl });
    setNumPages(numPages);
    setPageNumber(1);
    setIsLoading(false);
    setLoadError(null);
  }

  function onDocumentLoadError(error: Error): void {
    console.error('PDF load error:', error);
    setIsLoading(false);
    setLoadError(`Error loading PDF: ${error.message}`);
    toast.error(`Error while loading PDF: ${error.message}`);
  }

  function goToPrevPage() {
    setPageNumber((prevPageNumber) => Math.max(prevPageNumber - 1, 1));
  }

  function goToNextPage() {
    setPageNumber((prevPageNumber) => Math.min(prevPageNumber + 1, numPages || 1));
  }

  function zoomIn() {
    setScale((prevScale) => Math.min(prevScale + 0.25, 3.0));
  }

  function zoomOut() {
    setScale((prevScale) => Math.max(prevScale - 0.25, 0.5));
  }

  function resetZoom() {
    setScale(1.0);
    setRotation(0);
  }

  function rotatePage() {
    setRotation((prevRotation) => (prevRotation + 90) % 360);
  }

  const loadingSpinner = (
    <div className="flex flex-col items-center justify-center h-full text-red-500">
      <Loader2 className="h-10 w-10 animate-spin" />
      <p className="mt-4">Loading Document...</p>
      <p className="text-sm text-gray-400 mt-2">{fileUrl}</p>
    </div>
  );

  const errorDisplay = (
    <div className="flex flex-col items-center justify-center h-full text-red-500">
      <AlertCircle className="h-10 w-10" />
      <p className="mt-4 text-center">Failed to load PDF</p>
      <p className="text-sm text-gray-400 mt-2 text-center">{loadError}</p>
      <button 
        onClick={() => {
          setIsLoading(true);
          setLoadError(null);
        }}
        className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Retry
      </button>
    </div>
  );

  // Don't render anything until client-side
  if (!isClient || !Document || !Page) {
    return (
      <div className="w-full h-full flex flex-col bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md">
        <div className="flex-grow overflow-auto p-4 flex items-center justify-center">
          <div className="flex flex-col items-center justify-center text-gray-500">
            <Loader2 className="h-10 w-10 animate-spin" />
            <p className="mt-4">Loading PDF Viewer...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md">
      {/* PDF Document Display Area */}
      <div className="flex-grow overflow-auto p-4">
        {loadError ? (
          errorDisplay
        ) : (
          <Document
            key={fileUrl}
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={loadingSpinner}
            className="flex justify-center"
          >
            <Page 
              pageNumber={pageNumber} 
              scale={scale}
              rotate={rotation}
            />
          </Document>
        )}
      </div>
      
      {/* Controls */}
      {numPages && !loadError && (
        <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          {/* Pagination Controls */}
          <div className="flex items-center">
            <button
              onClick={goToPrevPage}
              disabled={pageNumber <= 1}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Previous Page"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <span className="mx-4 text-sm font-medium text-gray-700 dark:text-gray-300">
              Page {pageNumber} of {numPages}
            </span>
            
            <button
              onClick={goToNextPage}
              disabled={pageNumber >= numPages}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next Page"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={zoomOut}
              disabled={scale <= 0.5}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Zoom Out"
            >
              <ZoomOut className="h-5 w-5" />
            </button>
            
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[60px] text-center">
              {Math.round(scale * 100)}%
            </span>
            
            <button
              onClick={zoomIn}
              disabled={scale >= 3.0}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Zoom In"
            >
              <ZoomIn className="h-5 w-5" />
            </button>
            
            <button
              onClick={rotatePage}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label="Rotate Page"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
            
            <button
              onClick={resetZoom}
              className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              aria-label="Reset Zoom"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}