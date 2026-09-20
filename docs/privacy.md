# GhostQueue Privacy & Ephemeral Ingestion Specification

## 1. Core Architectural Guarantee

**"Privacy-first processing — uploaded raw datasets are not persisted as application data."**

GhostQueue analyzes operational queue dynamics and abandonment patterns without storing, retaining, or archiving proprietary customer interaction rows.

---

## 2. Ingestion & Processing Lifecycle

```
[User Browser / API Client]
           |
           | Multipart HTTP POST (CSV or JSON)
           v
[FastAPI In-Memory Stream]
     - Size verified (Max 25MB)
     - Raw bytes spooled directly to memory buffer (io.BytesIO / StringIO)
     - Zero temporary files written to local disk
           |
           v
[Data Normalization & PII Scan]
     - Headers scanned for sensitive PII indicators (SSN, credit card, patient name, etc.)
     - Columns mapped to canonical operational concepts
           |
           v
[Analytics Computation]
     - Mathematical aggregation (Ghost Rate, Ghost Zones, time series)
     - Analytical aggregates generated
           |
           v
[Volatile Memory Eviction]
     - In-memory DataFrame freed and garbage collected
     - No database insertions (DynamoDB / SQL)
     - No S3 archiving of raw records
           |
           v
[Client Response]
     - Only derived aggregates, KPI summaries, and Ghost Zones returned
     - PrivacyStatus badge attached
```

---

## 3. Ephemeral Guardrails

1. **Zero Disk Spooling**: The `parse_csv_bytes` and `parse_json_bytes` functions operate entirely on in-memory buffers. No `tempfile`, `.csv`, or `.json` files are written to the host filesystem.
2. **PII Header Detection**: If sensitive column headers are identified (matching patterns such as `ssn`, `social_security`, `credit_card`, `patient_name`), GhostQueue appends clear advisory warnings to the API response while completing analysis on the operational columns.
3. **No Raw Logging**: Application loggers are restricted to metadata (e.g. `row_count`, `column_count`, `dataset_name`). Raw row data, cell values, and payload buffers are strictly excluded from logging statements.
4. **Isolated Memory Eviction**: Once the response is serialized and returned to the caller, the underlying dataset is discarded from memory.
5. **Ghost Replay In-Memory Streaming**: Replay reconstruction for multi-event journey logs is conducted purely in volatile memory. Sessions, state transitions, and ghost points are calculated on-the-fly; neither individual journey steps nor raw event uploads are persisted to databases or disk.

