'use client';
import { useState, useEffect, ChangeEvent } from 'react';
import { Edit, Save, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface DocumentMetadata {
    author: string;
    tags: string[];
    regions: string[];
}

interface AllMetadata {
    [filename: string]: DocumentMetadata;
}

export const MetadataManager = () => {
    const [metadata, setMetadata] = useState<AllMetadata | null>(null);
    const [editingDoc, setEditingDoc] = useState<string | null>(null);
    const [editData, setEditData] = useState<DocumentMetadata | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

    useEffect(() => {
        const fetchMetadata = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/metadata`);
                if (!res.ok) throw new Error('Failed to fetch metadata.');
                const data = await res.json();
                setMetadata(data.metadata);
            } catch (e) {
                setError(e instanceof Error ? e.message : 'An unknown error occurred.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchMetadata();
    }, []);

    const handleEditClick = (filename: string, data: DocumentMetadata) => {
        setEditingDoc(filename);
        // Create a copy of the data for editing
        setEditData({ ...data, tags: [...data.tags], regions: [...data.regions] });
    };

    const handleCancelClick = () => {
        setEditingDoc(null);
        setEditData(null);
    };

    const handleSaveClick = async (filename: string) => {
        if (!editData) return;
        setSaveStatus('saving');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/metadata/${filename}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editData),
            });
            if (!res.ok) throw new Error('Failed to save metadata.');
            
            // Update local state with the saved data
            setMetadata(prev => prev ? { ...prev, [filename]: editData } : null);
            setSaveStatus('success');
        } catch (e) {
            setSaveStatus('error');
        } finally {
           setEditingDoc(null);
           setEditData(null);
           setTimeout(() => setSaveStatus('idle'), 3000); // Reset status after 3 seconds
        }
    };
    
    // Helper to handle text input changes for author
    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        if(editData) setEditData({ ...editData, [e.target.name]: e.target.value });
    };

    // Helper to handle array changes (for tags and regions)
    const handleArrayChange = (e: ChangeEvent<HTMLInputElement>, field: 'tags' | 'regions') => {
        if(editData) {
            setEditData({ ...editData, [field]: e.target.value.split(',').map(t => t.trim()) });
        }
    };


    if (isLoading) return <div className="flex justify-center items-center p-8"><Loader2 className="animate-spin h-8 w-8 text-red-600" /></div>;
    if (error) return <div className="p-4 bg-red-100 text-red-800 rounded-md">{error}</div>;
    if (!metadata || Object.keys(metadata).length === 0) return <div className="p-4 bg-gray-100 text-gray-700 rounded-md">No documents with metadata found. Please upload documents first.</div>;
    
    return (
        <div className="space-y-6">
            {Object.entries(metadata).map(([filename, data]) => (
                <div key={filename} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <div className="flex justify-between items-start">
                        <h3 className="text-xl font-semibold text-gray-800 break-all">{filename}</h3>
                        {editingDoc !== filename && (
                            <button onClick={() => handleEditClick(filename, data)} className="flex items-center text-sm text-red-600 hover:text-red-800">
                                <Edit className="mr-1 h-4 w-4" /> Edit
                            </button>
                        )}
                    </div>
                    {editingDoc === filename && editData ? (
                        // --- EDITING VIEW ---
                        <div className="mt-4 space-y-4">
                            <div>
                                <label htmlFor="author" className="block text-sm font-medium text-gray-700">Author / Regulatory Body</label>
                                <input type="text" name="author" id="author" value={editData.author} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-2 focus:ring-red-500 focus:outline-none sm:text-sm p-2 border font-medium text-gray-500" />
                            </div>
                             <div>
                                <label htmlFor="tags" className="block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
                                <input type="text" name="tags" id="tags" value={editData.tags.join(', ')} onChange={(e) => handleArrayChange(e, 'tags')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-2 focus:ring-red-500 focus:outline-none sm:text-sm p-2 border font-medium text-gray-500" />
                            </div>
                             <div>
                                <label htmlFor="regions" className="block text-sm font-medium text-gray-700">Regions (comma-separated)</label>
                                <input type="text" name="regions" id="regions" value={editData.regions.join(', ')} onChange={(e) => handleArrayChange(e, 'regions')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-2 focus:ring-red-500 focus:outline-none sm:text-sm p-2 border font-medium text-gray-500" />
                            </div>
                            <div className="flex items-center gap-4">
                                <button onClick={() => handleSaveClick(filename)} disabled={saveStatus === 'saving'} className="flex items-center justify-center px-4 py-2 bg-green-600 text-white font-semibold rounded-md shadow-sm hover:bg-green-700 disabled:bg-gray-400">
                                    {saveStatus === 'saving' ? <Loader2 className="animate-spin h-5 w-5" /> : <><Save className="mr-2 h-4 w-4" /> Save</>}
                                </button>
                                <button onClick={handleCancelClick} className="flex items-center px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-md shadow-sm hover:bg-gray-300">
                                    <X className="mr-2 h-4 w-4" /> Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        // --- DISPLAY VIEW ---
                        <div className="mt-4 space-y-3">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Author</p>
                                <p className="text-gray-900">{data.author}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Tags</p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {data.tags.map(tag => <span key={tag} className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">{tag}</span>)}
                                </div>
                            </div>
                             <div>
                                <p className="text-sm font-medium text-gray-500">Regions</p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {data.regions.map(region => <span key={region} className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">{region}</span>)}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ))}
             {saveStatus === 'success' && <div className="mt-4 p-3 text-green-800 bg-green-100 rounded-md flex items-center"><CheckCircle className="mr-2 h-5 w-5"/>Successfully saved metadata.</div>}
             {saveStatus === 'error' && <div className="mt-4 p-3 text-red-800 bg-red-100 rounded-md flex items-center"><AlertCircle className="mr-2 h-5 w-5"/>Failed to save metadata. Please try again.</div>}
        </div>
    );
};