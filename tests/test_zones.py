"""Tests for Ghost Zone detection and severity classification."""
import pandas as pd
from app.analytics.zones import calculate_ghost_zones, classify_severity


def test_classify_severity():
    high_sev, _ = classify_severity(abandoned=60, ghost_rate=15.0)
    assert high_sev == "high"

    high_sev_rate, _ = classify_severity(abandoned=10, ghost_rate=25.0)
    assert high_sev_rate == "high"

    med_sev, _ = classify_severity(abandoned=15, ghost_rate=12.0)
    assert med_sev == "medium"

    low_sev, _ = classify_severity(abandoned=2, ghost_rate=4.0)
    assert low_sev == "low"


def test_calculate_ghost_zones_ranking():
    df = pd.DataFrame({
        "queue": ["LowDropQueue", "HighDropQueue", "MidDropQueue"],
        "offered": [200, 100, 100],
        "abandoned": [5, 40, 20],
        "completed": [195, 60, 80],
        "wait": [10.0, 120.0, 45.0],
    })
    mapped = {
        "queue": "queue",
        "offered": "offered",
        "abandoned": "abandoned",
        "completed": "completed",
        "wait_time": "wait",
    }
    zones = calculate_ghost_zones(df, mapped, "aggregate")

    assert len(zones) == 3
    # First zone should be HighDropQueue due to highest abandoned volume (40)
    assert zones[0].zone_name == "HighDropQueue"
    assert zones[0].ghost_rate == 40.0
    assert zones[0].severity == "high"

    # Second zone should be MidDropQueue (20 dropped)
    assert zones[1].zone_name == "MidDropQueue"
    assert zones[1].severity == "high"  # 20.0% is >= 20%

    # Third zone should be LowDropQueue (5 dropped, 2.5% rate)
    assert zones[2].zone_name == "LowDropQueue"
    assert zones[2].severity == "low"
