"""
Hybrid complexity analysis engine.
Combines static AST-based estimation with optional LLM-based reasoning.
"""

from typing import Optional
from langchain_core.messages import HumanMessage, SystemMessage

from app.analysis.ast_analyzer import analyze_code
from app.models.schemas import ComplexityAnalysisResult, ComplexitySuggestion
from app.agents.provider import llm_provider
from app.core.logging import get_logger, log_latency

logger = get_logger("complexity")

OPTIMIZATION_MAP: dict[str, list[dict]] = {
    "O(n²)": [
        {"from": "O(n²)", "to": "O(n)", "technique": "Hash Map", "description": "Use hash map for O(1) lookups instead of nested iteration"},
        {"from": "O(n²)", "to": "O(n log n)", "technique": "Sorting + Two Pointers", "description": "Sort first, then use two pointers"},
        {"from": "O(n²)", "to": "O(n)", "technique": "Sliding Window", "description": "Use sliding window for contiguous subarray problems"},
    ],
    "O(n³)": [
        {"from": "O(n³)", "to": "O(n²)", "technique": "DP Optimization", "description": "Reduce one loop dimension with dynamic programming"},
        {"from": "O(n³)", "to": "O(n² log n)", "technique": "Binary Search", "description": "Replace innermost loop with binary search"},
    ],
    "O(2^n)": [
        {"from": "O(2^n)", "to": "O(n·2^(n/2))", "technique": "Meet in the Middle", "description": "Split search space and combine results"},
        {"from": "O(2^n)", "to": "O(n²)", "technique": "Memoization/DP", "description": "Cache overlapping subproblem results with memoization"},
    ],
}

LLM_COMPLEXITY_PROMPT = """Analyze the following code and provide precise time and space complexity analysis.

Language: {language}
Code:
```
{code}
```

Static analysis estimates: Time={static_time}, Space={static_space}

Provide a brief but precise analysis of:
1. Exact time complexity with justification
2. Exact space complexity with justification
3. Whether TLE is likely for n > 10^5
4. Any optimizations possible

Keep your response under 200 words. Be precise and technical."""


@log_latency("complexity_analysis")
async def analyze_complexity(
    code: str,
    language: str,
    use_llm: bool = False,
) -> ComplexityAnalysisResult:
    """
    Hybrid complexity analysis combining static AST analysis
    with optional LLM-based reasoning for nuanced estimates.
    """
    # Step 1: Static analysis
    ast = analyze_code(code, language)

    is_tle_prone = ast.estimated_time_complexity in ("O(n²)", "O(n³)", "O(2^n)")

    redundant = []
    if ast.recursion_detected and "dynamic_programming" not in ast.detected_patterns:
        redundant.append("Recursive calls without memoization — likely recomputing subproblems")
    if ast.code_structure.nested_loop_depth >= 2 and "hash_map" not in ast.code_structure.data_structures_used:
        redundant.append("Nested loops performing repeated linear scans — consider hash-based lookup")
    if "sorting" in ast.code_structure.data_structures_used and ast.code_structure.nested_loop_depth >= 2:
        redundant.append("Sorting inside a loop — move sort outside if data is unchanged")

    raw_suggestions = OPTIMIZATION_MAP.get(ast.estimated_time_complexity, [])
    suggestions = [
        ComplexitySuggestion(**{**s, "from": s["from"], "to": s["to"]})
        for s in raw_suggestions
    ]

    # Step 2: Optional LLM augmentation
    llm_analysis = None
    if use_llm:
        try:
            prompt = LLM_COMPLEXITY_PROMPT.format(
                language=language,
                code=code[:3000],  # Truncate for token limits
                static_time=ast.estimated_time_complexity,
                static_space=ast.estimated_space_complexity,
            )
            llm_analysis = await llm_provider.invoke(
                [
                    SystemMessage(content="You are a algorithms complexity expert. Be precise."),
                    HumanMessage(content=prompt),
                ],
                temperature=0.1,
                max_tokens=500,
            )
            logger.info("LLM complexity analysis completed")
        except Exception as e:
            logger.warning(f"LLM complexity analysis failed: {e}")

    return ComplexityAnalysisResult(
        time_complexity=ast.estimated_time_complexity,
        space_complexity=ast.estimated_space_complexity,
        is_tle_prone=is_tle_prone,
        redundant_computations=redundant,
        suggestions=suggestions,
        llm_analysis=llm_analysis,
    )
