# GhostQueue Dataset Registry & Data Integrity Disclosure

> [!IMPORTANT]
> **GhostQueue Data Integrity Principles**:
> 1. **Public Dataset**: Real public-domain operational data is used and committed only with verified open licenses (e.g. CC0 / Public Domain).
> 2. **Research-Schema Fixture**: When state-of-the-art research papers rely on restricted institutional data, GhostQueue cites the publication and generates an explicitly labeled synthetic fixture conforming to the published schema. We **never** claim possession or redistribution rights over institutional data.
> 3. **Synthetic Replay Demo**: Discrete multi-event session journeys for the Ghost Replay engine are clearly labeled synthetic demo data created solely to test and demonstrate sequential state reconstruction.

---

## Registry Overview

| Dataset ID | Display Name | Category / Label | License / Redistribution | Provenance | Fixture Path |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `contact-center-erlang` | Contact Center Queueing (Erlang C) | **Public Dataset** | CC0 / Public Domain (Redistributable) | Misata Studio | `data/fixtures/contact_center_erlang_merged.csv` |
| `healthcare-call-center-research` | Healthcare Call Center Operational Schema | **Research-Schema Fixture** | Not Redistributable (Institutional Data) | JMIR Med Inform 2026 (DOI: 10.2196/88441) | `data/fixtures/synthetic_healthcare_operational.csv` |
| `synthetic-replay-demo` | Ghost Replay Multi-Event Journey Demo | **Synthetic Replay Demo** | Apache-2.0 (Internal Synthetic Fixture) | GhostQueue Engineering | `data/fixtures/synthetic_replay_journey.json` |

---

## A. Public Contact Center Dataset

- **Dataset Identifier**: `contact-center-erlang`
- **Label**: `Public Dataset`
- **Dataset Name**: *Contact Center Queueing (Erlang C): free multi-table sample dataset*
- **Publisher / Source**: Misata Studio
- **Official Source URL**: [https://www.misata.studio/datasets/contact-center-erlang](https://www.misata.studio/datasets/contact-center-erlang)
- **License**: **CC0 / Public Domain**
  - The source explicitly states that the dataset is dedicated to the public domain under CC0, with no signup and no attribution required.
  - Public-domain licensing permits committing the fixture directly to the repository and freely analyzing it.

### Dataset Characteristics
- **Queues**: 4 queues (`Billing Support`, `Technical Support`, `Sales`, `Retention`)
- **Intervals**: 2,400 half-hour intervals
- **Total Rows**: 2,404 rows across the two tables (2,400 intervals + 4 queue dimension rows)
- **Mathematical Invariant**: $\text{calls\_answered} + \text{calls\_abandoned} = \text{offered\_calls}$ ($48,211 + 910 = 49,121$)

### Schemas
1. **Queues Table** (`contact_center_erlang_queues.csv`):
   - `queue_id`: Numeric identifier (1 to 4)
   - `queue_name`: Human-readable queue name
   - `sla_pct`: Target service level percentage
   - `sla_sec`: Target answer threshold in seconds
   - `patience_sec`: Customer patience threshold parameter
2. **Intervals Table** (`contact_center_erlang_intervals.csv`):
   - `interval_id`: Sequential interval ID
   - `queue_id`: Foreign key to queues table
   - `interval_start`: ISO timestamp of the half-hour window
   - `offered_calls`: Incoming offered call volume
   - `aht_sec`: Average Handle Time in seconds
   - `agents_staffed`: Headcount assigned
   - `traffic_intensity_erlangs`: Traffic intensity in Erlangs
   - `occupancy_pct`: Agent occupancy percentage
   - `wait_probability_pct`: Erlang C wait probability
   - `asa_sec`: Average Speed of Answer (wait time)
   - `service_level_pct`: Realized service level percentage
   - `expected_abandon_rate_pct`: Model-predicted abandonment rate
   - `calls_answered`: Handling count
   - `calls_abandoned`: Hangup / abandonment count ("ghosts")
   - `realized_abandon_rate_pct`: Observed abandonment percentage

### Canonical Field Mapping
| Canonical Concept | Source Column | Match Type | Confidence |
| :--- | :--- | :--- | :--- |
| `offered` | `offered_calls` | exact alias | 1.00 |
| `completed` | `calls_answered` | exact alias | 0.95 |
| `abandoned` | `calls_abandoned` | exact alias | 0.95 |
| `wait_time` | `asa_sec` | exact alias | 0.95 |
| `queue` | `queue_name` (or `queue_id`) | exact alias | 0.95 |
| `timestamp` | `interval_start` | exact alias | 0.95 |
| `service_time` | `aht_sec` | exact alias | 0.95 |
| `agents_available` | `agents_staffed` | exact alias | 0.95 |

### Detected Capabilities
- `core_analytics`: **True** (Total Offered: 49,121, Answered: 48,211, Abandoned: 910, Ghost Rate: 1.85%, Avg Wait: 2.83s)
- `ghost_zones`: **True** (4 zones: Retention 3.97%, Billing Support 1.80%, Technical Support 1.73%, Sales 0.81%)
- `time_series`: **True** (2,400 half-hour interval series with peak abandonment identification)
- `queue_analysis`: **True**
- `staffing_analysis`: **True**
- `simulation_inputs`: **True**
- `ghost_replay`: **False** (Correctly disabled — aggregate intervals do not contain discrete multi-event session journeys)

---

## B. Healthcare Research Dataset

- **Dataset Identifier**: `healthcare-call-center-research`
- **Label**: `Research-Schema Fixture`
- **Motivating Study Title**: *Predicting Call Abandonment in a Health Care Call Center Using Nonpersonal Operational Data: Machine Learning Study*
- **Publisher / Journal**: *JMIR Medical Informatics* (2026; 14:e88441)
- **Official Source URL**: [https://medinform.jmir.org/2026/1/e88441](https://medinform.jmir.org/2026/1/e88441)
- **DOI**: [10.2196/88441](https://doi.org/10.2196/88441)
- **Real Data Available in Repo**: **False**
- **Redistribution License**: **Not applicable — underlying institutional data is not publicly redistributable**

### Explicit Data Access Limitation
The JMIR paper investigated over 1 million anonymized operational call records from Emory Healthcare (Jan 2023 – May 2024).

The paper's official **Data Availability** statement explicitly restricts public access:
> *"The datasets generated and/or analyzed during the current study are not publicly available due to institutional data privacy restrictions governing internal hospital call-center operations, but are available from the corresponding author on reasonable request."*

### Synthetic Schema Fixture Implementation
In strict compliance with the published data restriction:
- GhostQueue **does not** claim access to real Emory records.
- GhostQueue **does not** redistribute proprietary hospital operational records.
- GhostQueue provides `data/fixtures/synthetic_healthcare_operational.csv`, a **100% synthetic fixture** structured around the operational schema described in the paper.
- The fixture contains 1,200 synthetic records with realistic scheduling distributions across specialties (Cardiology, Oncology, Pediatrics, General Services).

### Schema & Canonical Mapping
| Column | Description | Canonical Concept | Example Value |
| :--- | :--- | :--- | :--- |
| `contact_id` | Unique contact identifier | `session_id` | `SYN-HC-00042` |
| `timestamp` | Call arrival timestamp | `timestamp` | `2024-03-01 09:15:00` |
| `queue_duration_sec` | Queue duration before answer or hangup | `wait_time` | `145` |
| `skill_group` | Clinical specialty queue | `queue` | `Cardiology Scheduling` |
| `agent_id` | Serving agent identifier (empty if abandoned) | (metadata) | `AGT-014` |
| `team_id` | Supervisory team identifier | (metadata) | `TEAM-ACCESS-NORTH` |
| `outcome` | Call resolution disposition | `event_type` | `connected` / `abandoned` |

### Detected Capabilities
- `core_analytics`: **True** (Total Offered: 1,200, Completed: 1,069, Abandoned: 131, Ghost Rate: 10.92%, Avg Wait: 249.45s)
- `ghost_zones`: **True** (5 zones: Oncology 16.92%, Cardiology 13.93%, Refill Line 9.17%, Pediatrics 7.29%, General 6.36%)
- `time_series`: **True** (Hourly time series across 5 business days with peak abandonment period detection)
- `ghost_replay`: **False** (Single record per call, no multi-step event progression)

---

## C. Ghost Replay Demo Fixture

- **Dataset Identifier**: `synthetic-replay-demo`
- **Label**: `Synthetic Replay Demo`
- **Dataset Name**: *Ghost Replay Multi-Event Journey Demo*
- **Publisher**: GhostQueue Engineering
- **License**: Apache-2.0 / Project Internal
- **Real Data Available in Repo**: **True** (Synthetic fixture)
- **Fixture Paths**: `data/fixtures/synthetic_replay_journey.json` and `data/fixtures/synthetic_replay_journey.csv`

### Purpose
Neither of the two verified sources above provides a redistributable public multi-event event-log dataset suitable for repository commit. To test and demonstrate the Ghost Replay chronological session engine, this fixture defines multi-step sequential journeys with explicit state transitions.

### Demonstrated Journey Types
1. **Completed Journeys** (`SES-COMP-101`, `SES-COMP-102`, `SES-COMP-103`): Progress through IVR/kiosk $\rightarrow$ queue join $\rightarrow$ agent connection $\rightarrow$ explicit resolution.
2. **Abandoned Journeys** (`SES-ABAN-201`, `SES-ABAN-202`): Progress through initial stages, enter waiting queue or KYC identity verification, and trigger an explicit caller hangup or timeout abandonment.
3. **Unresolved Journeys** (`SES-UNRES-301`, `SES-UNRES-302`): Active or indeterminate sessions with no terminal event. **Rule**: GhostQueue NEVER infers unresolved = abandoned.
4. **Cross-Queue / Multi-Stage Journeys** (`SES-MULTI-401`, `SES-MULTI-402`): Customer transitions across multiple queues (Front Desk $\rightarrow$ Triage $\rightarrow$ Specialty Care).
5. **Extreme Long-Wait Abandonment** (`SES-LONG-501`): Demonstrates extreme wait duration (22 minutes) before abandonment.

### Event Schema
| Field | Type | Description |
| :--- | :--- | :--- |
| `session_id` | string | Unique journey identifier |
| `event_id` | string | Step-level event identifier |
| `timestamp` | string | ISO timestamp for chronological sorting |
| `event_type` | string | Action name (`session_enter`, `queue_joined`, `user_abandoned`, etc.) |
| `queue` | string | Operational queue at event |
| `stage` | string | Workflow process step (`IVR_Menu`, `Waiting_Room`, `KYC_Verification`, etc.) |
| `status` | string | Lifecycle state (`in_progress`, `queued`, `connected`, `abandoned`, `completed`) |
| `wait_duration` | float | Seconds waited in current stage |
| `actor` | string | Actor triggering event (`customer`, `system`, `agent_42`) |
| `metadata` | object | Contextual metadata (exit triggers, queue position, reasons) |

### Replay Engine Outcomes
- **Total Sessions**: 10
- **Completed**: 4
- **Abandoned**: 4
- **Unresolved**: 2
- **Abandonment Rate (Resolved)**: 50.0% ($4 / (4 + 4)$)
- **Common Ghost Stage**: `Waiting_Room`
- **Common Ghost Queue**: `Support`
- **Ghost Points**: Discovered with millisecond precision, capturing prior state, stage, queue, wait duration, and exit trigger.
