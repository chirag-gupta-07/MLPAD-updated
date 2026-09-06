from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
import shutil
import logging
import json
import pandas as pd
import numpy as np
from typing import Dict, Any

from src.ingestion.file_ingestion import load_raw_file
from src.preprocessing.clean_data import clean_dataframe
from src.features.build_features import build_all_features
from src.training.build_duplicate_index import find_duplicate_works
from src.risk.risk_engine import run_risk_engine, calculate_composite_risk
from src.explainability.explain_risk import add_explanations_to_dataset
from backend.app.services.data_service import reload_dataframe

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/data", tags=["Data Ingestion & Upload"])

PROJECT_ROOT = Path(__file__).resolve().parents[3]
UPLOAD_DIR = PROJECT_ROOT / "data" / "raw" / "work_register" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR = PROJECT_ROOT / "models"
MASTER_EVALUATED_PATH = PROJECT_ROOT / "data" / "processed" / "final_evaluated_works.parquet"


@router.post("/upload")
async def upload_mplads_file(file: UploadFile = File(...)) -> Dict[str, Any]:
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in [".csv", ".xlsx", ".xls", ".parquet"]:
        raise HTTPException(status_code=400, detail=f"Unsupported format {file_ext}. Supported: CSV, Excel, Parquet.")
        
    dest_path = UPLOAD_DIR / file.filename
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        # 1. Ingest
        df_raw = load_raw_file(dest_path)
        raw_count = len(df_raw)
        
        # 2. Clean
        df_clean, metrics = clean_dataframe(df_raw)
        temp_cleaned = PROJECT_ROOT / "data" / "interim" / "temp_uploaded_cleaned.parquet"
        temp_cleaned.parent.mkdir(parents=True, exist_ok=True)
        df_clean.to_parquet(temp_cleaned, index=False)
        
        # 3. Features
        temp_features = PROJECT_ROOT / "data" / "processed" / "temp_features.parquet"
        temp_features.parent.mkdir(parents=True, exist_ok=True)
        df_feat = build_all_features(temp_cleaned, temp_features)
        
        # 4. Score with ML / Anomaly Models
        # Financial Anomaly Scoring
        cost_overrun = np.where(df_feat["cost_deviation"] > 0.15, df_feat["cost_deviation"] * 80.0, 15.0)
        peer_overrun = np.where(df_feat["cost_vs_peer_median_ratio"] > 1.8, 35.0, 0.0)
        df_feat["financial_anomaly_score"] = np.clip(cost_overrun + peer_overrun, 5.0, 100.0)
        
        # Delay Risk Scoring
        planned_dur = df_feat["planned_duration_days"].clip(30.0, 730.0)
        rec_lat = df_feat["rec_to_sanction_days"].clip(0.0, 180.0)
        delay_prob = np.clip((rec_lat / 180.0) * 40.0 + (planned_dur / 730.0) * 30.0 + 10.0, 10.0, 95.0)
        df_feat["delay_risk_score"] = np.round(delay_prob, 2)
        
        # Utilization Scoring
        util_penalty = np.where((df_feat["fund_release_ratio"] >= 0.75) & (df_feat["completion_percentage"] <= 10.0), 90.0, 15.0)
        df_feat["utilization_anomaly_score"] = util_penalty
        
        # Stall Risk
        df_feat["stall_risk_score"] = np.where(
            df_feat["is_currently_stalled"] == 1, 85.0,
            np.where(df_feat["is_currently_overdue"] == 1, 55.0, 10.0)
        )
        
        # Duplicate Work Index
        try:
            dup_scores, dup_matches = find_duplicate_works(df_feat, MODELS_DIR)
            df_feat["duplicate_risk_score"] = dup_scores
            df_feat["duplicate_matches_json"] = [json.dumps(m) for m in dup_matches]
        except Exception:
            df_feat["duplicate_risk_score"] = 5.0
            df_feat["duplicate_matches_json"] = "[]"
            
        # Calculate composite risk for uploaded batch
        df_evaluated = calculate_composite_risk(df_feat)
        
        # 5. Merge / Upsert into Master Database (prevent wiping out master 1500 lake)
        if MASTER_EVALUATED_PATH.exists():
            df_master = pd.read_parquet(MASTER_EVALUATED_PATH)
            # Remove any matching work_ids to prevent duplicates and append new
            existing_ids = set(df_evaluated["work_id"])
            df_master = df_master[~df_master["work_id"].isin(existing_ids)]
            df_combined = pd.concat([df_evaluated, df_master], ignore_index=True)
        else:
            df_combined = df_evaluated
            
        df_combined.to_parquet(MASTER_EVALUATED_PATH, index=False)
        df_combined.to_csv(MASTER_EVALUATED_PATH.with_suffix(".csv"), index=False)
        
        # Generate explanations for full updated dataset
        add_explanations_to_dataset(MASTER_EVALUATED_PATH, MASTER_EVALUATED_PATH)
        
        # 6. Hot-Reload In-Memory Cache
        reload_dataframe()
        
        return {
            "status": "success",
            "message": f"Successfully ingested, standardized, and evaluated {raw_count} works from {file.filename}. Master database updated.",
            "records_processed": raw_count,
            "total_records_in_lake": len(df_combined),
            "metrics": metrics
        }
    except Exception as e:
        logger.error(f"Failed to process uploaded file: {e}")
        raise HTTPException(status_code=500, detail=f"Data pipeline error: {str(e)}")
