"""
Ingestion pipeline for adding datasets and documents to the knowledge base.
Supports batch processing with embedding generation.
"""

import json
import os
from typing import Optional

from app.rag.knowledge_base import ingest_documents
from app.core.config import settings
from app.core.logging import get_logger, log_latency

logger = get_logger("ingestion")


@log_latency("ingest_file")
def ingest_from_file(filepath: str, doc_type: str = "pattern") -> int:
    """
    Ingest documents from a JSON file.
    Expected format: list of objects with 'id', 'content', and optional metadata.
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"File not found: {filepath}")

    with open(filepath, "r") as f:
        raw = json.load(f)

    if not isinstance(raw, list):
        raise ValueError("Expected a JSON array of documents")

    documents = []
    for item in raw:
        doc = {
            "id": item.get("id", f"doc-{len(documents)}"),
            "content": item["content"],
            "doc_type": item.get("doc_type", doc_type),
            "difficulty": item.get("difficulty"),
            "topics": item.get("topics", []),
        }
        documents.append(doc)

    count = ingest_documents(documents, rebuild=False)
    logger.info(f"Ingested {count} documents from {filepath}")
    return count


@log_latency("ingest_directory")
def ingest_from_directory(
    directory: str,
    doc_type: str = "pattern",
    file_extension: str = ".json",
) -> int:
    """Ingest all matching files from a directory."""
    if not os.path.isdir(directory):
        raise NotADirectoryError(f"Not a directory: {directory}")

    total = 0
    for filename in sorted(os.listdir(directory)):
        if filename.endswith(file_extension):
            filepath = os.path.join(directory, filename)
            try:
                count = ingest_from_file(filepath, doc_type)
                total += count
            except Exception as e:
                logger.error(f"Failed to ingest {filename}: {e}")

    logger.info(f"Ingested {total} documents from {directory}")
    return total


def ingest_leetcode_problems(problems: list[dict]) -> int:
    """
    Ingest LeetCode-style problem definitions into the knowledge base.
    Transforms problem data into searchable knowledge documents.
    """
    documents = []
    for p in problems:
        # Create a searchable document from problem metadata
        content_parts = [
            f"Problem: {p.get('title', 'Unknown')}",
            f"Difficulty: {p.get('difficulty', 'Unknown')}",
            f"Topics: {', '.join(p.get('topics', []))}",
        ]
        if p.get("description"):
            content_parts.append(f"Description: {p['description'][:500]}")
        if p.get("constraints"):
            content_parts.append(f"Constraints: {p['constraints']}")

        documents.append({
            "id": f"problem-{p.get('slug', p.get('id', len(documents)))}",
            "content": "\n".join(content_parts),
            "doc_type": "problem",
            "difficulty": p.get("difficulty"),
            "topics": p.get("topics", []),
        })

    count = ingest_documents(documents, rebuild=False)
    logger.info(f"Ingested {count} LeetCode problems")
    return count
