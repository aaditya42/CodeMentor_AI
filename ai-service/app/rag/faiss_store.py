"""
FAISS vector store with disk persistence.
Supports adding, searching, and rebuilding the index.
"""

import os
import json
import numpy as np
from typing import Optional
from app.core.config import settings
from app.core.logging import get_logger, log_latency
from app.rag.embeddings import generate_embeddings, generate_query_embedding, get_embedding_dimension

logger = get_logger("faiss-store")

_faiss_available = False
try:
    import faiss
    _faiss_available = True
except ImportError:
    logger.warning("FAISS not available — dense retrieval disabled")


class FAISSStore:
    """Persistent FAISS vector store for dense retrieval."""

    def __init__(self):
        self.index: Optional[object] = None
        self.documents: list[dict] = []  # Metadata store
        self._index_path = os.path.join(settings.FAISS_INDEX_DIR, "index.faiss")
        self._meta_path = os.path.join(settings.FAISS_INDEX_DIR, "metadata.json")
        self._load_from_disk()

    def _load_from_disk(self):
        """Load persisted FAISS index and metadata from disk."""
        if not _faiss_available:
            return

        if os.path.exists(self._index_path) and os.path.exists(self._meta_path):
            try:
                self.index = faiss.read_index(self._index_path)
                with open(self._meta_path, "r") as f:
                    self.documents = json.load(f)
                logger.info(
                    "FAISS index loaded from disk",
                    num_vectors=self.index.ntotal,
                    num_docs=len(self.documents),
                )
            except Exception as e:
                logger.error(f"Failed to load FAISS index: {e}")
                self.index = None
                self.documents = []
        else:
            logger.info("No persisted FAISS index found — starting empty")

    def _save_to_disk(self):
        """Persist FAISS index and metadata to disk."""
        if not _faiss_available or self.index is None:
            return

        os.makedirs(settings.FAISS_INDEX_DIR, exist_ok=True)
        try:
            faiss.write_index(self.index, self._index_path)
            with open(self._meta_path, "w") as f:
                json.dump(self.documents, f)
            logger.info("FAISS index saved to disk", num_vectors=self.index.ntotal)
        except Exception as e:
            logger.error(f"Failed to save FAISS index: {e}")

    @log_latency("faiss_add_documents")
    def add_documents(self, documents: list[dict]) -> int:
        """
        Add documents to the FAISS index.
        Each document must have 'id', 'content', and optional metadata fields.
        """
        if not _faiss_available:
            logger.warning("FAISS not available — skipping add")
            return 0

        texts = [doc["content"] for doc in documents]
        embeddings = generate_embeddings(texts)

        if self.index is None:
            dim = embeddings.shape[1]
            self.index = faiss.IndexFlatIP(dim)  # Inner product (for normalized vectors = cosine)
            logger.info("Created new FAISS index", dimensions=dim)

        self.index.add(embeddings)
        self.documents.extend(documents)

        if settings.FAISS_PERSIST:
            self._save_to_disk()

        logger.info(f"Added {len(documents)} documents to FAISS", total=self.index.ntotal)
        return len(documents)

    @log_latency("faiss_search")
    def search(self, query: str, top_k: int = 5) -> list[tuple[dict, float]]:
        """
        Search the FAISS index for similar documents.
        Returns list of (document_metadata, similarity_score) tuples.
        """
        if not _faiss_available or self.index is None or self.index.ntotal == 0:
            return []

        query_vec = generate_query_embedding(query).reshape(1, -1)
        scores, indices = self.index.search(query_vec, min(top_k, self.index.ntotal))

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx >= 0 and idx < len(self.documents):
                results.append((self.documents[idx], float(score)))

        return results

    def rebuild_index(self, documents: list[dict]):
        """Rebuild the entire FAISS index from scratch."""
        self.index = None
        self.documents = []
        if documents:
            self.add_documents(documents)
        logger.info("FAISS index rebuilt", num_docs=len(documents))

    @property
    def is_loaded(self) -> bool:
        return self.index is not None and self.index.ntotal > 0

    @property
    def num_documents(self) -> int:
        return len(self.documents)


# Singleton
faiss_store = FAISSStore()
