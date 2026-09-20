"""Ghost Replay engine reconstructing chronological user journeys and discovering ghost points."""
from typing import Dict, List, Optional, Any, Tuple
import json
import statistics
import pandas as pd
from app.models.schemas import (
    ReplayEventDetail,
    GhostPointDetail,
    SessionReplayResponse,
    ReplayAnalysisResponse,
    PrivacyStatus,
)
from app.ingestion.mapper import map_columns

ABANDON_KEYWORDS = {
    "abandon",
    "abandoned",
    "hangup",
    "dropped",
    "canceled",
    "cancelled",
    "timeout",
    "timed_out",
    "give_up",
    "left_queue",
    "ghost",
    "user_abandoned",
    "caller_hangup",
}

COMPLETION_KEYWORDS = {
    "completed",
    "complete",
    "resolved",
    "handled",
    "success",
    "finished",
    "discharged",
    "closed",
    "call_resolved",
    "transaction_success",
    "service_completed",
}


def _matches_keywords(value: Any, keywords: set) -> bool:
    """Check if a string or field contains any of the target keywords."""
    if value is None or pd.isna(value):
        return False
    val_str = str(value).strip().lower()
    return any(k in val_str for k in keywords)


def _parse_metadata(val: Any) -> Dict[str, Any]:
    """Safely parse metadata from dict, JSON string, or empty value."""
    if isinstance(val, dict):
        return val
    if isinstance(val, str) and val.strip():
        try:
            parsed = json.loads(val)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            return {"raw": val}
    return {}


def analyze_session_journey(
    session_id: str,
    events_df: pd.DataFrame,
    col_map: Dict[str, str],
) -> SessionReplayResponse:
    """Analyze a single session's chronological events and determine terminal outcome and ghost point.

    Outcome Rules:
    - Explicit abandonment event -> 'abandoned'
    - Explicit completion event -> 'completed'
    - No terminal event -> 'unresolved'
    - NEVER infer unresolved = abandoned
    """
    ts_col = col_map.get("timestamp")
    event_col = col_map.get("event_type") or "event_type"
    queue_col = col_map.get("queue")
    stage_col = "stage" if "stage" in events_df.columns else queue_col
    status_col = "status" if "status" in events_df.columns else event_col
    wait_col = col_map.get("wait_time")
    actor_col = "actor" if "actor" in events_df.columns else None
    meta_col = "metadata" if "metadata" in events_df.columns else None

    # Parse and sort chronologically
    df_sorted = events_df.copy()
    if ts_col and ts_col in df_sorted.columns:
        df_sorted["_parsed_ts"] = pd.to_datetime(df_sorted[ts_col], errors="coerce")
        df_sorted = df_sorted.sort_values(by="_parsed_ts")
    else:
        df_sorted["_parsed_ts"] = pd.NaT

    start_dt = df_sorted["_parsed_ts"].dropna().iloc[0] if df_sorted["_parsed_ts"].notna().any() else None

    event_details: List[ReplayEventDetail] = []
    queues_seen: List[str] = []
    stages_seen: List[str] = []

    abandonment_step: Optional[Tuple[int, dict, float, float]] = None  # (index, row_dict, elapsed_sec, wait_sec)
    completion_step: Optional[Tuple[int, dict, float]] = None

    for idx, (_, row) in enumerate(df_sorted.iterrows()):
        curr_dt = row["_parsed_ts"]
        if pd.notna(curr_dt) and start_dt is not None:
            elapsed_sec = max(0.0, float((curr_dt - start_dt).total_seconds()))
        else:
            elapsed_sec = float(idx * 60.0)

        ev_type = str(row[event_col]) if event_col and event_col in row and pd.notna(row[event_col]) else "event"
        q_val = str(row[queue_col]) if queue_col and queue_col in row and pd.notna(row[queue_col]) else None
        stg_val = str(row[stage_col]) if stage_col and stage_col in row and pd.notna(row[stage_col]) else (q_val or "General")
        st_val = str(row[status_col]) if status_col and status_col in row and pd.notna(row[status_col]) else ev_type

        wait_sec = 0.0
        if wait_col and wait_col in row and pd.notna(row[wait_col]):
            try:
                wait_sec = float(row[wait_col])
            except (ValueError, TypeError):
                wait_sec = 0.0

        actor_val = str(row[actor_col]) if actor_col and actor_col in row and pd.notna(row[actor_col]) else None
        metadata = _parse_metadata(row[meta_col]) if meta_col and meta_col in row else {}

        if q_val and q_val not in queues_seen:
            queues_seen.append(q_val)
        if stg_val and stg_val not in stages_seen:
            stages_seen.append(stg_val)

        event_id = str(row["event_id"]) if "event_id" in row and pd.notna(row["event_id"]) else f"EVT-{idx+1}"
        ts_str = str(row[ts_col]) if ts_col and ts_col in row and pd.notna(row[ts_col]) else str(idx)

        # Check for terminal events
        is_abandon = _matches_keywords(ev_type, ABANDON_KEYWORDS) or _matches_keywords(st_val, ABANDON_KEYWORDS)
        is_complete = _matches_keywords(ev_type, COMPLETION_KEYWORDS) or _matches_keywords(st_val, COMPLETION_KEYWORDS)

        row_dict = {
            "stage": stg_val,
            "queue": q_val or stg_val,
            "event_type": ev_type,
            "status": st_val,
            "wait_duration_seconds": wait_sec,
            "metadata": metadata,
        }

        if is_abandon:
            abandonment_step = (idx, row_dict, elapsed_sec, wait_sec)
        elif is_complete:
            completion_step = (idx, row_dict, elapsed_sec)

        event_details.append(
            ReplayEventDetail(
                step_index=idx + 1,
                event_id=event_id,
                timestamp=ts_str,
                elapsed_seconds=elapsed_sec,
                event_type=ev_type,
                queue=q_val,
                stage=stg_val,
                status=st_val,
                wait_duration_seconds=wait_sec,
                actor=actor_val,
                metadata=metadata,
            )
        )

    # Journey duration
    if len(event_details) > 0:
        journey_duration = event_details[-1].elapsed_seconds
    else:
        journey_duration = 0.0

    # Determine outcome
    outcome = "unresolved"
    terminal_detected = False
    ghost_point: Optional[GhostPointDetail] = None
    time_to_abandon: Optional[float] = None
    last_state: Optional[Dict[str, Any]] = None

    if abandonment_step is not None and completion_step is not None:
        # If both present, outcome follows the later terminal event
        if abandonment_step[0] > completion_step[0]:
            outcome = "abandoned"
            terminal_detected = True
        else:
            outcome = "completed"
            terminal_detected = True
    elif abandonment_step is not None:
        outcome = "abandoned"
        terminal_detected = True
    elif completion_step is not None:
        outcome = "completed"
        terminal_detected = True
    else:
        outcome = "unresolved"
        terminal_detected = False

    # Ghost point calculation for abandoned sessions
    if outcome == "abandoned" and abandonment_step is not None:
        step_idx, r_dict, elapsed_sec, w_sec = abandonment_step
        time_to_abandon = elapsed_sec

        # State immediately preceding or at the abandonment
        prev_idx = max(0, step_idx - 1)
        prev_event = event_details[prev_idx] if prev_idx < len(event_details) else None
        last_state = {
            "prior_stage": prev_event.stage if prev_event else r_dict["stage"],
            "prior_queue": prev_event.queue if prev_event else r_dict["queue"],
            "prior_status": prev_event.status if prev_event else r_dict["status"],
            "abandon_stage": r_dict["stage"],
            "abandon_queue": r_dict["queue"],
            "step_index": step_idx + 1,
        }

        exit_trigger = None
        if "reason" in r_dict["metadata"]:
            exit_trigger = str(r_dict["metadata"]["reason"])
        elif "exit_trigger" in r_dict["metadata"]:
            exit_trigger = str(r_dict["metadata"]["exit_trigger"])

        ghost_point = GhostPointDetail(
            stage=r_dict["stage"],
            queue=r_dict["queue"],
            step_index=step_idx + 1,
            event_type=r_dict["event_type"],
            wait_duration_seconds=w_sec,
            time_to_abandonment_seconds=elapsed_sec,
            last_observed_state=last_state,
            exit_trigger=exit_trigger,
        )
    elif len(event_details) > 0:
        # Last observed state for non-abandoned
        last_ev = event_details[-1]
        last_state = {
            "stage": last_ev.stage,
            "queue": last_ev.queue,
            "status": last_ev.status,
            "elapsed_seconds": last_ev.elapsed_seconds,
            "step_index": len(event_details),
        }

    return SessionReplayResponse(
        session_id=session_id,
        outcome=outcome,
        terminal_event_detected=terminal_detected,
        total_steps=len(event_details),
        journey_duration_seconds=journey_duration,
        time_to_abandonment_seconds=time_to_abandon,
        ghost_point=ghost_point,
        last_observed_state=last_state,
        queues_traversed=queues_seen,
        stages_traversed=stages_seen,
        events=event_details,
    )


def run_replay_analysis(
    df: pd.DataFrame,
    session_sample_limit: int = 50,
) -> ReplayAnalysisResponse:
    """Analyze multi-event dataset and compute aggregate Ghost Replay metrics.

    Guarantees:
    - Pure in-memory streaming
    - Zero persistence of raw data
    - Never infers unresolved = abandoned
    """
    mapped_fields, _, _ = map_columns(list(df.columns))
    session_col = mapped_fields.get("session_id") or ("session_id" if "session_id" in df.columns else None)

    if not session_col or session_col not in df.columns:
        # Fallback: treat entire dataframe as a single session
        session_col = "_auto_session_id"
        df = df.copy()
        df[session_col] = "SES-DEFAULT-001"

    grouped = df.groupby(session_col)
    total_sessions = len(grouped)

    completed_count = 0
    abandoned_count = 0
    unresolved_count = 0

    times_to_abandon: List[float] = []
    abandon_by_stage: Dict[str, int] = {}
    abandon_by_queue: Dict[str, int] = {}
    reconstructed_sessions: List[SessionReplayResponse] = []

    for s_id, group_df in grouped:
        sess_str = str(s_id)
        sess_result = analyze_session_journey(sess_str, group_df, mapped_fields)

        if sess_result.outcome == "completed":
            completed_count += 1
        elif sess_result.outcome == "abandoned":
            abandoned_count += 1
            if sess_result.time_to_abandonment_seconds is not None:
                times_to_abandon.append(sess_result.time_to_abandonment_seconds)
            if sess_result.ghost_point:
                stg = sess_result.ghost_point.stage
                q = sess_result.ghost_point.queue
                abandon_by_stage[stg] = abandon_by_stage.get(stg, 0) + 1
                abandon_by_queue[q] = abandon_by_queue.get(q, 0) + 1
        else:
            unresolved_count += 1

        if len(reconstructed_sessions) < session_sample_limit:
            reconstructed_sessions.append(sess_result)

    resolved_total = completed_count + abandoned_count
    abandonment_rate = (
        round((abandoned_count / resolved_total) * 100.0, 2)
        if resolved_total > 0
        else 0.0
    )

    avg_time_abandon = (
        round(float(sum(times_to_abandon) / len(times_to_abandon)), 2)
        if times_to_abandon
        else None
    )
    median_time_abandon = (
        round(float(statistics.median(times_to_abandon)), 2)
        if times_to_abandon
        else None
    )

    common_stage = (
        max(abandon_by_stage.items(), key=lambda x: x[1])[0]
        if abandon_by_stage
        else None
    )
    common_queue = (
        max(abandon_by_queue.items(), key=lambda x: x[1])[0]
        if abandon_by_queue
        else None
    )

    return ReplayAnalysisResponse(
        total_sessions=total_sessions,
        completed=completed_count,
        abandoned=abandoned_count,
        unresolved=unresolved_count,
        abandonment_rate_resolved=abandonment_rate,
        avg_time_to_abandonment_seconds=avg_time_abandon,
        median_time_to_abandonment_seconds=median_time_abandon,
        common_ghost_stage=common_stage,
        common_ghost_queue=common_queue,
        abandonment_by_stage=abandon_by_stage,
        abandonment_by_queue=abandon_by_queue,
        sample_sessions=reconstructed_sessions,
        privacy_status=PrivacyStatus(),
    )


def replay_single_session_from_df(
    df: pd.DataFrame,
    target_session_id: str,
) -> Optional[SessionReplayResponse]:
    """Reconstruct a specific session journey by session_id from an in-memory DataFrame."""
    mapped_fields, _, _ = map_columns(list(df.columns))
    session_col = mapped_fields.get("session_id") or ("session_id" if "session_id" in df.columns else None)

    if not session_col or session_col not in df.columns:
        return None

    matching = df[df[session_col].astype(str) == str(target_session_id)]
    if matching.empty:
        return None

    return analyze_session_journey(str(target_session_id), matching, mapped_fields)
