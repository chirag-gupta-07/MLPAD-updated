"""
Multi-Signal Risk Intelligence Engine for MPLADS Works (Calibrated).
Fuses individual ML model scores into a balanced, calibrated 0–100 Composite Risk Score.
Categorization:
- HIGH RISK (Score >= 70.0): ~8-12% (Severe anomalies requiring urgent physical inspection)
- MEDIUM RISK (Score 40.0-69.9): ~25-30% (Supervisory monitoring required)
- LOW RISK / COMPLIANT (Score < 40.0): ~60-65% (Normal progress)
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Tuple
import pandas as pd
import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[2]

WEIGHTS = {
    "financial": 0.30,
    "delay": 0.25,
    "duplicate": 0.20,
    "utilization": 0.15,
    "stall": 0.10
}


def calculate_data_quality_and_confidence(row: pd.Series) -> Tuple[float, str]:
    quality_points = 0
    max_points = 6
    
    if pd.notnull(row.get("sanctioned_amount")) and float(row.get("sanctioned_amount", 0)) > 0:
        quality_points += 1
    if pd.notnull(row.get("total_expenditure")):
        quality_points += 1
    if pd.notnull(row.get("sanction_date")):
        quality_points += 1
    if pd.notnull(row.get("expected_completion_date")):
        quality_points += 1
    if pd.notnull(row.get("work_description")) and len(str(row.get("work_description", ""))) > 15:
        quality_points += 1
    if pd.notnull(row.get("implementing_agency")) and str(row.get("implementing_agency")) != "Not Specified":
        quality_points += 1
        
    data_quality_score = round((quality_points / max_points) * 100.0, 1)
    
    if data_quality_score >= 85.0:
        confidence = "HIGH"
    elif data_quality_score >= 60.0:
        confidence = "MEDIUM"
    else:
        confidence = "LOW"
        
    return data_quality_score, confidence


def calculate_composite_risk(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    
    fin = df["financial_anomaly_score"].fillna(10.0).clip(0.0, 100.0)
    delay = df["delay_risk_score"].fillna(10.0).clip(0.0, 100.0)
    dup = df["duplicate_risk_score"].fillna(0.0).clip(0.0, 100.0)
    util = df["utilization_anomaly_score"].fillna(10.0).clip(0.0, 100.0)
    stall = df["stall_risk_score"].fillna(10.0).clip(0.0, 100.0)
    
    # Weighted composite base
    composite_base = (
        WEIGHTS["financial"] * fin +
        WEIGHTS["delay"] * delay +
        WEIGHTS["duplicate"] * dup +
        WEIGHTS["utilization"] * util +
        WEIGHTS["stall"] * stall
    )
    
    # Severe isolated anomaly booster (if any dimension has an extreme spike >= 85)
    severe_boost = np.where((fin >= 85.0) | (util >= 85.0) | (dup >= 85.0) | (stall >= 85.0), 15.0, 0.0)
    
    df["composite_risk_score"] = np.round(np.clip(composite_base + severe_boost, 0.0, 100.0), 2)
    
    df["risk_level"] = np.where(
        df["composite_risk_score"] >= 65.0, "HIGH",
        np.where(df["composite_risk_score"] >= 38.0, "MEDIUM", "LOW")
    )
    df["risk_percentile"] = np.round(df["composite_risk_score"].rank(pct=True) * 100.0, 1)
    
    # Vectorized Data Quality Score & Confidence
    p1 = (df.get("sanctioned_amount", pd.Series(0, index=df.index)).notnull() & (df.get("sanctioned_amount", pd.Series(0, index=df.index)) > 0)).astype(int)
    p2 = df.get("total_expenditure", pd.Series(None, index=df.index)).notnull().astype(int)
    p3 = df.get("sanction_date", pd.Series(None, index=df.index)).notnull().astype(int)
    p4 = df.get("expected_completion_date", pd.Series(None, index=df.index)).notnull().astype(int)
    p5 = (df.get("work_description", pd.Series("", index=df.index)).fillna("").astype(str).str.len() > 15).astype(int)
    p6 = (df.get("implementing_agency", pd.Series("", index=df.index)).fillna("") != "Not Specified").astype(int)
    
    total_points = p1 + p2 + p3 + p4 + p5 + p6
    df["data_quality_score"] = np.round((total_points / 6.0) * 100.0, 1)
    df["model_confidence"] = np.where(df["data_quality_score"] >= 85.0, "HIGH", np.where(df["data_quality_score"] >= 60.0, "MEDIUM", "LOW"))
    
    district_risk_mean = df.groupby("district")["composite_risk_score"].transform("mean")
    df["district_avg_risk_score"] = np.round(district_risk_mean, 2)
    
    return df


def run_risk_engine(scored_path: Path, output_final_path: Path) -> pd.DataFrame:
    logger.info(f"Running Risk Fusion Engine on {scored_path}...")
    df = pd.read_parquet(scored_path)
    
    df_fused = calculate_composite_risk(df)
    
    output_final_path.parent.mkdir(parents=True, exist_ok=True)
    df_fused.to_parquet(output_final_path.with_suffix(".parquet"), index=False)
    df_fused.to_csv(output_final_path.with_suffix(".csv"), index=False)
    
    backend_db_path = PROJECT_ROOT / "backend" / "app" / "db" / "master_evaluated_works.parquet"
    backend_db_path.parent.mkdir(parents=True, exist_ok=True)
    df_fused.to_parquet(backend_db_path, index=False)
    df_fused.to_csv(backend_db_path.with_suffix(".csv"), index=False)
    
    risk_dist = df_fused["risk_level"].value_counts().to_dict()
    logger.info(f"Risk Fusion complete: {risk_dist}")
    return df_fused


if __name__ == "__main__":
    input_file = PROJECT_ROOT / "data" / "processed" / "scored_works.parquet"
    final_file = PROJECT_ROOT / "data" / "processed" / "final_evaluated_works.parquet"
    run_risk_engine(input_file, final_file)
