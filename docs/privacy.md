# GhostQueue Privacy & Data Governance Specification

## 1. Core Commitment

**"Privacy-first processing — uploaded raw datasets are not persisted as application data."**

GhostQueue exists to understand operational bottlenecks and human queue abandonment, not to collect or retain proprietary customer records or personal data.

## 2. Ingestion & Processing Lifecycle

1. **In-Memory & Ephemeral Staging**:
   - Custom CSV and JSON datasets submitted via the upload interface are streamed directly into volatile server memory for parsing and statistical aggregation.
   - If payload size requires temporary disk spooling, files are stored in a dedicated temporary workspace and purged immediately upon completion of the analytics pipeline.
2. **Zero Raw Persistence**:
   - Raw uploaded tabular data is NEVER inserted into application databases (e.g., DynamoDB, PostgreSQL).
   - Raw custom files are NOT archived to permanent cloud object storage (e.g., permanent S3 buckets).
3. **Aggregated Insights Only**:
   - Only calculated, non-reversible aggregates (e.g., total volume, ghost rate percentage, hourly abandonment distributions, queue-level bottleneck metrics) are retained in UI session memory.

## 3. PII Handling & Sanitization

1. **Schema Inspection & Warning**:
   - The ingestion parser inspects column names during preview. If sensitive PII indicators are detected (e.g., `ssn`, `credit_card`, `phone_number`, `patient_name`, `email`), a clear privacy warning is displayed to the user prior to analysis.
2. **Exclusion from LLM / AI Context**:
   - When forwarding operational telemetry to the AI Investigator (e.g., Amazon Bedrock), raw row data and sensitive headers are strictly excluded. Only sanitized statistical summaries (e.g., "Queue B saw 42% abandonment between 14:00 and 15:00 with average wait time of 18 minutes") are provided as contextual prompt material.

## 4. Operational Boundaries

- GhostQueue guarantees that application code will not persist raw uploaded datasets.
- System boundaries do not make unfalsifiable claims regarding provider-level hosting telemetry or infrastructure-level transient network buffers (e.g., cloud load balancer transit logs), but enforce application-level deletion and zero persistent storage.
