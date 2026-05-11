"""
Knowledge base management and seed data.
Loads documents into both FAISS and BM25 indexes.
"""

from app.rag.faiss_store import faiss_store
from app.rag.bm25_retriever import bm25_retriever
from app.core.logging import get_logger

logger = get_logger("knowledge-base")

SEED_DOCUMENTS = [
    {"id": "pat-1", "doc_type": "pattern", "content": "Two Sum pattern: Use a hash map to store complement values. For each element, check if its complement exists in the map. Time O(n), Space O(n).", "topics": ["Hash Table", "Arrays"]},
    {"id": "pat-2", "doc_type": "pattern", "content": "Sliding Window pattern: Maintain a window with two pointers. Expand right pointer, shrink left when condition violated. Useful for substring/subarray problems.", "topics": ["Sliding Window", "Two Pointers"]},
    {"id": "pat-3", "doc_type": "pattern", "content": "Binary Search pattern: For sorted data or monotonic functions, halve search space each iteration. Check mid, adjust low/high.", "topics": ["Binary Search"]},
    {"id": "pat-4", "doc_type": "pattern", "content": "BFS for shortest path in unweighted graphs. Use queue, mark visited. Level-order traversal for trees.", "topics": ["Graphs", "Trees"]},
    {"id": "pat-5", "doc_type": "pattern", "content": "Dynamic Programming: If problem has optimal substructure and overlapping subproblems, use DP. Start with recursion, add memoization, convert to bottom-up.", "topics": ["Dynamic Programming"]},
    {"id": "pat-6", "doc_type": "pattern", "content": "Two Pointers on sorted array: One pointer at start, one at end. Move based on sum comparison. Works for pair-finding problems.", "topics": ["Two Pointers", "Arrays"]},
    {"id": "pat-7", "doc_type": "pattern", "content": "Backtracking: Explore all candidates, prune invalid paths early. Use recursion with a choice list, make choice, recurse, undo choice.", "topics": ["Backtracking", "Recursion"]},
    {"id": "pat-8", "doc_type": "pattern", "content": "Stack for matching parentheses, monotonic stack for next greater element, expression evaluation.", "topics": ["Stack"]},
    {"id": "pat-9", "doc_type": "pattern", "content": "Priority Queue / Heap for K-th largest/smallest, merge K sorted lists, scheduling problems.", "topics": ["Heap"]},
    {"id": "pat-10", "doc_type": "pattern", "content": "Trie for prefix matching, autocomplete, word search in dictionary.", "topics": ["Trie", "Strings"]},
    {"id": "pat-11", "doc_type": "pattern", "content": "Union-Find (Disjoint Set Union) for connected components, cycle detection in undirected graphs, and Kruskal's MST algorithm.", "topics": ["Union Find", "Graphs"]},
    {"id": "pat-12", "doc_type": "pattern", "content": "Prefix sum array for range sum queries in O(1). Build prefix array in O(n), then range [l,r] = prefix[r+1] - prefix[l].", "topics": ["Arrays", "Math"]},
    {"id": "mis-1", "doc_type": "mistake", "content": "Common mistake: Not handling empty input arrays. Always check if array is empty before accessing elements.", "topics": ["Arrays"]},
    {"id": "mis-2", "doc_type": "mistake", "content": "Common mistake: Off-by-one errors in binary search. Use while(left <= right) and mid = left + (right - left) / 2 to avoid.", "topics": ["Binary Search"]},
    {"id": "mis-3", "doc_type": "mistake", "content": "Common mistake: Not considering negative numbers in sum/product problems. Test with negative inputs.", "topics": ["Arrays", "Math"]},
    {"id": "mis-4", "doc_type": "mistake", "content": "Common mistake: Integer overflow in multiplication. Use long/BigInt for large numbers.", "topics": ["Math"]},
    {"id": "mis-5", "doc_type": "mistake", "content": "Common mistake: Forgetting base case in recursion leading to stack overflow.", "topics": ["Recursion"]},
    {"id": "mis-6", "doc_type": "mistake", "content": "Common mistake: Modifying a collection while iterating over it causes ConcurrentModificationException in Java or undefined behavior in C++.", "topics": ["Arrays"]},
    {"id": "edge-1", "doc_type": "edge_case", "content": "Edge case: Single element array — most operations should return the element itself or handle gracefully.", "topics": ["Arrays"]},
    {"id": "edge-2", "doc_type": "edge_case", "content": "Edge case: All elements are the same — affects sorting, deduplication, and counting algorithms.", "topics": ["Arrays", "Sorting"]},
    {"id": "edge-3", "doc_type": "edge_case", "content": "Edge case: Very large inputs (10^5 to 10^6) — O(n²) will TLE. Need O(n log n) or better.", "topics": ["Arrays"]},
    {"id": "edge-4", "doc_type": "edge_case", "content": "Edge case: Graph with cycles — must track visited nodes to avoid infinite loops in DFS/BFS.", "topics": ["Graphs"]},
    {"id": "edge-5", "doc_type": "edge_case", "content": "Edge case: Empty string input — check length before accessing characters.", "topics": ["Strings"]},
    {"id": "edge-6", "doc_type": "edge_case", "content": "Edge case: Maximum integer values — test with INT_MAX/INT_MIN to catch overflow bugs.", "topics": ["Math"]},
]


def initialize_knowledge_base():
    """Load seed documents into both FAISS and BM25 indexes."""
    logger.info("Initializing knowledge base", num_docs=len(SEED_DOCUMENTS))

    # Load into BM25
    bm25_retriever.build_index(SEED_DOCUMENTS)

    # Load into FAISS (only if not already loaded from disk)
    if not faiss_store.is_loaded:
        faiss_store.add_documents(SEED_DOCUMENTS)
    else:
        logger.info("FAISS index already loaded from disk — skipping seed")

    logger.info("Knowledge base initialized",
                bm25_docs=len(SEED_DOCUMENTS),
                faiss_docs=faiss_store.num_documents)


def ingest_documents(documents: list[dict], rebuild: bool = False):
    """Ingest new documents into both indexes."""
    logger.info("Ingesting documents", count=len(documents), rebuild=rebuild)

    if rebuild:
        all_docs = documents
        faiss_store.rebuild_index(all_docs)
        bm25_retriever.build_index(all_docs)
    else:
        faiss_store.add_documents(documents)
        # BM25 needs full rebuild
        all_docs = bm25_retriever.documents + documents
        bm25_retriever.build_index(all_docs)

    return len(documents)
