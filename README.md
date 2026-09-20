# GhostQueue 👻

> **Human Process Abandonment Intelligence**  
> *Find where people disappear. Understand why. Test what could change.*

GhostQueue is an operational intelligence and decision-support system designed to identify, diagnose, and mitigate human drop-outs across customer contact centers, service queues, and multi-step digital or physical workflows.

---

## 🌟 Key Capabilities

### 1. 📊 Executive Abandonment Overview & KPI Engine
- **Ghost Rate & Volume Tracking**: Quantifies the exact percentage and headcount of humans dropping off before completion.
- **Priority Action Signals**: Automatically isolates the single most consequential queue or process stage to guide operational triage.
- **Adaptive Visualizations**: Interactive Recharts-powered donut drop-off distributions and chronological interval trends.

### 2. 🔥 Ghost Zones
- **Ranked Drop-off Segments**: Ranks queues, stages, and customer service tiers by net drop-out impact.
- **Automated Severity Classification**: Assigns statistical severity tiers (**High**, **Medium**, **Low**) based on comparative abandonment thresholds and wait times.
- **Deep-Dive Metric Drawer**: Inspect offered load, answered volume, average queue delay, and historical drop-off ratios per zone.

### 3. ⏪ Ghost Replay
- **Journey Reconstruction**: Reconstructs session-level events step-by-step to reveal the chronological journey of individual users.
- **Ghost Point Callout**: Highlights the exact timestamp, elapsed dwell time, and step where a customer dropped off vs. completed service.
- **Unresolved Session Diagnostics**: Isolates abandoned interactions for granular root-cause inspection.

### 4. 🧠 AI Investigator (Root-Cause Engine)
- **Hybrid Diagnostic Architecture**: Powered by a deterministic rule-based engine and an optional Amazon Bedrock LLM provider.
- **Structured Findings**: Generates executive finding summaries, empirical observations, confidence-scored hypotheses (High/Medium/Low), and prioritized next operational actions.
- **Grounded Evidence Links**: Maps every diagnostic hypothesis directly back to empirical data points (e.g. queue delay thresholds, peak abandonment hours).

### 5. 🎛️ What-If Scenario Simulator
- **Interactive Elasticity Modeling**: Adjust staffing levels (agent headcount), customer arrival demand (%), and average handling durations (%).
- **Calibrated Mathematical Projections**: Evaluates queue elasticity using non-linear queue delay and abandonment relationships ($W_{\text{sim}} = W_0 \times L^{1.4}$, $G_{\text{sim}} = G_0 \times (W_{\text{sim}}/W_0)^{0.85}$).
- **Before-and-After Comparisons**: Directly visualizes simulated ghost rates, projected abandoned volume, and service level impacts against calibrated baselines.
- **Explicit Assumptions Notice**: Transparently distinguishes mathematical scenario modeling from empirical predictions.

### 6. 📁 Dataset Registry & Provenance Catalog
- **Strict Provenance Standards**: Transparently categorizes datasets across three integrity levels:
  1. **Public Domain Benchmark**: Real CC0 Contact Center Queueing (Erlang C) dataset with 2,400 half-hour intervals (49,121 offered, 48,211 answered, 910 abandoned, 1.85% ghost rate).
  2. **Research-Schema Fixture**: Published Emory Healthcare outpatient contact center schema fixture (JMIR 2026).
  3. **Synthetic Replay Demo**: High-fidelity multi-step event journeys with granular session event streams.
- **Dynamic Capability Detection**: Automatically enables or disables dashboard workspaces (Ghost Zones, Replay, Time-Series, Simulation) based on detected schema fields.

### 7. 🔒 Pure In-Memory Custom Dataset Ingestion
- **Privacy First**: User-uploaded CSV and JSON datasets are parsed, profiled, and analyzed entirely in volatile memory.
- **Zero Disk Persistence**: Raw custom uploads are never persisted in databases or written to disk.
- **PII Advisory Scanning**: Inspects incoming column headers for personally identifiable information (e.g. SSN, credit cards, emails, phone numbers) and issues proactive advisories.

### 8. ☀️ Light Mode by Default & 🌙 Dark Mode Switcher
- **Light Mode Default**: Clean, polished, high-contrast light theme loaded by default with zero hydration flash.
- **Instant Toggle**: Moon / Sun switcher located in the top navigation bar with persistent user preference storage in `localStorage`.
- **Full Design System Coverage**: Tailored Tailwind CSS v4 design system across all cards, charts, modals, drawers, and tables.

---

## 🛠️ Architecture & Tech Stack

```
ghostqueue/
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── ai/               # Deterministic investigator & Bedrock provider
│   │   ├── analytics/        # Ghost rates, ghost zones, & time-series analysis
│   │   ├── core/             # Provenance, privacy boundaries, & configuration
│   │   ├── ingestion/        # In-memory CSV/JSON parsers & schema profiler
│   │   ├── models/           # Pydantic schemas & response models
│   │   ├── simulation/       # What-if queue elasticity engine
│   │   └── main.py           # FastAPI entrypoint & REST API endpoints
├── frontend/                 # Next.js 16 Web Application
│   ├── app/                  # App Router, layout, & globals.css (Tailwind v4)
│   ├── components/           # AppShell, Charts, Tables, Simulator, Investigator, Replay
│   ├── lib/                  # API client bindings
│   └── types/                # TypeScript interface definitions
├── tests/                    # Pytest test suite (75 passing tests)
└── docs/                     # Technical architecture documentation
```

### Technology Highlights
- **Frontend**: Next.js 16 (Turbopack), React 19, TypeScript, Tailwind CSS v4 (`@tailwindcss/postcss`), Recharts, Lucide Icons.
- **Backend**: Python 3.11+, FastAPI, Pandas, NumPy, Pydantic v2, Uvicorn.
- **Testing & Quality**: Pytest, AsyncIO, Pyright (0 errors / 0 warnings).

---

## 🚀 Getting Started Locally

### Prerequisites
- Python 3.11 or higher
- Node.js 18 or higher (with `npm`)

### 1. Clone the Repository
```bash
git clone https://github.com/ayus1234/ghostqueue.git
cd ghostqueue
```

### 2. Setup and Start the Backend
```bash
# Optional: create a virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -e .

# Run the FastAPI server
uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```
The backend REST API will be available at: [http://127.0.0.1:8000](http://127.0.0.1:8000)  
Interactive OpenAPI Swagger documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 3. Setup and Start the Frontend
```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing

Run the full backend test suite:
```bash
python -m pytest
```
*Current status: 75 tests passing across analytics, ingestion, simulation, investigator, privacy, and registry validation.*

Build the production frontend bundle:
```bash
cd frontend
npm run build
```
*Current status: 0 TypeScript or linting errors.*

---

## 🔐 Privacy & Governance Policy
- **No Data Retention on Uploads**: Uploaded operational datasets are evaluated strictly in RAM.
- **Deterministic AI Baseline**: Intelligence generation operates reliably without mandatory third-party AI keys or external data transmission.
- **Strict Provenance Integrity**: Public datasets and synthetic schemas are never conflated.

---

## 📄 License
This project is licensed under the Apache 2.0 License. The embedded Contact Center Erlang dataset is dedicated to the public domain under Creative Commons CC0.
