"""In-memory CSV parser with encoding resilience and tabular validation."""
from io import BytesIO, StringIO
import pandas as pd
from app.core.exceptions import (
    EmptyDatasetError,
    MalformedDatasetError,
)

ENCODINGS_TO_TRY = ["utf-8", "utf-8-sig", "latin-1", "cp1252"]


def parse_csv_bytes(raw_bytes: bytes, filename: str = "dataset.csv") -> pd.DataFrame:
    """Parse raw CSV bytes entirely in memory.

    Guarantees:
    - Never writes raw data to disk
    - Detects empty and corrupt files
    - Handles encoding variations gracefully
    """
    if not raw_bytes or len(raw_bytes.strip()) == 0:
        raise EmptyDatasetError(f"Uploaded CSV file '{filename}' is empty.")

    decoded_text = None
    for enc in ENCODINGS_TO_TRY:
        try:
            decoded_text = raw_bytes.decode(enc)
            break
        except UnicodeDecodeError:
            continue

    if decoded_text is None:
        raise MalformedDatasetError(
            f"Unable to decode CSV file '{filename}' using supported encodings (UTF-8, Latin-1, CP1252)."
        )

    # Check for empty content after decoding
    if not decoded_text.strip():
        raise EmptyDatasetError(f"Uploaded CSV file '{filename}' contains no readable content.")

    try:
        # Read into pandas DataFrame
        df = pd.read_csv(StringIO(decoded_text))
    except Exception as exc:
        raise MalformedDatasetError(f"Failed to parse CSV file '{filename}': {str(exc)}")

    if df.empty or len(df.columns) == 0:
        raise EmptyDatasetError(
            f"Uploaded CSV file '{filename}' contains no tabular rows or columns."
        )

    # Clean whitespace in column headers
    df.columns = [str(c).strip() for c in df.columns]

    return df
