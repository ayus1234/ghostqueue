// API client for interacting with the GhostQueue backend service

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export async function checkHealth(): Promise<{ status: string; service: string }> {
  const res = await fetch(`${API_BASE_URL.replace("/api", "")}/health`);
  if (!res.ok) {
    throw new Error(`Health check failed with status: ${res.status}`);
  }
  return res.json();
}

export async function previewDataset(file: File): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/datasets/preview`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(err.detail || "Failed to preview dataset");
  }

  return res.json();
}

export async function getDemoSummary(): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/demo/summary`);
  if (!res.ok) {
    throw new Error(`Failed to load demo summary: ${res.status}`);
  }
  return res.json();
}
