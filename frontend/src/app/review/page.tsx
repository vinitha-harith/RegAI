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
import { Loader2, Search, Info, Save, CheckCircle, AlertCircle, Send } from 'lucide-react';

type PageStatus = 'idle' | 'loadingCache' | 'loadingAnalysis' | 'displayingCache' | 'displayingNew' | 'error';

export default function ReviewPage() {
  const [documents, setDocuments] = useState<string[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<string>('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [status, setStatus] = useState<PageStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const [notificationStatus, setNotificationStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

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
          return;
      }

      const fetchCachedData = async () => {
          setStatus('loadingCache');
          setErrorMessage(''); // Clear previous errors
          setSaveStatus('idle'); // Reset save status
          setAnalysis(null); // Clear previous analysis

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

  const isLoading = status === 'loadingCache' || status === 'loadingAnalysis';

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

          {analysis && (status === 'displayingCache' || status === 'displayingNew') && (
              <div className="space-y-8">
                    {/* --- THE NEW "ACTIONS" HEADER --- */}
                    <div className="p-4 bg-white rounded-lg shadow-sm border flex flex-wrap justify-between items-center gap-4">
                        <div>
                            {status === 'displayingCache' ? (
                                <p className="font-semibold text-sm text-red-800">Displaying saved analysis.</p>
                            ) : (
                                <p className="font-semibold text-sm text-green-800">New analysis generated. Click "Save Results" to persist.</p>
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
                    {/* --- End of Actions Header --- */}
                  <RegulatoryInfo info={analysis.documentInfo} />
                  {analysis.heatmapData && <Heatmap data={analysis.heatmapData} />}
                  {analysis.impactedLifecycles && <ImpactedLifecyclesCard lifecycles={analysis.impactedLifecycles} />}
                  <RegulatorySummary summary={analysis.regulatorySummary} />
                  <ImpactAssessment assessment={analysis.impactAssessment} />
                  <Timeline dates={analysis.keyDates} />
              </div>
          )}

          {status === 'idle' && !Error && (
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
