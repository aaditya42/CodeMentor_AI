"""
AI Guardrails — Solution leakage prevention and prompt injection detection.
These run as pre/post-processing stages on every hint generation request.
"""

import re
from typing import Optional
from app.core.logging import get_logger
from app.core.config import settings

logger = get_logger("guardrails")


# --- Prompt Injection Detection ---

INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?previous\s+instructions",
    r"ignore\s+(all\s+)?above",
    r"disregard\s+(all\s+)?previous",
    r"forget\s+(all\s+)?(your|the)\s+instructions",
    r"you\s+are\s+now\s+",
    r"act\s+as\s+(if\s+)?you",
    r"pretend\s+(you\s+are|to\s+be)",
    r"new\s+instruction[s]?:",
    r"system\s*prompt\s*:",
    r"jailbreak",
    r"DAN\s+mode",
    r"developer\s+mode",
    r"override\s+(safety|content)\s+",
    r"\[system\]",
    r"<\|im_start\|>",
    r"<\|system\|>",
]

COMPILED_INJECTION_PATTERNS = [re.compile(p, re.IGNORECASE) for p in INJECTION_PATTERNS]


def detect_prompt_injection(text: str) -> tuple[bool, Optional[str]]:
    """
    Check user input for prompt injection attempts.
    Returns (is_injection, matched_pattern).
    """
    if not settings.PROMPT_INJECTION_CHECK:
        return False, None

    for pattern in COMPILED_INJECTION_PATTERNS:
        match = pattern.search(text)
        if match:
            logger.warning(
                "Prompt injection detected",
                matched_pattern=match.group(),
                text_preview=text[:100],
            )
            return True, match.group()

    return False, None


# --- Solution Leakage Detection ---

SOLUTION_INDICATORS = [
    r"here\s+is\s+the\s+(complete|full|final)\s+(solution|answer|code|implementation)",
    r"the\s+(complete|full)\s+(solution|implementation)\s+is",
    r"```\w*\n.{200,}```",  # Large code blocks (>200 chars) might be full solutions
    r"def\s+\w+\(.*\):\n(\s+.+\n){10,}",  # Python functions with 10+ lines
    r"(public|private)\s+\w+\s+\w+\(.*\)\s*\{[\s\S]{300,}\}",  # Java/C++ full methods
]

COMPILED_SOLUTION_PATTERNS = [re.compile(p, re.IGNORECASE | re.MULTILINE) for p in SOLUTION_INDICATORS]


def detect_solution_leakage(
    hint_content: str,
    hint_level: int,
    explicitly_requested: bool = False,
) -> tuple[bool, float, str]:
    """
    Detect if a generated hint leaks the complete solution.
    Returns (is_leaking, confidence_score, reason).

    Solution leakage is acceptable at level 5 if explicitly requested.
    """
    if hint_level >= 5 and explicitly_requested:
        return False, 0.0, "Level 5 with explicit request — solution allowed"

    score = 0.0
    reasons = []

    # Check for solution indicator phrases
    for pattern in COMPILED_SOLUTION_PATTERNS:
        if pattern.search(hint_content):
            score += 0.3
            reasons.append("Contains solution indicator phrase")

    # Check code block length — long code blocks at low hint levels are suspicious
    code_blocks = re.findall(r"```\w*\n(.*?)```", hint_content, re.DOTALL)
    for block in code_blocks:
        lines = [l for l in block.strip().split("\n") if l.strip()]
        if len(lines) > 15 and hint_level <= 3:
            score += 0.4
            reasons.append(f"Code block with {len(lines)} lines at hint level {hint_level}")
        elif len(lines) > 8 and hint_level <= 2:
            score += 0.3
            reasons.append(f"Code block with {len(lines)} lines at hint level {hint_level}")

    # Check hint length relative to level — very long hints at low levels are suspicious
    word_count = len(hint_content.split())
    if hint_level == 1 and word_count > 200:
        score += 0.2
        reasons.append(f"Hint level 1 with {word_count} words (too verbose)")
    elif hint_level == 2 and word_count > 400:
        score += 0.15
        reasons.append(f"Hint level 2 with {word_count} words (too verbose)")

    is_leaking = score >= settings.SOLUTION_LEAKAGE_THRESHOLD
    reason = "; ".join(reasons) if reasons else "No leakage detected"

    if is_leaking:
        logger.warning(
            "Solution leakage detected",
            hint_level=hint_level,
            confidence=score,
            reason=reason,
        )

    return is_leaking, min(score, 1.0), reason


def sanitize_user_input(text: str) -> str:
    """
    Sanitize user input by removing potential injection markers
    while preserving legitimate code content.
    """
    # Remove common injection framing
    cleaned = re.sub(r"<\|[^|]+\|>", "", text)
    cleaned = re.sub(r"\[/?system\]", "", cleaned, flags=re.IGNORECASE)

    # Limit total length
    max_len = 50000
    if len(cleaned) > max_len:
        cleaned = cleaned[:max_len]
        logger.info("User input truncated to max length", original_len=len(text))

    return cleaned
