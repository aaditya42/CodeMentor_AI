import { analyzeCode } from '../ast/index.js';
import { ALGORITHM_PATTERNS } from '../ast/patterns.js';
import { logger } from '../../lib/logger.js';
import type { ComplexityAnalysis, ComplexitySuggestion } from '@codementor/shared';

const OPTIMIZATION_MAP: Record<string, ComplexitySuggestion[]> = {
  'O(n²)': [
    { from: 'O(n²)', to: 'O(n)', technique: 'Hash Map', description: 'Use hash map for O(1) lookups instead of nested iteration' },
    { from: 'O(n²)', to: 'O(n log n)', technique: 'Sorting + Two Pointers', description: 'Sort first, then use two pointers' },
    { from: 'O(n²)', to: 'O(n)', technique: 'Sliding Window', description: 'Use sliding window for contiguous subarray problems' },
  ],
  'O(n³)': [
    { from: 'O(n³)', to: 'O(n²)', technique: 'DP Optimization', description: 'Reduce one loop dimension with dynamic programming' },
    { from: 'O(n³)', to: 'O(n² log n)', technique: 'Binary Search', description: 'Replace innermost loop with binary search' },
  ],
  'O(2^n)': [
    { from: 'O(2^n)', to: 'O(n·2^(n/2))', technique: 'Meet in the Middle', description: 'Split search space and combine results' },
    { from: 'O(2^n)', to: 'O(n²)', technique: 'Memoization/DP', description: 'Cache overlapping subproblem results with memoization' },
  ],
};

export function analyzeComplexity(code: string, language: string): ComplexityAnalysis {
  logger.info(`Running complexity analysis for ${language}`);
  const ast = analyzeCode(code, language);

  const isTLEProne = ['O(n²)', 'O(n³)', 'O(2^n)'].includes(ast.estimatedTimeComplexity);

  const redundantComputations: string[] = [];
  if (ast.recursionDetected && !ast.detectedPatterns.includes('dynamic_programming')) {
    redundantComputations.push('Recursive calls without memoization — likely recomputing subproblems');
  }
  if (ast.codeStructure.nestedLoopDepth >= 2 && !ast.codeStructure.dataStructuresUsed.includes('hash_map')) {
    redundantComputations.push('Nested loops performing repeated linear scans — consider hash-based lookup');
  }
  if (ast.codeStructure.dataStructuresUsed.includes('sorting') && ast.codeStructure.nestedLoopDepth >= 2) {
    redundantComputations.push('Sorting inside a loop — move sort outside if data is unchanged');
  }

  const suggestions = OPTIMIZATION_MAP[ast.estimatedTimeComplexity] || [];

  return {
    timeComplexity: ast.estimatedTimeComplexity,
    spaceComplexity: ast.estimatedSpaceComplexity,
    isTLEProne,
    redundantComputations,
    suggestions,
  };
}
