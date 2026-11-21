"""Worker service hosting FastAPI endpoints and BullMQ ingest & revalidate consumers."""

import asyncio
import os
import psutil
from contextlib import asynccontextmanager
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from bullmq import Worker, Job

from app.contracts import (
    QUEUE_INGEST,
    QUEUE_REVALIDATE,
    QUEUE_PREFIX,
    IngestJobPayload,
    RevalidateJobPayload,
)
from app.db import init_db_pool, close_db_pool
from app.pipeline import run_ingest, run_revalidate
try:
    from app.extractor.embeddings import embed_texts
except ImportError:
    embed_texts = None

ingest_worker: Optional[Worker] = None
revalidate_worker: Optional[Worker] = None

def get_redis_opts():
    return {
        "host": os.environ.get("REDIS_HOST", "localhost"),
        "port": int(os.environ.get("REDIS_PORT", "6379")),
        "password": os.environ.get("REDIS_PASSWORD", "redis_password_change_me"),
    }

async def process_ingest_job(job: Job, token: str):
    print(f"[Worker] Processing ingest job {job.id} with payload: {job.data}")
    payload = IngestJobPayload.model_validate(job.data)
    await run_ingest(payload)
    print(f"[Worker] Finished ingest job {job.id}")
    return {"status": "completed", "documentId": payload.documentId}

async def process_revalidate_job(job: Job, token: str):
    print(f"[Worker] Processing revalidate job {job.id} with payload: {job.data}")
    payload = RevalidateJobPayload.model_validate(job.data)
    result = await run_revalidate(payload)
    print(f"[Worker] Finished revalidate job {job.id}: {result.model_dump()}")
    return result.model_dump()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Database pool and BullMQ workers
    await init_db_pool()
    redis_opts = get_redis_opts()

    global ingest_worker, revalidate_worker
    try:
        # Ingest queue: Concurrency 2
        ingest_worker = Worker(
            QUEUE_INGEST,
            process_ingest_job,
            {
                "connection": redis_opts,
                "concurrency": 2,
                "lockDuration": 30000,
                "prefix": QUEUE_PREFIX,
            }
        )
        # Revalidate queue: Concurrency 4
        revalidate_worker = Worker(
            QUEUE_REVALIDATE,
            process_revalidate_job,
            {
                "connection": redis_opts,
                "concurrency": 4,
                "lockDuration": 30000,
                "prefix": QUEUE_PREFIX,
            }
        )
        print("[Worker Service] BullMQ ingest (concurrency 2) and revalidate (concurrency 4) workers started.")
    except Exception as e:
        print(f"[Worker Service WARNING] Could not start BullMQ workers immediately: {e}")

    yield

    # Shutdown
    if ingest_worker:
        await ingest_worker.close()
    if revalidate_worker:
        await revalidate_worker.close()
    await close_db_pool()
    print("[Worker Service] Clean shutdown completed.")

app = FastAPI(title="AI Document Intelligence Worker Service", version="1.0.0", lifespan=lifespan)

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
    try:
        vectors = await embed_texts(payload.texts, task_type=payload.task_type or "RETRIEVAL_DOCUMENT")
        return EmbedResponse(vectors=vectors)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
