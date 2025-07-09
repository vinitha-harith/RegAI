import { AlertTriangle, Info } from 'lucide-react';
import { ImpactAssessment as AssessmentType } from '@/app/lib/types';

export const ImpactAssessment = ({ assessment }: { assessment: AssessmentType }) => {
  // Defensive check: Ensure assessment and affectedAreas exist and have content
  const hasContent = assessment?.affectedAreas && assessment.affectedAreas.length > 0;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
        <AlertTriangle className="mr-3 text-yellow-500" /> Preliminary Impact Assessment
      </h2>
      <p className="text-gray-600 italic mb-6">
        {assessment?.introduction || "An analysis of potential operational impacts."}
      </p>
      <div className="space-y-4">
        {hasContent ? (
          assessment.affectedAreas.map((item, index) => (
            <div key={`${item.area}-${index}`} className="border-l-4 border-yellow-500 pl-4">
              <h3 className="font-semibold text-lg text-gray-800">{item.area}</h3>
              <p className="text-gray-700">
                {/* Provide a fallback for the impact description itself */}
                {item.impact || <span className="italic text-gray-400">No description provided.</span>}
              </p>
            </div>
          ))
        ) : (
          <div className="flex items-center text-gray-500">
            <Info className="w-5 h-5 mr-2 shrink-0"/>
            <p>No specific impact areas were identified in the analysis.</p>
          </div>
        )}
      </div>
    </div>
  );
};
