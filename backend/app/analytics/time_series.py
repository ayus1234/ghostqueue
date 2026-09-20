"""Time-series abandonment and peak interval analysis."""
from typing import Dict, List, Optional, Tuple
import pandas as pd
from app.models.schemas import TimeAnalysisResult, TimePeriodAnalytics


def extract_time_period(val: any) -> Optional[str]:
    """Extract a consistent time period string (e.g. '14:00', '2026-03-15 14:00', or date)."""
    if pd.isna(val):
        return None
    val_str = str(val).strip()
    if not val_str:
        return None

    # Try parsing via pandas to_datetime
    try:
        dt = pd.to_datetime(val_str, errors="coerce")
        if pd.notna(dt):
            # If original string was just a time like "09:00", return hour
            if len(val_str) <= 8 and ":" in val_str:
                return dt.strftime("%H:00")
            return dt.strftime("%Y-%m-%d %H:00")
    except Exception:
        pass

    # Fallback: if value contains hour-like pattern
    if ":" in val_str:
        parts = val_str.split(":")
        return f"{parts[0].strip().zfill(2)}:00"

    return val_str[:16]


def analyze_time_series(
    df: pd.DataFrame, mapped_fields: Dict[str, str], record_type: str
) -> TimeAnalysisResult:
    """Analyze temporal abandonment patterns and discover peak abandonment periods."""
    if "timestamp" not in mapped_fields:
        return TimeAnalysisResult(
            available=False,
            reason="Timestamp or time interval column not present in dataset.",
        )

    ts_col = mapped_fields["timestamp"]
    if ts_col not in df.columns:
        return TimeAnalysisResult(
            available=False,
            reason=f"Mapped timestamp column '{ts_col}' not found in DataFrame.",
        )

    # Attempt to parse time periods
    try:
        periods_series = df[ts_col].apply(extract_time_period)
    except Exception as exc:
        return TimeAnalysisResult(
            available=False,
            reason=f"Failed to parse time representations: {str(exc)}",
        )

    valid_mask = periods_series.notna()
    if not valid_mask.any():
        return TimeAnalysisResult(
            available=False,
            reason="Could not parse valid timestamps or time intervals from timestamp column.",
        )

    work_df = df[valid_mask].copy()
    work_df["_period"] = periods_series[valid_mask]

    period_analytics: List[TimePeriodAnalytics] = []

    if record_type == "aggregate":
        offered_col = mapped_fields.get("offered")
        abandoned_col = mapped_fields.get("abandoned")
        completed_col = mapped_fields.get("completed")
        wait_col = mapped_fields.get("wait_time")

        for period, group in work_df.groupby("_period", sort=False):
            offered = 0
            if offered_col and offered_col in group.columns:
                offered = int(pd.to_numeric(group[offered_col], errors="coerce").fillna(0).sum())

            abandoned = 0
            if abandoned_col and abandoned_col in group.columns:
                abandoned = int(pd.to_numeric(group[abandoned_col], errors="coerce").fillna(0).sum())

            completed = 0
            if completed_col and completed_col in group.columns:
                completed = int(pd.to_numeric(group[completed_col], errors="coerce").fillna(0).sum())
            elif offered > 0:
                completed = max(0, offered - abandoned)

            if offered == 0 and (abandoned > 0 or completed > 0):
                offered = abandoned + completed

            ghost_rate = (abandoned / offered * 100.0) if offered > 0 else 0.0

            avg_wait = None
            if wait_col and wait_col in group.columns:
                num_wait = pd.to_numeric(group[wait_col], errors="coerce").dropna()
                if not num_wait.empty:
                    avg_wait = round(float(num_wait.mean()), 2)

            period_analytics.append(
                TimePeriodAnalytics(
                    period=str(period),
                    offered=offered,
                    abandoned=abandoned,
                    completed=completed,
                    ghost_rate=round(ghost_rate, 2),
                    avg_wait_time=avg_wait,
                )
            )
    else:
        # Event/session level temporal aggregation
        event_col = mapped_fields.get("event_type") or mapped_fields.get("abandoned")
        wait_col = mapped_fields.get("wait_time")

        for period, group in work_df.groupby("_period", sort=False):
            total_events = len(group)
            abandoned = 0

            if event_col and event_col in group.columns:
                abandoned = int(
                    group[event_col]
                    .astype(str)
                    .str.lower()
                    .str.contains("abandon|hangup|drop|cancel|timeout|ghost|miss", regex=True)
                    .sum()
                )

            completed = max(0, total_events - abandoned)
            ghost_rate = (abandoned / total_events * 100.0) if total_events > 0 else 0.0

            avg_wait = None
            if wait_col and wait_col in group.columns:
                num_wait = pd.to_numeric(group[wait_col], errors="coerce").dropna()
                if not num_wait.empty:
                    avg_wait = round(float(num_wait.mean()), 2)

            period_analytics.append(
                TimePeriodAnalytics(
                    period=str(period),
                    offered=total_events,
                    abandoned=abandoned,
                    completed=completed,
                    ghost_rate=round(ghost_rate, 2),
                    avg_wait_time=avg_wait,
                )
            )

    if not period_analytics:
        return TimeAnalysisResult(
            available=False,
            reason="No valid interval records found after grouping.",
        )

    # Sort chronologically if possible
    try:
        period_analytics.sort(key=lambda x: str(x.period))
    except Exception:
        pass

    # Find peak abandonment period (highest volume)
    peak_abandonment = max(period_analytics, key=lambda x: x.abandoned)
    peak_abandonment_period = (
        peak_abandonment.period if peak_abandonment.abandoned > 0 else None
    )

    # Find peak ghost rate period (with minimum volume threshold of >= 3 interactions)
    meaningful_periods = [p for p in period_analytics if p.offered >= 3]
    if meaningful_periods:
        peak_rate = max(meaningful_periods, key=lambda x: x.ghost_rate)
        peak_ghost_rate_period = peak_rate.period if peak_rate.ghost_rate > 0 else None
    else:
        peak_ghost_rate_period = (
            peak_abandonment.period if peak_abandonment.ghost_rate > 0 else None
        )

    return TimeAnalysisResult(
        available=True,
        period_type="interval",
        peak_abandonment_period=peak_abandonment_period,
        peak_ghost_rate_period=peak_ghost_rate_period,
        periods=period_analytics,
    )
