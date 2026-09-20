from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# Health Check
class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    environment: Optional[str] = None


# Centralized Field Mapping Schemas
class FieldMappingDetail(BaseModel):
    canonical_field: str
    source_column: str
    confidence: float
    match_type: str = "alias"  # "exact", "alias", "substring"


# Dataset Capabilities
class DatasetCapabilities(BaseModel):
    core_analytics: bool
    ghost_zones: bool
    ghost_replay: bool
    time_series: bool
    queue_analysis: bool
    staffing_analysis: bool
    simulation_inputs: bool


# Dataset Profile
class DatasetProfile(BaseModel):
    dataset_name: str
    format: str  # "csv" | "json"
    row_count: int
    column_count: int
    original_columns: List[str]
    normalized_columns: List[str]
    mapped_fields: Dict[str, str]  # canonical_field -> source_column
    unmapped_fields: List[str]
    record_type: str  # "aggregate" | "event" | "mixed" | "unknown"
    capabilities: DatasetCapabilities


# Core Abandonment Analytics Schemas
class AnalyticalSummary(BaseModel):
    total_offered: Optional[int] = None
    total_completed: Optional[int] = None
    total_abandoned: Optional[int] = None
    ghost_rate: Optional[float] = None
    avg_wait_time_seconds: Optional[float] = None
    peak_abandonment_period: Optional[str] = None
    peak_ghost_rate_period: Optional[str] = None
    unsupported_metrics: Dict[str, str] = Field(default_factory=dict)


# Backward-compatible alias for existing imports
MetricSummary = AnalyticalSummary


# Ghost Zones Schemas
class GhostZoneItem(BaseModel):
    zone_name: str
    grouping_dimension: str
    offered: int
    abandoned: int
    completed: int
    ghost_rate: float
    avg_wait_time: Optional[float] = None
    severity: str  # "high", "medium", "low"
    severity_rationale: Optional[str] = None


# Backward-compatible alias
GhostZone = GhostZoneItem


# Time Series & Peak Analysis Schemas
class TimePeriodAnalytics(BaseModel):
    period: str
    offered: int
    abandoned: int
    completed: int
    ghost_rate: float
    avg_wait_time: Optional[float] = None


class TimeAnalysisResult(BaseModel):
    available: bool
    reason: Optional[str] = None
    period_type: Optional[str] = None  # "hourly", "daily", "interval"
    peak_abandonment_period: Optional[str] = None
    peak_ghost_rate_period: Optional[str] = None
    periods: List[TimePeriodAnalytics] = Field(default_factory=list)


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


class ReplayEventDetail(BaseModel):
    step_index: int
    event_id: Optional[str] = None
    timestamp: str
    elapsed_seconds: float
    event_type: str
    queue: Optional[str] = None
    stage: Optional[str] = None
    status: str
    wait_duration_seconds: float = 0.0
    actor: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class GhostPointDetail(BaseModel):
    stage: str
    queue: str
    step_index: int
    event_type: str
    wait_duration_seconds: float
    time_to_abandonment_seconds: float
    last_observed_state: Dict[str, Any] = Field(default_factory=dict)
    exit_trigger: Optional[str] = None


class SessionReplayResponse(BaseModel):
    session_id: str
    outcome: str  # "completed" | "abandoned" | "unresolved"
    terminal_event_detected: bool
    total_steps: int
    journey_duration_seconds: float
    time_to_abandonment_seconds: Optional[float] = None
    ghost_point: Optional[GhostPointDetail] = None
    last_observed_state: Optional[Dict[str, Any]] = None
    queues_traversed: List[str] = Field(default_factory=list)
    stages_traversed: List[str] = Field(default_factory=list)
    events: List[ReplayEventDetail] = Field(default_factory=list)


class ReplayAnalysisResponse(BaseModel):
    total_sessions: int
    completed: int
    abandoned: int
    unresolved: int
    abandonment_rate_resolved: float  # abandoned / (completed + abandoned) * 100
    avg_time_to_abandonment_seconds: Optional[float] = None
    median_time_to_abandonment_seconds: Optional[float] = None
    common_ghost_stage: Optional[str] = None
    common_ghost_queue: Optional[str] = None
    abandonment_by_stage: Dict[str, int] = Field(default_factory=dict)
    abandonment_by_queue: Dict[str, int] = Field(default_factory=dict)
    sample_sessions: List[SessionReplayResponse] = Field(default_factory=list)
    privacy_status: "PrivacyStatus" = Field(default_factory=lambda: PrivacyStatus())


class DatasetRegistryEntry(BaseModel):
    dataset_id: str
    name: str
    publisher: str
    source_url: str
    license: str
    record_status: str  # "public_dataset" | "synthetic_schema_fixture" | "synthetic_replay_fixture"
    source_type: str    # "verified_public_source" | "published_research_schema" | "synthetic_journey_demo"
    real_data_available_in_repo: bool
    redistribution_license: str
    doi: Optional[str] = None
    description: str
    record_type: str    # "aggregate" | "event"
    original_columns: List[str]
    canonical_mapping: Dict[str, str]
    capabilities: DatasetCapabilities
    fixture_path: str
    provenance: str


# Privacy Status
class PrivacyStatus(BaseModel):
    persisted: bool = False
    raw_data_retained: bool = False
    storage_type: str = "ephemeral_memory"
    message: str = (
        "Privacy-first processing — uploaded raw datasets are not persisted as application data."
    )


# Comprehensive Dataset Analysis Response
class DatasetAnalysisResponse(BaseModel):
    profile: DatasetProfile
    field_mapping: List[FieldMappingDetail]
    capabilities: DatasetCapabilities
    summary: AnalyticalSummary
    ghost_zones: List[GhostZoneItem]
    time_analysis: TimeAnalysisResult
    privacy_status: PrivacyStatus = Field(default_factory=PrivacyStatus)
    warnings: List[str] = Field(default_factory=list)


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
    disclaimer: str = (
        "SIMULATION / WHAT-IF results, not guaranteed real-world predictions."
    )
    baseline_ghost_rate: float
    baseline_avg_wait: float
    projected_ghost_rate: float
    projected_avg_wait: float
    delta_ghost_rate: float
    delta_avg_wait: float
