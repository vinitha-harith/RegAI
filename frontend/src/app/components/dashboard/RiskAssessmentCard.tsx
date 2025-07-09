import { AlertTriangle, ShieldCheck } from 'lucide-react';

interface RiskData {
    level: string;
    factors: string[];
    mitigations: string[];
}

const riskLevelClasses = {
    'low': 'bg-green-100 text-green-800 border-green-200',
    'medium': 'bg-orange-100 text-orange-800 border-orange-200',
    'high': 'bg-red-100 text-red-800 border-red-200',
};

export const RiskAssessmentCard = ({ data }: { data: RiskData }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Risk Assessment</h2>
        
        <div className={`inline-block px-6 py-2 rounded-lg font-semibold border ${riskLevelClasses[data.level.toLowerCase()] || 'bg-gray-100'}`}>
            {data.level} Risk Level
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
            <div>
                <h3 className="font-semibold text-red-700 flex items-center mb-3">
                    <AlertTriangle className="mr-2 h-5 w-5"/>Risk Factors
                </h3>
                <ul className="space-y-2">
                    {data.factors.map((f, i) => (
                        <li key={i} className="flex items-start">
                           <AlertTriangle className="h-4 w-4 text-red-400 mr-2 mt-1 shrink-0" />
                           <span className="text-gray-700">{f}</span>
                        </li>
                    ))}
                </ul>
            </div>
            <div>
                <h3 className="font-semibold text-green-700 flex items-center mb-3">
                    <ShieldCheck className="mr-2 h-5 w-5"/>Mitigation Strategies
                </h3>
                <ul className="space-y-2">
                     {data.mitigations.map((m, i) => (
                        <li key={i} className="flex items-start">
                           <ShieldCheck className="h-4 w-4 text-green-400 mr-2 mt-1 shrink-0" />
                           <span className="text-gray-700">{m}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    </div>
);