"""Verified dataset registry catalog and helper accessors."""
from typing import Dict, List, Optional
import os
from app.models.schemas import DatasetRegistryEntry, DatasetCapabilities

DATASET_REGISTRY: Dict[str, DatasetRegistryEntry] = {
    "contact-center-erlang": DatasetRegistryEntry(
        dataset_id="contact-center-erlang",
        name="Contact Center Queueing (Erlang C): free multi-table sample dataset",
        publisher="Misata Studio",
        source_url="https://www.misata.studio/datasets/contact-center-erlang",
        license="CC0 / Public Domain",
        record_status="public_dataset",
        source_type="verified_public_source",
        real_data_available_in_repo=True,
        redistribution_license="CC0 / Public Domain. Permitted for redistribution and repository inclusion without restriction.",
        doi=None,
        description="Public domain aggregate queue dataset containing 2,400 half-hour intervals across 4 call center queues with call volume, service level, staffing, and Erlang C queueing metrics.",
        record_type="aggregate",
        original_columns=[
            "interval_id",
            "queue_id",
            "interval_start",
            "offered_calls",
            "aht_sec",
            "agents_staffed",
            "traffic_intensity_erlangs",
            "occupancy_pct",
            "wait_probability_pct",
            "asa_sec",
            "service_level_pct",
            "expected_abandon_rate_pct",
            "calls_answered",
            "calls_abandoned",
            "realized_abandon_rate_pct",
            "queue_name",
        ],
        canonical_mapping={
            "offered": "offered_calls",
            "completed": "calls_answered",
            "abandoned": "calls_abandoned",
            "wait_time": "asa_sec",
            "queue": "queue_name",
            "timestamp": "interval_start",
            "service_time": "aht_sec",
            "agents_available": "agents_staffed",
        },
        capabilities=DatasetCapabilities(
            core_analytics=True,
            ghost_zones=True,
            ghost_replay=False,
            time_series=True,
            queue_analysis=True,
            staffing_analysis=True,
            simulation_inputs=True,
        ),
        fixture_path="data/fixtures/contact_center_erlang_merged.csv",
        provenance="Verified official public dataset published by Misata Studio under CC0 Public Domain. Merged with queues lookup for named queue classification.",
    ),
    "healthcare-call-center-research": DatasetRegistryEntry(
        dataset_id="healthcare-call-center-research",
        name="Predicting Call Abandonment in a Health Care Call Center Using Nonpersonal Operational Data",
        publisher="JMIR Medical Informatics",
        source_url="https://medinform.jmir.org/2026/1/e88441",
        license="not applicable — underlying institutional data is not publicly redistributable",
        record_status="synthetic_schema_fixture",
        source_type="published_research_schema",
        real_data_available_in_repo=False,
        redistribution_license="not applicable — underlying institutional data is not publicly redistributable",
        doi="10.2196/88441",
        description="Operational call center research schema based on a 2026 JMIR Medical Informatics study of healthcare call abandonment. The underlying Emory Healthcare records are restricted institutional data and not redistributable; GhostQueue provides a synthetic schema fixture to exercise the pipeline without claiming or redistributing institutional patient/call records.",
        record_type="event",
        original_columns=[
            "contact_id",
            "timestamp",
            "queue_duration_sec",
            "skill_group",
            "agent_id",
            "team_id",
            "outcome",
        ],
        canonical_mapping={
            "session_id": "contact_id",
            "timestamp": "timestamp",
            "wait_time": "queue_duration_sec",
            "queue": "skill_group",
            "event_type": "outcome",
        },
        capabilities=DatasetCapabilities(
            core_analytics=True,
            ghost_zones=True,
            ghost_replay=False,
            time_series=True,
            queue_analysis=True,
            staffing_analysis=False,
            simulation_inputs=True,
        ),
        fixture_path="data/fixtures/synthetic_healthcare_operational.csv",
        provenance="JMIR Medical Informatics 2026; DOI: 10.2196/88441. The research paper describes operational call metrics from Emory Healthcare. In compliance with the paper's data availability restrictions, no private Emory records are possessed or committed; all records in this fixture are synthetic.",
    ),
    "synthetic-replay-demo": DatasetRegistryEntry(
        dataset_id="synthetic-replay-demo",
        name="Ghost Replay Multi-Event Journey Demo",
        publisher="GhostQueue Engineering",
        source_url="internal://data/fixtures/synthetic_replay_journey",
        license="Apache-2.0 / Project Internal",
        record_status="synthetic_replay_fixture",
        source_type="synthetic_journey_demo",
        real_data_available_in_repo=True,
        redistribution_license="Apache-2.0. Synthetic demo fixture generated for testing and demonstration.",
        doi=None,
        description="Synthetic multi-event customer journey dataset specifically constructed to test and demonstrate Ghost Replay chronological session reconstruction, ghost point discovery, and unresolved session handling across multiple operational queues and stages.",
        record_type="event",
        original_columns=[
            "session_id",
            "event_id",
            "timestamp",
            "event_type",
            "queue",
            "stage",
            "status",
            "wait_duration",
            "actor",
            "metadata",
        ],
        canonical_mapping={
            "session_id": "session_id",
            "timestamp": "timestamp",
            "event_type": "event_type",
            "queue": "queue",
            "wait_time": "wait_duration",
        },
        capabilities=DatasetCapabilities(
            core_analytics=True,
            ghost_zones=True,
            ghost_replay=True,
            time_series=True,
            queue_analysis=True,
            staffing_analysis=False,
            simulation_inputs=True,
        ),
        fixture_path="data/fixtures/synthetic_replay_journey.json",
        provenance="Generated synthetic event session fixture designed to demonstrate Ghost Replay session journeys (completed, abandoned, unresolved, cross-stage, and long-wait).",
    ),
}


def get_all_registered_datasets() -> List[DatasetRegistryEntry]:
    """Retrieve list of all verified registered datasets and fixtures."""
    return list(DATASET_REGISTRY.values())


def get_dataset_entry(dataset_id: str) -> Optional[DatasetRegistryEntry]:
    """Retrieve a single registered dataset entry by ID."""
    return DATASET_REGISTRY.get(dataset_id)


def resolve_fixture_path(relative_path: str) -> str:
    """Resolve a fixture path relative to project root."""
    # Attempt direct path first
    if os.path.isabs(relative_path) and os.path.exists(relative_path):
        return relative_path

    # Try relative to current working directory
    cwd_path = os.path.abspath(relative_path)
    if os.path.exists(cwd_path):
        return cwd_path

    # Try relative to repository root if running from backend
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    candidate = os.path.join(repo_root, relative_path)
    if os.path.exists(candidate):
        return candidate

    return relative_path
