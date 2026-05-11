"""
Algorithm pattern definitions and bug pattern catalog.
Migrated from TypeScript ast/patterns.ts with enhanced detection rules.
"""

ALGORITHM_PATTERNS = {
    "brute_force": {
        "name": "Brute Force",
        "description": "Exhaustive search through all possibilities",
        "typical_complexity": {"time": "O(n²)", "space": "O(1)"},
        "optimizations": ["hash_map", "sorting", "two_pointers"],
    },
    "two_pointers": {
        "name": "Two Pointers",
        "description": "Two indices traversing from different positions",
        "typical_complexity": {"time": "O(n)", "space": "O(1)"},
        "optimizations": [],
    },
    "sliding_window": {
        "name": "Sliding Window",
        "description": "Maintaining a window of elements while iterating",
        "typical_complexity": {"time": "O(n)", "space": "O(k)"},
        "optimizations": [],
    },
    "dynamic_programming": {
        "name": "Dynamic Programming",
        "description": "Overlapping subproblems with memoization",
        "typical_complexity": {"time": "O(n²)", "space": "O(n)"},
        "optimizations": ["space_optimization", "bottom_up"],
    },
    "binary_search": {
        "name": "Binary Search",
        "description": "Halving search space on sorted data",
        "typical_complexity": {"time": "O(log n)", "space": "O(1)"},
        "optimizations": [],
    },
    "hash_map": {
        "name": "Hash Map Lookup",
        "description": "Hash-based O(1) lookups",
        "typical_complexity": {"time": "O(n)", "space": "O(n)"},
        "optimizations": [],
    },
    "backtracking": {
        "name": "Backtracking",
        "description": "Exploring all paths with pruning",
        "typical_complexity": {"time": "O(2^n)", "space": "O(n)"},
        "optimizations": ["pruning", "memoization"],
    },
    "graph_bfs": {
        "name": "BFS",
        "description": "Breadth-first traversal using queue",
        "typical_complexity": {"time": "O(V+E)", "space": "O(V)"},
        "optimizations": [],
    },
    "graph_dfs": {
        "name": "DFS",
        "description": "Depth-first traversal using recursion/stack",
        "typical_complexity": {"time": "O(V+E)", "space": "O(V)"},
        "optimizations": [],
    },
    "greedy": {
        "name": "Greedy",
        "description": "Locally optimal choices at each step",
        "typical_complexity": {"time": "O(n log n)", "space": "O(1)"},
        "optimizations": [],
    },
    "sorting": {
        "name": "Sort-Based",
        "description": "Sorting as preprocessing step",
        "typical_complexity": {"time": "O(n log n)", "space": "O(n)"},
        "optimizations": ["counting_sort"],
    },
    "heap_priority_queue": {
        "name": "Heap / Priority Queue",
        "description": "Efficient min/max operations",
        "typical_complexity": {"time": "O(n log k)", "space": "O(k)"},
        "optimizations": [],
    },
    "divide_and_conquer": {
        "name": "Divide and Conquer",
        "description": "Recursively breaking into independent subproblems",
        "typical_complexity": {"time": "O(n log n)", "space": "O(log n)"},
        "optimizations": [],
    },
}

COMMON_BUG_PATTERNS = [
    {"id": "off_by_one", "name": "Off-by-one Error", "description": "Loop bounds or indices off by one", "severity": "warning"},
    {"id": "missing_base_case", "name": "Missing Base Case", "description": "Recursive function without base case", "severity": "error"},
    {"id": "integer_overflow", "name": "Integer Overflow", "description": "Arithmetic may exceed integer bounds", "severity": "warning"},
    {"id": "empty_input", "name": "No Empty Input Check", "description": "Missing check for empty collection", "severity": "warning"},
    {"id": "null_check", "name": "Missing Null Check", "description": "Potential null dereference", "severity": "error"},
    {"id": "infinite_loop", "name": "Infinite Loop", "description": "Loop may never terminate", "severity": "error"},
    {"id": "boundary_check", "name": "Missing Boundary Check", "description": "Array access without bounds validation", "severity": "warning"},
    {"id": "negative_index", "name": "Negative Index", "description": "Potentially negative array index", "severity": "warning"},
]

# Data structure detection keywords per language
DS_KEYWORDS = {
    "PYTHON": {
        "hash_map": ["dict(", "defaultdict", "{", ":"],
        "set": ["set("],
        "array": ["list(", "["],
        "queue": ["deque(", "Queue("],
        "heap": ["heapq.", "heappush", "heappop"],
        "stack": ["append(", "pop("],  # Used in stack-like patterns
        "sorting": [".sort(", "sorted("],
    },
    "CPP": {
        "hash_map": ["unordered_map", "map<"],
        "set": ["unordered_set", "set<"],
        "array": ["vector<", "array<"],
        "queue": ["queue<", "deque<"],
        "heap": ["priority_queue<"],
        "stack": ["stack<"],
        "sorting": ["sort(", "stable_sort("],
    },
    "JAVA": {
        "hash_map": ["HashMap", "TreeMap", "LinkedHashMap"],
        "set": ["HashSet", "TreeSet"],
        "array": ["ArrayList", "int[]", "String[]"],
        "queue": ["Queue", "LinkedList", "ArrayDeque"],
        "heap": ["PriorityQueue"],
        "stack": ["Stack"],
        "sorting": ["Arrays.sort", "Collections.sort"],
    },
}
