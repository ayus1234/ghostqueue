# GhostQueue Architecture

## 1. System Overview

**GhostQueue — Human Process Abandonment Intelligence** shifts the analytical paradigm from measuring process completions to discovering, quantifying, and understanding who disappeared before completing the process ("ghosts").

## 2. Architecture Principles

1. **Strict Separation of Concerns**:
   - `frontend/`: Next.js App Router, responsive dashboard UI, and visualization components.
   - `backend/app/api/`: REST API layer; handles routing, request validation, and HTTP responses.
   - `backend/app/ingestion/`: Dataset parsing, auto-schema detection, and format validation.
   - `backend/app/analytics/`: Core abandonment calculation and Ghost Zone algorithmic detection.
   - `backend/app/simulation/`: Parameterized What-if simulation models (what changes if capacity/load changes).
   - `backend/app/ai/`: Evidence-backed operational investigation engine with clear ontological separation (Observation vs Hypothesis vs Recommended Action).
   - `backend/app/core/`: Configuration, environment bindings, and shared utilities.
2. **Privacy-First Data Flow**: Raw uploaded custom datasets are treated as ephemeral. They are analyzed in memory or temporary storage and explicitly cleaned up. No raw custom rows are persisted into long-term application databases.
3. **AWS Deployment Alignment**: The backend and frontend are architected to map directly to AWS serverless/container services (AWS SAM / Lambda / API Gateway, Amazon Bedrock, S3 ephemeral staging, Amplify Hosting).

## 3. Component Architecture

```
+--------------------------------------------------------------------+
|                         Next.js Frontend                           |
|  - Executive KPI Cards          - Ghost Zones Map / Heatmap       |
|  - Abandonment Trend Charts     - Ghost Replay Flow Visualizer     |
|  - What-if Simulator Sliders    - AI Investigator Evidence Panel   |
|  - Privacy-First Upload Widget  - Dataset Source Context Selector  |
+---------------------------------+----------------------------------+
                                  | HTTP / JSON
                                  v
+--------------------------------------------------------------------+
|                       FastAPI Backend Service                      |
|  /api/health                    /api/datasets/preview              |
|  /api/analytics/summary         /api/analytics/ghost-zones         |
|  /api/analytics/replay          /api/investigator/report           |
|  /api/simulation/run                                               |
+---------------------------------+----------------------------------+
          |                       |                      |
          v                       v                      v
+--------------------+  +--------------------+  +--------------------+
| Ingestion & Parser |  |  Analytics Engine  |  | Simulation Engine  |
| - CSV / JSON       |  | - Ghost Rate Calc  |  | - Capacity shifts  |
| - Schema Mapping   |  | - Wait distribution|  | - Arrival mults    |
| - Privacy Scrub    |  | - Ghost Zones      |  | - Delta projection |
+--------------------+  +--------------------+  +--------------------+
                                  |
                                  v
                        +--------------------+
                        |  AI Investigator   |
                        | - Observations     |
                        | - Hypotheses       |
                        | - Recommendations  |
                        | - (Amazon Bedrock) |
                        +--------------------+
```

## 4. Cloud & AWS Deployment Architecture

- **Web Frontend**: AWS Amplify Hosting or Amazon CloudFront + S3 static distribution.
- **Backend API**: FastAPI packaged via AWS SAM as an AWS Lambda function fronted by Amazon API Gateway (or deployed to AWS App Runner).
- **AI Intelligence**: Amazon Bedrock invoking Anthropic Claude 3 Haiku for operational root-cause hypothesis generation using only sanitized analytical summaries.
- **Ephemeral Storage**: Amazon S3 bucket with 1-day lifecycle expiration rule for temporary file parsing (when file size exceeds direct memory buffers).
- **Metadata**: Amazon DynamoDB for pre-computed demo benchmark summaries.

## 5. Implemented Data Engine Pipeline (Step 2)

The core data ingestion and canonical analytical engine is organized as follows:

```
[Raw Bytes] -> [csv_parser / json_parser] -> [pandas.DataFrame]
                                                      |
                                                      v
                                            [mapper.map_columns]
                                                      |
                         +----------------------------+----------------------------+
                         |                                                         |
                         v                                                         v
             [profiler.evaluate_capabilities]                        [analytics.engine.calculate_summary]
                         |                                                         |
                         v                                                         v
              [DatasetCapabilities]                                       [AnalyticalSummary]
                         |                                                         |
                         +----------------------------+----------------------------+
                                                      |
                                                      v
                                        [zones.calculate_ghost_zones]
                                                      |
                                                      v
                                     [time_series.analyze_time_series]
                                                      |
                                                      v
                                          [DatasetAnalysisResponse]
```

### Module Responsibilities
- `app/ingestion/csv_parser.py`: Resilient in-memory CSV parser testing multiple encodings (UTF-8, UTF-8-BOM, Latin-1, CP1252) and validating tabular structures.
- `app/ingestion/json_parser.py`: In-memory JSON parser supporting both bare arrays of objects and standard wrapped envelopes (`{"data": [...]}`).
- `app/ingestion/mapper.py`: Two-pass prioritized alias resolution engine mapping source headers to canonical concepts with confidence scoring.
- `app/ingestion/profiler.py`: Evaluates dataset capability flags (preventing false claims of Ghost Replay for aggregate datasets).
- `app/analytics/engine.py`: Computes core KPIs (offered, completed, abandoned, Ghost Rate, average wait time) and handles division by zero.
- `app/analytics/zones.py`: Clusters interactions by operational stage/queue and computes deterministic severity ratings (`high`, `medium`, `low`).
- `app/analytics/time_series.py`: Discovers peak abandonment periods and peak Ghost Rate intervals.
- `app/core/privacy.py`: Enforces ephemeral in-memory processing and scans headers for PII indicators.
