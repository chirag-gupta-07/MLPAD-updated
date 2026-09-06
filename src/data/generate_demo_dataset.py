"""
Demo and Benchmark Dataset Generator for MPLADS Risk Intelligence Platform.
Generates realistic, high-fidelity MPLADS works across Indian states, districts, and sectors.
Includes:
- 70% Normal compliant works (completed, on-schedule, standard cost distributions)
- 30% Documented Risk Indicators & Anomalies:
  1. Financial Anomaly (Cost overruns > 2.0x peer median, expenditure > sanctioned)
  2. Severe Delay / Stalled Works (60 to 300+ days past expected completion, 0% progress)
  3. Potential Semantic & Geographic Duplicate Pairs (e.g. identical road/hall in same block)
  4. Abnormal Fund Utilization (100% funds released with 0% progress, or rapid spurt)
  5. High-Risk Geographic Clusters (concentrated anomalies in specific districts)

Maintains explicit audit columns:
`is_injected_anomaly`: bool
`synthetic_anomaly_type`: str
"""

import json
import random
import hashlib
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any, Tuple
import pandas as pd
import numpy as np

# Import geographic reference
import sys
sys.path.append(str(Path(__file__).resolve().parents[2]))
from src.ingestion.geo_reference import STATE_COORDINATES, DISTRICT_COORDINATES, get_coordinates

random.seed(42)
np.random.seed(42)

SECTORS = [
    "Roads, Pathways & Bridges",
    "Drinking Water Infrastructure",
    "Public Health & Sanitation",
    "Education & School Infrastructure",
    "Community Halls & Public Assets",
    "Rural Electrification & Solar Lighting",
    "Irrigation & Water Conservation",
    "Sports & Youth Development Facilities"
]

SECTOR_COST_RANGES = {
    "Roads, Pathways & Bridges": (500000.0, 3500000.0),
    "Drinking Water Infrastructure": (200000.0, 1500000.0),
    "Public Health & Sanitation": (300000.0, 2500000.0),
    "Education & School Infrastructure": (400000.0, 3000000.0),
    "Community Halls & Public Assets": (800000.0, 5000000.0),
    "Rural Electrification & Solar Lighting": (250000.0, 1800000.0),
    "Irrigation & Water Conservation": (500000.0, 4000000.0),
    "Sports & Youth Development Facilities": (600000.0, 3500000.0)
}

STATE_DISTRICT_MAP = {
    "Uttar Pradesh": ["Varanasi", "Lucknow", "Kanpur Nagar", "Gorakhpur", "Prayagraj", "Agra", "Meerut", "Ayodhya"],
    "Maharashtra": ["Mumbai", "Mumbai Suburban", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad", "Solapur"],
    "Karnataka": ["Bengaluru Urban", "Bengaluru Rural", "Mysuru", "Dharwad", "Belagavi", "Dakshina Kannada"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem"],
    "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Anantapur"],
    "Telangana": ["Hyderabad", "Ranga Reddy", "Warangal", "Medak"],
    "West Bengal": ["Kolkata", "North 24 Parganas", "South 24 Parganas", "Howrah", "Darjeeling"],
    "Bihar": ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota"],
    "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur"],
    "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot"],
    "Assam": ["Kamrup Metropolitan", "Guwahati", "Dibrugarh"],
    "Delhi": ["New Delhi", "South Delhi", "East Delhi", "North Delhi"]
}

MP_NAMES_BY_STATE = {
    "Uttar Pradesh": ["Narendra Modi", "Rajnath Singh", "Akhilesh Yadav", "Ravi Kishan", "Smriti Irani", "Rahul Gandhi"],
    "Maharashtra": ["Nitin Gadkari", "Supriya Sule", "Shrikant Shinde", "Piyush Goyal", "Amol Kolhe"],
    "Karnataka": ["Tejasvi Surya", "D.K. Suresh", "Pralhad Joshi", "Shobha Karandlaje"],
    "Tamil Nadu": ["Dayanidhi Maran", "Kanimozhi Karunanidhi", "A. Raja", "Thol. Thirumavalavan"],
    "Andhra Pradesh": ["C.M. Ramesh", "Sivanath Kesineni", "Maddila Gurumoorthy", "GM Harish Balayogi"],
    "Telangana": ["Asaduddin Owaisi", "G. Kishan Reddy", "Bandi Sanjay Kumar"],
    "West Bengal": ["Abhishek Banerjee", "Mahua Moitra", "Sudip Bandyopadhyay", "Sukanta Majumdar"],
    "Bihar": ["Ravi Shankar Prasad", "Giriraj Singh", "Chirag Paswan", "Misa Bharti"],
    "Rajasthan": ["Om Birla", "Gajendra Singh Shekhawat", "Arjun Ram Meghwal"],
    "Madhya Pradesh": ["Jyotiraditya Scindia", "Shivraj Singh Chouhan", "V.D. Sharma"],
    "Gujarat": ["Amit Shah", "C.R. Patil", "Mansukh Mandaviya"],
    "Assam": ["Sarbananda Sonowal", "Gaurav Gogoi", "Badruddin Ajmal"],
    "Delhi": ["Manoj Tiwari", "Bansuri Swaraj", "Praveen Khandelwal"]
}

AGENCIES = [
    "Public Works Department (PWD)",
    "Panchayati Raj Engineering Division",
    "Rural Development Agency (DRDA)",
    "Municipal Corporation Infrastructure Cell",
    "Irrigation & Water Resources Department",
    "State Electricity Distribution Company",
    "Central Public Works Department (CPWD)",
    "District Urban Development Cell (DUDC)"
]

DESCRIPTION_TEMPLATES = {
    "Roads, Pathways & Bridges": [
        "Construction of CC road and side drains from {loc1} to {loc2} in {block}",
        "Interlocking paver tile pavement work on internal connecting road at {loc1}",
        "Widening and blacktopping of approach road to Primary Health Centre at {loc1}",
        "Construction of box culvert and approach slab on village connecting road at {loc2}"
    ],
    "Drinking Water Infrastructure": [
        "Installation of high-capacity submersible pump and overhead water storage tank at {loc1}",
        "Setting up of solar-powered piped drinking water supply scheme with purification unit at {loc2}",
        "Construction of community RO water purification plant and distribution kiosk near {loc1}",
        "Deep drilling of tubewell and piped distribution network for Scheduled Caste settlement at {loc2}"
    ],
    "Public Health & Sanitation": [
        "Construction of 10-seater community sanitary complex with running water facility at {loc1}",
        "Procurement and installation of advanced life support ambulance equipment for PHC {loc1}",
        "Construction of modern public toilet block and incinerator unit near market yard at {loc2}",
        "Renovation and upgradation of maternity ward at Community Health Centre {loc1}"
    ],
    "Education & School Infrastructure": [
        "Construction of 2 additional smart classrooms and computer lab at Government Inter College, {loc1}",
        "Erection of boundary wall and solar rooftop installation at Government Primary School, {loc2}",
        "Construction of dining hall and modular kitchen under PM-POSHAN at High School, {loc1}",
        "Installation of STEM laboratory equipment and interactive digital boards at {loc2}"
    ],
    "Community Halls & Public Assets": [
        "Construction of Multi-purpose Community Hall (Barat Ghar) for public gatherings at {loc1}",
        "Development of open community gymnasium and senior citizen park at {loc2}",
        "Construction of Kalyan Mandapam and civic utility hall near Panchayat Bhavan, {loc1}",
        "Renovation of historical community gathering stage and shed at {loc2}"
    ],
    "Rural Electrification & Solar Lighting": [
        "Installation of 25 Nos. standalone All-in-One Solar LED street lighting systems in {loc1}",
        "Electrification of unserved habitations and high-mast solar lighting tower at main square, {loc2}",
        "Supply and erection of 50W solar street lights across major village crossroads in {loc1}",
        "Installation of 10 kVA hybrid solar power backup system for Gram Panchayat office at {loc2}"
    ],
    "Irrigation & Water Conservation": [
        "Construction of check dam and water harvesting recharge structure on seasonal stream at {loc1}",
        "Desiltation and stone-pitching rejuvenation of ancient community percolation tank at {loc2}",
        "Laying of underground PVC irrigation pipeline network for marginal farmers at {loc1}",
        "Construction of field percolation channels and micro-watershed bunding in {loc2}"
    ],
    "Sports & Youth Development Facilities": [
        "Construction of outdoor synthetic volleyball and badminton sports facility at {loc1}",
        "Development of youth athletic running track and open training pavilion at {loc2}",
        "Erection of multi-sport gymnasium and training center for rural athletes at {loc1}",
        "Construction of floodlit mini-stadium complex and spectator stands at {loc2}"
    ]
}

VILLAGE_NAMES = [
    "Rampur", "Shivpur", "Kalyanpur", "Chandpur", "Mohanpur", "Govindpur", "Gopalpur",
    "Madhopur", "Sultanpur", "Fatehpur", "Bhagwanpur", "Haridaspur", "Bikrampur", "Daulatpur",
    "Ganeshpur", "Lakshmipur", "Sundarpur", "Navagram", "Belapur", "Kothrud", "Dharavi"
]

BLOCKS = ["Ward 12", "Block A", "Gram Panchayat North", "South Sector", "Basti No 4", "East Zone", "Main Market"]


def generate_work_id(seq: int, state: str, tenure: str = "18LS") -> str:
    state_code = "".join([w[0] for w in state.split()[:2]]).upper()
    return f"MPLADS-{tenure}-{state_code}-{seq:05d}"


def create_dataset(total_records: int = 1500) -> pd.DataFrame:
    """
    Generates a realistic, multi-state dataset of MPLADS works with controlled anomalies.
    """
    records: List[Dict[str, Any]] = []
    
    start_date_base = datetime(2023, 4, 1)
    current_date = datetime(2026, 8, 1)
    
    # We will generate 70% normal and 30% designated risk categories
    num_normal = int(total_records * 0.70)
    num_financial_anomalies = int(total_records * 0.08)
    num_delay_anomalies = int(total_records * 0.08)
    num_duplicate_pairs = int(total_records * 0.04)  # 2% pairs = 4% works
    num_utilization_anomalies = int(total_records * 0.05)
    num_cluster_anomalies = total_records - (num_normal + num_financial_anomalies + num_delay_anomalies + num_duplicate_pairs + num_utilization_anomalies)

    seq_counter = 1000

    def get_random_geography():
        state = random.choice(list(STATE_DISTRICT_MAP.keys()))
        district = random.choice(STATE_DISTRICT_MAP[state])
        constituency = district.upper() + " CONSTITUENCY"
        mp = random.choice(MP_NAMES_BY_STATE[state])
        return state, district, constituency, mp

    # -------------------------------------------------------------
    # 1. NORMAL WORKS (70%)
    # -------------------------------------------------------------
    for _ in range(num_normal):
        seq_counter += 1
        state, district, constituency, mp = get_random_geography()
        sector = random.choice(SECTORS)
        agency = random.choice(AGENCIES)
        
        loc1 = random.choice(VILLAGE_NAMES)
        loc2 = random.choice(VILLAGE_NAMES)
        block = random.choice(BLOCKS)
        template = random.choice(DESCRIPTION_TEMPLATES[sector])
        desc = template.format(loc1=loc1, loc2=loc2, block=block)
        
        # Financials
        min_c, max_c = SECTOR_COST_RANGES[sector]
        sanctioned = round(random.uniform(min_c, max_c) / 1000) * 1000
        recommended = round(sanctioned * random.uniform(0.95, 1.05) / 1000) * 1000
        estimated = round(sanctioned * random.uniform(0.98, 1.02) / 1000) * 1000
        
        # Dates
        rec_days = random.randint(0, 700)
        rec_date = start_date_base + timedelta(days=rec_days)
        sanc_date = rec_date + timedelta(days=random.randint(15, 60))
        planned_duration = random.randint(180, 365)
        exp_comp_date = sanc_date + timedelta(days=planned_duration)
        
        # Status distribution: 45% Completed, 45% In Progress (on schedule), 10% Newly Sanctioned
        status_rand = random.random()
        if status_rand < 0.45:
            status = "COMPLETED"
            completion_pct = 100.0
            actual_duration = int(planned_duration * random.uniform(0.85, 1.10))
            act_comp_date = sanc_date + timedelta(days=actual_duration)
            fund_released = sanctioned
            # Minor normal expenditure variation (+/- 5%)
            total_exp = round(sanctioned * random.uniform(0.92, 1.02) / 1000) * 1000
            payment_count = random.randint(2, 4)
            latest_pay_date = act_comp_date
        elif status_rand < 0.90:
            status = "IN_PROGRESS"
            # Progress proportional to elapsed time
            elapsed = (current_date - sanc_date).days
            expected_pct = min(95.0, max(15.0, (elapsed / planned_duration) * 100))
            completion_pct = round(expected_pct * random.uniform(0.90, 1.05), 1)
            act_comp_date = None
            fund_released = round(sanctioned * (min(100.0, completion_pct + 15) / 100.0) / 1000) * 1000
            total_exp = round(fund_released * random.uniform(0.85, 0.98) / 1000) * 1000
            payment_count = max(1, int(completion_pct / 30))
            latest_pay_date = sanc_date + timedelta(days=max(10, elapsed - 30))
        else:
            status = "SANCTIONED"
            completion_pct = 0.0
            act_comp_date = None
            fund_released = round(sanctioned * 0.30 / 1000) * 1000  # Initial mobilization advance
            total_exp = 0.0
            payment_count = 0
            latest_pay_date = None

        lat, lon = get_coordinates(state, district)
        # Add tiny jitter to coordinates for distinct plotting
        lat += random.uniform(-0.04, 0.04)
        lon += random.uniform(-0.04, 0.04)

        work_id = generate_work_id(seq_counter, state)

        records.append({
            "work_id": work_id,
            "state": state,
            "district": district,
            "constituency": constituency,
            "mp_name": mp,
            "sector": sector,
            "work_description": desc,
            "implementing_agency": agency,
            "location_name": f"{loc1}, {block}",
            "latitude": round(lat, 5),
            "longitude": round(lon, 5),
            "recommendation_date": rec_date.strftime("%Y-%m-%d"),
            "sanction_date": sanc_date.strftime("%Y-%m-%d"),
            "expected_completion_date": exp_comp_date.strftime("%Y-%m-%d"),
            "actual_completion_date": act_comp_date.strftime("%Y-%m-%d") if act_comp_date else None,
            "recommended_amount": recommended,
            "estimated_cost": estimated,
            "sanctioned_amount": sanctioned,
            "fund_released": fund_released,
            "total_expenditure": total_exp,
            "payment_count": payment_count,
            "latest_payment_date": latest_pay_date.strftime("%Y-%m-%d") if latest_pay_date else None,
            "status": status,
            "completion_percentage": completion_pct,
            "is_injected_anomaly": False,
            "synthetic_anomaly_type": "None (Compliant)"
        })

    # -------------------------------------------------------------
    # 2. FINANCIAL ANOMALIES (8%)
    # - Severe Cost Overrun (> 1.8x to 3.0x peer median)
    # - Expenditure > Sanctioned Amount (> 125%)
    # -------------------------------------------------------------
    for _ in range(num_financial_anomalies):
        seq_counter += 1
        state, district, constituency, mp = get_random_geography()
        sector = random.choice(SECTORS)
        agency = random.choice(AGENCIES)
        
        loc1 = random.choice(VILLAGE_NAMES)
        loc2 = random.choice(VILLAGE_NAMES)
        block = random.choice(BLOCKS)
        template = random.choice(DESCRIPTION_TEMPLATES[sector])
        desc = template.format(loc1=loc1, loc2=loc2, block=block)
        
        min_c, max_c = SECTOR_COST_RANGES[sector]
        median_c = (min_c + max_c) / 2.0
        
        # Inflation / Outlier multiplier
        multiplier = random.uniform(2.2, 3.8)
        sanctioned = round((median_c * multiplier) / 1000) * 1000
        recommended = sanctioned
        estimated = round(sanctioned * 0.95 / 1000) * 1000
        
        rec_date = start_date_base + timedelta(days=random.randint(0, 500))
        sanc_date = rec_date + timedelta(days=random.randint(20, 45))
        planned_dur = random.randint(180, 300)
        exp_comp_date = sanc_date + timedelta(days=planned_dur)
        
        # Incurred expenditure higher than sanctioned amount
        overrun_factor = random.uniform(1.20, 1.65)
        total_exp = round(sanctioned * overrun_factor / 1000) * 1000
        fund_released = total_exp
        
        status = random.choice(["IN_PROGRESS", "COMPLETED"])
        completion_pct = 100.0 if status == "COMPLETED" else random.uniform(60.0, 90.0)
        act_comp_date = sanc_date + timedelta(days=planned_dur + 120) if status == "COMPLETED" else None
        
        lat, lon = get_coordinates(state, district)
        lat += random.uniform(-0.04, 0.04)
        lon += random.uniform(-0.04, 0.04)

        work_id = generate_work_id(seq_counter, state)

        records.append({
            "work_id": work_id,
            "state": state,
            "district": district,
            "constituency": constituency,
            "mp_name": mp,
            "sector": sector,
            "work_description": desc,
            "implementing_agency": agency,
            "location_name": f"{loc1}, {block}",
            "latitude": round(lat, 5),
            "longitude": round(lon, 5),
            "recommendation_date": rec_date.strftime("%Y-%m-%d"),
            "sanction_date": sanc_date.strftime("%Y-%m-%d"),
            "expected_completion_date": exp_comp_date.strftime("%Y-%m-%d"),
            "actual_completion_date": act_comp_date.strftime("%Y-%m-%d") if act_comp_date else None,
            "recommended_amount": recommended,
            "estimated_cost": estimated,
            "sanctioned_amount": sanctioned,
            "fund_released": fund_released,
            "total_expenditure": total_exp,
            "payment_count": random.randint(4, 8),
            "latest_payment_date": (sanc_date + timedelta(days=planned_dur + 60)).strftime("%Y-%m-%d"),
            "status": status,
            "completion_percentage": completion_pct,
            "is_injected_anomaly": True,
            "synthetic_anomaly_type": "Financial Anomaly (Cost Overrun & Extreme Peer Outlier)"
        })

    # -------------------------------------------------------------
    # 3. SEVERE DELAY & STALLED WORKS (8%)
    # - 100 to 400+ days past expected completion, status != COMPLETED, low progress
    # -------------------------------------------------------------
    for _ in range(num_delay_anomalies):
        seq_counter += 1
        state, district, constituency, mp = get_random_geography()
        sector = random.choice(SECTORS)
        agency = random.choice(AGENCIES)
        
        loc1 = random.choice(VILLAGE_NAMES)
        loc2 = random.choice(VILLAGE_NAMES)
        block = random.choice(BLOCKS)
        template = random.choice(DESCRIPTION_TEMPLATES[sector])
        desc = template.format(loc1=loc1, loc2=loc2, block=block)
        
        min_c, max_c = SECTOR_COST_RANGES[sector]
        sanctioned = round(random.uniform(min_c, max_c) / 1000) * 1000
        
        # Sanctioned early in 2023 or 2024
        sanc_date = start_date_base + timedelta(days=random.randint(10, 200))
        rec_date = sanc_date - timedelta(days=random.randint(15, 30))
        planned_dur = random.randint(180, 240)
        exp_comp_date = sanc_date + timedelta(days=planned_dur)  # Already well in the past
        
        # Stalled progress
        is_stalled = random.random() < 0.5
        if is_stalled:
            status = "STALLED"
            completion_pct = random.choice([0.0, 10.0, 15.0])
            fund_released = round(sanctioned * 0.40 / 1000) * 1000
            total_exp = round(fund_released * 0.30 / 1000) * 1000
            payment_count = 1
            anomaly_label = "Stalled Work (Zero / Nominal Progress for >1 Year)"
        else:
            status = "DELAYED"
            completion_pct = random.uniform(35.0, 65.0)
            fund_released = round(sanctioned * 0.70 / 1000) * 1000
            total_exp = round(fund_released * 0.90 / 1000) * 1000
            payment_count = random.randint(2, 3)
            anomaly_label = "Severe Schedule Delay (>200 Days Past Deadline)"
            
        lat, lon = get_coordinates(state, district)
        lat += random.uniform(-0.04, 0.04)
        lon += random.uniform(-0.04, 0.04)

        work_id = generate_work_id(seq_counter, state)

        records.append({
            "work_id": work_id,
            "state": state,
            "district": district,
            "constituency": constituency,
            "mp_name": mp,
            "sector": sector,
            "work_description": desc,
            "implementing_agency": agency,
            "location_name": f"{loc1}, {block}",
            "latitude": round(lat, 5),
            "longitude": round(lon, 5),
            "recommendation_date": rec_date.strftime("%Y-%m-%d"),
            "sanction_date": sanc_date.strftime("%Y-%m-%d"),
            "expected_completion_date": exp_comp_date.strftime("%Y-%m-%d"),
            "actual_completion_date": None,
            "recommended_amount": sanctioned,
            "estimated_cost": sanctioned,
            "sanctioned_amount": sanctioned,
            "fund_released": fund_released,
            "total_expenditure": total_exp,
            "payment_count": payment_count,
            "latest_payment_date": (sanc_date + timedelta(days=90)).strftime("%Y-%m-%d"),
            "status": status,
            "completion_percentage": completion_pct,
            "is_injected_anomaly": True,
            "synthetic_anomaly_type": anomaly_label
        })

    # -------------------------------------------------------------
    # 4. POTENTIAL DUPLICATE WORK PAIRS (4%)
    # - Two works with 90%+ semantic similarity, same district, similar cost, close dates
    # -------------------------------------------------------------
    for _ in range(num_duplicate_pairs // 2):
        state, district, constituency, mp = get_random_geography()
        sector = random.choice(SECTORS)
        agency = random.choice(AGENCIES)
        loc = random.choice(VILLAGE_NAMES)
        block = random.choice(BLOCKS)
        
        min_c, max_c = SECTOR_COST_RANGES[sector]
        cost1 = round(random.uniform(min_c, max_c) / 1000) * 1000
        cost2 = round(cost1 * random.uniform(0.96, 1.04) / 1000) * 1000
        
        date1 = start_date_base + timedelta(days=random.randint(100, 500))
        date2 = date1 + timedelta(days=random.randint(15, 60))
        
        lat_base, lon_base = get_coordinates(state, district)
        lat1 = lat_base + random.uniform(-0.01, 0.01)
        lon1 = lon_base + random.uniform(-0.01, 0.01)
        lat2 = lat1 + random.uniform(-0.003, 0.003)  # within ~300 meters
        lon2 = lon1 + random.uniform(-0.003, 0.003)

        if sector == "Roads, Pathways & Bridges":
            desc1 = f"Construction of CC road and drainage channel from Main Chowk to Panchayat Bhavan in {loc}, {block}"
            desc2 = f"CC Road construction and drain work from Main Chowk towards Panchayat Ghar at {loc} village, {block}"
        elif sector == "Drinking Water Infrastructure":
            desc1 = f"Installation of high-capacity solar drinking water purification plant with tank at {loc} public school"
            desc2 = f"Erection of solar drinking water RO plant and overhead distribution system near {loc} Government School"
        elif sector == "Community Halls & Public Assets":
            desc1 = f"Construction of multipurpose community hall (Barat Ghar) and toilet block at {loc}, {block}"
            desc2 = f"Construction of community hall and civic facility building in {loc} Gram Panchayat area, {block}"
        else:
            desc1 = f"Development of public infrastructure and facility center at {loc}, {block}"
            desc2 = f"Infrastructure upgradation and community asset building in {loc}, {block}"

        # Work A
        seq_counter += 1
        work_id_a = generate_work_id(seq_counter, state)
        records.append({
            "work_id": work_id_a,
            "state": state,
            "district": district,
            "constituency": constituency,
            "mp_name": mp,
            "sector": sector,
            "work_description": desc1,
            "implementing_agency": agency,
            "location_name": f"{loc}, {block}",
            "latitude": round(lat1, 5),
            "longitude": round(lon1, 5),
            "recommendation_date": (date1 - timedelta(days=20)).strftime("%Y-%m-%d"),
            "sanction_date": date1.strftime("%Y-%m-%d"),
            "expected_completion_date": (date1 + timedelta(days=180)).strftime("%Y-%m-%d"),
            "actual_completion_date": (date1 + timedelta(days=170)).strftime("%Y-%m-%d"),
            "recommended_amount": cost1,
            "estimated_cost": cost1,
            "sanctioned_amount": cost1,
            "fund_released": cost1,
            "total_expenditure": cost1,
            "payment_count": 3,
            "latest_payment_date": (date1 + timedelta(days=165)).strftime("%Y-%m-%d"),
            "status": "COMPLETED",
            "completion_percentage": 100.0,
            "is_injected_anomaly": True,
            "synthetic_anomaly_type": "Potential Duplicate Work (Pair A - Primary Work)"
        })

        # Work B (Duplicate Flag)
        seq_counter += 1
        work_id_b = generate_work_id(seq_counter, state)
        records.append({
            "work_id": work_id_b,
            "state": state,
            "district": district,
            "constituency": constituency,
            "mp_name": mp,
            "sector": sector,
            "work_description": desc2,
            "implementing_agency": agency,
            "location_name": f"{loc}, {block}",
            "latitude": round(lat2, 5),
            "longitude": round(lon2, 5),
            "recommendation_date": (date2 - timedelta(days=15)).strftime("%Y-%m-%d"),
            "sanction_date": date2.strftime("%Y-%m-%d"),
            "expected_completion_date": (date2 + timedelta(days=180)).strftime("%Y-%m-%d"),
            "actual_completion_date": None,
            "recommended_amount": cost2,
            "estimated_cost": cost2,
            "sanctioned_amount": cost2,
            "fund_released": cost2,
            "total_expenditure": round(cost2 * 0.95 / 1000) * 1000,
            "payment_count": 2,
            "latest_payment_date": (date2 + timedelta(days=120)).strftime("%Y-%m-%d"),
            "status": "IN_PROGRESS",
            "completion_percentage": 90.0,
            "is_injected_anomaly": True,
            "synthetic_anomaly_type": f"Potential Duplicate Work (Pair B - Near Duplicate of {work_id_a})"
        })

    # -------------------------------------------------------------
    # 5. UTILIZATION ANOMALIES (5%)
    # - 100% funds released but 0% progress, or 100% expenditure in 1 payment instantly
    # -------------------------------------------------------------
    for _ in range(num_utilization_anomalies):
        seq_counter += 1
        state, district, constituency, mp = get_random_geography()
        sector = random.choice(SECTORS)
        agency = random.choice(AGENCIES)
        
        loc1 = random.choice(VILLAGE_NAMES)
        loc2 = random.choice(VILLAGE_NAMES)
        block = random.choice(BLOCKS)
        template = random.choice(DESCRIPTION_TEMPLATES[sector])
        desc = template.format(loc1=loc1, loc2=loc2, block=block)
        
        min_c, max_c = SECTOR_COST_RANGES[sector]
        sanctioned = round(random.uniform(min_c, max_c) / 1000) * 1000
        
        sanc_date = start_date_base + timedelta(days=random.randint(50, 400))
        rec_date = sanc_date - timedelta(days=20)
        exp_comp_date = sanc_date + timedelta(days=200)
        
        # 100% fund released, 0% physical progress
        fund_released = sanctioned
        total_exp = round(sanctioned * 0.85 / 1000) * 1000
        completion_pct = 0.0
        status = "IN_PROGRESS"
        
        lat, lon = get_coordinates(state, district)
        lat += random.uniform(-0.04, 0.04)
        lon += random.uniform(-0.04, 0.04)

        work_id = generate_work_id(seq_counter, state)

        records.append({
            "work_id": work_id,
            "state": state,
            "district": district,
            "constituency": constituency,
            "mp_name": mp,
            "sector": sector,
            "work_description": desc,
            "implementing_agency": agency,
            "location_name": f"{loc1}, {block}",
            "latitude": round(lat, 5),
            "longitude": round(lon, 5),
            "recommendation_date": rec_date.strftime("%Y-%m-%d"),
            "sanction_date": sanc_date.strftime("%Y-%m-%d"),
            "expected_completion_date": exp_comp_date.strftime("%Y-%m-%d"),
            "actual_completion_date": None,
            "recommended_amount": sanctioned,
            "estimated_cost": sanctioned,
            "sanctioned_amount": sanctioned,
            "fund_released": fund_released,
            "total_expenditure": total_exp,
            "payment_count": 1,  # 100% paid in 1 single burst
            "latest_payment_date": (sanc_date + timedelta(days=30)).strftime("%Y-%m-%d"),
            "status": status,
            "completion_percentage": completion_pct,
            "is_injected_anomaly": True,
            "synthetic_anomaly_type": "Utilization Anomaly (Full Fund Disbursal with Zero Physical Progress)"
        })

    # -------------------------------------------------------------
    # 6. GEOGRAPHIC RISK CLUSTER (Remaining records)
    # - Concentrated high-risk works in specific test districts (e.g. Varanasi, Gorakhpur, Patna)
    # -------------------------------------------------------------
    focus_districts = [("Uttar Pradesh", "Varanasi"), ("Bihar", "Patna"), ("Maharashtra", "Nagpur")]
    for _ in range(num_cluster_anomalies):
        seq_counter += 1
        state, district = random.choice(focus_districts)
        constituency = district.upper() + " CONSTITUENCY"
        mp = random.choice(MP_NAMES_BY_STATE[state])
        sector = random.choice(SECTORS)
        agency = "District Urban Development Cell (DUDC)"  # Shared agency in cluster
        
        loc1 = random.choice(VILLAGE_NAMES)
        loc2 = random.choice(VILLAGE_NAMES)
        block = "Cluster Zone 4"
        template = random.choice(DESCRIPTION_TEMPLATES[sector])
        desc = template.format(loc1=loc1, loc2=loc2, block=block)
        
        min_c, max_c = SECTOR_COST_RANGES[sector]
        sanctioned = round((max_c * random.uniform(1.8, 2.5)) / 1000) * 1000
        
        sanc_date = start_date_base + timedelta(days=random.randint(50, 300))
        rec_date = sanc_date - timedelta(days=15)
        exp_comp_date = sanc_date + timedelta(days=180)
        
        lat_base, lon_base = get_coordinates(state, district)
        lat = lat_base + random.uniform(-0.015, 0.015)
        lon = lon_base + random.uniform(-0.015, 0.015)

        work_id = generate_work_id(seq_counter, state)

        records.append({
            "work_id": work_id,
            "state": state,
            "district": district,
            "constituency": constituency,
            "mp_name": mp,
            "sector": sector,
            "work_description": desc,
            "implementing_agency": agency,
            "location_name": f"{loc1}, {block}",
            "latitude": round(lat, 5),
            "longitude": round(lon, 5),
            "recommendation_date": rec_date.strftime("%Y-%m-%d"),
            "sanction_date": sanc_date.strftime("%Y-%m-%d"),
            "expected_completion_date": exp_comp_date.strftime("%Y-%m-%d"),
            "actual_completion_date": None,
            "recommended_amount": sanctioned,
            "estimated_cost": sanctioned,
            "sanctioned_amount": sanctioned,
            "fund_released": sanctioned,
            "total_expenditure": round(sanctioned * random.uniform(1.1, 1.35) / 1000) * 1000,
            "payment_count": random.randint(3, 5),
            "latest_payment_date": (sanc_date + timedelta(days=150)).strftime("%Y-%m-%d"),
            "status": "DELAYED",
            "completion_percentage": random.uniform(40.0, 70.0),
            "is_injected_anomaly": True,
            "synthetic_anomaly_type": "Geographic Cluster Anomaly (Repeated High-Risk Works under Single IA)"
        })

    df = pd.DataFrame(records)
    # Shuffle dataset
    df = df.sample(frac=1.0, random_state=42).reset_index(drop=True)
    return df


if __name__ == "__main__":
    PROJECT_ROOT = Path(__file__).resolve().parents[2]
    df = create_dataset(total_records=1500)
    
    # Save to data/raw/work_register, data/demo, and data/synthetic
    out_raw = PROJECT_ROOT / "data" / "raw" / "work_register" / "mplads_works_raw.csv"
    out_demo = PROJECT_ROOT / "data" / "demo" / "mplads_demo_dataset.csv"
    out_parquet = PROJECT_ROOT / "data" / "demo" / "mplads_demo_dataset.parquet"
    
    out_raw.parent.mkdir(parents=True, exist_ok=True)
    out_demo.parent.mkdir(parents=True, exist_ok=True)
    
    df.to_csv(out_raw, index=False)
    df.to_csv(out_demo, index=False)
    df.to_parquet(out_parquet, index=False)
    
    print(f"Generated {len(df)} records.")
    print(f"Normal records: {len(df[~df['is_injected_anomaly']])}")
    print(f"Anomaly records: {len(df[df['is_injected_anomaly']])}")
    print("\nAnomaly Breakdown:")
    print(df["synthetic_anomaly_type"].value_counts())
