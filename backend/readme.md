Usecase:
The current financial services regulatory review process ingesting a broad spectrum of regulatory inputs, remains heavily manual in its analysis phase. This manual dependency introduces inefficiencies, prolongs review cycles, and increases the risk of missing critical operational impacts. 

To address this, generate an AI-powered solution capable of parsing and interpreting regulatory documents, industry whitepapers (such as those from ISDA, SIFMA, and FINMA), and consultancy publications. The solution would generate concise summaries, map out key compliance dates, identify potentially impacted operational areas, and provide an initial impact assessment.

1. Regulatory Summaries: It gives short, clear summaries of regulations that are easy to read and understand. These include a quick overview and to identify which rules or obligations are impacted. Explain the purpose, scope, and why the regulation matters.
2. Impact Assessments: It translates complex legal and regulatory requirements into clear, practical summaries focused on potential operational impacts. These are intended as a preliminary view to guide early understanding and action planning. It simplifies legal language into step-by-step guidance, helping teams identify what might need to change, which areas could be affected, and why it matters.
3. Integrated Roadmap: It connects regulatory deadlines by creating a clear roadmap.

How to Run the Solution
1. Prepare Your Documents
Place one or more regulatory PDF files into the backend/data/pdfs_to_process/ directory.

2. Run the Ingestion (One-time setup per new batch of PDFs)
Open a terminal in the backend directory.
Make sure your virtual environment is active.
Run the ingestion script: python app/services/ingestion.py
This will create a vector_store directory in backend/data/.

3. Start the Backend Server
In the same terminal (in the backend directory).
Start the FastAPI server: uvicorn app.main:app --reload
The server will be running at http://127.0.0.1:8000.

4. Start the Frontend Application
Open a new terminal in the frontend directory.
Run the development server: npm run dev
Open your browser and navigate to http://localhost:3000.
You should now see the UI, which will automatically load the list of documents, select the first one, and display its full AI-driven analysis. You can switch between documents using the dropdown menu.