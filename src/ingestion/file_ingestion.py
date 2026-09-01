"""
File Ingestion Module for MPLADS Data.
Supports CSV, Excel (.xlsx, .xls), and Parquet files.
Includes dynamic schema column mapping and robust currency/date cleaners.
"""

import re
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Union
import pandas as pd
import numpy as np

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Standard column alias dictionary to map arbitrary raw headers to standard schema
COLUMN_MAPPINGS: Dict[str, str] = {
    # Work ID
    "work_id": "work_id",
    "work id": "work_id",
    "workid": "work_id",
    "work_code": "work_id",
    "id": "work_id",
    "sno": "raw_sno",
    "sr. no.": "raw_sno",
    
    # Description
    "work_description": "work_description",
    "work description": "work_description",
    "description": "work_description",
    "work_name": "work_description",
    "work name": "work_description",
    "name_of_work": "work_description",
    "activity_name": "work_description",
    
    # Category / Sector
    "work_category": "sector",
    "work category": "sector",
    "category": "sector",
    "sector": "sector",
    "sector_name": "sector",
    "head": "sector",
    
    # Status
    "work_status": "status",
    "work status": "status",
    "status": "status",
    "stage": "status",
    "work_stage": "status",
    "physical_status": "status",
    
    # Geography
    "state": "state",
    "state_name": "state",
    "state name": "state",
    "district": "district",
    "district_name": "district",
    "district name": "district",
    "ida_name": "district",
    "ida": "district",
    "district(ida)": "district",
    "constituency": "constituency",
    "constituency_name": "constituency",
    "parliamentary_constituency": "constituency",
    
    # MP Details
    "mp_name": "mp_name",
    "mp name": "mp_name",
    "hon'ble mp": "mp_name",
    "hon": "mp_name",
    "member_of_parliament": "mp_name",
    "tenure": "tenure",
    "house": "house",
    "type": "mp_type",
    "elected/nominated": "mp_type",
    
    # Implementing Agency / Vendor
    "implementing_agency": "implementing_agency",
    "implementing agency": "implementing_agency",
    "vendor_name": "implementing_agency",
    "vendor name": "implementing_agency",
    "contractor": "implementing_agency",
    "agency": "implementing_agency",
    
    # Financials
    "allocated_amt": "allocated_amount",
    "allocated amount": "allocated_amount",
    "allocated amount ( ₹ )": "allocated_amount",
    "recommended_amount": "recommended_amount",
    "recommended amount": "recommended_amount",
    "recommended amount   ( ₹ )": "recommended_amount",
    "sanction_amount": "sanctioned_amount",
    "sanction amount": "sanctioned_amount",
    "sanction amount ( ₹ )": "sanctioned_amount",
    "sanctioned_amount": "sanctioned_amount",
    "sanctioned amount": "sanctioned_amount",
    "estimated_cost": "estimated_cost",
    "estimated cost": "estimated_cost",
    "fund_released": "fund_released",
    "fund released": "fund_released",
    "fund_disbursed_amt": "fund_released",
    "amount disbursed ( ₹ )": "fund_released",
    "amount disbursed": "fund_released",
    "total_expenditure": "total_expenditure",
    "actual_amount": "total_expenditure",
    "expenditure": "total_expenditure",
    "actual expenditure": "total_expenditure",
    "expenditure amount": "total_expenditure",
    "consented_amount": "consented_amount",
    "consent amount ( ₹ )": "consented_amount",
    
    # Dates
    "recommendation_date": "recommendation_date",
    "recommended date": "recommendation_date",
    "recommended_date": "recommendation_date",
    "sanction_date": "sanction_date",
    "sanction date": "sanction_date",
    "start_date": "start_date",
    "start date": "start_date",
    "expected_completion_date": "expected_completion_date",
    "expected completion date": "expected_completion_date",
    "target_date": "expected_completion_date",
    "actual_completion_date": "actual_completion_date",
    "completion date": "actual_completion_date",
    "completion_date": "actual_completion_date",
    "actual_end_date": "actual_completion_date",
    "expenditure_date": "latest_payment_date",
    "expenditure date": "latest_payment_date",
    "crt_dt": "latest_payment_date",
    
    # Progress & Location
    "completion_percentage": "completion_percentage",
    "progress_percentage": "completion_percentage",
    "physical_progress": "completion_percentage",
    "latitude": "latitude",
    "lat": "latitude",
    "longitude": "longitude",
    "long": "longitude",
    "lng": "longitude"
}


def parse_indian_currency(val: Any) -> float:
    """
    Parses Indian currency strings such as '₹10,00,000.00', '10.5 Crore', '50 Lakh',
    and numeric values to standard float INR.
    """
    if pd.isna(val) or val is None or val == "":
        return 0.0
    if isinstance(val, (int, float)):
        return float(val) if not np.isnan(val) else 0.0
    
    s = str(val).strip().replace("\u00a0", " ")
    
    # Check for Crore / Lakh multipliers
    crore_match = re.search(r'([\d,]+(?:\.\d+)?)\s*(?:Cr|Crore|Crores)', s, re.IGNORECASE)
    if crore_match:
        num = float(crore_match.group(1).replace(",", ""))
        return num * 1e7
        
    lakh_match = re.search(r'([\d,]+(?:\.\d+)?)\s*(?:Lakh|Lakhs|Lac|Lacs)', s, re.IGNORECASE)
    if lakh_match:
        num = float(lakh_match.group(1).replace(",", ""))
        return num * 1e5
        
    # Standard numbers with commas and currency symbol ₹, Rs, INR
    cleaned = re.sub(r'[^\d.-]', '', s)
    try:
        return float(cleaned) if cleaned else 0.0
    except ValueError:
        return 0.0


def parse_flexible_date(val: Any) -> Optional[pd.Timestamp]:
    """
    Parses dates in formats like DD-MM-YYYY, YYYY-MM-DD, DD/MM/YYYY, etc.
    """
    if pd.isna(val) or val is None or val == "" or str(val).strip().lower() in ["none", "null", "na", "-", "0"]:
        return None
    try:
        # Check if already a timestamp
        if isinstance(val, (pd.Timestamp, pd.DatetimeIndex)):
            return pd.to_datetime(val)
        return pd.to_datetime(str(val).strip(), dayfirst=True, errors="coerce")
    except Exception:
        return None


def standardize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Maps and standardizes raw DataFrame columns using the alias dictionary.
    """
    rename_dict = {}
    for col in df.columns:
        norm_col = str(col).strip().lower()
        if norm_col in COLUMN_MAPPINGS:
            rename_dict[col] = COLUMN_MAPPINGS[norm_col]
        else:
            # Match partial keywords
            matched = False
            for pattern, standard in COLUMN_MAPPINGS.items():
                if len(pattern) > 3 and pattern in norm_col:
                    rename_dict[col] = standard
                    matched = True
                    break
            if not matched:
                rename_dict[col] = norm_col.replace(" ", "_").replace("-", "_")
                
    df = df.rename(columns=rename_dict)
    # Deduplicate column names if any collided
    df = df.loc[:, ~df.columns.duplicated()]
    return df


def load_raw_file(file_path: Union[str, Path]) -> pd.DataFrame:
    """
    Loads raw tabular file (CSV, Excel, Parquet, JSON) and returns a standardized DataFrame.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
        
    ext = path.suffix.lower()
    logger.info(f"Ingesting file: {path.name} (Format: {ext})")
    
    if ext in [".csv", ".txt"]:
        try:
            df = pd.read_csv(path, low_memory=False, encoding="utf-8")
        except UnicodeDecodeError:
            df = pd.read_csv(path, low_memory=False, encoding="latin1")
    elif ext in [".xlsx", ".xls"]:
        df = pd.read_excel(path)
    elif ext in [".parquet", ".pq"]:
        df = pd.read_parquet(path)
    elif ext in [".json"]:
        df = pd.read_json(path)
    else:
        raise ValueError(f"Unsupported file format: {ext}")
        
    logger.info(f"Loaded {len(df)} rows, {len(df.columns)} raw columns from {path.name}")
    
    # Standardize column headers
    df = standardize_columns(df)
    return df
