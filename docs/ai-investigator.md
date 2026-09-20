# GhostQueue AI Investigator Diagnostic Engine

## 1. Architectural Overview

The **GhostQueue AI Investigator** is an automated operational intelligence layer that synthesizes metric summaries, Ghost Zones, time-series distributions, and Ghost Replay event traces into actionable diagnostic reports.

Rather than generating vague conversational text or hallucinating causal relationships, the Investigator enforces a rigorous separation between:
1. **Factual Evidence (Observations)**
2. **Diagnostic Hypotheses (Investigative Leads)**
3. **Operational Interventions (Next Actions)**

```
┌────────────────────────────────────────────────────────┐
│               Computed Analytics Pipeline              │
│  (Ghost Rate, Ghost Zones, Time Series, Replay Traces) │
└───────────────────────────┬────────────────────────────┘
                            │ Structured Aggregates Only
                            ▼
┌────────────────────────────────────────────────────────┐
│                   AI Provider Layer                    │
│                                                        │
│  ┌─────────────────────────┐ ┌──────────────────────┐  │
│  │ Deterministic Provider  │ │ Optional LLM Provider│  │
│  │ (Rule Engine / Default) │ │ (Fallback Guardrail) │  │
│  └─────────────────────────┘ └──────────────────────┘  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                  Investigation Report                  │
│  • Executive Finding                                   │
│  • Observations (Factual Evidence)                     │
│  • Hypotheses (Investigative Leads + Confidence)       │
│  • Recommended Next Actions (Operational ROI)          │
│  • Evidence Links & Explicit Limitations               │
└────────────────────────────────────────────────────────┘
```

---

## 2. The Three Investigative Tiers

### A. Observations (Factual Evidence)
An **Observation** represents an empirical finding directly proven by computed dataset values.
- *Strict Rule*: Must link to an exact metric, value, and capability source.
- *Example*: *"Zone 'Retention' registered the highest Ghost Rate at 3.97%, accounting for 265 disconnections (29.1% of all ghosts)."*

### B. Hypotheses (Investigative Leads)
A **Hypothesis** is a plausible explanation suggested by the observed data patterns.
- *Strict Rule*: Must be clearly designated as an investigative hypothesis, NEVER stated as an established fact.
- *Confidence Rating*: Classified as `low`, `medium`, or `high`.
- *Integrity Note*: The confidence label applies to the hypothesis as an **investigative lead**, not statistical certainty.
- *Example*: *"Elevated queuing friction in 'Retention' may be driving caller patience depletion. (Confidence: Medium)."*

### C. Recommended Next Actions (Operational Next Steps)
A **Next Action** is a concrete operational step an engineer or contact center manager can execute to validate or remediate the problem.
- *Strict Rule*: Must state the specific reason, target queue/stage, and expected investigative value.
- *Example*: *"Review routing rules, IVR menus, and staffing priority tiers for 'Retention'."*

---

## 3. Provider Architecture

### 1. Deterministic Rule Provider (`DeterministicInvestigatorProvider`)
- **Default Engine**: Runs 100% locally with zero external API dependencies or costs.
- **Rule Determinism**: Analyzes highest ghost rate zones, volume concentrations, peak time intervals, wait-time thresholds, and replay drop-off stages through reproducible analytical rules.
- **Always Available**: Guarantees that GhostQueue operates reliably in air-gapped, local, and demo environments.

### 2. Optional LLM Provider (`LLMInvestigatorProvider`)
- **Configurable**: Activated when an external API key (e.g. `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, or `AWS_BEDROCK_MODEL_ID`) is present.
- **Graceful Fallback**: If credentials are unset or an external service timeout occurs, the system automatically falls back to `DeterministicInvestigatorProvider` without failing the API request.
- **No Fabrication**: If an external LLM fails, GhostQueue never fabricates a response; it logs the event and attaches a transparent limitation note to the report.

---

## 4. Policy on Unsupported Claims

The AI Investigator enforces strict ethical boundaries:
1. **No Unsupported Causation**: It is prohibited from declaring that X *caused* abandonment unless experimental or counterfactual proof exists. Language is restricted to *"Observed..."*, *"Suggests..."*, *"May indicate..."*, and *"Requires validation"*.
2. **No Guaranteed Interventions**: GhostQueue never claims that an operational change will "definitely solve" or "eliminate" abandonment.
3. **No Hallucinated Data**: The Investigator cannot reference external benchmark values or fictional metrics not present in the ingested dataset.
4. **Explicit Capabilities & Limitations**: If event-level replay, interval timestamps, or staffing headcounts are absent from a dataset, the Investigator explicitly lists them under `limitations`.

---

## 5. Privacy & Zero-Persistence Guardrails

1. **No Raw Data to LLMs**: Neither individual customer interaction rows nor session IDs are passed to external AI providers. Only high-level mathematical aggregates (Ghost Rate, zone rankings, peak hour labels) are provided.
2. **Zero Ingestion Persistence**: Uploaded datasets are processed in volatile memory and discarded after analysis.
3. **Direct PII Exclusion**: Direct customer identifiers (names, phone numbers, emails) are excluded from analytical context and investigator prompts.
