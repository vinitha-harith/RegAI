export interface RegulatorySummary {
  title: string;
  purpose: string;
  scope: string;
  relevance: string;
}

export interface AffectedArea {
  area: string;
  impact: string;
}

export interface ImpactAssessment {
  introduction: string;
  affectedAreas: AffectedArea[];
}

export interface KeyDate {
  date: string;
  event: string;
  regulation: string;
}

// --- NEW, CORRECTED TYPES FOR THE HEATMAP DASHBOARD ---

export interface HeatmapData {
    [department: string]: {
        score: number;
        level: 'High' | 'Medium' | 'Low' | 'None';
    };
}

export interface HeatmapProps {
    title: string;
    regId: string;
    description: string;
    endDate: string;
    data: HeatmapData;
}

export interface AnalysisResult {
    impactAssessment: ImpactAssessment;
    regulatorySummary: RegulatorySummary;
    keyDates: KeyDate;
    heatmapData: HeatmapData;
    impactedLifecycles: string[];
}

export interface NotificationMessage {
  id: string;
  text: string;
  timestamp: string;
}