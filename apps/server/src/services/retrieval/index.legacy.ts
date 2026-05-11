import { logger } from '../../lib/logger.js';
import type { RetrievalResult } from '@codementor/shared';

// In-memory knowledge base for retrieval
// In production, this would be backed by FAISS + BM25 indexes
interface KnowledgeDocument {
  id: string;
  content: string;
  type: 'problem' | 'editorial' | 'pattern' | 'mistake' | 'edge_case';
  difficulty?: string;
  topics?: string[];
  embedding?: number[];
}

class RetrievalPipeline {
  private documents: KnowledgeDocument[] = [];

  // Load knowledge base documents
  loadDocuments(docs: KnowledgeDocument[]) {
    this.documents = docs;
    logger.info(`Loaded ${docs.length} documents into retrieval pipeline`);
  }

  // BM25-style lexical retrieval using TF-IDF approximation
  private bm25Search(query: string, topK: number = 10): Array<{ doc: KnowledgeDocument; score: number }> {
    const queryTokens = this.tokenize(query);
    const results: Array<{ doc: KnowledgeDocument; score: number }> = [];

    for (const doc of this.documents) {
      const docTokens = this.tokenize(doc.content);
      let score = 0;

      for (const qToken of queryTokens) {
        const tf = docTokens.filter(t => t === qToken).length / docTokens.length;
        const df = this.documents.filter(d => this.tokenize(d.content).includes(qToken)).length;
        const idf = Math.log((this.documents.length - df + 0.5) / (df + 0.5) + 1);
        const k1 = 1.5;
        const b = 0.75;
        const avgDl = this.documents.reduce((sum, d) => sum + this.tokenize(d.content).length, 0) / this.documents.length;
        const bm25Score = idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * docTokens.length / avgDl));
        score += bm25Score;
      }

      results.push({ doc, score });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  // Simple cosine similarity for dense retrieval (placeholder for FAISS)
  private denseSearch(query: string, topK: number = 10): Array<{ doc: KnowledgeDocument; score: number }> {
    // In production, this would use FAISS vector index
    // For now, use keyword overlap as a proxy
    const queryWords = new Set(this.tokenize(query));
    const results: Array<{ doc: KnowledgeDocument; score: number }> = [];

    for (const doc of this.documents) {
      const docWords = new Set(this.tokenize(doc.content));
      const intersection = [...queryWords].filter(w => docWords.has(w)).length;
      const union = new Set([...queryWords, ...docWords]).size;
      const score = union > 0 ? intersection / union : 0; // Jaccard similarity
      results.push({ doc, score });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  // Hybrid search combining BM25 + dense retrieval with RRF
  async search(
    query: string,
    options?: { topK?: number; difficulty?: string; topics?: string[]; type?: string }
  ): Promise<RetrievalResult[]> {
    const topK = options?.topK || 5;

    // Pre-filter documents
    let filteredDocs = [...this.documents];
    if (options?.difficulty) {
      filteredDocs = filteredDocs.filter(d => !d.difficulty || d.difficulty === options.difficulty);
    }
    if (options?.topics?.length) {
      filteredDocs = filteredDocs.filter(d =>
        !d.topics || d.topics.some(t => options.topics!.includes(t))
      );
    }
    if (options?.type) {
      filteredDocs = filteredDocs.filter(d => d.type === options.type);
    }

    // Temporarily set filtered docs
    const originalDocs = this.documents;
    this.documents = filteredDocs;

    // Run both retrieval methods
    const bm25Results = this.bm25Search(query, topK * 2);
    const denseResults = this.denseSearch(query, topK * 2);

    this.documents = originalDocs;

    // Reciprocal Rank Fusion (RRF)
    const k = 60; // RRF constant
    const fusedScores = new Map<string, { doc: KnowledgeDocument; score: number }>();

    bm25Results.forEach((r, rank) => {
      const existing = fusedScores.get(r.doc.id);
      const rrfScore = 1 / (k + rank + 1);
      if (existing) {
        existing.score += rrfScore * 0.4; // BM25 weight
      } else {
        fusedScores.set(r.doc.id, { doc: r.doc, score: rrfScore * 0.4 });
      }
    });

    denseResults.forEach((r, rank) => {
      const existing = fusedScores.get(r.doc.id);
      const rrfScore = 1 / (k + rank + 1);
      if (existing) {
        existing.score += rrfScore * 0.6; // Dense weight
      } else {
        fusedScores.set(r.doc.id, { doc: r.doc, score: rrfScore * 0.6 });
      }
    });

    // Sort by fused score and take top K
    const rankedResults = [...fusedScores.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    logger.info(`Retrieval: ${rankedResults.length} results for "${query.substring(0, 50)}..."`);

    return rankedResults.map(r => ({
      documentId: r.doc.id,
      content: r.doc.content,
      score: r.score,
      metadata: {
        type: r.doc.type,
        difficulty: r.doc.difficulty as any,
        topics: r.doc.topics,
      },
    }));
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2);
  }
}

export const retrievalPipeline = new RetrievalPipeline();

// Initialize with seed knowledge
export function initializeKnowledgeBase() {
  const knowledgeDocs: KnowledgeDocument[] = [
    { id: 'pat-1', type: 'pattern', content: 'Two Sum pattern: Use a hash map to store complement values. For each element, check if its complement exists in the map. Time O(n), Space O(n).', topics: ['Hash Table', 'Arrays'] },
    { id: 'pat-2', type: 'pattern', content: 'Sliding Window pattern: Maintain a window with two pointers. Expand right pointer, shrink left when condition violated. Useful for substring/subarray problems.', topics: ['Sliding Window', 'Two Pointers'] },
    { id: 'pat-3', type: 'pattern', content: 'Binary Search pattern: For sorted data or monotonic functions, halve search space each iteration. Check mid, adjust low/high.', topics: ['Binary Search'] },
    { id: 'pat-4', type: 'pattern', content: 'BFS for shortest path in unweighted graphs. Use queue, mark visited. Level-order traversal for trees.', topics: ['Graphs', 'Trees'] },
    { id: 'pat-5', type: 'pattern', content: 'Dynamic Programming: If problem has optimal substructure and overlapping subproblems, use DP. Start with recursion, add memoization, convert to bottom-up.', topics: ['Dynamic Programming'] },
    { id: 'pat-6', type: 'pattern', content: 'Two Pointers on sorted array: One pointer at start, one at end. Move based on sum comparison. Works for pair-finding problems.', topics: ['Two Pointers', 'Arrays'] },
    { id: 'pat-7', type: 'pattern', content: 'Backtracking: Explore all candidates, prune invalid paths early. Use recursion with a choice list, make choice, recurse, undo choice.', topics: ['Backtracking', 'Recursion'] },
    { id: 'pat-8', type: 'pattern', content: 'Stack for matching parentheses, monotonic stack for next greater element, expression evaluation.', topics: ['Stack'] },
    { id: 'pat-9', type: 'pattern', content: 'Priority Queue / Heap for K-th largest/smallest, merge K sorted lists, scheduling problems.', topics: ['Heap'] },
    { id: 'pat-10', type: 'pattern', content: 'Trie for prefix matching, autocomplete, word search in dictionary.', topics: ['Trie', 'Strings'] },
    { id: 'mis-1', type: 'mistake', content: 'Common mistake: Not handling empty input arrays. Always check if array is empty before accessing elements.', topics: ['Arrays'] },
    { id: 'mis-2', type: 'mistake', content: 'Common mistake: Off-by-one errors in binary search. Use while(left <= right) and mid = left + (right - left) / 2 to avoid.', topics: ['Binary Search'] },
    { id: 'mis-3', type: 'mistake', content: 'Common mistake: Not considering negative numbers in sum/product problems. Test with negative inputs.', topics: ['Arrays', 'Math'] },
    { id: 'mis-4', type: 'mistake', content: 'Common mistake: Integer overflow in multiplication. Use long/BigInt for large numbers.', topics: ['Math'] },
    { id: 'mis-5', type: 'mistake', content: 'Common mistake: Forgetting base case in recursion leading to stack overflow.', topics: ['Recursion'] },
    { id: 'edge-1', type: 'edge_case', content: 'Edge case: Single element array — most operations should return the element itself or handle gracefully.', topics: ['Arrays'] },
    { id: 'edge-2', type: 'edge_case', content: 'Edge case: All elements are the same — affects sorting, deduplication, and counting algorithms.', topics: ['Arrays', 'Sorting'] },
    { id: 'edge-3', type: 'edge_case', content: 'Edge case: Very large inputs (10^5 to 10^6) — O(n²) will TLE. Need O(n log n) or better.', topics: ['Arrays'] },
    { id: 'edge-4', type: 'edge_case', content: 'Edge case: Graph with cycles — must track visited nodes to avoid infinite loops in DFS/BFS.', topics: ['Graphs'] },
    { id: 'edge-5', type: 'edge_case', content: 'Edge case: Empty string input — check length before accessing characters.', topics: ['Strings'] },
  ];

  retrievalPipeline.loadDocuments(knowledgeDocs);
}
