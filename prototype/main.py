import os
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from supabase import create_client

# 1. Initialize Supabase Client
# Replace with your actual Supabase URL and Service/Anon Key from your project dashboard
load_dotenv()
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
# 2. Load the GTE-small model (Outputs 384-dimensional embeddings)
print("Loading GTE-small model...")
model = SentenceTransformer("thenlper/gte-small")

def insert_document(content: str):
    """Generates a 384-dim embedding and inserts it into Supabase."""
    print(f"Generating embedding for: '{content}'")
    
    # Generate embedding (returns a numpy array, convert to list for JSON/Supabase compatibility)
    embedding = model.encode(content).tolist()
    
    # Insert row into your 'documents' table
    response = supabase.table("documents").insert({
        "content": content,
        "embedding": embedding
    }).execute()
    
    print("Inserted successfully:", response.data)

def search_documents(query_text: str):
    """Generates a query embedding and calls the match_documents RPC function."""
    print(f"\nSearching for: '{query_text}'")
    
    # Generate query embedding
    query_embedding = model.encode(query_text).tolist()
    
    # Call the Postgres function we created in Step 3
    response = supabase.rpc(
        "match_documents",
        {
            "query_embedding": query_embedding,
            "match_threshold": 0.6, # Adjust threshold as needed
            "match_count": 3       # Max results to return
        }
    ).execute()
    
    print("Search Results:")
    for row in response.data:
        print(f"- [Similarity: {row['similarity']:.4f}] {row['content']}")

if __name__ == "__main__":
    # Test insertion
    docs = [
        "Supabase provides an open-source alternative to Firebase powered by PostgreSQL.",
        "Python is a popular programming language used for data engineering and machine learning pipelines.",
        "Gordon Ramsay is a world-renowned chef known for his high-end restaurants and television shows."
    ]

    for d in docs:
        insert_document(d)
    
    # Test search
    search_documents("How does Supabase cook good food?")