"""Dataset capability detection and profiling logic."""
from typing import Dict, List
import pandas as pd
from app.models.schemas import DatasetCapabilities, DatasetProfile
from app.ingestion.mapper import normalize_column_name, detect_record_type


def evaluate_capabilities(
    mapped: Dict[str, str], record_type: str, df: pd.DataFrame
) -> DatasetCapabilities:
    """Evaluate what features this dataset can genuinely support without fabrication."""
    has_offered = "offered" in mapped
    has_abandoned = "abandoned" in mapped
    has_completed = "completed" in mapped
    has_queue = "queue" in mapped
    has_timestamp = "timestamp" in mapped
    has_session = "session_id" in mapped
    has_event = "event_type" in mapped
    has_staffing = "agents_available" in mapped

    # Core analytics requires abandonment information and total volume
    if record_type == "aggregate":
        core_analytics = (has_offered and has_abandoned) or (
            has_completed and has_abandoned
        )
    elif record_type == "event":
        core_analytics = has_event or has_abandoned
    else:
        core_analytics = False

    # Ghost zones requires a grouping dimension and abandonment data
    ghost_zones = has_queue and core_analytics

    # Ghost Replay strictly requires event/session level logs with multiple steps or events
    # Never claim replay is available for aggregate records
    ghost_replay = False
    if record_type == "event" and has_session and (has_event or has_timestamp):
        # Verify that there are sessions with multiple events/steps
        session_col = mapped["session_id"]
        if session_col in df.columns and len(df) > 0:
            counts = df[session_col].value_counts()
            if len(counts) > 0 and (counts > 1).any():
                ghost_replay = True

    # Time series requires a timestamp or interval column
    time_series = has_timestamp

    # Queue analysis requires queue/stage column
    queue_analysis = has_queue

    # Staffing analysis requires agents/headcount column
    staffing_analysis = has_staffing

    # Simulation inputs requires baseline volume and abandonment rate
    simulation_inputs = core_analytics

    return DatasetCapabilities(
        core_analytics=core_analytics,
        ghost_zones=ghost_zones,
        ghost_replay=ghost_replay,
        time_series=time_series,
        queue_analysis=queue_analysis,
        staffing_analysis=staffing_analysis,
        simulation_inputs=simulation_inputs,
    )


def create_dataset_profile(
    dataset_name: str,
    file_format: str,
    df: pd.DataFrame,
    mapped_fields: Dict[str, str],
    unmapped_fields: List[str],
) -> DatasetProfile:
    """Construct complete dataset profile containing schema mapping and capability flags."""
    record_type = detect_record_type(mapped_fields)
    capabilities = evaluate_capabilities(mapped_fields, record_type, df)

    original_cols = list(df.columns)
    normalized_cols = [normalize_column_name(col) for col in original_cols]

    return DatasetProfile(
        dataset_name=dataset_name,
        format=file_format.lower(),
        row_count=len(df),
        column_count=len(original_cols),
        original_columns=original_cols,
        normalized_columns=normalized_cols,
        mapped_fields=mapped_fields,
        unmapped_fields=unmapped_fields,
        record_type=record_type,
        capabilities=capabilities,
    )
