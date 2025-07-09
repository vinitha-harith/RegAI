import { Uploader } from '@/app/components/Uploader';

export default function UploadPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
        <header className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Upload New Documents</h1>
            <p className="text-lg text-gray-600 mt-2">Upload new PDF files to be included in the analysis and chat assistant.</p>
        </header>
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <Uploader />
        </div>
    </div>
  );
}