# GhostQueue Canonical Data Contract

## 1. Overview

GhostQueue ingests heterogeneous operational records (telephony logs, support tickets, healthcare triage queues, digital drop-off funnels) and normalizes them into a canonical analytical contract.

The data engine automatically detects schemas, classifies records into **Aggregate** or **Event/Session** representations, and assesses capabilities without fabricating missing metrics.

## 2. Ingestion Formats

GhostQueue natively supports in-memory parsing for:
1. **CSV**: Standard comma-delimited tabular files (auto-detects UTF-8, UTF-8-BOM, Latin-1, CP1252).
2. **JSON**:
   - Array of objects: `[{"queue": "Billing", "offered": 100, "abandoned": 20}, ...]`
   - Wrapped envelopes: `{"data": [...]}`, `{"records": [...]}`, `{"interactions": [...]}`

---

## 3. Canonical Fields & Alias Dictionary

| Canonical Concept | Supported Aliases | Data Type | Role |
| :--- | :--- | :--- | :--- |
| **`offered`** | `offered`, `calls_offered`, `interactions`, `arrivals`, `total_interactions`, `calls_received`, `volume`, `incoming`, `presented`, `requests` | `integer` | Total interactions entering the queue |
| **`completed`** | `answered`, `calls_answered`, `connected`, `completed`, `handled`, `calls_handled`, `resolved`, `serviced`, `success` | `integer` | Interactions handled to completion |
| **`abandoned`** | `abandoned`, `calls_abandoned`, `abandonments`, `hangup`, `dropped`, `lost_calls`, `missed_calls`, `ghost` | `integer` / `string` | Disconnections before completion ("ghosts") |
| **`wait_time`** | `wait`, `wait_time`, `average_wait`, `avg_wait`, `asa`, `average_speed_of_answer`, `queue_time`, `hold_time`, `waiting_time`, `delay_seconds`, `wait_seconds` | `float` | Duration spent waiting in queue (sec) |
| **`queue`** | `queue`, `queue_name`, `skill`, `skill_group`, `department`, `service`, `line`, `stage`, `process_step` | `string` | Grouping dimension for Ghost Zones |
| **`timestamp`** | `timestamp`, `datetime`, `date`, `time`, `interval`, `start_time`, `call_time`, `created_at`, `event_time`, `arrival_time` | `string` / `datetime` | Temporal dimension for peak analysis |
| **`session_id`** | `session_id`, `interaction_id`, `call_id`, `contact_id`, `ticket_id`, `customer_id`, `id` | `string` | Unique customer / journey identifier |
| **`event_type`** | `event`, `event_type`, `action`, `status`, `disposition`, `outcome`, `step` | `string` | Disposition or state transition in event journeys |
| **`service_time`** | `service_time`, `handle_time`, `duration`, `talk_time`, `aht`, `call_duration` | `float` | Active handling duration |
| **`agents_available`**| `staffing`, `agents`, `agents_available`, `capacity`, `headcount`, `operators`, `logged_in` | `integer` | Active staff / operational capacity |

---

## 4. Mapping & Confidence Tiers

The schema engine evaluates columns in two distinct passes:
1. **Pass 1 (High Confidence)**:
   - Exact canonical match: confidence = `1.0`
   - Normalized alias match: confidence = `0.95`
2. **Pass 2 (Inferred / Substring)**:
   - Substring match across aliases: confidence = `0.75`

Unmatched columns are preserved in `unmapped_fields` for transparent auditability.

---

## 5. Record Types & Capability Flags

Every ingested dataset is classified into one of two primary record models:

### A. Aggregate Queue Records
- Single-row summaries per queue and/or time interval containing volume aggregates (`offered`, `abandoned`).
- **Enabled Capabilities**: `core_analytics: true`, `ghost_zones: true`, `simulation_inputs: true`.
- **Enforced Boundary**: `ghost_replay: false`. (Ghost Replay is never falsely enabled for aggregate data).

### B. Event / Session Records
- Multiple granular rows per interaction tracking state transitions over time.
- **Enabled Capabilities**: Full analytics, Ghost Zones, and `ghost_replay: true` (when multiple intermediate steps per session are detected).

---

## 6. Analytical Output Contract (`POST /api/v1/datasets/analyze`)

```json
{
  "profile": {
    "dataset_name": "contact_center.csv",
    "format": "csv",
    "row_count": 500,
    "column_count": 7,
    "original_columns": ["Queue", "Calls_Offered", "Abandoned", "Wait_Sec"],
    "normalized_columns": ["queue", "calls_offered", "abandoned", "wait_sec"],
    "mapped_fields": {
      "queue": "Queue",
      "offered": "Calls_Offered",
      "abandoned": "Abandoned",
      "wait_time": "Wait_Sec"
    },
    "unmapped_fields": [],
    "record_type": "aggregate",
    "capabilities": {
      "core_analytics": true,
      "ghost_zones": true,
      "ghost_replay": false,
      "time_series": false,
      "queue_analysis": true,
      "staffing_analysis": false,
      "simulation_inputs": true
    }
  },
  "field_mapping": [
    {
      "canonical_field": "offered",
      "source_column": "Calls_Offered",
      "confidence": 0.95,
      "match_type": "alias"
    }
  ],
  "capabilities": { ... },
  "summary": {
    "total_offered": 15000,
    "total_completed": 12300,
    "total_abandoned": 2700,
    "ghost_rate": 18.0,
    "avg_wait_time_seconds": 64.2,
    "peak_abandonment_period": "14:00",
    "peak_ghost_rate_period": "14:00",
    "unsupported_metrics": {}
  },
  "ghost_zones": [
    {
      "zone_name": "Billing Escalations",
      "grouping_dimension": "queue",
      "offered": 2400,
      "abandoned": 600,
      "completed": 1800,
      "ghost_rate": 25.0,
      "avg_wait_time": 110.5,
      "severity": "high",
      "severity_rationale": "High severity: Ghost Rate (25.0%) exceeds 20%..."
    }
  ],
  "time_analysis": {
    "available": true,
    "period_type": "interval",
    "peak_abandonment_period": "14:00",
    "peak_ghost_rate_period": "14:00",
    "periods": [ ... ]
  },
  "privacy_status": {
    "persisted": false,
    "raw_data_retained": false,
    "storage_type": "ephemeral_memory",
    "message": "Privacy-first processing — uploaded raw datasets are not persisted as application data."
  },
  "warnings": []
}
```

---

## 7. Ghost Replay Event Journey Contract

For datasets where `capabilities.ghost_replay == true`, individual sessions can be reconstructed chronologically:

### Schema Fields
- `session_id`: Unique identifier across all steps in the customer interaction.
- `event_id`: Unique step-level identifier.
- `timestamp`: Event creation timestamp used for monotonic chronological sorting.
- `event_type`: Step or transition name (`session_enter`, `queue_joined`, `user_abandoned`, `service_completed`).
- `queue`: Queue identifier at this step.
- `stage`: Lifecycle or workflow phase (`IVR_Menu`, `Waiting_Room`, `KYC_Verification`, `Resolution`).
- `status`: State lifecycle tag (`in_progress`, `queued`, `connected`, `abandoned`, `completed`).
- `wait_duration`: Time spent waiting at this specific step (in seconds).
- `actor`: Initiator of this transition (`customer`, `system`, `agent`).
- `metadata`: Contextual attributes (queue position, exit reason, transfer target).

### Outcome Determination Rules
1. **Explicit Abandonment Event**: If an event with status/type `abandoned`, `hangup`, `timeout`, `cancelled`, or `dropped` is observed $\rightarrow$ session outcome is `abandoned`.
2. **Explicit Completion Event**: If an event with status/type `completed`, `resolved`, `handled`, or `success` is observed $\rightarrow$ session outcome is `completed`.
3. **No Terminal Event**: If no terminal event is present $\rightarrow$ session outcome is strictly `unresolved`.
4. **Integrity Rule**: GhostQueue **NEVER** infers `unresolved == abandoned`. Unresolved journeys represent active, in-flight, or unlogged handoffs.

