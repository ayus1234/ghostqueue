"""Comprehensive tests for AI Investigator diagnostic engine, provider abstraction, and endpoints."""
import os
import json
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.ingestion.datasets.adapters import load_registered_fixture
from app.analytics.engine import run_full_analysis
from app.analytics.replay import run_replay_analysis
from app.ai.deterministic import DeterministicInvestigatorProvider
from app.ai.llm import LLMInvestigatorProvider
from app.ai.factory import get_investigator_provider


@pytest.fixture
def erlang_analysis():
    df, fmt = load_registered_fixture("contact-center-erlang")
    return run_full_analysis(df, "contact_center_erlang_merged.csv", fmt)


@pytest.fixture
def replay_context():
    df, fmt = load_registered_fixture("synthetic-replay-demo")
    analysis = run_full_analysis(df, "synthetic_replay_journey.json", fmt)
    replay = run_replay_analysis(df)
    return analysis, replay


def test_deterministic_investigator_high_ghost_zone(erlang_analysis):
    """Verify that the investigator correctly identifies and analyzes the highest Ghost Zone."""
    provider = DeterministicInvestigatorProvider()
    report = provider.generate_investigation(erlang_analysis)

    assert "Retention" in report.executive_finding
    assert any("Retention" in obs.title for obs in report.observations)
    assert any("Retention" in hyp.hypothesis for hyp in report.hypotheses)
    assert any("Retention" in act.action for act in report.next_actions)

    # Verify evidence links
    zone_links = [el for el in report.evidence_links if el.concept == "ghost_zone"]
    assert len(zone_links) > 0
    assert zone_links[0].identifier == "Retention"


def test_deterministic_investigator_peak_period(erlang_analysis):
    """Verify identification of peak drop-off interval."""
    provider = DeterministicInvestigatorProvider()
    report = provider.generate_investigation(erlang_analysis)

    peak_obs = [o for o in report.observations if "Peak Abandonment" in o.title]
    assert len(peak_obs) > 0
    assert erlang_analysis.time_analysis.peak_abandonment_period in peak_obs[0].evidence


def test_deterministic_investigator_replay_journey(replay_context):
    """Verify diagnostic findings from sequential Ghost Replay journey data."""
    analysis, replay = replay_context
    provider = DeterministicInvestigatorProvider()
    report = provider.generate_investigation(analysis, replay)

    # Should identify Waiting_Room as common ghost stage
    assert "Waiting_Room" in report.executive_finding
    assert any("Waiting_Room" in obs.title for obs in report.observations)
    assert any("Waiting_Room" in hyp.hypothesis for hyp in report.hypotheses)
    assert any("Waiting_Room" in act.action for act in report.next_actions)


def test_investigator_replay_unavailable_stated(erlang_analysis):
    """Ensure that when replay is unavailable, it is explicitly listed under limitations."""
    provider = DeterministicInvestigatorProvider()
    report = provider.generate_investigation(erlang_analysis, replay=None)

    assert any("journey logs are unavailable" in lim.lower() for lim in report.limitations)


def test_no_unsupported_causal_claims(erlang_analysis):
    """Integrity rule: Hypotheses must be flagged with confidence ratings and avoid definitive causation."""
    provider = DeterministicInvestigatorProvider()
    report = provider.generate_investigation(erlang_analysis)

    for hyp in report.hypotheses:
        assert hyp.confidence in ("low", "medium", "high")
        assert len(hyp.confidence_rationale) > 0
        assert "investigative lead" in hyp.confidence_rationale.lower()
        # Must not make definitive claims like "definitely caused by" or "proves that"
        assert "proves that" not in hyp.hypothesis.lower()
        assert "definitely caused" not in hyp.hypothesis.lower()


def test_llm_provider_fallback_without_keys(erlang_analysis):
    """Verify that LLM provider without credentials falls back gracefully to deterministic engine."""
    llm_provider = LLMInvestigatorProvider()
    report = llm_provider.generate_investigation(erlang_analysis)

    assert report is not None
    assert len(report.observations) > 0
    assert len(report.hypotheses) > 0
    assert any("credentials were not configured" in lim.lower() for lim in report.limitations)


def test_provider_selection_factory(monkeypatch):
    """Verify factory provider instantiation."""
    monkeypatch.setenv("AI_INVESTIGATOR_PROVIDER", "deterministic")
    p1 = get_investigator_provider()
    assert isinstance(p1, DeterministicInvestigatorProvider)

    monkeypatch.setenv("AI_INVESTIGATOR_PROVIDER", "llm")
    p2 = get_investigator_provider()
    assert isinstance(p2, LLMInvestigatorProvider)


def test_investigator_api_endpoint_with_benchmark():
    """Test POST /api/v1/investigator/analyze with benchmark dataset_id."""
    client = TestClient(app)
    res = client.post("/api/v1/investigator/analyze?dataset_id=contact-center-erlang")
    assert res.status_code == 200
    report = res.json()

    assert "executive_finding" in report
    assert len(report["observations"]) >= 3
    assert len(report["hypotheses"]) >= 2
    assert len(report["next_actions"]) >= 2
    assert report["privacy_status"]["persisted"] is False


def test_investigator_api_endpoint_with_upload():
    """Test POST /api/v1/investigator/analyze with uploaded file."""
    client = TestClient(app)
    csv_bytes = b"queue,offered,abandoned,answered,wait_time\nBilling,100,25,75,45.0\nSupport,200,10,190,12.0\n"

    res = client.post(
        "/api/v1/investigator/analyze",
        files={"file": ("test_upload.csv", csv_bytes, "text/csv")},
    )
    assert res.status_code == 200
    report = res.json()
    assert "Billing" in report["executive_finding"]
    assert report["privacy_status"]["persisted"] is False
