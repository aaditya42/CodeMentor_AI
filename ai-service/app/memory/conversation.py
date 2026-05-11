"""
Conversation memory management for multi-turn hint sessions.
Maintains context windows and relevant history for LLM prompt construction.
"""

from typing import Optional
from app.core.logging import get_logger
from app.utils.redis_client import cache_get, cache_set

logger = get_logger("memory")

MAX_HISTORY_MESSAGES = 20
MAX_CONTEXT_TOKENS_ESTIMATE = 4000  # Rough char limit for history


class ConversationMemory:
    """Manages conversation context for hint generation sessions."""

    @staticmethod
    async def get_history(conversation_id: str) -> list[dict[str, str]]:
        """Retrieve conversation history from cache."""
        key = f"conversation:{conversation_id}:history"
        history = await cache_get(key)
        return history or []

    @staticmethod
    async def add_message(
        conversation_id: str,
        role: str,
        content: str,
        hint_level: Optional[int] = None,
    ) -> None:
        """Add a message to conversation history."""
        key = f"conversation:{conversation_id}:history"
        history = await cache_get(key) or []

        message = {"role": role, "content": content}
        if hint_level is not None:
            message["hint_level"] = str(hint_level)

        history.append(message)

        # Trim to max messages
        if len(history) > MAX_HISTORY_MESSAGES:
            history = history[-MAX_HISTORY_MESSAGES:]

        await cache_set(key, history, ttl=7200)  # 2 hour TTL

    @staticmethod
    def build_context_window(
        history: list[dict[str, str]],
        max_chars: int = MAX_CONTEXT_TOKENS_ESTIMATE,
    ) -> list[dict[str, str]]:
        """
        Build a context window from history, keeping most recent messages
        while respecting token budget.
        """
        if not history:
            return []

        # Work backwards from most recent
        result = []
        total_chars = 0

        for msg in reversed(history):
            msg_len = len(msg.get("content", ""))
            if total_chars + msg_len > max_chars:
                break
            result.insert(0, msg)
            total_chars += msg_len

        return result

    @staticmethod
    async def clear(conversation_id: str) -> None:
        """Clear conversation history."""
        from app.utils.redis_client import cache_delete
        key = f"conversation:{conversation_id}:history"
        await cache_delete(key)
        logger.info(f"Cleared conversation {conversation_id}")


conversation_memory = ConversationMemory()
