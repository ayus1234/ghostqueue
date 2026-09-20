# GhostQueue What-If Operational Simulator Specification

## 1. Purpose & Core Philosophy

The GhostQueue What-If Simulator provides operational decision-makers with a transparent scenario-modeling workbench to test hypothetical adjustments to queue capacity, staffing levels, customer arrival load, and handling duration.

> [!IMPORTANT]
> **SIMULATION INTEGRITY DISCLAIMER**:
> *"This is a scenario simulation based on observed dataset relationships and stated assumptions. It is not a prediction or guarantee of future outcomes."*
> GhostQueue strictly avoids machine learning over-promising or presenting scenario simulations as guaranteed predictions.

---

## 2. Mathematical Methodology & Elasticity Model

The simulator builds upon classical queuing theory principles (Erlang C convex delay dynamics) combined with empirical customer patience elasticity observed in operational contact center research.

### Mathematical Formulation

1. **Baseline Observed State**:
   - $D_0$: Baseline offered demand / arrivals
   - $C_0$: Baseline completed interactions
   - $A_0$: Baseline abandoned interactions ("ghosts")
   - $G_0$: Baseline Ghost Rate ($A_0 / D_0 \times 100\%$)
   - $W_0$: Baseline average wait time in seconds (ASA)
   - $S_0$: Baseline staffing capacity (average agents staffed)
   - $SL_0$: Baseline service level percentage

2. **Capacity Multiplier ($C_{mult}$)**:
   Accounts for staffing adjustments, headcount additions, and handle time (AHT) efficiency:
   $$C_{mult} = \left(1 + \frac{\Delta_{\text{capacity\_pct}}}{100}\right) \times \left(1 + \frac{\Delta_{\text{staffing\_pct}}}{100}\right) \times \left(1 + \frac{\text{additional\_agents}}{\max(1, S_0)}\right) \times \left(\frac{1}{1 + \frac{\Delta_{\text{service\_time\_pct}}}{100}}\right)$$

3. **Demand Multiplier ($D_{mult}$)**:
   Reflects customer arrival surges or seasonal volume contractions:
   $$D_{mult} = 1 + \frac{\Delta_{\text{demand\_pct}}}{100}$$

4. **Traffic Intensity / Queue Pressure Ratio ($L$)**:
   The relative change in operational load pressure:
   $$L = \frac{D_{mult}}{C_{mult}}$$

5. **Simulated Wait Duration ($W_{sim}$)**:
   In queueing systems operating near utilization thresholds, wait delays scale non-linearly with queue pressure (convex saturation curve):
   $$W_{sim} = \max\left(0.0, W_0 \times L^{1.4}\right)$$
   *(If a direct `wait_reduction_target_seconds` parameter is specified, $W_{sim} = \max(0.0, W_0 - \text{target})$).*

6. **Customer Abandonment & Patience Elasticity ($G_{sim}$)**:
   Customer abandonment responds directly to perceived and actual waiting delay:
   $$G_{sim} = \min\left(99.0\%, \max\left(0.0\%, G_0 \times \left(\frac{W_{sim}}{\max(0.1, W_0)}\right)^{0.85}\right)\right)$$

7. **Simulated Volumes & Deltas**:
   - $D_{sim} = \text{round}(D_0 \times D_{mult})$
   - $A_{sim} = \text{round}(D_{sim} \times (G_{sim} / 100))$
   - $C_{sim} = \max(0, D_{sim} - A_{sim})$
   - $\Delta \text{Ghost Rate} = G_{sim} - G_0$
   - $\Delta \text{Abandoned} = A_{sim} - A_0$

---

## 3. Supported Scenario Variables

| Variable | Type | Description | Operational Effect |
| :--- | :--- | :--- | :--- |
| `additional_agents` | `float` | Net headcount addition | Expands servicing capacity relative to baseline staffing |
| `staffing_change_percent` | `float` | Percentage change in staff (+15%, -10%) | Proportional shift in available workforce |
| `capacity_change_percent` | `float` | General capacity modifier | Models system throughput or concurrency changes |
| `demand_change_percent` | `float` | Inflow arrival surge/drop (+20%, -30%) | Shifts offered interaction volume |
| `service_time_change_percent`| `float` | Handle time (AHT) adjustment (-15%) | Shorter AHT increases handling capacity throughput |
| `wait_reduction_target_seconds`| `float` | Explicit target delay reduction | Models technological intervention (e.g. self-service deflection) |

---

## 4. Canonical Scenario Comparison

The simulator supports evaluating multiple operational scenarios simultaneously via `POST /api/v1/simulation/compare`:

1. **Baseline Reference**: Unaltered observed metrics from the ingested dataset.
2. **Add 15% Staffing Capacity**: Models the impact of proactive agent overtime or headcount expansion.
3. **Demand Surge (+20% Volume)**: Stress-tests queue resilience against arrival spikes.
4. **Reduce Handle Time (-15% AHT)**: Measures ROI of workflow optimization or knowledge-base enhancement.

---

## 5. Explicit Assumptions & Operational Limitations

### Documented Assumptions
1. Customer patience distribution is assumed stationary and reflects baseline tolerance behavior.
2. Arrival distributions and queue disciplines follow observed empirical patterns.
3. Headcount and capacity adjustments are modeled as distributed proportionally across operating hours.

### Transparent Limitations
- If a dataset lacks wait time columns (e.g. unmapped wait duration), the simulator notes the limitation and uses empirical defaults rather than inventing values.
- If staffing data is unmapped, additional agents scale relative to estimated system capacity, clearly documented in `limitations`.
- The simulation operates entirely in volatile memory with zero raw dataset persistence.
