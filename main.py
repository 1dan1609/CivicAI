from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from google.cloud import discoveryengine_v1 as discoveryengine
from google.cloud import translate_v2 as translate
from google.cloud import firestore
from pydantic import BaseModel
from typing import List, Optional
from google.cloud import storage
from fastapi.middleware.cors import CORSMiddleware
import vertexai
from vertexai.generative_models import GenerativeModel
import json

app = FastAPI(title="CivicAI Backend")

import re
import time
from collections import defaultdict

# --- In-Memory Rate Limiting Storage ---
# Key: (client_ip, path) -> List of timestamp floats
rate_limit_store = defaultdict(list)

def check_rate_limit(client_ip: str, path: str, limit: int, window_seconds: int):
    """Limits requests for a specific IP and endpoint path using a sliding window."""
    now = time.time()
    # Keep only active timestamps within the sliding window
    rate_limit_store[(client_ip, path)] = [
        t for t in rate_limit_store[(client_ip, path)] if now - t < window_seconds
    ]
    if len(rate_limit_store[(client_ip, path)]) >= limit:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please slow down and try again later."
        )
    rate_limit_store[(client_ip, path)].append(now)

def sanitize_text(text: str, max_length: int = 200) -> str:
    """Strips HTML tags, trims whitespace, and validates text size boundaries."""
    if not text:
        return ""
    if len(text) > max_length:
        raise HTTPException(
            status_code=400,
            detail=f"Input exceeds maximum allowed length of {max_length} characters."
        )
    # Strip any potential HTML tags
    clean_tag_re = re.compile(r'<.*?>')
    cleaned = re.sub(clean_tag_re, '', text)
    return cleaned.strip()

def sanitize_dict_strings(d: dict, max_length: int = 1500) -> dict:
    """Recursively sanitizes all nested strings and string lists within a dictionary."""
    if not isinstance(d, dict):
        return d
    sanitized = {}
    for k, v in d.items():
        if isinstance(v, str):
            sanitized[k] = sanitize_text(v, max_length=max_length)
        elif isinstance(v, list):
            sanitized[k] = [sanitize_text(item, max_length=max_length) if isinstance(item, str) else item for item in v]
        elif isinstance(v, dict):
            sanitized[k] = sanitize_dict_strings(v, max_length=max_length)
        else:
            sanitized[k] = v
    return sanitized



# --- CORS Configuration ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://civic-ai-frontend-367616383035.us-central1.run.app",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# --- Configuration Settings ---
PROJECT_ID = os.getenv("PROJECT_ID")
LOCATION = os.getenv("LOCATION", "global")
DATA_STORE_ID = os.getenv("DATA_STORE_ID")

# Initialize Vertex AI for Gemini
try:
    vertexai.init(project=PROJECT_ID, location="us-central1")
except Exception as e:
    print(f"Failed to initialize Vertex AI SDK: {e}")

# Initialize Translation client
try:
    translate_client = translate.Client()
except Exception as e:
    print(f"Failed to initialize Translation client: {e}")
    translate_client = None

# Initialize Firestore client
try:
    db = firestore.Client()
except Exception as e:
    print(f"Failed to initialize Firestore Client: {e}")
    db = None

# Bookmark collection in Firestore
BOOKMARKS_COLLECTION = "bookmarks"

def translate_text(text: str, target_lang: str) -> str:
    """Helper to translate a single string using Cloud Translation API."""
    if not text or target_lang == "en" or not translate_client:
        return text
    try:
        result = translate_client.translate(text, target_language=target_lang)
        return result.get("translatedText", text)
    except Exception as e:
        print(f"Translation failed for '{text[:25]}...': {e}")
        return text

def translate_texts(texts: list, target_lang: str) -> list:
    """Helper to batch translate a list of strings for efficiency."""
    if not texts or target_lang == "en" or not translate_client:
        return texts
    try:
        results = translate_client.translate(texts, target_language=target_lang)
        if isinstance(results, list):
            return [res.get("translatedText", "") for res in results]
        elif isinstance(results, dict):
            return [results.get("translatedText", "")]
        return texts
    except Exception as e:
        print(f"Batch translation failed: {e}")
        return texts

def get_mock_results(search_query: str):
    """Provides high-quality mock data when Vertex AI search fails or credentials are missing."""
    query_lower = search_query.lower()
    
    mock_pool = [
        {
            "document_id": "Matter_12041_Affordable_Housing_Agenda",
            "title": "NYC City Council Agenda - Affordable Housing & Zoning Amendments",
            "agency": "City Council",
            "doc_type": "Agenda",
            "year": "2026",
            "status": "Active",
            "snippets": [
                "The committee discussed zoning amendments for affordable housing in Brooklyn. The proposed resolution aims to allocate 20% of new residential units to low-income families.",
                "Subsidies for developers who commit to building mixed-income properties in transit-oriented zones were evaluated.",
                "Public hearing scheduled for next Tuesday regarding community land trusts."
            ],
            "document_url": "https://storage.googleapis.com/civic-ai-agendas-va/Matter_12041_Affordable_Housing_Agenda.pdf"
        },
        {
            "document_id": "Matter_22894_Green_Infrastructure_Minutes",
            "title": "NYC DEP Minutes - Stormwater Management & Green Infrastructure",
            "agency": "DEP",
            "doc_type": "Minutes",
            "year": "2025",
            "status": "Passed",
            "snippets": [
                "Department of Environmental Protection presented plans for rain gardens and bioswales to mitigate flooding in Queens. The budget allocation is $5.2 million for the next fiscal year.",
                "Implementation of green roofs on public school buildings was approved unanimously.",
                "Citizen complaints about street flooding in Jamaica, Queens were entered into the record."
            ],
            "document_url": "https://storage.googleapis.com/civic-ai-agendas-va/Matter_22894_Green_Infrastructure_Minutes.pdf"
        },
        {
            "document_id": "Matter_30910_Bicycle_Lanes_Report",
            "title": "NYC DOT Report - Bicycle Lane Network Expansion & Safety Study",
            "agency": "DOT",
            "doc_type": "Report",
            "year": "2026",
            "status": "Referred",
            "snippets": [
                "Expansion of the protected bicycle lane network along 5th Avenue was approved. Work will commence in September 2026, aimed at improving cyclist safety.",
                "A study of cyclist-pedestrian conflicts on shared paths was commissioned for review by the traffic safety board.",
                "Proposed bike share station additions in East Harlem."
            ],
            "document_url": "https://storage.googleapis.com/civic-ai-agendas-va/Matter_30910_Bicycle_Lanes_Report.pdf"
        },
        {
            "document_id": "Matter_45120_Transit_Fares_Legislation",
            "title": "MTA Legislation - Fair Fares Expansion Act",
            "agency": "MTA",
            "doc_type": "Legislation Item",
            "year": "2026",
            "status": "Passed",
            "snippets": [
                "The proposal to expand the Fair Fares program to residents earning up to 150% of the federal poverty level was voted on and passed.",
                "Funding for transit equity subsidies will be supplemented by the new congestion pricing revenue.",
                "Discounted metro cards will now be available through online portals starting next month."
            ],
            "document_url": "https://storage.googleapis.com/civic-ai-agendas-va/Matter_45120_Transit_Fares_Legislation.pdf"
        },
        {
            "document_id": "Matter_50882_Solid_Waste_Management_Agenda",
            "title": "NYC DSNY Agenda - Zero Waste Initiative & Composting Rules",
            "agency": "DSNY",
            "doc_type": "Agenda",
            "year": "2025",
            "status": "Active",
            "snippets": [
                "New regulations requiring commercial establishments to compost organic waste are set for final review.",
                "Sanitation police enforcement will be increased in designated high-litter commercial corridors.",
                "Pilot curbside composting program results in Brooklyn show a 40% reduction in landfilled waste."
            ],
            "document_url": "https://storage.googleapis.com/civic-ai-agendas-va/Matter_50882_Solid_Waste_Management_Agenda.pdf"
        }
    ]
    
    # Filter based on search query matching any snippet or title content
    matched = []
    cleaned_query = search_query.strip()
    if cleaned_query:
        for item in mock_pool:
            text_to_search = (item["title"] + " " + item["agency"] + " " + item["doc_type"] + " " + " ".join(item["snippets"])).lower()
            if any(word in text_to_search for word in query_lower.split()):
                matched.append(item)
    else:
        matched = mock_pool[:3]
        
    return matched

def search_vertex_ai(search_query: str):
    """Queries the Gemini Enterprise Agent Search datastore in your real project, falls back to mock data if it fails."""
    try:
        import re
        client = discoveryengine.SearchServiceClient()
        
        serving_config = client.serving_config_path(
            project=PROJECT_ID,
            location=LOCATION,
            data_store=DATA_STORE_ID,
            serving_config="default_config",
        )

        request = discoveryengine.SearchRequest(
            serving_config=serving_config,
            query=search_query,
            page_size=15,  # Fetch top 15 results to balance deduplication headroom and low LLM latency
            content_search_spec=discoveryengine.SearchRequest.ContentSearchSpec(
                extractive_content_spec=discoveryengine.SearchRequest.ContentSearchSpec.ExtractiveContentSpec(
                    max_extractive_segment_count=3,
                )
            )
        )

        response = client.search(request)
        results = []
        seen_filenames = set()
        seen_titles = set()
        
        for result in response.results:
            doc_data = result.document.derived_struct_data
            snippets = doc_data.get("extractive_segments", [])
            
            # Extract title if available, otherwise generate from id
            title = doc_data.get("title") or f"Document {result.document.id}"
            
            # Clean title by replacing underscores with spaces for readability if it looks like a filename
            clean_title = title
            if "_" in title and " " not in title:
                # Remove file extensions like .pdf if present
                clean_title = re.sub(r'\.[a-zA-Z0-9]+$', '', title)
                # Replace underscores with spaces
                clean_title = clean_title.replace("_", " ")
                # Strip trailing numbers like ids if they are long
                clean_title = re.sub(r'\s\d+$', '', clean_title)
            
            # Extract GCS link from multiple potential locations safely
            gcs_link = ""
            if doc_data:
                gcs_link = doc_data.get("link") or doc_data.get("gcs_uri") or doc_data.get("gcsUri") or ""
            if not gcs_link and result.document.struct_data:
                gcs_link = result.document.struct_data.get("link") or result.document.struct_data.get("gcs_uri") or ""
            
            filename = ""
            if gcs_link:
                # Clean link query params if any
                clean_link = gcs_link.split("?")[0].split("#")[0]
                filename = clean_link.split("/")[-1]
                
                # Unquote URL-encoded values (e.g. %20 -> space)
                if filename:
                    import urllib.parse
                    filename = urllib.parse.unquote(filename)
            
            # Normalize title for robust title-based deduplication
            norm_title = "".join(c for c in clean_title.lower() if c.isalnum()).strip()
            
            # Deduplicate by filename (if present) OR normalized title
            if filename:
                if filename in seen_filenames:
                    continue
                seen_filenames.add(filename)
                
            if norm_title:
                if norm_title in seen_titles:
                    continue
                seen_titles.add(norm_title)
                
            results.append({
                "document_id": result.document.id,
                "title": clean_title,
                "agency": "City Council" if "council" in clean_title.lower() else "Agency Search",
                "doc_type": "Agenda" if "agenda" in clean_title.lower() else "Document",
                "year": "2026",
                "status": "Active",
                "snippets": [s.get("content") for s in snippets] if snippets else ["No matching snippets found."],
                "filename": filename,
                "document_url": ""  # Will be dynamically built using request base URL in /api/search
            })
                
        return results
    except Exception as e:
         print(f"Vertex AI search failed ({e}). Falling back to mock results.")
         return get_mock_results(search_query)

@app.get("/")
def health_check(request: Request):
    ip = request.headers.get("x-forwarded-for", request.client.host).split(",")[0].strip()
    check_rate_limit(ip, "/", limit=30, window_seconds=60)
    return {"status": "CivicAI Backend is running!"}

@app.get("/api/documents/{filename:path}")
def stream_document(request: Request, filename: str):
    """Securely streams a PDF/document from the GCS bucket to bypass Public Access Prevention (PAP)."""
    ip = request.headers.get("x-forwarded-for", request.client.host).split(",")[0].strip()
    check_rate_limit(ip, "/api/documents", limit=30, window_seconds=60)
    
    filename = sanitize_text(filename, max_length=500)
    # Check for path traversal attempts
    if ".." in filename or filename.startswith("/") or filename.startswith("\\"):
        raise HTTPException(status_code=400, detail="Invalid filename format (path traversal blocked)")

    try:
        storage_client = storage.Client()
        bucket = storage_client.bucket("civic-ai-agendas-va")
        blob = bucket.blob(filename)
        
        if not blob.exists():
            raise HTTPException(status_code=404, detail=f"Document '{filename}' not found")
        
        is_pdf = filename.lower().endswith(".pdf")
        disposition = "inline" if is_pdf else "attachment"
        
        import urllib.parse
        encoded_filename = urllib.parse.quote(filename)
        headers = {
            "Content-Disposition": f'{disposition}; filename="{filename}"; filename*=UTF-8\'\'{encoded_filename}',
            "Cache-Control": "public, max-age=3600",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
        
        media_type = "application/pdf"
        if filename.lower().endswith(".docx"):
            media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        elif filename.lower().endswith(".doc"):
            media_type = "application/msword"
        elif filename.lower().endswith(".txt"):
            media_type = "text/plain"
        elif filename.lower().endswith(".csv"):
            media_type = "text/csv"
        elif filename.lower().endswith(".xls"):
            media_type = "application/vnd.ms-excel"
        elif filename.lower().endswith(".xlsx"):
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            
        def iterfile():
            with blob.open("rb") as f:
                while chunk := f.read(1024 * 64): # 64KB chunks
                    yield chunk

        return StreamingResponse(
            iterfile(),
            media_type=media_type,
            headers=headers
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error streaming document {filename}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to stream document: {e}")

def layman_cluster_results_batch(results: list, query: str) -> list:
    """Uses Gemini 2.5 Flash to cluster similar municipal documents and summarize them.
    Returns a list of clusters, each containing unified summaries and its associated documents with metadata.
    Categorizes relevance and returns structured JSON."""
    if not results:
        return []
    
    try:
        model = GenerativeModel("gemini-2.5-flash")
        
        prompt = (
            f"You are CivicAI's expert public document clustering and summarization agent.\n"
            f"Your task is to analyze municipal document snippets and rewrite them into beautiful, clear, plain-English explanations for everyday citizens.\n\n"
            f"The citizen searched for: '{query}'\n\n"
            f"Group these documents into at most 3 cohesive clusters based on their subject matter (e.g. similar legislative cases, public hearings, or closely related proposals).\n\n"
            f"CRITICAL RULES:\n"
            f"1. CLUSTERING: Group similar or redundant documents together. Documents about the same project or topic must go into the same cluster. Keep total clusters to at most 3.\n"
            f"2. CLUSTER TITLE ('cluster_title'): Generate a clear, professional, short name for each cluster (under 5 words, e.g. 'Atlantic Avenue Rezoning', 'NYPD Transparency').\n"
            f"3. IS RELEVANT ('is_relevant'): Set to true only if the cluster has substantial, meaningful connection to the query '{query}'.\n"
            f"4. OVERVIEW ('combined_overview'): Write exactly ONE high-quality, airy, engaging sentence (under 30 words) explaining the cluster's main focus. Avoid meta-language like 'This snippet discusses...'.\n"
            f"5. KEY POINTS ('combined_points'): Provide 2 to 4 spacious bullet points (under 120 words total) highlighting the most critical facts, actions, or decisions. Use **bold** formatting (e.g. '**$5.2 million**') for key terms or decisions to make it visually scannable.\n"
            f"6. REFERENCED INDICES ('referenced_indices'): Return a list of integer indices representing which documents from the input list belong to this cluster (0-indexed).\n"
            f"7. DOCUMENTS METADATA ('documents_metadata'): For each input document, extract high-accuracy metadata (agency, doc_type, year, status). Default status to 'Active', year to '2026', agency to 'City Council' and doc_type to 'Transcript' if not found.\n\n"
            f"Documents to cluster and summarize:\n"
        )
        
        for i, res in enumerate(results):
            prompt += f"--- Document Index {i} ---\n"
            prompt += f"Title: {res.get('title')}\n"
            prompt += f"Raw Snippets:\n"
            for s in res.get("snippets", []):
                prompt += f"- {s}\n"
            prompt += "\n"
            
        prompt += (
            f"Respond strictly with a valid JSON object of this structure:\n"
            f"{{\n"
            f"  \"clusters\": [\n"
            f"    {{\n"
            f"      \"cluster_title\": \"Atlantic Avenue Rezoning\",\n"
            f"      \"is_relevant\": true,\n"
            f"      \"combined_overview\": \"The City Council is proposing zoning changes for Atlantic Avenue to promote affordable housing.\",\n"
            f"      \"combined_points\": [\n"
            f"        \"Key point with **bold highlight**.\",\n"
            f"        \"Another key point with **another highlight**.\"\n"
            f"      ],\n"
            f"      \"referenced_indices\": [0, 1]\n"
            f"    }}\n"
            f"  ],\n"
            f"  \"documents_metadata\": [\n"
            f"    {{\n"
            f"      \"index\": 0,\n"
            f"      \"agency\": \"City Council\",\n"
            f"      \"doc_type\": \"Transcript\",\n"
            f"      \"year\": \"2026\",\n"
            f"      \"status\": \"Passed\"\n"
            f"    }}\n"
            f"  ]\n"
            f"}}"
        )
        
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        
        parsed = json.loads(response.text.strip())
        clusters_data = parsed.get("clusters", [])
        meta_data = parsed.get("documents_metadata", [])
        
        # Build index map for easy lookup of metadata
        meta_map = {}
        for m in meta_data:
            idx = m.get("index")
            if idx is not None:
                meta_map[idx] = m
                
        # First, update metadata on original documents list
        for i, res in enumerate(results):
            m = meta_map.get(i, {})
            res["agency"] = m.get("agency", res.get("agency", "City Council"))
            res["doc_type"] = m.get("doc_type", res.get("doc_type", "Transcript"))
            res["year"] = str(m.get("year", res.get("year", "2026")))
            res["status"] = m.get("status", res.get("status", "Active"))
            
        final_clusters = []
        for c in clusters_data:
            if not c.get("is_relevant", False):
                continue
                
            cluster_docs = []
            for idx in c.get("referenced_indices", []):
                if 0 <= idx < len(results):
                    cluster_docs.append(results[idx])
                    
            if not cluster_docs:
                continue
                
            final_clusters.append({
                "cluster_title": c.get("cluster_title", "Topic Overview"),
                "combined_overview": c.get("combined_overview", ""),
                "combined_points": c.get("combined_points", []),
                "documents": cluster_docs
            })
            
        # Global sequential citation index assignment across all clusters
        seen_doc_ids = set()
        citation_counter = 1
        for cluster in final_clusters:
            for doc in cluster["documents"]:
                doc_id = doc["document_id"]
                if doc_id not in seen_doc_ids:
                    seen_doc_ids.add(doc_id)
                    doc["citation_index"] = citation_counter
                    citation_counter += 1
                else:
                    # Lookup existing citation index for this doc
                    for prev_c in final_clusters:
                        for prev_doc in prev_c["documents"]:
                            if prev_doc["document_id"] == doc_id:
                                doc["citation_index"] = prev_doc["citation_index"]
                                break
                                
        return final_clusters
    except Exception as e:
        print(f"Batch layman clustering failed: {e}. Falling back to default cluster.")
        # Fallback to single giant cluster containing all original results
        for idx, res in enumerate(results):
            res["citation_index"] = idx + 1
        return [{
            "cluster_title": "Search Results",
            "combined_overview": f"Review municipal records matching '{query}'.",
            "combined_points": ["Click on each document to read details."],
            "documents": results
        }]


def generate_synthesis(query: str, results: list) -> dict:
    """Generates a dynamic cited synthesis and 3 related queries using Gemini 2.5 Flash."""
    try:
        model = GenerativeModel("gemini-2.5-flash")
        
        if not results:
            prompt = (
                f"You are CivicAI, a helpful municipal Q&A assistant designed for everyday citizens.\n"
                f"The user searched for: '{query}'. However, absolutely no municipal documents were found matching this search query.\n\n"
                f"Your task is to write a warm, conversational, extremely natural, human-like 1-sentence response explaining that no recent discussions or matching archives were found regarding their topic.\n\n"
                f"CRITICAL RULES:\n"
                f"- Avoid rigid robotic templates like 'No information in recent archives was found about...'. Instead, write like a conversational expert (e.g., 'There have been no recent discussions particularly about New Yorkers leaving the city' or 'We couldn't find any recent municipal records covering school funding updates').\n"
                f"- Keep it extremely direct, polite, and under 25 words.\n"
                f"- Do NOT make up false citations or use citation tags like [1] or [2].\n\n"
                f"Also, generate exactly 3 relevant, highly specific alternative search queries they could try next.\n\n"
                f"Respond strictly with a valid JSON object of this structure:\n"
                f"{{\n"
                f"  \"synthesis\": \"your natural, custom query-miss answer\",\n"
                f"  \"related_queries\": [\"alternative query 1\", \"alternative query 2\", \"alternative query 3\"]\n"
                f"}}\n"
            )
        else:
            prompt = (
                f"You are CivicAI, a helpful municipal Q&A assistant designed for everyday citizens.\n"
                f"Your goal is to synthesize the provided documents to answer the user's query: '{query}'.\n"
                f"Write a concise answer (maximum of 3 sentences) that is extremely clear, easy to understand (layman-legible), and direct.\n\n"
                f"CRITICAL STYLE GUIDELINES:\n"
                f"- State the facts, proposals, and real-world impacts DIRECTLY. Never use robotic meta-language like 'I found documents regarding...', 'Based on the search results...', 'The document says...', 'According to snippet [1]...'.\n"
                f"- Imagine you are explaining this directly to a neighbor. For example, instead of saying: 'Document [1] discusses the committee's proposal regarding zoning and affordable housing', say: 'The City Council is proposing to require 20% of new residential developments in Brooklyn to be set aside for low-income families [1].'\n"
                f"- Cite the source document index number by inserting citation tags like [1] or [2] matching the source index numbers below to show which document supports each statement. Place citations immediately after the claim they support. Do not combine citations (e.g., write [1][2] instead of [1,2]).\n\n"
                f"INTELLIGENT HANDLING OF QUERY MISSES:\n"
                f"- If the provided documents do NOT contain substantial, relevant information answering the search query '{query}', do NOT pretend they do. Do NOT use generic or robotic templates.\n"
                f"- Instead, write a warm, conversational, extremely natural layman statement. For example, explain naturally that there have been no recent discussions or records particularly about their topic (e.g., 'There have been no recent discussions particularly about New Yorkers leaving the city, but...' or 'We couldn't find any recent municipal records covering school funding updates, but...'), and then transition to suggesting something relevant or adjacent that is discussed in the provided documents (e.g., if the user queried 'schools' but the documents discuss 'housing', you can mention that while school details are not active, recent housing proposals are being discussed [1]).\n\n"
                f"Source Documents:\n"
            )
            for res in results:
                i = res.get("citation_index", 1)
                title = res.get("title", f"Document {i}")
                snippets_text = " ".join(res.get("snippets", []))
                prompt += f"[{i}] {title}: {snippets_text}\n"
                
            prompt += (
                f"\nRespond strictly with a valid JSON object of this structure:\n"
                f"{{\n"
                f"  \"synthesis\": \"your synthesized answer with citations (or query miss explanation with citations if the documents were off-topic)\",\n"
                f"  \"related_queries\": [\"query 1\", \"query 2\", \"query 3\"]\n"
                f"}}\n"
            )
        
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        data = json.loads(response.text.strip())
        return {
            "synthesis": data.get("synthesis", ""),
            "related_queries": data.get("related_queries", [])[:3]
        }
    except Exception as e:
        print(f"Gemini synthesis failed ({e}). Falling back to dynamic local synthesis.")
        if results:
            first_doc = results[0]
            first_idx = first_doc.get("citation_index", 1)
            first_title = first_doc.get('title', 'Municipal Item')
            first_agency = first_doc.get('agency', 'City Council')
            synthesis_text = (
                f"While no direct matches were fully processed for \"{query}\", "
                f"recent records from the {first_agency} regarding '{first_title}' are available for review [{first_idx}]."
            )
            related = [
                f"Read more about {first_title}",
                "Are there any public hearings scheduled?",
                "What other archives cover similar topics?"
            ]
        else:
            # Clean up query/topic to make it read naturally in the fallback sentence
            topic = query.strip('?').strip()
            if len(topic) > 50:
                topic = topic[:50] + "..."
            synthesis_text = (
                f"I couldn't find any recent municipal records or discussions specifically about '{topic}'. "
                f"You might try searching for broader terms or adjacent city topics like zoning, transit, or public safety."
            )
            related = [
                "zoning amendments",
                "stormwater infrastructure",
                "transit fares legislation"
            ]
        return {
            "synthesis": synthesis_text,
            "related_queries": related
        }


class ChatTurnInput(BaseModel):
    query: str
    synthesis: str

class SearchRequest(BaseModel):
    query: str
    lang: str = "en"
    history: List[ChatTurnInput] = []

def reformulate_query(query: str, history: List[ChatTurnInput]) -> str:
    """Uses Gemini 2.5 Flash to rewrite a conversational follow-up query into a standalone query."""
    if not history:
        return query
        
    try:
        model = GenerativeModel("gemini-2.5-flash")
        
        # Format the past conversation context
        formatted_history = ""
        for turn in history[-3:]:  # Keep the last 3 turns to avoid token bloat
            q_text = turn.query
            s_text = turn.synthesis
            formatted_history += f"User: {q_text}\nAssistant: {s_text}\n\n"
            
        prompt = (
            f"You are a search query reformulation assistant.\n"
            f"Analyze the following conversation history and the latest user follow-up message.\n"
            f"If the follow-up message depends on context from the conversation (e.g., uses pronouns like 'it', 'this', 'their', 'that proposal' or refers to previous topics), rewrite it into a clear, standalone search query that contains all necessary context for a document search engine.\n"
            f"If the follow-up message is already a standalone query or is completely unrelated to the history, return it exactly as-is.\n\n"
            f"Conversation History:\n"
            f"{formatted_history}"
            f"Latest Follow-up Message: '{query}'\n\n"
            f"Respond strictly with the standalone rewritten query, and absolutely nothing else. Do not add quotes, introductions, or markdown formatting."
        )
        
        response = model.generate_content(prompt)
        rewritten = response.text.strip().strip('"').strip("'").strip()
        if rewritten:
            print(f"Query reformulated: '{query}' -> '{rewritten}'")
            return rewritten
    except Exception as e:
        print(f"Query reformulation failed ({e}). Using raw query.")
        
    return query


@app.post("/api/search")
def run_search(request: Request, payload: SearchRequest):
    """The route your frontend UI will call to search matching documents."""
    # Retrieve client IP securely behind proxy
    ip = request.headers.get("x-forwarded-for", request.client.host).split(",")[0].strip()
    check_rate_limit(ip, "/api/search", limit=5, window_seconds=60)
    
    # Sanitize and validate inputs
    query = sanitize_text(payload.query, max_length=200)
    lang = sanitize_text(payload.lang, max_length=10)
    
    # Reformulate query if history exists
    target_query = query
    if payload.history:
        target_query = reformulate_query(query, payload.history)
    
    print(f"Executing secure agent search for: {target_query} [lang: {lang}]")
    
    # 1. Translate query to English if input language is not English
    english_query = target_query
    if lang != "en" and translate_client:
        english_query = translate_text(target_query, "en")
        print(f"Translated query: '{target_query}' -> '{english_query}'")
    
    # 2. Run Vertex AI Search using English query
    results = search_vertex_ai(english_query)
    
    # 3. Batch-summarize and cluster search results
    final_clusters = layman_cluster_results_batch(results, english_query)
    
    import urllib.parse
    # Set the dynamic absolute document URL for each search result
    for cluster in final_clusters:
        for res in cluster["documents"]:
            if res.get("filename"):
                encoded_filename = urllib.parse.quote(res["filename"])
                res["document_url"] = f"{request.base_url}api/documents/{encoded_filename}"
    
    # Gather unique clustered documents for synthesis prompt
    clustered_docs = []
    seen_doc_ids = set()
    for cluster in final_clusters:
        for doc in cluster["documents"]:
            if doc["document_id"] not in seen_doc_ids:
                seen_doc_ids.add(doc["document_id"])
                clustered_docs.append(doc)
    
    # 4. Generate English synthesis and related queries
    synth_data = generate_synthesis(english_query, clustered_docs)
    synthesis = synth_data.get("synthesis", "")
    related_queries = synth_data.get("related_queries", [])
    
    # 5. If target language is not English, translate everything back to target language
    if lang != "en" and translate_client:
        synthesis = translate_text(synthesis, lang)
        related_queries = translate_texts(related_queries, lang)
        
        # Translate final clusters recursively
        for cluster in final_clusters:
            cluster["cluster_title"] = translate_text(cluster.get("cluster_title", ""), lang)
            cluster["combined_overview"] = translate_text(cluster.get("combined_overview", ""), lang)
            cluster["combined_points"] = translate_texts(cluster.get("combined_points", []), lang)
            
            for doc in cluster["documents"]:
                doc["title"] = translate_text(doc.get("title", ""), lang)
                doc["agency"] = translate_text(doc.get("agency", ""), lang)
                doc["doc_type"] = translate_text(doc.get("doc_type", ""), lang)
                doc["status"] = translate_text(doc.get("status", ""), lang)
                # Batch translate snippets list
                doc["snippets"] = translate_texts(doc.get("snippets", []), lang)
            
    return {
        "query": query,
        "clusters": final_clusters,
        "synthesis": synthesis,
        "related_queries": related_queries
    }

# --- Firestore Bookmark Endpoints ---

@app.get("/api/bookmarks")
def get_bookmarks(request: Request, email: str = None):
    """Fetches all bookmarked documents for the authenticated user."""
    ip = request.headers.get("x-forwarded-for", request.client.host).split(",")[0].strip()
    check_rate_limit(ip, "/api/bookmarks", limit=30, window_seconds=60)
    
    if not db:
         raise HTTPException(status_code=500, detail="Firestore is not initialized.")
    if not email:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    email = sanitize_text(email, max_length=200)
    try:
        docs = db.collection(BOOKMARKS_COLLECTION).where("email", "==", email).stream()
        bookmarks = []
        for doc in docs:
            bookmark_data = doc.to_dict()
            bookmark_data["id"] = doc.id
            bookmarks.append(bookmark_data)
        return bookmarks
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch bookmarks: {e}")

@app.post("/api/bookmarks")
def add_bookmark(request: Request, bookmark_item: dict):
    """Saves a bookmarked document with notes to Firestore."""
    ip = request.headers.get("x-forwarded-for", request.client.host).split(",")[0].strip()
    check_rate_limit(ip, "/api/bookmarks", limit=15, window_seconds=60)
    
    if not db:
         raise HTTPException(status_code=500, detail="Firestore is not initialized.")
         
    bookmark_item = sanitize_dict_strings(bookmark_item, max_length=5000)
    email = bookmark_item.get("email")
    doc_id = bookmark_item.get("document_id")
    
    if not email or not doc_id:
        raise HTTPException(status_code=400, detail="email and document_id are required")
        
    try:
        # Check if already exists to update notes, or create new
        query_ref = db.collection(BOOKMARKS_COLLECTION).where("email", "==", email).where("document_id", "==", doc_id).limit(1).get()
        if query_ref:
            existing_doc = query_ref[0]
            existing_doc.reference.update({
                "notes": bookmark_item.get("notes", ""),
                "timestamp": firestore.SERVER_TIMESTAMP
            })
            return {"status": "success", "message": "Bookmark notes updated", "id": existing_doc.id}
        else:
            doc_ref = db.collection(BOOKMARKS_COLLECTION).document()
            bookmark_item["timestamp"] = firestore.SERVER_TIMESTAMP
            doc_ref.set(bookmark_item)
            return {"status": "success", "message": "Bookmark created", "id": doc_ref.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create bookmark: {e}")

@app.delete("/api/bookmarks/{bookmark_id}")
def delete_bookmark(request: Request, bookmark_id: str, email: str):
    """Deletes a bookmark if it belongs to the authenticated user."""
    ip = request.headers.get("x-forwarded-for", request.client.host).split(",")[0].strip()
    check_rate_limit(ip, "/api/bookmarks/delete", limit=15, window_seconds=60)
    
    if not db:
         raise HTTPException(status_code=500, detail="Firestore is not initialized.")
         
    bookmark_id = sanitize_text(bookmark_id, max_length=100)
    email = sanitize_text(email, max_length=200)
    
    try:
        doc_ref = db.collection(BOOKMARKS_COLLECTION).document(bookmark_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Bookmark not found")
        if doc.to_dict().get("email") != email:
            raise HTTPException(status_code=403, detail="Not authorized to delete this bookmark")
        doc_ref.delete()
        return {"status": "success", "message": "Bookmark deleted"}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete bookmark: {e}")


# --- Firestore User Profile & Account Deletion Endpoints ---
PROFILES_COLLECTION = "profiles"

@app.get("/api/profile")
def get_profile(request: Request, email: str = None):
    """Fetches user profile details (such as custom displayName) from Firestore."""
    ip = request.headers.get("x-forwarded-for", request.client.host).split(",")[0].strip()
    check_rate_limit(ip, "/api/profile", limit=30, window_seconds=60)
    
    if not db:
        raise HTTPException(status_code=500, detail="Firestore is not initialized.")
    if not email:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    email = sanitize_text(email, max_length=200)
    try:
        doc_ref = db.collection(PROFILES_COLLECTION).document(email)
        doc = doc_ref.get()
        if doc.exists:
            return doc.to_dict()
        return {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch profile: {e}")

@app.post("/api/profile")
def update_profile(request: Request, profile_item: dict):
    """Creates or updates a user's custom profile metadata in Firestore."""
    ip = request.headers.get("x-forwarded-for", request.client.host).split(",")[0].strip()
    check_rate_limit(ip, "/api/profile", limit=15, window_seconds=60)
    
    if not db:
        raise HTTPException(status_code=500, detail="Firestore is not initialized.")
        
    profile_item = sanitize_dict_strings(profile_item, max_length=5000)
    email = profile_item.get("email")
    display_name = profile_item.get("displayName")
    
    if not email or not display_name:
        raise HTTPException(status_code=400, detail="email and displayName are required")
        
    try:
        doc_ref = db.collection(PROFILES_COLLECTION).document(email)
        doc_ref.set({
            "email": email,
            "displayName": display_name,
            "timestamp": firestore.SERVER_TIMESTAMP
        })
        return {"status": "success", "message": "Profile updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {e}")

@app.delete("/api/profile")
def delete_profile(request: Request, email: str):
    """Deletes custom profile, and wipes all bookmarks and chat sessions for the user's email."""
    ip = request.headers.get("x-forwarded-for", request.client.host).split(",")[0].strip()
    check_rate_limit(ip, "/api/profile/delete", limit=5, window_seconds=60)
    
    if not db:
        raise HTTPException(status_code=500, detail="Firestore is not initialized.")
    if not email:
        raise HTTPException(status_code=400, detail="email is required")
        
    email = sanitize_text(email, max_length=200)
    try:
        # 1. Delete profile doc
        db.collection(PROFILES_COLLECTION).document(email).delete()
        
        # 2. Delete all user bookmarks
        bookmarks_ref = db.collection(BOOKMARKS_COLLECTION).where("email", "==", email)
        bookmarks_stream = bookmarks_ref.stream()
        for doc in bookmarks_stream:
            doc.reference.delete()
            
        # 3. Delete all user chats
        chats_ref = db.collection(CHATS_COLLECTION).where("email", "==", email)
        chats_stream = chats_ref.stream()
        for doc in chats_stream:
            doc.reference.delete()
            
        return {"status": "success", "message": "Account data successfully wiped"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete account data: {e}")


# --- Firestore Chat Sessions Endpoints ---
CHATS_COLLECTION = "chats"

@app.get("/api/chats")
def get_chats(request: Request, email: str = None):
    """Fetches all chronological chat threads for the authenticated user."""
    ip = request.headers.get("x-forwarded-for", request.client.host).split(",")[0].strip()
    check_rate_limit(ip, "/api/chats", limit=30, window_seconds=60)
    
    if not db:
        raise HTTPException(status_code=500, detail="Firestore is not initialized.")
    if not email:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    email = sanitize_text(email, max_length=200)
    try:
        # Stream docs matching email
        docs = db.collection(CHATS_COLLECTION).where("email", "==", email).stream()
        chats = []
        for doc in docs:
            chat_data = doc.to_dict()
            chat_data["id"] = doc.id
            chats.append(chat_data)
            
        # Sort in-memory in case composite indexing is building
        def get_ts(x):
            ts = x.get("timestamp")
            if ts is None:
                return ""
            try:
                return ts.isoformat()
            except AttributeError:
                return str(ts)
                
        chats.sort(key=get_ts, reverse=True)
        
        # Convert timestamp objects to ISO strings for JSON serialization
        for chat in chats:
            if chat.get("timestamp") and not isinstance(chat["timestamp"], str):
                try:
                    chat["timestamp"] = chat["timestamp"].isoformat()
                except AttributeError:
                    chat["timestamp"] = str(chat["timestamp"])
        return chats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch chats: {e}")

@app.post("/api/chats")
def add_chat(request: Request, chat_item: dict):
    """Saves or updates a chat session (uniquely identified by an optional client-provided id) to Firestore."""
    ip = request.headers.get("x-forwarded-for", request.client.host).split(",")[0].strip()
    check_rate_limit(ip, "/api/chats", limit=15, window_seconds=60)
    
    if not db:
        raise HTTPException(status_code=500, detail="Firestore is not initialized.")
        
    chat_item = sanitize_dict_strings(chat_item, max_length=150000)
    email = chat_item.get("email")
    chat_id = chat_item.get("id")
    
    if not email:
        raise HTTPException(status_code=400, detail="email is required")
        
    try:
        if chat_id:
            doc_ref = db.collection(CHATS_COLLECTION).document(chat_id)
            doc = doc_ref.get()
            if doc.exists:
                if doc.to_dict().get("email") != email:
                    raise HTTPException(status_code=403, detail="Not authorized to update this chat")
                doc_ref.update({
                    "title": chat_item.get("title", "Topic Overview"),
                    "turns": chat_item.get("turns", []),
                    "timestamp": firestore.SERVER_TIMESTAMP
                })
                return {"status": "success", "message": "Chat updated", "id": chat_id}
                
        doc_ref = db.collection(CHATS_COLLECTION).document()
        chat_item["id"] = doc_ref.id
        chat_item["timestamp"] = firestore.SERVER_TIMESTAMP
        doc_ref.set(chat_item)
        return {"status": "success", "message": "Chat created", "id": doc_ref.id}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save chat: {e}")

@app.delete("/api/chats/{chat_id}")
def delete_chat(request: Request, chat_id: str, email: str):
    """Deletes a chat session if it belongs to the authenticated user."""
    ip = request.headers.get("x-forwarded-for", request.client.host).split(",")[0].strip()
    check_rate_limit(ip, "/api/chats/delete", limit=15, window_seconds=60)
    
    if not db:
        raise HTTPException(status_code=500, detail="Firestore is not initialized.")
        
    chat_id = sanitize_text(chat_id, max_length=100)
    email = sanitize_text(email, max_length=200)
    
    try:
        doc_ref = db.collection(CHATS_COLLECTION).document(chat_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Chat not found")
        if doc.to_dict().get("email") != email:
            raise HTTPException(status_code=403, detail="Not authorized to delete this chat")
        doc_ref.delete()
        return {"status": "success", "message": "Chat deleted"}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete chat: {e}")


@app.get("/api/analytics")
def get_analytics(request: Request, role: str = "citizen", district: str = "5"):
    """
    Returns 311 service-request analytics and permit data.
    Only accessible to users with the 'district_aide' role.
    Public citizens receive a 403 Forbidden.
    """
    ip = request.headers.get("x-forwarded-for", request.client.host).split(",")[0].strip()
    check_rate_limit(ip, "/api/analytics", limit=30, window_seconds=60)
    
    role = sanitize_text(role, max_length=50)
    district = sanitize_text(district, max_length=10)
    
    if role != "district_aide":
        raise HTTPException(
            status_code=403,
            detail="Analytics access requires District Aide credentials."
        )

    analytics = {
        "district": district,
        "period": "Last 30 Days",
        "summary": {
            "total_311_requests": 1847,
            "resolved": 1402,
            "pending": 312,
            "overdue": 133,
            "resolution_rate_pct": 75.9,
        },
        "requests_by_category": [
            {"category": "Noise Complaints", "count": 412, "resolved": 318, "avg_resolution_hours": 48},
            {"category": "Street Light Outage", "count": 287, "resolved": 264, "avg_resolution_hours": 72},
            {"category": "Pothole Repair", "count": 198, "resolved": 145, "avg_resolution_hours": 120},
            {"category": "Illegal Parking", "count": 176, "resolved": 152, "avg_resolution_hours": 24},
            {"category": "Graffiti Removal", "count": 143, "resolved": 128, "avg_resolution_hours": 96},
            {"category": "Trash Collection Missed", "count": 134, "resolved": 112, "avg_resolution_hours": 36},
            {"category": "Water Main Break", "count": 89, "resolved": 81, "avg_resolution_hours": 8},
            {"category": "Sidewalk Damage", "count": 72, "resolved": 48, "avg_resolution_hours": 168},
            {"category": "Tree Removal Request", "count": 68, "resolved": 42, "avg_resolution_hours": 240},
            {"category": "Building Code Violation", "count": 54, "resolved": 38, "avg_resolution_hours": 336},
        ],
        "weekly_trend": [
            {"week": "May 5–11",  "opened": 438, "closed": 402},
            {"week": "May 12–18", "opened": 461, "closed": 389},
            {"week": "May 19–25", "opened": 502, "closed": 445},
            {"week": "May 26–31", "opened": 446, "closed": 412},
        ],
        "permits": {
            "total_issued": 214,
            "residential": 89,
            "commercial": 72,
            "demolition": 18,
            "special_events": 35,
        },
        "top_neighborhoods": [
            {"name": "East Harlem",     "requests": 312},
            {"name": "Washington Heights", "requests": 274},
            {"name": "Inwood",          "requests": 198},
            {"name": "Hamilton Heights", "requests": 167},
            {"name": "Central Harlem",  "requests": 142},
        ],
    }

    return analytics