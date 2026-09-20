"""Factory for instantiating the appropriate AI Investigator provider based on configuration."""
import os
from app.ai.base import AIProvider
from app.ai.deterministic import DeterministicInvestigatorProvider
from app.ai.llm import LLMInvestigatorProvider


def get_investigator_provider() -> AIProvider:
    """Instantiate and return the configured AI Investigator provider.

    Defaults to DeterministicInvestigatorProvider when external credentials are not set.
    """
    provider_pref = os.getenv("AI_INVESTIGATOR_PROVIDER", "deterministic").lower()

    if provider_pref in ("llm", "bedrock", "openai", "anthropic", "gemini"):
        return LLMInvestigatorProvider()

    return DeterministicInvestigatorProvider()
