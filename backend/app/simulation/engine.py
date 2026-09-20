"""What-if simulation engine modeling operational queue capacity, demand, and abandonment dynamics."""
from typing import Dict, List, Optional, Tuple, Any
import math
import pandas as pd
from app.models.schemas import (
    SimulationScenarioRequest,
    SimulationMetricsSummary,
    SimulationMetricValue,
    SimulationResponse,
    ScenarioComparisonResponse,
    DatasetAnalysisResponse,
)
from app.ingestion.mapper import map_columns

DEFAULT_SIMULATION_DISCLAIMER = (
    "This is a scenario simulation based on observed dataset relationships and stated assumptions. "
    "It is not a prediction or guarantee of future outcomes."
)


def extract_baseline_metrics(
    df: Optional[pd.DataFrame] = None,
    analysis: Optional[DatasetAnalysisResponse] = None,
) -> SimulationMetricsSummary:
    """Extract observed baseline operational parameters from dataset or prior analysis."""
    if analysis:
        offered = analysis.summary.total_offered or 0
        abandoned = analysis.summary.total_abandoned or 0
        completed = analysis.summary.total_completed or max(0, offered - abandoned)
        ghost_rate = analysis.summary.ghost_rate or (
            round((abandoned / offered) * 100.0, 2) if offered > 0 else 0.0
        )
        avg_wait = analysis.summary.avg_wait_time_seconds
    elif df is not None:
        offered = len(df)
        abandoned = 0
        completed = offered
        ghost_rate = 0.0
        avg_wait = None
    else:
        return SimulationMetricsSummary(
            offered_demand=0,
            completed_volume=0,
            abandoned_volume=0,
            ghost_rate=0.0,
        )

    staffing_level: Optional[float] = None
    service_level_pct: Optional[float] = None

    if df is not None:
        mapped, _, _ = map_columns(list(df.columns))
        staff_col = mapped.get("agents_available")
        if staff_col and staff_col in df.columns:
            s_series = pd.to_numeric(df[staff_col], errors="coerce").dropna()
            if not s_series.empty:
                staffing_level = round(float(s_series.mean()), 1)

        # Check for service level in original columns
        sl_col = next((c for c in df.columns if "service_level" in c.lower() or "sla" in c.lower()), None)
        if sl_col:
            sl_series = pd.to_numeric(df[sl_col], errors="coerce").dropna()
            if not sl_series.empty:
                service_level_pct = round(float(sl_series.mean()), 1)

    return SimulationMetricsSummary(
        offered_demand=offered,
        completed_volume=completed,
        abandoned_volume=abandoned,
        ghost_rate=ghost_rate,
        avg_wait_seconds=avg_wait,
        staffing_level=staffing_level,
        service_level_pct=service_level_pct,
    )


def simulate_scenario(
    baseline: SimulationMetricsSummary,
    params: SimulationScenarioRequest,
) -> SimulationResponse:
    """Execute a what-if operational scenario simulation based on empirical queue elasticity.

    Methodology:
    - Effective capacity multiplier is driven by staffing changes, additional agents, and handle-time reductions.
    - Effective demand multiplier is driven by arrival load changes.
    - Relative queue pressure ratio (Load = Demand / Capacity) modulates queue wait times and abandonment risk non-linearly.
    - Customer abandonment scales with wait-time patience elasticity.
    """
    limitations: List[str] = []
    assumptions: List[str] = [
        "Customer patience distribution is stationary and reflects baseline tolerance behavior.",
        "Arrival and queue discipline conform to observed empirical patterns.",
        "Capacity adjustments are distributed proportionally across operational intervals.",
    ]

    # Baseline values
    d0 = float(baseline.offered_demand)
    w0 = float(baseline.avg_wait_seconds) if baseline.avg_wait_seconds is not None else 60.0
    g0 = float(baseline.ghost_rate)
    s0 = float(baseline.staffing_level) if baseline.staffing_level is not None else 10.0
    sl0 = float(baseline.service_level_pct) if baseline.service_level_pct is not None else None

    if baseline.avg_wait_seconds is None:
        limitations.append("Average wait time was not present in baseline; an empirical proxy was applied.")
    if baseline.staffing_level is None and (params.additional_agents > 0 or params.staffing_change_percent != 0):
        limitations.append("Explicit baseline staffing was unmapped; agent additions scaled relative to estimated staffing capacity.")

    # 1. Capacity multiplier
    capacity_mult = 1.0
    if params.capacity_change_percent != 0.0:
        capacity_mult *= (1.0 + params.capacity_change_percent / 100.0)

    if params.staffing_change_percent != 0.0:
        capacity_mult *= (1.0 + params.staffing_change_percent / 100.0)

    if params.additional_agents != 0.0:
        effective_staffing_delta = params.additional_agents / max(1.0, s0)
        capacity_mult *= (1.0 + effective_staffing_delta)

    # Reducing service time (AHT) increases handling throughput capacity
    if params.service_time_change_percent != 0.0:
        # A 15% reduction in AHT means agents handle 1 / (1 - 0.15) = 1.176x calls (+17.6% capacity)
        service_factor = 1.0 + (params.service_time_change_percent / 100.0)
        service_factor = max(0.2, service_factor)
        capacity_mult *= (1.0 / service_factor)

    capacity_mult = max(0.1, capacity_mult)

    # 2. Demand multiplier
    demand_mult = 1.0 + (params.demand_change_percent / 100.0)
    demand_mult = max(0.1, demand_mult)

    # 3. Queue pressure / load ratio (Traffic intensity multiplier)
    load_ratio = demand_mult / capacity_mult

    # 4. Simulated wait time
    if params.wait_reduction_target_seconds is not None:
        target_wait = max(0.0, w0 - params.wait_reduction_target_seconds)
        sim_wait = target_wait
        assumptions.append(f"Direct target wait reduction applied: {params.wait_reduction_target_seconds:.1f}s.")
    else:
        # Non-linear queue delay scaling with traffic intensity
        # Power exponent ~ 1.5 reflects Erlang C convex delay curve near saturation
        sim_wait = max(0.0, w0 * math.pow(load_ratio, 1.4))

    # 5. Simulated Ghost Rate
    # Elasticity of abandonment to wait time: ~0.85
    if w0 > 0.0:
        wait_ratio = sim_wait / w0
        sim_ghost_rate = min(99.0, max(0.0, g0 * math.pow(wait_ratio, 0.85)))
    else:
        sim_ghost_rate = min(99.0, max(0.0, g0 * load_ratio))

    # 6. Simulated volumes
    sim_offered = max(0, round(d0 * demand_mult))
    sim_abandoned = min(sim_offered, max(0, round(sim_offered * (sim_ghost_rate / 100.0))))
    sim_completed = max(0, sim_offered - sim_abandoned)

    # 7. Simulated staffing
    sim_staffing = None
    if baseline.staffing_level is not None:
        sim_staffing = round(max(0.0, s0 * capacity_mult), 1)

    # 8. Simulated service level
    sim_sl = None
    if sl0 is not None:
        # Service level inversely scales with load ratio
        sl_change = (1.0 - load_ratio) * 15.0
        sim_sl = min(100.0, max(0.0, round(sl0 + sl_change, 1)))

    simulated_summary = SimulationMetricsSummary(
        offered_demand=sim_offered,
        completed_volume=sim_completed,
        abandoned_volume=sim_abandoned,
        ghost_rate=round(sim_ghost_rate, 2),
        avg_wait_seconds=round(sim_wait, 2) if baseline.avg_wait_seconds is not None else None,
        staffing_level=sim_staffing,
        service_level_pct=sim_sl,
    )

    # Calculate deltas
    delta_ghost_rate = round(simulated_summary.ghost_rate - baseline.ghost_rate, 2)
    delta_abandoned = simulated_summary.abandoned_volume - baseline.abandoned_volume
    delta_offered = simulated_summary.offered_demand - baseline.offered_demand
    delta_completed = simulated_summary.completed_volume - baseline.completed_volume
    delta_wait = (
        round(simulated_summary.avg_wait_seconds - baseline.avg_wait_seconds, 2)
        if simulated_summary.avg_wait_seconds is not None and baseline.avg_wait_seconds is not None
        else 0.0
    )
    delta_staffing = (
        round(simulated_summary.staffing_level - baseline.staffing_level, 1)
        if simulated_summary.staffing_level is not None and baseline.staffing_level is not None
        else 0.0
    )

    deltas: Dict[str, float] = {
        "ghost_rate_delta": delta_ghost_rate,
        "abandoned_delta": float(delta_abandoned),
        "offered_delta": float(delta_offered),
        "completed_delta": float(delta_completed),
        "wait_seconds_delta": delta_wait,
        "staffing_delta": delta_staffing,
    }

    # Comparison metrics formatted for charts & tables
    def _pct_change(b_val: Optional[float], s_val: Optional[float]) -> Optional[float]:
        if b_val is None or s_val is None or b_val == 0.0:
            return None
        return round(((s_val - b_val) / b_val) * 100.0, 1)

    comparison_metrics: List[SimulationMetricValue] = [
        SimulationMetricValue(
            metric_name="Ghost Rate",
            baseline_value=baseline.ghost_rate,
            simulated_value=simulated_summary.ghost_rate,
            delta=delta_ghost_rate,
            percent_change=_pct_change(baseline.ghost_rate, simulated_summary.ghost_rate),
            unit="%",
        ),
        SimulationMetricValue(
            metric_name="Abandoned Interactions",
            baseline_value=float(baseline.abandoned_volume),
            simulated_value=float(simulated_summary.abandoned_volume),
            delta=float(delta_abandoned),
            percent_change=_pct_change(float(baseline.abandoned_volume), float(simulated_summary.abandoned_volume)),
            unit="interactions",
        ),
        SimulationMetricValue(
            metric_name="Average Wait Time",
            baseline_value=baseline.avg_wait_seconds,
            simulated_value=simulated_summary.avg_wait_seconds,
            delta=delta_wait if baseline.avg_wait_seconds is not None else None,
            percent_change=_pct_change(baseline.avg_wait_seconds, simulated_summary.avg_wait_seconds),
            unit="seconds",
        ),
        SimulationMetricValue(
            metric_name="Completed Volume",
            baseline_value=float(baseline.completed_volume),
            simulated_value=float(simulated_summary.completed_volume),
            delta=float(delta_completed),
            percent_change=_pct_change(float(baseline.completed_volume), float(simulated_summary.completed_volume)),
            unit="interactions",
        ),
        SimulationMetricValue(
            metric_name="Offered Demand",
            baseline_value=float(baseline.offered_demand),
            simulated_value=float(simulated_summary.offered_demand),
            delta=float(delta_offered),
            percent_change=_pct_change(float(baseline.offered_demand), float(simulated_summary.offered_demand)),
            unit="interactions",
        ),
    ]

    if baseline.staffing_level is not None:
        comparison_metrics.append(
            SimulationMetricValue(
                metric_name="Staffing Level",
                baseline_value=baseline.staffing_level,
                simulated_value=simulated_summary.staffing_level,
                delta=delta_staffing,
                percent_change=_pct_change(baseline.staffing_level, simulated_summary.staffing_level),
                unit="agents",
            )
        )

    if baseline.service_level_pct is not None and simulated_summary.service_level_pct is not None:
        comparison_metrics.append(
            SimulationMetricValue(
                metric_name="Service Level",
                baseline_value=baseline.service_level_pct,
                simulated_value=simulated_summary.service_level_pct,
                delta=round(simulated_summary.service_level_pct - baseline.service_level_pct, 1),
                percent_change=_pct_change(baseline.service_level_pct, simulated_summary.service_level_pct),
                unit="%",
            )
        )

    methodology = (
        f"Queue pressure elasticity model: Effective load multiplier was calculated at {load_ratio:.3f}x "
        f"(Demand multiplier: {demand_mult:.2f}x, Capacity multiplier: {capacity_mult:.2f}x). "
        f"Wait duration scaled with load elasticity exponent 1.4, and abandonment responded with patience elasticity 0.85."
    )

    return SimulationResponse(
        scenario_name=params.scenario_name,
        is_simulation=True,
        baseline=baseline,
        simulated=simulated_summary,
        deltas=deltas,
        comparison_metrics=comparison_metrics,
        assumptions=assumptions,
        methodology=methodology,
        disclaimer=DEFAULT_SIMULATION_DISCLAIMER,
        limitations=limitations,
    )


def compare_scenarios(
    baseline: SimulationMetricsSummary,
    custom_scenarios: Optional[List[SimulationScenarioRequest]] = None,
) -> ScenarioComparisonResponse:
    """Run and compare multiple operational scenarios against the baseline."""
    scenarios_to_run: List[SimulationScenarioRequest] = []

    if custom_scenarios and len(custom_scenarios) > 0:
        scenarios_to_run = custom_scenarios
    else:
        # Pre-configured canonical comparison scenarios
        scenarios_to_run = [
            SimulationScenarioRequest(
                scenario_name="Baseline Reference",
            ),
            SimulationScenarioRequest(
                scenario_name="Add 15% Staffing Capacity",
                staffing_change_percent=15.0,
            ),
            SimulationScenarioRequest(
                scenario_name="Demand Surge (+20% Volume)",
                demand_change_percent=20.0,
            ),
            SimulationScenarioRequest(
                scenario_name="Reduce Handle Time (-15% AHT)",
                service_time_change_percent=-15.0,
            ),
        ]

    results = [simulate_scenario(baseline, sc) for sc in scenarios_to_run]

    return ScenarioComparisonResponse(
        is_simulation=True,
        baseline=baseline,
        scenarios=results,
        disclaimer=DEFAULT_SIMULATION_DISCLAIMER,
    )
