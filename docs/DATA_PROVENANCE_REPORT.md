# 📊 Data Provenance & Lineage Report

**Project:** AI-Powered MPLADS Risk Intelligence Platform (SIH26102)  
**Standard:** Full Data Lineage & Synthetic Audit Transparency  

---

## 1. Data Inventories & Storage Segregation

| Dataset Name | Storage Path | Source / Type | Record Count | Role in Pipeline |
| :--- | :--- | :--- | :---: | :--- |
| **Official State Master** | `data/raw/work_register/official_states.json` | Official MoSPI e-SAKSHI API | 36 States/UTs | Geographic Reference |
| **Official Macro Metrics** | `data/raw/work_register/official_macro_tiles.json` | Official MoSPI e-SAKSHI API | 1 Payload | National KPI Benchmarking |
| **Raw Work Ingest** | `data/raw/work_register/mplads_works_raw.csv` | Hybrid Benchmark Ingestion | 1,500 rows | Raw Input Staging |
| **Cleaned Interim Data** | `data/interim/cleaned_works.csv` | Cleaned Pipeline Output | 1,500 rows | Reconciled Currency & Dates |
| **Master Parquet Lake** | `data/processed/master_works.parquet` | Processed Master Lake | 1,500 rows | Baseline for Feature Engineering |
| **Engineered Features** | `data/processed/features_master.parquet` | Leakage-Free Feature Matrix | 1,500 rows | ML Training & Temporal Split |
| **Final Evaluated Lake** | `data/processed/final_evaluated_works.parquet` | Risk Engine + XAI Explanations | 1,500 rows | Live Serving & Dashboard DB |
| **Demo Benchmark Set** | `data/demo/mplads_demo_dataset.parquet` | Curated Standalone Demo | 1,500 rows | Offline Judge Demonstration |

---

## 2. Injected Anomaly Breakdown & Audit Flags

To rigorously evaluate anomaly models without fabricating real government fraud claims, synthetic test cases are explicitly flagged in every record:

| Anomaly Classification | Category Tag (`synthetic_anomaly_type`) | Audit Flag (`is_injected_anomaly`) | Record Count | % Share |
| :--- | :--- | :---: | :---: | :---: |
| **Normal / Compliant Baseline** | `None (Compliant)` | `False` | **1,050** | **70.0%** |
| **Financial Cost Overrun** | `Financial Anomaly (Cost Overrun & Extreme Peer Outlier)` | `True` | 120 | 8.0% |
| **Fund Flow Irregularity** | `Utilization Anomaly (Full Fund Disbursal with Zero Physical Progress)` | `True` | 75 | 5.0% |
| **Geographic Risk Hotspot** | `Geographic Cluster Anomaly (Repeated High-Risk Works under Single IA)` | `True` | 75 | 5.0% |
| **Project Stalling** | `Stalled Work (Zero / Nominal Progress for >1 Year)` | `True` | 66 | 4.4% |
| **Severe Delay** | `Severe Schedule Delay (>200 Days Past Deadline)` | `True` | 54 | 3.6% |
| **Duplicate Work Pairs** | `Potential Duplicate Work (Pair A / Pair B)` | `True` | 60 | 4.0% |

> **Ethical Compliance**: No synthetic test record is ever represented as a real criminal finding. All evaluations clearly display their synthetic validation provenance.
