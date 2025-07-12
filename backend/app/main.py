import os
import json
import shutil # Import shutil for file operations
from typing import Dict, Any
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, UploadFile, File # Import UploadFile and File
from fastapi.middleware.cors import CORSMiddleware
# from .services.rag_builder import analyze_document_logic, chat_with_documents_logic, load_analysis_cache, save_analysis_cache
from .services.ingestion import process_pdfs_incrementally, load_metadata_db, save_metadata_db
from fastapi.responses import FileResponse
# --- Import new models ---
# from .api.models import (
#     AnalyzeRequest, DocumentListResponse, ChatRequest, 
#     DocumentMetadata, AllMetadataResponse
# )

from .api.models import (
    AnalyzeRequest, DocumentListResponse, ChatRequest, NotifyRequest,
    DocumentMetadata, AllMetadataResponse, AnalysisResultModel, DashboardData
)
from .services.rag_builder import (
    analyze_document_logic, chat_with_documents_logic,
    load_analysis_cache, save_analysis_cache
)

from .services.dashboard_service import generate_dashboard_logic
from .services.ConnectionManager import manager
# from .api.models import AnalyzeRequest, DocumentListResponse, ChatRequest, NotifyRequest, AnalysisResultModel 
from fastapi import WebSocket, WebSocketDisconnect


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("--- Application starting up ---")
    vector_store_path = "./data/vector_store/index.faiss"
    if not os.path.exists(vector_store_path):
        print("\nWARNING: Vector store 'index.faiss' not found.")
    else:
        print("Vector store found. Application is ready.")
    yield
    print("--- Application shutting down ---")

app = FastAPI(
    title="Financial Regulatory Analysis API",
    description="API for processing and analyzing regulatory documents.",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DASHBOARD_DATA_FILE = "dashboard_data.json"
DOCUMENTS_DIR = "./data/pdfs_to_process"

@app.post("/api/save_dashboard")
async def save_dashboard(data: DashboardData):
    """Saves the dashboard data to a local JSON file."""
    try:
        dashboard_upload_dir = "./data/vector_store"
        os.makedirs(dashboard_upload_dir, exist_ok=True)
        dashboard_file_path = os.path.join(dashboard_upload_dir, DASHBOARD_DATA_FILE)        
        with open(dashboard_file_path, "w") as f:
            # Use .model_dump_json() for Pydantic v2+ or .json() for v1
            f.write(data.model_dump_json(indent=4))
        return {"message": "Dashboard data saved successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/load_dashboard")
async def load_dashboard():
    """Loads the dashboard data from the local JSON file if it exists."""
    dashboard_upload_dir = "./data/vector_store"
    os.makedirs(dashboard_upload_dir, exist_ok=True)
    dashboard_file_path = os.path.join(dashboard_upload_dir, DASHBOARD_DATA_FILE) 
    if not os.path.exists(dashboard_file_path):
        raise HTTPException(status_code=404, detail="Dashboard data file not found.")
    try:
        with open(dashboard_file_path, "r") as f:
            data = json.load(f)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dashboard", summary="Get Dashboard Overview")
def get_dashboard_data(start_date: str | None = None, end_date: str | None = None):
    """
    Performs a full analysis across documents within an optional date range
    to generate a strategic dashboard.
    """
    try:
        # Pass the query parameters to the service logic
        result = generate_dashboard_logic(start_date, end_date)
        return result
    except Exception as e:
        print(f"Error during dashboard generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- ADD THE NEW UPLOAD ENDPOINT ---
@app.post("/api/upload", summary="Upload a PDF Document")
async def upload_document(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDFs are allowed.")

    upload_dir = "./data/pdfs_to_process"
    os.makedirs(upload_dir, exist_ok=True)

    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")
    
    file_path = os.path.join(upload_dir, file.filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # After saving, trigger the ingestion process
        print(f"File '{file.filename}' uploaded. Starting ingestion...")
        process_pdfs_incrementally()

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {e}")
    finally:
        file.file.close()

    return {"filename": file.filename, "message": "File uploaded and processed successfully."}


@app.post("/api/analyze", summary="Analyze a Document")
def analyze_document(request: AnalyzeRequest):
    try:
        result = analyze_document_logic(request.document_name)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- NEW METADATA ENDPOINTS ---
@app.get("/api/metadata", response_model=AllMetadataResponse, summary="Get All Document Metadata")
def get_all_metadata():
    """Returns all editable metadata for every document."""
    metadata = load_metadata_db()
    return {"metadata": metadata}

@app.post("/api/metadata/{document_name}", summary="Update Document Metadata")
def update_metadata(document_name: str, metadata: DocumentMetadata):
    """Updates the metadata for a specific document."""
    db = load_metadata_db()
    if document_name not in db:
        raise HTTPException(status_code=404, detail="Document not found.")
    
    db[document_name] = metadata.model_dump()
    save_metadata_db(db)
    return {"message": "Metadata updated successfully."}

@app.get("/api/cache/{document_name}", summary="Get Cached Analysis")
def get_cached_analysis(document_name: str):
    """Checks for and returns a previously saved analysis for a document."""
    cache = load_analysis_cache()
    if document_name in cache:
        return cache[document_name]
    raise HTTPException(status_code=404, detail="No cached analysis found for this document.")

@app.post("/api/cache/{document_name}", summary="Save Analysis Result")
def save_analysis_to_cache(document_name: str, analysis_result: AnalysisResultModel):
    """Receives and persists a generated analysis result, validated against the model."""
    cache = load_analysis_cache()
    # Use .model_dump() to get a clean dictionary for JSON serialization
    cache[document_name] = analysis_result.model_dump() 
    save_analysis_cache(cache)
    return {"message": "Analysis successfully saved."}


@app.get("/api/documents/{file_name}")
async def get_document(file_name: str):
    """Serves a static PDF file from the documents directory."""
    # Basic security to prevent path traversal attacks
    if ".." in file_name or file_name.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid file name.")
        
    file_path = os.path.join(DOCUMENTS_DIR, file_name)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found.")
        
    return FileResponse(file_path, media_type='application/pdf', filename=file_name)


# --- ADD THE NEW CHAT ENDPOINT ---
@app.post("/api/chat", summary="Chat with Documents")
def chat_with_documents(request: ChatRequest):
    """
    Receives a question and optional date filters, returns a conversational answer.
    """
    if not request.question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    try:
        # Pass the date filters to the logic function
        result = chat_with_documents_logic(
            question=request.question,
            start_date=request.start_date,
            end_date=request.end_date,
            tags=request.tags,
            regions=request.regions
        )
        return result
    except Exception as e:
        print(f"Error during chat: {e}")
        raise HTTPException(status_code=500, detail=f"An error occurred during chat: {str(e)}")


@app.post("/api/ingest", summary="Trigger PDF Ingestion")
def ingest_documents():
    try:
        processed_files = process_pdfs_incrementally()
        return {"message": "Ingestion process completed successfully.", "processed_files": processed_files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

@app.get("/api/documents", response_model=DocumentListResponse, summary="List Processed Documents")
def get_documents():
    pdf_dir = "./data/pdfs_to_process"
    if not os.path.exists(pdf_dir):
        return {"documents": []}
    documents = [f for f in os.listdir(pdf_dir) if f.endswith('.pdf')]
    return {"documents": documents}

# --- ADD THE NEW WEBSOCKET "PUSH NOTIFICATION" ENDPOINT ---
@app.websocket("/ws/{division_name}")
async def websocket_endpoint(websocket: WebSocket, division_name: str):
    await manager.connect(websocket, division_name)
    try:
        while True:
            # Keep the connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, division_name)

# --- ADD THE NEW "NOTIFY" TRIGGER ENDPOINT ---
@app.post("/api/notify", summary="Send Notifications to Divisions")
async def notify_divisions(request: NotifyRequest):
    """
    Receives a list of impacted divisions and broadcasts a notification via WebSocket.
    """
    print(f"Received notification request for document: {request.document_name}")
    
    # --- The Fix: Log the received data and handle the empty case ---
    impacted_divisions = request.impacted_divisions
    print(f"Divisions to notify: {impacted_divisions}")

    if not impacted_divisions:
        # This gives us a clear server-side log and a helpful response
        print("No divisions with high/medium impact to notify.")
        return {"status": "No notifications sent", "notified_divisions": []}

    message = f"New Regulatory Alert: The document '{request.document_name}' has been analyzed and requires your division's attention."
    
    for division in impacted_divisions:
        await manager.broadcast_to_division(message, division)
        
    return {"status": "Notifications sent", "notified_divisions": impacted_divisions}


