"use client";

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { AlertCircle } from 'lucide-react'; // Added missing import

// Dynamic imports to avoid SSR issues
let Document: any;
let Page: any;
let pdfjs: any;

interface PdfViewerProps {
  fileUrl: string;
}

export default function PdfViewer({ fileUrl }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [isClient, setIsClient] = useState(false);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [useIframeFallback, setUseIframeFallback] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  console.log('PdfViewer render:', { fileUrl, isClient, Document: !Document, Page: !Page, isLoading, loadError, useIframeFallback });

  // Debug when Document component should render
  useEffect(() => {
    if (fileUrl && isClient && Document && Page && !useIframeFallback) {
      console.log('Document component should render with:', { fileUrl, Document: !!Document, Page: !!Page });
    }
  }, [fileUrl, isClient, Document, Page, useIframeFallback]);

  // Cleanup blob URL when component unmounts or fileUrl changes
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) {
        console.log('Cleaning up blob URL:', pdfBlobUrl);
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfBlobUrl]);

  useEffect(() => {
    setIsClient(true);
    
    // Set up the worker immediately
    if (typeof window !== 'undefined') {
      // Import and set up PDF.js worker immediately
      import('react-pdf').then((module) => {
        const { pdfjs } = module;
        // Use the correct worker path that matches react-pdf version
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
        console.log('PDF.js worker set to:', pdfjs.GlobalWorkerOptions.workerSrc);
        console.log('PDF.js version:', pdfjs.version);
        
        // Test worker loading
        try {
          const worker = new Worker(pdfjs.GlobalWorkerOptions.workerSrc);
          worker.terminate(); // Clean up test worker
          console.log('PDF.js worker loaded successfully');
        } catch (error) {
          console.error('PDF.js worker loading failed:', error);
          setLoadError('Failed to load PDF worker');
        }
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
      console.log('FileUrl changed, testing accessibility:', fileUrl);
      setPageNumber(1);
      setScale(1.0);
      setRotation(0);
      setNumPages(null);
      setIsLoading(true);
      setLoadError(null);
      setUseIframeFallback(false);
      setPdfBlobUrl(null); // Clear previous blob URL
      
      // Test if the PDF URL is accessible with more detailed logging
      console.log('Testing PDF accessibility...');
      fetch(fileUrl, { method: 'GET' })
        .then(response => {
          console.log('PDF URL accessibility test:', { 
            status: response.status, 
            ok: response.ok,
            contentType: response.headers.get('content-type'),
            contentLength: response.headers.get('content-length'),
            url: fileUrl
          });
          
          if (!response.ok) {
            throw new Error(`PDF not accessible: ${response.status} ${response.statusText}`);
          }
          
          // If accessible, log success and continue
          console.log('PDF URL is accessible, proceeding with loading...');
          
          // Test if we can actually read the PDF data
          return response.blob();
        })
        .then(blob => {
          console.log('PDF blob received:', { size: blob.size, type: blob.type });
          if (blob.size === 0) {
            throw new Error('PDF file is empty');
          }
          console.log('PDF blob is valid, creating blob URL...');
          
          // Create a blob URL for the PDF
          const blobUrl = URL.createObjectURL(blob);
          console.log('Created blob URL:', blobUrl);
          setPdfBlobUrl(blobUrl);
        })
        .catch(error => {
          console.error('PDF URL accessibility error:', error);
          setLoadError(`Failed to access PDF: ${error.message}`);
          setIsLoading(false);
        });
      
      // Add a timeout to detect if PDF loading is hanging (reduced from 10s to 5s)
      const timeoutId = setTimeout(() => {
        if (isLoading) {
          console.warn('PDF loading timeout - still loading after 5 seconds');
          console.warn('Current state:', { isLoading, numPages, loadError });
          setLoadError('PDF loading timed out. Please try again.');
          setIsLoading(false);
          
          // Automatically switch to iframe fallback after timeout
          if (!useIframeFallback) {
            console.log('Automatically switching to iframe fallback due to timeout');
            setUseIframeFallback(true);
          }
        }
      }, 5000);
      
      return () => {
        console.log('Cleaning up PDF loading timeout');
        clearTimeout(timeoutId);
      };
    } else {
      console.log('No fileUrl provided, resetting state');
      setIsLoading(false);
      setLoadError(null);
    }
  }, [fileUrl]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    console.log('PDF loaded successfully:', { numPages, fileUrl });
    setNumPages(numPages);
    setPageNumber(1); // Reset to first page on new document load
    setIsLoading(false);
    setLoadError(null);
  }

  function onDocumentLoadError(error: Error): void {
    console.error('PDF load error:', error);
    setIsLoading(false);
    setLoadError(`Error loading PDF: ${error.message}`);
    toast.error(`Error while loading PDF: ${error.message}`);
    
    // After multiple failures, try iframe fallback
    if (!useIframeFallback) {
      console.log('Switching to iframe fallback...');
      setUseIframeFallback(true);
    }
  }

  function onDocumentLoadProgress({ loaded, total }: { loaded: number; total: number }): void {
    console.log('PDF loading progress:', { loaded, total, percentage: total ? (loaded / total) * 100 : 0 });
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
      <p className="text-xs text-gray-300 mt-1">This may take a few moments for large files</p>
    </div>
  );

  const errorDisplay = (
    <div className="flex flex-col items-center justify-center h-full text-red-500">
      <AlertCircle className="h-10 w-10" />
      <p className="mt-4 text-center">Failed to load PDF</p>
      <p className="text-sm text-gray-400 mt-2 text-center">{loadError}</p>
      <div className="flex gap-2 mt-4">
        <button 
          onClick={() => {
            setIsLoading(true);
            setLoadError(null);
          }}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Retry
        </button>
        <button 
          onClick={() => {
            // Open PDF in new tab as fallback
            window.open(fileUrl, '_blank');
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Open in New Tab
        </button>
        <button 
          onClick={() => {
            setUseIframeFallback(true);
            setLoadError(null);
          }}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Use Simple Viewer
        </button>
      </div>
    </div>
  );

  const iframeFallback = (
    <div className="w-full h-full">
      <iframe
        src={pdfBlobUrl || fileUrl}
        className="w-full h-full border-0"
        title="PDF Document"
      />
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
        ) : useIframeFallback ? (
          iframeFallback
        ) : (
          <Document
            key={`${fileUrl}-${Date.now()}`}
            file={pdfBlobUrl || fileUrl} // Use blob URL if available, otherwise original fileUrl
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            onLoadProgress={onDocumentLoadProgress}
            loading={loadingSpinner}
            className="flex justify-center"
            error={errorDisplay}
            onSourceSuccess={() => {
              console.log('Document source loaded successfully');
            }}
            onSourceError={(error: Error) => {
              console.error('Document source error:', error);
              setLoadError(`Source error: ${error.message}`);
            }}
          >
            <Page 
              pageNumber={pageNumber} 
              scale={scale}
              rotate={rotation}
              onLoadSuccess={() => {
                console.log('PDF page loaded successfully');
              }}
              onLoadError={(error: Error) => {
                console.error('PDF page load error:', error);
                setLoadError(`Page load error: ${error.message}`);
              }}
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