import { FileText } from 'lucide-react';
import { RegulatorySummary as SummaryType } from '@/app/lib/types';

const FallbackText = () => (
    <span className="italic text-gray-400">Analysis did not provide this information.</span>
);

export const RegulatorySummary = ({ summary }: { summary: SummaryType }) => (
  <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
    <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
      <FileText className="mr-3 text-red-600" /> Regulatory Summary
    </h2>
    <div className="space-y-4 text-gray-700">
      <div>
        <h3 className="font-semibold text-lg text-gray-800">Purpose</h3>
        {/* Use optional chaining and a fallback component */}
        <p>{summary?.purpose || <FallbackText />}</p>
      </div>
      <div>
        <h3 className="font-semibold text-lg text-gray-800">Scope</h3>
        <p>{summary?.scope || <FallbackText />}</p>
      </div>
      <div>
        <h3 className="font-semibold text-lg text-gray-800">Why It Matters</h3>
        <p>{summary?.relevance || <FallbackText />}</p>
      </div>
    </div>
  </div>
);