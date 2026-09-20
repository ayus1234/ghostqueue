"""API integration tests using TestClient and synthetic datasets."""
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
TEST_DATA_DIR = Path(__file__).parent / "test_data"


def test_api_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_api_analyze_csv_aggregate():
    csv_path = TEST_DATA_DIR / "synthetic_aggregate_queue.csv"
    with open(csv_path, "rb") as f:
        res = client.post(
            "/api/v1/datasets/analyze",
            files={"file": ("synthetic_aggregate_queue.csv", f, "text/csv")},
        )
    assert res.status_code == 200
    data = res.json()

    assert data["profile"]["row_count"] == 8
    assert data["profile"]["record_type"] == "aggregate"
    assert data["profile"]["capabilities"]["ghost_zones"] is True
    assert data["profile"]["capabilities"]["ghost_replay"] is False

    # Check summary metrics
    summary = data["summary"]
    assert summary["total_offered"] == 660
    assert summary["total_abandoned"] == 114
    # Ghost Rate = 114 / 660 * 100 = 17.27%
    assert summary["ghost_rate"] == 17.27
    assert summary["avg_wait_time_seconds"] is not None

    # Check ghost zones
    zones = data["ghost_zones"]
    assert len(zones) == 4
    # Highest abandonment zone should be first
    assert zones[0]["zone_name"] == "Support_Tier_1"
    assert zones[0]["severity"] == "high"

    # Check privacy status
    assert data["privacy_status"]["persisted"] is False


def test_api_analyze_json_records():
    json_path = TEST_DATA_DIR / "synthetic_records.json"
    with open(json_path, "rb") as f:
        res = client.post(
            "/api/v1/datasets/analyze",
            files={"file": ("synthetic_records.json", f, "application/json")},
        )
    assert res.status_code == 200
    data = res.json()

    assert data["profile"]["format"] == "json"
    assert data["profile"]["row_count"] == 3
    assert data["summary"]["total_offered"] == 240
    assert data["summary"]["total_abandoned"] == 42
    assert len(data["ghost_zones"]) == 3


def test_api_analyze_wrapped_json():
    json_path = TEST_DATA_DIR / "synthetic_wrapped.json"
    with open(json_path, "rb") as f:
        res = client.post(
            "/api/v1/datasets/analyze",
            files={"file": ("synthetic_wrapped.json", f, "application/json")},
        )
    assert res.status_code == 200
    data = res.json()
    assert data["profile"]["row_count"] == 2
    assert data["summary"]["total_offered"] == 130
    assert data["summary"]["total_abandoned"] == 25


def test_api_analyze_event_sessions_replay_capability():
    csv_path = TEST_DATA_DIR / "synthetic_event_sessions.csv"
    with open(csv_path, "rb") as f:
        res = client.post(
            "/api/v1/datasets/analyze",
            files={"file": ("synthetic_event_sessions.csv", f, "text/csv")},
        )
    assert res.status_code == 200
    data = res.json()

    assert data["profile"]["record_type"] == "event"
    # Multi-event sessions are present, so replay capability must be True
    assert data["profile"]["capabilities"]["ghost_replay"] is True


def test_api_analyze_empty_file_error():
    res = client.post(
        "/api/v1/datasets/analyze",
        files={"file": ("empty.csv", b"", "text/csv")},
    )
    assert res.status_code == 400
    assert "empty" in res.json()["detail"].lower()


def test_api_analyze_malformed_json_error():
    res = client.post(
        "/api/v1/datasets/analyze",
        files={"file": ("bad.json", b"{broken json", "application/json")},
    )
    assert res.status_code == 400
    assert "failed to parse" in res.json()["detail"].lower()


def test_api_analyze_unsupported_format_error():
    res = client.post(
        "/api/v1/datasets/analyze",
        files={"file": ("notes.txt", b"some text", "text/plain")},
    )
    assert res.status_code == 400
    assert "unsupported file format" in res.json()["detail"].lower()


def test_api_analyze_missing_optional_fields():
    csv_path = TEST_DATA_DIR / "synthetic_missing_optional.csv"
    with open(csv_path, "rb") as f:
        res = client.post(
            "/api/v1/datasets/analyze",
            files={"file": ("synthetic_missing_optional.csv", f, "text/csv")},
        )
    assert res.status_code == 200
    data = res.json()
    assert data["summary"]["avg_wait_time_seconds"] is None
    assert "avg_wait_time_seconds" in data["summary"]["unsupported_metrics"]
    assert data["time_analysis"]["available"] is False


def test_api_analyze_malformed_values_coercion():
    csv_path = TEST_DATA_DIR / "synthetic_malformed_values.csv"
    with open(csv_path, "rb") as f:
        res = client.post(
            "/api/v1/datasets/analyze",
            files={"file": ("synthetic_malformed_values.csv", f, "text/csv")},
        )
    assert res.status_code == 200
    data = res.json()
    # Should safely coerce without failing
    assert data["summary"]["total_offered"] >= 0


def test_api_analyze_no_replay_flag():
    csv_path = TEST_DATA_DIR / "synthetic_no_replay.csv"
    with open(csv_path, "rb") as f:
        res = client.post(
            "/api/datasets/analyze",  # Test standard /api/ prefix as well
            files={"file": ("synthetic_no_replay.csv", f, "text/csv")},
        )
    assert res.status_code == 200
    data = res.json()
    assert data["profile"]["capabilities"]["ghost_replay"] is False


def test_api_preview_dataset():
    csv_path = TEST_DATA_DIR / "synthetic_aggregate_queue.csv"
    with open(csv_path, "rb") as f:
        res = client.post(
            "/api/datasets/preview",
            files={"file": ("synthetic_aggregate_queue.csv", f, "text/csv")},
        )
    assert res.status_code == 200
    data = res.json()
    assert data["rows"] == 8
    assert len(data["preview"]) <= 5
