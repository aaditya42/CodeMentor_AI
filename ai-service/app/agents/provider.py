"""
LLM Provider abstraction with retry logic and automatic failover.
Supports OpenAI and Anthropic with configurable fallback chains.
"""

from typing import AsyncIterator, Optional
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage, BaseMessage
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.core.config import settings, LLMProvider
from app.core.logging import get_logger, log_latency

logger = get_logger("llm-provider")


class LLMProviderManager:
    """
    Manages LLM provider instances with automatic failover.
    Primary provider → Fallback provider on failure.
    """

    def __init__(self):
        self._models: dict[str, BaseChatModel] = {}
        self._initialize_providers()

    def _initialize_providers(self):
        """Initialize all configured LLM providers."""
        if settings.OPENAI_API_KEY:
            self._models["openai"] = ChatOpenAI(
                api_key=settings.OPENAI_API_KEY,
                model=settings.DEFAULT_MODEL if settings.DEFAULT_PROVIDER == LLMProvider.OPENAI else "gpt-4o-mini",
                temperature=settings.LLM_TEMPERATURE,
                max_tokens=settings.LLM_MAX_TOKENS,
                timeout=settings.LLM_TIMEOUT,
                max_retries=2,
            )
            logger.info("OpenAI provider initialized", model=self._models["openai"].model_name)

        if settings.ANTHROPIC_API_KEY:
            self._models["anthropic"] = ChatAnthropic(
                api_key=settings.ANTHROPIC_API_KEY,
                model_name=settings.FALLBACK_MODEL if settings.DEFAULT_PROVIDER == LLMProvider.OPENAI else settings.DEFAULT_MODEL,
                temperature=settings.LLM_TEMPERATURE,
                max_tokens=settings.LLM_MAX_TOKENS,
                timeout=settings.LLM_TIMEOUT,
                max_retries=2,
            )
            logger.info("Anthropic provider initialized")

        if not self._models:
            logger.warning("No LLM providers configured — AI features will be unavailable")

    def get_model(
        self,
        provider: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        streaming: bool = False,
    ) -> BaseChatModel:
        """Get a configured LLM model instance."""
        provider_name = provider or settings.DEFAULT_PROVIDER.value

        if provider_name not in self._models:
            # Fallback to any available provider
            if self._models:
                provider_name = next(iter(self._models))
                logger.warning(f"Requested provider unavailable, falling back to {provider_name}")
            else:
                raise RuntimeError("No LLM providers configured")

        model = self._models[provider_name]

        # Apply overrides if needed
        kwargs = {}
        if temperature is not None:
            kwargs["temperature"] = temperature
        if max_tokens is not None:
            kwargs["max_tokens"] = max_tokens
        if streaming:
            kwargs["streaming"] = True

        if kwargs:
            return model.bind(**{}) if not kwargs else model.__class__(
                **({"api_key": settings.OPENAI_API_KEY, "model": model.model_name} if provider_name == "openai"
                   else {"api_key": settings.ANTHROPIC_API_KEY, "model_name": getattr(model, 'model_name', settings.DEFAULT_MODEL)}),
                temperature=temperature or settings.LLM_TEMPERATURE,
                max_tokens=max_tokens or settings.LLM_MAX_TOKENS,
                streaming=streaming,
            )

        return model

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
        fallback = settings.FALLBACK_PROVIDER.value if settings.FALLBACK_PROVIDER else None

        # Try primary
        try:
            return await self._invoke_provider(primary, messages, temperature, max_tokens)
        except Exception as e:
            logger.warning(f"Primary provider {primary} failed: {e}")

            # Try fallback
            if fallback and fallback != primary and fallback in self._models:
                logger.info(f"Attempting fallback provider: {fallback}")
                try:
                    return await self._invoke_provider(fallback, messages, temperature, max_tokens)
                except Exception as e2:
                    logger.error(f"Fallback provider {fallback} also failed: {e2}")
                    raise e2

            raise e

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
        response = await model.ainvoke(messages)
        return response.content if isinstance(response.content, str) else str(response.content)

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
            async for chunk in model.astream(messages):
                text = chunk.content if isinstance(chunk.content, str) else str(chunk.content)
                if text:
                    yield text
        except Exception as e:
            logger.warning(f"Streaming from {primary} failed: {e}")
            fallback = settings.FALLBACK_PROVIDER.value if settings.FALLBACK_PROVIDER else None
            if fallback and fallback != primary and fallback in self._models:
                model = self.get_model(fallback, temperature, max_tokens, streaming=True)
                async for chunk in model.astream(messages):
                    text = chunk.content if isinstance(chunk.content, str) else str(chunk.content)
                    if text:
                        yield text
            else:
                raise

    @property
    def available_providers(self) -> dict[str, bool]:
        """Return which providers are configured."""
        return {
            "openai": "openai" in self._models,
            "anthropic": "anthropic" in self._models,
        }


# Singleton instance
llm_provider = LLMProviderManager()
