import os
import csv
import re
from datetime import datetime
from dateutil.parser import parse as parse_date 
from dateutil import relativedelta
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.output_parsers import JsonOutputParser, StrOutputParser
from langchain_core.prompts import PromptTemplate
from langgraph.graph import StateGraph, END
from typing import Dict, Any, List
import json

from .graph_state import GraphState # Ensure this is your latest version
from .ingestion import load_metadata_db

# --- Constants and Model Initialization ---
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
load_dotenv()
VECTOR_STORE_DIR = "data/vector_store"
LLM = ChatOpenAI(model="gpt-4-turbo", temperature=0, stream=False)
MAPPING_CSV_PATH = "./data/mapping.csv"
EMBEDDINGS = OpenAIEmbeddings(model="text-embedding-3-small", chunk_size=500)

# --- DEFINITIVE: Business Division columns as specified ---
BUSINESS_DIVISIONS = ["AMO", "COO Ops Americas", "COO Ops S&I", "GOTO Operations & COO", "IB Operations (BA)", "P&C Operations", "Treasury"]

ANALYSIS_CACHE_PATH = os.path.join(VECTOR_STORE_DIR, "analysis_cache.json")

def load_analysis_cache():
    """Loads the persistent analysis cache from a JSON file."""
    if os.path.exists(ANALYSIS_CACHE_PATH):
        with open(ANALYSIS_CACHE_PATH, 'r') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return {} # Return empty if file is corrupted or empty
    return {}

def save_analysis_cache(data):
    """Saves the analysis cache to a JSON file."""
    with open(ANALYSIS_CACHE_PATH, 'w') as f:
        json.dump(data, f, indent=2)

def load_mapping_data():
    with open(MAPPING_CSV_PATH, mode='r', encoding='utf-8') as infile:
        return [row for row in csv.DictReader(infile)]

# --- GRAPH NODES ---
def process_and_sort_timeline(key_dates: list[dict]) -> list[dict]:
    """
    Parses complex date strings, sorts them chronologically, and returns the sorted list.
    """
    if not key_dates or not isinstance(key_dates, list):
        return []
    
    sorted_list = []
    for item in key_dates:
        if not isinstance(item, dict) or 'date' not in item:
            continue
        
        date_str = item['date']
        sort_date = None

        try:
            # Handle date ranges by using the start date for sorting
            if " - " in date_str:
                start_date_str = date_str.split(" - ")[0]
                sort_date = parse_date(start_date_str, fuzzy=True)
            # Handle formats like "End of YYYY"
            elif date_str.lower().startswith("end of"):
                year = re.findall(r'\d{4}', date_str)
                if year:
                    sort_date = datetime(int(year[0]), 12, 31)
            # Handle relative formats like "24 Months" or "18-Month Timeline"
            elif "month" in date_str.lower():
                 # Sort these to the future
                 months_match = re.search(r'(\d+)', date_str)
                 if months_match:
                     sort_date = datetime.now() + relativedelta(months=int(months_match.group(1)))
                 else:
                     sort_date = datetime(2998, 1, 1) # Fallback for relative dates
            # Handle all other standard date formats
            else:
                 sort_date = parse_date(date_str, fuzzy=True)
        except (ValueError, TypeError):
            sort_date = datetime(2999, 1, 1) # Push errors to the very end
        
        sorted_list.append((sort_date, item))

    sorted_list.sort(key=lambda x: x[0])
    return [item for _, item in sorted_list]

def retrieve_docs_node(state):
    print("---NODE 1: Retrieving Broad Context---")
    vector_store = FAISS.load_local(VECTOR_STORE_DIR, EMBEDDINGS, allow_dangerous_deserialization=True)
    retriever = vector_store.as_retriever(search_kwargs={"k": 25})
    docs = retriever.invoke(f"All information about the document: {state['document_name']}")
    return {"retrieved_docs": docs}

def generate_full_report_node(state):
    print("---NODE 2: Generating Full Report (Single Call)---")
    docs_context = "\n\n---\n\n".join([d.page_content for d in state["retrieved_docs"]])
    mapping_data = load_mapping_data()
    functions_for_prompt = "\n".join([f"- {row['Lifecycle']}: {row['Definition']}" for row in mapping_data])

    prompt = PromptTemplate(
        template="""You are a world-class financial regulatory analyst AI. Your entire response MUST be a single, valid JSON object.
        Based on the provided DOCUMENT CONTEXT, generate a complete report with 'regulatorySummary', 'impactAssessment', and 'keyDates'.

        **CRITICAL INSTRUCTIONS:**
        1.  **regulatorySummary**: Generate detailed paragraphs for 'purpose', 'scope', and 'relevance'.
        2.  **impactAssessment**: Generate a detailed 'introduction'. Then, from the provided LIST OF BUSINESS LIFECYCLES, identify all relevant lifecycles and list them in the 'affectedAreas'. For each, provide a comprehensive 'impact' description based on the DOCUMENT CONTEXT.
        3.  **keyDates**: Meticulously extract ALL absolute dates, standalone years, and relative timelines. For each, create an object with 'date', 'event', and 'regulation' keys.

        DOCUMENT CONTEXT: {context}
        LIST OF BUSINESS LIFECYLCES: {all_functions}
        """,
        input_variables=["context", "all_functions"]
    )
    
    chain = prompt | LLM | JsonOutputParser()
    
    try:
        generation = chain.invoke({
            "context": docs_context,
            "all_functions": functions_for_prompt
        })
        
        # Sort the keyDates before finalizing the output
        if "keyDates" in generation and isinstance(generation["keyDates"], list):
            generation["keyDates"] = process_and_sort_timeline(generation["keyDates"])
            
        return {"final_generation": generation}
    except Exception as e:
        print(f"ERROR: JSON Generation failed. Creating a default empty structure. Error: {e}")
        # Return a structured empty result that matches the optional model
        return {"final_generation": {
            "regulatorySummary": {
                "purpose": "Analysis failed to generate.",
                "scope": "Analysis failed to generate.",
                "relevance": "Analysis failed to generate."
            },
            "impactAssessment": {
                "introduction": "Analysis failed to generate.",
                "affectedAreas": []
            },
            "keyDates": [],
            "heatmapData": None,
            "impactedLifecycles": []
        }}

workflow = StateGraph(GraphState)
workflow.add_node("retrieve_docs", retrieve_docs_node)
workflow.add_node("generate_full_report", generate_full_report_node)
workflow.set_entry_point("retrieve_docs")
workflow.add_edge("retrieve_docs", "generate_full_report")
workflow.add_edge("generate_full_report", END)
rag_app = workflow.compile()


def analyze_document_logic(document_name: str):
    """
    Invokes the RAG graph, then augments the result with pre-computed metadata.
    """
    # 1. Run the existing, stable RAG pipeline for prose generation
    inputs = {"document_name": document_name}
    final_state = rag_app.invoke(inputs)
    final_output = final_state.get('final_generation')

    if not final_output:
        raise Exception("Qualitative analysis generation failed.")
    
    # 2. Augment the output with pre-computed data from the metadata DB
    metadata_db = load_metadata_db()
    document_meta = metadata_db.get(document_name, {})
    
    # Add the heatmap data if it exists
    final_output['heatmapData'] = document_meta.get('heatmapData', None)
    final_output['impactedLifecycles'] = document_meta.get('impactedLifecycles', []) 
    
    return final_output

# def analyze_document_logic(document_name: str):
#     inputs = {"document_name": document_name}
#     final_state = rag_app.invoke(inputs)
#     final_output = final_state.get('final_generation')
#     if not final_output:
#         raise Exception("Analysis generation failed to produce any output.")
#     return final_output


def chat_with_documents_logic(
    question: str, 
    start_date: str | None = None, 
    end_date: str | None = None,
    tags: list[str] | None = None,
    regions: list[str] | None = None
):
    """
    Handles chat using Multi-Query RAG with advanced metadata filtering.
    """
    print(f"---CHAT: Q: {question}, Tags: {tags}, Regions: {regions}---")
        
    # 1. Generate multiple queries from the user's question
    query_gen_prompt = PromptTemplate(
        template="""You are an AI assistant. Your task is to generate 3 different versions of the given user QUESTION to retrieve relevant documents from a vector database.
        By generating multiple perspectives on the user question, you help the user overcome some of the limitations of distance-based similarity search.
        Provide these alternative questions as a JSON list of strings.

        Original question: {question}""",
        input_variables=["question"],
    )
    query_gen_chain = query_gen_prompt | LLM | JsonOutputParser()
    generated_queries = query_gen_chain.invoke({"question": question})
    # Also include the original question for good measure
    generated_queries.append(question)
    print(f"Generated queries: {generated_queries}")

    # --- METADATA FILTERING LOGIC ---

    # --- 1. Filter by metadata DB first ---
    metadata_db = load_metadata_db()
    allowed_filenames = list(metadata_db.keys())

    if tags:
        allowed_filenames = [
            fname for fname in allowed_filenames
            if all(tag.lower() in [t.lower() for t in metadata_db[fname].get('tags', [])] for tag in tags)
        ]
    
    if regions:
        allowed_filenames = [
            fname for fname in allowed_filenames
            if all(region.lower() in [r.lower() for r in metadata_db[fname].get('regions', [])] for region in regions)
        ]
    
    if not allowed_filenames:
        return {"answer": "No documents match the specified tag or region filters."}
    
    # --- 2. Build the FAISS filter lambda function ---
    def metadata_filter(metadata: dict) -> bool:
        # Filter by filename first
        if metadata.get("source_file") not in allowed_filenames:
            return False
        
        # Then filter by date
        pub_date_str = metadata.get("publication_date")
        if not pub_date_str: return False
        if start_date and pub_date_str < start_date: return False
        if end_date and pub_date_str > end_date: return False
        
        return True

    filter_lambda = None
    filter_lambda = metadata_filter


    # 2. Retrieve documents for each query
    vector_store = FAISS.load_local(VECTOR_STORE_DIR, EMBEDDINGS, allow_dangerous_deserialization=True)
    # Apply the filter if it exists
    search_kwargs = {"k": 5}
    if filter_lambda:
        search_kwargs["filter"] = filter_lambda

    retriever = vector_store.as_retriever(search_kwargs=search_kwargs)    
    # retriever = vector_store.as_retriever(search_kwargs={"k": 5})
    
    unique_docs = {}
    for q in generated_queries:
        docs = retriever.invoke(q)
        for doc in docs:
            unique_docs[doc.page_content] = doc
    
    retrieved_docs = list(unique_docs.values())
    docs_context = "\n\n---\n\n".join([d.page_content for d in retrieved_docs])
    print(f"Retrieved {len(retrieved_docs)} unique chunks for context.")

    # 3. Generate the final answer based on the rich context
    final_prompt = PromptTemplate(
        template="""You are a helpful AI assistant for a financial regulatory analyst.
        Answer the user's QUESTION based ONLY on the provided CONTEXT.
        Be as comprehensive as possible, and helpful. If the answer is not found in the context, state that clearly.

        CONTEXT:
        {context}

        QUESTION:
        {question}

        ANSWER:""",
        input_variables=["context", "question"]
    )
    
    final_chain = final_prompt | LLM | StrOutputParser()
    answer = final_chain.invoke({
        "context": docs_context,
        "question": question
    })
    
    return {"answer": answer}