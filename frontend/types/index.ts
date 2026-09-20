// Canonical TypeScript interfaces for GhostQueue

export type DatasetSourceType =
  | "public-contact-center"
  | "healthcare-call-center"
  | "custom-upload";

export interface MetricSummary {
  total_interactions: number;
  completed_interactions: number;
  abandoned_interactions: number;
  ghost_rate: number;
  avg_wait_time_seconds?: number;
  peak_abandonment_periods: string[];
  dataset_name?: string;
}

export interface GhostZone {
  zone: string;
  abandonment_volume: number;
  abandonment_rate: number;
  avg_wait_time?: number;
  capacity_indicator?: string;
  severity: "high" | "medium" | "low";
}

export interface JourneyEvent {
  timestamp: string;
  stage: string;
  status: string;
  details?: Record<string, any>;
}

export interface GhostReplayData {
  available: boolean;
  session_id?: string;
  events: JourneyEvent[];
  drop_off_point?: string;
  reason?: string;
}

export interface InvestigationInsight {
  observations: string[];
  hypotheses: string[];
  recommended_actions: string[];
}

export interface SimulationParameters {
  staffing_multiplier: number;
  arrival_load_multiplier: number;
  capacity_delta: number;
}

export interface SimulationResult {
  is_simulation: true;
  disclaimer: string;
  baseline_ghost_rate: number;
  baseline_avg_wait: number;
  projected_ghost_rate: number;
  projected_avg_wait: number;
  delta_ghost_rate: number;
  delta_avg_wait: number;
}

export interface DatasetPreview {
  rows: number;
  columns: string[];
  preview: Record<string, any>[];
  detected_type?: string;
}
