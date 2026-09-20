"""Dataset adapters for loading registered benchmark and fixture datasets into memory."""
from typing import Tuple
import os
import pandas as pd
from app.ingestion.datasets.registry import get_dataset_entry, resolve_fixture_path
from app.ingestion.parser import parse_dataset
from app.core.exceptions import DatasetNotFoundError


def load_registered_fixture(dataset_id: str) -> Tuple[pd.DataFrame, str]:
    """Load a registered dataset fixture into an in-memory DataFrame.

    Returns:
        Tuple of (DataFrame, format_string)
    """
    entry = get_dataset_entry(dataset_id)
    if not entry:
        raise DatasetNotFoundError(f"Dataset '{dataset_id}' not found in registry.")

    resolved_path = resolve_fixture_path(entry.fixture_path)
    if not os.path.exists(resolved_path):
        raise DatasetNotFoundError(
            f"Fixture file for '{dataset_id}' not found at '{entry.fixture_path}'."
        )

    with open(resolved_path, "rb") as f:
        content = f.read()

    filename = os.path.basename(resolved_path)
    return parse_dataset(filename, content)
