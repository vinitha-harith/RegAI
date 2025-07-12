export interface RegulatorySummary {
  title: string;
  purpose: string;
  scope: string;
  relevance: string;
}

export interface DocumentInfo {
  title: string;
  author: string;
  publication_date: string;
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
    documentInfo: DocumentInfo;
}

export interface NotificationMessage {
  id: string;
  text: string;
  timestamp: string;
}

// Interface for the complete dashboard data structure
export interface DocumentMeta {
  heatmapData?: HeatmapData;
}

export interface DocumentImpact {
  [filename: string]: DocumentMeta;
}

export interface DashboardData {
  regionalRelevance: {
    regions: string[];
    active: string;
  };
  topCategories: string[];
  upcomingDates: string;
  filteredMetadata: {
       documents: DocumentImpact[];
  };
  // documentImpactBreakdown: {
  //   documents: DocumentImpact[];
  // };
  riskAssessment: {
    level: string;
    factors: string[];
    mitigations: string[];
  };
  impactAnalysis: {
    operational: string;
    strategic: string;
    financial: string;
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}