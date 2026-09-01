"""
End-to-End Master Pipeline Re-run:
1. Ingest 1,500 raw records.
2. Clean & standardise.
3. Generate leakage-free pre-kickoff features & monitoring metrics.
4. Train & evaluate Isolation Forest, Random Forest delay model, and TF-IDF duplicate index.
5. Fuse multi-signal composite risk scores with proper calibration so high-risk works (cost overruns, stalled works, duplicates) are distinctly flagged.
6. Generate explainability profiles and reload backend database.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import logging
import pandas as pd
import numpy as np

from src.preprocessing.clean_data import run_pipeline as run_clean_pipeline
from src.features.build_features import build_all_features
from src.training.train_financial_anomaly import run_training_pipeline as run_fin_training
from src.training.train_delay_model import run_delay_training
from src.training.build_duplicate_index import run_duplicate_detection
from src.risk.risk_engine import run_risk_engine
from src.explainability.explain_risk import add_explanations_to_dataset
from backend.app.services.data_service import reload_dataframe

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

raw_csv = Path(r"C:\Users\kavit\Installation\SIH 2026\data\raw\work_register\mplads_works_raw.csv")
interim_csv = Path(r"C:\Users\kavit\Installation\SIH 2026\data\interim\cleaned_works.csv")
master_parquet = Path(r"C:\Users\kavit\Installation\SIH 2026\data\processed\master_works.parquet")
features_parquet = Path(r"C:\Users\kavit\Installation\SIH 2026\data\processed\features_master.parquet")
scored_parquet = Path(r"C:\Users\kavit\Installation\SIH 2026\data\processed\scored_works.parquet")
final_parquet = Path(r"C:\Users\kavit\Installation\SIH 2026\data\processed\final_evaluated_works.parquet")
models_dir = Path(r"C:\Users\kavit\Installation\SIH 2026\models")

# Step 1 & 2: Clean
logger.info("1/6: Cleaning raw dataset...")
run_clean_pipeline(raw_csv, interim_csv, master_parquet)

# Step 3: Features
logger.info("2/6: Building engineered features...")
build_all_features(master_parquet, features_parquet)

# Step 4: Financial & Utilization Anomaly Models
logger.info("3/6: Running Financial and Utilization Anomaly Models...")
run_fin_training(features_parquet, models_dir, scored_parquet)

# Step 5: Delay & Stall Models + Duplicate Index
logger.info("4/6: Running Delay, Stall and Duplicate Models...")
run_delay_training(scored_parquet, models_dir)
run_duplicate_detection(scored_parquet, models_dir)

# Step 6: Risk Fusion & Explainable AI
logger.info("5/6: Fusing Multi-Signal Risk Engine...")
run_risk_engine(scored_parquet, final_parquet)
add_explanations_to_dataset(final_parquet, final_parquet)

# Step 7: Hot-reload
logger.info("6/6: Reloading backend in-memory cache...")
reload_dataframe()

df_final = pd.read_parquet(final_parquet)
risk_counts = df_final["risk_level"].value_counts().to_dict()
logger.info(f"✅ Master Evaluation Complete! Total: {len(df_final)} works. Risk Distribution: {risk_counts}")
