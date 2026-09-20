"""GhostQueue API endpoints for dataset ingestion, profiling, and analytics."""
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.core.exceptions import GhostQueueException
from app.ingestion.parser import parse_dataset
from app.analytics.engine import run_full_analysis
from app.core.privacy import check_for_pii_headers
from app.models.schemas import DatasetAnalysisResponse
import pandas as pd
from io import BytesIO

router = APIRouter()

MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB in-memory limit


@router.get("/demo/summary")
def demo_summary():
    """Demo summary placeholder for pre-packaged benchmark dataset."""
    return {"status": "dataset_pending"}


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
            detail=f"Dataset size exceeds the 25MB limit.",
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
