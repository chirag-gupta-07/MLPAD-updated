# Model Card: MPLADS Risk Intelligence Suite

## Model Overview
- **Model Suite:** Multi-Signal Risk & Anomaly Intelligence (Isolation Forest + Random Forest / XGBoost + TF-IDF Vector Similarity)
- **Problem Statement:** SIH26102 (MoSPI / DIID)
- **Domain:** Decision Support System for MPLADS Scheme Monitoring

## Intended Use
- **Primary Use Case:** Early warning risk scoring and prioritization of MPLADS works for supervisory field audits by District Magistrates, State Nodal Authorities, and MoSPI administrators.
- **Out-of-Scope Use:** The platform is an analytical Decision Support System and must **not** be used as an autonomous punitive legal arbiter without human physical verification.

## Model Components & Training Strategy
1. **Financial Anomaly Model (`models/financial_anomaly_model.joblib`)**:
   - Algorithm: `IsolationForest` (150 estimators, `contamination=0.08`) + `RobustScaler`
   - Inputs: Sanctioned amount, total expenditure, cost deviation, peer median cost ratio, sector z-score, fund velocity.
2. **Predictive Delay Model (`models/delay_model.joblib`)**:
   - Algorithm: `RandomForestClassifier` (150 trees, `max_depth=6`)
   - Inputs: Pre-kickoff features only (`sanctioned_amount`, `estimated_cost`, `rec_to_sanction_days`, `planned_duration_days`, `sector`, `state`).
   - Performance: High-Recall Early Warning Filter (Recall: 94.34%, F1: 70.67% on temporal out-of-time test set).
3. **Duplicate Detection Index (`models/duplicate_tfidf_vectorizer.joblib`)**:
   - Algorithm: TF-IDF (1-3 ngrams) + Cosine Similarity + Haversine distance threshold (<25km) + Cost envelope matching.

## Ethical Considerations & Fairness
- Works in remote or underserved regions must not be penalized due to lower historical reporting rates.
- Progressive peer grouping ensures small rural districts are evaluated against relevant state/sector baselines rather than high-cost urban metros.
