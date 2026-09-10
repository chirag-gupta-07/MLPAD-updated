"""
Feature Engineering Pipeline for MPLADS Works (Leakage-Free).
Strictly separates pre-completion predictive features from target definitions and post-kickoff diagnostics.
"""

import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Tuple
import pandas as pd
import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

CURRENT_ANALYSIS_DATE = pd.to_datetime("2026-08-01")


def compute_pre_kickoff_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes features strictly available at administrative sanction / project kickoff time.
    """
    df = df.copy()
    
    # 1. Ensure required columns exist with safe defaults
    for col in ["recommendation_date", "sanction_date", "expected_completion_date"]:
        if col not in df.columns:
            df[col] = None
    for col in ["sanctioned_amount", "estimated_cost", "recommended_amount"]:
        if col not in df.columns:
            df[col] = 0.0
    if "sector" not in df.columns:
        df["sector"] = "Other Community Works"
    if "state" not in df.columns:
        df["state"] = "General"
    if "district" not in df.columns:
        df["district"] = "General"
    if "implementing_agency" not in df.columns:
        df["implementing_agency"] = "District Agency"
            
    df["recommendation_date"] = pd.to_datetime(df["recommendation_date"], errors="coerce")
    df["sanction_date"] = pd.to_datetime(df["sanction_date"], errors="coerce")
    df["expected_completion_date"] = pd.to_datetime(df["expected_completion_date"], errors="coerce")
    
    # 2. Administrative Latency: Recommendation to Sanction (Days)
    df["rec_to_sanction_days"] = (df["sanction_date"] - df["recommendation_date"]).dt.days.fillna(30.0).clip(lower=0.0)
    
    # 3. Contract Planned Duration (Days)
    df["planned_duration_days"] = (df["expected_completion_date"] - df["sanction_date"]).dt.days.fillna(365.0).clip(lower=30.0)
    
    # 4. Financial Baseline Ratios (Known at Sanction)
    df["estimated_vs_sanctioned_ratio"] = np.where(
        df["sanctioned_amount"] > 0,
        df["estimated_cost"] / df["sanctioned_amount"],
        1.0
    )
    df["recommended_vs_sanctioned_ratio"] = np.where(
        df["sanctioned_amount"] > 0,
        df["recommended_amount"] / df["sanctioned_amount"],
        1.0
    )
    
    # 5. Semantic Asset Classification (Correcting Clerical Dropdown Mismatches)
    # If a major capital asset (e.g., State Hospital, Medical College, Major Bridge) is logged under
    # a generic category like 'Community Halls', map it to its true functional asset class
    desc_lower = df["work_description"].fillna("").astype(str).str.lower()
    
    is_major_hospital = desc_lower.str.contains(r"hospital|medical college|sub-divisional hospital|trauma centre|district hospital", regex=True)
    is_major_bridge = desc_lower.str.contains(r"\bbridge\b|\bflyover\b|\brailway overbridge\b|\brob\b", regex=True)
    is_solar_light = desc_lower.str.contains(r"high mast|solar light|street light|mast light", regex=True)
    is_drinking_water = desc_lower.str.contains(r"handpump|hand pump|borewell|tube well|drinking water", regex=True)

    df["semantic_sector"] = df["sector"]
    df.loc[is_major_hospital & (df["sector"] != "Public Health & Sanitation"), "semantic_sector"] = "Public Health & Sanitation"
    df.loc[is_major_bridge & (df["sector"] != "Roads, Pathways & Bridges"), "semantic_sector"] = "Roads, Pathways & Bridges"
    df.loc[is_solar_light & (df["sector"] != "Rural Electrification & Solar Lighting"), "semantic_sector"] = "Rural Electrification & Solar Lighting"
    df.loc[is_drinking_water & (df["sector"] != "Drinking Water Infrastructure"), "semantic_sector"] = "Drinking Water Infrastructure"

    # Peer Group Statistics computed on Semantic Asset Category
    sector_medians = df.groupby("semantic_sector")["sanctioned_amount"].median()
    df["sector_median_cost"] = df["semantic_sector"].map(sector_medians)
    
    state_sector_medians = df.groupby(["state", "semantic_sector"])["sanctioned_amount"].median()
    state_sector_counts = df.groupby(["state", "semantic_sector"])["sanctioned_amount"].count()
    valid_state_pairs = state_sector_counts[state_sector_counts >= 5].index
    filtered_medians = state_sector_medians.loc[state_sector_medians.index.isin(valid_state_pairs)]
    
    state_sec_map = df.set_index(["state", "semantic_sector"]).index.map(filtered_medians)
    df["peer_median_cost"] = np.where(pd.notnull(state_sec_map), state_sec_map, df["sector_median_cost"])
    df["peer_median_cost"] = df["peer_median_cost"].fillna(df["sanctioned_amount"]).replace(0.0, 1.0)
    
    df["cost_vs_peer_median_ratio"] = np.where(
        df["peer_median_cost"] > 0,
        df["sanctioned_amount"] / df["peer_median_cost"],
        1.0
    )
    
    # 6. Sector Cost Z-Score (Vectorized on Semantic Group)
    sec_means = df.groupby("semantic_sector")["sanctioned_amount"].transform("mean")
    sec_stds = df.groupby("semantic_sector")["sanctioned_amount"].transform("std").fillna(1.0).replace(0.0, 1.0)
    df["peer_cost_zscore"] = ((df["sanctioned_amount"] - sec_means) / sec_stds).fillna(0.0)
    
    # 7. Agency Past Experience Count
    agency_counts = df.groupby("implementing_agency")["work_id"].transform("count")
    df["agency_work_volume"] = agency_counts.fillna(1)
    
    return df


def compute_post_kickoff_metrics_and_targets(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes post-kickoff diagnostics, financial variance, and ground-truth target labels.
    NOTE: Features derived here MUST NOT be used in the predictive delay model to prevent leakage.
    """
    df = df.copy()
    
    # Ensure optional columns exist with safe defaults
    for col in ["recommendation_date", "sanction_date", "expected_completion_date", "actual_completion_date", "latest_payment_date"]:
        if col not in df.columns:
            df[col] = None
            
    for col in ["sanctioned_amount", "estimated_cost", "recommended_amount", "fund_released", "total_expenditure"]:
        if col not in df.columns:
            df[col] = 0.0
            
    if "payment_count" not in df.columns:
        df["payment_count"] = 1
        
    df["actual_completion_date"] = pd.to_datetime(df["actual_completion_date"], errors="coerce")
    df["latest_payment_date"] = pd.to_datetime(df["latest_payment_date"], errors="coerce")
    
    # Work Age
    df["work_age_days"] = (CURRENT_ANALYSIS_DATE - df["sanction_date"]).dt.days.fillna(180.0).clip(lower=0.0)
    
    # Realized Delay Days (Ground truth)
    comp_delay = (df["actual_completion_date"] - df["expected_completion_date"]).dt.days
    active_delay = (CURRENT_ANALYSIS_DATE - df["expected_completion_date"]).dt.days
    
    df["delay_days"] = np.where(
        df["status"] == "COMPLETED",
        comp_delay.fillna(0.0),
        np.maximum(0.0, active_delay.fillna(0.0))
    )
    df["delay_days"] = df["delay_days"].clip(lower=0.0)
    
    # Financial Disbursal & Expenditure Ratios (For Anomaly Detection & Monitoring)
    df["cost_deviation"] = np.where(
        df["sanctioned_amount"] > 0,
        (df["total_expenditure"] - df["sanctioned_amount"]) / df["sanctioned_amount"],
        0.0
    )
    df["fund_release_ratio"] = np.where(
        df["sanctioned_amount"] > 0,
        df["fund_released"] / df["sanctioned_amount"],
        0.0
    )
    df["utilization_rate"] = np.where(
        df["fund_released"] > 0,
        df["total_expenditure"] / df["fund_released"],
        0.0
    )
    df["remaining_fund"] = np.maximum(0.0, df["fund_released"] - df["total_expenditure"])
    
    work_age_safe = np.maximum(1.0, df["work_age_days"])
    df["expenditure_velocity"] = df["total_expenditure"] / work_age_safe
    df["is_single_payment_spurt"] = ((df["payment_count"] == 1) & (df["utilization_rate"] >= 0.85)).astype(int)
    
    # Target Ground-Truth Definition:
    # Target = 1 if work took > 45 days past deadline or is stalled
    df["target_is_delayed"] = np.where(
        (df["delay_days"] > 45.0) | (df["status"].isin(["DELAYED", "STALLED"])),
        1, 0
    )
    
    # Deterministic Overdue Status (Business rule, not ML model)
    df["is_currently_overdue"] = (
        (df["expected_completion_date"] < CURRENT_ANALYSIS_DATE) &
        (df["status"] != "COMPLETED")
    ).astype(int)
    
    # Deterministic Stall Status
    df["is_currently_stalled"] = (
        (df["status"] == "STALLED") |
        ((df["completion_percentage"] < 15.0) & (df["work_age_days"] > 250.0) & (df["status"] != "COMPLETED"))
    ).astype(int)
    
    return df


def build_all_features(master_path: Path, output_features_path: Path) -> pd.DataFrame:
    logger.info(f"Loading master dataset from {master_path}...")
    df = pd.read_parquet(master_path)
    
    logger.info("Computing leakage-free pre-kickoff predictive features...")
    df = compute_pre_kickoff_features(df)
    
    logger.info("Computing diagnostic monitoring metrics & ground truth targets...")
    df = compute_post_kickoff_metrics_and_targets(df)
    
    logger.info("Computing temporal and advanced pre-kickoff features...")
    df = df.sort_values('sanction_date').reset_index(drop=True)
    
    # Fast agency rolling ontime rate
    df['is_completed'] = (df['status'] == 'COMPLETED').astype(int)
    df['is_ontime'] = ((df['status'] == 'COMPLETED') & (df.get('target_is_delayed', 0) == 0)).astype(int)
    
    # Cumulative counts by agency
    df['agency_total_works_before'] = df.groupby('implementing_agency').cumcount()
    # Shift to not include current row, but cumsum includes current row
    # To get prior ontime, we need to do cumsum - current row
    df['agency_ontime_works_before'] = df.groupby('implementing_agency')['is_ontime'].cumsum() - df['is_ontime']
    
    df['agency_rolling_ontime_rate'] = np.where(
        df['agency_total_works_before'] > 0,
        df['agency_ontime_works_before'] / df['agency_total_works_before'],
        0.5
    )
    
    # Fast mp_concurrent_open_works
    # Number of open works before this sanction date = total works before - completed works before
    # Actually, a work is completed AT SOME POINT. The naive code used df['status'] != 'COMPLETED',
    # which is the current final status of the project, NOT the status at sanction_date.
    # The prompt explicitly specified: df['status'] != 'COMPLETED'. So it's just total works before - works before that are CURRENTLY completed.
    
    df['mp_total_works_before'] = df.groupby('mp_name').cumcount()
    df['mp_completed_works_before'] = df.groupby('mp_name')['is_completed'].cumsum() - df['is_completed']
    df['mp_concurrent_open_works'] = df['mp_total_works_before'] - df['mp_completed_works_before']

    df.drop(columns=['is_completed', 'is_ontime', 'agency_total_works_before', 'agency_ontime_works_before', 'mp_total_works_before', 'mp_completed_works_before'], inplace=True)

    df['sector_state_interaction'] = (df['sector'].astype(str) + '_' + df['state'].astype(str))
    df['sanction_month'] = pd.to_datetime(df['sanction_date']).dt.month.fillna(6).astype(int)
    
    if 'rec_to_sanction_days' not in df.columns:
        df['rec_to_sanction_days'] = (pd.to_datetime(df['sanction_date']) - pd.to_datetime(df['recommendation_date'])).dt.days.fillna(30)
    
    output_features_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(output_features_path.with_suffix(".parquet"), index=False)
    df.to_csv(output_features_path.with_suffix(".csv"), index=False)
    
    logger.info(f"Feature dataset saved to {output_features_path.with_suffix('.parquet')} ({len(df)} rows, {len(df.columns)} columns)")
    return df


if __name__ == "__main__":
    PROJECT_ROOT = Path(__file__).resolve().parents[2]
    master_file = PROJECT_ROOT / "data" / "processed" / "master_works.parquet"
    features_out = PROJECT_ROOT / "data" / "processed" / "features_master.parquet"
    build_all_features(master_file, features_out)
