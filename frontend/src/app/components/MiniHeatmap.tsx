interface HeatmapData {
    [department: string]: {
        level: 'High' | 'Medium' | 'Low' | 'None';
    };
}

// Same color styles from your main Heatmap component for consistency
const levelStyles = {
    High: 'bg-red-400',
    Medium: 'bg-orange-400',
    Low: 'bg-yellow-300',
    None: 'bg-gray-200',
};

export const MiniHeatmap = ({ data }: { data: HeatmapData }) => {
    if (!data || Object.keys(data).length === 0) {
        return null; // Don't render if there's no data
    }

    const divisions = Object.keys(data);

    return (
        <div className="flex w-full h-3 rounded-full overflow-hidden" title="Impact Heatmap">
            {divisions.map(dept => (
                <div 
                    key={dept} 
                    className={`flex-1 ${levelStyles[data[dept].level]}`}
                    // Add a tooltip to show the department and level on hover
                    title={`${dept}: ${data[dept].level} Impact`}
                ></div>
            ))}
        </div>
    );
};