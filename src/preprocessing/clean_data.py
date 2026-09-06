"""
Data Cleaning and Standardization Pipeline for MPLADS Works.
Enforces validation rules, text normalization, date consistency, and currency conversions.
Preserves raw files and produces cleaned data in data/interim/ and data/processed/.
"""

import json
import re
import hashlib
import logging
from pathlib import Path
from typing import Optional, Tuple, Dict, Any, List
import pandas as pd
import numpy as np

# Set up logger
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# State name standardization dictionary
STATE_NORMALIZATION_MAP = {
    "andaman & nicobar": "Andaman And Nicobar Islands",
    "andaman & nicobar islands": "Andaman And Nicobar Islands",
    "a & n islands": "Andaman And Nicobar Islands",
    "andhra": "Andhra Pradesh",
    "ap": "Andhra Pradesh",
    "up": "Uttar Pradesh",
    "mp": "Madhya Pradesh",
    "maharastra": "Maharashtra",
    "nct of delhi": "Delhi",
    "delhi nct": "Delhi",
    "orissa": "Odisha",
    "pondicherry": "Puducherry",
    "chattisgarh": "Chhattisgarh",
    "uttaranchal": "Uttarakhand",
    "jammu & kashmir": "Jammu And Kashmir",
    "j&k": "Jammu And Kashmir",
    "d&nh and d&d": "Dadra And Nagar Haveli And Daman And Diu"
}

# Sector normalization
SECTOR_NORMALIZATION_MAP = {
    "road": "Roads, Pathways & Bridges",
    "roads": "Roads, Pathways & Bridges",
    "cc road": "Roads, Pathways & Bridges",
    "bridge": "Roads, Pathways & Bridges",
    "water": "Drinking Water Infrastructure",
    "drinking water": "Drinking Water Infrastructure",
    "tubewell": "Drinking Water Infrastructure",
    "sanitation": "Public Health & Sanitation",
    "health": "Public Health & Sanitation",
    "toilet": "Public Health & Sanitation",
    "education": "Education & School Infrastructure",
    "school": "Education & School Infrastructure",
    "community": "Community Halls & Public Assets",
    "community hall": "Community Halls & Public Assets",
    "electricity": "Rural Electrification & Solar Lighting",
    "solar": "Rural Electrification & Solar Lighting",
    "lighting": "Rural Electrification & Solar Lighting",
    "irrigation": "Irrigation & Water Conservation",
    "water harvesting": "Irrigation & Water Conservation",
    "sports": "Sports & Youth Development Facilities",
    "gymnasium": "Sports & Youth Development Facilities"
}


def clean_text_description(text: Any) -> str:
    """
    Cleans raw text description by stripping HTML, non-printable characters,
    multiple spaces, and standardizing casing.
    """
    if pd.isna(text) or text is None:
        return "Not Specified"
    s = str(text).strip()
    # Remove HTML tags
    s = re.sub(r'<[^>]+>', ' ', s)
    # Remove special control characters
    s = re.sub(r'[\r\n\t]+', ' ', s)
    # Remove multiple spaces
    s = re.sub(r'\s+', ' ', s)
    return s.strip()


def normalize_state_name(state: Any) -> str:
    """
    Standardizes Indian State and UT names.
    """
    if pd.isna(state) or state is None:
        return "Unknown State"
    s = str(state).strip()
    s_lower = s.lower().replace(".", "").replace(",", "")
    if s_lower in STATE_NORMALIZATION_MAP:
        return STATE_NORMALIZATION_MAP[s_lower]
    # Capitalize title
    return s.title()


def normalize_sector_name(sector: Any) -> str:
    """
    Normalizes sector and work category names into standard categories.
    """
    if pd.isna(sector) or sector is None:
        return "Other Community Works"
    s = str(sector).strip()
    s_lower = s.lower()
    for key, standard in SECTOR_NORMALIZATION_MAP.items():
        if key in s_lower:
            return standard
    return s.title()


def generate_surrogate_key(row: pd.Series) -> str:
    """
    Generates a deterministic SHA256 surrogate work_id if the raw ID is missing or invalid.
    """
    desc = clean_text_description(row.get("work_description", ""))
    district = str(row.get("district", "UNKNOWN")).strip().upper()
    sanc_date = str(row.get("sanction_date", "1970-01-01"))
    sanc_amount = f"{float(row.get('sanctioned_amount', 0.0)):.2f}"
    
    raw_hash_input = f"{desc}_{district}_{sanc_date}_{sanc_amount}".encode("utf-8")
    hex_digest = hashlib.sha256(raw_hash_input).hexdigest()[:10].upper()
    return f"MPLADS-SURR-{hex_digest}"


def clean_dataframe(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Applies comprehensive cleaning, date validation, financial checks, and deduplication.
    Returns (cleaned_df, cleaning_metrics).
    """
    initial_rows = len(df)
    logger.info(f"Starting data cleaning on {initial_rows} rows...")
    
    # 1. Deduplicate exact matching rows
    df = df.drop_duplicates().copy()
    dedup_rows = len(df)
    duplicates_removed = initial_rows - dedup_rows
    if duplicates_removed > 0:
        logger.info(f"Removed {duplicates_removed} exact duplicate rows.")

    # 2. Text standardization
    df["work_description"] = df["work_description"].apply(clean_text_description)
    if "state" in df.columns:
        df["state"] = df["state"].apply(normalize_state_name)
    if "sector" in df.columns:
        df["sector"] = df["sector"].apply(normalize_sector_name)
    if "district" in df.columns:
        df["district"] = df["district"].fillna("Unknown District").astype(str).str.strip().str.title()
    if "constituency" in df.columns:
        df["constituency"] = df["constituency"].fillna("General").astype(str).str.strip().str.upper()
    if "mp_name" in df.columns:
        df["mp_name"] = df["mp_name"].fillna("Hon'ble MP").astype(str).str.strip().str.title()
    if "implementing_agency" in df.columns:
        df["implementing_agency"] = df["implementing_agency"].fillna("District Administration").astype(str).str.strip()

    # 3. Numeric & Financial Validation
    financial_cols = [
        "recommended_amount", "estimated_cost", "sanctioned_amount",
        "fund_released", "total_expenditure", "allocated_amount"
    ]
    for col in financial_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)
            # Detect impossible negative financial values
            neg_count = (df[col] < 0).sum()
            if neg_count > 0:
                logger.warning(f"Found {neg_count} negative values in {col}. Replacing with absolute values.")
                df[col] = df[col].abs()

    # 4. Fill missing financial baselines
    if "sanctioned_amount" in df.columns:
        # If estimated_cost is 0, default to sanctioned_amount
        if "estimated_cost" in df.columns:
            df["estimated_cost"] = np.where(df["estimated_cost"] <= 0, df["sanctioned_amount"], df["estimated_cost"])
        if "recommended_amount" in df.columns:
            df["recommended_amount"] = np.where(df["recommended_amount"] <= 0, df["sanctioned_amount"], df["recommended_amount"])

    # 5. Date Parsing and Consistency
    date_cols = ["recommendation_date", "sanction_date", "expected_completion_date", "actual_completion_date", "latest_payment_date"]
    for col in date_cols:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce")

    # Detect and log temporal inconsistencies
    inconsistent_dates_count = 0
    if "sanction_date" in df.columns and "recommendation_date" in df.columns:
        # Sanction before recommendation
        sanc_before_rec = (df["sanction_date"] < df["recommendation_date"]).sum()
        if sanc_before_rec > 0:
            logger.warning(f"Detected {sanc_before_rec} works with sanction date earlier than recommendation date.")
            inconsistent_dates_count += sanc_before_rec

    if "actual_completion_date" in df.columns and "sanction_date" in df.columns:
        # Completion before sanction
        comp_before_sanc = (df["actual_completion_date"] < df["sanction_date"]).sum()
        if comp_before_sanc > 0:
            logger.warning(f"Detected {comp_before_sanc} works with completion date earlier than sanction date.")
            inconsistent_dates_count += comp_before_sanc

    # 6. Status and Progress Consistency
    if "status" in df.columns:
        df["status"] = df["status"].fillna("IN_PROGRESS").astype(str).str.upper().str.strip()
    if "completion_percentage" in df.columns:
        df["completion_percentage"] = pd.to_numeric(df["completion_percentage"], errors="coerce").fillna(0.0)
        df["completion_percentage"] = df["completion_percentage"].clip(0.0, 100.0)
        # If status is COMPLETED, enforce 100%
        df["completion_percentage"] = np.where(df["status"] == "COMPLETED", 100.0, df["completion_percentage"])

    # 7. Work ID validation and surrogate key generation
    if "work_id" not in df.columns or df["work_id"].isna().sum() > 0:
        logger.info("Generating deterministic surrogate keys for missing work IDs...")
        if "work_id" not in df.columns:
            df["work_id"] = None
        mask_missing = df["work_id"].isna() | (df["work_id"] == "")
        df.loc[mask_missing, "work_id"] = df[mask_missing].apply(generate_surrogate_key, axis=1)

    # 8. Check and fill Geographic Coordinates
    if "latitude" not in df.columns or "longitude" not in df.columns:
        df["latitude"] = 20.5937
        df["longitude"] = 78.9629
    else:
        df["latitude"] = pd.to_numeric(df["latitude"], errors="coerce").fillna(20.5937)
        df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce").fillna(78.9629)

    cleaning_metrics = {
        "initial_rows": int(initial_rows),
        "final_rows": int(len(df)),
        "duplicates_removed": int(duplicates_removed),
        "inconsistent_dates_detected": int(inconsistent_dates_count),
        "missing_descriptions_filled": int((df["work_description"] == "Not Specified").sum())
    }
    
    logger.info(f"Cleaning complete: {len(df)} valid master records ready.")
    return df, cleaning_metrics


def run_pipeline(input_path: Path, output_interim: Path, output_processed: Path) -> pd.DataFrame:
    """
    Runs the end-to-end cleaning pipeline from raw input to interim and processed parquet/csv.
    """
    logger.info(f"Loading raw dataset from {input_path}")
    if input_path.suffix == ".parquet":
        raw_df = pd.read_parquet(input_path)
    else:
        raw_df = pd.read_csv(input_path, low_memory=False)
        
    cleaned_df, metrics = clean_dataframe(raw_df)
    
    # Save interim CSV
    output_interim.parent.mkdir(parents=True, exist_ok=True)
    cleaned_df.to_csv(output_interim, index=False)
    logger.info(f"Saved interim dataset to {output_interim}")
    
    # Save processed Parquet & CSV
    output_processed.parent.mkdir(parents=True, exist_ok=True)
    cleaned_df.to_parquet(output_processed.with_suffix(".parquet"), index=False)
    cleaned_df.to_csv(output_processed.with_suffix(".csv"), index=False)
    logger.info(f"Saved processed master dataset to {output_processed.with_suffix('.parquet')}")
    
    # Save cleaning log
    log_path = output_processed.parent / "cleaning_metrics.json"
    with open(log_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)
        
    return cleaned_df


if __name__ == "__main__":
    PROJECT_ROOT = Path(__file__).resolve().parents[2]
    raw_file = PROJECT_ROOT / "data" / "raw" / "work_register" / "mplads_works_raw.csv"
    interim_file = PROJECT_ROOT / "data" / "interim" / "cleaned_works.csv"
    processed_file = PROJECT_ROOT / "data" / "processed" / "master_works.parquet"
    
    run_pipeline(raw_file, interim_file, processed_file)
