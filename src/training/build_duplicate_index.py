"""
Semantic & Geographic Duplicate Work Detection Model for MPLADS Works.
Computes multi-dimensional similarity across:
1. NLP Semantic & N-gram Text Similarity (TF-IDF & Cosine Similarity)
2. Spatial / Geographic Proximity (Haversine Distance in Kilometers with Approximate Centroid Labeling)
3. Cost Ratio Similarity (|Cost_A - Cost_B| / Max_Cost)
4. Temporal Proximity (|Sanction_Date_A - Sanction_Date_B|)

Ensures:
- No self-comparisons
- Unique pairing (no redundant A-B / B-A duplicate pairs)
- Explicit label: 'District-level approximate spatial proximity'
"""

import json
import logging
import math
from pathlib import Path
from typing import Dict, Any, List, Tuple
import pandas as pd
import numpy as np
import joblib

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def find_duplicate_works(df: pd.DataFrame, models_dir: Path) -> Tuple[np.ndarray, List[List[Dict[str, Any]]]]:
    logger.info(f"Indexing {len(df)} work descriptions for Semantic Duplicate Detection...")
    
    descriptions = df["work_description"].fillna("").astype(str).tolist()
    
    vectorizer = TfidfVectorizer(
        ngram_range=(1, 3),
        max_features=5000,
        stop_words="english",
        sublinear_tf=True
    )
    tfidf_matrix = vectorizer.fit_transform(descriptions)
    
    models_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(vectorizer, models_dir / "duplicate_tfidf_vectorizer.joblib")
    
    n_works = len(df)
    duplicate_scores = np.zeros(n_works)
    duplicate_matches: List[List[Dict[str, Any]]] = [[] for _ in range(n_works)]
    
    districts = df["district"].values
    states = df["state"].values
    sanction_amounts = df["sanctioned_amount"].values
    sanction_dates = pd.to_datetime(df["sanction_date"]).values
    work_ids = df["work_id"].values
    lats = df["latitude"].values
    lons = df["longitude"].values
    
    district_map: Dict[str, List[int]] = {}
    for i, d in enumerate(districts):
        key = f"{states[i]}_{d}".upper()
        district_map.setdefault(key, []).append(i)
        
    logger.info(f"Scanning across {len(district_map)} district partitions for duplicate pairs...")
    
    seen_pairs = set()
    duplicate_pairs_found = 0
    
    for key, indices in district_map.items():
        if len(indices) < 2:
            continue
            
        sub_matrix = tfidf_matrix[indices]
        sim_matrix = cosine_similarity(sub_matrix)
        
        for i_sub in range(len(indices)):
            for j_sub in range(i_sub + 1, len(indices)):
                idx_a = indices[i_sub]
                idx_b = indices[j_sub]
                
                # Prevent self-comparison
                if idx_a == idx_b:
                    continue
                    
                pair_key = tuple(sorted([work_ids[idx_a], work_ids[idx_b]]))
                if pair_key in seen_pairs:
                    continue
                seen_pairs.add(pair_key)
                
                text_sim = float(sim_matrix[i_sub, j_sub])
                
                if text_sim >= 0.55:
                    cost_a = sanction_amounts[idx_a]
                    cost_b = sanction_amounts[idx_b]
                    max_cost = max(cost_a, cost_b, 1.0)
                    cost_diff_ratio = abs(cost_a - cost_b) / max_cost
                    cost_sim = max(0.0, 1.0 - cost_diff_ratio)
                    
                    dist_km = haversine_distance_km(lats[idx_a], lons[idx_a], lats[idx_b], lons[idx_b])
                    loc_sim = max(0.0, 1.0 - (dist_km / 25.0))
                    
                    delta_days = abs((sanction_dates[idx_a] - sanction_dates[idx_b]) / np.timedelta64(1, 'D'))
                    time_sim = max(0.0, 1.0 - (delta_days / 730.0))
                    
                    comp_dup_score = round(float(
                        (0.50 * text_sim + 0.25 * cost_sim + 0.15 * loc_sim + 0.10 * time_sim) * 100.0
                    ), 2)
                    
                    if comp_dup_score >= 50.0:
                        duplicate_pairs_found += 1
                        duplicate_scores[idx_a] = max(duplicate_scores[idx_a], comp_dup_score)
                        duplicate_scores[idx_b] = max(duplicate_scores[idx_b], comp_dup_score)
                        
                        match_info_a = {
                            "paired_work_id": str(work_ids[idx_b]),
                            "similarity_score": comp_dup_score,
                            "text_similarity": round(text_sim * 100, 1),
                            "cost_similarity": round(cost_sim * 100, 1),
                            "distance_km": round(dist_km, 2),
                            "spatial_resolution": "District-level approximate spatial proximity",
                            "date_difference_days": int(delta_days)
                        }
                        match_info_b = {
                            "paired_work_id": str(work_ids[idx_a]),
                            "similarity_score": comp_dup_score,
                            "text_similarity": round(text_sim * 100, 1),
                            "cost_similarity": round(cost_sim * 100, 1),
                            "distance_km": round(dist_km, 2),
                            "spatial_resolution": "District-level approximate spatial proximity",
                            "date_difference_days": int(delta_days)
                        }
                        duplicate_matches[idx_a].append(match_info_a)
                        duplicate_matches[idx_b].append(match_info_b)

    logger.info(f"Duplicate scan complete: Found {duplicate_pairs_found} distinct candidate pairs.")
    return duplicate_scores, duplicate_matches


def run_duplicate_detection(scored_path: Path, models_dir: Path) -> pd.DataFrame:
    df = pd.read_parquet(scored_path)
    dup_scores, dup_matches = find_duplicate_works(df, models_dir)
    
    df["duplicate_risk_score"] = np.round(dup_scores, 2)
    df["duplicate_matches_json"] = [json.dumps(m) for m in dup_matches]
    
    df.to_parquet(scored_path, index=False)
    df.to_csv(scored_path.with_suffix(".csv"), index=False)
    return df


if __name__ == "__main__":
    scored_file = Path(r"C:\Users\kavit\Installation\SIH 2026\data\processed\scored_works.parquet")
    models_path = Path(r"C:\Users\kavit\Installation\SIH 2026\models")
    run_duplicate_detection(scored_file, models_path)
