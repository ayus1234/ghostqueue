"""Tests for schema detection and canonical field mapping."""
from app.ingestion.mapper import map_columns, normalize_column_name, detect_record_type


def test_normalize_column_name():
    assert normalize_column_name("  Calls-Offered  ") == "calls_offered"
    assert normalize_column_name("Average Speed of Answer (ASA)") == "average_speed_of_answer_asa"
    assert normalize_column_name("queue_name") == "queue_name"


def test_map_standard_aliases():
    cols = ["Calls Offered", "Calls Answered", "Calls Abandoned", "Queue Name", "Avg Wait Seconds"]
    mapped, details, unmapped = map_columns(cols)

    assert mapped["offered"] == "Calls Offered"
    assert mapped["completed"] == "Calls Answered"
    assert mapped["abandoned"] == "Calls Abandoned"
    assert mapped["queue"] == "Queue Name"
    assert mapped["wait_time"] == "Avg Wait Seconds"
    assert len(unmapped) == 0


def test_unmapped_columns_reported():
    cols = ["queue", "offered", "abandoned", "marketing_campaign_id", "external_notes"]
    mapped, details, unmapped = map_columns(cols)

    assert "marketing_campaign_id" in unmapped
    assert "external_notes" in unmapped


def test_detect_record_type():
    agg_map = {"queue": "queue", "offered": "offered", "abandoned": "abandoned"}
    assert detect_record_type(agg_map) == "aggregate"

    event_map = {"session_id": "call_id", "event_type": "status"}
    assert detect_record_type(event_map) == "event"

    unknown_map = {"arbitrary_col": "arbitrary_col"}
    assert detect_record_type(unknown_map) == "unknown"
