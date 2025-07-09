interface Impact {
    title: string;
    description: string;
}

export const ImpactAnalysisCard = ({ data }: { data: Impact[] }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Impact Analysis</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {data.map((impact, i) => (
                <div key={i}>
                    <h3 className="text-lg font-semibold text-red-700">{impact.title}</h3>
                    <p className="mt-1 text-gray-600">{impact.description}</p>
                </div>
            ))}
        </div>
    </div>
);