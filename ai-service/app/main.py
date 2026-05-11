"""
CodeMentor AI — Python AI Service
FastAPI application entry point.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time

from app.core.config import settings
from app.core.logging import setup_logging, get_logger
from app.api.v1.routes import router as v1_router
from app.rag.knowledge_base import initialize_knowledge_base
from app.rag.faiss_store import faiss_store
from app.agents.provider import llm_provider
from app.models.schemas import HealthResponse

# Setup logging before anything else
setup_logging()
logger = get_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    # Startup
    logger.info("Starting CodeMentor AI Service", version=settings.APP_VERSION)
    logger.info("Providers configured", providers=llm_provider.available_providers)

    # Initialize knowledge base
    try:
        initialize_knowledge_base()
        logger.info("Knowledge base ready")
    except Exception as e:
        logger.error(f"Knowledge base initialization failed: {e}")

    yield

    # Shutdown
    logger.info("Shutting down CodeMentor AI Service")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered code analysis, hint generation, and evaluation service",
    lifespan=lifespan,
)

# --- Middleware ---

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    """Log all requests with timing."""
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

    logger.info(
        "Request processed",
        method=request.method,
        path=request.url.path,
        status=response.status_code,
        latency_ms=elapsed_ms,
    )
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler."""
    logger.error("Unhandled exception", error=str(exc), path=request.url.path)
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": str(exc)},
    )


# --- Routes ---

app.include_router(v1_router)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        version=settings.APP_VERSION,
        providers=llm_provider.available_providers,
        faiss_loaded=faiss_store.is_loaded,
        knowledge_docs=faiss_store.num_documents,
    )


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
    }
