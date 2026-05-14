"""
Multi-stage hint generation engine with guardrails and retrieval augmentation.
"""

import json
from typing import AsyncIterator, Optional

from langchain_core.messages import HumanMessage, SystemMessage

from app.prompts.templates import SYSTEM_PROMPT, build_hint_prompt
from app.agents.provider import llm_provider
from app.agents.guardrails import detect_prompt_injection, detect_solution_leakage, sanitize_user_input
from app.analysis.ast_analyzer import analyze_code
from app.analysis.complexity import analyze_complexity
from app.rag.hybrid import hybrid_search
from app.models.schemas import GenerateHintRequest, HintResponse, ASTAnalysisResult
from app.core.logging import get_logger, log_latency

logger = get_logger("hint-generator")


@log_latency("generate_hint")
async def generate_hint(request: GenerateHintRequest) -> HintResponse:
    """
    Generate a progressive hint with full pipeline:
    1. Guardrail check on user input
    2. AST analysis of user code
    3. Complexity analysis
    4. RAG context retrieval
    5. Prompt construction
    6. LLM generation
    7. Post-generation leakage check
    """

    # Step 1: Guardrail — prompt injection check
    if request.user_message:
        is_injection, pattern = detect_prompt_injection(request.user_message)
        if is_injection:
            return HintResponse(
                content="I can only help with coding problems. Please ask a question about your code.",
                hint_level=request.hint_level.value,
                metadata={"blocked": True, "reason": "prompt_injection"},
            )
        request.user_message = sanitize_user_input(request.user_message)

    # Step 2: AST analysis
    ast_result = None
    ast_str = None
    if not request.ast_analysis:
        ast_result = analyze_code(request.code, request.language.value)
        ast_str = json.dumps(ast_result.model_dump(), indent=2)
    else:
        ast_result = request.ast_analysis
        ast_str = json.dumps(ast_result.model_dump(), indent=2)

    # Step 3: Complexity analysis
    complexity_result = await analyze_complexity(request.code, request.language.value)
    complexity_str = json.dumps(complexity_result.model_dump(), indent=2)

    # Step 4: RAG retrieval
    retrieval_query = f"{request.problem_title} {request.problem_description[:200]}"
    rag_results = hybrid_search(
        query=retrieval_query,
        top_k=5,
        topics=None,
    )
    retrieval_context = [r.content for r in rag_results]

    # Step 5: Build prompt
    prompt = build_hint_prompt(
        hint_level=request.hint_level.value,
        problem_title=request.problem_title,
        problem_description=request.problem_description,
        user_code=request.code,
        language=request.language.value,
        ast_analysis=ast_str,
        complexity_analysis=complexity_str,
        retrieval_context=retrieval_context,
        conversation_history=request.conversation_history,
        user_message=request.user_message,
    )

    # Step 6: Generate with LLM
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=prompt),
    ]

    hint_content = await llm_provider.invoke(
        messages,
        temperature=0.4,
        max_tokens=1500,
    )

    # Step 7: Post-generation leakage check
    is_leaking, confidence, reason = detect_solution_leakage(
        hint_content=hint_content,
        hint_level=request.hint_level.value,
    )

    if is_leaking:
        logger.warning("Regenerating hint due to solution leakage", confidence=confidence)
        # Retry with stricter prompt
        strict_messages = [
            SystemMessage(content=SYSTEM_PROMPT + "\n\nCRITICAL: Your previous response leaked too much of the solution. Be more concise and hint-oriented."),
            HumanMessage(content=prompt),
        ]
        hint_content = await llm_provider.invoke(strict_messages, temperature=0.2, max_tokens=1000)

    return HintResponse(
        content=hint_content,
        hint_level=request.hint_level.value,
        metadata={
            "ast_pattern": ast_result.algorithm_pattern if ast_result else "unknown",
            "time_complexity": complexity_result.time_complexity,
            "retrieval_docs": len(retrieval_context),
            "leakage_checked": True,
            "leakage_score": confidence if is_leaking else 0.0,
        },
    )


async def generate_hint_stream(request: GenerateHintRequest) -> AsyncIterator[str]:
    """
    Stream hint generation token by token.
    Runs guardrails and analysis first, then streams LLM output.
    """

    # Guardrail check
    if request.user_message:
        is_injection, _ = detect_prompt_injection(request.user_message)
        if is_injection:
            yield json.dumps({"type": "error", "message": "Prompt injection detected"})
            return

    # Analysis (non-streaming)
    ast_result = analyze_code(request.code, request.language.value)
    ast_str = json.dumps(ast_result.model_dump(), indent=2)

    # Send analysis event
    yield json.dumps({"type": "analysis", "data": ast_result.model_dump()})

    complexity_result = await analyze_complexity(request.code, request.language.value)
    yield json.dumps({"type": "complexity", "data": complexity_result.model_dump()})

    # RAG
    rag_results = hybrid_search(query=f"{request.problem_title}", top_k=5)
    retrieval_context = [r.content for r in rag_results]

    # Build prompt
    prompt = build_hint_prompt(
        hint_level=request.hint_level.value,
        problem_title=request.problem_title,
        problem_description=request.problem_description,
        user_code=request.code,
        language=request.language.value,
        ast_analysis=ast_str,
        complexity_analysis=json.dumps(complexity_result.model_dump(), indent=2),
        retrieval_context=retrieval_context,
        conversation_history=request.conversation_history,
        user_message=request.user_message,
    )

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=prompt),
    ]

    # Stream hint start
    yield json.dumps({"type": "hint_start", "hint_level": request.hint_level.value})

    # Stream LLM tokens
    async for chunk in llm_provider.stream(messages, temperature=0.4, max_tokens=1500):
        if chunk == "__PROVIDER_FALLBACK__":
            yield json.dumps({"type": "provider_status", "content": "Switching AI provider..."})
        else:
            yield json.dumps({"type": "hint_chunk", "content": chunk})

    yield json.dumps({"type": "hint_complete"})
