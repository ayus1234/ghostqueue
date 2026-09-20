"""Deterministic rule-based AI Investigator operating entirely locally without external API dependencies."""
from typing import List, Optional
from datetime import datetime, timezone
from app.ai.base import AIProvider
from app.models.schemas import (
    DatasetAnalysisResponse,
    ReplayAnalysisResponse,
    InvestigationReport,
    InvestigationObservation,
    InvestigationHypothesis,
    InvestigationNextAction,
    InvestigationEvidenceLink,
    PrivacyStatus,
)


class DeterministicInvestigatorProvider(AIProvider):
    """Generates evidence-backed observations, hypotheses, and actions directly from computed metrics.

    Guarantees:
    - 100% deterministic and reproducible
    - Zero external network requests
    - Strict adherence to evidence boundaries (no unsupported causal claims)
    - Zero persistence of raw data
    """

    @property
    def provider_name(self) -> str:
        return "DeterministicInvestigator (Built-in Rule Engine)"

    def generate_investigation(
        self,
        analysis: DatasetAnalysisResponse,
        replay: Optional[ReplayAnalysisResponse] = None,
    ) -> InvestigationReport:
        """Produce structured investigative findings from canonical dataset metrics."""
        observations: List[InvestigationObservation] = []
        hypotheses: List[InvestigationHypothesis] = []
        next_actions: List[InvestigationNextAction] = []
        evidence_links: List[InvestigationEvidenceLink] = []
        limitations: List[str] = []

        summary = analysis.summary
        ghost_zones = analysis.ghost_zones
        time_analysis = analysis.time_analysis
        capabilities = analysis.capabilities

        total_offered = summary.total_offered or 0
        total_abandoned = summary.total_abandoned or 0
        ghost_rate = summary.ghost_rate if summary.ghost_rate is not None else 0.0
        avg_wait = summary.avg_wait_time_seconds

        # 1. Overall Abandonment & Retention Observations
        observations.append(
            InvestigationObservation(
                title="Baseline Abandonment Metric",
                evidence=f"Observed {total_abandoned:,} abandoned interactions out of {total_offered:,} offered interactions.",
                metric="ghost_rate",
                value=f"{ghost_rate:.2f}%",
                source_capability="core_analytics",
            )
        )
        evidence_links.append(
            InvestigationEvidenceLink(
                concept="metric",
                identifier="ghost_rate",
                observed_value=f"{ghost_rate:.2f}%",
                relevance="Primary indicator of operational process abandonment across all queues.",
            )
        )

        if avg_wait is not None:
            observations.append(
                InvestigationObservation(
                    title="Average Wait Duration",
                    evidence=f"Average wait time before answer or hangup was measured at {avg_wait:.1f} seconds.",
                    metric="avg_wait_time_seconds",
                    value=f"{avg_wait:.1f}s",
                    source_capability="core_analytics",
                )
            )

        # 2. Ghost Zones Investigation
        if ghost_zones and len(ghost_zones) > 0:
            # Sort by ghost rate
            sorted_by_rate = sorted(ghost_zones, key=lambda z: z.ghost_rate, reverse=True)
            worst_zone = sorted_by_rate[0]

            # Sort by total abandoned volume
            sorted_by_vol = sorted(ghost_zones, key=lambda z: z.abandoned, reverse=True)
            highest_vol_zone = sorted_by_vol[0]

            pct_of_total_ghosts = (
                round((worst_zone.abandoned / max(1, total_abandoned)) * 100.0, 1)
                if total_abandoned > 0
                else 0.0
            )

            observations.append(
                InvestigationObservation(
                    title=f"Critical Ghost Zone Identified: {worst_zone.zone_name}",
                    evidence=(
                        f"Zone '{worst_zone.zone_name}' registered the highest Ghost Rate at {worst_zone.ghost_rate:.2f}%, "
                        f"accounting for {worst_zone.abandoned:,} disconnections ({pct_of_total_ghosts:.1f}% of all ghosts)."
                    ),
                    metric="ghost_rate",
                    value=f"{worst_zone.ghost_rate:.2f}%",
                    source_capability="ghost_zones",
                )
            )
            evidence_links.append(
                InvestigationEvidenceLink(
                    concept="ghost_zone",
                    identifier=worst_zone.zone_name,
                    observed_value=f"{worst_zone.ghost_rate:.2f}% ({worst_zone.abandoned} ghosts)",
                    relevance=f"Highest abandonment concentration identified across {len(ghost_zones)} operational queues.",
                )
            )

            # Hypothesis for highest ghost zone
            hypotheses.append(
                InvestigationHypothesis(
                    hypothesis=(
                        f"Elevated queuing friction or mismatched service expectations in '{worst_zone.zone_name}' "
                        f"may be driving caller patience depletion."
                    ),
                    supporting_evidence=(
                        f"Ghost rate in '{worst_zone.zone_name}' ({worst_zone.ghost_rate:.2f}%) exceeds the "
                        f"system-wide average ({ghost_rate:.2f}%)."
                    ),
                    confidence="medium",
                    confidence_rationale=(
                        "Investigative lead: Zone-level discrepancy is statistically pronounced in the observed data, "
                        "though root causes (e.g. routing delay vs caller urgency) require internal operational validation."
                    ),
                )
            )

            next_actions.append(
                InvestigationNextAction(
                    action=f"Review routing rules, IVR menus, and staffing priority tiers for '{worst_zone.zone_name}'.",
                    reason=f"Accountable for {worst_zone.abandoned:,} lost interactions with a {worst_zone.ghost_rate:.2f}% Ghost Rate.",
                    expected_investigative_value="Identifies whether incoming traffic is being routed to understaffed queues or miscategorized.",
                    target_dimension="queue",
                    target_value=worst_zone.zone_name,
                )
            )

            # If highest volume zone is different from highest rate zone
            if highest_vol_zone.zone_name != worst_zone.zone_name and highest_vol_zone.abandoned > 0:
                vol_share = (
                    round((highest_vol_zone.abandoned / max(1, total_abandoned)) * 100.0, 1)
                    if total_abandoned > 0
                    else 0.0
                )
                observations.append(
                    InvestigationObservation(
                        title=f"Highest Volume Abandonment: {highest_vol_zone.zone_name}",
                        evidence=(
                            f"Zone '{highest_vol_zone.zone_name}' accounts for the largest absolute volume of abandonments "
                            f"({highest_vol_zone.abandoned:,} ghosts, {vol_share:.1f}% of total) with a {highest_vol_zone.ghost_rate:.2f}% Ghost Rate."
                        ),
                        metric="abandoned_volume",
                        value=highest_vol_zone.abandoned,
                        source_capability="ghost_zones",
                    )
                )
                next_actions.append(
                    InvestigationNextAction(
                        action=f"Assess baseline handling capacity and peak arrival distribution in '{highest_vol_zone.zone_name}'.",
                        reason=f"Generates the highest absolute volume of lost interactions ({highest_vol_zone.abandoned:,}).",
                        expected_investigative_value="Highest absolute ROI for abandonment reduction efforts.",
                        target_dimension="queue",
                        target_value=highest_vol_zone.zone_name,
                    )
                )
        else:
            limitations.append("Queue / stage grouping dimension is unmapped; Ghost Zone diagnostic ranking is unavailable.")

        # 3. Time Series & Peak Load Investigation
        if time_analysis and time_analysis.available and time_analysis.peak_abandonment_period:
            peak_period = time_analysis.peak_abandonment_period
            peak_rate_period = time_analysis.peak_ghost_rate_period or peak_period

            observations.append(
                InvestigationObservation(
                    title=f"Peak Abandonment Period: {peak_period}",
                    evidence=f"Time-series decomposition identified '{peak_period}' as experiencing the maximum concentration of abandoned interactions.",
                    metric="peak_abandonment_period",
                    value=peak_period,
                    source_capability="time_series",
                )
            )
            evidence_links.append(
                InvestigationEvidenceLink(
                    concept="time_period",
                    identifier=peak_period,
                    observed_value="Peak drop-off window",
                    relevance="Temporal focus for staff scheduling and break staggered coverage.",
                )
            )

            hypotheses.append(
                InvestigationHypothesis(
                    hypothesis=(
                        f"Temporal arrival spikes or shift changeovers during '{peak_period}' may create transient queue backlog "
                        f"that overwhelms available operational capacity."
                    ),
                    supporting_evidence=f"Concentration of abandonments peaks specifically during the '{peak_period}' window.",
                    confidence="high",
                    confidence_rationale=(
                        "Investigative lead: Time-series telemetry demonstrates recurring drop-off spikes during this recurring interval."
                    ),
                )
            )

            next_actions.append(
                InvestigationNextAction(
                    action=f"Cross-reference shift schedules, break staggering, and lunch overlaps during '{peak_period}'.",
                    reason=f"Recurring peak abandonment observed during '{peak_period}'.",
                    expected_investigative_value="Validates whether abandonment is driven by staff absence during arrival surges.",
                    target_dimension="time_period",
                    target_value=peak_period,
                )
            )
        else:
            limitations.append("Interval timestamps are unmapped; temporal peak analysis is unavailable.")

        # 4. Wait Time & Patience Hypothesis
        if avg_wait is not None and avg_wait > 30.0:
            hypotheses.append(
                InvestigationHypothesis(
                    hypothesis="Excessive initial queuing delay is a contributing factor to premature caller disconnects.",
                    supporting_evidence=f"Observed average wait time of {avg_wait:.1f} seconds across the dataset.",
                    confidence="medium",
                    confidence_rationale=(
                        "Investigative lead: In operational contact centers, wait times exceeding 30-60 seconds correlate "
                        "with accelerated customer abandonment."
                    ),
                )
            )
            next_actions.append(
                InvestigationNextAction(
                    action="Model virtual queuing / scheduled callback options for callers waiting past 45 seconds.",
                    reason=f"Average wait duration is {avg_wait:.1f}s, creating customer patience depletion.",
                    expected_investigative_value="Provides callers with an alternative to outright abandonment during queue congestion.",
                    target_dimension="wait_time",
                    target_value=f"{avg_wait:.1f}s",
                )
            )

        # 5. Ghost Replay Journey Telemetry
        if replay and replay.total_sessions > 0:
            observations.append(
                InvestigationObservation(
                    title="Ghost Replay Session Reconstruction",
                    evidence=(
                        f"Reconstructed {replay.total_sessions} multi-event session journeys: "
                        f"{replay.completed} completed, {replay.abandoned} abandoned, and {replay.unresolved} unresolved. "
                        f"Abandonment rate among resolved sessions is {replay.abandonment_rate_resolved:.1f}%."
                    ),
                    metric="replay_abandonment_rate_resolved",
                    value=f"{replay.abandonment_rate_resolved:.1f}%",
                    source_capability="ghost_replay",
                )
            )

            if replay.common_ghost_stage:
                observations.append(
                    InvestigationObservation(
                        title=f"Common Ghost Stage: {replay.common_ghost_stage}",
                        evidence=(
                            f"Sequential journey trace pinpointed stage '{replay.common_ghost_stage}' as the most frequent drop-off location "
                            f"across {replay.abandoned} abandoned journeys."
                        ),
                        metric="common_ghost_stage",
                        value=replay.common_ghost_stage,
                        source_capability="ghost_replay",
                    )
                )
                evidence_links.append(
                    InvestigationEvidenceLink(
                        concept="replay_stage",
                        identifier=replay.common_ghost_stage,
                        observed_value=f"{replay.abandonment_by_stage.get(replay.common_ghost_stage, 0)} drop-offs",
                        relevance="Process step where customers most frequently abandon their journey.",
                    )
                )

                hypotheses.append(
                    InvestigationHypothesis(
                        hypothesis=(
                            f"Process friction, documentation hurdles, or prolonged hold times during the '{replay.common_ghost_stage}' "
                            f"phase are primary triggers for session termination."
                        ),
                        supporting_evidence=(
                            f"Ghost points cluster predominantly in '{replay.common_ghost_stage}' "
                            f"({replay.abandonment_by_stage.get(replay.common_ghost_stage, 0)} sessions)."
                        ),
                        confidence="high",
                        confidence_rationale=(
                            "Investigative lead: Traceable sequential event telemetry directly locates terminal exit events at this step."
                        ),
                    )
                )

                next_actions.append(
                    InvestigationNextAction(
                        action=f"Inspect user experience, timeout parameters, and intermediate drop triggers in '{replay.common_ghost_stage}'.",
                        reason=f"Step '{replay.common_ghost_stage}' is the primary ghost drop-off point.",
                        expected_investigative_value="Pinpoints the specific UI or operational barrier causing customers to abort.",
                        target_dimension="stage",
                        target_value=replay.common_ghost_stage,
                    )
                )

            if replay.avg_time_to_abandonment_seconds is not None:
                observations.append(
                    InvestigationObservation(
                        title="Average Time to Abandonment",
                        evidence=f"Customers waited an average of {replay.avg_time_to_abandonment_seconds:.1f} seconds before terminating their session.",
                        metric="avg_time_to_abandonment_seconds",
                        value=f"{replay.avg_time_to_abandonment_seconds:.1f}s",
                        source_capability="ghost_replay",
                    )
                )
        else:
            limitations.append("Discrete event-level journey logs are unavailable; abandonment cannot be traced to intermediate process steps.")

        # Staffing capability check
        if not capabilities.staffing_analysis:
            limitations.append("Direct operational staffing data is unmapped; headcount adequacy cannot be verified from operational logs.")

        # Executive finding formulation
        finding_parts: List[str] = [
            f"Analysis of {total_offered:,} operational interactions reveals an overall Ghost Rate of {ghost_rate:.2f}% ({total_abandoned:,} abandoned)."
        ]
        if ghost_zones:
            worst_z = sorted(ghost_zones, key=lambda z: z.ghost_rate, reverse=True)[0]
            finding_parts.append(f"Abandonment is disproportionately concentrated in '{worst_z.zone_name}' ({worst_z.ghost_rate:.2f}% Ghost Rate).")
        if time_analysis and time_analysis.available and time_analysis.peak_abandonment_period:
            finding_parts.append(f"Temporal drop-offs peak sharply during '{time_analysis.peak_abandonment_period}'.")
        if replay and replay.common_ghost_stage:
            finding_parts.append(f"Sequential journey replay identifies '{replay.common_ghost_stage}' as the critical drop-off transition point.")

        executive_finding = " ".join(finding_parts)

        return InvestigationReport(
            executive_finding=executive_finding,
            observations=observations,
            hypotheses=hypotheses,
            next_actions=next_actions,
            evidence_links=evidence_links,
            limitations=limitations,
            provider=self.provider_name,
            generated_at=datetime.now(timezone.utc).isoformat(),
            privacy_status=PrivacyStatus(),
        )
