import { Globe, Tag, CalendarClock } from 'lucide-react';
import { KeyDate } from '@/app/lib/types';

// Define the shape of the data this component expects
interface OverviewData {
  regionalRelevance: string[];
  topCategories: string[];
  upcomingDates: KeyDate[];
}

// Reusable card component for consistent styling
const MetricCard = ({ title, icon: Icon, children }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-full">
        <h3 className="text-lg font-semibold text-gray-700 flex items-center mb-3">
            <Icon className="mr-3 h-6 w-6 text-corporate-red/70"/>
            {title}
        </h3>
        <div className="text-gray-600">
            {children}
        </div>
    </div>
);

export const OverviewMetrics = ({ data }: { data: OverviewData }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard title="Regional Relevance" icon={Globe}>
            {data.regionalRelevance && data.regionalRelevance.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {data.regionalRelevance.map(region => 
                        <span key={region} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                            {region}
                        </span>
                    )}
                </div>
            ) : <p className="text-sm italic">No specific regions identified.</p>}
        </MetricCard>
        
        <MetricCard title="Top Level Categories" icon={Tag}>
            {data.topCategories && data.topCategories.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {data.topCategories.map(category => 
                        <span key={category} className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                            {category}
                        </span>
                    )}
                </div>
            ) : <p className="text-sm italic">No specific categories identified.</p>}
        </MetricCard>

        <MetricCard title="Upcoming Key Dates" icon={CalendarClock}>
            {data.upcomingDates && data.upcomingDates.length > 0 ? (
                <ul className="space-y-2 text-sm">
                    {data.upcomingDates.map((dateItem, index) => (
                        <li key={index}>
                            <span className="font-semibold text-gray-800">{dateItem.date}:</span> {dateItem.event}
                        </li>
                    ))}
                </ul>
            ) : <p className="text-sm italic">No upcoming dates found in the analysis.</p>}
        </MetricCard>
    </div>
);
