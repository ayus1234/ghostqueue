# Healthcare Call-Center Dataset Provenance & Disclosure

> [!IMPORTANT]
> **INTEGRITY & PROVENANCE NOTICE**:
> The operational call records in `synthetic_healthcare_operational.csv` are **100% synthetic** and are **NOT Emory Healthcare records**.
> They are generated solely to exercise the GhostQueue schema, canonical mapper, and analytics pipeline described by the published research paper.

## Published Research Reference
- **Title**: Predicting Call Abandonment in a Health Care Call Center Using Nonpersonal Operational Data: Machine Learning Study
- **Journal**: *JMIR Medical Informatics* (2026)
- **DOI**: [10.2196/88441](https://doi.org/10.2196/88441)
- **Official Source**: [https://medinform.jmir.org/2026/1/e88441](https://medinform.jmir.org/2026/1/e88441)

## Data Availability & Redistribution Limitation
The published study investigated more than 1 million operational call-center interactions from Emory Healthcare (January 2023 – May 2024).

The paper's official **Data Availability** statement explicitly states:
> *"The datasets generated and/or analyzed during the current study are not publicly available due to institutional data privacy restrictions governing internal hospital call-center operations, but are available from the corresponding author on reasonable request."*

### GhostQueue Ethical & Integrity Policy
In adherence to research ethics and data rights:
1. GhostQueue **does NOT** download or scrape internal Emory records from unauthorized sources.
2. GhostQueue **does NOT** store or redistribute non-public institutional hospital records.
3. The dataset provided in `data/fixtures/synthetic_healthcare_operational.csv` is an **explicitly synthetic fixture** engineered to replicate the operational schema published in the study:
   - `contact_id` (contact identifier)
   - `timestamp` (date/time of arrival)
   - `queue_duration_sec` (queue duration before connection or abandonment)
   - `skill_group` (clinical scheduling specialty)
   - `agent_id` (agent identifier)
   - `team_id` (team identifier)
   - `outcome` (connected or abandoned)
