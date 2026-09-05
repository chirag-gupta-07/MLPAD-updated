"""
Data Access Service for FastAPI Backend.
Loads evaluated works dataset from Parquet and provides fast in-memory query,
filtering, aggregation, and full-text search capabilities.
"""

import json
from pathlib import Path
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np

DATA_PATH = Path(r"C:\Users\kavit\Installation\SIH 2026\backend\app\db\master_evaluated_works.parquet")
FALLBACK_PATH = Path(r"C:\Users\kavit\Installation\SIH 2026\data\processed\final_evaluated_works.parquet")

_cached_df: Optional[pd.DataFrame] = None


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
        demo_path = Path(r"C:\Users\kavit\Installation\SIH 2026\data\demo\mplads_demo_dataset.parquet")
        _cached_df = pd.read_parquet(demo_path)
        
    return _cached_df


def reload_dataframe() -> pd.DataFrame:
    global _cached_df
    _cached_df = None
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


def get_work_by_id(work_id: str) -> Optional[Dict[str, Any]]:
    df = get_dataframe()
    match = df[df["work_id"] == work_id]
    if len(match) == 0:
        return None
    r = match.iloc[0].to_dict()
    for k, v in r.items():
        if isinstance(v, pd.Timestamp):
            r[k] = v.strftime("%Y-%m-%d")
        elif pd.isna(v):
            r[k] = None
    return r


def get_risk_summary() -> Dict[str, Any]:
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

    return {
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


def get_map_markers(
    limit: int = 2500,
    risk_level: Optional[str] = None,
    state: Optional[str] = None
) -> List[Dict[str, Any]]:
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
        
    return records
