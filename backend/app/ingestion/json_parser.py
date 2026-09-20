"""In-memory JSON parser supporting list-of-objects and wrapped object structures."""
import json
import pandas as pd
from app.core.exceptions import (
    EmptyDatasetError,
    MalformedDatasetError,
    UnsupportedJsonStructureError,
)

WRAPPED_DATA_KEYS = ["data", "records", "items", "interactions", "rows", "events"]


def parse_json_bytes(raw_bytes: bytes, filename: str = "dataset.json") -> pd.DataFrame:
    """Parse raw JSON bytes entirely in memory.

    Supports:
    - Top-level list of dictionaries: `[{"queue": "Tier 1", "offered": 100}, ...]`
    - Wrapped envelope dictionaries: `{"data": [...]}` or `{"records": [...]}`

    Guarantees:
    - Never writes raw data to disk
    - Detects empty and corrupt structures
    """
    if not raw_bytes or len(raw_bytes.strip()) == 0:
        raise EmptyDatasetError(f"Uploaded JSON file '{filename}' is empty.")

    try:
        data = json.loads(raw_bytes.decode("utf-8"))
    except UnicodeDecodeError:
        try:
            data = json.loads(raw_bytes.decode("latin-1"))
        except Exception as exc:
            raise MalformedDatasetError(
                f"Unable to decode JSON file '{filename}': {str(exc)}"
            )
    except Exception as exc:
        raise MalformedDatasetError(
            f"Failed to parse JSON file '{filename}': {str(exc)}"
        )

    # Resolve wrapped envelopes if present
    records = None
    if isinstance(data, list):
        records = data
    elif isinstance(data, dict):
        for key in WRAPPED_DATA_KEYS:
            if key in data and isinstance(data[key], list):
                records = data[key]
                break

        if records is None:
            # If the dict has values that are lists of equal length, it might be column-oriented
            if all(isinstance(v, list) for v in data.values()) and len(data) > 0:
                try:
                    df = pd.DataFrame(data)
                    if df.empty or len(df.columns) == 0:
                        raise EmptyDatasetError(
                            f"JSON dataset '{filename}' produced an empty table."
                        )
                    return df
                except Exception as exc:
                    raise UnsupportedJsonStructureError(
                        f"Unsupported column-oriented JSON structure in '{filename}': {str(exc)}"
                    )
            raise UnsupportedJsonStructureError(
                f"JSON object in '{filename}' must contain an array under one of: {', '.join(WRAPPED_DATA_KEYS)}."
            )
    else:
        raise UnsupportedJsonStructureError(
            f"Uploaded JSON in '{filename}' must be a list of records or a wrapped object containing a list."
        )

    if not records or len(records) == 0:
        raise EmptyDatasetError(f"JSON dataset in '{filename}' contains 0 records.")

    if not all(isinstance(r, dict) for r in records):
        raise UnsupportedJsonStructureError(
            f"All elements in JSON array of '{filename}' must be JSON objects (key-value records)."
        )

    try:
        df = pd.DataFrame(records)
    except Exception as exc:
        raise MalformedDatasetError(
            f"Unable to convert JSON records into tabular format in '{filename}': {str(exc)}"
        )

    if df.empty or len(df.columns) == 0:
        raise EmptyDatasetError(f"Parsed JSON in '{filename}' yielded an empty dataset.")

    df.columns = [str(c).strip() for c in df.columns]
    return df
