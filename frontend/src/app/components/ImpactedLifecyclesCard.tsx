import { ListChecks } from 'lucide-react';

export const ImpactedLifecyclesCard = ({ lifecycles }: { lifecycles: string[] }) => {
    if (!lifecycles || lifecycles.length === 0) {
        return null; // Don't render the card if there's nothing to show
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                <ListChecks className="mr-3 h-6 w-6 text-red-500" />
                Impacted Business Lifecycles
            </h2>
            <p className="text-sm text-gray-600 mb-4">The following lifecycles were identified as relevant to this regulation, contributing to the heatmap scores above.</p>
            <div className="columns-2 md:columns-3 lg:columns-4 gap-x-6">
                <ul className="space-y-2 text-sm text-red-700">
                    {lifecycles.map((item, index) => (
                        <li key={index} className="break-inside-avoid px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">{item}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
};