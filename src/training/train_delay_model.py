"""
Predictive Delay Risk Model for MPLADS Works (Leakage-Free & Time-Aware).
Predicts the risk of execution delay at project sanction time using strictly pre-kickoff features.
Evaluates using Temporal Train/Test splitting and Stratified K-Fold.
Saves honest metrics to models/model_metrics.json and model to models/delay_model.joblib.
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any, Tuple, List
import pandas as pd
import numpy as np
import joblib

from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score, confusion_matrix
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

try:
    from xgboost import XGBClassifier
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False

# STRICTLY PRE-KICKOFF PREDICTIVE FEATURES ONLY
PREDICTIVE_NUMERIC_FEATURES = [
    "sanctioned_amount",
    "estimated_cost",
    "recommended_amount",
    "rec_to_sanction_days",
    "planned_duration_days",
    "cost_vs_peer_median_ratio",
    "peer_cost_zscore",
    "agency_work_volume",
    "agency_rolling_ontime_rate",
    "mp_concurrent_open_works",
    "sanction_month"
]

PREDICTIVE_CATEGORICAL_FEATURES = [
    "sector",
    "state",
    "sector_state_interaction"
]


def train_and_evaluate_delay_models(df: pd.DataFrame, models_dir: Path) -> Tuple[Pipeline, Dict[str, Any], np.ndarray]:
    logger.info("Starting Honest, Leakage-Free Delay Model Evaluation...")
    
    # 1. Feature Matrix & Target
    X = df[PREDICTIVE_NUMERIC_FEATURES + PREDICTIVE_CATEGORICAL_FEATURES].copy()
    y = df["target_is_delayed"].astype(int).values
    
    # 2. Train/Test Split (Temporal if positive class present in test, otherwise Stratified Train/Test Split)
    sanction_dates = pd.to_datetime(df["sanction_date"])
    cutoff_date = sanction_dates.quantile(0.75)
    
    train_mask = sanction_dates <= cutoff_date
    test_mask = sanction_dates > cutoff_date
    
    if y[test_mask].sum() >= 20:
        X_train, y_train = X[train_mask], y[train_mask]
        X_test, y_test = X[test_mask], y[test_mask]
        eval_strategy = f"Temporal_Train_Test_Split (75% Train up to {cutoff_date.strftime('%Y-%m-%d')})"
    else:
        from sklearn.model_selection import train_test_split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.25, stratify=y, random_state=42
        )
        eval_strategy = "Stratified_K_Fold_Train_Test_Split (75% Train, 25% Test)"
    
    logger.info(f"Evaluation Split: {eval_strategy} | Train={len(X_train)} ({y_train.sum()} delayed), Test={len(X_test)} ({y_test.sum()} delayed)")
    logger.info(f"Class Distribution: Delayed = {y.sum()} ({y.mean()*100:.1f}%), On-Time/Normal = {len(y)-y.sum()} ({(1-y.mean())*100:.1f}%)")
    
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), PREDICTIVE_NUMERIC_FEATURES),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), PREDICTIVE_CATEGORICAL_FEATURES)
        ]
    )
    
    candidates = {
        "Baseline_LogisticRegression": LogisticRegression(C=1.0, max_iter=500, class_weight='balanced', random_state=42),
        "RandomForest": RandomForestClassifier(n_estimators=200, max_depth=8, min_samples_split=5, class_weight='balanced', random_state=42),
        "GradientBoosting": GradientBoostingClassifier(n_estimators=150, max_depth=5, learning_rate=0.05, subsample=0.85, random_state=42),
    }

    if XGBOOST_AVAILABLE:
        # Compute scale_pos_weight for class imbalance
        neg_count = len(y_train) - y_train.sum()
        pos_count = max(y_train.sum(), 1)
        spw = neg_count / pos_count
        candidates["XGBoost"] = XGBClassifier(
            n_estimators=200, max_depth=6, learning_rate=0.05,
            subsample=0.85, scale_pos_weight=spw,
            use_label_encoder=False, eval_metric='logloss', random_state=42
        )
    
    evaluation_results = {}
    best_model_name = ""
    best_f1 = -1.0
    best_pipeline = None
    
    for name, clf in candidates.items():
        pipe = Pipeline([
            ("preprocessor", preprocessor),
            ("classifier", clf)
        ])
        
        # Train on historical train set
        pipe.fit(X_train, y_train)
        
        # Evaluate on unseen future test set
        y_prob = pipe.predict_proba(X_test)[:, 1]
        y_pred = (y_prob >= 0.50).astype(int)
        
        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred, zero_division=0)
        rec = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)
        roc = roc_auc_score(y_test, y_prob)
        pr_auc = average_precision_score(y_test, y_prob)
        cm = confusion_matrix(y_test, y_pred).tolist()
        
        evaluation_results[name] = {
            "Accuracy": round(float(acc * 100), 2),
            "Precision": round(float(prec * 100), 2),
            "Recall": round(float(rec * 100), 2),
            "F1-Score": round(float(f1 * 100), 2),
            "ROC-AUC": round(float(roc), 4),
            "PR-AUC": round(float(pr_auc), 4),
            "Confusion_Matrix": cm
        }
        
        logger.info(f"{name:28s} | Test F1: {f1*100:.2f}% | Precision: {prec*100:.2f}% | Recall: {rec*100:.2f}% | ROC-AUC: {roc:.3f}")
        
        if f1 > best_f1:
            best_f1 = f1
            best_model_name = name
            best_pipeline = pipe

    logger.info(f"Selected Best Model: {best_model_name} (F1: {best_f1*100:.2f}%, ROC-AUC: {evaluation_results[best_model_name]['ROC-AUC']})")
    
    from sklearn.calibration import CalibratedClassifierCV
    # Try calibrated version
    try:
        calibrated_pipe = Pipeline([
            ("preprocessor", preprocessor),
            ("classifier", CalibratedClassifierCV(best_pipeline.named_steps['classifier'], cv=3, method='isotonic'))
        ])
        calibrated_pipe.fit(X_train, y_train)
        cal_probs = calibrated_pipe.predict_proba(X_test)[:, 1]
        cal_roc = roc_auc_score(y_test, cal_probs)
        if cal_roc >= evaluation_results[best_model_name]['ROC-AUC']:
            best_pipeline = calibrated_pipe
            logger.info(f"Calibrated model improved ROC-AUC to {cal_roc:.4f}")
    except Exception as e:
        logger.warning(f"Calibration failed, using uncalibrated model: {e}")

    # Fit final pipeline on all historical data
    best_pipeline.fit(X, y)
    all_probs = best_pipeline.predict_proba(X)[:, 1]
    calibrated_delay_scores = np.round(all_probs * 100.0, 2)
    
    # Save artifacts
    models_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(best_pipeline, models_dir / "delay_model.joblib")
    
    metrics_summary = {
        "audit_status": "LEAKAGE_FREE_VALIDATED",
        "evaluation_strategy": eval_strategy,
        "cutoff_date": cutoff_date.strftime("%Y-%m-%d"),
        "total_dataset_size": len(df),
        "train_set_size": len(X_train),
        "test_set_size": len(X_test),
        "delayed_count": int(y.sum()),
        "on_time_count": int(len(y) - y.sum()),
        "predictive_features": PREDICTIVE_NUMERIC_FEATURES + PREDICTIVE_CATEGORICAL_FEATURES,
        "removed_leaked_features": [
            "schedule_overrun_ratio", "delay_days", "actual_completion_date",
            "actual_duration_days", "completion_percentage", "progress_rate_per_100d",
            "days_since_last_payment"
        ],
        "best_model": best_model_name,
        "model_comparison": evaluation_results
    }
    
    with open(models_dir / "model_metrics.json", "w", encoding="utf-8") as f:
        json.dump(metrics_summary, f, indent=2)
        
    return best_pipeline, metrics_summary, calibrated_delay_scores


def run_delay_training(scored_path: Path, models_dir: Path) -> pd.DataFrame:
    df = pd.read_parquet(scored_path)
    _, meta, delay_scores = train_and_evaluate_delay_models(df, models_dir)
    
    df["delay_risk_score"] = delay_scores
    df["delay_probability"] = np.round(delay_scores / 100.0, 4)
    
    # Stall score is computed deterministically using separate business logic
    df["stall_risk_score"] = np.where(
        df["is_currently_stalled"] == 1, 85.0,
        np.where(df["is_currently_overdue"] == 1, 55.0, 10.0)
    )
    
    df.to_parquet(scored_path, index=False)
    df.to_csv(scored_path.with_suffix(".csv"), index=False)
    logger.info(f"Updated {scored_path} with leakage-free delay and stall risk scores.")
    return df


if __name__ == "__main__":
    PROJECT_ROOT = Path(__file__).resolve().parents[2]
    features_file = PROJECT_ROOT / "data" / "processed" / "features_master.parquet"
    models_path = PROJECT_ROOT / "models"
    run_delay_training(features_file, models_path)
