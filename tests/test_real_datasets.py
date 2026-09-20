"""Validation tests for the real CC0 Contact Center dataset and the Healthcare research schema fixture."""
import pytest
import pandas as pd
from fastapi.testclient import TestClient
from app.main import app
from app.ingestion.datasets.adapters import load_registered_fixture
from app.analytics.engine import run_full_analysis
from app.ingestion.mapper import map_columns, detect_record_type


def test_contact_center_erlang_dataset_validation():
    """Validate real public CC0 Contact Center Erlang C dataset through ingestion and analytics."""
    df, fmt = load_registered_fixture("contact-center-erlang")
    assert fmt == "csv"
    assert len(df) == 2400

    # Test column mapping
    mapped, details, unmapped = map_columns(list(df.columns))
    assert mapped["offered"] == "offered_calls"
    assert mapped["completed"] == "calls_answered"
    assert mapped["abandoned"] == "calls_abandoned"
    assert mapped["wait_time"] == "asa_sec"
    assert mapped["queue"] in ("queue_name", "queue_id")
    assert mapped["timestamp"] == "interval_start"
    assert mapped["service_time"] == "aht_sec"
    assert mapped["agents_available"] == "agents_staffed"

    assert detect_record_type(mapped) == "aggregate"

    # Run analytics
    analysis = run_full_analysis(df, "contact_center_erlang_merged.csv", fmt)

    # Validate volume totals and mathematical invariant
    assert analysis.summary.total_offered == 49121
    assert analysis.summary.total_completed == 48211
    assert analysis.summary.total_abandoned == 910
    assert analysis.summary.total_completed + analysis.summary.total_abandoned == analysis.summary.total_offered
    assert analysis.summary.ghost_rate == 1.85
    assert analysis.summary.avg_wait_time_seconds is not None

    # Validate ghost zones
    assert len(analysis.ghost_zones) == 4
    zone_names = {z.zone_name for z in analysis.ghost_zones}
    assert "Billing Support" in zone_names
    assert "Retention" in zone_names
    assert "Technical Support" in zone_names
    assert "Sales" in zone_names

    # Highest ghost rate zone is Retention
    retention_zone = next(z for z in analysis.ghost_zones if z.zone_name == "Retention")
    assert retention_zone.ghost_rate == 3.97
    assert retention_zone.offered == 6674
    assert retention_zone.abandoned == 265

    # Validate capability detection
    assert analysis.capabilities.core_analytics is True
    assert analysis.capabilities.ghost_zones is True
    assert analysis.capabilities.time_series is True
    assert analysis.capabilities.ghost_replay is False  # Correctly disabled for aggregate


def test_healthcare_synthetic_fixture_validation():
    """Validate synthetic healthcare fixture conforming to published JMIR study schema."""
    df, fmt = load_registered_fixture("healthcare-call-center-research")
    assert fmt == "csv"
    assert len(df) == 1200

    # Validate columns from published schema
    expected_cols = {
        "contact_id",
        "timestamp",
        "queue_duration_sec",
        "skill_group",
        "agent_id",
        "team_id",
        "outcome",
    }
    assert expected_cols.issubset(set(df.columns))

    mapped, details, _ = map_columns(list(df.columns))
    assert mapped["session_id"] == "contact_id"
    assert mapped["timestamp"] == "timestamp"
    assert mapped["wait_time"] == "queue_duration_sec"
    assert mapped["queue"] == "skill_group"
    assert mapped["event_type"] == "outcome"

    analysis = run_full_analysis(df, "synthetic_healthcare_operational.csv", fmt)

    assert analysis.summary.total_offered == 1200
    assert analysis.summary.total_abandoned == 131
    assert analysis.summary.total_completed == 1069
    assert analysis.summary.ghost_rate == 10.92
    assert analysis.summary.avg_wait_time_seconds is not None

    # Validate clinical skill group Ghost Zones
    assert len(analysis.ghost_zones) == 5
    zone_names = {z.zone_name for z in analysis.ghost_zones}
    assert "Oncology Intake" in zone_names
    assert "Cardiology Scheduling" in zone_names


def test_benchmark_api_endpoint():
    """Test POST /api/v1/datasets/benchmark/{dataset_id}/analyze endpoint."""
    client = TestClient(app)

    # Benchmark Contact Center
    res = client.post("/api/v1/datasets/benchmark/contact-center-erlang/analyze")
    assert res.status_code == 200
    payload = res.json()
    assert payload["mode"] == "tabular"
    assert payload["entry"]["dataset_id"] == "contact-center-erlang"
    assert payload["analysis"]["summary"]["total_offered"] == 49121

    # Benchmark Healthcare
    res_hc = client.post("/api/v1/datasets/benchmark/healthcare-call-center-research/analyze")
    assert res_hc.status_code == 200
    assert res_hc.json()["analysis"]["summary"]["total_offered"] == 1200

    # Benchmark Synthetic Replay Demo
    res_rp = client.post("/api/v1/datasets/benchmark/synthetic-replay-demo/analyze")
    assert res_rp.status_code == 200
    assert res_rp.json()["mode"] == "replay"
    assert res_rp.json()["replay"]["total_sessions"] == 10
