"""
Structured logging and observability for the AI service.
Uses structlog for production-grade JSON logging with context propagation.
"""

import structlog
import logging
import sys
import time
import uuid
from typing import Any
from functools import wraps

from app.core.config import settings


def setup_logging() -> None:
    """Configure structured logging for the application."""

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.StackInfoRenderer(),
            structlog.dev.set_exc_info,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer() if not settings.DEBUG
            else structlog.dev.ConsoleRenderer(colors=True),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            logging.getLevelName(settings.LOG_LEVEL)
        ),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
        cache_logger_on_first_use=True,
    )

    # Suppress noisy third-party loggers
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("openai").setLevel(logging.WARNING)
    logging.getLogger("anthropic").setLevel(logging.WARNING)


def get_logger(name: str = "ai-service") -> structlog.BoundLogger:
    """Get a structured logger instance."""
    return structlog.get_logger(name)


# --- Observability Decorators ---

def log_latency(operation: str):
    """Decorator to log function execution latency."""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            logger = get_logger()
            request_id = str(uuid.uuid4())[:8]
            start = time.perf_counter()
            try:
                result = await func(*args, **kwargs)
                elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
                logger.info(
                    f"{operation} completed",
                    operation=operation,
                    latency_ms=elapsed_ms,
                    request_id=request_id,
                )
                return result
            except Exception as e:
                elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
                logger.error(
                    f"{operation} failed",
                    operation=operation,
                    latency_ms=elapsed_ms,
                    request_id=request_id,
                    error=str(e),
                    error_type=type(e).__name__,
                )
                raise

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            logger = get_logger()
            request_id = str(uuid.uuid4())[:8]
            start = time.perf_counter()
            try:
                result = func(*args, **kwargs)
                elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
                logger.info(
                    f"{operation} completed",
                    operation=operation,
                    latency_ms=elapsed_ms,
                    request_id=request_id,
                )
                return result
            except Exception as e:
                elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
                logger.error(
                    f"{operation} failed",
                    operation=operation,
                    latency_ms=elapsed_ms,
                    request_id=request_id,
                    error=str(e),
                )
                raise

        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    return decorator
