import os
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

from .graph_state import GraphState
from .ingestion import load_metadata_db

# --- Constants and Model Initialization ---
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
load_dotenv()
VECTOR_STORE_DIR = "data/vector_store"
LLM = ChatOpenAI(model="gpt-4-turbo", temperature=0, stream=False)
EMBEDDINGS = OpenAIEmbeddings(model="text-embedding-3-small", chunk_size=500)
print("Models initialized.")


# --- NEW, ROBUST DATE PARSING & SORTING FUNCTION ---
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


# --- THE PROVEN WORKING ARCHITECTURE ---

# --- NODE 1: SINGLE, POWERFUL RETRIEVAL ---
def retrieve_docs_node(state):
    print("---NODE 1: Retrieving Broad Context---")
    vector_store = FAISS.load_local(VECTOR_STORE_DIR, EMBEDDINGS, allow_dangerous_deserialization=True)
    retriever = vector_store.as_retriever(search_kwargs={"k": 25})
    docs = retriever.invoke(f"All information, summaries, impacts, and timelines about the document: {state['document_name']}")
    print(f"Retrieved {len(docs)} chunks for analysis.")
    return {"retrieved_docs": docs}


# --- NODE 2: SINGLE, ALL-IN-ONE GENERATION WITH FINAL SORTING ---
def generate_full_report_node(state):
    print("---NODE 2: Generating Full Report---")
    docs_context = "\n\n---\n\n".join([d.page_content for d in state["retrieved_docs"]])
    
    prompt = PromptTemplate(
        template="""You are a world-class financial regulatory analyst AI. Your entire response MUST be a single, valid JSON object.
        Based on the provided CONTEXT, generate a complete report with three sections: 'regulatorySummary', 'impactAssessment', and 'keyDates'.

        **CRITICAL INSTRUCTIONS:**
        1.  **ADOPT THE DOCUMENT'S PERSPECTIVE:** Synthesize the author's specific arguments, concerns, and recommendations.
        2.  **regulatorySummary**: Generate detailed paragraphs for 'purpose', 'scope', and 'relevance'.
        3.  **impactAssessment**: For EVERY 'affectedAreas' item, provide a comprehensive 'impact' description summarizing the author's view.
        4.  **keyDates**: Meticulously extract ALL absolute dates, standalone years (e.g., "2019"), AND relative timelines (e.g., "18-month timeline"). For each, create a complete object with 'date', 'event', and 'regulation' keys. If no dates are found, return an empty list `[]`.

        CONTEXT: {context}
        DOCUMENT NAME: {document_name}""",
        input_variables=["context", "document_name"]
    )
    
    chain = prompt | LLM | JsonOutputParser()
    
    try:
        generation = chain.invoke({
            "context": docs_context,
            "document_name": state["document_name"]
        })
        
        # --- THE FIX: Sort the keyDates before finalizing the output ---
        if "keyDates" in generation and isinstance(generation["keyDates"], list):
            sorted_dates = process_and_sort_timeline(generation["keyDates"])
            generation["keyDates"] = sorted_dates
            
        return {"final_generation": generation}
    except Exception as e:
        print(f"ERROR: JSON Generation failed. {e}")
        return {"final_generation": {"regulatorySummary": {}, "impactAssessment": {}, "keyDates": []}}


# --- BUILD THE FINAL, SIMPLE, AND RELIABLE GRAPH ---
workflow = StateGraph(GraphState)
workflow.add_node("retrieve_docs", retrieve_docs_node)
workflow.add_node("generate_full_report", generate_full_report_node)
workflow.set_entry_point("retrieve_docs")
workflow.add_edge("retrieve_docs", "generate_full_report")
workflow.add_edge("generate_full_report", END)
rag_app = workflow.compile()

# Analysis logic entry point
def analyze_document_logic(document_name: str):
    inputs = {"document_name": document_name}
    final_state = rag_app.invoke(inputs)
    final_output = final_state.get('final_generation')

    if not final_output:
        raise Exception("Analysis generation failed to produce any output.")
    
    return final_output


###### AI chatbot

def chat_with_documents_logic_old(
    question: str, 
    start_date: str | None = None, 
    end_date: str | None = None,
    tags: list[str] | None = None,
    regions: list[str] | None = None
):
    """
    Handles chat using Multi-Query RAG with complete, advanced metadata filtering.
    """
    print(f"---CHAT: Q: {question}, Tags: {tags}, Regions: {regions}, Start: {start_date}, End: {end_date}---")
    
    # --- 1. Filter by metadata DB first to get a list of valid filenames ---
    metadata_db = load_metadata_db()
    allowed_filenames = list(metadata_db.keys())

    if tags:
        allowed_filenames = [
            fname for fname in allowed_filenames
            if all(tag.lower() in [t.lower() for t in metadata_db.get(fname, {}).get('tags', [])] for tag in tags)
        ]
    
    if regions:
        allowed_filenames = [
            fname for fname in allowed_filenames
            if all(region.lower() in [r.lower() for r in metadata_db.get(fname, {}).get('regions', [])] for region in regions)
        ]
    
    if not allowed_filenames:
        return {"answer": "No documents match the specified tag or region filters. Please broaden your criteria."}
    
    # --- 2. Build the FAISS metadata filter function ---
    def metadata_filter(metadata: dict) -> bool:
        # Step A: Check if the document source is in our pre-filtered list
        if metadata.get("source_file") not in allowed_filenames:
            return False
        
        # Step B: Check against date filters
        pub_date_str = metadata.get("publication_date")
        if start_date or end_date:
            if not pub_date_str:
                return False # Exclude docs with no date if date filtering is active
            if start_date and pub_date_str < start_date:
                return False
            if end_date and pub_date_str > end_date:
                return False
        
        return True

    # --- 3. Generate perspective queries ---
    query_gen_prompt = PromptTemplate(
        template="""Generate 3 different versions of the given user QUESTION to retrieve relevant documents.
        Provide these alternative questions as a JSON list of strings.
        Original question: {question}""",
        input_variables=["question"]
    )
    query_gen_chain = query_gen_prompt | LLM | JsonOutputParser()
    generated_queries = query_gen_chain.invoke({"question": question})
    generated_queries.append(question)

    # --- 4. Retrieve documents using all queries AND the metadata filter ---
    vector_store = FAISS.load_local(VECTOR_STORE_DIR, EMBEDDINGS, allow_dangerous_deserialization=True)
    retriever = vector_store.as_retriever(search_kwargs={"k": 5, "filter": metadata_filter})
    
    unique_docs = {}
    for q in generated_queries:
        docs = retriever.invoke(q)
        for doc in docs:
            unique_docs[doc.page_content] = doc
    
    retrieved_docs = list(unique_docs.values())
    
    if not retrieved_docs:
      return {"answer": "I found documents matching your filters, but couldn't find specific information related to your question within them."}

    # --- 5. Generate the final answer ---
    docs_context = "\n\n---\n\n".join([d.page_content for d in retrieved_docs])
    final_prompt = PromptTemplate(
        template="""You are a helpful AI assistant. Answer the user's QUESTION based ONLY on the provided CONTEXT.
        Be as comprehensive as possible and helpful. If the answer is not in the context, say "I could not find an answer to that question in the provided documents."
        CONTEXT:
        {context}
        QUESTION:
        {question}
        ANSWER:""",
        input_variables=["context", "question"]
    )
    final_chain = final_prompt | LLM | StrOutputParser()
    answer = final_chain.invoke({"context": docs_context, "question": question})
    
    return {"answer": answer}

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