"""Comprehensive tests for Ghost Replay engine, ghost point detection, session reconstruction, and endpoints."""
import os
import json
import pytest
import pandas as pd
from io import BytesIO
from fastapi.testclient import TestClient
from app.main import app
from app.analytics.replay import run_replay_analysis, replay_single_session_from_df
from app.ingestion.datasets.adapters import load_registered_fixture


@pytest.fixture
def replay_events_df():
    """Load the synthetic replay journey fixture into a DataFrame."""
    df, _ = load_registered_fixture("synthetic-replay-demo")
    return df


def test_replay_completed_session(replay_events_df):
    """Verify that a session with explicit completion is marked completed."""
    session = replay_single_session_from_df(replay_events_df, "SES-COMP-101")
    assert session is not None
    assert session.session_id == "SES-COMP-101"
    assert session.outcome == "completed"
    assert session.terminal_event_detected is True
    assert session.total_steps == 4
    assert session.ghost_point is None
    assert session.journey_duration_seconds > 0.0
    assert len(session.events) == 4
    assert session.events[-1].status == "completed"


def test_replay_abandoned_session(replay_events_df):
    """Verify that a session with explicit hangup/abandon is marked abandoned with ghost point."""
    session = replay_single_session_from_df(replay_events_df, "SES-ABAN-201")
    assert session is not None
    assert session.session_id == "SES-ABAN-201"
    assert session.outcome == "abandoned"
    assert session.terminal_event_detected is True
    assert session.total_steps == 3
    assert session.ghost_point is not None

    # Ghost point assertions
    gp = session.ghost_point
    assert gp.stage == "Waiting_Room"
    assert gp.queue == "Support"
    assert gp.wait_duration_seconds == 210.0
    assert gp.time_to_abandonment_seconds == 255.0
    assert gp.exit_trigger == "caller_hangup"
    assert gp.last_observed_state["prior_stage"] == "Waiting_Room"


def test_replay_unresolved_session(replay_events_df):
    """Verify that a session with no terminal event is marked unresolved."""
    session = replay_single_session_from_df(replay_events_df, "SES-UNRES-301")
    assert session is not None
    assert session.session_id == "SES-UNRES-301"
    assert session.outcome == "unresolved"
    assert session.terminal_event_detected is False
    assert session.ghost_point is None
    assert session.total_steps == 2


def test_replay_never_infers_unresolved_as_abandoned(replay_events_df):
    """CRITICAL RULE: The engine must never classify an unresolved session as abandoned."""
    results = run_replay_analysis(replay_events_df)
    assert results.total_sessions == 10
    assert results.completed == 4
    assert results.abandoned == 4
    assert results.unresolved == 2

    # Abandonment rate must be calculated ONLY among resolved sessions
    # 4 abandoned / (4 completed + 4 abandoned) = 50.0%
    # If unresolved was incorrectly counted as abandoned, it would be 6 / 10 = 60.0%
    assert results.abandonment_rate_resolved == 50.0


def test_replay_multi_stage_journey(replay_events_df):
    """Verify cross-queue, multi-stage traversal in complex journeys."""
    session = replay_single_session_from_df(replay_events_df, "SES-MULTI-401")
    assert session is not None
    assert session.outcome == "completed"
    assert session.total_steps == 5
    assert len(session.queues_traversed) == 3
    assert "Front_Desk" in session.queues_traversed
    assert "Triage" in session.queues_traversed
    assert "Specialty_Care" in session.queues_traversed
    assert len(session.stages_traversed) == 5


def test_replay_long_wait_abandonment(replay_events_df):
    """Verify extreme wait time abandonment (22 minutes)."""
    session = replay_single_session_from_df(replay_events_df, "SES-LONG-501")
    assert session is not None
    assert session.outcome == "abandoned"
    assert session.ghost_point is not None
    assert session.ghost_point.wait_duration_seconds == 1320.0
    assert session.ghost_point.time_to_abandonment_seconds == 1440.0
    assert session.ghost_point.stage == "Hold_Queue"


def test_replay_aggregation_metrics(replay_events_df):
    """Verify aggregate replay statistics across all sessions."""
    analysis = run_replay_analysis(replay_events_df)
    assert analysis.total_sessions == 10
    assert analysis.completed == 4
    assert analysis.abandoned == 4
    assert analysis.unresolved == 2
    assert analysis.avg_time_to_abandonment_seconds is not None
    assert analysis.median_time_to_abandonment_seconds is not None
    assert analysis.common_ghost_stage is not None
    assert analysis.common_ghost_queue is not None
    assert len(analysis.abandonment_by_stage) == 4
    assert len(analysis.abandonment_by_queue) == 4


def test_replay_analyze_api_endpoint():
    """Test POST /api/v1/replay/analyze with uploaded JSON and CSV files."""
    client = TestClient(app)

    # Test with JSON
    json_path = "data/fixtures/synthetic_replay_journey.json"
    with open(json_path, "rb") as f:
        file_bytes = f.read()

    res = client.post(
        "/api/v1/replay/analyze",
        files={"file": ("journey.json", file_bytes, "application/json")},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_sessions"] == 10
    assert data["abandoned"] == 4
    assert data["completed"] == 4
    assert data["unresolved"] == 2
    assert data["privacy_status"]["persisted"] is False

    # Test with CSV
    csv_path = "data/fixtures/synthetic_replay_journey.csv"
    with open(csv_path, "rb") as f:
        csv_bytes = f.read()

    res_csv = client.post(
        "/api/v1/replay/analyze",
        files={"file": ("journey.csv", csv_bytes, "text/csv")},
    )
    assert res_csv.status_code == 200
    assert res_csv.json()["total_sessions"] == 10


def test_replay_session_api_endpoint():
    """Test POST /api/v1/replay/session reconstructing a single journey."""
    client = TestClient(app)

    json_path = "data/fixtures/synthetic_replay_journey.json"
    with open(json_path, "rb") as f:
        file_bytes = f.read()

    # Reconstruct SES-ABAN-201
    res = client.post(
        "/api/v1/replay/session",
        files={"file": ("journey.json", file_bytes, "application/json")},
        data={"session_id": "SES-ABAN-201"},
    )
    assert res.status_code == 200
    sess = res.json()
    assert sess["session_id"] == "SES-ABAN-201"
    assert sess["outcome"] == "abandoned"
    assert sess["ghost_point"]["stage"] == "Waiting_Room"

    # Test via query param
    res_query = client.post(
        "/api/v1/replay/session?session_id=SES-COMP-101",
        files={"file": ("journey.json", file_bytes, "application/json")},
    )
    assert res_query.status_code == 200
    assert res_query.json()["outcome"] == "completed"

    # Test non-existent session
    res_404 = client.post(
        "/api/v1/replay/session",
        files={"file": ("journey.json", file_bytes, "application/json")},
        data={"session_id": "NON-EXISTENT-SESSION"},
    )
    assert res_404.status_code == 404


def test_replay_privacy_zero_persistence():
    """Verify that replay endpoints process everything in memory without writing files."""
    client = TestClient(app)

    dummy_events = [
        {"session_id": "S1", "event_id": "E1", "timestamp": "2024-01-01 10:00:00", "event_type": "enter", "status": "in_progress"},
        {"session_id": "S1", "event_id": "E2", "timestamp": "2024-01-01 10:05:00", "event_type": "abandon", "status": "abandoned"},
    ]
    raw = json.dumps(dummy_events).encode("utf-8")

    res = client.post(
        "/api/v1/replay/analyze",
        files={"file": ("ephemeral_events.json", raw, "application/json")},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["privacy_status"]["persisted"] is False
    assert data["privacy_status"]["raw_data_retained"] is False
    assert not os.path.exists("ephemeral_events.json")
