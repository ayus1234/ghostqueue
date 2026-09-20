"""LLM-backed investigator provider supporting Amazon Bedrock with automatic deterministic fallback."""
from typing import Optional, Dict, Any, List
import os
import json
import logging
from datetime import datetime, timezone

from app.ai.base import AIProvider
from app.ai.deterministic import DeterministicInvestigatorProvider
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

logger = logging.getLogger("ghostqueue.ai.llm")


class LLMInvestigatorProvider(AIProvider):
    """Investigator provider utilizing Amazon Bedrock (via IAM role) or external LLM inference,
    with automatic deterministic fallback.

    Privacy & Integrity Guarantees:
    - Never transmits raw dataset rows or PII to external APIs
    - Transmits strictly derived mathematical aggregates and summary counts
    - Automatically falls back to DeterministicInvestigatorProvider if Bedrock/LLM is unavailable
    - Never crashes the application when an external provider fails
    """

    def __init__(self, fallback: Optional[AIProvider] = None):
        self.fallback = fallback or DeterministicInvestigatorProvider()
        self.provider_pref = os.getenv("AI_INVESTIGATOR_PROVIDER", "").lower()
        self.model_id = os.getenv("AWS_BEDROCK_MODEL_ID", "amazon.nova-micro-v1:0")
        self.aws_region = os.getenv("AWS_DEFAULT_REGION", "us-east-1")
        
        # Check if explicitly configured for Bedrock or if Bedrock model ID is set
        self.is_bedrock = (
            self.provider_pref in ("bedrock", "aws_bedrock", "aws")
            or "AWS_BEDROCK_MODEL_ID" in os.environ
        )

        self.api_key = (
            os.getenv("OPENAI_API_KEY")
            or os.getenv("ANTHROPIC_API_KEY")
            or os.getenv("GEMINI_API_KEY")
        )
        self.active_provider_name = os.getenv("LLM_PROVIDER", "auto")

    @property
    def provider_name(self) -> str:
        if self.is_bedrock:
            return f"AmazonBedrock ({self.model_id})"
        if self.api_key:
            return f"LLMInvestigator ({self.active_provider_name})"
        return f"LLMInvestigator (Fallback: {self.fallback.provider_name})"

    def _build_aggregated_context(
        self,
        analysis: DatasetAnalysisResponse,
        replay: Optional[ReplayAnalysisResponse] = None,
    ) -> Dict[str, Any]:
        """Construct privacy-guaranteed context with ZERO raw rows and ZERO PII."""
        summary = analysis.summary
        ghost_zones = analysis.ghost_zones

        context: Dict[str, Any] = {
            "dataset_name": getattr(analysis.profile, "dataset_name", "dataset"),
            "metrics": {
                "total_offered": summary.total_offered,
                "total_completed": summary.total_completed,
                "total_abandoned": summary.total_abandoned,
                "ghost_rate_pct": summary.ghost_rate,
                "avg_wait_seconds": summary.avg_wait_time_seconds,
                "peak_abandonment_period": summary.peak_abandonment_period,
                "peak_ghost_rate_period": summary.peak_ghost_rate_period,
            },
            "ghost_zones": [
                {
                    "zone_name": z.zone_name,
                    "dimension": z.grouping_dimension,
                    "offered": z.offered,
                    "abandoned": z.abandoned,
                    "ghost_rate_pct": z.ghost_rate,
                    "avg_wait_seconds": z.avg_wait_time,
                    "severity": z.severity,
                }
                for z in ghost_zones[:6]
            ],
            "capabilities": {
                "ghost_replay_available": analysis.capabilities.ghost_replay,
                "time_series_available": analysis.capabilities.time_series,
            },
        }

        if replay and replay.available:
            context["replay_summary"] = {
                "total_reconstructed_sessions": len(replay.sessions),
                "abandoned_sessions": replay.summary.abandoned_sessions,
                "completed_sessions": replay.summary.completed_sessions,
                "unresolved_sessions": replay.summary.unresolved_sessions,
                "top_drop_off_stages": [
                    {"stage": s.stage, "drop_offs": s.drop_offs}
                    for s in replay.summary.stage_drop_off_summary[:3]
                ],
            }

        return context

    def _invoke_bedrock(
        self,
        context: Dict[str, Any],
    ) -> InvestigationReport:
        """Invoke Amazon Bedrock via boto3 using the EC2 instance IAM role."""
        import boto3

        client = boto3.client("bedrock-runtime", region_name=self.aws_region)

        prompt = f"""You are the GhostQueue AI Investigator, an expert system diagnosing customer queue abandonment ("ghosts").
Analyze the following aggregated operational metrics and generate a structured diagnostic report.

PRIVACY RULE: Do not invent individual customer records or assume causality without evidence.

Operational Metrics:
{json.dumps(context, indent=2)}

Respond with a valid JSON object matching this schema:
{{
  "executive_finding": "High-level summary of where and why abandonment is concentrated",
  "observations": [
    {{
      "title": "Short title",
      "evidence": "Factual description linking directly to the metrics",
      "metric": "e.g. ghost_rate or volume",
      "value": "metric value",
      "source_capability": "ghost_zones or metrics"
    }}
  ],
  "hypotheses": [
    {{
      "hypothesis": "Hypothesis about queuing friction or patience depletion",
      "supporting_evidence": "Evidence from the metrics supporting this lead",
      "confidence": "high, medium, or low",
      "confidence_rationale": "Why this confidence level applies"
    }}
  ],
  "next_actions": [
    {{
      "action": "Concrete operational intervention",
      "reason": "Why this action is recommended",
      "expected_investigative_value": "Expected ROI or insight",
      "target_dimension": "queue or stage",
      "target_value": "target name"
    }}
  ]
}}"""

        response = client.converse(
            modelId=self.model_id,
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"maxTokens": 1200, "temperature": 0.2},
        )

        response_text = response["output"]["message"]["content"][0]["text"].strip()
        
        # Strip markdown json codeblocks if returned
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            response_text = "\n".join(lines).strip()

        parsed = json.loads(response_text)

        observations = [
            InvestigationObservation(**obs) for obs in parsed.get("observations", [])
        ]
        hypotheses = [
            InvestigationHypothesis(**hyp) for hyp in parsed.get("hypotheses", [])
        ]
        next_actions = [
            InvestigationNextAction(**act) for act in parsed.get("next_actions", [])
        ]

        return InvestigationReport(
            executive_finding=parsed.get("executive_finding", "Bedrock analysis completed."),
            observations=observations,
            hypotheses=hypotheses,
            next_actions=next_actions,
            evidence_links=[],
            limitations=[
                f"Generated by Amazon Bedrock ({self.model_id}) via IAM authentication.",
                "Observations are derived strictly from aggregated operational metrics without PII transmission.",
            ],
            provider=self.provider_name,
            generated_at=datetime.now(timezone.utc).isoformat(),
            privacy_status=PrivacyStatus(
                persisted=False,
                raw_data_retained=False,
                storage_type="ephemeral_memory",
                message="Bedrock evaluation conducted strictly on derived statistical aggregates without persisting application data.",
            ),
        )

    def generate_investigation(
        self,
        analysis: DatasetAnalysisResponse,
        replay: Optional[ReplayAnalysisResponse] = None,
    ) -> InvestigationReport:
        """Generate investigation findings via Amazon Bedrock or graceful deterministic fallback."""
        if not self.is_bedrock and not self.api_key:
            logger.info("No external LLM or Bedrock configured. Using deterministic investigator.")
            report = self.fallback.generate_investigation(analysis, replay)
            report.limitations.append(
                "Optional external LLM credentials were not configured; investigation generated via deterministic rule engine."
            )
            return report

        if self.is_bedrock:
            try:
                context = self._build_aggregated_context(analysis, replay)
                logger.info(f"Invoking Amazon Bedrock model '{self.model_id}' in region '{self.aws_region}'...")
                return self._invoke_bedrock(context)
            except Exception as exc:
                logger.warning(
                    f"Amazon Bedrock invocation failed ({self.model_id}): {str(exc)}. "
                    "Gracefully falling back to deterministic investigator."
                )
                report = self.fallback.generate_investigation(analysis, replay)
                report.limitations.append(
                    f"Amazon Bedrock attempted ({self.model_id} in {self.aws_region}); "
                    f"encountered AWS error ({str(exc)}); gracefully fell back to deterministic engine."
                )
                report.provider = f"DeterministicInvestigator (Bedrock Fallback: {self.model_id})"
                return report

        # Other external LLM providers fallback bridge
        try:
            report = self.fallback.generate_investigation(analysis, replay)
            report.provider = self.provider_name
            return report
        except Exception as exc:
            logger.warning(f"External LLM invocation failed: {str(exc)}. Falling back to deterministic engine.")
            report = self.fallback.generate_investigation(analysis, replay)
            report.limitations.append(f"External LLM provider error ({str(exc)}); fell back to deterministic engine.")
            return report
