"""
Data Access Service for FastAPI Backend.
Loads evaluated works dataset from Parquet and provides fast in-memory query,
filtering, aggregation, and full-text search capabilities.
"""

import json
import math
from pathlib import Path
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parents[3]
DATA_PATH = PROJECT_ROOT / "backend" / "app" / "db" / "master_evaluated_works.parquet"
FALLBACK_PATH = PROJECT_ROOT / "data" / "processed" / "final_evaluated_works.parquet"

_cached_df: Optional[pd.DataFrame] = None
_cached_risk_summary: Optional[Dict[str, Any]] = None
_default_map_markers: Optional[List[Dict[str, Any]]] = None
_work_id_to_idx: Optional[Dict[str, int]] = None
_work_records_cache: Dict[str, Dict[str, Any]] = {}
_spatial_index: Optional[Dict[str, Any]] = None


def get_dataframe() -> pd.DataFrame:
    global _cached_df
    if _cached_df is not None:
        return _cached_df
        
    if DATA_PATH.exists():
        _cached_df = pd.read_parquet(DATA_PATH)
    elif FALLBACK_PATH.exists():
        _cached_df = pd.read_parquet(FALLBACK_PATH)
    else:
        # Fallback to demo
        demo_path = PROJECT_ROOT / "data" / "demo" / "mplads_demo_dataset.parquet"
        _cached_df = pd.read_parquet(demo_path)
        
    return _cached_df


def reload_dataframe() -> pd.DataFrame:
    global _cached_df, _cached_risk_summary, _default_map_markers
    global _work_id_to_idx, _work_records_cache, _spatial_index
    _cached_df = None
    _cached_risk_summary = None
    _default_map_markers = None
    _work_id_to_idx = None
    _work_records_cache.clear()
    _spatial_index = None
    return get_dataframe()


def get_works_paginated(
    page: int = 1,
    page_size: int = 20,
    risk_level: Optional[str] = None,
    state: Optional[str] = None,
    sector: Optional[str] = None,
    search: Optional[str] = None,
    verification_queue: bool = False,
    sort_by: str = "composite_risk_score",
    sort_order: str = "desc"
) -> Dict[str, Any]:
    df = get_dataframe().copy()
    
    # Verification Queue filter: works that have high risk or premature advance or high delay or seeded in lifecycle
    if verification_queue:
        df = df[
            (df["risk_level"] == "HIGH") | 
            (df["composite_risk_score"] >= 45.0) |
            (df["utilization_anomaly_score"] >= 50.0) |
            (df["delay_risk_score"] >= 65.0)
        ]

    # Filtering
    if risk_level and risk_level.upper() in ["HIGH", "MEDIUM", "LOW"]:
        df = df[df["risk_level"] == risk_level.upper()]
        
    if state and state.strip():
        df = df[df["state"].str.lower() == state.strip().lower()]
        
    if sector and sector.strip():
        df = df[df["sector"].str.lower() == sector.strip().lower()]
        
    if search and search.strip():
        q = search.strip().lower()
        mask = (
            df["work_id"].str.lower().str.contains(q, na=False) |
            df["work_description"].str.lower().str.contains(q, na=False) |
            df["district"].str.lower().str.contains(q, na=False) |
            df["mp_name"].str.lower().str.contains(q, na=False) |
            df["implementing_agency"].str.lower().str.contains(q, na=False)
        )
        df = df[mask]
        
    # Sorting
    ascending = (sort_order.lower() == "asc")
    if sort_by in df.columns:
        df = df.sort_values(by=sort_by, ascending=ascending)
    else:
        df = df.sort_values(by="composite_risk_score", ascending=False)
        
    total_count = len(df)
    total_pages = max(1, (total_count + page_size - 1) // page_size)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    
    sliced = df.iloc[start_idx:end_idx].copy()
    
    # Parse JSON columns for clean output
    records = []
    for _, row in sliced.iterrows():
        r = row.to_dict()
        # Clean timestamps to ISO string
        for k, v in r.items():
            if isinstance(v, pd.Timestamp):
                r[k] = v.strftime("%Y-%m-%d")
            elif pd.isna(v):
                r[k] = None
        records.append(r)
        
    return {
        "page": page,
        "page_size": page_size,
        "total_records": total_count,
        "total_pages": total_pages,
        "works": records
    }


def _ensure_work_index():
    global _work_id_to_idx
    if _work_id_to_idx is None:
        df = get_dataframe()
        _work_id_to_idx = {str(wid): i for i, wid in enumerate(df["work_id"].values)}


def get_work_by_id(work_id: str) -> Optional[Dict[str, Any]]:
    if not work_id:
        return None
    work_id_str = str(work_id).strip()
    if work_id_str in _work_records_cache:
        return _work_records_cache[work_id_str]
    _ensure_work_index()
    idx = _work_id_to_idx.get(work_id_str)
    if idx is None:
        return None
    df = get_dataframe()
    r = df.iloc[idx].to_dict()
    for k, v in r.items():
        if isinstance(v, pd.Timestamp):
            r[k] = v.strftime("%Y-%m-%d")
        elif pd.isna(v):
            r[k] = None
    _work_records_cache[work_id_str] = r
    return r


def _ensure_spatial_index():
    global _spatial_index
    if _spatial_index is not None:
        return _spatial_index
    df = get_dataframe()
    if df.empty or "latitude" not in df.columns or "longitude" not in df.columns:
        _spatial_index = {}
        return _spatial_index
    lats = df["latitude"].fillna(0).to_numpy(dtype=np.float64)
    lons = df["longitude"].fillna(0).to_numpy(dtype=np.float64)
    work_ids = df["work_id"].astype(str).to_numpy()
    descs = df["work_description"].fillna("").astype(str).to_numpy()
    sectors = df["sector"].fillna("Infrastructure").astype(str).to_numpy() if "sector" in df.columns else np.array(["Infrastructure"] * len(df))
    status_col = "status" if "status" in df.columns else "work_status"
    statuses = df[status_col].fillna("Ongoing").astype(str).to_numpy() if status_col in df.columns else np.array(["Ongoing"] * len(df))
    amounts = df["sanctioned_amount"].fillna(0).to_numpy(dtype=np.float64) if "sanctioned_amount" in df.columns else np.zeros(len(df), dtype=np.float64)

    _spatial_index = {
        "lats": lats,
        "lons": lons,
        "work_ids": work_ids,
        "descs": descs,
        "sectors": sectors,
        "statuses": statuses,
        "amounts": amounts,
        "valid_mask": (lats != 0) & (lons != 0)
    }
    return _spatial_index


def find_nearby_projects(latitude: float, longitude: float, radius_km: float = 3.0, limit: int = 5) -> List[Dict[str, Any]]:
    """Fast vectorized spatial lookup using Haversine formula on pre-extracted numpy arrays."""
    try:
        sp = _ensure_spatial_index()
        if not sp:
            return []
        lats = sp["lats"]
        lons = sp["lons"]
        delta_lat = radius_km / 111.0
        cos_lat = max(math.cos(math.radians(latitude)), 0.01)
        delta_lon = radius_km / (111.0 * cos_lat)

        mask = (
            sp["valid_mask"] &
            (lats >= latitude - delta_lat) &
            (lats <= latitude + delta_lat) &
            (lons >= longitude - delta_lon) &
            (lons <= longitude + delta_lon)
        )
        cand_idx = np.where(mask)[0]
        if len(cand_idx) == 0:
            return []

        c_lats = lats[cand_idx]
        c_lons = lons[cand_idx]

        # Vectorized Haversine distance in km
        dlat = np.radians(c_lats - latitude)
        dlon = np.radians(c_lons - longitude)
        a = np.sin(dlat / 2.0) ** 2 + math.cos(math.radians(latitude)) * np.cos(np.radians(c_lats)) * np.sin(dlon / 2.0) ** 2
        c = 2.0 * np.arcsin(np.sqrt(np.clip(a, 0.0, 1.0)))
        dist_km = 6371.0 * c

        within_radius = dist_km <= radius_km
        valid_cands = cand_idx[within_radius]
        valid_dists = dist_km[within_radius]

        if len(valid_cands) == 0:
            return []

        if len(valid_cands) > limit:
            top_k = np.argpartition(valid_dists, limit)[:limit]
            top_k_sorted = top_k[np.argsort(valid_dists[top_k])]
            final_cands = valid_cands[top_k_sorted]
            final_dists = valid_dists[top_k_sorted]
        else:
            sort_order = np.argsort(valid_dists)
            final_cands = valid_cands[sort_order]
            final_dists = valid_dists[sort_order]

        matches = []
        for j, idx in enumerate(final_cands):
            matches.append({
                "work_id": sp["work_ids"][idx],
                "work_description": sp["descs"][idx],
                "sector": sp["sectors"][idx],
                "work_status": sp["statuses"][idx],
                "sanctioned_amount": float(sp["amounts"][idx]),
                "distance_km": round(float(final_dists[j]), 2)
            })
        return matches
    except Exception:
        return []


def get_risk_summary() -> Dict[str, Any]:
    global _cached_risk_summary
    if _cached_risk_summary is not None:
        return _cached_risk_summary

    df = get_dataframe()
    total_works = len(df)
    total_sanctioned = float(df["sanctioned_amount"].sum())
    total_expenditure = float(df["total_expenditure"].sum())
    
    risk_counts = df["risk_level"].value_counts().to_dict()
    
    sector_risk = df.groupby("sector").agg(
        avg_risk=("composite_risk_score", "mean"),
        high_risk_count=("risk_level", lambda s: (s == "HIGH").sum()),
        total_works=("work_id", "count")
    ).reset_index().to_dict(orient="records")
    
    state_risk = df.groupby("state").agg(
        avg_risk=("composite_risk_score", "mean"),
        high_risk_count=("risk_level", lambda s: (s == "HIGH").sum()),
        total_works=("work_id", "count"),
        total_sanctioned=("sanctioned_amount", "sum")
    ).reset_index().sort_values("high_risk_count", ascending=False).to_dict(orient="records")
    
    # Operational priority counts for top KPI hierarchy
    verification_req_count = int(((df["risk_level"] == "HIGH") | (df["composite_risk_score"] >= 45.0) | (df["utilization_anomaly_score"] >= 50.0)).sum())
    delayed_count = int((df["delay_risk_score"] >= 65.0).sum())
    advance_breach_count = int((df["utilization_anomaly_score"] >= 60.0).sum())

    res = {
        "total_works": total_works,
        "total_sanctioned_crore": round(total_sanctioned / 1e7, 2),
        "total_expenditure_crore": round(total_expenditure / 1e7, 2),
        "overall_utilization_rate": round((total_expenditure / total_sanctioned * 100), 1) if total_sanctioned > 0 else 0.0,
        "verification_required_count": verification_req_count,
        "delayed_works_count": delayed_count,
        "advance_breach_count": advance_breach_count,
        "risk_breakdown": {
            "high_risk_count": int(risk_counts.get("HIGH", 0)),
            "high_risk_percentage": round(int(risk_counts.get("HIGH", 0)) / total_works * 100, 1),
            "medium_risk_count": int(risk_counts.get("MEDIUM", 0)),
            "medium_risk_percentage": round(int(risk_counts.get("MEDIUM", 0)) / total_works * 100, 1),
            "low_risk_count": int(risk_counts.get("LOW", 0)),
            "low_risk_percentage": round(int(risk_counts.get("LOW", 0)) / total_works * 100, 1)
        },
        "sector_risk_overview": sector_risk,
        "state_risk_overview": state_risk
    }
    _cached_risk_summary = res
    return res


def get_map_markers(
    limit: int = 2500,
    risk_level: Optional[str] = None,
    state: Optional[str] = None
) -> List[Dict[str, Any]]:
    global _default_map_markers
    is_default = (limit == 2500 and not risk_level and not state)
    if is_default and _default_map_markers is not None:
        return _default_map_markers

    df = get_dataframe()
    
    if risk_level and risk_level.upper() in ["HIGH", "MEDIUM", "LOW"]:
        df = df[df["risk_level"] == risk_level.upper()]
        
    if state and state.strip():
        df = df[df["state"].str.lower() == state.strip().lower()]
        
    # Sort by risk score descending so high risk works always surface first on the GIS map
    df_sorted = df.sort_values(by="composite_risk_score", ascending=False).head(limit)
    
    marker_cols = [
        "work_id", "work_description", "state", "district", "sector",
        "latitude", "longitude", "composite_risk_score", "risk_level",
        "sanctioned_amount", "total_expenditure", "status"
    ]
    available_cols = [c for c in marker_cols if c in df_sorted.columns]
    records = df_sorted[available_cols].to_dict(orient="records")
    
    for r in records:
        desc = str(r.get("work_description", ""))
        r["description"] = (desc[:80] + "...") if len(desc) > 80 else desc
        r["latitude"] = float(r.get("latitude", 20.5937))
        r["longitude"] = float(r.get("longitude", 78.9629))
        r["composite_risk_score"] = float(r.get("composite_risk_score", 0.0))
        r["sanctioned_amount"] = float(r.get("sanctioned_amount", 0.0))
        r["total_expenditure"] = float(r.get("total_expenditure", 0.0))
        
    if is_default:
        _default_map_markers = records

    return records
