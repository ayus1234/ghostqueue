"""Tests for temporal abandonment and peak period analysis."""
import pandas as pd
from app.analytics.time_series import analyze_time_series


def test_time_series_peak_detection():
    df = pd.DataFrame({
        "timestamp": [
            "2026-03-20 09:00:00",
            "2026-03-20 10:00:00",
            "2026-03-20 11:00:00",
        ],
        "offered": [100, 150, 80],
        "abandoned": [10, 45, 5],
        "completed": [90, 105, 75],
    })
    mapped = {
        "timestamp": "timestamp",
        "offered": "offered",
        "abandoned": "abandoned",
        "completed": "completed",
    }
    result = analyze_time_series(df, mapped, "aggregate")

    assert result.available is True
    assert len(result.periods) == 3
    # 10:00 had 45 abandoned (highest volume)
    assert result.peak_abandonment_period is not None
    assert "10:00" in result.peak_abandonment_period
    assert result.peak_ghost_rate_period is not None
    assert "10:00" in result.peak_ghost_rate_period


def test_time_series_missing_timestamp():
    df = pd.DataFrame({"queue": ["Queue1"], "offered": [10], "abandoned": [1]})
    mapped = {"queue": "queue", "offered": "offered", "abandoned": "abandoned"}
    result = analyze_time_series(df, mapped, "aggregate")

    assert result.available is False
    assert result.reason is not None
    assert "Timestamp or time interval column not present" in result.reason
