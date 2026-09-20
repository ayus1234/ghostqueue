"""Tests for dataset registry catalog, provenance metadata, and integrity rules."""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.ingestion.datasets.registry import (
    get_all_registered_datasets,
    get_dataset_entry,
    DATASET_REGISTRY,
)


def test_dataset_registry_contains_required_datasets():
    """Verify registry has the required verified datasets and synthetic fixtures."""
    entries = get_all_registered_datasets()
    ids = {e.dataset_id for e in entries}
    assert "contact-center-erlang" in ids
    assert "healthcare-call-center-research" in ids
    assert "synthetic-replay-demo" in ids


def test_public_contact_center_erlang_metadata():
    """Verify Misata Studio Erlang C dataset metadata and public-domain licensing."""
    entry = get_dataset_entry("contact-center-erlang")
    assert entry is not None
    assert entry.record_status == "public_dataset"
    assert entry.source_type == "verified_public_source"
    assert entry.real_data_available_in_repo is True
    assert "CC0" in entry.license
    assert "misata.studio" in entry.source_url
    assert entry.record_type == "aggregate"
    assert entry.capabilities.core_analytics is True
    assert entry.capabilities.ghost_replay is False  # Correctly disabled for aggregate


def test_healthcare_research_schema_integrity():
    """Verify healthcare research schema respects institutional data limitations."""
    entry = get_dataset_entry("healthcare-call-center-research")
    assert entry is not None
    assert entry.record_status == "synthetic_schema_fixture"
    assert entry.source_type == "published_research_schema"
    assert entry.real_data_available_in_repo is False
    assert "not publicly redistributable" in entry.redistribution_license.lower()
    assert entry.doi == "10.2196/88441"
    assert "jmir" in entry.source_url.lower()
    assert entry.record_type == "event"
    assert "synthetic" in entry.provenance.lower()


def test_synthetic_replay_demo_metadata():
    """Verify synthetic replay demo fixture metadata."""
    entry = get_dataset_entry("synthetic-replay-demo")
    assert entry is not None
    assert entry.record_status == "synthetic_replay_fixture"
    assert entry.source_type == "synthetic_journey_demo"
    assert entry.real_data_available_in_repo is False
    assert entry.capabilities.ghost_replay is True
    assert entry.record_type == "event"


def test_registry_api_endpoints():
    """Test API endpoints for querying dataset registry."""
    client = TestClient(app)

    # List registry
    res = client.get("/api/v1/datasets/registry")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 3
    dataset_ids = [d["dataset_id"] for d in data]
    assert "contact-center-erlang" in dataset_ids

    # Get single valid entry
    res_single = client.get("/api/v1/datasets/registry/contact-center-erlang")
    assert res_single.status_code == 200
    assert res_single.json()["name"] == "Contact Center Queueing (Erlang C): free multi-table sample dataset"

    # Get non-existent entry
    res_404 = client.get("/api/v1/datasets/registry/unknown-id-xyz")
    assert res_404.status_code == 404
