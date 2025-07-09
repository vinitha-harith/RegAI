import { MetadataManager } from '@/app/components/MetadataManager';

export default function ManageMetadataPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
        <header className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Manage Metadata</h1>
            <p className="text-lg text-gray-600 mt-2">Edit authors, tags, and regions for each document to improve filtering.</p>
        </header>
        <MetadataManager />
    </div>
  );
}
