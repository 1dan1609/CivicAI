import requests
import re
from google.cloud import storage
from google.cloud import discoveryengine_v1 as discoveryengine

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# 1. Configuration
CLIENT_NAME = os.getenv("CLIENT_NAME", "nyc")
API_TOKEN = os.getenv("LEGISTAR_API_TOKEN", "")

BASE_URL = f"https://webapi.legistar.com/v1/{CLIENT_NAME}"
BUCKET_NAME = os.getenv("BUCKET_NAME", "civic-ai-agendas-va") 

def upload_to_gcp(file_bytes, destination_blob_name):
    """Uploads a file directly to your Google Cloud bucket."""
    storage_client = storage.Client()
    bucket = storage_client.bucket(BUCKET_NAME)
    blob = bucket.blob(destination_blob_name)
    blob.upload_from_string(file_bytes, content_type="application/pdf")
    print(f"Uploaded {destination_blob_name} to {BUCKET_NAME}.")

def check_file_exists(filename):
    """Checks if a file already exists in the GCS bucket to avoid redundant downloads."""
    try:
        storage_client = storage.Client()
        bucket = storage_client.bucket(BUCKET_NAME)
        blob = bucket.blob(filename)
        return blob.exists()
    except Exception as e:
        print(f"Error checking GCS for {filename}: {e}")
        return False

def trigger_vertex_import():
    """Triggers an import operation from the GCS bucket into the Vertex AI Search datastore."""
    print("Triggering Vertex AI Search document import from GCS...")
    try:
        client = discoveryengine.DocumentServiceClient()
        parent = client.branch_path(
            project=os.getenv("PROJECT_ID"),
            location="global",
            data_store=os.getenv("DATASTORE_ID"),
            branch="default_branch",
        )
        gcs_uri = "gs://civic-ai-agendas-va/*"
        
        request = discoveryengine.ImportDocumentsRequest(
            parent=parent,
            gcs_source=discoveryengine.GcsSource(
                input_uris=[gcs_uri],
                data_schema="content",
            ),
            reconciliation_mode=discoveryengine.ImportDocumentsRequest.ReconciliationMode.INCREMENTAL,
        )
        
        operation = client.import_documents(request=request)
        print(f"Import operation started: {operation.operation.name}")
        print("Vertex AI Search will index the new documents asynchronously. You can monitor progress in the Cloud Console.")
    except Exception as e:
        print(f"Failed to trigger Vertex AI Search import: {e}")

def process_legistar():
    """Fetches matters from Legistar, downloads their PDF attachments, and triggers indexing."""
    print(f"Fetching matters for {CLIENT_NAME}...")
    
    # Increase top limit to 350 to get a large volume of 250+ files from the last 6 months
    matters_url = f"{BASE_URL}/matters?$top=350&$orderby=MatterLastModifiedUtc desc"
    params = {"token": API_TOKEN}
    
    response = requests.get(matters_url, params=params)
    
    if response.status_code != 200:
        raise RuntimeError(f"Failed to fetch Matters from Legistar. Status: {response.status_code}")

    matters = response.json()
    print(f"Retrieved {len(matters)} legislative matters. Checking attachments...")
    
    uploaded_count = 0
    skipped_count = 0
    
    for matter in matters:
        matter_id = matter.get("MatterId")
        matter_title = matter.get("MatterName", f"matter_{matter_id}")
        
        if matter_title:
            matter_title = re.sub(r'[^a-zA-Z0-9_]', '_', matter_title)
            matter_title = matter_title[:100] 
            
        attachments_url = f"{BASE_URL}/Matters/{matter_id}/Attachments"
        attach_response = requests.get(attachments_url, params=params)
        
        if attach_response.status_code == 200:
            attachments = attach_response.json()
            for attachment in attachments:
                file_url = attachment.get("MatterAttachmentHyperlink")
                if file_url:
                    original_filename = attachment.get("MatterAttachmentFileName", "unknown.pdf")
                    file_ext = str(original_filename).split('.')[-1]
                    
                    filename = f"{matter_title}_{attachment.get('MatterAttachmentId')}.{file_ext}"
                    
                    # Optimization: Skip if already exists in GCS
                    if check_file_exists(filename):
                        print(f"   -> [Skipped] {filename} (already exists in GCS)")
                        skipped_count += 1
                        continue
                        
                    print(f"   -> Found link, downloading: {filename}...")
                    try:
                        file_data = requests.get(file_url, params=params)
                        if file_data.status_code == 200:
                            upload_to_gcp(file_data.content, filename)
                            uploaded_count += 1
                        else:
                            print(f"   -> Failed to download. Status code: {file_data.status_code}")
                    except Exception as e:
                        print(f"   -> Exception downloading {filename}: {e}")
                        
    print(f"Ingestion completed. Uploaded: {uploaded_count}, Skipped (existing): {skipped_count}.")
    
    # Trigger GCS to Datastore import
    trigger_vertex_import()

if __name__ == "__main__":
    import time
    import sys
    try:
        process_legistar()
    except Exception as e:
        print(f"CRITICAL: Connection or runtime error occurred: {e}", file=sys.stderr)
        print("Waiting 30 minutes before retrying...", file=sys.stderr)
        time.sleep(1800)  # 30 minutes
        print("Retrying ingestion now...", file=sys.stderr)
        process_legistar()