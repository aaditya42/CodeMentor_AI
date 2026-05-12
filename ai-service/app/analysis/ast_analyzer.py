"""
AST-based code analyzer using Tree-sitter.
Performs deep structural analysis of Python, C++, and Java code.
Falls back to regex-based analysis if tree-sitter grammars are unavailable.
"""

import re
from typing import Optional
from dataclasses import dataclass, field

from app.analysis.patterns import ALGORITHM_PATTERNS, DS_KEYWORDS
from app.models.schemas import (
    ASTAnalysisResult, ASTIssue, OptimizationSuggestion, CodeStructure
)
from app.core.logging import get_logger, log_latency

logger = get_logger("ast-analyzer")

# Try to load tree-sitter; fall back to regex if unavailable
_TREE_SITTER_AVAILABLE = False
try:
    import tree_sitter_python
    import tree_sitter_cpp
    import tree_sitter_java
    from tree_sitter import Language, Parser

    PY_LANGUAGE = Language(tree_sitter_python.language())
    CPP_LANGUAGE = Language(tree_sitter_cpp.language())
    JAVA_LANGUAGE = Language(tree_sitter_java.language())
    _TREE_SITTER_AVAILABLE = True
    logger.info("Tree-sitter loaded successfully")
except ImportError:
    logger.warning("Tree-sitter not available — using regex fallback")


LANGUAGE_MAP = {}
if _TREE_SITTER_AVAILABLE:
    LANGUAGE_MAP = {
        "PYTHON": PY_LANGUAGE,
        "CPP": CPP_LANGUAGE,
        "JAVA": JAVA_LANGUAGE,
    }


@dataclass
class AnalysisAccumulator:
    """Mutable accumulator for analysis pass."""
    functions: int = 0
    loops: int = 0
    nested_loop_depth: int = 0
    conditionals: int = 0
    recursive_calls: int = 0
    data_structures: list[str] = field(default_factory=list)
    detected_patterns: list[str] = field(default_factory=list)
    issues: list[ASTIssue] = field(default_factory=list)
    suggestions: list[OptimizationSuggestion] = field(default_factory=list)
    func_names: list[str] = field(default_factory=list)


def _add_unique(lst: list[str], val: str):
    if val not in lst:
        lst.append(val)


# ============================================
# Tree-sitter based analysis
# ============================================

def _analyze_tree_sitter(code: str, language: str) -> AnalysisAccumulator:
    """Analyze code using tree-sitter AST."""
    acc = AnalysisAccumulator()
    lang = LANGUAGE_MAP.get(language.upper())
    if not lang:
        return _analyze_regex(code, language)

    parser = Parser()
    parser.language = lang
    tree = parser.parse(bytes(code, "utf-8"))
    root = tree.root_node

    _walk_node(root, acc, code, language.upper(), depth=0, loop_depth=0)
    return acc


def _walk_node(node, acc: AnalysisAccumulator, code: str, language: str,
               depth: int, loop_depth: int):
    """Recursively walk AST nodes to extract structural information."""
    ntype = node.type

    # --- Function definitions ---
    if ntype in ("function_definition", "method_declaration", "function_declarator"):
        acc.functions += 1
        # Extract function name
        for child in node.children:
            if child.type in ("identifier", "name"):
                acc.func_names.append(child.text.decode("utf-8"))
                break

    # --- Loops ---
    if ntype in ("for_statement", "while_statement", "for_in_clause",
                 "enhanced_for_statement", "do_statement"):
        acc.loops += 1
        new_loop_depth = loop_depth + 1
        acc.nested_loop_depth = max(acc.nested_loop_depth, new_loop_depth)
        # Recurse into children with increased loop depth
        for child in node.children:
            _walk_node(child, acc, code, language, depth + 1, new_loop_depth)
        return  # Already recursed

    # --- Conditionals ---
    if ntype in ("if_statement", "elif_clause", "else_clause",
                 "conditional_expression", "ternary_expression"):
        acc.conditionals += 1

    # --- Function calls (recursion detection) ---
    if ntype in ("call", "call_expression", "method_invocation"):
        for child in node.children:
            if child.type in ("identifier", "name"):
                called_name = child.text.decode("utf-8")
                if called_name in acc.func_names:
                    acc.recursive_calls += 1
                break

    # Recurse into children
    for child in node.children:
        _walk_node(child, acc, code, language, depth + 1, loop_depth)


# ============================================
# Regex fallback analysis
# ============================================

def _analyze_regex(code: str, language: str) -> AnalysisAccumulator:
    """Fallback regex-based analysis when tree-sitter is unavailable."""
    acc = AnalysisAccumulator()
    lines = code.split("\n")
    lang_upper = language.upper()

    # Detect functions
    if lang_upper == "PYTHON":
        for line in lines:
            m = re.match(r"^\s*def\s+(\w+)", line)
            if m:
                acc.functions += 1
                acc.func_names.append(m.group(1))
    elif lang_upper in ("CPP", "JAVA"):
        for line in lines:
            m = re.match(r"(?:public|private|protected|static|void|int|bool|string|vector|auto|long|double)\s+(\w+)\s*\(", line.strip())
            if m and ";" not in line:
                acc.functions += 1
                acc.func_names.append(m.group(1))

    # Detect loops and nesting
    brace_depth = 0
    loop_depths: list[int] = []
    for line in lines:
        stripped = line.strip()

        if lang_upper == "PYTHON":
            if re.match(r"^(for|while)\s", stripped):
                acc.loops += 1
                indent = len(line) - len(line.lstrip())
                loop_depths.append(indent)
        else:
            for ch in stripped:
                if ch == "{":
                    brace_depth += 1
                elif ch == "}":
                    brace_depth -= 1
            if re.match(r"(for|while)\s*\(", stripped):
                acc.loops += 1
                loop_depths.append(brace_depth)

    # Estimate nesting from loop depths
    if loop_depths:
        if lang_upper == "PYTHON":
            # Count distinct indent levels
            sorted_depths = sorted(set(loop_depths))
            acc.nested_loop_depth = len(sorted_depths)
        else:
            prev = -1
            depth = 0
            max_depth = 0
            for d in loop_depths:
                if d > prev:
                    depth += 1
                else:
                    depth = 1
                max_depth = max(max_depth, depth)
                prev = d
            acc.nested_loop_depth = max_depth

    # Conditionals
    for line in lines:
        stripped = line.strip()
        if lang_upper == "PYTHON":
            if re.match(r"^(if|elif|else)\s", stripped):
                acc.conditionals += 1
        else:
            if re.match(r"if\s*\(", stripped):
                acc.conditionals += 1

    # Recursion
    for line in lines:
        stripped = line.strip()
        for fn in acc.func_names:
            if f"{fn}(" in stripped and not stripped.startswith(("def ", "void ", "int ", "public ")):
                acc.recursive_calls += 1

    return acc


# ============================================
# Data structure detection
# ============================================

def _detect_data_structures(code: str, language: str, acc: AnalysisAccumulator):
    """Detect data structures used in code via keyword matching."""
    lang_upper = language.upper()
    keywords = DS_KEYWORDS.get(lang_upper, DS_KEYWORDS.get("PYTHON", {}))

    for ds_name, ds_keywords in keywords.items():
        for kw in ds_keywords:
            if kw in code:
                _add_unique(acc.data_structures, ds_name)
                break


# ============================================
# Pattern detection
# ============================================

def _detect_patterns(code: str, acc: AnalysisAccumulator):
    """Detect algorithmic patterns from structural analysis."""
    # Brute force: nested loops without hash map
    if acc.nested_loop_depth >= 2 and "hash_map" not in acc.data_structures:
        _add_unique(acc.detected_patterns, "brute_force")
        acc.suggestions.append(OptimizationSuggestion(
            strategy="hash_map",
            expected_complexity="O(n)",
            description="Use hash map for O(1) lookups instead of nested loops",
        ))

    # Hash map pattern
    if "hash_map" in acc.data_structures and acc.nested_loop_depth <= 1:
        _add_unique(acc.detected_patterns, "hash_map")

    # DP vs backtracking
    if acc.recursive_calls > 0:
        if "hash_map" in acc.data_structures:
            _add_unique(acc.detected_patterns, "dynamic_programming")
        else:
            _add_unique(acc.detected_patterns, "backtracking")
            acc.suggestions.append(OptimizationSuggestion(
                strategy="memoization",
                expected_complexity="O(n)",
                description="Add memoization to avoid recomputing overlapping subproblems",
            ))

    # BFS
    if "queue" in acc.data_structures:
        _add_unique(acc.detected_patterns, "graph_bfs")

    # Heap
    if "heap" in acc.data_structures:
        _add_unique(acc.detected_patterns, "heap_priority_queue")

    # Sorting
    if "sorting" in acc.data_structures:
        _add_unique(acc.detected_patterns, "sorting")

    # Binary search
    if "low" in code and "high" in code and "mid" in code:
        _add_unique(acc.detected_patterns, "binary_search")

    # Two pointers
    if ("left" in code and "right" in code) or \
       (re.search(r"while.*<", code) and "i" in code and "j" in code):
        _add_unique(acc.detected_patterns, "two_pointers")

    # Sliding window heuristic
    if re.search(r"(window|start|end).*while", code, re.IGNORECASE):
        _add_unique(acc.detected_patterns, "sliding_window")

    if not acc.detected_patterns:
        _add_unique(acc.detected_patterns, "linear_scan")


# ============================================
# Bug detection
# ============================================

def _detect_bugs(code: str, language: str, acc: AnalysisAccumulator):
    """Detect common bug patterns."""
    lines = code.split("\n")
    lang_upper = language.upper()

    # Empty input check
    has_empty_check = any(
        re.search(r"len\(|\.length|\.size\(\)|\.isEmpty|not\s+\w+|==\s*\[\]|is\s+None|== null|\.empty\(\)", line)
        for line in lines
    )
    if not has_empty_check and acc.functions > 0:
        acc.issues.append(ASTIssue(
            type="edge_case", severity="warning",
            message="No check for empty input detected",
        ))

    # Missing base case in recursion
    if acc.recursive_calls > 0:
        has_return_in_if = any(
            re.search(r"(if|return).*\b(return|0|1|None|null|true|false)\b", line)
            for line in lines
        )
        if not has_return_in_if:
            acc.issues.append(ASTIssue(
                type="bug", severity="error",
                message="Recursive function may be missing a base case",
            ))

    # Array bounds
    if lang_upper in ("CPP", "JAVA"):
        for i, line in enumerate(lines):
            if re.search(r"\[.*-\s*1\]", line):
                nearby = "\n".join(lines[max(0, i - 3):i])
                if not re.search(r"\.size\(\)|\.length", nearby):
                    acc.issues.append(ASTIssue(
                        type="edge_case", severity="warning",
                        message="Array access with -1 offset without bounds check",
                        line=i + 1,
                    ))

    # Integer overflow risk (C++/Java)
    if lang_upper in ("CPP", "JAVA"):
        if re.search(r"\bint\b.*\*.*\bint\b|\bint\b.+=.*\*", code):
            acc.issues.append(ASTIssue(
                type="bug", severity="warning",
                message="Potential integer overflow in multiplication — consider using long",
            ))


# ============================================
# Complexity estimation
# ============================================

def _estimate_complexity(acc: AnalysisAccumulator) -> tuple[str, str]:
    """Estimate time and space complexity from analysis."""
    # Time complexity
    if "binary_search" in acc.detected_patterns:
        time_c = "O(log n)"
    elif "dynamic_programming" in acc.detected_patterns:
        time_c = "O(n²)"
    elif "sorting" in acc.data_structures:
        time_c = "O(n log n)"
    elif acc.recursive_calls > 0 and acc.nested_loop_depth <= 1:
        time_c = "O(2^n)"
    elif acc.nested_loop_depth >= 4:
        time_c = f"O(n^{acc.nested_loop_depth})"
    elif acc.nested_loop_depth == 3:
        time_c = "O(n³)"
    elif acc.nested_loop_depth == 2:
        time_c = "O(n²)"
    elif acc.nested_loop_depth == 1 or acc.loops > 0:
        time_c = "O(n)"
    else:
        time_c = "O(1)"

    # Space complexity
    extra_space = any(
        ds in acc.data_structures
        for ds in ["hash_map", "set", "array", "queue", "stack", "heap"]
    )
    if extra_space:
        space_c = "O(n)"
    elif acc.recursive_calls > 0:
        space_c = "O(n)"  # Call stack
    else:
        space_c = "O(1)"

    return time_c, space_c


# ============================================
# Public API
# ============================================

@log_latency("ast_analysis")
def analyze_code(code: str, language: str) -> ASTAnalysisResult:
    """
    Perform complete AST-based analysis of user code.
    Uses tree-sitter when available, regex fallback otherwise.
    """
    logger.info("Analyzing code", language=language, code_length=len(code))

    # Parse and walk
    if _TREE_SITTER_AVAILABLE and language.upper() in LANGUAGE_MAP:
        acc = _analyze_tree_sitter(code, language)
    else:
        acc = _analyze_regex(code, language)

    # Detect data structures, patterns, and bugs
    _detect_data_structures(code, language, acc)
    _detect_patterns(code, acc)
    _detect_bugs(code, language, acc)

    # Estimate complexity
    time_c, space_c = _estimate_complexity(acc)

    # TLE warning
    if time_c in ("O(n²)", "O(n³)", "O(2^n)"):
        acc.issues.append(ASTIssue(
            type="performance", severity="warning",
            message=f"Current approach is {time_c} which may cause TLE on large inputs",
        ))

    dp_potential = acc.recursive_calls > 0 and "hash_map" not in acc.data_structures
    primary_pattern = acc.detected_patterns[0] if acc.detected_patterns else "unknown"
    pattern_def = ALGORITHM_PATTERNS.get(primary_pattern, {})

    return ASTAnalysisResult(
        language=language.lower(),
        algorithm_pattern=pattern_def.get("name", primary_pattern),
        detected_patterns=acc.detected_patterns,
        estimated_time_complexity=time_c,
        estimated_space_complexity=space_c,
        issues=acc.issues,
        optimization_suggestions=acc.suggestions,
        recursion_detected=acc.recursive_calls > 0,
        dp_potential=dp_potential,
        code_structure=CodeStructure(
            functions=acc.functions,
            loops=acc.loops,
            nested_loop_depth=acc.nested_loop_depth,
            conditionals=acc.conditionals,
            recursive_calls=acc.recursive_calls,
            data_structures_used=acc.data_structures,
        ),
    )
