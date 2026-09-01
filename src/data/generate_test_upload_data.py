"""
Script to generate realistic test upload datasets (CSV and Excel formats)
for the SIH 2026 live demonstration of the Dynamic Data Ingestion & Fallback feature.
"""

import pandas as pd
from pathlib import Path

out_dir = Path(r"C:\Users\kavit\Installation\SIH 2026\data\demo")
out_dir.mkdir(parents=True, exist_ok=True)

test_works = [
    # 1. Normal Compliant Road Work
    {
        "work_id": "TEST_UP_001",
        "work_description": "Construction of concrete road with side drainage in Shivpur ward",
        "sanctioned_amount": 1500000.0,
        "estimated_cost": 1500000.0,
        "recommended_amount": 1600000.0,
        "total_expenditure": 1420000.0,
        "fund_released": 1500000.0,
        "state": "Uttar Pradesh",
        "district": "Varanasi",
        "sector": "Roads, Pathways and Bridges",
        "mp_name": "Shri Narendra Modi",
        "implementing_agency": "District Rural Development Agency (DRDA)",
        "recommendation_date": "2024-02-10",
        "sanction_date": "2024-03-15",
        "expected_completion_date": "2024-11-30",
        "actual_completion_date": "2024-11-20",
        "completion_percentage": 100.0,
        "status": "COMPLETED",
        "payment_count": 3
    },
    # 2. Financial Anomaly (Severe Cost Overrun: 3.5x Peer Median)
    {
        "work_id": "TEST_UP_002",
        "work_description": "Construction of link road and paver blocks in rural sector",
        "sanctioned_amount": 6500000.0,  # Extreme cost for link road
        "estimated_cost": 6200000.0,
        "recommended_amount": 6500000.0,
        "total_expenditure": 7800000.0,  # 20% overrun on top of inflated budget
        "fund_released": 6500000.0,
        "state": "Uttar Pradesh",
        "district": "Varanasi",
        "sector": "Roads, Pathways and Bridges",
        "mp_name": "Shri Narendra Modi",
        "implementing_agency": "Public Works Department (PWD)",
        "recommendation_date": "2023-05-12",
        "sanction_date": "2023-08-20",
        "expected_completion_date": "2024-04-30",
        "actual_completion_date": None,
        "completion_percentage": 55.0,
        "status": "DELAYED",
        "payment_count": 6
    },
    # 3. Fund Utilization Anomaly (100% Fund Released, 0% Physical Progress)
    {
        "work_id": "TEST_MH_003",
        "work_description": "Installation of community solar RO drinking water purification plant",
        "sanctioned_amount": 1800000.0,
        "estimated_cost": 1800000.0,
        "recommended_amount": 1800000.0,
        "total_expenditure": 0.0,
        "fund_released": 1800000.0,  # 100% advance released
        "state": "Maharashtra",
        "district": "Pune",
        "sector": "Drinking Water Facility",
        "mp_name": "Shri Murlidhar Mohol",
        "implementing_agency": "Zilla Parishad Engineering Division",
        "recommendation_date": "2023-01-15",
        "sanction_date": "2023-03-01",
        "expected_completion_date": "2023-09-30",
        "actual_completion_date": None,
        "completion_percentage": 0.0,  # Zero execution after >1.5 years
        "status": "STALLED",
        "payment_count": 1
    },
    # 4. Normal Education Work
    {
        "work_id": "TEST_KA_004",
        "work_description": "Construction of two smart classrooms and science laboratory in Government High School",
        "sanctioned_amount": 2200000.0,
        "estimated_cost": 2150000.0,
        "recommended_amount": 2200000.0,
        "total_expenditure": 2100000.0,
        "fund_released": 2200000.0,
        "state": "Karnataka",
        "district": "Bengaluru Urban",
        "sector": "Education",
        "mp_name": "Shri Tejasvi Surya",
        "implementing_agency": "Karnataka Rural Infrastructure Development Ltd (KRIDL)",
        "recommendation_date": "2024-01-10",
        "sanction_date": "2024-02-25",
        "expected_completion_date": "2024-10-15",
        "actual_completion_date": "2024-10-10",
        "completion_percentage": 100.0,
        "status": "COMPLETED",
        "payment_count": 4
    },
    # 5. Semantic Duplicate Pair 1
    {
        "work_id": "TEST_BR_005_A",
        "work_description": "Construction of community hall and boundary wall at Panchayat Bhawan in Rajgir",
        "sanctioned_amount": 2500000.0,
        "estimated_cost": 2500000.0,
        "recommended_amount": 2500000.0,
        "total_expenditure": 1800000.0,
        "fund_released": 2500000.0,
        "state": "Bihar",
        "district": "Nalanda",
        "sector": "Community Centre / Halls",
        "mp_name": "Shri Kaushlendra Kumar",
        "implementing_agency": "Building Construction Department",
        "recommendation_date": "2023-09-01",
        "sanction_date": "2023-11-15",
        "expected_completion_date": "2024-07-31",
        "actual_completion_date": None,
        "completion_percentage": 65.0,
        "status": "IN_PROGRESS",
        "payment_count": 2
    },
    # 6. Semantic Duplicate Pair 2 (Same location, 92% identical description & cost)
    {
        "work_id": "TEST_BR_005_B",
        "work_description": "Construction of community hall with boundary wall near Panchayat Bhawan in Rajgir block",
        "sanctioned_amount": 2450000.0,
        "estimated_cost": 2450000.0,
        "recommended_amount": 2500000.0,
        "total_expenditure": 1200000.0,
        "fund_released": 2450000.0,
        "state": "Bihar",
        "district": "Nalanda",
        "sector": "Community Centre / Halls",
        "mp_name": "Shri Kaushlendra Kumar",
        "implementing_agency": "Rural Works Department",
        "recommendation_date": "2023-09-20",
        "sanction_date": "2023-12-05",
        "expected_completion_date": "2024-08-30",
        "actual_completion_date": None,
        "completion_percentage": 45.0,
        "status": "IN_PROGRESS",
        "payment_count": 2
    },
    # 7. Normal Healthcare Work
    {
        "work_id": "TEST_TN_007",
        "work_description": "Procurement and installation of advanced neonatal care equipment at Primary Health Centre",
        "sanctioned_amount": 3500000.0,
        "estimated_cost": 3500000.0,
        "recommended_amount": 3500000.0,
        "total_expenditure": 3450000.0,
        "fund_released": 3500000.0,
        "state": "Tamil Nadu",
        "district": "Chennai",
        "sector": "Health and Family Welfare",
        "mp_name": "Dr. Kalanidhi Veeraswamy",
        "implementing_agency": "Tamil Nadu Medical Services Corporation",
        "recommendation_date": "2024-03-01",
        "sanction_date": "2024-04-10",
        "expected_completion_date": "2024-09-30",
        "actual_completion_date": "2024-09-15",
        "completion_percentage": 100.0,
        "status": "COMPLETED",
        "payment_count": 2
    },
    # 8. Normal Sanitation Work
    {
        "work_id": "TEST_AP_008",
        "work_description": "Construction of public community sanitation complex with solar lighting",
        "sanctioned_amount": 1200000.0,
        "estimated_cost": 1200000.0,
        "recommended_amount": 1200000.0,
        "total_expenditure": 1180000.0,
        "fund_released": 1200000.0,
        "state": "Andhra Pradesh",
        "district": "Visakhapatnam",
        "sector": "Sanitation and Public Health",
        "mp_name": "Shri M. Sribharat",
        "implementing_agency": "Greater Visakhapatnam Municipal Corporation",
        "recommendation_date": "2024-02-15",
        "sanction_date": "2024-03-25",
        "expected_completion_date": "2024-08-15",
        "actual_completion_date": "2024-08-01",
        "completion_percentage": 100.0,
        "status": "COMPLETED",
        "payment_count": 3
    }
]

df_test = pd.DataFrame(test_works)

# 1. Save CSV
csv_path = out_dir / "test_upload_sample.csv"
df_test.to_csv(csv_path, index=False)

# 2. Save Excel (.xlsx)
xlsx_path = out_dir / "test_upload_sample.xlsx"
df_test.to_excel(xlsx_path, index=False)

print(f"Generated test upload datasets:")
print(f"  • CSV:   {csv_path}")
print(f"  • Excel: {xlsx_path}")
