"""
Hybrid retrieval pipeline combining FAISS dense + BM25 lexical search.
Uses Reciprocal Rank Fusion (RRF) for score combination.
Optional cross-encoder reranking for final precision boost.
"""

from typing import Optional
from app.rag.faiss_store import faiss_store
from app.rag.bm25_retriever import bm25_retriever
from app.models.schemas import RetrievalResult
from app.core.config import settings
from app.core.logging import get_logger, log_latency

logger = get_logger("hybrid-retrieval")

# Lazy-loaded reranker
_reranker = None


def _get_reranker():
    """Lazy-load cross-encoder reranker model."""
    global _reranker
    if _reranker is None and settings.RERANK_ENABLED:
        try:
            from sentence_transformers import CrossEncoder
            _reranker = CrossEncoder(settings.RERANK_MODEL, max_length=512)
            logger.info("Reranker loaded", model=settings.RERANK_MODEL)
        except Exception as e:
            logger.warning(f"Failed to load reranker: {e}")
    return _reranker


@log_latency("hybrid_search")
def hybrid_search(
    query: str,
    top_k: int = 5,
    difficulty: Optional[str] = None,
    topics: Optional[list[str]] = None,
    doc_type: Optional[str] = None,
) -> list[RetrievalResult]:
    """
    Hybrid search combining dense and lexical retrieval with RRF.

    Steps:
    1. Run FAISS dense search
    2. Run BM25 lexical search
    3. Combine with Reciprocal Rank Fusion
    4. Apply metadata filters
    5. Optionally rerank with cross-encoder
    """
    candidate_k = top_k * 3  # Retrieve more candidates for filtering

    # Step 1 & 2: Parallel retrieval
    dense_results = faiss_store.search(query, candidate_k)
    bm25_results = bm25_retriever.search(query, candidate_k)

    # Step 3: Reciprocal Rank Fusion
    k = 60  # RRF constant
    fused: dict[str, dict] = {}

    for rank, (doc, score) in enumerate(dense_results):
        doc_id = doc.get("id", str(rank))
        rrf_score = 1.0 / (k + rank + 1)
        if doc_id in fused:
            fused[doc_id]["score"] += rrf_score * settings.DENSE_WEIGHT
        else:
            fused[doc_id] = {"doc": doc, "score": rrf_score * settings.DENSE_WEIGHT}

    for rank, (doc, score) in enumerate(bm25_results):
        doc_id = doc.get("id", str(rank + len(dense_results)))
        rrf_score = 1.0 / (k + rank + 1)
        if doc_id in fused:
            fused[doc_id]["score"] += rrf_score * settings.BM25_WEIGHT
        else:
            fused[doc_id] = {"doc": doc, "score": rrf_score * settings.BM25_WEIGHT}

    # Step 4: Apply metadata filters
    filtered = []
    for entry in fused.values():
        doc = entry["doc"]

        if difficulty and doc.get("difficulty") and doc["difficulty"] != difficulty:
            continue
        if topics:
            doc_topics = doc.get("topics", [])
            if doc_topics and not any(t in doc_topics for t in topics):
                continue
        if doc_type and doc.get("doc_type") != doc_type:
            continue

        filtered.append(entry)

    # Sort by score
    filtered.sort(key=lambda x: x["score"], reverse=True)
    candidates = filtered[:top_k * 2]

    # Step 5: Reranking
    if settings.RERANK_ENABLED and candidates:
        reranker = _get_reranker()
        if reranker:
            pairs = [(query, c["doc"]["content"]) for c in candidates]
            try:
                rerank_scores = reranker.predict(pairs)
                for i, score in enumerate(rerank_scores):
                    candidates[i]["score"] = float(score)
                candidates.sort(key=lambda x: x["score"], reverse=True)
                logger.debug("Reranking applied", num_candidates=len(candidates))
            except Exception as e:
                logger.warning(f"Reranking failed: {e}")

    # Take top K and format
    final = candidates[:top_k]

    return [
        RetrievalResult(
            document_id=entry["doc"].get("id", "unknown"),
            content=entry["doc"]["content"],
            score=entry["score"],
            metadata={
                "type": entry["doc"].get("doc_type", "unknown"),
                "difficulty": entry["doc"].get("difficulty"),
                "topics": entry["doc"].get("topics", []),
            },
        )
        for entry in final
    ]
