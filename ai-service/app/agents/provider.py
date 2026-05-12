"""
LLM Provider abstraction with retry logic and automatic failover.
Supports Google Gemini.
"""

from typing import AsyncIterator, Optional, Any
from langchain_core.messages import BaseMessage
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

import google.generativeai as genai

from app.core.config import settings, LLMProvider
from app.core.logging import get_logger, log_latency

logger = get_logger("llm-provider")


class LLMProviderManager:
    """
    Manages LLM provider instances with automatic failover.
    Primary provider → Fallback provider on failure.
    """

    def __init__(self):
        self._models: dict[str, Any] = {}
        self._initialize_providers()

    def _initialize_providers(self):
        """Initialize all configured LLM providers."""
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self._models["gemini"] = genai.GenerativeModel("gemini-2.0-flash")
            logger.info("Gemini provider initialized")

        if not self._models:
            logger.warning("No LLM providers configured — AI features will be unavailable")

    def get_model(
        self,
        provider: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        streaming: bool = False,
    ) -> Any:
        """Get a configured LLM model instance."""
        provider_name = provider or settings.DEFAULT_PROVIDER.value

        if provider_name not in self._models:
            if self._models:
                provider_name = next(iter(self._models))
                logger.warning(f"Requested provider unavailable, falling back to {provider_name}")
            else:
                raise RuntimeError("No LLM providers configured")

        return self._models[provider_name]

    @log_latency("llm_invoke")
    async def invoke(
        self,
        messages: list[BaseMessage],
        provider: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        """
        Invoke LLM with automatic failover.
        Tries primary provider first, falls back on failure.
        """
        primary = provider or settings.DEFAULT_PROVIDER.value
        return await self._invoke_provider(primary, messages, temperature, max_tokens)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type((TimeoutError, ConnectionError)),
    )
    async def _invoke_provider(
        self,
        provider: str,
        messages: list[BaseMessage],
        temperature: Optional[float],
        max_tokens: Optional[int],
    ) -> str:
        """Invoke a specific provider with retry logic."""
        model = self.get_model(provider, temperature, max_tokens)
        
        prompt = "\\n\\n".join([str(m.content) for m in messages])
        
        generation_config = genai.types.GenerationConfig(
            temperature=temperature if temperature is not None else settings.LLM_TEMPERATURE,
            max_output_tokens=max_tokens if max_tokens is not None else settings.LLM_MAX_TOKENS,
        )
        
        response = await model.generate_content_async(
            prompt,
            generation_config=generation_config
        )
        return response.text

    async def stream(
        self,
        messages: list[BaseMessage],
        provider: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> AsyncIterator[str]:
        """Stream LLM response tokens with failover."""
        primary = provider or settings.DEFAULT_PROVIDER.value
        
        try:
            model = self.get_model(primary, temperature, max_tokens, streaming=True)
            
            prompt = "\\n\\n".join([str(m.content) for m in messages])
            
            generation_config = genai.types.GenerationConfig(
                temperature=temperature if temperature is not None else settings.LLM_TEMPERATURE,
                max_output_tokens=max_tokens if max_tokens is not None else settings.LLM_MAX_TOKENS,
            )
            
            response = await model.generate_content_async(
                prompt,
                generation_config=generation_config,
                stream=True
            )
            
            async for chunk in response:
                if chunk.text:
                    yield chunk.text
                    
        except Exception as e:
            logger.warning(f"Streaming from {primary} failed: {e}")
            raise

    @property
    def available_providers(self) -> dict[str, bool]:
        """Return which providers are configured."""
        return {
            "gemini": "gemini" in self._models,
        }


# Singleton instance
llm_provider = LLMProviderManager()
