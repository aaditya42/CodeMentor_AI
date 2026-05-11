"""
BM25 lexical retrieval using rank-bm25.
Provides keyword-based retrieval to complement FAISS dense search.
"""

from typing import Optional
from rank_bm25 import BM25Okapi
from app.core.logging import get_logger, log_latency

logger = get_logger("bm25")


class BM25Retriever:
    """BM25 keyword-based retriever."""

    def __init__(self):
        self.bm25: Optional[BM25Okapi] = None
        self.documents: list[dict] = []
        self._tokenized_corpus: list[list[str]] = []

    def build_index(self, documents: list[dict]):
        """Build BM25 index from documents."""
        self.documents = documents
        self._tokenized_corpus = [self._tokenize(doc["content"]) for doc in documents]
        self.bm25 = BM25Okapi(self._tokenized_corpus)
        logger.info("BM25 index built", num_docs=len(documents))

    @log_latency("bm25_search")
    def search(self, query: str, top_k: int = 10) -> list[tuple[dict, float]]:
        """Search for documents matching the query."""
        if self.bm25 is None or not self.documents:
            return []

        query_tokens = self._tokenize(query)
        scores = self.bm25.get_scores(query_tokens)

        # Get top-k indices
        top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_k]

        results = []
        for idx in top_indices:
            if scores[idx] > 0:
                results.append((self.documents[idx], float(scores[idx])))

        return results

    def _tokenize(self, text: str) -> list[str]:
        """Simple whitespace tokenization with lowercasing."""
        return [
            w for w in text.lower().replace(",", " ").replace(".", " ").split()
            if len(w) > 2
        ]

    @property
    def is_loaded(self) -> bool:
        return self.bm25 is not None and len(self.documents) > 0


# Singleton
bm25_retriever = BM25Retriever()
