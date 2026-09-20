"""Comprehensive tests for What-If Simulator engine, queuing pressure elasticity, and API endpoints."""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.ingestion.datasets.adapters import load_registered_fixture
from app.analytics.engine import run_full_analysis
from app.simulation.engine import (
    extract_baseline_metrics,
    simulate_scenario,
    compare_scenarios,
    DEFAULT_SIMULATION_DISCLAIMER,
)
from app.models.schemas import SimulationScenarioRequest, SimulationMetricsSummary


@pytest.fixture
def erlang_baseline():
    """Extract baseline metrics from the real public CC0 Erlang C dataset."""
    df, fmt = load_registered_fixture("contact-center-erlang")
    analysis = run_full_analysis(df, "contact_center_erlang_merged.csv", fmt)
    return extract_baseline_metrics(df, analysis)


def test_baseline_metric_extraction(erlang_baseline):
    """Verify that baseline values reflect observed dataset reality."""
    assert erlang_baseline.offered_demand == 49121
    assert erlang_baseline.completed_volume == 48211
    assert erlang_baseline.abandoned_volume == 910
    assert erlang_baseline.ghost_rate == 1.85
    assert erlang_baseline.avg_wait_seconds == 2.83
    assert erlang_baseline.staffing_level is not None
    assert erlang_baseline.service_level_pct is not None


def test_simulation_additional_agents(erlang_baseline):
    """Verify that adding agents increases capacity and reduces ghost rate and wait time."""
    req = SimulationScenarioRequest(
        scenario_name="Add 5 Agents",
        additional_agents=5.0,
    )
    result = simulate_scenario(erlang_baseline, req)

    assert result.is_simulation is True
    assert result.scenario_name == "Add 5 Agents"
    assert result.simulated.ghost_rate < erlang_baseline.ghost_rate
    assert result.simulated.avg_wait_seconds < erlang_baseline.avg_wait_seconds
    assert result.simulated.abandoned_volume < erlang_baseline.abandoned_volume
    assert result.deltas["ghost_rate_delta"] < 0.0
    assert result.deltas["abandoned_delta"] < 0.0


def test_simulation_demand_increase(erlang_baseline):
    """Verify that a demand surge increases queue pressure, wait times, and abandonment."""
    req = SimulationScenarioRequest(
        scenario_name="Surge Demand +25%",
        demand_change_percent=25.0,
    )
    result = simulate_scenario(erlang_baseline, req)

    assert result.simulated.offered_demand > erlang_baseline.offered_demand
    assert result.simulated.ghost_rate > erlang_baseline.ghost_rate
    assert result.simulated.avg_wait_seconds > erlang_baseline.avg_wait_seconds
    assert result.deltas["ghost_rate_delta"] > 0.0
    assert result.deltas["abandoned_delta"] > 0.0


def test_simulation_service_time_reduction(erlang_baseline):
    """Verify that reducing handle time increases effective throughput and lowers abandonment."""
    req = SimulationScenarioRequest(
        scenario_name="AHT Reduction -15%",
        service_time_change_percent=-15.0,
    )
    result = simulate_scenario(erlang_baseline, req)

    assert result.simulated.ghost_rate < erlang_baseline.ghost_rate
    assert result.simulated.avg_wait_seconds < erlang_baseline.avg_wait_seconds
    assert result.deltas["ghost_rate_delta"] < 0.0


def test_simulation_wait_reduction_target(erlang_baseline):
    """Verify direct wait-time target simulation."""
    req = SimulationScenarioRequest(
        scenario_name="Target Wait Reduction 1s",
        wait_reduction_target_seconds=1.0,
    )
    result = simulate_scenario(erlang_baseline, req)

    expected_wait = max(0.0, erlang_baseline.avg_wait_seconds - 1.0)
    assert pytest.approx(result.simulated.avg_wait_seconds, 0.05) == expected_wait
    assert result.simulated.ghost_rate < erlang_baseline.ghost_rate


def test_simulation_disclaimer_mandatory(erlang_baseline):
    """Ensure simulation response includes explicit non-prediction disclaimer."""
    req = SimulationScenarioRequest(scenario_name="Test")
    result = simulate_scenario(erlang_baseline, req)

    assert "not a prediction" in result.disclaimer.lower()
    assert "guarantee" in result.disclaimer.lower()
    assert len(result.assumptions) >= 3


def test_simulation_scenario_comparison(erlang_baseline):
    """Verify comparing multiple scenarios against the baseline."""
    comparison = compare_scenarios(erlang_baseline)

    assert comparison.is_simulation is True
    assert comparison.baseline.offered_demand == erlang_baseline.offered_demand
    assert len(comparison.scenarios) == 4

    names = [s.scenario_name for s in comparison.scenarios]
    assert "Baseline Reference" in names
    assert any("Staffing" in n for n in names)
    assert any("Demand" in n for n in names)
    assert any("Handle Time" in n for n in names)


def test_simulation_missing_metrics_handling():
    """Verify graceful handling when baseline lacks wait or staffing fields."""
    sparse_baseline = SimulationMetricsSummary(
        offered_demand=1000,
        completed_volume=900,
        abandoned_volume=100,
        ghost_rate=10.0,
        avg_wait_seconds=None,
        staffing_level=None,
    )
    req = SimulationScenarioRequest(scenario_name="Test Sparse", demand_change_percent=20.0)
    result = simulate_scenario(sparse_baseline, req)

    assert result.simulated.ghost_rate > 10.0
    assert len(result.limitations) > 0
    assert any("wait time was not present" in lim.lower() for lim in result.limitations)


def test_simulation_api_endpoints():
    """Test POST /api/v1/simulation/run and /api/v1/simulation/compare."""
    client = TestClient(app)

    # Run single scenario
    res = client.post(
        "/api/v1/simulation/run",
        json={
            "dataset_id": "contact-center-erlang",
            "scenario_name": "Add 3 Staff",
            "additional_agents": 3.0,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_simulation"] is True
    assert data["baseline"]["offered_demand"] == 49121
    assert data["simulated"]["ghost_rate"] < data["baseline"]["ghost_rate"]
    assert len(data["comparison_metrics"]) >= 4

    # Compare scenarios
    res_comp = client.post(
        "/api/v1/simulation/compare",
        json={"dataset_id": "contact-center-erlang", "scenarios": []},
    )
    assert res_comp.status_code == 200
    comp_data = res_comp.json()
    assert comp_data["is_simulation"] is True
    assert len(comp_data["scenarios"]) == 4

    # Test non-existent dataset
    res_404 = client.post(
        "/api/v1/simulation/run",
        json={"dataset_id": "invalid-dataset-id", "scenario_name": "Fail"},
    )
    assert res_404.status_code == 404
