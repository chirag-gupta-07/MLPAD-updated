"""
Financial and Utilization Anomaly Detection Models for MPLADS Works.
Implements Progressive Peer-Group Isolation Forest and Quantile Normalization.
Output is strictly a 0–100 Anomaly Score representing relative unusualness against peer baselines (NOT a fraud probability).
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any, Tuple, List
import pandas as pd
import numpy as np
import joblib

from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import RobustScaler

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Configurable minimum peer group sample size
MIN_PEER_GROUP_SIZE = 5

FINANCIAL_FEATURES = [
    "sanctioned_amount",
    "total_expenditure",
    "cost_deviation",
    "cost_vs_peer_median_ratio",
    "peer_cost_zscore",
    "expenditure_velocity"
]

UTILIZATION_FEATURES = [
    "fund_release_ratio",
    "utilization_rate",
    "payment_count",
    "is_single_payment_spurt"
]


def compute_progressive_peer_baselines(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes hierarchical peer baselines with progressive fallback:
    District + Sector -> State + Sector -> National Sector
    Uses semantic_sector if present to respect genuine capital infrastructure norms.
    """
    df = df.copy()
    sec_col = "semantic_sector" if "semantic_sector" in df.columns else "sector"
    
    # 1. National Sector Median
    national_sector_med = df.groupby(sec_col)["sanctioned_amount"].median()
    
    # 2. State + Sector Medians
    state_sec_medians = df.groupby(["state", sec_col])["sanctioned_amount"].median()
    state_sec_counts = df.groupby(["state", sec_col])["sanctioned_amount"].count()
    valid_state = state_sec_counts[state_sec_counts >= MIN_PEER_GROUP_SIZE].index
    
    # 3. District + Sector Medians
    dist_sec_medians = df.groupby(["district", sec_col])["sanctioned_amount"].median()
    dist_sec_counts = df.groupby(["district", sec_col])["sanctioned_amount"].count()
    valid_dist = dist_sec_counts[dist_sec_counts >= MIN_PEER_GROUP_SIZE].index
    
    dist_map = df.set_index(["district", sec_col]).index.map(dist_sec_medians.loc[dist_sec_medians.index.isin(valid_dist)])
    state_map = df.set_index(["state", sec_col]).index.map(state_sec_medians.loc[state_sec_medians.index.isin(valid_state)])
    nat_map = df[sec_col].map(national_sector_med)
    
    df["peer_group_level"] = np.where(pd.notnull(dist_map), "District+Sector", np.where(pd.notnull(state_map), "State+Sector", "National+Sector"))
    df["progressive_peer_median"] = np.where(pd.notnull(dist_map), dist_map, np.where(pd.notnull(state_map), state_map, nat_map))
    df["progressive_peer_median"] = df["progressive_peer_median"].fillna(df["sanctioned_amount"]).replace(0.0, 1.0)
    
    df["cost_vs_peer_median_ratio"] = np.where(
        df["progressive_peer_median"] > 0,
        df["sanctioned_amount"] / df["progressive_peer_median"],
        1.0
    )
    return df


def train_financial_anomaly_model(df: pd.DataFrame, models_dir: Path) -> Tuple[IsolationForest, RobustScaler, np.ndarray, Dict[str, Any]]:
    logger.info("Training Financial Anomaly Detection Model (Isolation Forest)...")
    
    df = compute_progressive_peer_baselines(df)
    X_fin = df[FINANCIAL_FEATURES].copy()
    X_fin = X_fin.replace([np.inf, -np.inf], np.nan).fillna(0.0)
    
    scaler = RobustScaler()
    X_scaled = scaler.fit_transform(X_fin)
    
    iso_forest = IsolationForest(
        n_estimators=150,
        contamination=0.08,
        max_samples="auto",
        random_state=42,
        n_jobs=-1
    )
    iso_forest.fit(X_scaled)
    
    # Invert decision function so higher score = more anomalous
    raw_scores = iso_forest.score_samples(X_scaled)
    min_s, max_s = raw_scores.min(), raw_scores.max()
    normalized_scores = 100.0 * (1.0 - ((raw_scores - min_s) / (max_s - min_s + 1e-8)))
    
    # Financial variance penalty
    overrun_boost = np.where(df["cost_deviation"] > 0.20, 20.0, 0.0)
    peer_boost = np.where(df["cost_vs_peer_median_ratio"] > 1.8, 15.0, 0.0)
    
    calibrated_scores = np.clip(normalized_scores * 0.70 + overrun_boost + peer_boost, 0.0, 100.0)
    
    models_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(iso_forest, models_dir / "financial_anomaly_model.joblib")
    joblib.dump(scaler, models_dir / "financial_scaler.joblib")
    
    metrics = {
        "model_type": "IsolationForest_Progressive_Peer_Group",
        "min_peer_group_size": MIN_PEER_GROUP_SIZE,
        "n_samples": int(len(df)),
        "features": FINANCIAL_FEATURES,
        "peer_group_distribution": df["peer_group_level"].value_counts().to_dict(),
        "mean_anomaly_score": float(np.mean(calibrated_scores)),
        "high_risk_count": int((calibrated_scores >= 70.0).sum())
    }
    
    return iso_forest, scaler, calibrated_scores, metrics


def train_utilization_anomaly_model(df: pd.DataFrame, models_dir: Path) -> Tuple[IsolationForest, RobustScaler, np.ndarray, Dict[str, Any]]:
    logger.info("Training Utilization Pattern Anomaly Model...")
    X_util = df[UTILIZATION_FEATURES].copy()
    X_util = X_util.replace([np.inf, -np.inf], np.nan).fillna(0.0)
    
    scaler = RobustScaler()
    X_scaled = scaler.fit_transform(X_util)
    
    iso_forest_util = IsolationForest(
        n_estimators=120,
        contamination=0.06,
        random_state=42,
        n_jobs=-1
    )
    iso_forest_util.fit(X_scaled)
    
    raw_scores = iso_forest_util.score_samples(X_scaled)
    min_s, max_s = raw_scores.min(), raw_scores.max()
    normalized_scores = 100.0 * (1.0 - ((raw_scores - min_s) / (max_s - min_s + 1e-8)))
    
    # Zero progress with high disbursal flag
    zero_progress_penalty = np.where((df["fund_release_ratio"] >= 0.75) & (df["completion_percentage"] <= 10.0), 30.0, 0.0)
    calibrated_util_scores = np.clip(normalized_scores * 0.70 + zero_progress_penalty, 0.0, 100.0)
    
    joblib.dump(iso_forest_util, models_dir / "utilization_anomaly_model.joblib")
    joblib.dump(scaler, models_dir / "utilization_scaler.joblib")
    
    metrics = {
        "model_type": "IsolationForest_Utilization",
        "n_samples": int(len(df)),
        "features": UTILIZATION_FEATURES,
        "mean_anomaly_score": float(np.mean(calibrated_util_scores)),
        "high_risk_count": int((calibrated_util_scores >= 70.0).sum())
    }
    return iso_forest_util, scaler, calibrated_util_scores, metrics


def run_training_pipeline(features_path: Path, models_dir: Path, output_scored_path: Path) -> pd.DataFrame:
    df = pd.read_parquet(features_path)
    
    _, _, fin_scores, fin_meta = train_financial_anomaly_model(df, models_dir)
    _, _, util_scores, util_meta = train_utilization_anomaly_model(df, models_dir)
    
    df["financial_anomaly_score"] = np.round(fin_scores, 2)
    df["utilization_anomaly_score"] = np.round(util_scores, 2)
    
    df.to_parquet(output_scored_path.with_suffix(".parquet"), index=False)
    df.to_csv(output_scored_path.with_suffix(".csv"), index=False)
    
    with open(models_dir / "financial_utilization_metrics.json", "w", encoding="utf-8") as f:
        json.dump({"financial": fin_meta, "utilization": util_meta}, f, indent=2)
        
    logger.info(f"Saved scored dataset to {output_scored_path.with_suffix('.parquet')}")
    return df


if __name__ == "__main__":
    PROJECT_ROOT = Path(__file__).resolve().parents[2]
    feat_file = PROJECT_ROOT / "data" / "processed" / "features_master.parquet"
    models_path = PROJECT_ROOT / "models"
    scored_file = PROJECT_ROOT / "data" / "processed" / "scored_works.parquet"
    run_training_pipeline(feat_file, models_path, scored_file)
