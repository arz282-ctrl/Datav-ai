import math
import pytest
from app.extractor.embeddings import embed_texts, l2_normalize

@pytest.mark.asyncio
@pytest.mark.unit
async def test_embed_texts_dimension_and_normalization():
    texts = [
        "Invoice from Acme Medical for wheelchair supplies.",
        "Consulting services rendered in hospital room 402."
    ]

    vectors = await embed_texts(texts, task_type="RETRIEVAL_DOCUMENT")
    assert len(vectors) == 2

    for vec in vectors:
        assert len(vec) == 1536
        # Check L2 unit length
        norm = math.sqrt(sum(x * x for x in vec))
        assert abs(norm - 1.0) < 0.001

@pytest.mark.unit
def test_l2_normalize_function():
    v = [3.0, 4.0]
    norm_v = l2_normalize(v)
    assert norm_v == [0.6, 0.8]
