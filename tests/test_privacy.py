"""Tests for privacy guardrails and ephemeral dataset handling."""
from pathlib import Path
from app.core.privacy import check_for_pii_headers
from app.analytics.engine import run_full_analysis
import pandas as pd


def test_pii_header_warnings():
    cols = ["customer_id", "ssn", "credit_card_num", "queue", "abandoned"]
    warnings = check_for_pii_headers(cols)

    assert len(warnings) == 2
    assert any("ssn" in w for w in warnings)
    assert any("credit_card" in w for w in warnings)


def test_no_disk_files_created_during_analysis(tmp_path):
    df = pd.DataFrame({"queue": ["Billing"], "offered": [50], "abandoned": [5]})
    files_before = set(Path(".").glob("**/*"))

    response = run_full_analysis(df, "ephemeral.csv", "csv")

    files_after = set(Path(".").glob("**/*"))
    # Ensure no new data files were dropped into repository root or app folders
    new_files = [f for f in files_after - files_before if not str(f).endswith((".pyc", ".log", ".tmp"))]

    assert len(new_files) == 0
    assert response.privacy_status.persisted is False
    assert response.privacy_status.raw_data_retained is False
