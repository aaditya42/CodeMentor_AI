"""
Hint evaluation pipeline using LLM-as-judge.
Assesses hint quality for relevance, hallucination, and solution leakage.
"""

import json
from langchain_core.messages import HumanMessage, SystemMessage

from app.agents.provider import llm_provider
from app.prompts.templates import EVALUATION_PROMPT
from app.models.schemas import EvaluateHintRequest, EvaluationResult
from app.core.logging import get_logger, log_latency

logger = get_logger("evaluation")


@log_latency("evaluate_hint")
async def evaluate_hint(request: EvaluateHintRequest) -> EvaluationResult:
    """
    Evaluate a generated hint using LLM-as-judge pattern.
    Returns structured evaluation metrics.
    """
    try:
        prompt = EVALUATION_PROMPT.format(
            hint=request.hint_content,
            problem=request.problem_description,
            code=request.user_code[:2000],
            level=request.hint_level,
        )

        response = await llm_provider.invoke(
            [
                SystemMessage(content="You are an expert evaluator. Respond only with valid JSON."),
                HumanMessage(content=prompt),
            ],
            temperature=0.0,
            max_tokens=500,
        )

        # Parse JSON from response
        json_match = None
        try:
            # Try direct parse first
            result = json.loads(response)
            json_match = result
        except json.JSONDecodeError:
            # Extract JSON block
            import re
            match = re.search(r"\{[\s\S]*\}", response)
            if match:
                json_match = json.loads(match.group())

        if not json_match:
            logger.warning("Evaluation response was not valid JSON")
            return _default_evaluation()

        return EvaluationResult(
            relevance_score=float(json_match.get("relevanceScore", 0.5)),
            hallucination=bool(json_match.get("hallucination", False)),
            solution_leakage=bool(json_match.get("solutionLeakage", False)),
            pedagogical_quality=float(json_match.get("pedagogicalQuality", 0.5)),
            reasoning=str(json_match.get("reasoning", "")),
        )

    except Exception as e:
        logger.error(f"Evaluation failed: {e}")
        return _default_evaluation()


def _default_evaluation() -> EvaluationResult:
    return EvaluationResult(
        relevance_score=0.5,
        hallucination=False,
        solution_leakage=False,
        pedagogical_quality=0.5,
        reasoning="Evaluation could not be completed",
    )
