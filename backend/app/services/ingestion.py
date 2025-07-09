import os
import json
import csv
import re # For regular expressions
from datetime import datetime
from dateutil.parser import parse as parse_date # For flexible date parsing
from dotenv import load_dotenv
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain.docstore.document import Document
# Import FAISS, which was previously missing
from langchain_community.vectorstores import FAISS
# Import spaCy for sentence splitting
import spacy
from langchain_core.output_parsers import JsonOutputParser, StrOutputParser
from langchain_core.prompts import PromptTemplate

load_dotenv()

# --- spaCy Model Loading ---
def load_spacy_model():
    """Loads the spaCy model and adds the sentencizer pipe."""
    try:
        nlp = spacy.load("en_core_web_sm", disable=["ner", "parser"])
        nlp.add_pipe("sentencizer")
        return nlp
    except OSError:
        print("spaCy 'en_core_web_sm' model not found. Please run 'python -m spacy download en_core_web_sm'")
        return None

NLP = load_spacy_model()

# --- Constants ---
PDF_SOURCE_DIR = "data/pdfs_to_process"
VECTOR_STORE_DIR = "data/vector_store"
PROCESSED_FILES_LOG = os.path.join(VECTOR_STORE_DIR, "processed_files.json")
FAISS_INDEX_FILE = os.path.join(VECTOR_STORE_DIR, "index.faiss")
LLM = ChatOpenAI(model="gpt-4-turbo", temperature=0, stream=False)
EMBEDDINGS = OpenAIEmbeddings(model="text-embedding-3-small", chunk_size=500)

MAPPING_CSV_PATH = "./data/mapping.csv"
BUSINESS_DIVISIONS = ["AMO", "COO Ops Americas", "COO Ops S&I", "GOTO Operations & COO", "IB Operations (BA)", "P&C Operations", "Treasury"]

# --- NEW METADATA DB CONSTANT ---
METADATA_DB_PATH = os.path.join(VECTOR_STORE_DIR, "metadata_db.json")

def load_mapping_data():
    with open(MAPPING_CSV_PATH, mode='r', encoding='utf-8') as infile:
        return [row for row in csv.DictReader(infile)]

# --- NEW: AI function to perform one-time analysis during ingestion ---

def analyze_document_for_heatmap(full_doc_text: str, filename: str) -> dict:
    """
    Performs a robust, two-step analysis on a document to extract metadata.
    This is designed to be efficient and avoid API rate limits.
    """
    print(f"  - Analyzing document for metadata: {filename}")

    # --- Step 1: Create a concise summary to reduce token count ---
    summary_prompt = PromptTemplate.from_template(
        "Create a concise, one-paragraph summary of the following regulatory document text. Focus on the main purpose, scope, and key topics mentioned.\n\nTEXT: {context}"
    )
    summary_chain = summary_prompt | LLM | StrOutputParser()
    # Use the first 8000 characters as a representative sample for the summary
    document_summary = summary_chain.invoke({"context": full_doc_text[:8000]})

    # --- Step 2: Use the summary to perform the detailed extraction ---
    mapping_data = load_mapping_data()
    # Provide only function names to the LLM to save tokens
    functions_for_prompt = ", ".join([row['Lifecycle'] for row in mapping_data])
    
    extraction_prompt = PromptTemplate(
        template="""You are a data tagging specialist. Based on the DOCUMENT SUMMARY, perform three tasks:
        1.  From the provided LIST OF BUSINESS LIFECYLCES, identify ALL lifecycles that are relevant.
        2.  'author': The name of the regulatory body or organization that published the document (e.g., "European Banking Federation", "SwissFinanceCouncil"). Extract the single primary 'author' or regulatory body.
        3.  'regions': A list of countries or regions this regulation applies to (e.g., ["EU", "US", "Switzerland"]). The name of the author or the regulatory body might strongly indicate the relevant region, e.g. if the "author" is "SwissFinanceCouncil", then the applicable region is "Switzerland"

        DOCUMENT SUMMARY:
        {summary}

        LIST OF BUSINESS LIFECYLCES:
        {all_functions}

        Respond with ONLY a single, valid JSON object with two keys: "relevant_lifecycles" (a list of strings) and "author" (a string).""",
        input_variables=["summary", "all_functions"]
    )
    extraction_chain = extraction_prompt | LLM | JsonOutputParser()
    
    try:
        response = extraction_chain.invoke({
            "summary": document_summary,
            "all_functions": functions_for_prompt
        })
        relevant_lifecycle_names = response.get("relevant_lifecycles", [])
    except Exception as e:
        print(f"    - LLM metadata extraction failed: {e}. Using defaults.")
        response = {"relevant_lifecycles": [], "author": "Unknown", "regions": []}
        
    # --- Step 3: Robustly validate and coerce the LLM's output ---
    author = response.get("author", "Unknown")
    relevant_lifecycle_names = response.get("relevant_lifecycles", [])
    regions = response.get("regions", [])
    
    # Ensure relevant_lifecycles is always a list
    if isinstance(relevant_lifecycle_names, str):
        relevant_lifecycle_names = [name.strip() for name in relevant_lifecycle_names.split(',')]
    
    # --- Step 4: Calculate scores and generate tags in Python (fast and reliable) ---
    heatmap_scores = {div: 0 for div in BUSINESS_DIVISIONS}
    relevant_functions_data = [row for row in mapping_data if row['Lifecycle'] in relevant_lifecycle_names]
    
    for function_row in relevant_functions_data:
        for division in BUSINESS_DIVISIONS:
            try:
                heatmap_scores[division] += int(function_row.get(division, 0))
            except (ValueError, TypeError):
                continue
    
    heatmap_data = {}
    tags = []
    # regions = [] # We will now derive regions from division names for consistency
    for division, score in heatmap_scores.items():
        if score >= 30: level = "High"
        elif score >= 10: level = "Medium"
        elif score > 0: level = "Low"
        else: level = "None"
        heatmap_data[division] = {"score": score, "level": level}
        if level != "None":
            tags.append(division.split(' ')[0]) # e.g., "COO", "P&C"
            if "Americas" in division: regions.append("Americas")

    return {
        "author": author,
        "tags": sorted(list(set(tags))),
        "regions": sorted(list(set(regions))) if regions else ["Global"],
        "heatmapData": heatmap_data,
        "impactedLifecycles": relevant_lifecycle_names
    }


# def analyze_document_for_heatmap(docs_context: str) -> dict:
#     """
#     Takes the full text of a document and returns a structured object
#     containing the heatmap data, tags, author, etc.
#     """
#     mapping_data = load_mapping_data()
#     functions_for_prompt = "\n".join([f"- {row['Lifecycle']}: {row['Definition']}" for row in mapping_data])
    
#     prompt = PromptTemplate(
#         template="""You are an AI data extraction specialist. Based on the DOCUMENT CONTEXT, perform three tasks:
#         1.  From the provided LIST OF BUSINESS LIFECYCLES, identify ALL lifecycles that are relevant to the document.
#         2.  'author': The name of the regulatory body or organization that published the document (e.g., "European Banking Federation", "SwissFinanceCouncil"). Extract the single primary 'author' or regulatory body of the document.
#         3.  'regions': A list of countries or regions this regulation applies to (e.g., ["EU", "US", "Switzerland"]).


#         DOCUMENT CONTEXT:
#         {context}

#         LIST OF BUSINESS LIFECYLCES:
#         {all_functions}

#         Respond with ONLY a single, valid JSON object with two keys: "relevant_lifecycles" (a list of strings) and "author" (a string).""",
#         input_variables=["context", "all_functions"]
#     )
#     chain = prompt | LLM | JsonOutputParser()
    
#     # This is the single, efficient LLM call
#     try:
#         response = chain.invoke({
#             "context": docs_context,
#             "all_functions": functions_for_prompt
#         })
#         relevant_lifecycle_names = response.get("relevant_lifecycles", [])
#     except Exception as e:
#         print(f"    - LLM analysis failed: {e}. Defaulting to empty.")
#         relevant_lifecycle_names = []
#         response = {"author": "Unknown"}
        
#     # --- Python-based scoring (fast and reliable) ---
#     heatmap_scores = {div: 0 for div in BUSINESS_DIVISIONS}
#     relevant_functions_data = [row for row in mapping_data if row['Lifecycle'] in relevant_lifecycle_names]
    
#     for function_row in relevant_functions_data:
#         for division in BUSINESS_DIVISIONS:
#             try:
#                 heatmap_scores[division] += int(function_row.get(division, 0))
#             except (ValueError, TypeError):
#                 continue
    
#     heatmap_data = {}
#     tags = []
#     for division, score in heatmap_scores.items():
#         if score >= 30: level = "High"
#         elif score >= 10: level = "Medium"
#         elif score > 0: level = "Low"
#         else: level = "None"
#         heatmap_data[division] = {"score": score, "level": level}
#         if level != "None":
#             # Automatically create tags from impacted divisions
#             tags.append(division)

#     return {
#         "author": response.get("author", "Unknown"),
#         "tags": list(set(tags)), # Use unique tags
#         "regions": response.get("regions", "Global"), # Placeholder, could be extracted similarly
#         "heatmapData": heatmap_data
#     }




def sentence_chunker(docs: list[Document], max_chunk_chars: int = 1500) -> list[Document]:
    """
    A stable, custom semantic chunker using spaCy.
    """
    if not NLP:
        raise ImportError("spaCy model could not be loaded. Please ensure it's installed and loaded correctly.")

    all_chunks = []
    
    for doc in docs:
        if not doc.page_content:
            continue

        spacy_doc = NLP(doc.page_content)
        sentences = [sent.text.strip() for sent in spacy_doc.sents]
        
        current_chunk = ""
        for sentence in sentences:
            if len(current_chunk) + len(sentence) + 1 > max_chunk_chars:
                if current_chunk:
                    all_chunks.append(Document(page_content=current_chunk, metadata=doc.metadata))
                current_chunk = sentence
            else:
                if current_chunk:
                    current_chunk += f" {sentence}"
                else:
                    current_chunk = sentence
        
        if current_chunk:
            all_chunks.append(Document(page_content=current_chunk, metadata=doc.metadata))

    return all_chunks

# --- NEW FUNCTION: Extract Publication Date ---
def extract_publication_date(text: str) -> str | None:
    """
    Extracts a publication date using a prioritized list of regex patterns.
    """
    date_patterns = [
        # Format: DD Month YYYY (e.g., 26 January 2023)
        r'\b(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b',
        # Format: Month DD, YYYY (e.g., Jan 26, 2023)
        r'\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})\b',
        # --- NEW PATTERN TO CATCH DD.MM.YYYY ---
        r'\b(\d{1,2}\.\d{1,2}\.\d{4})\b',
        # Format: Month YYYY (e.g., August 2022)
        r'\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b'
    ]
    
    for pattern in date_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                # Replace dots with spaces for better parsing by dateutil
                date_string = match.group(1).replace('.', ' ')
                dt = parse_date(date_string)
                return dt.strftime('%Y-%m-%d')
            except (ValueError, TypeError):
                continue
    return None

def load_processed_files_log():
    if os.path.exists(PROCESSED_FILES_LOG):
        with open(PROCESSED_FILES_LOG, 'r') as f:
            return json.load(f)
    return {}

def save_processed_files_log(log_data):
    with open(PROCESSED_FILES_LOG, 'w') as f:
        json.dump(log_data, f, indent=2)

# --- NEW FUNCTION: LLM-based Metadata Extraction ---
def extract_metadata_with_llm(text_chunk: str, filename: str) -> dict:
    """Uses an LLM to extract Author, Tags, and Regions from a text chunk."""
    print(f"  - Extracting metadata for {filename} with LLM...")
    prompt = PromptTemplate(
        template="""You are a data tagging specialist. Based on the provided text from a regulatory document, extract the following information:
        1.  'author': The name of the regulatory body or organization that published the document (e.g., "European Banking Federation", "SwissFinanceCouncil").
        2.  'tags': A list of 2-4 relevant keywords describing the document's topics (e.g., ["Payments", "Compliance", "Sanctions", "AML"]).
        3.  'regions': A list of countries or regions this regulation applies to (e.g., ["EU", "US", "Switzerland"]).

        CONTEXT: {context}

        Respond with ONLY a single, valid JSON object with the keys "author", "tags", and "regions".""",
        input_variables=["context"]
    )
    chain = prompt | LLM | JsonOutputParser()
    try:
        return chain.invoke({"context": text_chunk})
    except Exception as e:
        print(f"    - LLM metadata extraction failed: {e}. Using defaults.")
        return {"author": "Unknown", "tags": [], "regions": []}

# --- NEW FUNCTIONS FOR METADATA DB ---
def load_metadata_db():
    if os.path.exists(METADATA_DB_PATH):
        with open(METADATA_DB_PATH, 'r') as f: return json.load(f)
    return {}

def save_metadata_db(data):
    # This function is now correctly called at the end of the main script
    with open(METADATA_DB_PATH, 'w') as f: json.dump(data, f, indent=2)

def process_pdfs_incrementally():
    print("Starting incremental PDF ingestion process...")
    if not os.path.exists(PDF_SOURCE_DIR):
        print(f"Source directory not found: {PDF_SOURCE_DIR}")
        return

    processed_log = load_processed_files_log()
    metadata_db = load_metadata_db()
    vector_store = None
    
    if os.path.exists(FAISS_INDEX_FILE):
        print("Loading existing vector store...")
        vector_store = FAISS.load_local(VECTOR_STORE_DIR, EMBEDDINGS, allow_dangerous_deserialization=True)
    else:
        print("No existing FAISS index found. A new one will be created.")

    files_to_process = []
    all_pdf_files = [f for f in os.listdir(PDF_SOURCE_DIR) if f.endswith(".pdf")]
    for pdf_file in all_pdf_files:
        file_path = os.path.join(PDF_SOURCE_DIR, pdf_file)
        mod_time = os.path.getmtime(file_path)
        if pdf_file not in processed_log or processed_log[pdf_file] < mod_time:
            files_to_process.append((pdf_file, file_path, mod_time))
        else:
            print(f"Skipping unchanged file: {pdf_file}")

    if not files_to_process:
        print("No new or modified files to process. Ingestion complete.")
        return list(processed_log.keys())

    new_docs = []
    for pdf_file, file_path, mod_time in files_to_process:
        print(f"Loading: {pdf_file}")
        loader = PyMuPDFLoader(file_path)
        docs = loader.load()
        full_doc_text = "\n".join([d.page_content for d in docs])

        if pdf_file not in metadata_db:

            print(f"  - Performing quantitative analysis for {pdf_file}...")
            # This one-time analysis generates all the required metadata
            quantitative_metadata = analyze_document_for_heatmap(full_doc_text, pdf_file)
            metadata_db[pdf_file] = quantitative_metadata

            # llm_context = " ".join([d.page_content for d in docs])[:4000]
            # extracted_meta = extract_metadata_with_llm(llm_context, pdf_file)
            # metadata_db[pdf_file] = extracted_meta

        publication_date_str = None
        if docs:
            publication_date_str = extract_publication_date(docs[0].page_content)
            if not publication_date_str and len(docs) > 1:
                publication_date_str = extract_publication_date(docs[-1].page_content)
        
        if not publication_date_str:
            publication_date_str = datetime.fromtimestamp(mod_time).strftime('%Y-%m-%d')
            print(f"  - No publication date found in text. Using file date: {publication_date_str}")
        else:
            print(f"  - Extracted publication date: {publication_date_str}")
        
        for doc in docs:
            doc.metadata['source_file'] = pdf_file
            doc.metadata['publication_date'] = publication_date_str
        
        new_docs.extend(docs)
        processed_log[pdf_file] = mod_time

    if not new_docs:
        print("Completed with no new content to add.")
        save_metadata_db(metadata_db) # Save metadata even if no new vector docs are chunked
        save_processed_files_log(processed_log)
        return list(processed_log.keys())

    chunked_docs = sentence_chunker(new_docs)
    print(f"Split {len(new_docs)} document pages into {len(chunked_docs)} sentence-aware chunks.")

    if vector_store:
        vector_store.add_documents(chunked_docs)
    else:
        vector_store = FAISS.from_documents(chunked_docs, EMBEDDINGS)
    
    if not os.path.exists(VECTOR_STORE_DIR): os.makedirs(VECTOR_STORE_DIR)
    
    # --- THE CRITICAL FIX: Save all databases at the end ---
    save_metadata_db(metadata_db)
    vector_store.save_local(VECTOR_STORE_DIR)
    save_processed_files_log(processed_log)
    
    print(f"Vector store and metadata databases updated and saved at {VECTOR_STORE_DIR}")
    return list(processed_log.keys())

# def process_pdfs_incrementally():
#     print("Starting incremental PDF ingestion process (using spaCy Chunker)...")
#     if not os.path.exists(PDF_SOURCE_DIR):
#         print(f"Source directory not found: {PDF_SOURCE_DIR}")
#         return

#     processed_log = load_processed_files_log()
#     vector_store = None
#     if os.path.exists(FAISS_INDEX_FILE):
#         print("Loading existing vector store...")
#         vector_store = FAISS.load_local(VECTOR_STORE_DIR, EMBEDDINGS, allow_dangerous_deserialization=True)
#     else:
#         print("No existing FAISS index found. A new one will be created.")

#     files_to_process = []
#     all_pdf_files = [f for f in os.listdir(PDF_SOURCE_DIR) if f.endswith(".pdf")]
#     for pdf_file in all_pdf_files:
#         file_path = os.path.join(PDF_SOURCE_DIR, pdf_file)
#         mod_time = os.path.getmtime(file_path)
#         if pdf_file not in processed_log or processed_log[pdf_file] < mod_time:
#             files_to_process.append((pdf_file, file_path, mod_time))
#         else:
#             print(f"Skipping unchanged file: {pdf_file}")

#     if not files_to_process:
#         print("No new or modified files to process. Ingestion complete.")
#         return list(processed_log.keys())

#     # --- LOAD METADATA DB AT START ---
#     metadata_db = load_metadata_db()
#     new_docs = []
#     for pdf_file, file_path, mod_time in files_to_process:
#         print(f"Loading: {pdf_file}")
#         loader = PyMuPDFLoader(file_path)
#         docs = loader.load()

#         # Check if we should process metadata (only for new files)
#         if pdf_file not in metadata_db:
#             # Use the first ~4000 chars as context for LLM extraction
#             llm_context = " ".join([d.page_content for d in docs])[:4000]
#             extracted_meta = extract_metadata_with_llm(llm_context, pdf_file)
#             metadata_db[pdf_file] = extracted_meta

#         publication_date_str = None
#         # --- THE DEFINITIVE DATE EXTRACTION LOGIC ---
#         if docs:
#             # 1. First, check the first page for a date.
#             publication_date_str = extract_publication_date(docs[0].page_content)
            
#             # 2. If no date is found on the first page AND the document has more than one page, check the last page.
#             if not publication_date_str and len(docs) > 1:
#                 print(f"  - No date on first page, checking last page...")
#                 publication_date_str = extract_publication_date(docs[-1].page_content)
        
#         # 3. Fallback to file modification date if no date was found on either page.
#         if not publication_date_str:
#             publication_date_str = datetime.fromtimestamp(mod_time).strftime('%Y-%m-%d')
#             print(f"  - No publication date found in text. Using file date: {publication_date_str}")
#         else:
#             print(f"  - Extracted publication date: {publication_date_str}")
        
#         for doc in docs:
#             doc.metadata['source_file'] = pdf_file
#             doc.metadata['publication_date'] = publication_date_str
        
#         new_docs.extend(docs)
#         processed_log[pdf_file] = mod_time

#     if not new_docs:
#         print("Completed with no new content to add.")
#         save_processed_files_log(processed_log)
#         return list(processed_log.keys())

#     chunked_docs = sentence_chunker(new_docs)
#     print(f"Split {len(new_docs)} document pages into {len(chunked_docs)} sentence-aware chunks.")

#     if vector_store:
#         vector_store.add_documents(chunked_docs)
#     else:
#         vector_store = FAISS.from_documents(chunked_docs, EMBEDDINGS)
    
#     if not os.path.exists(VECTOR_STORE_DIR): os.makedirs(VECTOR_STORE_DIR)
#     vector_store.save_local(VECTOR_STORE_DIR)
#     save_processed_files_log(processed_log)
    
#     print(f"Vector store updated and saved at {VECTOR_STORE_DIR}")
#     return list(processed_log.keys())


if __name__ == '__main__':
    process_pdfs_incrementally()