'use client';
import { useState, useEffect, useCallback } from 'react';
import { toast } from "react-hot-toast";
import { Loader2, RefreshCw, AlertCircle, CalendarIcon, Save } from 'lucide-react';

import { RiskAssessmentCard } from '@/app/components/dashboard/RiskAssessmentCard';
import { ImpactAnalysisCard } from '@/app/components/dashboard/ImpactAnalysisCard';
import { RecommendationsCard } from '@/app/components/dashboard/RecommendationsCard';
import { OverviewMetrics } from '@/app/components/dashboard/OverviewMetrics';
import { DocumentHeatmapCard } from '@/app/components/dashboard/DocumentHeatmapCard';
// import { SourceDocumentsCard } from '@/app/components/dashboard/SourceDocumentsCard';
import { DashboardData } from '@/app/lib/types';

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
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [data, setData] = useState(null);
    // const [isLoading, setIsLoading] = useState(false); // Only used for the manual refresh
    const [error, setError] = useState<string | null>(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const handleGenerateNew = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setDashboardData(null); // Clear old data to show loading state for the whole page
        
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
            // setData(data);
            setDashboardData(data);
            toast.success("New dashboard generated successfully!");
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
            setData(null);
        } finally {
            setIsLoading(false);
        }
    }, [startDate, endDate]); // The function is recreated when dates change


    useEffect(() => {
        handleGenerateNew();
    }, [handleGenerateNew]);

    // MODIFICATION: New function to save the current dashboard state to the backend
    const handleSaveData = async () => {
        if (!dashboardData) {
        toast.error("No data available to save.");
        return;
        }
        
        setIsSaving(true);
        const toastId = toast.loading("Saving dashboard data...");

        try {
            // console.log(dashboardData);
            // console.log(JSON.stringify(dashboardData));
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/save_dashboard`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dashboardData),
            });

        if (!response.ok) {
            throw new Error("Failed to save data on the server.");
        }
        
        const result = await response.json();
        toast.success(result.message || "Dashboard saved successfully!", { id: toastId });
        } catch (error) {
        console.error("Failed to save dashboard data:", error);
        toast.error("Could not save dashboard data.", { id: toastId });
        } finally {
        setIsSaving(false);
        }
    };

    // MODIFICATION: Replaced simple on-load generation with a new data loading strategy
    useEffect(() => {
        const loadInitialData = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/load_dashboard`);

            if (response.ok) {
            // Case 1: Saved data found on backend
            const data = await response.json();
            setDashboardData(data);
            console.log("loading from file");
            console.log(data)
            toast.success("Loaded saved dashboard data.");
            setIsLoading(false); // Stop loading here
            } else if (response.status === 404) {
            // Case 2: No saved data file found, generate a new one
            toast.success("No saved data found. Generating a new dashboard...");
            await handleGenerateNew(); // This function will set isLoading to false
            } else {
            // Case 3: Any other server error
            throw new Error("Failed to load dashboard data from server.");
            }
        } catch (error) {
            // Case 4: Network error or unexpected exception
            console.error("Error loading initial data:", error);
            toast.error("Could not load data. Generating a new dashboard as a fallback.");
            await handleGenerateNew(); // Fallback to generating new data
        }
        };

        loadInitialData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array ensures this runs only once on mount

    // The main loading state for the whole page
    if (isLoading) {
        return (
        <div className="flex h-[calc(100vh-80px)] w-full items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-red-600" />
            <p className="ml-4 text-lg text-gray-600">Loading Regulatory Dashboard...</p>
        </div>
        );
    }
    //console.log(dashboardData);
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between pb-6 border-b">
                 <header>
                    <h1 className="text-3xl font-bold text-gray-900">Regulatory Dashboard</h1>
                    <p className="text-lg text-gray-600 mt-1">A consolidated overview of your regulatory landscape.</p>
                </header>
                <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-wrap items-end gap-x-6 gap-y-4">
                    <DateInput label="Start Date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    <DateInput label="End Date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    <div className="pt-6">
                        {/* MODIFICATION: Added Save button, styled like the existing Refresh button */}
                        <button
                            onClick={handleSaveData}
                            disabled={isSaving || !dashboardData}
                            className="flex items-center justify-center h-11 px-6 bg-red-600 text-white font-semibold rounded-md shadow-sm hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors"
                        >
                            {isSaving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            Save
                        </button>
                    </div>
                    <div className="pt-6">                    
                        <button 
                            onClick={handleGenerateNew}
                            disabled={isLoading}
                            className="flex items-center justify-center h-11 px-6 bg-red-600 text-white font-semibold rounded-md shadow-sm hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors"
                        >
                            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                            {isLoading ? 'Generating New...' : 'Generate New'}
                        </button>
                    </div>
                </div>
            </div>

            {/* MODIFICATION: Added a check for no data after loading has finished */}
            {!dashboardData ? (
                <div className="text-center py-10">
                <p className="text-gray-500">Dashboard data could not be loaded. Please try generating a new one.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* The UI flow is now: High-level metrics -> Detailed Table -> Synthesized Analysis */}
                    <OverviewMetrics data={dashboardData} />
                    {/* Render the new, detailed heatmap table */}
                    <DocumentHeatmapCard metadata={dashboardData.filteredMetadata} />
                    <RiskAssessmentCard data={dashboardData.riskAssessment} />
                    <ImpactAnalysisCard data={dashboardData.impactAnalysis} />
                    <RecommendationsCard data={dashboardData.recommendations} />
                </div>
            )}
        </div>
    );

    // return (
    //     <div className="space-y-8">
    //         <header>
    //             <h1 className="text-3xl font-bold text-gray-900">Regulatory Dashboard</h1>
    //             <p className="text-lg text-gray-600 mt-1">A consolidated overview of your regulatory landscape.</p>
    //         </header>

    //         {/* --- COMPLETELY REBUILT FILTER BAR --- */}
    //         <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-wrap items-end gap-x-6 gap-y-4">
    //             <DateInput label="Start Date" value={startDate} onChange={e => setStartDate(e.target.value)} />
    //             <DateInput label="End Date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                
    //             {/* Fixed Refresh Button */}
    //             <div className="pt-6">
    //                 <button 
    //                     onClick={handleGenerateNew}
    //                     disabled={isLoading}
    //                     className="flex items-center justify-center h-11 px-6 bg-red-600 text-white font-semibold rounded-md shadow-sm hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors"
    //                 >
    //                     <RefreshCw className={`mr-2 h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
    //                     {isLoading ? 'Refreshing...' : 'Refresh'}
    //                 </button>
    //             </div>
    //         </div>

    //         {isLoading ? (
    //             <div className="flex justify-center items-center p-20"><Loader2 className="w-12 h-12 animate-spin text-red-800" /></div>
    //         ) : error ? (
    //             <div className="p-4 text-red-800 bg-red-100 rounded-md flex items-center gap-3"><AlertCircle /> {error}</div>
    //         ) : data ? (
    //             <div className="space-y-8">
    //                 {/* The UI flow is now: High-level metrics -> Detailed Table -> Synthesized Analysis */}
    //                 <OverviewMetrics data={data} />
    //                 {/* Render the new, detailed heatmap table */}
    //                 <DocumentHeatmapCard metadata={data.filteredMetadata} />
    //                 <RiskAssessmentCard data={data.riskAssessment} />
    //                 <ImpactAnalysisCard data={data.impactAnalysis} />
    //                 <RecommendationsCard data={data.recommendations} />
    //             </div>

    //         ) : null}
    //     </div>
    // );
}