'use client';
import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, AlertCircle, CalendarIcon } from 'lucide-react';
import { RiskAssessmentCard } from '@/app/components/dashboard/RiskAssessmentCard';
import { ImpactAnalysisCard } from '@/app/components/dashboard/ImpactAnalysisCard';
import { RecommendationsCard } from '@/app/components/dashboard/RecommendationsCard';
import { OverviewMetrics } from '@/app/components/dashboard/OverviewMetrics';
import { DocumentHeatmapCard } from '@/app/components/dashboard/DocumentHeatmapCard';
// import { SourceDocumentsCard } from '@/app/components/dashboard/SourceDocumentsCard';

// Custom component to handle the placeholder styling for date inputs
const DateInput = ({ label, value, onChange }) => {
    const displayValue = value ? new Date(value + 'T00:00:00').toLocaleDateString('en-GB') : '';

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div className="relative">
                <input 
                    type="date"
                    value={value}
                    onChange={onChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" // Hidden date picker
                />
                <div className="flex items-center justify-between p-2 h-11 border border-gray-300 rounded-md bg-white">
                    <span className={value ? 'text-gray-900' : 'text-gray-400'}>
                        {value ? displayValue : 'dd.mm.yyyy'}
                    </span>
                    <CalendarIcon className="h-5 w-5 text-gray-400" />
                </div>
            </div>
        </div>
    );
};

export default function DashboardPage() {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false); // Only used for the manual refresh
    const [error, setError] = useState<string | null>(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchDashboardData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/dashboard?${params.toString()}`);
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || 'Failed to fetch dashboard data.');
            }
            const data = await res.json();
            setData(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
            setData(null);
        } finally {
            setIsLoading(false);
        }
    }, [startDate, endDate]); // The function is recreated when dates change

    // This effect now only runs ONCE on the initial page load.
    // Subsequent fetches are manual via the button.

    // useEffect(() => {
    //     // We set loading true here for the initial page load only
    //     setIsLoading(true);
    //     fetchDashboardData();
    // }, []); // Empty dependency array means it only runs once
    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-gray-900">Regulatory Dashboard</h1>
                <p className="text-lg text-gray-600 mt-1">A consolidated overview of your regulatory landscape.</p>
            </header>

            {/* --- COMPLETELY REBUILT FILTER BAR --- */}
            <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-wrap items-end gap-x-6 gap-y-4">
                <DateInput label="Start Date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <DateInput label="End Date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                
                {/* Fixed Refresh Button */}
                <div className="pt-6">
                    <button 
                        onClick={fetchDashboardData}
                        disabled={isLoading}
                        className="flex items-center justify-center h-11 px-6 bg-red-600 text-white font-semibold rounded-md shadow-sm hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors"
                    >
                        <RefreshCw className={`mr-2 h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                        {isLoading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center p-20"><Loader2 className="w-12 h-12 animate-spin text-red-800" /></div>
            ) : error ? (
                <div className="p-4 text-red-800 bg-red-100 rounded-md flex items-center gap-3"><AlertCircle /> {error}</div>
            ) : data ? (
                <div className="space-y-8">
                    {/* The UI flow is now: High-level metrics -> Detailed Table -> Synthesized Analysis */}
                    <OverviewMetrics data={data} />
                    {/* Render the new, detailed heatmap table */}
                    <DocumentHeatmapCard metadata={data.filteredMetadata} />
                    <RiskAssessmentCard data={data.riskAssessment} />
                    <ImpactAnalysisCard data={data.impactAnalysis} />
                    <RecommendationsCard data={data.recommendations} />
                </div>
                // <div className="space-y-8">
                //     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                //         <div className="lg:col-span-2">
                //            <OverviewMetrics data={data} />
                //         </div>
                //         <div>
                //            {/* <SourceDocumentsCard documents={data.sourceDocuments} /> */}
                //            {/* We pass the entire filtered metadata object to the card */}
                //             {/* <SourceDocumentsCard metadata={data.filteredMetadata} /> */}
                //             <DocumentHeatmapCard metadata={data.filteredMetadata} />
                //         </div>
                //     </div>
                //     <RiskAssessmentCard data={data.riskAssessment} />
                //     <ImpactAnalysisCard data={data.impactAnalysis} />
                //     <RecommendationsCard data={data.recommendations} />
                // </div>
            ) : null}
        </div>
    );
}