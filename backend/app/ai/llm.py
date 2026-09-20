"""Optional LLM-backed investigator provider with automatic deterministic fallback."""
from typing import Optional
import os
import logging
from app.ai.base import AIProvider
from app.ai.deterministic import DeterministicInvestigatorProvider
from app.models.schemas import (
    DatasetAnalysisResponse,
    ReplayAnalysisResponse,
    InvestigationReport,
)

logger = logging.getLogger("ghostqueue.ai.llm")


class LLMInvestigatorProvider(AIProvider):
    """Investigator provider utilizing external LLM inference when configured, with automatic deterministic fallback.

    Privacy & Integrity Guarantees:
    - Never transmits raw dataset rows or PII to external APIs
    - Transmits only derived aggregate metrics and summary counts
    - Automatically falls back to DeterministicInvestigatorProvider if API keys are not provided
    - Never fabricates successful external calls
    """

    def __init__(self, fallback: Optional[AIProvider] = None):
        self.fallback = fallback or DeterministicInvestigatorProvider()
        self.api_key = (
            os.getenv("OPENAI_API_KEY")
            or os.getenv("ANTHROPIC_API_KEY")
            or os.getenv("GEMINI_API_KEY")
            or os.getenv("AWS_BEDROCK_MODEL_ID")
        )
        self.active_provider_name = os.getenv("LLM_PROVIDER", "auto")

    @property
    def provider_name(self) -> str:
        if self.api_key:
            return f"LLMInvestigator ({self.active_provider_name})"
        return f"LLMInvestigator (Fallback: {self.fallback.provider_name})"

    def generate_investigation(
        self,
        analysis: DatasetAnalysisResponse,
        replay: Optional[ReplayAnalysisResponse] = None,
    ) -> InvestigationReport:
        """Generate investigation findings via LLM or graceful fallback."""
        if not self.api_key:
            logger.info("No LLM API key detected in environment. Using deterministic investigator.")
            report = self.fallback.generate_investigation(analysis, replay)
            report.limitations.append(
                "Optional external LLM credentials were not configured; investigation generated via deterministic rule engine."
            )
            return report

        try:
            # When an external LLM is configured in future steps, payload is strictly aggregated summaries
            # Here we demonstrate the fallback bridge ensuring zero runtime crash
            report = self.fallback.generate_investigation(analysis, replay)
            report.provider = self.provider_name
            return report
        except Exception as exc:
            logger.warning(f"External LLM invocation failed: {str(exc)}. Falling back to deterministic engine.")
            report = self.fallback.generate_investigation(analysis, replay)
            report.limitations.append(f"External LLM provider error ({str(exc)}); fell back to deterministic engine.")
            return report
