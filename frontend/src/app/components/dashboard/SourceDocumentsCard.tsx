import { FileText } from 'lucide-react';
import { MiniHeatmap } from '../MiniHeatmap'; // Import the new component

interface DocumentMeta {
    heatmapData?: any; // Use 'any' for flexibility, could be more specific
    // Add other metadata fields if needed, e.g., author
}

interface AllMetadata {
    [filename: string]: DocumentMeta;
}

export const SourceDocumentsCard = ({ metadata }: { metadata: AllMetadata }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-full">
        <h3 className="text-lg font-semibold text-gray-700 flex items-center mb-4">
            <FileText className="mr-3 h-6 w-6 text-red-300"/>
            Source Documents for this Analysis
        </h3>
        {metadata && Object.keys(metadata).length > 0 ? (
            <div className="space-y-4">
                {Object.entries(metadata).map(([filename, meta]) => (
                    <div key={filename} className="p-3 border rounded-md bg-gray-50/50">
                        <p className="text-sm font-medium text-gray-800 truncate" title={filename}>
                            {filename}
                        </p>
                        {meta.heatmapData && (
                            <div className="mt-2">
                                <MiniHeatmap data={meta.heatmapData} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        ) : <p className="text-sm italic">No source documents found in the selected date range.</p>}
    </div>
);