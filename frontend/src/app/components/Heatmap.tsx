import { HeatmapData } from '@/app/lib/types';

const levelStyles = {
    High: 'bg-red-400',
    Medium: 'bg-orange-400',
    Low: 'bg-yellow-300',
    None: 'bg-gray-100',
};

// Reusable Header Cell sub-component for consistent styling
const HeaderCell = ({ children }) => (
    <th className="p-2 border border-gray-300 bg-gray-100 text-sm font-semibold text-gray-700 text-left w-24 whitespace-nowrap">
        {children}
    </th>
);

// --- NEW LEGEND COMPONENT ---
const HeatmapLegend = () => (
    <div className="flex items-center gap-x-6 gap-y-2 mt-4 flex-wrap">
        <h4 className="text-sm font-semibold text-gray-700 mr-2">Legend:</h4>
        <div className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-sm ${levelStyles.High}`}></div>
            <span className="text-sm text-gray-600">High Impact</span>
        </div>
        <div className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-sm ${levelStyles.Medium}`}></div>
            <span className="text-sm text-gray-600">Medium Impact</span>
        </div>
        <div className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-sm ${levelStyles.Low}`}></div>
            <span className="text-sm text-gray-600">Low Impact</span>
        </div>
        <div className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-sm ${levelStyles.None} border border-gray-300`}></div>
            <span className="text-sm text-gray-600">No/Minimal Impact</span>
        </div>
    </div>
);


export const Heatmap = ({ data }: { data: HeatmapData }) => {
    if (!data || Object.keys(data).length === 0) {
        return null; // Don't render component if there's no data
    }

    const divisions = Object.keys(data);

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Quantitative Impact Heatmap</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                    <thead>
                        <tr>
                            {divisions.map(dept => <HeaderCell key={dept}>{dept}</HeaderCell>)}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            {divisions.map(dept => (
                                <td 
                                    key={dept} 
                                    className={`p-0 border border-gray-300 h-12 text-center ${levelStyles[data[dept].level]}`}
                                    title={`${dept}: ${data[dept].level} Impact (Score: ${data[dept].score})`}
                                >
                                    {/* Display the score inside the cell for quantitative detail */}
                                    <span className="text-white font-bold text-xs mix-blend-difference">
                                        {data[dept].score > 0 ? data[dept].score : ''}
                                    </span>
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
            {/* --- RENDER THE NEW LEGEND --- */}
            <HeatmapLegend />
        </div>
    );
};

// const HeaderCell = ({ children }) => (
//     <th className="p-2 border border-gray-300 bg-gray-100 text-sm font-semibold text-gray-700 text-left w-24 whitespace-nowrap">
//         {children}
//     </th>
// );

// export const Heatmap = ({ data }: { data: HeatmapData }) => {
//     if (!data || Object.keys(data).length === 0) {
//         return null;
//     }

//     const divisions = Object.keys(data);

//     return (
//         <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
//             <h2 className="text-2xl font-bold text-gray-800 mb-4">Quantitative Impact Heatmap</h2>
//             <div className="overflow-x-auto">
//                 <table className="min-w-full border-collapse">
//                     <thead>
//                         <tr>
//                             {divisions.map(dept => <HeaderCell key={dept}>{dept}</HeaderCell>)}
//                         </tr>
//                     </thead>
//                     <tbody>
//                         <tr>
//                             {divisions.map(dept => (
//                                 <td key={dept} className="p-0 border border-gray-300 h-12 text-center">
//                                     <div className={`w-full h-full flex items-center justify-center ${levelStyles[data[dept].level]}`}>
//                                         <span className="text-white font-bold text-xs mix-blend-difference">{data[dept].score > 0 ? data[dept].score : ''}</span>
//                                     </div>
//                                 </td>
//                             ))}
//                         </tr>
//                     </tbody>
//                 </table>
//             </div>
//         </div>
//     );
// };