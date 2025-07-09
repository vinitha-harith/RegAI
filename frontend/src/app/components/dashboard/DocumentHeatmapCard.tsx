import { FileSpreadsheet } from 'lucide-react';

interface HeatmapData {
    [department: string]: {
        score: number;
        level: 'High' | 'Medium' | 'Low' | 'None';
    };
}

interface DocumentMeta {
    heatmapData?: HeatmapData;
}

interface AllMetadata {
    [filename: string]: DocumentMeta;
}

const levelStyles = {
    High: 'bg-red-400',
    Medium: 'bg-orange-400',
    Low: 'bg-yellow-300',
    None: 'bg-gray-100',
};

const HeaderCell = ({ children }) => (
    <th className="p-2 border border-gray-300 bg-gray-100 text-sm font-semibold text-gray-700 text-left sticky top-0 z-10">
        {children}
    </th>
);

// --- NEW LEGEND COMPONENT ---
const HeatmapLegend = () => (
    <div className="flex items-center gap-x-6 gap-y-2 mt-4 flex-wrap">
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
    </div>
);

export const DocumentHeatmapCard = ({ metadata }: { metadata: AllMetadata }) => {
    if (!metadata || Object.keys(metadata).length === 0) {
        return (
             <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                    <FileSpreadsheet className="mr-3 h-6 w-6 text-gray-400"/>
                    Document Impact Breakdown
                </h2>
                <p className="text-sm italic text-gray-500">No source documents found for the selected filters.</p>
            </div>
        );
    }
    
    const documents = Object.entries(metadata);
    const divisions = documents[0]?.[1]?.heatmapData ? Object.keys(documents[0][1].heatmapData) : [];

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                <FileSpreadsheet className="mr-3 h-6 w-6 text-red-300"/>
                Document Impact Breakdown
            </h2>
            <div className="overflow-x-auto max-h-[400px]">
                <table className="min-w-full border-collapse text-sm">
                    <thead>
                        <tr>
                            <HeaderCell>Document</HeaderCell>
                            {divisions.map(dept => <HeaderCell key={dept}>{dept}</HeaderCell>)}
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {documents.map(([filename, meta]) => (
                            <tr key={filename} className="hover:bg-gray-50">
                                <td className="p-2 border border-gray-300 font-medium text-gray-700 align-top">
                                    <p className="w-64 truncate" title={filename}>{filename}</p>
                                </td>
                                {divisions.map(dept => {
                                    const cellData = meta.heatmapData?.[dept];
                                    const cellStyle = cellData ? levelStyles[cellData.level] : 'bg-gray-100';
                                    const cellScore = cellData ? cellData.score : 0;

                                    return (
                                        <td 
                                            key={dept} 
                                            className={`p-0 border border-gray-300 text-center align-middle w-28 ${cellStyle}`}
                                            title={`${dept}: ${cellData?.level || 'None'} Impact (Score: ${cellScore})`}
                                        >
                                            {/* --- THE FIX: SCORE IS REMOVED FROM DISPLAY --- */}
                                            <div className="h-12"></div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* --- RENDER THE NEW LEGEND --- */}
            <HeatmapLegend />
        </div>
    );
};    

//     return (
//         <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
//             <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
//                 <FileSpreadsheet className="mr-3 h-6 w-6 text-red-300"/>
//                 Document Impact Breakdown
//             </h2>
//             <div className="overflow-x-auto max-h-[400px]"> {/* Makes table scrollable */}
//                 <table className="min-w-full border-collapse text-sm">
//                     <thead>
//                         <tr>
//                             <HeaderCell>Document</HeaderCell>
//                             {divisions.map(dept => <HeaderCell key={dept}>{dept}</HeaderCell>)}
//                         </tr>
//                     </thead>
//                     <tbody className="bg-white">
//                         {documents.map(([filename, meta]) => (
//                             <tr key={filename} className="hover:bg-gray-50">
//                                 <td className="p-2 border border-gray-300 font-medium text-gray-700 align-top">
//                                     <p className="truncate w-254" title={filename}>{filename}</p>
//                                 </td>
//                                 {divisions.map(dept => {
//                                     const cellData = meta.heatmapData?.[dept];
//                                     const cellStyle = cellData ? levelStyles[cellData.level] : 'bg-gray-100';
//                                     const cellScore = cellData && cellData.score > 0 ? cellData.score : '';

//                                     return (
//                                         <td 
//                                             key={dept} 
//                                             className={`p-0 border border-gray-300 text-center align-middle w-28 ${cellStyle}`}
//                                             title={`${dept}: ${cellData?.level || 'None'} Impact (Score: ${cellScore})`}
//                                         >
//                                             <div className="flex items-center justify-center h-12">
//                                                 <span className="text-white font-bold text-xs mix-blend-difference">{cellScore}</span>
//                                             </div>
//                                         </td>
//                                     );
//                                 })}
//                             </tr>
//                         ))}
//                     </tbody>
//                 </table>
//             </div>
//         </div>
//     );
// };
