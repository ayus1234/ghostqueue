"""Tests for dataset capability detection."""
import pandas as pd
from app.ingestion.profiler import evaluate_capabilities


def test_aggregate_dataset_ghost_replay_is_false():
    df = pd.DataFrame({
        "queue": ["Support"],
        "offered": [100],
        "abandoned": [15],
    })
    mapped = {"queue": "queue", "offered": "offered", "abandoned": "abandoned"}
    caps = evaluate_capabilities(mapped, "aggregate", df)

    assert caps.core_analytics is True
    assert caps.ghost_zones is True
    assert caps.ghost_replay is False  # Aggregate cannot support replay


def test_event_dataset_with_multi_steps_has_replay():
    df = pd.DataFrame({
        "session_id": ["sess_1", "sess_1", "sess_2", "sess_2"],
        "timestamp": ["09:00", "09:02", "09:05", "09:06"],
        "event_type": ["enter", "abandoned", "enter", "completed"],
    })
    mapped = {
        "session_id": "session_id",
        "timestamp": "timestamp",
        "event_type": "event_type",
    }
    caps = evaluate_capabilities(mapped, "event", df)

    assert caps.ghost_replay is True
