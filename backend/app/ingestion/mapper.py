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
        "wait",
        "wait_time",
        "average_wait",
        "avg_wait",
        "asa",
        "average_speed_of_answer",
        "queue_time",
        "hold_time",
        "waiting_time",
        "delay_seconds",
        "wait_seconds",
    ],
    "queue": [
        "queue",
        "queue_name",
        "skill",
        "skill_group",
        "department",
        "service",
        "line",
        "stage",
        "process_step",
    ],
    "timestamp": [
        "timestamp",
        "datetime",
        "date",
        "time",
        "interval",
        "start_time",
        "call_time",
        "created_at",
        "event_time",
        "arrival_time",
    ],
    "session_id": [
        "session_id",
        "interaction_id",
        "call_id",
        "contact_id",
        "ticket_id",
        "customer_id",
        "id",
    ],
    "event_type": [
        "event",
        "event_type",
        "action",
        "status",
        "disposition",
        "outcome",
        "step",
    ],
    "service_time": [
        "service_time",
        "handle_time",
        "duration",
        "talk_time",
        "aht",
        "call_duration",
    ],
    "agents_available": [
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

    # Pass 1: Exact matches and alias matches
    for canonical_field, aliases in CANONICAL_ALIASES.items():
        if canonical_field in canonical_to_source:
            continue

        for col, norm in normalized_map.items():
            if col in used_columns:
                continue

            # Exact match with canonical field name
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
                break

            # Exact match with known alias
            if norm in aliases:
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
                break

    # Pass 2: Substring matching for unmapped canonical fields
    for canonical_field, aliases in CANONICAL_ALIASES.items():
        if canonical_field in canonical_to_source:
            continue

        for col, norm in normalized_map.items():
            if col in used_columns:
                continue

            for alias in aliases:
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
