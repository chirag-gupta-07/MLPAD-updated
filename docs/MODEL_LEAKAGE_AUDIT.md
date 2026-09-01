# 🔍 Technical Audit: Data & Target Leakage in ML Models

**Project:** AI-Powered MPLADS Risk Intelligence Platform (SIH26102)  
**Audit Standard:** Leakage-Free Predictive Machine Learning & Temporal Validation  

---

## 1. Executive Summary of Leakage Audit

The initial delay prediction model reported suspiciously high metrics:
- **Reported Accuracy:** `99.60%`
- **Reported F1-Score:** `99.70%`
- **Reported ROC-AUC:** `1.0000`

### Root Cause Analysis
A rigorous line-by-line inspection of `src/features/build_features.py` and `notebooks/02_model_training_and_accuracy_optimization.ipynb` revealed **three severe forms of data & target leakage**:

1. **Direct Target Leakage (`schedule_overrun_ratio`)**:
   - In `src/features/build_features.py`:
     $$\text{schedule\_overrun\_ratio} = \frac{\text{delay\_days}}{\text{planned\_duration\_days}}$$
   - `delay_days` was computed using `actual_completion_date` (for completed works) or `CURRENT_ANALYSIS_DATE - expected_completion_date`.
   - The target definition was:
     $$\text{target\_is\_delayed} = (\text{delay\_days} > 30) \lor (\text{status} \in [\text{'DELAYED'}, \text{'STALLED'}])$$
   - Therefore, `schedule_overrun_ratio` was a mathematical proxy of the target itself. The model simply learned that whenever $\text{schedule\_overrun\_ratio} > \frac{30}{\text{planned\_duration}}$, the target is 1.

2. **Temporal Data Leakage (Global Agency Aggregation)**:
   - `agency_avg_delay` and `district_completion_rate` were calculated across the entire dataset globally (including test set records and future records).
   - This leaked future agency performance into the training set.

3. **Random Cross-Validation Splitting**:
   - Stratified K-Fold randomly split related works from the same time period and synthetic duplicate pairs across folds, leaking information between train and validation folds.

---

## 2. Complete Feature-by-Feature Leakage Audit Table

| Feature Name | Description | Available at Kickoff / Sanction? | Uses Future Info? | Derived from Target? | Action Taken | Technical Rationale |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| `sanctioned_amount` | Approved project cost | ✅ Yes | ❌ No | ❌ No | **KEEP** | Known immediately upon administrative sanction. |
| `estimated_cost` | Technical estimate | ✅ Yes | ❌ No | ❌ No | **KEEP** | Pre-sanction engineering estimate. |
| `recommended_amount` | MP proposed amount | ✅ Yes | ❌ No | ❌ No | **KEEP** | Submitted during initial recommendation. |
| `rec_to_sanction_days` | Latency from MP recommendation to District Sanction | ✅ Yes | ❌ No | ❌ No | **KEEP** | Fully elapsed prior to project start. |
| `planned_duration_days` | Target completion timeline ($Expected - Sanction$) | ✅ Yes | ❌ No | ❌ No | **KEEP** | Prescribed contract duration. |
| `sector` | Infrastructure Category | ✅ Yes | ❌ No | ❌ No | **KEEP** | Categorical feature known at inception. |
| `state` / `district` | Administrative location | ✅ Yes | ❌ No | ❌ No | **KEEP** | Geographic feature known at inception. |
| `cost_vs_peer_median_ratio` | Sanctioned cost vs historical sector median | ✅ Yes (Historical) | ❌ No | ❌ No | **KEEP** | Baseline cost comparison. |
| `peer_cost_zscore` | Standard deviation cost z-score in sector | ✅ Yes (Historical) | ❌ No | ❌ No | **KEEP** | Baseline statistical dispersion. |
| `schedule_overrun_ratio` | Delay days divided by planned duration | ❌ **NO** | ⚠️ **YES** | 🚨 **YES** | ❌ **REMOVE** | **Direct target leakage**. Computed from actual completion date. |
| `delay_days` | Number of days delayed | ❌ **NO** | ⚠️ **YES** | 🚨 **YES** | ❌ **REMOVE** | **Direct target leakage**. |
| `actual_completion_date` | Date physical work ended | ❌ **NO** | ⚠️ **YES** | 🚨 **YES** | ❌ **REMOVE** | Post-completion ground truth. |
| `actual_duration_days` | Actual days to finish | ❌ **NO** | ⚠️ **YES** | 🚨 **YES** | ❌ **REMOVE** | Post-completion ground truth. |
| `completion_percentage` | Final physical progress | ❌ **NO** | ⚠️ **YES** | ⚠️ **YES** | ❌ **REMOVE** | Current/final progress state. |
| `days_since_last_payment` | Gap since latest payment | ❌ **NO** | ⚠️ **YES** | ❌ No | ❌ **REMOVE** | Future payment timeline. |
| `progress_rate_per_100d` | Progress achieved per 100 days | ❌ **NO** | ⚠️ **YES** | ⚠️ **YES** | ❌ **REMOVE** | End-state progress rate. |
| `total_expenditure` (for delay) | Cumulative payments | ❌ **NO** | ⚠️ **YES** | ❌ No | ❌ **REMOVE** | Incurred post-kickoff. |
| `agency_avg_delay` (Global) | Agency historical delay | ⚠️ Leaked | ⚠️ **YES** | ❌ No | 🔄 **FIX** | Calculated strictly using expanding temporal window. |
| `district_completion_rate` (Global) | District historical completion rate | ⚠️ Leaked | ⚠️ **YES** | ❌ No | 🔄 **FIX** | Calculated strictly using past works only. |

---

## 3. Corrected Prediction Framing

### A. Predictive Delay Model (Machine Learning)
- **Question Answered:** *"At the time of sanction and project mobilization, what is the probability that this work will suffer substantial execution delays ($>45$ days)?"*
- **Allowed Feature Set:**
  - `sanctioned_amount`, `estimated_cost`, `recommended_amount`
  - `rec_to_sanction_days` (Administrative latency)
  - `planned_duration_days` (Contract duration)
  - `sector`, `state`, `district`
  - `cost_vs_peer_median_ratio`, `peer_cost_zscore`
  - `historical_agency_delay_rate` (computed strictly on historical works prior to sanction date)
  - `historical_district_completion_rate` (computed strictly on prior works)

### B. Current Delay & Stall Detection (Deterministic Status Engine)
- **Question Answered:** *"Is this project already overdue or stalled today?"*
- **Methodology:** Deterministic rule engine:
  $$\text{Is Overdue} = (\text{today} > \text{expected\_completion\_date}) \land (\text{status} \neq \text{COMPLETED})$$
  $$\text{Is Stalled} = (\text{work\_age} > 250\text{ days}) \land (\text{progress} < 20\%) \land (\text{status} \neq \text{COMPLETED})$$
- This is calculated separately and **never fed back into the predictive model**.
