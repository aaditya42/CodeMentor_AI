import { logger } from '../../lib/logger.js';
import { ALGORITHM_PATTERNS, COMMON_BUG_PATTERNS } from './patterns.js';
import type { ASTAnalysis, ASTIssue, OptimizationSuggestion, CodeStructure } from '@codementor/shared';

// Regex-based AST analysis engine
// Uses structural pattern matching on source code when tree-sitter WASM is unavailable.
// Detects algorithm patterns, complexity, bugs, and optimization opportunities.

interface AnalyzerResult {
  functions: number;
  loops: number;
  nestedLoopDepth: number;
  conditionals: number;
  recursiveCalls: number;
  dataStructuresUsed: string[];
  detectedPatterns: string[];
  issues: ASTIssue[];
  suggestions: OptimizationSuggestion[];
}

function analyzePythonCode(code: string): AnalyzerResult {
  const lines = code.split('\n');
  const result: AnalyzerResult = {
    functions: 0, loops: 0, nestedLoopDepth: 0, conditionals: 0,
    recursiveCalls: 0, dataStructuresUsed: [], detectedPatterns: [], issues: [], suggestions: [],
  };

  // Count structures
  const funcNames: string[] = [];
  let maxIndentLoop = 0;
  let currentLoopIndent = -1;
  let currentNesting = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();
    const indent = line.length - trimmed.length;

    // Functions
    const funcMatch = trimmed.match(/^def\s+(\w+)/);
    if (funcMatch) { result.functions++; funcNames.push(funcMatch[1]); }

    // Loops
    if (/^(for|while)\s/.test(trimmed)) {
      result.loops++;
      if (currentLoopIndent >= 0 && indent > currentLoopIndent) {
        currentNesting++;
        maxIndentLoop = Math.max(maxIndentLoop, currentNesting);
      } else {
        currentNesting = 0;
      }
      currentLoopIndent = indent;
    }

    // Conditionals
    if (/^(if|elif|else)\s/.test(trimmed)) result.conditionals++;

    // Recursion detection
    for (const fn of funcNames) {
      if (trimmed.includes(`${fn}(`) && !trimmed.startsWith('def ')) result.recursiveCalls++;
    }

    // Data structures
    if (/dict\(|{.*:.*}|\bdefaultdict\b/.test(trimmed)) addUnique(result.dataStructuresUsed, 'hash_map');
    if (/set\(|\{[^:]+\}/.test(trimmed)) addUnique(result.dataStructuresUsed, 'set');
    if (/\[.*\]|list\(/.test(trimmed)) addUnique(result.dataStructuresUsed, 'array');
    if (/deque\(/.test(trimmed)) addUnique(result.dataStructuresUsed, 'queue');
    if (/heapq\.|heappush|heappop/.test(trimmed)) addUnique(result.dataStructuresUsed, 'heap');
    if (/\.sort\(|sorted\(/.test(trimmed)) addUnique(result.dataStructuresUsed, 'sorting');

    // Bug detection
    if (i === 0 && /def\s+\w+.*:\s*$/.test(trimmed) && lines.length > 1) {
      // Check for empty input handling
      const hasLenCheck = lines.some(l => /len\(|not\s+\w+|==\s*\[\]|is\s+None/.test(l));
      if (!hasLenCheck) {
        result.issues.push({ type: 'edge_case', severity: 'warning', message: 'No check for empty input detected', line: 1 });
      }
    }
  }

  result.nestedLoopDepth = maxIndentLoop + 1;

  // Detect patterns
  if (result.nestedLoopDepth >= 2 && !result.dataStructuresUsed.includes('hash_map')) {
    result.detectedPatterns.push('brute_force');
    result.suggestions.push({ strategy: 'hash_map', expectedComplexity: 'O(n)', description: 'Use hash map for O(1) lookups instead of nested loops' });
  }
  if (result.dataStructuresUsed.includes('hash_map') && result.nestedLoopDepth <= 1) result.detectedPatterns.push('hash_map');
  if (result.recursiveCalls > 0 && result.dataStructuresUsed.includes('hash_map')) result.detectedPatterns.push('dynamic_programming');
  if (result.recursiveCalls > 0 && !result.dataStructuresUsed.includes('hash_map')) {
    result.detectedPatterns.push('backtracking');
    result.suggestions.push({ strategy: 'memoization', expectedComplexity: 'O(n)', description: 'Add memoization to avoid recomputing overlapping subproblems' });
  }
  if (result.dataStructuresUsed.includes('queue')) result.detectedPatterns.push('graph_bfs');
  if (result.dataStructuresUsed.includes('heap')) result.detectedPatterns.push('heap_priority_queue');
  if (result.dataStructuresUsed.includes('sorting')) result.detectedPatterns.push('sorting');

  // Check for binary search pattern
  if (code.includes('low') && code.includes('high') && code.includes('mid')) result.detectedPatterns.push('binary_search');
  // Two pointers
  if ((code.includes('left') && code.includes('right')) || (code.includes('i') && code.includes('j') && /while.*</.test(code))) {
    result.detectedPatterns.push('two_pointers');
  }

  if (result.detectedPatterns.length === 0) result.detectedPatterns.push('linear_scan');

  return result;
}

function analyzeCppCode(code: string): AnalyzerResult {
  const lines = code.split('\n');
  const result: AnalyzerResult = {
    functions: 0, loops: 0, nestedLoopDepth: 0, conditionals: 0,
    recursiveCalls: 0, dataStructuresUsed: [], detectedPatterns: [], issues: [], suggestions: [],
  };

  const funcNames: string[] = [];
  let braceDepth = 0;
  let loopBraceDepths: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Functions
    const funcMatch = trimmed.match(/(?:void|int|bool|string|vector|auto|long|double)\s+(\w+)\s*\(/);
    if (funcMatch && !trimmed.includes(';')) { result.functions++; funcNames.push(funcMatch[1]); }

    // Brace tracking
    for (const ch of trimmed) { if (ch === '{') braceDepth++; if (ch === '}') braceDepth--; }

    // Loops
    if (/^\s*(for|while)\s*\(/.test(line)) {
      result.loops++;
      loopBraceDepths.push(braceDepth);
      const nesting = loopBraceDepths.filter(d => d < braceDepth).length;
      result.nestedLoopDepth = Math.max(result.nestedLoopDepth, nesting + 1);
    }

    // Conditionals
    if (/^\s*if\s*\(/.test(line)) result.conditionals++;

    // Recursion
    for (const fn of funcNames) {
      if (trimmed.includes(`${fn}(`) && !funcMatch) result.recursiveCalls++;
    }

    // Data structures
    if (/unordered_map|map</.test(trimmed)) addUnique(result.dataStructuresUsed, 'hash_map');
    if (/unordered_set|set</.test(trimmed)) addUnique(result.dataStructuresUsed, 'set');
    if (/vector<|array</.test(trimmed)) addUnique(result.dataStructuresUsed, 'array');
    if (/queue<|deque</.test(trimmed)) addUnique(result.dataStructuresUsed, 'queue');
    if (/priority_queue</.test(trimmed)) addUnique(result.dataStructuresUsed, 'heap');
    if (/sort\(|stable_sort\(/.test(trimmed)) addUnique(result.dataStructuresUsed, 'sorting');
    if (/stack</.test(trimmed)) addUnique(result.dataStructuresUsed, 'stack');

    // Bug checks
    if (/\[.*-\s*1\]/.test(trimmed) && !/\.size\(\)|\.length/.test(lines.slice(Math.max(0, i-3), i).join(''))) {
      result.issues.push({ type: 'edge_case', severity: 'warning', message: 'Array access with -1 offset without size check', line: i + 1 });
    }
  }

  // Pattern detection (same logic as Python)
  if (result.nestedLoopDepth >= 2 && !result.dataStructuresUsed.includes('hash_map')) {
    result.detectedPatterns.push('brute_force');
    result.suggestions.push({ strategy: 'hash_map', expectedComplexity: 'O(n)', description: 'Use unordered_map for O(1) lookups' });
  }
  if (result.dataStructuresUsed.includes('hash_map') && result.nestedLoopDepth <= 1) result.detectedPatterns.push('hash_map');
  if (result.recursiveCalls > 0) result.detectedPatterns.push(result.dataStructuresUsed.includes('hash_map') ? 'dynamic_programming' : 'backtracking');
  if (result.dataStructuresUsed.includes('queue')) result.detectedPatterns.push('graph_bfs');
  if (result.dataStructuresUsed.includes('heap')) result.detectedPatterns.push('heap_priority_queue');
  if (result.dataStructuresUsed.includes('sorting')) result.detectedPatterns.push('sorting');
  if (code.includes('low') && code.includes('high') && code.includes('mid')) result.detectedPatterns.push('binary_search');
  if (result.detectedPatterns.length === 0) result.detectedPatterns.push('linear_scan');

  return result;
}

function analyzeJavaCode(code: string): AnalyzerResult {
  const lines = code.split('\n');
  const result: AnalyzerResult = {
    functions: 0, loops: 0, nestedLoopDepth: 0, conditionals: 0,
    recursiveCalls: 0, dataStructuresUsed: [], detectedPatterns: [], issues: [], suggestions: [],
  };

  const funcNames: string[] = [];
  let braceDepth = 0;
  let loopBraceDepths: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    const funcMatch = trimmed.match(/(?:public|private|protected|static|\s)+\s+\w+\s+(\w+)\s*\(/);
    if (funcMatch && !trimmed.includes(';')) { result.functions++; funcNames.push(funcMatch[1]); }

    for (const ch of trimmed) { if (ch === '{') braceDepth++; if (ch === '}') braceDepth--; }

    if (/^\s*(for|while)\s*\(/.test(line)) {
      result.loops++;
      loopBraceDepths.push(braceDepth);
      const nesting = loopBraceDepths.filter(d => d < braceDepth).length;
      result.nestedLoopDepth = Math.max(result.nestedLoopDepth, nesting + 1);
    }
    if (/^\s*if\s*\(/.test(line)) result.conditionals++;

    for (const fn of funcNames) {
      if (trimmed.includes(`${fn}(`) && !funcMatch) result.recursiveCalls++;
    }

    if (/HashMap|TreeMap|LinkedHashMap/.test(trimmed)) addUnique(result.dataStructuresUsed, 'hash_map');
    if (/HashSet|TreeSet/.test(trimmed)) addUnique(result.dataStructuresUsed, 'set');
    if (/ArrayList|int\[\]|String\[\]/.test(trimmed)) addUnique(result.dataStructuresUsed, 'array');
    if (/Queue|LinkedList|ArrayDeque/.test(trimmed)) addUnique(result.dataStructuresUsed, 'queue');
    if (/PriorityQueue/.test(trimmed)) addUnique(result.dataStructuresUsed, 'heap');
    if (/Arrays\.sort|Collections\.sort/.test(trimmed)) addUnique(result.dataStructuresUsed, 'sorting');
    if (/Stack/.test(trimmed)) addUnique(result.dataStructuresUsed, 'stack');
  }

  // Pattern detection
  if (result.nestedLoopDepth >= 2 && !result.dataStructuresUsed.includes('hash_map')) {
    result.detectedPatterns.push('brute_force');
    result.suggestions.push({ strategy: 'hash_map', expectedComplexity: 'O(n)', description: 'Use HashMap for O(1) lookups' });
  }
  if (result.dataStructuresUsed.includes('hash_map') && result.nestedLoopDepth <= 1) result.detectedPatterns.push('hash_map');
  if (result.recursiveCalls > 0) result.detectedPatterns.push(result.dataStructuresUsed.includes('hash_map') ? 'dynamic_programming' : 'backtracking');
  if (result.dataStructuresUsed.includes('queue')) result.detectedPatterns.push('graph_bfs');
  if (result.dataStructuresUsed.includes('heap')) result.detectedPatterns.push('heap_priority_queue');
  if (code.includes('low') && code.includes('high') && code.includes('mid')) result.detectedPatterns.push('binary_search');
  if (result.detectedPatterns.length === 0) result.detectedPatterns.push('linear_scan');

  return result;
}

function estimateComplexity(analysis: AnalyzerResult): { time: string; space: string } {
  if (analysis.detectedPatterns.includes('binary_search')) return { time: 'O(log n)', space: 'O(1)' };
  if (analysis.detectedPatterns.includes('dynamic_programming')) return { time: 'O(n²)', space: 'O(n)' };

  const loopDepth = analysis.nestedLoopDepth;
  let time = 'O(1)';
  if (loopDepth === 1) time = 'O(n)';
  else if (loopDepth === 2) time = 'O(n²)';
  else if (loopDepth === 3) time = 'O(n³)';
  else if (loopDepth > 3) time = `O(n^${loopDepth})`;
  if (analysis.recursiveCalls > 0 && loopDepth <= 1) time = 'O(2^n)';
  if (analysis.dataStructuresUsed.includes('sorting')) time = `O(n log n)`;

  const usesExtraSpace = analysis.dataStructuresUsed.some(ds => ['hash_map', 'set', 'array', 'queue', 'stack', 'heap'].includes(ds));
  const space = usesExtraSpace ? 'O(n)' : analysis.recursiveCalls > 0 ? 'O(n)' : 'O(1)';

  return { time, space };
}

function addUnique(arr: string[], val: string) {
  if (!arr.includes(val)) arr.push(val);
}

export function analyzeCode(code: string, language: string): ASTAnalysis {
  logger.info(`Analyzing ${language} code (${code.length} chars)`);

  let analysis: AnalyzerResult;
  switch (language.toUpperCase()) {
    case 'PYTHON': analysis = analyzePythonCode(code); break;
    case 'CPP': analysis = analyzeCppCode(code); break;
    case 'JAVA': analysis = analyzeJavaCode(code); break;
    default: analysis = analyzePythonCode(code); break;
  }

  const complexity = estimateComplexity(analysis);
  const primaryPattern = analysis.detectedPatterns[0] || 'unknown';
  const patternDef = ALGORITHM_PATTERNS[primaryPattern];

  // Add TLE warning for high complexity
  if (['O(n²)', 'O(n³)', 'O(2^n)'].includes(complexity.time)) {
    analysis.issues.push({
      type: 'performance', severity: 'warning',
      message: `Current approach is ${complexity.time} which may cause TLE on large inputs`,
    });
  }

  // Check for DP potential
  const dpPotential = analysis.recursiveCalls > 0 && !analysis.dataStructuresUsed.includes('hash_map');

  return {
    language: language.toLowerCase(),
    algorithmPattern: patternDef?.name || primaryPattern,
    detectedPatterns: analysis.detectedPatterns,
    estimatedTimeComplexity: complexity.time,
    estimatedSpaceComplexity: complexity.space,
    issues: analysis.issues,
    optimizationSuggestions: analysis.suggestions,
    recursionDetected: analysis.recursiveCalls > 0,
    dpPotential,
    codeStructure: {
      functions: analysis.functions,
      loops: analysis.loops,
      nestedLoopDepth: analysis.nestedLoopDepth,
      conditionals: analysis.conditionals,
      recursiveCalls: analysis.recursiveCalls,
      dataStructuresUsed: analysis.dataStructuresUsed,
    },
  };
}
