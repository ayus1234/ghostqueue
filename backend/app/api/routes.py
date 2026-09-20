from fastapi import APIRouter, UploadFile, File, HTTPException
from app.analytics.metrics import analyze_dataframe
import pandas as pd
from io import BytesIO

router = APIRouter()

@router.get("/demo/summary")
def demo_summary():
    # Wired to the sample dataset in the next implementation step.
    return {"status": "dataset_pending"}

@router.post("/datasets/preview")
async def preview_dataset(file: UploadFile = File(...)):
    if file.content_type not in {"text/csv", "application/json", "application/octet-stream"}:
        raise HTTPException(status_code=400, detail="Only CSV or JSON files are supported")
    raw = await file.read()
    try:
        if file.filename.lower().endswith(".json"):
            df = pd.read_json(BytesIO(raw))
        else:
            df = pd.read_csv(BytesIO(raw))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Unable to parse dataset: {exc}")
    return {
        "rows": int(len(df)),
        "columns": list(df.columns),
        "preview": df.head(5).where(pd.notnull(df), None).to_dict(orient="records"),
    }
