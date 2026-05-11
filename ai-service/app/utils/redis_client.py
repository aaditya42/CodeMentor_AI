"""
Redis client for the AI service.
Used for caching AI results and inter-service communication.
"""

import json
from typing import Optional, TypeVar, Any
import redis.asyncio as aioredis

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("redis")

T = TypeVar("T")

_redis: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    """Get or create async Redis connection."""
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            max_connections=10,
        )
        logger.info("Redis connection established", url=settings.REDIS_URL)
    return _redis


async def cache_get(key: str) -> Optional[Any]:
    """Get a cached value."""
    try:
        r = await get_redis()
        value = await r.get(key)
        if value:
            return json.loads(value)
        return None
    except Exception as e:
        logger.warning(f"Redis cache get error: {e}")
        return None


async def cache_set(key: str, value: Any, ttl: int = None) -> None:
    """Set a cached value with optional TTL."""
    try:
        r = await get_redis()
        ttl = ttl or settings.CACHE_TTL
        await r.set(key, json.dumps(value, default=str), ex=ttl)
    except Exception as e:
        logger.warning(f"Redis cache set error: {e}")


async def cache_delete(key: str) -> None:
    """Delete a cached value."""
    try:
        r = await get_redis()
        await r.delete(key)
    except Exception as e:
        logger.warning(f"Redis cache delete error: {e}")


# Cache key generators
class CacheKeys:
    @staticmethod
    def ast_analysis(code_hash: str) -> str:
        return f"ai:ast:{code_hash}"

    @staticmethod
    def complexity(code_hash: str) -> str:
        return f"ai:complexity:{code_hash}"

    @staticmethod
    def retrieval(query_hash: str) -> str:
        return f"ai:retrieval:{query_hash}"

    @staticmethod
    def hint(problem_id: str, level: int) -> str:
        return f"ai:hint:{problem_id}:{level}"
