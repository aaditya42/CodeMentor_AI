"""
Embedding service using fastembed.
Generates dense vector embeddings for knowledge base documents and queries.
"""

import numpy as np
from typing import Optional
from app.core.config import settings
from app.core.logging import get_logger, log_latency

logger = get_logger("embeddings")

_model = None


def _get_model():
    """Lazy-load the embedding model."""
    global _model
    if _model is None:
        from fastembed import TextEmbedding
        logger.info("Loading embedding model", model=settings.EMBEDDING_MODEL)
        _model = TextEmbedding(settings.EMBEDDING_MODEL)
        logger.info("Embedding model loaded", dimensions=settings.EMBEDDING_DIMENSIONS)
    return _model


@log_latency("generate_embeddings")
def generate_embeddings(texts: list[str]) -> np.ndarray:
    """Generate dense embeddings for a list of texts."""
    model = _get_model()
    embeddings = list(model.embed(texts))
    return np.array(embeddings, dtype=np.float32)


def generate_query_embedding(query: str) -> np.ndarray:
    """Generate embedding for a single query."""
    return generate_embeddings([query])[0]


def get_embedding_dimension() -> int:
    """Get the dimensionality of the embedding model."""
    return settings.EMBEDDING_DIMENSIONS
