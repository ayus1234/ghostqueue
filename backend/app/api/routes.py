"""GhostQueue API endpoints for dataset ingestion, profiling, analytics, and Ghost Replay."""
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, Query, HTTPException
from app.core.exceptions import (
    GhostQueueException,
    DatasetNotFoundError,
    SessionNotFoundError,
)
from app.ingestion.parser import parse_dataset
from app.analytics.engine import run_full_analysis
from app.analytics.replay import run_replay_analysis, replay_single_session_from_df
from app.ingestion.datasets.registry import (
    get_all_registered_datasets,
    get_dataset_entry,
)
from app.ingestion.datasets.adapters import load_registered_fixture
from app.core.privacy import check_for_pii_headers
from app.models.schemas import (
    DatasetAnalysisResponse,
    ReplayAnalysisResponse,
    SessionReplayResponse,
    DatasetRegistryEntry,
)
import os
import pandas as pd

router = APIRouter()

MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB in-memory limit


@router.get("/demo/summary")
def demo_summary():
    """Demo summary returning pre-packaged verified Contact Center Erlang C benchmark."""
    try:
        df, fmt = load_registered_fixture("contact-center-erlang")
        analysis = run_full_analysis(df, "contact_center_erlang_merged.csv", fmt)
        return {
            "status": "ready",
            "dataset_id": "contact-center-erlang",
            "name": "Contact Center Queueing (Erlang C)",
            "license": "CC0 / Public Domain",
            "record_status": "public_dataset",
            "summary": analysis.summary.model_dump(),
            "ghost_zones": [z.model_dump() for z in analysis.ghost_zones],
            "capabilities": analysis.capabilities.model_dump(),
        }
    except Exception as exc:
        return {"status": "dataset_pending", "error": str(exc)}


@router.get("/datasets/registry", response_model=List[DatasetRegistryEntry])
def list_dataset_registry() -> List[DatasetRegistryEntry]:
    """Retrieve catalog of verified public, research-schema, and demo datasets."""
    return get_all_registered_datasets()


@router.get("/datasets/registry/{dataset_id}", response_model=DatasetRegistryEntry)
def get_dataset_registry_entry(dataset_id: str) -> DatasetRegistryEntry:
    """Retrieve metadata, provenance, and licensing for a specific registered dataset."""
    entry = get_dataset_entry(dataset_id)
    if not entry:
        raise HTTPException(
            status_code=404,
            detail=f"Dataset '{dataset_id}' not found in registry.",
        )
    return entry


@router.post("/datasets/preview")
async def preview_dataset(file: UploadFile = File(...)):
    """Lightweight preview of uploaded CSV/JSON dataset without saving to disk."""
    filename = file.filename or "dataset.csv"
    raw = await file.read()

    if len(raw) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Dataset size exceeds limit ({MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB).",
        )

    try:
        df, _ = parse_dataset(filename, raw)
    except GhostQueueException as gqe:
        raise HTTPException(status_code=gqe.status_code, detail=gqe.message)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Unable to parse dataset: {str(exc)}")

    pii_warnings = check_for_pii_headers(list(df.columns))

    return {
        "dataset_name": filename,
        "rows": int(len(df)),
        "columns": list(df.columns),
        "preview": df.head(5).where(pd.notnull(df), None).to_dict(orient="records"),
        "pii_warnings": pii_warnings,
    }


@router.post("/datasets/analyze", response_model=DatasetAnalysisResponse)
async def analyze_dataset_endpoint(file: UploadFile = File(...)) -> DatasetAnalysisResponse:
    """Analyze uploaded dataset and return canonical metrics, Ghost Zones, and capabilities.

    Guarantees:
    - Pure in-memory processing
    - Zero disk persistence
    - Automatic schema detection and field mapping
    """
    filename = file.filename or "dataset.csv"
    raw_bytes = await file.read()

    if len(raw_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Dataset size exceeds the 25MB limit.",
        )

    try:
        df, format_str = parse_dataset(filename, raw_bytes)
    except GhostQueueException as gqe:
        raise HTTPException(status_code=gqe.status_code, detail=gqe.message)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to process dataset '{filename}': {str(exc)}",
        )

    try:
        response = run_full_analysis(df, filename, format_str)
        # Add any PII header advisory warnings
        pii_warnings = check_for_pii_headers(list(df.columns))
        response.warnings.extend(pii_warnings)
        return response
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Internal analytics calculation error: {str(exc)}",
        )


@router.post("/replay/analyze", response_model=ReplayAnalysisResponse)
async def replay_analyze_endpoint(file: UploadFile = File(...)) -> ReplayAnalysisResponse:
    """Analyze multi-event journey dataset and return aggregate Ghost Replay intelligence.

    Guarantees:
    - Pure in-memory streaming
    - Zero persistence of raw data
    - Never infers unresolved = abandoned
    """
    filename = file.filename or "events.json"
    raw_bytes = await file.read()

    if len(raw_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Dataset size exceeds the 25MB limit.",
        )

    try:
        df, _ = parse_dataset(filename, raw_bytes)
    except GhostQueueException as gqe:
        raise HTTPException(status_code=gqe.status_code, detail=gqe.message)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse event dataset '{filename}': {str(exc)}",
        )

    try:
        return run_replay_analysis(df)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Ghost Replay calculation error: {str(exc)}",
        )


@router.post("/replay/session", response_model=SessionReplayResponse)
async def replay_session_endpoint(
    file: UploadFile = File(...),
    session_id: Optional[str] = Form(None),
    query_session_id: Optional[str] = Query(None, alias="session_id"),
) -> SessionReplayResponse:
    """Reconstruct a single customer/session journey from an uploaded event dataset.

    Returns chronological event progression, wait durations, terminal outcome,
    and ghost point details if abandoned.
    """
    target_session_id = session_id or query_session_id
    if not target_session_id:
        raise HTTPException(
            status_code=400,
            detail="Missing required parameter: 'session_id' must be provided in form data or query parameter.",
        )

    filename = file.filename or "events.json"
    raw_bytes = await file.read()

    if len(raw_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Dataset size exceeds the 25MB limit.",
        )

    try:
        df, _ = parse_dataset(filename, raw_bytes)
    except GhostQueueException as gqe:
        raise HTTPException(status_code=gqe.status_code, detail=gqe.message)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse event dataset '{filename}': {str(exc)}",
        )

    replay_result = replay_single_session_from_df(df, target_session_id)
    if not replay_result:
        raise HTTPException(
            status_code=404,
            detail=f"Session '{target_session_id}' not found in uploaded dataset.",
        )

    return replay_result


@router.post("/datasets/benchmark/{dataset_id}/analyze")
def analyze_benchmark_dataset(dataset_id: str):
    """Run full analytics or replay on a pre-registered benchmark dataset fixture without re-uploading."""
    entry = get_dataset_entry(dataset_id)
    if not entry:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found in registry.")

    try:
        df, fmt = load_registered_fixture(dataset_id)
    except DatasetNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    if entry.capabilities.ghost_replay:
        replay_res = run_replay_analysis(df)
        return {
            "mode": "replay",
            "entry": entry.model_dump(),
            "replay": replay_res.model_dump(),
        }
    else:
        analysis_res = run_full_analysis(df, os.path.basename(entry.fixture_path), fmt)
        return {
            "mode": "tabular",
            "entry": entry.model_dump(),
            "analysis": analysis_res.model_dump(),
        }
