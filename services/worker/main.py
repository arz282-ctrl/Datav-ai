"""Main FastAPI application and worker runner for services/worker."""

import os
import psutil
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="AI Document Intelligence Worker Service", version="1.0.0")

class EmbedRequest(BaseModel):
    texts: List[str]
    task_type: Optional[str] = "RETRIEVAL_DOCUMENT"

class EmbedResponse(BaseModel):
    vectors: List[List[float]]

@app.get("/health")
def health():
    process = psutil.Process(os.getpid())
    rss_mb = process.memory_info().rss / (1024 * 1024)
    return {
        "status": "ok",
        "rss_mb": round(rss_mb, 2)
    }

@app.post("/embed", response_model=EmbedResponse)
async def embed_endpoint(payload: EmbedRequest):
    # Stub: returns normalized dummy vectors for mock/testing
    dim = int(os.environ.get("EMBEDDING_DIM", 1536))
    dummy_vec = [1.0 / (dim ** 0.5)] * dim
    return EmbedResponse(vectors=[dummy_vec for _ in payload.texts])
