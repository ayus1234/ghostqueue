"""Tests for core analytics engine and summary calculations."""
import pandas as pd
from app.analytics.engine import calculate_summary_metrics, run_full_analysis


def test_core_analytics_aggregate():
    df = pd.DataFrame({
        "queue": ["Support", "Billing"],
        "offered": [100, 200],
        "completed": [80, 180],
        "abandoned": [20, 20],
        "wait_time": [60.0, 30.0],
    })
    mapped = {
        "queue": "queue",
        "offered": "offered",
        "completed": "completed",
        "abandoned": "abandoned",
        "wait_time": "wait_time",
    }
    summary = calculate_summary_metrics(df, mapped, "aggregate")

    assert summary.total_offered == 300
    assert summary.total_completed == 260
    assert summary.total_abandoned == 40
    # 40 / 300 * 100 = 13.33%
    assert summary.ghost_rate == 13.33
    # Weighted average wait: (60*100 + 30*200) / 300 = (6000 + 6000)/300 = 40.0
    assert summary.avg_wait_time_seconds == 40.0
    assert len(summary.unsupported_metrics) == 0


def test_core_analytics_division_by_zero():
    df = pd.DataFrame({
        "queue": ["Empty_Queue"],
        "offered": [0],
        "completed": [0],
        "abandoned": [0],
    })
    mapped = {"queue": "queue", "offered": "offered", "completed": "completed", "abandoned": "abandoned"}
    summary = calculate_summary_metrics(df, mapped, "aggregate")

    assert summary.total_offered == 0
    assert summary.total_abandoned == 0
    assert summary.ghost_rate == 0.0


def test_core_analytics_missing_wait_reports_none():
    df = pd.DataFrame({
        "queue": ["Sales"],
        "offered": [100],
        "abandoned": [25],
    })
    mapped = {"queue": "queue", "offered": "offered", "abandoned": "abandoned"}
    summary = calculate_summary_metrics(df, mapped, "aggregate")

    assert summary.ghost_rate == 25.0
    assert summary.avg_wait_time_seconds is None
    assert "avg_wait_time_seconds" in summary.unsupported_metrics
