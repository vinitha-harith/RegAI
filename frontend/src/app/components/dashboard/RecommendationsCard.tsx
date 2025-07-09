import { Zap, Clock, ChevronsRight } from 'lucide-react';

interface RecommendationsData {
    immediate: string[];
    short_term: string[];
    long_term: string[];
}

const RecommendationColumn = ({ title, icon: Icon, color, recommendations }) => (
    <div className={`p-4 rounded-lg bg-opacity-50 ${color.bg} border-l-4 ${color.border}`}>
        <h3 className={`font-semibold flex items-center mb-3 ${color.text}`}>
            <Icon className="mr-2 h-5 w-5"/>
            {title}
        </h3>
        <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
             {recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
        </ul>
    </div>
);

export const RecommendationsCard = ({ data }: { data: RecommendationsData }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Recommendations</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <RecommendationColumn 
                title="Immediate Actions"
                icon={Zap}
                color={{ bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-800' }}
                recommendations={data.immediate}
            />
            <RecommendationColumn 
                title="Short-term (3-6 months)"
                icon={Clock}
                color={{ bg: 'bg-orange-50', border: 'border-orange-400', text: 'text-orange-800' }}
                recommendations={data.short_term}
            />
             <RecommendationColumn 
                title="Long-term (6+ months)"
                icon={ChevronsRight}
                color={{ bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-800' }}
                recommendations={data.long_term}
            />
        </div>
    </div>
);