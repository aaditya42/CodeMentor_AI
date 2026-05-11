"""
Versioned API routes for the AI service (v1).
All endpoints are prefixed with /api/v1/.
"""

import time
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.models.schemas import (
    AnalyzeCodeRequest, AnalyzeCodeResponse,
    ComplexityRequest, ComplexityResponse,
    GenerateHintRequest, HintResponse,
    RetrieveContextRequest, RetrieveContextResponse,
    EvaluateHintRequest, EvaluateHintResponse,
    IngestDocumentsRequest,
    ErrorResponse,
)
from app.analysis.ast_analyzer import analyze_code
from app.analysis.complexity import analyze_complexity
from app.prompts.hint_generator import generate_hint, generate_hint_stream
from app.rag.hybrid import hybrid_search
from app.rag.knowledge_base import ingest_documents
from app.evaluation.pipeline import evaluate_hint
from app.core.logging import get_logger

logger = get_logger("api-v1")

router = APIRouter(prefix="/api/v1", tags=["AI Service v1"])


@router.post("/analyze-code", response_model=AnalyzeCodeResponse)
async def analyze_code_endpoint(request: AnalyzeCodeRequest):
    """Perform AST-based code analysis."""
    try:
        result = analyze_code(request.code, request.language.value)
        return AnalyzeCodeResponse(analysis=result)
    except Exception as e:
        logger.error("Code analysis failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/complexity-analysis", response_model=ComplexityResponse)
async def complexity_analysis_endpoint(request: ComplexityRequest):
    """Perform hybrid complexity analysis."""
    try:
        result = await analyze_complexity(
            request.code,
            request.language.value,
            use_llm=request.use_llm,
        )
        return ComplexityResponse(analysis=result)
    except Exception as e:
        logger.error("Complexity analysis failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-hint", response_model=HintResponse)
async def generate_hint_endpoint(request: GenerateHintRequest):
    """Generate a progressive coding hint."""
    if request.stream:
        # Return SSE stream
        return StreamingResponse(
            _stream_wrapper(request),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    try:
        result = await generate_hint(request)
        return result
    except Exception as e:
        logger.error("Hint generation failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


async def _stream_wrapper(request: GenerateHintRequest):
    """Wrap streaming hint generation for SSE."""
    try:
        async for chunk in generate_hint_stream(request):
            yield f"data: {chunk}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"


@router.post("/retrieve-context", response_model=RetrieveContextResponse)
async def retrieve_context_endpoint(request: RetrieveContextRequest):
    """Retrieve relevant context from knowledge base."""
    start = time.perf_counter()
    try:
        results = hybrid_search(
            query=request.query,
            top_k=request.top_k,
            difficulty=request.difficulty.value if request.difficulty else None,
            topics=request.topics,
            doc_type=request.doc_type,
        )
        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        return RetrieveContextResponse(results=results, latency_ms=latency_ms)
    except Exception as e:
        logger.error("Retrieval failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/evaluate-hint", response_model=EvaluateHintResponse)
async def evaluate_hint_endpoint(request: EvaluateHintRequest):
    """Evaluate hint quality using LLM-as-judge."""
    try:
        result = await evaluate_hint(request)
        return EvaluateHintResponse(evaluation=result)
    except Exception as e:
        logger.error("Evaluation failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ingest-documents")
async def ingest_documents_endpoint(request: IngestDocumentsRequest):
    """Ingest new documents into the knowledge base."""
    try:
        docs = [doc.model_dump() for doc in request.documents]
        count = ingest_documents(docs, rebuild=request.rebuild_index)
        return {"success": True, "ingested": count}
    except Exception as e:
        logger.error("Ingestion failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
