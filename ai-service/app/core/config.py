"""
CodeMentor AI — Python AI Service Configuration
Pydantic Settings with environment variable validation.
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional
from enum import Enum


class LLMProvider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GEMINI = "gemini"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # --- Service ---
    APP_NAME: str = "CodeMentor AI Service"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # --- AI Providers ---
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    DEFAULT_PROVIDER: LLMProvider = LLMProvider.GEMINI
    DEFAULT_MODEL: str = "gemini-2.0-flash"
    FALLBACK_PROVIDER: Optional[LLMProvider] = None
    FALLBACK_MODEL: str = "gemini-2.0-flash"
    MAX_RETRIES: int = 3
    RETRY_DELAY: float = 1.0
    LLM_TIMEOUT: int = 60
    LLM_TEMPERATURE: float = 0.3
    LLM_MAX_TOKENS: int = 2048

    # --- Embeddings ---
    EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"
    EMBEDDING_DIMENSIONS: int = 384

    # --- FAISS ---
    FAISS_INDEX_DIR: str = "./data/faiss_indexes"
    FAISS_PERSIST: bool = True

    # --- Redis ---
    REDIS_URL: str = "redis://localhost:6379"
    CACHE_TTL: int = 3600  # 1 hour

    # --- RAG ---
    RAG_TOP_K: int = 5
    BM25_WEIGHT: float = 0.4
    DENSE_WEIGHT: float = 0.6
    RERANK_ENABLED: bool = True
    RERANK_MODEL: str = "Xenova/ms-marco-MiniLM-L-6-v2"

    # --- Guardrails ---
    MAX_HINT_LEVEL: int = 5
    SOLUTION_LEAKAGE_THRESHOLD: float = 0.8
    PROMPT_INJECTION_CHECK: bool = True

    # --- Knowledge Base ---
    KNOWLEDGE_BASE_DIR: str = "./data/knowledge_base"

    model_config = {
        "env_file": "../../.env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore",
    }


settings = Settings()
