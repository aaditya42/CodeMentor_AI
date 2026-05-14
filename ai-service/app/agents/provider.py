"""
LLM Provider abstraction with retry logic and automatic failover.
Supports Google Gemini and Groq.
"""

import httpx
import openai
from typing import AsyncIterator, Optional, Any
from langchain_core.messages import BaseMessage
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

import google.generativeai as genai
from google.api_core.exceptions import GoogleAPIError

from app.core.config import settings, LLMProvider
from app.core.logging import get_logger, log_latency

logger = get_logger("llm-provider")

# Allowed fallback exceptions (we do not fallback on validation errors or bad requests)
FALLBACK_EXCEPTIONS = (
    openai.APIConnectionError,
    openai.APITimeoutError,
    openai.RateLimitError,
    openai.InternalServerError,
    httpx.RequestError,
    httpx.TimeoutException,
    TimeoutError,
    ConnectionError,
    GoogleAPIError,
)

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
        if settings.GROQ_API_KEY:
            from openai import AsyncOpenAI
            self._models["groq"] = AsyncOpenAI(
                api_key=settings.GROQ_API_KEY,
                base_url="https://api.groq.com/openai/v1",
                timeout=httpx.Timeout(settings.LLM_TIMEOUT),
            )
            logger.info("Groq provider initialized")

        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self._models["gemini"] = genai.GenerativeModel("gemini-2.0-flash")
            logger.info("Gemini provider initialized")

        if not self._models:
            logger.warning("No LLM providers configured — AI features will be unavailable")

    def get_model(self, provider: str) -> Any:
        """Get a configured LLM model instance."""
        if provider not in self._models:
            raise RuntimeError(f"Provider {provider} is not configured")
        return self._models[provider]

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
        Tries primary provider first, falls back on specific failures.
        """
        primary = provider or settings.PRIMARY_PROVIDER.value
        fallback = settings.SECONDARY_PROVIDER.value if settings.SECONDARY_PROVIDER else None
        
        try:
            logger.info(f"Using {primary.capitalize()} provider")
            return await self._invoke_provider(primary, messages, temperature, max_tokens)
        except FALLBACK_EXCEPTIONS as e:
            if fallback and fallback != primary and fallback in self._models:
                logger.warning(f"{primary.capitalize()} failed ({type(e).__name__}), switching to {fallback.capitalize()}")
                return await self._invoke_provider(fallback, messages, temperature, max_tokens)
            raise

    @retry(
        stop=stop_after_attempt(settings.MAX_RETRIES),
        wait=wait_exponential(multiplier=1, min=1, max=4),
        retry=retry_if_exception_type(FALLBACK_EXCEPTIONS),
    )
    async def _invoke_provider(
        self,
        provider: str,
        messages: list[BaseMessage],
        temperature: Optional[float],
        max_tokens: Optional[int],
    ) -> str:
        """Invoke a specific provider with retry logic."""
        model = self.get_model(provider)
        
        if provider == "groq":
            oai_messages = []
            for m in messages:
                role = "system" if m.type == "system" else "user"
                oai_messages.append({"role": role, "content": str(m.content)})

            response = await model.chat.completions.create(
                model=settings.PRIMARY_MODEL if provider == settings.PRIMARY_PROVIDER.value else settings.SECONDARY_MODEL,
                messages=oai_messages,
                temperature=temperature if temperature is not None else settings.LLM_TEMPERATURE,
                max_tokens=max_tokens if max_tokens is not None else settings.LLM_MAX_TOKENS,
            )
            return response.choices[0].message.content

        elif provider == "gemini":
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
            
        raise ValueError(f"Unsupported provider: {provider}")

    async def _stream_provider(
        self,
        provider: str,
        messages: list[BaseMessage],
        temperature: Optional[float],
        max_tokens: Optional[int],
    ) -> AsyncIterator[str]:
        """Stream from a specific provider."""
        model = self.get_model(provider)
        
        if provider == "groq":
            oai_messages = []
            for m in messages:
                role = "system" if m.type == "system" else "user"
                oai_messages.append({"role": role, "content": str(m.content)})

            response = await model.chat.completions.create(
                model=settings.PRIMARY_MODEL if provider == settings.PRIMARY_PROVIDER.value else settings.SECONDARY_MODEL,
                messages=oai_messages,
                temperature=temperature if temperature is not None else settings.LLM_TEMPERATURE,
                max_tokens=max_tokens if max_tokens is not None else settings.LLM_MAX_TOKENS,
                stream=True,
            )
            async for chunk in response:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        elif provider == "gemini":
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
        else:
            raise ValueError(f"Unsupported provider: {provider}")

    async def stream(
        self,
        messages: list[BaseMessage],
        provider: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> AsyncIterator[str]:
        """Stream LLM response tokens with failover."""
        primary = provider or settings.PRIMARY_PROVIDER.value
        fallback = settings.SECONDARY_PROVIDER.value if settings.SECONDARY_PROVIDER else None
        
        try:
            logger.info(f"Using {primary.capitalize()} provider")
            stream_gen = self._stream_provider(primary, messages, temperature, max_tokens)
            
            try:
                first_chunk = await stream_gen.__anext__()
                yield first_chunk
                async for chunk in stream_gen:
                    yield chunk
            except StopAsyncIteration:
                pass
                
        except FALLBACK_EXCEPTIONS as e:
            if fallback and fallback != primary and fallback in self._models:
                logger.warning(f"{primary.capitalize()} failed ({type(e).__name__}), switching to {fallback.capitalize()}")
                yield "__PROVIDER_FALLBACK__"
                async for chunk in self._stream_provider(fallback, messages, temperature, max_tokens):
                    yield chunk
            else:
                logger.warning(f"Streaming from {primary} failed: {e}")
                raise

    @property
    def available_providers(self) -> dict[str, bool]:
        """Return which providers are configured."""
        return {
            "groq": "groq" in self._models,
            "gemini": "gemini" in self._models,
        }

# Singleton instance
llm_provider = LLMProviderManager()
