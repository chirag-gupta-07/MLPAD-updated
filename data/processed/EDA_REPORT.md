# MPLADS Master Dataset Exploratory Data Analysis (EDA) Report

- **Total Works Analyzed**: 79,082
- **Total Features / Columns**: 22
- **Total Sanctioned Budget**: ₹41,692,655,772.88 (4,169.27 Crore)
- **Total Expenditure**: ₹27,713,351,970.45 (2,771.34 Crore)
- **Overall Fund Utilization Rate**: 66.47%

## 1. Dataset Schema & Column Types
| Column Name | Non-Null Count | Data Type | Sample Value |
| :--- | :--- | :--- | :--- |
| `work_id` | 79,082 | object | WS/MP620/2024-2025/133166 |
| `work_description` | 79,082 | object | Construction of Community Bhavan at N... |
| `sector` | 79,082 | object | Community Halls & Public Assets |
| `status` | 79,082 | object | COMPLETED |
| `state` | 79,082 | object | Karnataka |
| `district` | 79,082 | object | Dharwad |
| `constituency` | 79,082 | object | Dharwad |
| `mp_name` | 79,082 | object | Pralhad Venkatesh Joshi |
| `implementing_agency` | 79,082 | object | SHRINIVAS S MAVINAKAI CONTRACTOR |
| `sanctioned_amount` | 79,082 | float64 | 497185.0 |
| `recommended_amount` | 79,082 | float64 | 497185.0 |
| `estimated_cost` | 79,082 | float64 | 497185.0 |
| `fund_released` | 79,082 | float64 | 497185.0 |
| `total_expenditure` | 79,082 | float64 | 497185.0 |
| `payment_count` | 79,082 | int64 | 1 |
| `recommendation_date` | 79,082 | datetime64[ns] | 2024-07-08 00:00:00 |
| `sanction_date` | 79,082 | datetime64[ns] | 2024-07-09 00:00:00 |
| `expected_completion_date` | 79,082 | datetime64[ns] | 2025-07-09 00:00:00 |
| `actual_completion_date` | 34,275 | datetime64[ns] | 2024-10-14 00:00:00 |
| `completion_percentage` | 79,082 | float64 | 100.0 |
| `latitude` | 79,082 | float64 | 15.46784 |
| `longitude` | 79,082 | float64 | 75.02599 |

## 2. Sectoral Distribution & Median Costs
| Sector Name | Works Count | % Share | Median Cost (₹) |
| :--- | :--- | :--- | :--- |
| Community Halls & Public Assets | 29,491 | 37.3% | ₹336,000.00 |
| Roads, Pathways & Bridges | 21,595 | 27.3% | ₹495,058.00 |
| Rural Electrification & Solar Lighting | 14,763 | 18.7% | ₹200,502.00 |
| Education & School Infrastructure | 5,869 | 7.4% | ₹499,900.00 |
| Drinking Water Infrastructure | 5,598 | 7.1% | ₹200,000.00 |
| Public Health & Sanitation | 852 | 1.1% | ₹500,000.00 |
| Sports & Youth Development Facilities | 550 | 0.7% | ₹400,040.00 |
| Irrigation & Water Conservation | 364 | 0.5% | ₹300,000.00 |

## 3. Project Status Breakdown
| Status | Count | % Share |
| :--- | :--- | :--- |
| `COMPLETED` | 34,275 | 43.3% |
| `SANCTIONED` | 32,640 | 41.3% |
| `IN_PROGRESS` | 12,167 | 15.4% |

## 4. Top States by Works Volume
| State / UT | Works Count | % Share |
| :--- | :--- | :--- |
| Uttar Pradesh | 15,019 | 19.0% |
| Gujarat | 6,398 | 8.1% |
| Madhya Pradesh | 5,670 | 7.2% |
| West Bengal | 4,804 | 6.1% |
| Bihar | 4,545 | 5.7% |
| Odisha | 4,163 | 5.3% |
| Tamil Nadu | 4,070 | 5.1% |
| Telangana | 3,764 | 4.8% |
| Jharkhand | 3,666 | 4.6% |
| Punjab | 3,584 | 4.5% |

## 5. Risk Assessment Overview
Works evaluated under Multi-Signal Calibrated Risk Engine across Delay, Financial Anomaly, Utilization, and Semantic Duplicate dimensions.