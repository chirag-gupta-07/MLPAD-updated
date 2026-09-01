# Technical Analysis: Official MPLADS Data Sources & Identified Public Endpoints

**Project:** SIH26102 — Development of an AI-Powered System to Detect Anomalies, Potential Fraud Indicators, and Inefficiencies in MPLAD Scheme Implementation  
**Organization:** Ministry of Statistics and Programme Implementation (MoSPI) / Data Informatics & Innovation Division (DIID)  
**Document Type:** Technical Source Verification & Endpoint Audit  
**Verification Standard:** Normal Permitted Public HTTP Inspection (No Authentication or Anti-Bot Bypass)  

---

## 1. Official Digital Ecosystem Overview

| Property | Details |
| :--- | :--- |
| **Primary Portal URL** | `https://mplads.mospi.gov.in/digigov/dashboard.html` |
| **Official Problem Statement** | `https://sih2026.vuce.in/ps/SIH26102` |
| **Scheme Implementation Date** | 1 April 2023 (Revised e-SAKSHI digital flow) |
| **Maintaining Agency** | Ministry of Statistics and Programme Implementation (MoSPI) / TCS |
| **Access Model** | Public Citizen Dashboard (Pre-Login Open Data Endpoints) + Authenticated ZK Portal (`Login.zul`) |

---

## 2. Identified Public Dashboard Data Endpoints Audit

Through inspection of public client scripts (`preLoginDashboard.js`, `poptable.js`, `graph.js`), the following public data endpoints were tested and verified:

### Endpoint 1: State & UT Master
- **Endpoint:** `/rest/PreLoginDashboardData/getStateData`
- **Base URL:** `https://mplads.mospi.gov.in`
- **HTTP Method:** `POST`
- **Payload:** `{"combo": ["0", "0", "0", "2"], "house": "LS"}`
- **Verification Status:** **`VERIFIED`**
- **HTTP Response:** `200 OK` (JSON)
- **Observed Schema Fields:**
  - `STATE_ID` (Integer, e.g. `2`, `9`, `27`)
  - `STATE_NAME` (String, e.g. `"Andhra Pradesh"`, `"Uttar Pradesh"`)

### Endpoint 2: Parliamentary Constituency Master
- **Endpoint:** `/rest/PreLoginDashboardData/getConstituencyData`
- **Base URL:** `https://mplads.mospi.gov.in`
- **HTTP Method:** `POST`
- **Payload:** `{"id": 2}` *(where `id` is `STATE_ID`)*
- **Verification Status:** **`VERIFIED`**
- **HTTP Response:** `200 OK` (JSON)
- **Observed Schema Fields:**
  - `ID` (Integer constituency identifier)
  - `CAPTION` (String constituency name, e.g. `"ANAKAPALLE"`, `"HINDUPUR"`)

### Endpoint 3: Member of Parliament & Constituency Roster
- **Endpoint:** `/rest/PreLoginDashboardData/getMpAndConstCombo`
- **Base URL:** `https://mplads.mospi.gov.in`
- **HTTP Method:** `POST`
- **Payload:** `{"state_id": 2, "house": "LS"}`
- **Verification Status:** **`VERIFIED`**
- **HTTP Response:** `200 OK` (JSON)
- **Observed Schema Fields:**
  - `ID` (Integer MP identifier)
  - `CAPTION` (String MP name)

### Endpoint 4: Parliamentary Tenure Master
- **Endpoint:** `/rest/PreLoginDashboardData/getTenureData`
- **Base URL:** `https://mplads.mospi.gov.in`
- **HTTP Method:** `POST`
- **Payload:** `{"uname": "0,0,0,2"}`
- **Verification Status:** **`VERIFIED`**
- **HTTP Response:** `200 OK` (JSON)
- **Observed Schema Fields:**
  - `[{"ID": 5, "CAPTION": "17th Lok Sabha"}, {"ID": 7, "CAPTION": "18th Lok Sabha"}]`

### Endpoint 5: National & State Macro Financial Metrics
- **Endpoint:** `/rest/PreLoginDashboardData/getTilesData`
- **Base URL:** `https://mplads.mospi.gov.in`
- **HTTP Method:** `POST`
- **Payload:** `{"uname": "0,0,0,2"}` *(or `<state_id>,0,0,<tenure_id>`)*
- **Verification Status:** **`VERIFIED`**
- **HTTP Response:** `200 OK` (JSON)
- **Observed Schema Fields:**
  - `"Allocated Limit for Hon'ble MPs"`: `[Amount_INR, Amount_Crore]`
  - `"Works Recommended"`: `[Count, Amount_INR, Amount_Crore]`
  - `"Works Sanctioned"`: `[Count, Amount_INR, Amount_Crore]`
  - `"Works Completed"`: `[Count, Amount_INR, Amount_Crore]`
  - `"Expenditure on Completed and On-going Works as on Date"`: `[Amount_INR, Amount_Crore]`

### Endpoint 6: Work-Level Register Reports
- **Endpoint:** `/rest/PreLoginDashboardData/getTilesReportData`
- **Base URL:** `https://mplads.mospi.gov.in`
- **HTTP Method:** `POST`
- **Payload:** `{"combo": ["<state_id>", "<constituency_id>", "<mp_id>", "<tenure_id>"], "key": "<Metric_Key>"}`
- **Verification Status:** **`PARTIALLY VERIFIED`**
- **Findings:** Responds with work-level JSON arrays for state-filtered queries; large unfiltered national queries may experience connection timeouts on public bandwidth. State-by-state batching is required.

---

## 3. Data Ingestion & Fallback Architecture

To ensure 100% platform availability during demonstrations and production usage:

1. **Primary**: Automated background client (`src/ingestion/fetch_real_mplads_data.py`) querying public endpoints with polite rate-limiting.
2. **Fallback 1 (CSV Upload)**: Drag-and-drop manual upload (`/api/data/upload`) supporting standard government exports.
3. **Fallback 2 (XLSX Upload)**: Automatic column alias mapper normalizing Excel sheets.
4. **Offline Demo Mode**: Pre-evaluated standalone benchmark dataset bundled in `data/demo/mplads_demo_dataset.parquet` guaranteeing zero dependency on external network conditions during judge evaluations.
