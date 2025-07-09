'use client';
import { useState, FormEvent, ChangeEvent } from 'react';
import { UploadCloud, FileText, X, Loader2, CheckCircle } from 'lucide-react';

export const Uploader = () => {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            if (e.target.files[0].type === "application/pdf") {
                setFile(e.target.files[0]);
                setStatus('idle');
                setMessage('');
            } else {
                setStatus('error');
                setMessage('Invalid file type. Please select a PDF.');
            }
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!file) {
            setStatus('error');
            setMessage('Please select a file to upload.');
            return;
        }

        setStatus('uploading');
        setMessage('Uploading and processing...');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/upload`, {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || 'Upload failed.');
            }

            setStatus('success');
            setMessage(`Successfully uploaded and processed ${data.filename}. It's now available for analysis.`);
        } catch (error) {
            setStatus('error');
            setMessage(error instanceof Error ? error.message : 'An unknown error occurred.');
        } finally {
            setFile(null); // Clear file input after submission
        }
    };

    return (
        <div className="w-full">
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col items-center justify-center w-full p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <UploadCloud className="w-12 h-12 text-gray-400 mb-4" />
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700">
                        <span>Select PDF File</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="application/pdf" onChange={handleFileChange} />
                    </label>
                    <p className="mt-2 text-sm text-gray-500">PDFs only, up to 50MB.</p>
                </div>
            </form>

            {file && (
                <div className="mt-4 p-3 border rounded-lg bg-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <FileText className="w-6 h-6 text-red-500" />
                        <span className="font-medium text-gray-700">{file.name}</span>
                    </div>
                    <button onClick={() => setFile(null)} className="p-1 text-gray-400 hover:text-gray-600">
                        <X />
                    </button>
                </div>
            )}

            {file && (
                 <button onClick={handleSubmit} disabled={status === 'uploading'} className="mt-4 w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center">
                    {status === 'uploading' ? (
                        <>
                           <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                           Processing...
                        </>
                    ) : (
                        'Upload and Process Document'
                    )}
                </button>
            )}

            {status === 'success' && (
                <div className="mt-4 p-4 text-green-800 bg-green-100 border border-green-200 rounded-lg flex items-center">
                    <CheckCircle className="mr-3 h-5 w-5" />
                    {message}
                </div>
            )}
             {status === 'error' && message && (
                <div className="mt-4 p-4 text-red-800 bg-red-100 border border-red-200 rounded-lg">
                    {message}
                </div>
            )}
        </div>
    );
};