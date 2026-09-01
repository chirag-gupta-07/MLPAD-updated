# MPLADS Master Dataset Exploratory Data Analysis (EDA) Report

- **Total Works Analyzed**: 1,500
- **Total Features / Columns**: 26
- **Total Sanctioned Budget**: ₹3,473,577,000.00 (347.36 Crore)
- **Total Expenditure**: ₹3,433,683,000.00 (343.37 Crore)
- **Overall Fund Utilization Rate**: 98.85%

## 1. Dataset Schema & Column Types
| Column Name | Non-Null Count | Data Type | Sample Value |
| :--- | :--- | :--- | :--- |
| `work_id` | 1,500 | object | MPLADS-18LS-K-02117 |
| `state` | 1,500 | object | Karnataka |
| `district` | 1,500 | object | Bengaluru Urban |
| `constituency` | 1,500 | object | BENGALURU URBAN CONSTITUENCY |
| `mp_name` | 1,500 | object | D.K. Suresh |
| `sector` | 1,500 | object | Drinking Water Infrastructure |
| `work_description` | 1,500 | object | Construction of community RO water pu... |
| `implementing_agency` | 1,500 | object | State Electricity Distribution Company |
| `location_name` | 1,500 | object | Dharavi, Main Market |
| `latitude` | 1,500 | float64 | 12.96357 |
| `longitude` | 1,500 | float64 | 77.60988 |
| `recommendation_date` | 1,500 | datetime64[ns] | 2024-04-19 00:00:00 |
| `sanction_date` | 1,500 | datetime64[ns] | 2024-05-20 00:00:00 |
| `expected_completion_date` | 1,500 | datetime64[ns] | 2024-12-06 00:00:00 |
| `actual_completion_date` | 580 | datetime64[ns] | 2025-07-18 00:00:00 |
| `recommended_amount` | 1,500 | int64 | 2692000 |
| `estimated_cost` | 1,500 | int64 | 2557000 |
| `sanctioned_amount` | 1,500 | int64 | 2692000 |
| `fund_released` | 1,500 | int64 | 3663000 |
| `total_expenditure` | 1,500 | float64 | 3663000.0 |
| `payment_count` | 1,500 | int64 | 6 |
| `latest_payment_date` | 1,406 | datetime64[ns] | 2025-02-04 00:00:00 |
| `status` | 1,500 | object | IN_PROGRESS |
| `completion_percentage` | 1,500 | float64 | 60.51575727087928 |
| `is_injected_anomaly` | 1,500 | bool | True |
| `synthetic_anomaly_type` | 1,500 | object | Financial Anomaly (Cost Overrun & Ext... |

## 2. Sectoral Distribution & Median Costs
| Sector Name | Works Count | % Share | Median Cost (₹) |
| :--- | :--- | :--- | :--- |
| Drinking Water Infrastructure | 378 | 25.2% | ₹1,292,500.00 |
| Sports & Youth Development Facilities | 201 | 13.4% | ₹2,485,000.00 |
| Community Halls & Public Assets | 200 | 13.3% | ₹3,130,000.00 |
| Public Health & Sanitation | 192 | 12.8% | ₹1,475,000.00 |
| Rural Electrification & Solar Lighting | 188 | 12.5% | ₹1,191,000.00 |
| Education & School Infrastructure | 182 | 12.1% | ₹1,845,500.00 |
| Roads, Pathways & Bridges | 159 | 10.6% | ₹2,191,000.00 |

## 3. Project Status Breakdown
| Status | Count | % Share |
| :--- | :--- | :--- |
| `IN_PROGRESS` | 631 | 42.1% |
| `COMPLETED` | 580 | 38.7% |
| `DELAYED` | 129 | 8.6% |
| `SANCTIONED` | 94 | 6.3% |
| `STALLED` | 66 | 4.4% |

## 4. Top States by Works Volume
| State / UT | Works Count | % Share |
| :--- | :--- | :--- |
| Bihar | 148 | 9.9% |
| Maharashtra | 137 | 9.1% |
| Uttar Pradesh | 130 | 8.7% |
| Tamil Nadu | 119 | 7.9% |
| Delhi | 116 | 7.7% |
| Rajasthan | 116 | 7.7% |
| West Bengal | 115 | 7.7% |
| Karnataka | 110 | 7.3% |
| Telangana | 109 | 7.3% |
| Gujarat | 107 | 7.1% |

## 5. Documented Anomaly & Risk Categories
- **Normal / Compliant Works**: 1,050 (70.0%)
- **Documented Risk Flags**: 450 (30.0%)

| Risk / Anomaly Category | Count |
| :--- | :--- |
| None (Compliant) | 1,050 |
| Financial Anomaly (Cost Overrun & Extreme Peer Outlier) | 120 |
| Utilization Anomaly (Full Fund Disbursal with Zero Physical Progress) | 75 |
| Geographic Cluster Anomaly (Repeated High-Risk Works under Single IA) | 75 |
| Stalled Work (Zero / Nominal Progress for >1 Year) | 66 |
| Severe Schedule Delay (>200 Days Past Deadline) | 54 |
| Potential Duplicate Work (Pair A - Primary Work) | 30 |
| Potential Duplicate Work (Pair B - Near Duplicate of MPLADS-18LS-TN-02329) | 1 |
| Potential Duplicate Work (Pair B - Near Duplicate of MPLADS-18LS-UP-02293) | 1 |
| Potential Duplicate Work (Pair B - Near Duplicate of MPLADS-18LS-T-02305) | 1 |
| Potential Duplicate Work (Pair B - Near Duplicate of MPLADS-18LS-AP-02319) | 1 |
| Potential Duplicate Work (Pair B - Near Duplicate of MPLADS-18LS-K-02325) | 1 |
| Potential Duplicate Work (Pair B - Near Duplicate of MPLADS-18LS-AP-02345) | 1 |
| Potential Duplicate Work (Pair B - Near Duplicate of MPLADS-18LS-K-02341) | 1 |
| Potential Duplicate Work (Pair B - Near Duplicate of MPLADS-18LS-G-02295) | 1 |
| Potential Duplicate Work (Pair B - Near Duplicate of MPLADS-18LS-B-02307) | 1 |
| Potential Duplicate Work (Pair B - Near Duplicate of MPLADS-18LS-M-02323) | 1 |
| Potential Duplicate Work (Pair B - Near Duplicate of MPLADS-18LS-A-02309) | 1 |
| Potential Duplicate Work (Pair B - Near Duplicate of MPLADS-18LS-TN-02349) | 1 |
| Potential Duplicate Work (Pair B - Near Duplicate of MPLADS-18LS-G-02313) | 1 |
| Potential Duplicate Work (Pair B - Near Duplicate of MPLADS-18LS-G-02303) | 1 |
| Potential Duplicate Work (Pair B - Near Duplicate of MPLADS-18LS-UP-02327) | 1 |
| Potential Duplicate Work (Pair B - Near Duplicate of MPLADS-18LS-AP-02311) | 1 |
| Potential Duplicate Work (Pair B - Near Duplicate of MPLADS-18LS-G-02315) | 1 |
| Potential Duplicate Work (Pair B - Near Duplicate of MPLADS-18LS-T-02335) | 1 |
| Potential Duplicate Work (Pair B - Near Duplicate of MPLADS-18LS-MP-02347) | 1 |
| Potential Duplicate Work (Pair B - Near Duplicate of MPLADS-18LS-G-02299) | 1 |
| Potential Duplicate Work (Pair B - Near Duplicate of MPLADS-18LS-UP-02301) | 1 |
| Potential Duplicate Work (Pair B - Near Duplicate of MPLADS-18LS-D-02333) | 1 |
| Potential Duplicate Work (Pair B - Near Duplicate of MPLADS-18LS-TN-02339) | 1 |
| Potential Duplicate Work (Pair B - Near Duplicate of MPLADS-18LS-T-02321) | 1 |
| Potential Duplicate Work (Pair B - Near Duplicate of MPLADS-18LS-B-02343) | 1 |
| Potential Duplicate Work (Pair B - Near Duplicate of MPLADS-18LS-T-02317) | 1 |
| Potential Duplicate Work (Pair B - Near Duplicate of MPLADS-18LS-K-02291) | 1 |
| Potential Duplicate Work (Pair B - Near Duplicate of MPLADS-18LS-T-02331) | 1 |
| Potential Duplicate Work (Pair B - Near Duplicate of MPLADS-18LS-AP-02297) | 1 |
| Potential Duplicate Work (Pair B - Near Duplicate of MPLADS-18LS-WB-02337) | 1 |