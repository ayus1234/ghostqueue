"""Unified ingestion entrypoint delegating to CSV or JSON parsers."""
from typing import Tuple
import pandas as pd
from app.core.exceptions import UnsupportedFormatError
from app.ingestion.csv_parser import parse_csv_bytes
from app.ingestion.json_parser import parse_json_bytes


def parse_dataset(filename: str, content: bytes) -> Tuple[pd.DataFrame, str]:
    """Parse uploaded bytes into DataFrame based on file extension.

    Returns:
        Tuple of (pd.DataFrame, format_string)
    """
    lower_name = filename.lower()
    if lower_name.endswith(".csv"):
        return parse_csv_bytes(content, filename), "csv"
    elif lower_name.endswith(".json"):
        return parse_json_bytes(content, filename), "json"
    else:
        raise UnsupportedFormatError(
            f"Unsupported file format for '{filename}'. Only CSV and JSON formats are supported."
        )
