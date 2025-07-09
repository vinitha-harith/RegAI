from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

# --- Models for Document Analysis and Review Page ---

class RegulatorySummaryModel(BaseModel):
    # --- FIX: Make all fields optional to handle partial generation ---
    purpose: Optional[str] = None
    scope: Optional[str] = None
    relevance: Optional[str] = None

class AffectedAreaModel(BaseModel):
    area: Optional[str] = None
    impact: Optional[str] = None

class ImpactAssessmentModel(BaseModel):
    # --- FIX: Make all fields optional ---
    introduction: Optional[str] = None
    affectedAreas: List[AffectedAreaModel] = []

class KeyDateModel(BaseModel):
    date: Optional[str] = None
    event: Optional[str] = None
    regulation: Optional[str] = None

class HeatmapEntryModel(BaseModel):
    score: int
    level: str

# This is the main model for a complete analysis result, used for caching.
class AnalysisResultModel(BaseModel):
    # --- FIX: Make all top-level keys optional ---
    regulatorySummary: Optional[RegulatorySummaryModel] = None
    impactAssessment: Optional[ImpactAssessmentModel] = None
    keyDates: Optional[List[KeyDateModel]] = None
    heatmapData: Optional[Dict[str, HeatmapEntryModel]] = None
    impactedLifecycles: Optional[List[str]] = None


# --- Models for other API Endpoints (Unchanged but included for completeness) ---
class AnalyzeRequest(BaseModel):
    document_name: str

class DocumentListResponse(BaseModel):
    documents: List[str]

class ChatRequest(BaseModel):
    question: str
    start_date: Optional[str] = Field(None)
    end_date: Optional[str] = Field(None)
    tags: Optional[List[str]] = Field(None)
    regions: Optional[List[str]] = Field(None)

class DocumentMetadata(BaseModel):
    author: str
    tags: List[str]
    regions: List[str]
    heatmapData: Optional[Dict[str, HeatmapEntryModel]] = None
    impactedLifecycles: Optional[List[str]] = None

class AllMetadataResponse(BaseModel):
    metadata: Dict[str, DocumentMetadata]
    
class NotifyRequest(BaseModel):
    document_name: str
    impacted_divisions: List[str]