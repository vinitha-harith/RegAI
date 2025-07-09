# from .rag_builder import LLM, EMBEDDINGS, VECTOR_STORE_DIR
# from langchain_community.vectorstores import FAISS
# from langchain_core.prompts import PromptTemplate
# # --- IMPORT THE NEW, ROBUST PARSERS ---
# from langchain.output_parsers import PydanticOutputParser, OutputFixingParser
# from langchain_core.pydantic_v1 import BaseModel, Field
# from langchain_core.output_parsers import JsonOutputParser
# from .ingestion import load_metadata_db
# from typing import Dict, Any, List

# def get_upcoming_dates(start_date: str, end_date: str) -> list[dict]:
#     # This remains a placeholder
#     return []

# def generate_dashboard_logic(start_date: str | None = None, end_date: str | None = None, tags: list[str] | None = None, regions: list[str] | None = None):
#     print(f"---DASHBOARD SERVICE: Generating overview with Filters: Start={start_date}, End={end_date}, Tags={tags}, Regions={regions}---")

#     # 1. First, pre-filter filenames based on the editable metadata (tags, regions)
#     metadata_db = load_metadata_db()
#     allowed_filenames = list(metadata_db.keys())

#     if tags:
#         allowed_filenames = [
#             fname for fname in allowed_filenames
#             if all(tag.lower() in [t.lower() for t in metadata_db.get(fname, {}).get('tags', [])] for tag in tags)
#         ]
    
#     if regions:
#         allowed_filenames = [
#             fname for fname in allowed_filenames
#             if all(region.lower() in [r.lower() for r in metadata_db.get(fname, {}).get('regions', [])] for region in regions)
#         ]

#     # If tag/region filters result in no documents, we can exit early.
#     if not allowed_filenames:
#         return {
#             "riskAssessment": {"level": "N/A", "factors": ["No documents match the specified tag/region filters."], "mitigations": []},
#             "impactAnalysis": [], "recommendations": {"immediate": [], "short_term": [], "long_term": []}, "upcomingDates": [],
#             "regionalRelevance": [], "topCategories": [], "sourceDocuments": []
#         }
    
#     # 2. Now, create a single, powerful filter function for FAISS.
#     # This function will check against our pre-filtered filename list AND the date range.
#     def combined_metadata_filter(metadata: Dict[str, Any]) -> bool:
#         # Check 1: Is the document's source file in our allowed list?
#         if metadata.get("source_file") not in allowed_filenames:
#             return False
        
#         # Check 2: Apply date filtering to the remaining documents.
#         pub_date_str = metadata.get("publication_date")
#         if start_date or end_date:
#             if not pub_date_str:
#                 return False  # Exclude docs with no date if date filtering is active
            
#             is_after_start = not start_date or pub_date_str >= start_date
#             is_before_end = not end_date or pub_date_str <= end_date
            
#             if not (is_after_start and is_before_end):
#                 return False # If it's outside the date range, filter it out.
        
#         # If the chunk passes all checks, include it.
#         return True

#     # 3. Perform RAG only on the documents that passed all filters.
#     vector_store = FAISS.load_local(VECTOR_STORE_DIR, EMBEDDINGS, allow_dangerous_deserialization=True)
#     retriever = vector_store.as_retriever(
#         search_kwargs={"k": 50, "filter": combined_metadata_filter}
#     )
    
#     docs = retriever.invoke("Holistic overview of all key risks, impacts, and recommendations across all relevant financial regulations")
    
#     # Check if retrieval returned any documents after all filtering
#     if not docs:
#         return {
#             "riskAssessment": {"level": "N/A", "factors": ["No documents match the specified date range."], "mitigations": []},
#             "impactAnalysis": [], "recommendations": {"immediate": [], "short_term": [], "long_term": []}, "upcomingDates": [],
#             "regionalRelevance": [], "topCategories": [], "sourceDocuments": []
#         }

#     docs_context = "\n\n---\n\n".join([d.page_content for d in docs])

#     # 4. Generate the dashboard with the LLM.
#     prompt = PromptTemplate(
#         template="""You are a Chief Risk Officer AI. Your entire response MUST be a single, valid JSON object and nothing else.
#         Based on the provided CONTEXT from multiple regulatory documents, generate a high-level strategic dashboard.
        
#         **JSON STRUCTURE REQUIREMENTS:**
#         - "riskAssessment": An object with "level" (string), "factors" (list of strings), and "mitigations" (list of strings).
#         - "impactAnalysis": A list of objects, each with a "title" and a "description".
#         - "recommendations": An object with "immediate", "short_term", and "long_term" keys, each holding a list of strings.

#         Synthesize the information to provide a consolidated, strategic view.
#         Do not add any text before or after the JSON object.

#         CONTEXT:
#         {context}
#         """,
#         input_variables=["context"]
#     )
    
#     # --- THE FIX: Implement the OutputFixingParser ---
#     # 1. We still use a basic JsonOutputParser as the first attempt.
#     base_parser = JsonOutputParser()
    
#     # 2. We wrap it with the OutputFixingParser. This is our safety net.
#     #    It will use the LLM to fix any parsing errors from the first attempt.
#     output_fixing_parser = OutputFixingParser.from_llm(parser=base_parser, llm=LLM)

#     # 3. The chain now uses the self-healing parser.
#     chain = prompt | LLM | output_fixing_parser
    
#     try:
#         dashboard_data = chain.invoke({"context": docs_context})
#     except Exception as e:
#         print(f"CRITICAL ERROR: OutputFixingParser failed. {e}")
#         # If even the fixer fails, return a default structure.
#         return {"riskAssessment": {"level": "Error", "factors": ["Failed to generate analysis."], "mitigations": []}, "impactAnalysis": [], "recommendations": {"immediate": [], "short_term": [], "long_term": []}, "upcomingDates": [], "regionalRelevance": [], "topCategories": [], "sourceDocuments": []}


#     # 5. Add final metadata (Unchanged)
#     final_source_docs = sorted(list(set(d.metadata['source_file'] for d in docs)))
#     dashboard_data["upcomingDates"] = get_upcoming_dates(start_date, end_date) 
#     filtered_meta = {fname: metadata_db[fname] for fname in final_source_docs if fname in metadata_db}
#     dashboard_data["regionalRelevance"] = list(set(region for meta in filtered_meta.values() for region in meta.get('regions', [])))
#     dashboard_data["topCategories"] = list(set(tag for meta in filtered_meta.values() for tag in meta.get('tags', [])))
#     dashboard_data["sourceDocuments"] = final_source_docs

#     return dashboard_data


from .rag_builder import LLM, EMBEDDINGS, VECTOR_STORE_DIR
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from .ingestion import load_metadata_db
from datetime import datetime, timedelta

def get_upcoming_dates(start_date: str, end_date: str) -> list[dict]:
    """
    In a real system, this would query a database of all extracted key dates.
    This placeholder simulates finding dates within the next year.
    """
    # This remains a placeholder as we aren't saving all key dates centrally yet.
    return []

def generate_dashboard_logic(start_date: str | None = None, end_date: str | None = None):
    print(f"---DASHBOARD SERVICE: Generating overview for Start: {start_date}, End: {end_date}---")
    
    # --- 1. Filter documents based on provided date range ---
    metadata_db = load_metadata_db()
    all_filenames = list(metadata_db.keys())
    print(all_filenames)
    filtered_filenames = []

    if start_date or end_date:
        for fname in all_filenames:
            pub_date_str = metadata_db.get(fname, {}).get("publication_date")
            print(fname, pub_date_str)
            if not pub_date_str: continue # Skip if no date
            
            is_after_start = not start_date or pub_date_str >= start_date
            is_before_end = not end_date or pub_date_str <= end_date
            
            if is_after_start and is_before_end:
                filtered_filenames.append(fname)
    else:
        # If no dates are provided, use all documents
        filtered_filenames = all_filenames

    if not filtered_filenames:
        # Return a default structure if no documents match the filter
        return {
            "riskAssessment": {"level": "N/A", "factors": ["No documents in date range."], "mitigations": []},
            "impactAnalysis": [],
            "recommendations": {"immediate": [], "short_term": [], "long_term": []},
            "upcomingDates": [],
            "regionalRelevance": [],
            "topCategories": [],
            "sourceDocuments": []
        }

    # --- 2. Perform RAG only on the filtered documents ---
    def metadata_filter(metadata: dict) -> bool:
        return metadata.get("source_file") in filtered_filenames

    vector_store = FAISS.load_local(VECTOR_STORE_DIR, EMBEDDINGS, allow_dangerous_deserialization=True)
    retriever = vector_store.as_retriever(
        search_kwargs={"k": 50, "filter": metadata_filter}
    )
    
    docs = retriever.invoke("Holistic overview of all key risks, impacts, and recommendations across all relevant financial regulations")
    docs_context = "\n\n---\n\n".join([d.page_content for d in docs])


    prompt = PromptTemplate(
        template="""You are a Chief Risk Officer AI. Based on the provided CONTEXT from multiple regulatory documents, generate a high-level strategic dashboard.
        
        Your response must be a single JSON object with three keys: "riskAssessment", "impactAnalysis", and "recommendations".

        1.  **riskAssessment**:
            -   `level`: Assess the overall risk level as "Low", "Medium", or "High".
            -   `factors`: A list of 3-4 key risk factor strings.
            -   `mitigations`: A list of corresponding mitigation strategy strings.
        2.  **impactAnalysis**: A list of objects, each with a `title` (e.g., "Operational Impact") and a `description`.
        3.  **recommendations**: An object with three keys: `immediate`, `short_term`, and `long_term`. Each key should contain a list of actionable recommendation strings.

        Synthesize the information to provide a consolidated, strategic view.
        
        CONTEXT:
        {context}
        """,
        input_variables=["context"]
    )

    chain = prompt | LLM | JsonOutputParser()
    dashboard_data = chain.invoke({"context": docs_context})

    # --- 3. Add final data based on the filtered set ---
    # In a full system, you'd pass date params to get_upcoming_dates
    dashboard_data["upcomingDates"] = get_upcoming_dates(start_date, end_date) 
    
    # Aggregate metadata from the filtered set of documents
    filtered_meta = {fname: metadata_db[fname] for fname in filtered_filenames if fname in metadata_db}
    dashboard_data["regionalRelevance"] = list(set(region for meta in filtered_meta.values() for region in meta.get('regions', [])))
    dashboard_data["topCategories"] = list(set(tag for meta in filtered_meta.values() for tag in meta.get('tags', [])))
    dashboard_data["sourceDocuments"] = filtered_filenames # Add the list of source documents
    dashboard_data["filteredMetadata"] = filtered_meta

    return dashboard_data
