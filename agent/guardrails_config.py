import logging

logger = logging.getLogger(__name__)

REDIRECT_PHRASE = "Let me redirect us back to the presentation."

_TOXIC_KEYWORDS = [
    "kill", "murder", "rape", "bomb", "explosive", "suicide",
    "terrorist", "nazi", "genocide", "torture",
]


def _keyword_filter(text: str) -> bool:
    lower = text.lower()
    return any(kw in lower for kw in _TOXIC_KEYWORDS)


def _try_guardrails(text: str) -> str:
    from guardrails import Guard
    from guardrails.hub import ToxicLanguage

    guard = Guard().use(
        ToxicLanguage,
        threshold=0.5,
        validation_method="sentence",
        on_fail="fix",
    )
    result = guard.validate(text)
    return result.validated_output or REDIRECT_PHRASE


def validate_response(text: str) -> str:
    """Run content validation on LLM output before TTS. Always returns safe text."""
    if not text or not text.strip():
        return REDIRECT_PHRASE

    try:
        validated = _try_guardrails(text)
        return validated if validated else REDIRECT_PHRASE
    except ImportError:
        # Hub validator not installed — fall back to keyword filter
        logger.warning("guardrails hub not available, using keyword filter fallback")
        if _keyword_filter(text):
            return REDIRECT_PHRASE
        return text
    except Exception as e:
        logger.error("guardrails validation error: %s", e)
        if _keyword_filter(text):
            return REDIRECT_PHRASE
        return text
