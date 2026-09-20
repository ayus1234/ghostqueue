"""Core analytics engine computing Ghost Rate, KPIs, and coordinating analytical modules."""
from typing import Dict, List, Optional, Tuple
import pandas as pd
from app.models.schemas import (
    AnalyticalSummary,
    DatasetAnalysisResponse,
    PrivacyStatus,
)
from app.ingestion.mapper import map_columns, detect_record_type
from app.ingestion.profiler import create_dataset_profile
from app.analytics.zones import calculate_ghost_zones
from app.analytics.time_series import analyze_time_series


def calculate_summary_metrics(
    df: pd.DataFrame, mapped_fields: Dict[str, str], record_type: str
) -> AnalyticalSummary:
    """Calculate core abandonment metrics from canonical representation.

    Guarantees:
    - Never fabricates missing values
    - Guards against division by zero
    - Explicitly documents unsupported metrics
    """
    unsupported_metrics: Dict[str, str] = {}
    total_offered: Optional[int] = None
    total_completed: Optional[int] = None
    total_abandoned: Optional[int] = None
    ghost_rate: Optional[float] = None
    avg_wait_seconds: Optional[float] = None

    if record_type == "aggregate":
        offered_col = mapped_fields.get("offered")
        abandoned_col = mapped_fields.get("abandoned")
        completed_col = mapped_fields.get("completed")
        wait_col = mapped_fields.get("wait_time")

        if abandoned_col and abandoned_col in df.columns:
            total_abandoned = int(
                pd.to_numeric(df[abandoned_col], errors="coerce").fillna(0).sum()
            )
        else:
            unsupported_metrics["total_abandoned"] = (
                "No abandoned or hangup column mapped from dataset."
            )

        if offered_col and offered_col in df.columns:
            total_offered = int(
                pd.to_numeric(df[offered_col], errors="coerce").fillna(0).sum()
            )
        elif completed_col and completed_col in df.columns and total_abandoned is not None:
            comp = int(pd.to_numeric(df[completed_col], errors="coerce").fillna(0).sum())
            total_offered = comp + total_abandoned
        else:
            unsupported_metrics["total_offered"] = (
                "No offered, arrivals, or volume column mapped from dataset."
            )

        if completed_col and completed_col in df.columns:
            total_completed = int(
                pd.to_numeric(df[completed_col], errors="coerce").fillna(0).sum()
            )
        elif total_offered is not None and total_abandoned is not None:
            total_completed = max(0, total_offered - total_abandoned)
        else:
            unsupported_metrics["total_completed"] = (
                "No completed or answered column mapped from dataset."
            )

        # Calculate Ghost Rate
        if total_offered is not None and total_abandoned is not None:
            if total_offered > 0:
                ghost_rate = round((total_abandoned / total_offered) * 100.0, 2)
            else:
                ghost_rate = 0.0
        else:
            unsupported_metrics["ghost_rate"] = (
                "Cannot compute Ghost Rate without offered and abandoned totals."
            )

        # Calculate average wait time (weighted by volume if volume is present)
        if wait_col and wait_col in df.columns:
            wait_series = pd.to_numeric(df[wait_col], errors="coerce")
            if offered_col and offered_col in df.columns:
                vol_series = pd.to_numeric(df[offered_col], errors="coerce").fillna(0)
                valid_mask = wait_series.notna() & (vol_series > 0)
                if valid_mask.any() and vol_series[valid_mask].sum() > 0:
                    avg_wait_seconds = round(
                        float(
                            (wait_series[valid_mask] * vol_series[valid_mask]).sum()
                            / vol_series[valid_mask].sum()
                        ),
                        2,
                    )
                elif wait_series.notna().any():
                    avg_wait_seconds = round(float(wait_series.dropna().mean()), 2)
            elif wait_series.notna().any():
                avg_wait_seconds = round(float(wait_series.dropna().mean()), 2)

        if avg_wait_seconds is None:
            unsupported_metrics["avg_wait_time_seconds"] = (
                "No valid wait time, hold time, or ASA values found in dataset."
            )

    else:
        # Event/session level metrics
        session_col = mapped_fields.get("session_id")
        event_col = mapped_fields.get("event_type") or mapped_fields.get("abandoned")
        wait_col = mapped_fields.get("wait_time")

        if session_col and session_col in df.columns:
            total_offered = int(df[session_col].nunique())
        else:
            total_offered = len(df)

        if event_col and event_col in df.columns:
            total_abandoned = int(
                df[event_col]
                .astype(str)
                .str.lower()
                .str.contains("abandon|hangup|drop|cancel|timeout|ghost|miss", regex=True)
                .sum()
            )
            total_completed = max(0, total_offered - total_abandoned)
        else:
            unsupported_metrics["total_abandoned"] = (
                "No event status or outcome column mapped from event dataset."
            )

        if total_offered is not None and total_abandoned is not None:
            ghost_rate = (
                round((total_abandoned / total_offered) * 100.0, 2)
                if total_offered > 0
                else 0.0
            )
        else:
            unsupported_metrics["ghost_rate"] = (
                "Cannot compute Ghost Rate without abandonment disposition indicators."
            )

        if wait_col and wait_col in df.columns:
            wait_series = pd.to_numeric(df[wait_col], errors="coerce").dropna()
            if not wait_series.empty:
                avg_wait_seconds = round(float(wait_series.mean()), 2)

        if avg_wait_seconds is None:
            unsupported_metrics["avg_wait_time_seconds"] = (
                "Wait time or duration column not present in event records."
            )

    return AnalyticalSummary(
        total_offered=total_offered,
        total_completed=total_completed,
        total_abandoned=total_abandoned,
        ghost_rate=ghost_rate,
        avg_wait_time_seconds=avg_wait_seconds,
        unsupported_metrics=unsupported_metrics,
    )


def run_full_analysis(
    df: pd.DataFrame, filename: str, format_str: str
) -> DatasetAnalysisResponse:
    """Execute end-to-end dataset profiling, mapping, core analytics, and zone discovery."""
    raw_columns = list(df.columns)
    mapped_fields, mapping_details, unmapped_fields = map_columns(raw_columns)
    record_type = detect_record_type(mapped_fields)

    profile = create_dataset_profile(
        dataset_name=filename,
        file_format=format_str,
        df=df,
        mapped_fields=mapped_fields,
        unmapped_fields=unmapped_fields,
    )

    summary = calculate_summary_metrics(df, mapped_fields, record_type)
    ghost_zones = calculate_ghost_zones(df, mapped_fields, record_type)
    time_analysis = analyze_time_series(df, mapped_fields, record_type)

    # Attach peak periods from time analysis into summary if available
    if time_analysis.available:
        summary.peak_abandonment_period = time_analysis.peak_abandonment_period
        summary.peak_ghost_rate_period = time_analysis.peak_ghost_rate_period

    warnings: List[str] = []
    if not profile.capabilities.core_analytics:
        warnings.append(
            "Dataset lacks critical abandonment or volume fields; core KPIs could not be fully calculated."
        )
    if not profile.capabilities.ghost_zones:
        warnings.append(
            "No queue or stage dimension mapped; Ghost Zone identification is unavailable."
        )
    if not profile.capabilities.ghost_replay:
        warnings.append(
            "Ghost Replay is unavailable for this dataset: discrete multi-event session journeys were not detected."
        )
    if not time_analysis.available:
        warnings.append(
            f"Time-series analysis unavailable: {time_analysis.reason}"
        )

    return DatasetAnalysisResponse(
        profile=profile,
        field_mapping=mapping_details,
        capabilities=profile.capabilities,
        summary=summary,
        ghost_zones=ghost_zones,
        time_analysis=time_analysis,
        privacy_status=PrivacyStatus(),
        warnings=warnings,
    )
