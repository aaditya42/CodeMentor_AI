export interface PatternDefinition {
  name: string;
  description: string;
  typicalComplexity: { time: string; space: string };
  optimizations: string[];
}

export const ALGORITHM_PATTERNS: Record<string, PatternDefinition> = {
  brute_force: {
    name: 'Brute Force', description: 'Exhaustive search through all possibilities',
    typicalComplexity: { time: 'O(n²)', space: 'O(1)' }, optimizations: ['hash_map', 'sorting', 'two_pointers'],
  },
  two_pointers: {
    name: 'Two Pointers', description: 'Two indices traversing from different positions',
    typicalComplexity: { time: 'O(n)', space: 'O(1)' }, optimizations: [],
  },
  sliding_window: {
    name: 'Sliding Window', description: 'Maintaining a window of elements while iterating',
    typicalComplexity: { time: 'O(n)', space: 'O(k)' }, optimizations: [],
  },
  dynamic_programming: {
    name: 'Dynamic Programming', description: 'Overlapping subproblems with memoization',
    typicalComplexity: { time: 'O(n²)', space: 'O(n)' }, optimizations: ['space_optimization', 'bottom_up'],
  },
  binary_search: {
    name: 'Binary Search', description: 'Halving search space on sorted data',
    typicalComplexity: { time: 'O(log n)', space: 'O(1)' }, optimizations: [],
  },
  hash_map: {
    name: 'Hash Map Lookup', description: 'Hash-based O(1) lookups',
    typicalComplexity: { time: 'O(n)', space: 'O(n)' }, optimizations: [],
  },
  backtracking: {
    name: 'Backtracking', description: 'Exploring all paths with pruning',
    typicalComplexity: { time: 'O(2^n)', space: 'O(n)' }, optimizations: ['pruning', 'memoization'],
  },
  graph_bfs: {
    name: 'BFS', description: 'Breadth-first traversal using queue',
    typicalComplexity: { time: 'O(V+E)', space: 'O(V)' }, optimizations: [],
  },
  graph_dfs: {
    name: 'DFS', description: 'Depth-first traversal using recursion/stack',
    typicalComplexity: { time: 'O(V+E)', space: 'O(V)' }, optimizations: [],
  },
  greedy: {
    name: 'Greedy', description: 'Locally optimal choices at each step',
    typicalComplexity: { time: 'O(n log n)', space: 'O(1)' }, optimizations: [],
  },
  sorting: {
    name: 'Sort-Based', description: 'Sorting as preprocessing step',
    typicalComplexity: { time: 'O(n log n)', space: 'O(n)' }, optimizations: ['counting_sort'],
  },
  heap_priority_queue: {
    name: 'Heap / Priority Queue', description: 'Efficient min/max operations',
    typicalComplexity: { time: 'O(n log k)', space: 'O(k)' }, optimizations: [],
  },
  divide_and_conquer: {
    name: 'Divide and Conquer', description: 'Recursively breaking into independent subproblems',
    typicalComplexity: { time: 'O(n log n)', space: 'O(log n)' }, optimizations: [],
  },
};

export const COMMON_BUG_PATTERNS = [
  { id: 'off_by_one', name: 'Off-by-one Error', description: 'Loop bounds or indices off by one', severity: 'warning' as const },
  { id: 'missing_base_case', name: 'Missing Base Case', description: 'Recursive function without base case', severity: 'error' as const },
  { id: 'integer_overflow', name: 'Integer Overflow', description: 'Arithmetic may exceed integer bounds', severity: 'warning' as const },
  { id: 'empty_input', name: 'No Empty Input Check', description: 'Missing check for empty collection', severity: 'warning' as const },
  { id: 'null_check', name: 'Missing Null Check', description: 'Potential null dereference', severity: 'error' as const },
  { id: 'infinite_loop', name: 'Infinite Loop', description: 'Loop may never terminate', severity: 'error' as const },
  { id: 'boundary_check', name: 'Missing Boundary Check', description: 'Array access without bounds validation', severity: 'warning' as const },
  { id: 'negative_index', name: 'Negative Index', description: 'Potentially negative array index', severity: 'warning' as const },
];
