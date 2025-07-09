import { CalendarCheck, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';
import { KeyDate } from '@/app/lib/types';
import { differenceInMonths, parse, isValid } from 'date-fns';

interface StyleProps {
  borderColor: string;
  iconBgColor: string;
  textColor: string;
  icon: React.ElementType;
}

/**
 * Parses a date string safely for styling purposes, handling ranges and fuzzy dates.
 * It primarily looks for the first parseable part of the string.
 */
function parseDateForStyle(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  
  const cleanDateStr = dateStr.split(' - ')[0].trim(); // Isolate the start date for ranges
  
  // Try parsing common formats. date-fns' `parse` is more forgiving than the native `new Date()`
  try {
    const parsed = parse(cleanDateStr, 'd MMMM yyyy', new Date());
    if (isValid(parsed)) return parsed;
    
    const parsedMonth = parse(cleanDateStr, 'MMMM yyyy', new Date());
    if (isValid(parsedMonth)) return parsedMonth;
    
    const parsedYear = parse(cleanDateStr, 'yyyy', new Date());
    if (isValid(parsedYear)) return parsedYear;
  } catch (e) { /* Fallback to general parsing */ }

  const generalParsed = new Date(cleanDateStr);
  return isValid(generalParsed) ? generalParsed : null;
}

/**
 * Returns Tailwind CSS classes and an icon based on the date's status.
 */
function getTimelineItemStyle(dateStr: string): StyleProps {
  const date = parseDateForStyle(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Normalize 'now' to the start of the day

  const defaultStyle: StyleProps = {
    borderColor: 'border-blue-500',
    iconBgColor: 'bg-blue-500',
    textColor: 'text-blue-700',
    icon: Clock,
  };
  
  if (!date) return defaultStyle; // Return default for relative dates like "24 Months"
  
  const monthsDiff = differenceInMonths(date, now);

  if (date < now) {
    // Past
    return { borderColor: 'border-gray-400', iconBgColor: 'bg-gray-400', textColor: 'text-gray-600', icon: ShieldCheck };
  }
  if (monthsDiff <= 6) {
    // Due within 6 months
    return { borderColor: 'border-red-500', iconBgColor: 'bg-red-500', textColor: 'text-red-700', icon: AlertTriangle };
  }
  if (monthsDiff <= 12) {
    // Due within 1 year
    return { borderColor: 'border-orange-500', iconBgColor: 'bg-orange-500', textColor: 'text-orange-700', icon: AlertTriangle };
  }
  // Future (more than a year away)
  return { borderColor: 'border-green-500', iconBgColor: 'bg-green-500', textColor: 'text-green-700', icon: Clock };
}

export const Timeline = ({ dates }: { dates: KeyDate[] }) => {
  // If dates are empty or not an array, show the fallback UI
  if (!Array.isArray(dates) || dates.length === 0) {
    return <div className="p-6 bg-white rounded-lg shadow-md border"><p className="text-gray-500">No key dates were extracted for this document.</p></div>;
  }

  // NO MORE SORTING ON THE FRONTEND! We trust the backend's order.
  const timelineDates = dates.filter(item => item && item.date && item.event);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <CalendarCheck className="mr-3 text-gray-700" /> Critical Compliance Dates
      </h2>
      <div className="relative border-l-2 border-gray-300 ml-4">
        {timelineDates.map((item, index) => {
          const { borderColor, iconBgColor, textColor, icon: Icon } = getTimelineItemStyle(item.date);
          
          return (
            <div key={`${item.date}-${index}`} className="mb-8 ml-8">
              <span className={`absolute -left-[11px] flex items-center justify-center w-6 h-6 ${iconBgColor} rounded-full ring-4 ring-white`}>
                <Icon className="w-3.5 h-3.5 text-white" />
              </span>
              <div className={`bg-gray-50 p-4 rounded-lg border-l-4 ${borderColor}`}>
                <time className={`text-sm font-bold ${textColor} capitalize`}>
                  {item.date}
                </time>
                <h3 className="text-lg font-semibold text-gray-900 mt-1">{item.regulation}</h3>
                <p className="text-base font-normal text-gray-600">{item.event}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};