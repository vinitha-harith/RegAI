from typing import List, Dict, Any, TypedDict
from langchain_core.documents import Document

class GraphState(TypedDict):
    """
    State for the final "Hybrid Agent" RAG architecture.
    """
    document_name: str
    retrieved_docs: List[Document]  # Holds the broad context for summary/impact
    timeline_query: str             # Holds the specific query for the timeline agent
    regulatory_summary: Dict[str, Any]
    impact_assessment: Dict[str, Any]
    timeline_data: List[Dict[str, Any]]
    final_generation: Dict[str, Any]