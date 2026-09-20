/**
 * Strongly-typed API client for GhostQueue
 * Connects directly to FastAPI backend services
 */

import {
  HealthResponse,
  DemoSummaryResponse,
  DatasetRegistryEntry,
  BenchmarkAnalysisResponse,
  DatasetPreviewResponse,
  DatasetAnalysisResponse,
  ReplayAnalysisResponse,
  SessionReplayResponse,
  SimulationScenarioRequest,
  SimulationResponse,
  ScenarioComparisonRequest,
  ScenarioComparisonResponse,
  InvestigationReport,
} from "../types";

const RAW_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const API_BASE = RAW_BASE_URL.replace(/\/+$/, "");

async function handleResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (!res.ok) {
    let errorDetail = fallbackMessage;
    try {
      const errorJson = await res.json();
      if (errorJson && typeof errorJson.detail === "string") {
        errorDetail = errorJson.detail;
      } else if (errorJson && errorJson.message) {
        errorDetail = errorJson.message;
      }
    } catch {
      // Non-JSON error body
    }
    throw new Error(errorDetail || `Request failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// 1. System Health
export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
  return handleResponse<HealthResponse>(res, "Health check failed");
}

// 2. Demo Summary (Contact Center Erlang benchmark)
export async function getDemoSummary(): Promise<DemoSummaryResponse> {
  const res = await fetch(`${API_BASE}/api/demo/summary`, { cache: "no-store" });
  return handleResponse<DemoSummaryResponse>(res, "Failed to load demo summary");
}

// 3. Dataset Registry
export async function listDatasetRegistry(): Promise<DatasetRegistryEntry[]> {
  const res = await fetch(`${API_BASE}/api/v1/datasets/registry`, { cache: "no-store" });
  return handleResponse<DatasetRegistryEntry[]>(res, "Failed to list registered datasets");
}

export async function getDatasetRegistryEntry(datasetId: string): Promise<DatasetRegistryEntry> {
  const res = await fetch(`${API_BASE}/api/v1/datasets/registry/${encodeURIComponent(datasetId)}`, {
    cache: "no-store",
  });
  return handleResponse<DatasetRegistryEntry>(res, `Failed to retrieve dataset '${datasetId}'`);
}

// 4. Benchmark Analysis
export async function analyzeBenchmarkDataset(datasetId: string): Promise<BenchmarkAnalysisResponse> {
  const res = await fetch(`${API_BASE}/api/v1/datasets/benchmark/${encodeURIComponent(datasetId)}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse<BenchmarkAnalysisResponse>(res, `Failed to analyze benchmark dataset '${datasetId}'`);
}

// 5. In-Memory Upload Preview
export async function previewDataset(file: File): Promise<DatasetPreviewResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/v1/datasets/preview`, {
    method: "POST",
    body: formData,
  });
  return handleResponse<DatasetPreviewResponse>(res, "Failed to preview uploaded dataset");
}

// 6. In-Memory Full Analysis
export async function analyzeDataset(file: File): Promise<DatasetAnalysisResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/v1/datasets/analyze`, {
    method: "POST",
    body: formData,
  });
  return handleResponse<DatasetAnalysisResponse>(res, "Failed to analyze uploaded dataset");
}

// 7. Ghost Replay Analysis
export async function analyzeReplay(file: File): Promise<ReplayAnalysisResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/v1/replay/analyze`, {
    method: "POST",
    body: formData,
  });
  return handleResponse<ReplayAnalysisResponse>(res, "Failed to analyze event replay dataset");
}

// 8. Single Session Replay
export async function replaySession(file: File, sessionId: string): Promise<SessionReplayResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("session_id", sessionId);

  const res = await fetch(`${API_BASE}/api/v1/replay/session`, {
    method: "POST",
    body: formData,
  });
  return handleResponse<SessionReplayResponse>(res, `Failed to replay session '${sessionId}'`);
}

// 9. What-If Simulator
export async function runSimulation(payload: SimulationScenarioRequest): Promise<SimulationResponse> {
  const res = await fetch(`${API_BASE}/api/v1/simulation/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<SimulationResponse>(res, "Failed to run simulation scenario");
}

export async function compareScenarios(payload: ScenarioComparisonRequest): Promise<ScenarioComparisonResponse> {
  const res = await fetch(`${API_BASE}/api/v1/simulation/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<ScenarioComparisonResponse>(res, "Failed to compare simulation scenarios");
}

// 10. AI Investigator
export async function runInvestigation(datasetId?: string, file?: File): Promise<InvestigationReport> {
  let url = `${API_BASE}/api/v1/investigator/analyze`;
  const options: RequestInit = { method: "POST" };

  if (file) {
    const formData = new FormData();
    formData.append("file", file);
    options.body = formData;
  } else if (datasetId) {
    url += `?dataset_id=${encodeURIComponent(datasetId)}`;
  }

  const res = await fetch(url, options);
  return handleResponse<InvestigationReport>(res, "Failed to generate investigation report");
}
