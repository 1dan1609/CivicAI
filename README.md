# CivicAI - AI-Powered Municipal Research and Analysis Engine

## 1. Description

CivicAI is an AI-powered municipal research and analysis platform designed for District Aides, policy researchers, and public interest advocates to efficiently navigate, analyze, and synthesize massive volumes of local government documents, legislation files, and public records. 

By leveraging a robust Retrieval-Augmented Generation (RAG) architecture, CivicAI answers complex municipal policy questions with high-context, verified insights backed by direct citations and live-rehydrated source document downloads. Additionally, the platform provides authenticated users with a secure, real-time persistent workspace (District Aide Research Notebook) to manage annotated bookmarks, research logs, and past search histories safely.

---

## 2. Feature Set & System Architecture

CivicAI operates on a dual-layer design, offering high-productivity user interfaces combined with enterprise-grade backend infrastructure.

### A. Visible / Frontend Features
* **Intelligent Multilingual AI Search (RAG)**: Connects to local government databases to answer policy, legislation, and public record questions with verified, localized answers across multiple languages (English, Spanish, Chinese, Bengali).
* **Live Rehydrated Source Document Downloads**: High-integrity document retrieval. Users can click and download original municipal PDF source files directly on-demand.
* **Dynamic Citations and Metadata Previews**: Citations are embedded dynamically inline with AI responses. Hovering over a citation reveals deep document metadata and previews in result cards.
* **District Aide Research Notebook**: A persistent, real-time authenticated space for saving annotated bookmarks, custom research notes, and legislative records.
* **Persistent Conversation History Logging**: A real-time research history feed allowing District Aides to seamlessly jump back into prior research sessions.
* **Unified Sidebar Control**: A high-efficiency navigation sidebar that collapses and organizes bookmarked notebooks and chat history tabs with responsive tab controls.
* **Glassmorphic Dark-Themed Dashboard**: Built on modern UI principles featuring a sleek custom layout, premium visual backdrops, smooth micro-animations, and responsive independent panel scrolling.
* **Interactive Suggested Starters**: Prompts unauthenticated or returning users with randomized common policy suggestion templates to start research instantly.

### B. Invisible / "Under-the-Hood" Features
* **Automated Incremental Ingestion Pipeline (`ingest.py`)**: Daily automated cron job (configured via GCP Cloud Scheduler and Cloud Run Jobs) that automatically extracts, filters, and synchronizes 650+ municipal documents from the NYC Council API directly to Vertex AI Search Datastores.
* **Secure OAuth 2.0 Integration (NextAuth.js)**: Cryptographically secure Google OAuth 2.0 flow allowing users to log in securely to save bookmarks, persist notebook annotations, and manage personal search history.
* **Low-Latency Google Cloud Firestore Sync**: High-concurrency database synchronization using Native Firestore SDKs to persist notebook annotations and bookmark states in real-time across devices.
* **DDoS Mitigation & Ingress Traffic Protection**: Advanced network-level defenses against Distributed Denial of Service (DDoS) and brute-force scraping attempts, utilizing strict ingress traffic filtering, endpoint rate limiting, and GCP serverless load-balancer autoscaling.
* **Multi-Stage Containerized Builds**: Optimized multi-stage Dockerfiles compiling Next.js and FastAPI environments into production-ready lightweight serverless container images to minimize cold-start latency.

---

## 3. How to Run It on Your End

Follow these steps to set up, configure, and run the CivicAI search engine and database synchronization system locally.

### Step 1: Request NYC Council API Credentials
CivicAI leverages legislative data from the New York City Council. 
1. Submit an API subscription key application at https://council.nyc.gov/legislation/api/
2. Once approved, you will receive an API Subscription Key to fetch municipal legislative documents.

### Step 2: System Pre-requisites
Ensure you have the following installed on your local machine:
- Python 3.10 or higher
- Node.js 18 or higher (with npm)
- Git

### Step 3: Google Cloud Platform Setup
CivicAI requires a Google Cloud Project (GCP) to run its AI search and storage mechanisms:
1. Create a project in the Google Cloud Console.
2. Enable the **Vertex AI API**, **Vertex AI Search and Conversation API**, and **Cloud Firestore API**.
3. Create a **Vertex AI Search Datastore** and ingest municipal documents (or link it to a Google Cloud Storage bucket containing your files).
4. Configure Cloud Firestore in Native Mode (using the default database).
5. Set up Google OAuth Client Credentials in the GCP APIs & Services console (redirect URL: `http://localhost:3000/api/auth/callback/google` for local development).
6. Generate and download a GCP Service Account JSON key with Viewer/Editor permissions to Vertex AI and Firestore.

### Step 4: Clone the Repository
Clone the repository and navigate into the project root:
```bash
git clone https://github.com/1dan1609/CivicAI
cd CivicAI
```

### Step 5: Configure the Backend Environment
Create a `.env` file in the root directory of the project:
```env
PORT=8000
API_BASE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

# GCP Configuration
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/gcp-service-account-key.json
PROJECT_ID=your-gcp-project-id
LOCATION=us-central1
DATASTORE_ID=your-vertex-ai-datastore-id
FIRESTORE_DATABASE_ID=(default)

# AI & Third-Party APIs
NYC_COUNCIL_API_KEY=your-nyc-council-api-key
GEMINI_API_KEY=your-google-gemini-api-key
```

### Step 6: Set Up and Run the FastAPI Backend
1. Install the required Python packages:
```bash
pip install -r requirements.txt
```
2. Start the FastAPI server locally:
```bash
uvicorn main:app --reload --port 8000
```
The backend server will run on `http://localhost:8000` with Swagger interactive documentation available at `http://localhost:8000/docs`.

### Step 7: Configure the Frontend Environment
Navigate to the `frontend` folder and create a `.env.local` file:
```bash
cd frontend
```
Add the following frontend environment variables to `frontend/.env.local`:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# NextAuth Configuration (Google Authentication)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=a-secure-random-32-character-string

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
```

### Step 8: Set Up and Run the Next.js Frontend
1. Install front-end dependencies:
```bash
npm install
```
2. Run the Next.js development server:
```bash
npm run dev
```
The frontend web application will start on `http://localhost:3000`.

---

## 4. Demo Video

[![CivicAI Product Walkthrough](Thumbnail.png)](https://drive.google.com/file/d/141efwC7CBAa8DUaunwbLdnHu2dcuvWo4/view?usp=sharing)

*Click the preview image above to watch the full product walkthrough on Google Drive.*

---

## 5. Techstack and Project Structure

### Techstack Rollout

- **Backend (Core Engine)**: Python 3.11, FastAPI, Uvicorn (Handles RAG logic, Rate Limiting, and Data Synchronization).
- **Frontend (UI/UX)**: Next.js 15 (TypeScript/React), Tailwind CSS, Lucide Icons, NextAuth.js (Google OAuth).
- **AI Infrastructure**: Google Vertex AI Search (RAG architecture), Google Gemini 2.5 (LLM summaries).
- **Database & Persistence**: Google Cloud Firestore (Real-time sync for Research Notebooks), Google Cloud Storage.
- **Data Ingestion**: Python (Automated daily incremental extraction from NYC Council API).
- **DevOps & Cloud**: Docker (Containerization), GCP Cloud Run (Serverless Deployment), Google Cloud Scheduler (Automation).

### Directory & File Responsibilities

```
CivicAI/
│
├── frontend/                     # Next.js 15 Web Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Main Search Dashboard. Manages search execution, real-time chat, bookmarks sidebars, and authentication state.
│   │   │   └── api/auth/         # NextAuth.js handlers for securing OAuth callbacks.
│   │   ├── components/
│   │   │   ├── ChatHistoryPanel.tsx  # Secure research log history panel. Intercepts historical chats and dynamically rehydrates stale static file download URLs to the active production backend.
│   │   │   ├── BookmarksPanel.tsx    # District Aide Research Notebook. Provides an interactive UI to edit annotations and view bookmarked PDF links synced with Firestore.
│   │   │   └── ResultCard.tsx    # Modular search result list elements. Dynamically displays extracted file metadata, previews, and annotation controls.
│   │   └── lib/                  # Frontend context and utility functions.
│   ├── Dockerfile                # Production Docker instruction for compiling the Next.js static and dynamic assets.
│   ├── package.json              # Node.js project manifest defining runtime scripts and dependencies.
│   ├── tsconfig.json             # TypeScript compiler rules and path configurations.
│   ├── components.json           # Shadcn/ui component integration settings.
│   └── .gitignore                # Frontend build cache and local module exclusions.
│
├── main.py                       # The Core Python Backend. Implements the high-performance RAG API, custom distributed rate limiting, and Firestore synchronization.
├── ingest.py                     # The Ingestion Pipeline. A dedicated Python engine that automates the daily extraction and indexing of 650+ municipal documents.
├── Dockerfile                    # Multi-stage Docker instructions optimized for Python performance on Cloud Run.
├── requirements.txt              # Managed Python dependencies for the backend engine.
├── Thumbnail.png                 # Main high-fidelity preview/thumbnail for the repository guide.
├── .gitignore                    # Root level Git exclusion system (excludes secrets, python caches, and local scratch files).
└── README.md                     # Comprehensive product guide.
```


