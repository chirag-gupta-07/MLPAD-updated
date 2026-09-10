from fastapi import APIRouter, Query
from typing import Dict, Any, List
from backend.app.services.data_service import get_risk_summary, get_dataframe
import pandas as pd

router = APIRouter(prefix="/api/risk", tags=["Risk Intelligence"])


@router.get("/summary")
def get_summary() -> Dict[str, Any]:
    return get_risk_summary()


@router.get("/clusters")
def get_risk_clusters() -> List[Dict[str, Any]]:
    df = get_dataframe()
    cluster_stats = df.groupby(["state", "district"]).agg(
        total_works=("work_id", "count"),
        high_risk_works=("risk_level", lambda s: (s == "HIGH").sum()),
        avg_risk_score=("composite_risk_score", "mean"),
        total_sanctioned=("sanctioned_amount", "sum"),
        total_expenditure=("total_expenditure", "sum"),
        latitude=("latitude", "mean"),
        longitude=("longitude", "mean")
    ).reset_index()
    
    # Sort by high risk count descending
    cluster_stats = cluster_stats.sort_values(by=["high_risk_works", "avg_risk_score"], ascending=False)
    
    records = []
    for _, r in cluster_stats.iterrows():
        records.append({
            "state": str(r["state"]),
            "district": str(r["district"]),
            "total_works": int(r["total_works"]),
            "high_risk_works": int(r["high_risk_works"]),
            "avg_risk_score": round(float(r["avg_risk_score"]), 2),
            "total_sanctioned_lakh": round(float(r["total_sanctioned"]) / 1e5, 2),
            "total_expenditure_lakh": round(float(r["total_expenditure"]) / 1e5, 2),
            "latitude": round(float(r["latitude"]), 5),
            "longitude": round(float(r["longitude"]), 5),
            "is_hotspot": bool(r["high_risk_works"] >= 3 or r["avg_risk_score"] >= 45.0)
        })
    return records


@router.get("/network")
def get_network_analysis():
    """Returns contractor-agency-MP network graph with anomaly scores."""
    from backend.app.services.data_service import get_dataframe
    from src.risk.network_analysis import get_network_graph_data
    df = get_dataframe()
    return get_network_graph_data(df)


@router.get("/benford-analysis")
def get_benford_analysis(
    column: str = Query("total_expenditure"),
    group_by: str = Query("district")
):
    """Benford's Law statistical fraud detection on financial data."""
    from backend.app.services.data_service import get_dataframe
    from backend.app.services.benford_analysis import analyze_benford_compliance
    df = get_dataframe()
    return analyze_benford_compliance(df, column=column, group_by=group_by)
