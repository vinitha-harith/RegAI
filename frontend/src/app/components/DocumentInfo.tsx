import { InfoIcon } from 'lucide-react';
import { DocumentInfo } from '@/app/lib/types';

const FallbackText = () => (
    <span className="italic text-gray-400">Analysis did not provide this information.</span>
);

export const RegulatoryInfo = ({ info }: { info: DocumentInfo }) => (
  <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
    <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
      <InfoIcon className="mr-3 text-red-400" /> Regulatory Document Info
    </h2>
    <div className="space-y-4 text-gray-700">
      <div>
        <h3 className="font-semibold text-lg text-gray-800">Title</h3>
        {/* Use optional chaining and a fallback component */}
        <p>{info?.title || <FallbackText />}</p>
      </div>
      <div>
        <h3 className="font-semibold text-lg text-gray-800">Author</h3>
        <p>{info?.author || <FallbackText />}</p>
      </div>
      <div>
        <h3 className="font-semibold text-lg text-gray-800">Publication Date</h3>
        <p>{info?.publication_date || <FallbackText />}</p>
      </div>
    </div>
  </div>
);