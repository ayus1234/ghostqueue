from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# Health Check
class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


# Core Abandonment Analytics Schemas
class MetricSummary(BaseModel):
    total_interactions: int
    completed_interactions: int
    abandoned_interactions: int
    ghost_rate: float
    avg_wait_time_seconds: Optional[float] = None
    peak_abandonment_periods: List[str] = Field(default_factory=list)
    dataset_name: Optional[str] = None


# Ghost Zones Schemas
class GhostZone(BaseModel):
    zone: str
    abandonment_volume: int
    abandonment_rate: float
    avg_wait_time: Optional[float] = None
    capacity_indicator: Optional[str] = None
    severity: str  # "high", "medium", "low"


# Ghost Replay Schemas
class JourneyEvent(BaseModel):
    timestamp: str
    stage: str
    status: str
    details: Optional[Dict[str, Any]] = None


class GhostReplay(BaseModel):
    available: bool
    session_id: Optional[str] = None
    events: List[JourneyEvent] = Field(default_factory=list)
    drop_off_point: Optional[str] = None
    reason: Optional[str] = None


# AI Investigator Schemas
class InvestigationInsight(BaseModel):
    observations: List[str] = Field(
        default_factory=list,
        description="Factual evidence directly observed from the dataset",
    )
    hypotheses: List[str] = Field(
        default_factory=list,
        description="Possible contributing factors (clearly flagged as hypotheses, not facts)",
    )
    recommended_actions: List[str] = Field(
        default_factory=list,
        description="Actionable operational next steps to test or remediate",
    )


# What-if Simulator Schemas
class SimulationParameters(BaseModel):
    staffing_multiplier: float = 1.0
    arrival_load_multiplier: float = 1.0
    capacity_delta: int = 0


class SimulationResult(BaseModel):
    is_simulation: bool = True
    disclaimer: str = "SIMULATION / WHAT-IF results, not guaranteed real-world predictions."
    baseline_ghost_rate: float
    baseline_avg_wait: float
    projected_ghost_rate: float
    projected_avg_wait: float
    delta_ghost_rate: float
    delta_avg_wait: float
