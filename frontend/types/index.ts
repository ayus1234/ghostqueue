/**
 * Canonical TypeScript interfaces for GhostQueue
 * Strictly typed against backend FastAPI schemas in app/models/schemas.py
 */

// Centralized Health & System Types
export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  environment?: string;
}

// Centralized Field Mapping Schemas
export interface FieldMappingDetail {
  canonical_field: string;
  source_column: string;
  confidence: number;
  match_type: "exact" | "alias" | "substring";
}

// Dataset Capabilities
export interface DatasetCapabilities {
  core_analytics: boolean;
  ghost_zones: boolean;
  ghost_replay: boolean;
  time_series: boolean;
  queue_analysis: boolean;
  staffing_analysis: boolean;
  simulation_inputs: boolean;
}

// Dataset Profile
export interface DatasetProfile {
  dataset_name: string;
  format: "csv" | "json";
  row_count: number;
  column_count: number;
  original_columns: string[];
  normalized_columns: string[];
  mapped_fields: Record<string, string>;
  unmapped_fields: string[];
  record_type: "aggregate" | "event" | "mixed" | "unknown";
  capabilities: DatasetCapabilities;
}

// Core Abandonment Analytics Schemas
export interface AnalyticalSummary {
  total_offered?: number | null;
  total_completed?: number | null;
  total_abandoned?: number | null;
  ghost_rate?: number | null;
  avg_wait_time_seconds?: number | null;
  peak_abandonment_period?: string | null;
  peak_ghost_rate_period?: string | null;
  unsupported_metrics: Record<string, string>;
}

// Ghost Zones Schemas
export interface GhostZoneItem {
  zone_name: string;
  grouping_dimension: string;
  offered: number;
  abandoned: number;
  completed: number;
  ghost_rate: number;
  avg_wait_time?: number | null;
  severity: "high" | "medium" | "low";
  severity_rationale?: string | null;
}

// Time Series & Peak Analysis Schemas
export interface TimePeriodAnalytics {
  period: string;
  offered: number;
  abandoned: number;
  completed: number;
  ghost_rate: number;
  avg_wait_time?: number | null;
}

export interface TimeAnalysisResult {
  available: boolean;
  reason?: string | null;
  period_type?: "hourly" | "daily" | "interval" | null;
  peak_abandonment_period?: string | null;
  peak_ghost_rate_period?: string | null;
  periods: TimePeriodAnalytics[];
}

// Ghost Replay Schemas
export interface ReplayEventDetail {
  step_index: number;
  event_id?: string | null;
  timestamp: string;
  elapsed_seconds: number;
  event_type: string;
  queue?: string | null;
  stage?: string | null;
  status: string;
  wait_duration_seconds: number;
  actor?: string | null;
  metadata: Record<string, unknown>;
}

export interface GhostPointDetail {
  stage: string;
  queue: string;
  step_index: number;
  event_type: string;
  wait_duration_seconds: number;
  time_to_abandonment_seconds: number;
  last_observed_state: Record<string, unknown>;
  exit_trigger?: string | null;
}

export interface SessionReplayResponse {
  session_id: string;
  outcome: "completed" | "abandoned" | "unresolved";
  terminal_event_detected: boolean;
  total_steps: number;
  journey_duration_seconds: number;
  time_to_abandonment_seconds?: number | null;
  ghost_point?: GhostPointDetail | null;
  last_observed_state?: Record<string, unknown> | null;
  queues_traversed: string[];
  stages_traversed: string[];
  events: ReplayEventDetail[];
}

export interface ReplayAnalysisResponse {
  total_sessions: number;
  completed: number;
  abandoned: number;
  unresolved: number;
  abandonment_rate_resolved: number;
  avg_time_to_abandonment_seconds?: number | null;
  median_time_to_abandonment_seconds?: number | null;
  common_ghost_stage?: string | null;
  common_ghost_queue?: string | null;
  abandonment_by_stage: Record<string, number>;
  abandonment_by_queue: Record<string, number>;
  sample_sessions: SessionReplayResponse[];
  privacy_status: PrivacyStatus;
}

// Dataset Registry Entry
export interface DatasetRegistryEntry {
  dataset_id: string;
  name: string;
  publisher: string;
  source_url: string;
  license: string;
  record_status: "public_dataset" | "synthetic_schema_fixture" | "synthetic_replay_fixture";
  source_type: "verified_public_source" | "published_research_schema" | "synthetic_journey_demo";
  real_data_available_in_repo: boolean;
  redistribution_license: string;
  doi?: string | null;
  description: string;
  record_type: "aggregate" | "event";
  original_columns: string[];
  canonical_mapping: Record<string, string>;
  capabilities: DatasetCapabilities;
  fixture_path: string;
  provenance: string;
}

// Privacy Status
export interface PrivacyStatus {
  persisted: boolean;
  raw_data_retained: boolean;
  storage_type: string;
  message: string;
}

// Comprehensive Dataset Analysis Response
export interface DatasetAnalysisResponse {
  profile: DatasetProfile;
  field_mapping: FieldMappingDetail[];
  capabilities: DatasetCapabilities;
  summary: AnalyticalSummary;
  ghost_zones: GhostZoneItem[];
  time_analysis: TimeAnalysisResult;
  privacy_status: PrivacyStatus;
  warnings: string[];
}

// AI Investigator Schemas
export interface InvestigationObservation {
  title: string;
  evidence: string;
  metric: string;
  value: string | number | boolean | null;
  source_capability: string;
}

export interface InvestigationHypothesis {
  hypothesis: string;
  supporting_evidence: string;
  confidence: "low" | "medium" | "high";
  confidence_rationale: string;
}

export interface InvestigationNextAction {
  action: string;
  reason: string;
  expected_investigative_value: string;
  target_dimension?: string | null;
  target_value?: string | null;
}

export interface InvestigationEvidenceLink {
  concept: "ghost_zone" | "time_period" | "replay_stage" | "queue" | "metric";
  identifier: string;
  observed_value: string;
  relevance: string;
}

export interface InvestigationReport {
  executive_finding: string;
  observations: InvestigationObservation[];
  hypotheses: InvestigationHypothesis[];
  next_actions: InvestigationNextAction[];
  evidence_links: InvestigationEvidenceLink[];
  limitations: string[];
  provider: string;
  generated_at: string;
  disclaimer: string;
  privacy_status: PrivacyStatus;
}

// What-if Simulator Schemas
export interface SimulationScenarioRequest {
  dataset_id?: string | null;
  scenario_name: string;
  additional_agents: number;
  staffing_change_percent: number;
  capacity_change_percent: number;
  demand_change_percent: number;
  service_time_change_percent: number;
  wait_reduction_target_seconds?: number | null;
}

export interface SimulationMetricsSummary {
  offered_demand: number;
  completed_volume: number;
  abandoned_volume: number;
  ghost_rate: number;
  avg_wait_seconds?: number | null;
  staffing_level?: number | null;
  service_level_pct?: number | null;
}

export interface SimulationMetricValue {
  metric_name: string;
  baseline_value?: number | null;
  simulated_value?: number | null;
  delta?: number | null;
  percent_change?: number | null;
  unit: string;
}

export interface SimulationResponse {
  scenario_name: string;
  is_simulation: boolean;
  baseline: SimulationMetricsSummary;
  simulated: SimulationMetricsSummary;
  deltas: Record<string, number>;
  comparison_metrics: SimulationMetricValue[];
  assumptions: string[];
  methodology: string;
  disclaimer: string;
  limitations: string[];
}

export interface ScenarioComparisonRequest {
  dataset_id?: string | null;
  scenarios: SimulationScenarioRequest[];
}

export interface ScenarioComparisonResponse {
  is_simulation: boolean;
  baseline: SimulationMetricsSummary;
  scenarios: SimulationResponse[];
  disclaimer: string;
}

// Dataset Preview and Upload
export interface DatasetPreviewResponse {
  dataset_name: string;
  rows: number;
  columns: string[];
  preview: Record<string, unknown>[];
  pii_warnings: string[];
}

// Demo Summary Response
export interface DemoSummaryResponse {
  status: string;
  dataset_id: string;
  name: string;
  license: string;
  record_status: string;
  summary: AnalyticalSummary;
  ghost_zones: GhostZoneItem[];
  capabilities: DatasetCapabilities;
  error?: string;
}

// Benchmark Analysis Response
export interface BenchmarkAnalysisResponse {
  mode: "tabular" | "replay";
  entry: DatasetRegistryEntry;
  analysis?: DatasetAnalysisResponse;
  replay?: ReplayAnalysisResponse;
}
