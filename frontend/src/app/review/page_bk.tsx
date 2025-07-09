'use client';
import { useState, useEffect, useMemo } from 'react';
import { AnalysisResult } from '@/app/lib/types';
import { RegulatorySummary } from '@/app/components/RegulatorySummary';
import { ImpactAssessment } from '@/app/components/ImpactAssessment';
import { Timeline } from '@/app/components/Timeline';
import { DocumentSelector } from '@/app/components/DocumentSelector';
import { Heatmap } from '@/app/components/Heatmap';
import { ImpactedLifecyclesCard } from '@/app/components/ImpactedLifecyclesCard';
import { Loader2, Search, Info, Send, CheckCircle } from 'lucide-react'; // Add CheckCircle

export default function ReviewPage() {
  const [documents, setDocuments] = useState<string[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<string>('');
  
  // --- CACHING AND UI STATE CHANGES ---
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisCache, setAnalysisCache] = useState<Record<string, AnalysisResult>>({});
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [notificationStatus, setNotificationStatus] = useState<'idle' | 'sending' | 'sent'>('idle');



  // This effect runs only once to fetch the list of documents.
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/documents`);
        if (!res.ok) throw new Error('Failed to fetch documents from the server.');
        const data = await res.json();
        setDocuments(data.documents);
        // We no longer auto-select the first document.
      } catch (e) {
        setError(e instanceof Error ? e.message : 'An unknown error occurred while fetching documents.');
      }
    };
    fetchDocuments();
  }, []);

  // Event handler for the new "Analyze" button
  const handleAnalyzeClick = async () => {
    if (!selectedDocument) {
        setError("Please select a document first.");
        return;
    }

    // 1. Check the cache first
    if (analysisCache[selectedDocument]) {
        console.log("Loading analysis from cache...");
        setAnalysis(analysisCache[selectedDocument]);
        setError(null);
        return;
    }

    // 2. If not in cache, fetch from the API
    console.log("Fetching new analysis from API...");
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ document_name: selectedDocument }),
        });
        
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.detail || 'Failed to fetch analysis.');
        }

        const data: AnalysisResult = await res.json();
        // Update both the current view and the cache
        setAnalysis(data);
        setAnalysisCache(prevCache => ({
            ...prevCache,
            [selectedDocument]: data,
        }));
    } catch (e) {
        setError(e instanceof Error ? e.message : 'An unknown error occurred during analysis.');
    } finally {
        setIsLoading(false);
    }
  };
  
  // Clear analysis when a different document is selected
  useEffect(() => {
    setAnalysis(null);
    setError(null);
  }, [selectedDocument])

  const impactedDivisions = useMemo(() => {
    if (!analysis?.heatmapData) return [];
    
    return Object.entries(analysis.heatmapData)
        .filter(([_, data]) => data.level === 'High' || data.level === 'Medium')
        .map(([division, _]) => division);
  }, [analysis]); // This list is recalculated only when the analysis data changes

  const handleNotifyClick = async () => {
    // The logic is now simpler because we use the memoized variable
    if (impactedDivisions.length === 0) return;
    
    setNotificationStatus('sending');
    
    try {
        await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/notify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                document_name: selectedDocument,
                impacted_divisions: impactedDivisions, // Use the calculated list
            }),
        });
        setNotificationStatus('sent');
        setTimeout(() => setNotificationStatus('idle'), 3000);
    } catch (e) {
        setNotificationStatus('idle');
        alert("Failed to send notifications.");
    }
  };


  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">AI Regulatory Review</h1>
        <p className="text-lg text-gray-600 mt-2">Generate summaries, impact assessments, and timelines from your documents.</p>
      </header>

      {/* --- NEW UI WITH "ANALYZE" BUTTON --- */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
        <DocumentSelector 
          documents={documents}
          selectedDocument={selectedDocument}
          onSelectDocument={setSelectedDocument}
          isLoading={isLoading}
        />
        <button 
            onClick={handleAnalyzeClick}
            disabled={isLoading || !selectedDocument}
            className="flex items-center justify-center px-4 py-2 bg-red-600 text-white font-semibold rounded-md shadow-sm hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
            <Search className="mr-2 h-5 w-5" />
            Analyze
        </button>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg shadow-md border">
          <Loader2 className="h-12 w-12 text-red-600 animate-spin" />
          <p className="mt-4 text-lg text-gray-700 font-semibold">Analyzing {selectedDocument}...</p>
        </div>
      )}

      {error && !isLoading && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
              <p className="font-bold">Error</p>
              <p>{error}</p>
          </div>
      )}

      {analysis && !isLoading && (
        <div className="grid grid-cols-1 gap-8">

          {/* --- THE FIX: The new intelligent notification button --- */}
          <div className="p-4 bg-white rounded-lg shadow-sm border flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Analysis Complete</h2>
              <button
                  onClick={handleNotifyClick}
                  // Button is disabled if sending, or if there are no divisions to notify
                  disabled={notificationStatus !== 'idle' || impactedDivisions.length === 0}
                  className="flex items-center justify-center px-4 py-2 text-white font-semibold rounded-md shadow-sm transition-colors duration-200
                              bg-red-600 hover:bg-red-700
                              disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                  {notificationStatus === 'idle' ? (
                      impactedDivisions.length > 0 ? (
                          <>
                              <Send className="mr-2 h-5 w-5"/>
                              Notify {impactedDivisions.length} Division(s)
                          </>
                      ) : (
                          'No High/Medium Impact Divisions'
                      )
                  ) : notificationStatus === 'sending' ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                      <CheckCircle className="mr-2 h-5 w-5" />
                  )}
                  
                  {notificationStatus === 'sending' && 'Sending...'}
                  {notificationStatus === 'sent' && 'Notifications Sent!'}
              </button>
          </div>


          {/* 1. The high-level prose summary */}
          <RegulatorySummary summary={analysis.regulatorySummary} />

          {/* 2. The quantitative heatmap */}
          {analysis.heatmapData && <Heatmap data={analysis.heatmapData} />}

          {/* 3. The detailed list of what drove the heatmap */}
          {analysis.impactedLifecycles && <ImpactedLifecyclesCard lifecycles={analysis.impactedLifecycles} />}

          {/* 4. The qualitative impact assessment and timeline */}
          <ImpactAssessment assessment={analysis.impactAssessment} />
          <Timeline dates={analysis.keyDates} />
        </div>
      )}

      {/* --- NEW INITIAL STATE MESSAGE --- */}
      {!analysis && !isLoading && !error && (
        <div className="text-center p-12 bg-white rounded-lg shadow-md border">
            <Info className="mx-auto h-12 w-12 text-gray-400" />
            <h2 className="mt-2 text-xl font-semibold text-gray-700">Ready for Analysis</h2>
            <p className="text-gray-500 mt-1">Please select a document from the dropdown and click "Analyze".</p>
          </div>
      )}
    </div>
  );
}
