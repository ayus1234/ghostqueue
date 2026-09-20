"""Base AI Investigator provider interface and investigative contracts."""
from abc import ABC, abstractmethod
from typing import Optional
from app.models.schemas import (
    DatasetAnalysisResponse,
    ReplayAnalysisResponse,
    InvestigationReport,
)


class AIProvider(ABC):
    """Abstract interface for AI diagnostic investigators."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name of the investigative provider implementation."""
        pass

    @abstractmethod
    def generate_investigation(
        self,
        analysis: DatasetAnalysisResponse,
        replay: Optional[ReplayAnalysisResponse] = None,
    ) -> InvestigationReport:
        """Analyze canonical dataset metrics and produce structured diagnostic findings."""
        pass
