"""Vector embedding generator using gemini-embedding-001 with L2 normalization and mock support."""

import hashlib
import math
import os
from typing import List, Optional
import numpy as np
from tenacity import retry, stop_after_attempt, wait_exponential

EMBEDDING_MODEL_DEFAULT = "gemini-embedding-001"
EMBEDDING_DIM_DEFAULT = 1536
MAX_CHARS_PER_TEXT = 6000

def l2_normalize(vector: List[float]) -> List[float]:
    """Applies L2 normalization to ensure unit length for cosine similarity."""
    norm = math.sqrt(sum(x * x for x in vector))
    if norm == 0:
        return vector
    return [round(x / norm, 6) for x in vector]

def _mock_embedding(text: str, dim: int) -> List[float]:
    """Generates a deterministic L2-normalized vector from text hash without API keys."""
    # Seed pseudo-random numbers from text hash
    h = hashlib.sha256(text.encode("utf-8")).digest()
    raw = [(float(b) / 128.0 - 1.0) for b in h]
    # Repeat or slice to target dim
    repeated = (raw * (dim // len(raw) + 1))[:dim]
    return l2_normalize(repeated)

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    reraise=True
)
async def _embed_with_gemini(
    texts: List[str],
    task_type: str,
    model_name: str,
    target_dim: int,
    api_key: str
) -> List[List[float]]:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)
    results: List[List[float]] = []

    # Process in batches of 16
    batch_size = 16
    for i in range(0, len(texts), batch_size):
        batch = [t[:MAX_CHARS_PER_TEXT] for t in texts[i:i + batch_size]]
        response = await client.aio.models.embed_content(
            model=model_name,
            contents=batch,
            config=types.EmbedContentConfig(
                task_type=task_type,
                output_dimensionality=target_dim,
            )
        )
        for emb in response.embeddings:
            vec = list(emb.values)
            if len(vec) != target_dim:
                raise ValueError(f"Embedding dimension mismatch: expected {target_dim}, got {len(vec)}")
            results.append(l2_normalize(vec))

    return results

async def embed_texts(
    texts: List[str],
    task_type: str = "RETRIEVAL_DOCUMENT"
) -> List[List[float]]:
    """Embeds a list of texts into L2-normalized 1536-dimensional vectors.
    Falls back to deterministic mock vectors when LLM_PROVIDER=mock or GEMINI_API_KEY is not set.
    """
    if not texts:
        return []

    provider = os.environ.get("LLM_PROVIDER", "gemini").lower()
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    model_name = os.environ.get("EMBEDDING_MODEL", EMBEDDING_MODEL_DEFAULT)
    target_dim = int(os.environ.get("EMBEDDING_DIM", EMBEDDING_DIM_DEFAULT))

    if provider == "mock" or not api_key:
        return [_mock_embedding(t[:MAX_CHARS_PER_TEXT], target_dim) for t in texts]

    try:
        return await _embed_with_gemini(texts, task_type, model_name, target_dim, api_key)
    except Exception as e:
        # If API fails or is unavailable, raise so caller can handle or degrade gracefully
        raise RuntimeError(f"Failed to generate Gemini embeddings: {str(e)}")
