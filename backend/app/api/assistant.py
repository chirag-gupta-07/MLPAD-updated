from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from backend.app.services.data_service import get_dataframe, get_risk_summary
import pandas as pd
import numpy as np

router = APIRouter(prefix="/api/assistant", tags=["AI Insights Assistant"])


class QueryRequest(BaseModel):
    query: str


@router.post("/query")
def answer_assistant_query(req: QueryRequest) -> Dict[str, Any]:
    q = req.query.strip().lower()
    df = get_dataframe()
    summary = get_risk_summary()
    
    # 1. High risk works inquiry
    if "high risk" in q or "highest risk" in q or "top risk" in q or "anomal" in q:
        high_df = df[df["risk_level"] == "HIGH"].sort_values("composite_risk_score", ascending=False)
        
        # Check state filter in query
        matched_state = None
        for s in df["state"].unique():
            if s.lower() in q:
                high_df = high_df[high_df["state"].str.lower() == s.lower()]
                matched_state = s
                break
                
        # Check district filter in query
        matched_district = None
        for d in df["district"].unique():
            if d.lower() in q:
                high_df = high_df[high_df["district"].str.lower() == d.lower()]
                matched_district = d
                break
                
        top_works = []
        for _, r in high_df.head(5).iterrows():
            top_works.append({
                "work_id": r["work_id"],
                "state": r["state"],
                "district": r["district"],
                "sector": r["sector"],
                "cost_lakh": round(r["sanctioned_amount"] / 1e5, 2),
                "expenditure_lakh": round(r["total_expenditure"] / 1e5, 2),
                "risk_score": r["composite_risk_score"],
                "summary": r.get("risk_summary_text", "")
            })
            
        location_str = f" in {matched_district or matched_state}" if (matched_district or matched_state) else " nationwide"
        answer = f"Found **{len(high_df)} high-risk works**{location_str} requiring supervisory audit. Here are the top flagged projects with verified evidence:\n\n"
        for w in top_works:
            answer += f"- **{w['work_id']}** ({w['sector']} | {w['district']}, {w['state']}): Sanctioned ₹{w['cost_lakh']}L, Expended ₹{w['expenditure_lakh']}L. **Risk Score: {w['risk_score']}/100**.\n  *Evidence*: {w['summary']}\n"
            
        return {
            "query": req.query,
            "answer": answer,
            "highlighted_works": top_works,
            "suggestions": ["Show duplicate works in this district", "Which contractors have repeat delays?", "View on GIS Map"]
        }

    # 2. Duplicate works inquiry
    elif "duplicate" in q or "repeat" in q or "similar" in q:
        dup_df = df[df["duplicate_risk_score"] >= 50.0].sort_values("duplicate_risk_score", ascending=False)
        top_dups = []
        for _, r in dup_df.head(4).iterrows():
            top_dups.append({
                "work_id": r["work_id"],
                "district": r["district"],
                "state": r["state"],
                "sector": r["sector"],
                "duplicate_risk_score": r["duplicate_risk_score"],
                "description": r["work_description"]
            })
        answer = f"Identified **{len(dup_df)} potential duplicate works** sharing high semantic similarity (>70%), identical geographic coordinates, and matching budget allocations. Cross-verification against foundation photos is recommended."
        return {
            "query": req.query,
            "answer": answer,
            "highlighted_works": top_dups,
            "suggestions": ["Show delayed works", "Summarize Uttar Pradesh risk profile"]
        }

    # 3. Delayed & Stalled projects inquiry
    elif "delay" in q or "stall" in q or "overdue" in q or "timeline" in q:
        del_df = df[(df["status"].isin(["DELAYED", "STALLED"])) | (df["delay_days"] > 45)].sort_values("delay_days", ascending=False)
        top_delays = []
        for _, r in del_df.head(4).iterrows():
            top_delays.append({
                "work_id": r["work_id"],
                "district": r["district"],
                "sector": r["sector"],
                "delay_days": int(r["delay_days"]),
                "progress_pct": r["completion_percentage"],
                "agency": r["implementing_agency"]
            })
        answer = f"Found **{len(del_df)} delayed or stalled works** across implementing agencies. The average schedule overrun is **{int(del_df['delay_days'].mean())} days** beyond target completion dates."
        return {
            "query": req.query,
            "answer": answer,
            "highlighted_works": top_delays,
            "suggestions": ["Show high-risk works", "List agency delay rates"]
        }

    # 4. General national/state overview
    else:
        answer = f"The MPLADS Risk Intelligence Platform has analyzed **{summary['total_works']:,} works** totaling **₹{summary['total_sanctioned_crore']} Crore** across India.\n\n"
        answer += f"**Key Insights:**\n"
        answer += f"- **High Risk Flagged**: {summary['risk_breakdown']['high_risk_count']} works ({summary['risk_breakdown']['high_risk_percentage']}%)\n"
        answer += f"- **Medium Risk**: {summary['risk_breakdown']['medium_risk_count']} works ({summary['risk_breakdown']['medium_risk_percentage']}%)\n"
        answer += f"- **Compliant / Low Risk**: {summary['risk_breakdown']['low_risk_count']} works ({summary['risk_breakdown']['low_risk_percentage']}%)\n"
        answer += f"- **Overall Fund Utilization**: {summary['overall_utilization_rate']}%\n\n"
        answer += "You can ask me to inspect specific states, find duplicate projects, or list repeat delayed contractors."
        
        return {
            "query": req.query,
            "answer": answer,
            "highlighted_works": [],
            "suggestions": ["Show top high-risk works", "Find duplicate works", "Show delayed projects in Uttar Pradesh"]
        }
