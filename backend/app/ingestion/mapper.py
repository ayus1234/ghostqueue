"""Centralized schema detection and canonical field mapping layer."""
import re
from typing import Dict, List, Tuple
from app.models.schemas import FieldMappingDetail

# Canonical fields and their recognized aliases (in priority order)
CANONICAL_ALIASES: Dict[str, List[str]] = {
    "offered": [
        "offered",
        "calls_offered",
        "interactions",
        "arrivals",
        "total_interactions",
        "calls_received",
        "volume",
        "incoming",
        "presented",
        "requests",
    ],
    "completed": [
        "answered",
        "calls_answered",
        "connected",
        "completed",
        "handled",
        "calls_handled",
        "resolved",
        "serviced",
        "success",
    ],
    "abandoned": [
        "abandoned",
        "calls_abandoned",
        "abandonments",
        "hangup",
        "dropped",
        "lost_calls",
        "missed_calls",
        "ghost",
    ],
    "wait_time": [
        "wait_time",
        "asa_sec",
        "asa",
        "average_speed_of_answer",
        "queue_duration_sec",
        "queue_duration",
        "average_wait",
        "avg_wait",
        "avg_wait_sec",
        "queue_time",
        "hold_time",
        "waiting_time",
        "delay_seconds",
        "wait_seconds",
        "wait_duration",
        "wait",
    ],
    "queue": [
        "queue",
        "queue_name",
        "queue_id",
        "skill_group",
        "skill",
        "department",
        "service",
        "line",
        "stage",
        "process_step",
    ],
    "timestamp": [
        "timestamp",
        "datetime",
        "interval_start",
        "interval_time",
        "start_time",
        "call_datetime",
        "call_date",
        "date",
        "time",
        "created_at",
        "event_time",
        "arrival_time",
        "interval",
    ],
    "session_id": [
        "session_id",
        "contact_id",
        "contact_identifier",
        "interaction_id",
        "call_id",
        "ticket_id",
        "customer_id",
        "id",
    ],
    "event_type": [
        "event",
        "event_type",
        "outcome",
        "action",
        "status",
        "disposition",
        "step",
    ],
    "service_time": [
        "aht_sec",
        "aht",
        "service_time",
        "handle_time",
        "duration",
        "talk_time",
        "call_duration",
    ],
    "agents_available": [
        "agents_staffed",
        "staffing",
        "agents",
        "agents_available",
        "capacity",
        "headcount",
        "operators",
        "logged_in",
    ],
}


def normalize_column_name(col: str) -> str:
    """Normalize column header into clean snake_case."""
    cleaned = re.sub(r"[^\w\s-]", "", col.strip().lower())
    cleaned = re.sub(r"[-\s]+", "_", cleaned)
    return cleaned.strip("_")


def map_columns(
    raw_columns: List[str],
) -> Tuple[Dict[str, str], List[FieldMappingDetail], List[str]]:
    """Map raw dataset columns to canonical concepts.

    Returns:
        canonical_to_source: Dict mapping canonical field -> original column name
        mapping_details: List of FieldMappingDetail explaining each match
        unmapped_columns: List of original column names that were not mapped
    """
    canonical_to_source: Dict[str, str] = {}
    mapping_details: List[FieldMappingDetail] = []
    used_columns = set()

    normalized_map = {col: normalize_column_name(col) for col in raw_columns}

    # Pass 1: Exact matches and alias matches in priority order
    for canonical_field, aliases in CANONICAL_ALIASES.items():
        if canonical_field in canonical_to_source:
            continue

        # Check exact match with canonical field name first
        matched = False
        for col, norm in normalized_map.items():
            if col in used_columns:
                continue
            if norm == canonical_field:
                canonical_to_source[canonical_field] = col
                used_columns.add(col)
                mapping_details.append(
                    FieldMappingDetail(
                        canonical_field=canonical_field,
                        source_column=col,
                        confidence=1.0,
                        match_type="exact",
                    )
                )
                matched = True
                break
        if matched:
            continue

        # Check aliases in defined priority order
        for alias in aliases:
            for col, norm in normalized_map.items():
                if col in used_columns:
                    continue
                if norm == alias:
                    canonical_to_source[canonical_field] = col
                    used_columns.add(col)
                    mapping_details.append(
                        FieldMappingDetail(
                            canonical_field=canonical_field,
                            source_column=col,
                            confidence=0.95,
                            match_type="alias",
                        )
                    )
                    matched = True
                    break
            if matched:
                break

    # Pass 2: Substring matching for unmapped canonical fields
    for canonical_field, aliases in CANONICAL_ALIASES.items():
        if canonical_field in canonical_to_source:
            continue

        for col, norm in normalized_map.items():
            if col in used_columns:
                continue

            # Skip percentage / rate / probability columns when mapping wait_time or counts
            if canonical_field in ("wait_time", "offered", "abandoned", "completed"):
                if any(x in norm for x in ("pct", "percent", "rate", "prob", "intensity")):
                    continue

            # Skip ID columns when mapping timestamp
            if canonical_field == "timestamp":
                if norm.endswith("_id") or norm == "id":
                    continue

            for alias in aliases:
                # Require at least 4 characters or exact word boundary
                if (len(alias) > 3 and alias in norm) or (len(norm) > 3 and norm in alias):
                    canonical_to_source[canonical_field] = col
                    used_columns.add(col)
                    mapping_details.append(
                        FieldMappingDetail(
                            canonical_field=canonical_field,
                            source_column=col,
                            confidence=0.75,
                            match_type="substring",
                        )
                    )
                    break
            if canonical_field in canonical_to_source:
                break

    unmapped_columns = [col for col in raw_columns if col not in used_columns]
    return canonical_to_source, mapping_details, unmapped_columns


def detect_record_type(mapped: Dict[str, str]) -> str:
    """Determine whether the dataset represents aggregate metrics or discrete event journeys."""
    has_session = "session_id" in mapped
    has_event = "event_type" in mapped
    has_aggregate = "offered" in mapped or "abandoned" in mapped

    if has_session and has_event:
        return "event"
    elif has_aggregate:
        return "aggregate"
    elif has_session:
        return "event"
    return "unknown"
