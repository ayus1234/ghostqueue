"""Ghost Zone algorithmic detection, clustering, and severity classification."""
from typing import Dict, List, Optional
import pandas as pd
from app.models.schemas import GhostZoneItem


def classify_severity(abandoned: int, ghost_rate: float) -> tuple[str, str]:
    """Classify Ghost Zone operational severity using deterministic analytical heuristics.

    Note: These thresholds represent GhostQueue's internal analytical classification
    benchmarks and will become configurable via policy settings in later iterations.
    """
    if ghost_rate >= 20.0 or (abandoned >= 50 and ghost_rate >= 15.0):
        return (
            "high",
            f"High severity: Ghost Rate ({ghost_rate:.1f}%) exceeds 20% or substantial abandonment volume ({abandoned} dropped).",
        )
    elif ghost_rate >= 10.0 or abandoned >= 25:
        return (
            "medium",
            f"Medium severity: Ghost Rate ({ghost_rate:.1f}%) is elevated (10-20%) or volume ({abandoned} dropped) requires monitoring.",
        )
    else:
        return (
            "low",
            f"Low severity: Ghost Rate ({ghost_rate:.1f}%) remains below 10% threshold.",
        )


def calculate_ghost_zones(
    df: pd.DataFrame, mapped_fields: Dict[str, str], record_type: str
) -> List[GhostZoneItem]:
    """Identify operational bottlenecks (Ghost Zones) where abandonment concentrates."""
    if "queue" not in mapped_fields:
        return []

    dimension_col = mapped_fields["queue"]
    if dimension_col not in df.columns:
        return []

    zones: List[GhostZoneItem] = []

    if record_type == "aggregate":
        offered_col = mapped_fields.get("offered")
        abandoned_col = mapped_fields.get("abandoned")
        completed_col = mapped_fields.get("completed")
        wait_col = mapped_fields.get("wait_time")

        grouped = df.groupby(dimension_col, dropna=False)

        for zone_val, group in grouped:
            zone_name = str(zone_val) if pd.notna(zone_val) else "Unassigned / Default Queue"

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

            severity, rationale = classify_severity(abandoned, ghost_rate)

            zones.append(
                GhostZoneItem(
                    zone_name=zone_name,
                    grouping_dimension="queue",
                    offered=offered,
                    abandoned=abandoned,
                    completed=completed,
                    ghost_rate=round(ghost_rate, 2),
                    avg_wait_time=avg_wait,
                    severity=severity,
                    severity_rationale=rationale,
                )
            )
    else:
        # Event/session level grouping
        event_col = mapped_fields.get("event_type") or mapped_fields.get("abandoned")
        wait_col = mapped_fields.get("wait_time")
        session_col = mapped_fields.get("session_id")

        grouped = df.groupby(dimension_col, dropna=False)

        for zone_val, group in grouped:
            zone_name = str(zone_val) if pd.notna(zone_val) else "Unassigned / Default Stage"

            if session_col and session_col in group.columns:
                offered = int(group[session_col].nunique())
            else:
                offered = len(group)

            abandoned = 0
            if event_col and event_col in group.columns:
                abandoned = int(
                    group[event_col]
                    .astype(str)
                    .str.lower()
                    .str.contains("abandon|hangup|drop|cancel|timeout|ghost|miss", regex=True)
                    .sum()
                )

            completed = max(0, offered - abandoned)
            ghost_rate = (abandoned / offered * 100.0) if offered > 0 else 0.0

            avg_wait = None
            if wait_col and wait_col in group.columns:
                num_wait = pd.to_numeric(group[wait_col], errors="coerce").dropna()
                if not num_wait.empty:
                    avg_wait = round(float(num_wait.mean()), 2)

            severity, rationale = classify_severity(abandoned, ghost_rate)

            zones.append(
                GhostZoneItem(
                    zone_name=zone_name,
                    grouping_dimension="queue",
                    offered=offered,
                    abandoned=abandoned,
                    completed=completed,
                    ghost_rate=round(ghost_rate, 2),
                    avg_wait_time=avg_wait,
                    severity=severity,
                    severity_rationale=rationale,
                )
            )

    # Sort zones by meaningful abandonment signal: abandonment volume first, then ghost rate
    zones.sort(key=lambda z: (z.abandoned, z.ghost_rate), reverse=True)
    return zones
