'use client';
import { useState, useEffect, useMemo } from 'react';
import { AnalysisResult } from '@/app/lib/types';
import { RegulatoryInfo } from '@/app/components/DocumentInfo';
import { RegulatorySummary } from '@/app/components/RegulatorySummary';
import { ImpactAssessment } from '@/app/components/ImpactAssessment';
import { Timeline } from '@/app/components/Timeline';
import { DocumentSelector } from '@/app/components/DocumentSelector';
import { Heatmap } from '@/app/components/Heatmap';
import { ImpactedLifecyclesCard } from '@/app/components/ImpactedLifecyclesCard';
import { Loader2, Search, Info, Save, CheckCircle, AlertCircle, Send, RefreshCw, Mic, Eye, EyeOff } from 'lucide-react';
import PdfViewer from "@/app/components/PdfViewer"; 
import { toast } from "react-hot-toast";

type PageStatus = 'idle' | 'loadingCache' | 'loadingAnalysis' | 'displayingCache' | 'displayingNew' | 'error';

export default function ReviewPage() {
  const [documents, setDocuments] = useState<string[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<string>('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [status, setStatus] = useState<PageStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [notificationStatus, setNotificationStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showPdf, setShowPdf] = useState(true);

  const impactedDivisions = useMemo(() => {
    if (!analysis?.heatmapData) return [];
    
    return Object.entries(analysis.heatmapData)
        .filter(([_, data]) => data.level === 'High' || data.level === 'Medium' || data.level === 'Low')
        .map(([division, _]) => division);
  }, [analysis]); // Recalculates whenever analysis data changes


    // This effect runs only once to fetch the list of available documents
    useEffect(() => {
      const fetchDocuments = async () => {
          try {
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/documents`);
              if (!res.ok) throw new Error('Failed to fetch document list.');
              const data = await res.json();
              setDocuments(data.documents);
          } catch (e) {
              setStatus('error');
              setErrorMessage(e instanceof Error ? e.message : 'An unknown error occurred.');
          }
      };
      fetchDocuments();
  }, []);

  // This effect runs whenever a new document is selected from the dropdown
  useEffect(() => {
      if (!selectedDocument) {
          setAnalysis(null);
          setStatus('idle'); // When deselected, go back to idle
          setPdfUrl(null);
          setAudioUrl(null);
          return;
      }

      const fetchCachedData = async () => {
          setStatus('loadingCache');
          setErrorMessage(''); // Clear previous errors
          setSaveStatus('idle'); // Reset save status
          setAnalysis(null); // Clear previous analysis
          setPdfUrl(null);
          setAudioUrl(null);

          try {
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/cache/${selectedDocument}`);
              if (res.status === 404) {
                  // This is a normal flow: no cache exists for this document.
                  setStatus('idle');
                  return;
              }
              if (!res.ok) {
                  const errData = await res.json();
                  throw new Error(errData.detail || 'Failed to check cache.');
              }
              const data: AnalysisResult = await res.json();
              setAnalysis(data);
              setStatus('displayingCache'); // We have cached data to show

              // Always set the PDF URL when a document is selected
              setPdfUrl(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/documents/${selectedDocument}`);

              const audio_res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/audio/${selectedDocument}.mp3`);
              if (audio_res.ok) {
                setAudioUrl(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/audio/${selectedDocument}.mp3`);
              }

            } catch (e) {
              setStatus('error');
              setErrorMessage(e instanceof Error ? e.message : 'An error occurred while checking the cache.');
          }
      };
      
      fetchCachedData();
  }, [selectedDocument]);

  // Handler for the main "Analyze" / "Re-Analyze" button
  const handleAnalyzeClick = async () => {
      setStatus('loadingAnalysis');
      setErrorMessage('');
      setSaveStatus('idle');
      setAnalysis(null);
      setPdfUrl(null);
      setAudioUrl(null); // Reset audio when new data is loaded

      try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/analyze`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ document_name: selectedDocument }),
          });
          if (!res.ok) {
              const errData = await res.json();
              throw new Error(errData.detail || 'Analysis generation failed.');
          }
          const data: AnalysisResult = await res.json();
          setAnalysis(data);
          setStatus('displayingNew'); // A new analysis is ready to be viewed and saved
          //console.log(data);
          setPdfUrl(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/documents/${selectedDocument}`);

          // MODIFICATION: Set the PDF URL after data is loaded
        //   if (data) {
        //     setPdfUrl(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/documents/${selectedDocument}`);
        //   } else {
        //     setPdfUrl(null); // Ensure no old PDF is shown if data load fails
        //   }
          setAudioUrl(null); // Reset audio when new data is loaded
      } catch (e) {
          setStatus('error');
          setErrorMessage(e instanceof Error ? e.message : 'A critical error occurred during analysis.');
      }
  };
  
  // Handler for the "Save Results" button
  const handleSaveClick = async () => {
      if (!analysis) return;
      setSaveStatus('saving');
      try {
          await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/cache/${selectedDocument}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(analysis),
          });
          setSaveStatus('saved');
          setStatus('displayingCache'); // Once saved, it's considered part of the cache
      } catch (e) {
          alert("Failed to save the analysis.");
          setSaveStatus('idle'); // Re-enable the save button on failure
      }
  };

  const handleNotifyClick = async () => {
    if (impactedDivisions.length === 0) return;
    
    setNotificationStatus('sending');
    
    try {
        await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/notify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                document_name: selectedDocument,
                impacted_divisions: impactedDivisions,
            }),
        });
        setNotificationStatus('sent');
        setTimeout(() => setNotificationStatus('idle'), 3000);
    } catch (e) {
        alert("Failed to send notifications.");
        setNotificationStatus('idle');
    }
};

  // UI: This function is triggered by the "Generate Podcast" button.
  const handleGeneratePodcast = async () => {
    if (!analysis) {
      toast.error("Cannot generate podcast without a source document.");
      return;
    }
    setIsGeneratingPodcast(true);
    setAudioUrl(null);
    const toastId = toast.loading("Generating podcast summary... This may take a moment.");

    try {
      // NOTE: Here we pass the `file_name` in the request body,
      // which the backend's Pydantic model receives.
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/generate_podcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_name: selectedDocument }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to generate podcast.");
      }

      const result = await response.json();
      setAudioUrl(`${process.env.NEXT_PUBLIC_API_BASE_URL}${result.audio_url}`);
      toast.success("Podcast generated successfully!", { id: toastId });

    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    } finally {
      setIsGeneratingPodcast(false);
    }
  };



  const isLoading = status === 'loadingCache' || status === 'loadingAnalysis';
  console.log(status);
  console.log(pdfUrl);
  return (
      <div className="max-w-7xl mx-auto space-y-8">
          <header className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
              <h1 className="text-3xl font-bold text-gray-800 tracking-tight">AI Regulatory Review</h1>
              <p className="text-lg text-gray-600 mt-2">Generate summaries, impact assessments, and timelines from your documents.</p>
          </header>

          <div className="p-4 bg-white rounded-lg shadow-sm border flex flex-wrap items-end gap-x-4 gap-y-4">
              <div className="flex-grow">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Document</label>
                  <DocumentSelector 
                      documents={documents}
                      selectedDocument={selectedDocument}
                      onSelectDocument={setSelectedDocument}
                      isLoading={isLoading}
                  />
              </div>
              <button 
                  onClick={handleAnalyzeClick}
                  disabled={isLoading || !selectedDocument}
                  className="flex items-center justify-center h-11 px-6 bg-red-500 text-white font-semibold rounded-md shadow-sm hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors"
              >
                  <Search className="mr-2 h-5 w-5" />
                  {status === 'displayingCache' ? 'Re-Analyze' : 'Analyze'}
              </button>

              {/* This is the button to create the podcast. */}
                <button 
                    onClick={handleGeneratePodcast} 
                    disabled={isGeneratingPodcast || !analysis} 
                    className="flex items-center justify-center px-6 h-11 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed"
                >
                    {isGeneratingPodcast ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Mic className="mr-2 h-5 w-5" />}
                    Podcast
                </button>  

              {status === 'displayingNew' && (
                  <button 
                      onClick={handleSaveClick}
                      disabled={saveStatus !== 'idle'}
                      className="flex items-center justify-center h-11 px-6 bg-green-600 text-white font-semibold rounded-md shadow-sm hover:bg-green-700 disabled:bg-green-300 transition-colors"
                  >
                      {saveStatus === 'idle' && <><Save className="mr-2 h-5 w-5" /> Save Results</>}
                      {saveStatus === 'saving' && <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Saving...</>}
                      {saveStatus === 'saved' && <><CheckCircle className="mr-2 h-5 w-5" /> Saved!</>}
                  </button>
              )}
          </div>

          {isLoading && (
              <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg shadow-md border">
                  <Loader2 className="h-12 w-12 text-red-500 animate-spin" />
                  <p className="mt-4 text-lg text-gray-700 font-semibold">
                      {status === 'loadingCache' ? 'Checking for saved analysis...' : `Analyzing ${selectedDocument}...`}
                  </p>
              </div>
          )}
          
          {status === 'error' && (
              <div className="p-4 text-red-800 bg-red-100 rounded-md flex items-center gap-3"><AlertCircle /> {errorMessage}</div>
          )}

          {analysis && (status === 'displayingCache' || status === 'displayingNew' || pdfUrl) && (
            <>
                {/* Full-width components before RegulatorySummary */}
                <div className="mt-8 space-y-8">
                    {/* --- THE NEW "ACTIONS" HEADER --- */}
                    <div className="flex items-center justify-between">
                        <div>
                            {status === 'displayingCache' ? (
                                <p className="font-semibold text-lg text-red-700">Displaying saved analysis.</p>
                            ) : (
                                <p className="font-semibold text-lg text-green-800">New analysis generated. Click "Save Results" to persist.</p>
                            )}
                        </div>
                        <button
                            onClick={handleNotifyClick}
                            disabled={notificationStatus !== 'idle' || impactedDivisions.length === 0}
                            className="flex items-center justify-center px-4 py-2 text-white font-semibold rounded-md shadow-sm transition-colors duration-200 bg-red-500 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {notificationStatus === 'idle' ? (
                                impactedDivisions.length > 0 ? (
                                    <>
                                        <Send className="mr-2 h-5 w-5"/>
                                        Notify {impactedDivisions.length} Division(s)
                                    </>
                                ) : (
                                    'No High/Medium Impact'
                                )
                            ) : notificationStatus === 'sending' ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <CheckCircle className="mr-2 h-5 w-5" />
                            )}
                            
                            {notificationStatus === 'sending' && 'Sending...'}
                            {notificationStatus === 'sent' && 'Sent!'}
                        </button>
                    </div>

                    {/* This audio player appears once the podcast is generated. */}
                    {audioUrl && (
                        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold mb-2">Generated Podcast Summary</h3>
                        <audio controls className="w-full" src={audioUrl}>
                            Your browser does not support the audio element.
                        </audio>
                        </div>
                    )}

                    {/* --- End of Actions Header --- */}
                    <RegulatoryInfo info={analysis.documentInfo} />
                    {analysis.heatmapData && <Heatmap data={analysis.heatmapData} />}
                    {analysis.impactedLifecycles && <ImpactedLifecyclesCard lifecycles={analysis.impactedLifecycles} />}
                </div>

                {/* PDF Toggle Button */}
                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => setShowPdf((prev) => !prev)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded shadow"
                  >
                    {showPdf ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    {showPdf ? 'Hide PDF' : 'Show PDF'}
                  </button>
                </div>

                {/* Two-column layout starting from RegulatorySummary */}
                <div className={`mt-8 grid gap-8 ${showPdf ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`} style={{ height: 'calc(100vh - 400px)' }}>
                    {/* Left Column: Review Details */}
                    <div className={`flex flex-col space-y-8 overflow-y-auto pr-4 ${showPdf ? '' : 'col-span-1'}`}>
                        <RegulatorySummary summary={analysis.regulatorySummary} />
                        <ImpactAssessment assessment={analysis.impactAssessment} />
                        <Timeline dates={analysis.keyDates} />
                    </div>

                    {/* Right Column: PDF Document Viewer */}
                    {showPdf && (
                      <div className="h-full overflow-hidden">
                          {pdfUrl ? (
                              <div className="h-full overflow-y-auto">
                                  <PdfViewer key={pdfUrl} fileUrl={pdfUrl} />
                              </div>
                          ) : (
                              <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg border-2 border-dashed">
                                  <p className="text-gray-500">No document to display.</p>
                              </div>
                          )}
                      </div>
                    )}
                </div>
            </>
          )}

          {status === 'idle' && !errorMessage && (
              <div className="text-center p-12 bg-white rounded-lg shadow-md border">
                  <Info className="mx-auto h-12 w-12 text-gray-400" />
                  <h2 className="mt-2 text-xl font-semibold text-gray-700">Ready for Analysis</h2>
                  <p className="text-gray-500 mt-1">
                      {selectedDocument 
                          ? 'A saved analysis for this document was not found. Click "Analyze" to generate a new report.' 
                          : 'Please select a document to begin.'
                      }
                  </p>
              </div>
          )}
      </div>
  );
}
