# Changelog — MLPAD Risk Intelligence Platform

All notable changes, architectural enhancements, and analytical models added to the MPLADS AI Risk Intelligence Platform (SIH26102 — MoSPI).

---

## [2.0.0] - 2026-09-09 — Advanced AI/ML & Enterprise Security Release

### 🔍 Task 1: Computer Vision Ground Truth & Photo Evidence Verification
- **Perceptual-Hash Photo Deduplication**: Added `imagehash` pHash computation on evidence submission to detect cross-project photo reuse (Hamming distance < 8 flags `REUSED_PHOTO_SUSPECTED`).
- **Zero-Shot Construction Stage Classification**: Integrated zero-shot CLIP classification (`openai/clip-vit-base-patch32`) classifying photos into `{EMPTY_SITE, FOUNDATION, STRUCTURE_IN_PROGRESS, FINISHING, COMPLETED_OPERATIONAL, NOT_CONSTRUCTION}` with Gemini Vision and heuristic fallbacks.
- **Physical Progress Cross-Check**: Discrepancy cross-check comparing classified physical stage against official e-SAKSHI progress metrics (flags `IMAGE_PROGRESS_MISMATCH` with severity `HIGH` if portal reports >80% completion but photo reveals bare ground or initial excavation).
- **Risk Fusion Integration**: Added `citizen_evidence` dimension into the composite risk calculation (`config/risk_weights.yaml` and `src/risk/risk_engine.py`).

### 🕸️ Task 2: Contractor–Agency–MP Relational Network Anomaly Detection
- **Network Graph Engine (`src/risk/network_analysis.py`)**: Built `networkx` bipartite/multipartite graph modeling relationships between contractors, implementing agencies, MP constituencies, and districts, weighted by awarded volume and sanctioned value.
- **Relational Fraud Metrics**: Computed degree centrality, constituency concentration ratio, and community detection (`greedy_modularity_communities`) to flag monopolistic contractor favoritism and cartel bid-rotation patterns.
- **Network REST Endpoint (`GET /api/risk/network`)**: Exposed graph structure and normalized `network_risk_score` (0-100) per contractor and constituency.

### ⏱️ Task 3: Leakage-Free Predictive Delay Classification Strengthening
- **Pre-Kickoff Feature Expansion**: Injected 5 new temporal, strictly pre-kickoff features in `src/features/build_features.py`:
  - `agency_rolling_ontime_rate`: Agency historical on-time completion rate prior to work sanction date.
  - `mp_concurrent_open_works`: MP's simultaneous uncompleted works at sanction date.
  - `sector_state_interaction`: Categorical interaction capturing regional administrative complexity.
  - `sanction_month`: Capturing seasonal monsoon/fiscal deadline administrative patterns.
  - `rec_to_sanction_days`: Verified recommendation-to-sanction administrative latency.
- **Model Tuning & Calibration**: Added `class_weight='balanced'`, `XGBoostClassifier` support with `scale_pos_weight`, and `CalibratedClassifierCV` isotonic regression in `src/training/train_delay_model.py`.
- **Explainable AI (XAI)**: Integrated `shap.TreeExplainer` in `src/explainability/explain_risk.py` providing top 3 plain-English pre-kickoff risk drivers.
- **Audit Compliance**: Updated `docs/MODEL_EVALUATION_REPORT.md` on temporal out-of-time evaluation split.

### 📄 Task 4: Semantic Sentence-Embedding Duplicate Work Detection
- **Sentence-Transformers Upgrade (`src/utils/embeddings.py`)**: Integrated `all-MiniLM-L6-v2` embeddings for deep semantic comparison, eliminating false negatives from vocabulary variation (e.g., "community hall" vs. "village meeting center").
- **Hybrid Similarity Ranking**: Combined sub-linear TF-IDF (fast pre-filter) + sentence embeddings + Haversine geospatial proximity + budget envelope matching.
- **Artifact Caching**: Added persistent disk caching (`models/work_description_embeddings.npy`) for rapid reboot and offline demo execution.

### 🏛️ Task 5: RAG-Grounded Statutory Policy Assistant
- **Statutory Policy Knowledge Base (`docs/POLICY_REFERENCE.md`)**: Synthesized key provisions of MPLADS Guidelines 2016 (amended) and GFR 2017 (Rules 144, 149, 170, 173(xxiv), 130, 133).
- **In-Memory Semantic Retrieval**: Factored cosine similarity retrieval in `src/utils/embeddings.py` dynamically retrieving the top relevant policy paragraphs without external vector database dependencies.
- **Trust & Source Attributions**: Updated `backend/app/api/assistant.py` to inject policy context and return explicit `sources` citations (`"document"`, `"section"`, `"relevance_score"`).

### 🛡️ Enterprise Security & RBAC Hardening
- **Authentication & RBAC Gate**: Secured all operations endpoints (`approvals.py`, `payments_api.py`, `attendance.py`, `inventory.py`, `daily_updates.py`, `dev_requests.py`, `citizen_evidence.py`, `contractors.py`) with `require_roles()` and `get_current_user()` JWT verification, replacing client-supplied identity parameters with server-derived claims.
- **IDOR Protection**: Added work order ownership verification in `contractors.py` preventing contractors from modifying competitors' projects.
- **CORS Allowlist**: Replaced insecure wildcard CORS with configurable `CORS_ORIGINS` allowlist.
- **JWT Secret Gating**: Fail-closed validation requiring explicit `JWT_SECRET` in non-demo production environments.
- **State Machine Integrity**: Fixed approval state machine transitions in `backend/app/db/operations_db.py` preventing invalid direct jumps from proposal to sanction.
- **E-Procurement AI Award Gating**: Updated `backend/app/api/tenders.py` to require `EVALUATING` status, enforce AI document qualification (`QUALIFIED`), and attach cartel collusion warnings to award responses.
- **Cache Concurrency Guard**: Added `threading.Lock` double-checked locking in `backend/app/services/data_service.py` to prevent thundering-herd re-reads during concurrent cache invalidation.
- **Benford's Law Forensic Accounting**: Created `backend/app/services/benford_analysis.py` (`GET /api/risk/benford-analysis`) to detect digit-distribution anomalies and fabricated billing.
