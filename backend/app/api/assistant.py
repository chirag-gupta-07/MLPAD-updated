import os
import json
import logging
import urllib.request
from dotenv import load_dotenv
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from backend.app.services.data_service import get_dataframe, get_risk_summary
from backend.app.db.lifecycle_db import get_project_lifecycle
from backend.app.services.verification_engine import calculate_cross_source_consistency

load_dotenv()
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/assistant", tags=["AI Insights Assistant"])

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


class QueryRequest(BaseModel):
    query: str
    work_id: Optional[str] = None


def query_gemini_llm(prompt: str) -> Optional[str]:
    """Queries Google Gemini 3.6 Flash model using the user's GEMINI_API_KEY."""
    if not GEMINI_API_KEY:
        return None
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={GEMINI_API_KEY}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 800
            }
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            res = json.loads(response.read().decode("utf-8"))
            return res["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e:
        logger.warning(f"Gemini API call failed, falling back to heuristic engine: {e}")
        return None


@router.post("/query")
def answer_assistant_query(req: QueryRequest) -> Dict[str, Any]:
    q = req.query.strip()
    q_lower = q.lower()
    df = get_dataframe()
    summary = get_risk_summary()

    # If work_id context is provided, answer specific project lifecycle questions
    if req.work_id:
        match = df[df["work_id"] == req.work_id]
        if len(match) > 0:
            work_row = match.iloc[0].to_dict()
            lifecycle = get_project_lifecycle(req.work_id)
            consistency = calculate_cross_source_consistency(work_row, lifecycle)

            # Build rich prompt for Gemini
            llm_prompt = f"""
You are the Official AI Auditor and Decision-Support Assistant for the Ministry of Statistics & Programme Implementation (MoSPI) monitoring MPLADS project {req.work_id}.
Always be professional, objective, and precise. Never accuse individuals of fraud; frame issues as 'inconsistencies requiring supervisory verification'.

PROJECT CONTEXT:
- Work ID: {work_row.get('work_id')}
- Description: {work_row.get('work_description')}
- Sector: {work_row.get('sector')} ({work_row.get('district')}, {work_row.get('state')})
- Sanctioned: ₹{round((work_row.get('sanctioned_amount') or 0)/1e5, 2)} Lakh | Expended: ₹{round((work_row.get('total_expenditure') or 0)/1e5, 2)} Lakh
- Financial Utilization: {consistency.get('financial_utilization_pct')}%
- Planned vs Reported vs Verified Progress:
  * Approved Scope: {lifecycle.get('scope', {}).get('approved_scope', 'N/A')}
  * Reported by Contractor: {consistency.get('reported_completion_pct')}%
  * Verified by Inspection: {consistency.get('verified_completion_pct')}%
- Material Consumption Rate: {consistency.get('material_consumption_pct')}%
- Composite Risk Score: {work_row.get('composite_risk_score')}/100 ({work_row.get('risk_level')})
- Evidence Confidence Score: {consistency.get('evidence_confidence_score')}/100
- Detected Inconsistencies: {json.dumps(consistency.get('inconsistencies', []))}
- Targeted Verification Checklist: {json.dumps(consistency.get('verification_checklist', []))}

USER QUESTION:
"{q}"

Provide a concise, auditable executive response structured with facts, quantitative metrics, and recommended verification steps.
"""
            llm_answer = query_gemini_llm(llm_prompt)
            if llm_answer:
                return {
                    "query": req.query,
                    "answer": llm_answer,
                    "highlighted_works": [],
                    "suggestions": [
                        "What should the field officer verify?",
                        "Check material reconciliation",
                        "Show financial vs physical gap"
                    ]
                }

    # If general LLM query
    general_prompt = f"""
You are the AI Risk Assistant for India's MPLADS monitoring platform.
Platform Summary:
- Total Analyzed Works: {summary['total_works']:,}
- Total Budget: ₹{summary['total_sanctioned_crore']} Cr | Expenditure: ₹{summary['total_expenditure_crore']} Cr
- High Risk Works: {summary['risk_breakdown']['high_risk_count']} ({summary['risk_breakdown']['high_risk_percentage']}%)
- Overall Fund Utilization: {summary['overall_utilization_rate']}%

USER QUESTION:
"{q}"

Answer concisely and factually based on official government monitoring standards.
"""
    llm_general = query_gemini_llm(general_prompt)
    if llm_general and not any(k in q_lower for k in ["high risk", "duplicate", "delayed"]):
        return {
            "query": req.query,
            "answer": llm_general,
            "highlighted_works": [],
            "suggestions": ["Show top high-risk works", "Find duplicate works", "Show delayed projects in Uttar Pradesh"]
        }

    # 1. High risk works inquiry fallback
    if "high risk" in q_lower or "highest risk" in q_lower or "top risk" in q_lower or "anomal" in q_lower:
        high_df = df[df["risk_level"] == "HIGH"].sort_values("composite_risk_score", ascending=False)
        matched_state = next((s for s in df["state"].unique() if s.lower() in q_lower), None)
        matched_district = next((d for d in df["district"].unique() if d.lower() in q_lower), None)

        if matched_state:
            high_df = high_df[high_df["state"].str.lower() == matched_state.lower()]
        if matched_district:
            high_df = high_df[high_df["district"].str.lower() == matched_district.lower()]

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
                "summary": r.get("work_description", "")
            })

        location_str = f" in {matched_district or matched_state}" if (matched_district or matched_state) else " nationwide"
        answer = f"Found **{len(high_df)} high-risk works**{location_str} requiring supervisory audit. Top flagged projects with verified evidence:\n\n"
        for w in top_works:
            answer += f"- **{w['work_id']}** ({w['sector']} | {w['district']}, {w['state']}): Sanctioned ₹{w['cost_lakh']}L, Expended ₹{w['expenditure_lakh']}L. **Risk Score: {w['risk_score']}/100**.\n"

        return {
            "query": req.query,
            "answer": answer,
            "highlighted_works": top_works,
            "suggestions": ["Show duplicate works in this district", "Which contractors have repeat delays?", "View on GIS Map"]
        }

    # 2. Duplicate works inquiry fallback
    elif "duplicate" in q_lower or "repeat" in q_lower or "similar" in q_lower:
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

    # 3. Delayed projects inquiry fallback
    elif "delay" in q_lower or "stall" in q_lower or "overdue" in q_lower:
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

    # 4. General overview fallback
    else:
        answer = f"The MPLADS Risk Intelligence Platform has analyzed **{summary['total_works']:,} works** totaling **₹{summary['total_sanctioned_crore']} Crore** across India.\n\n"
        answer += f"**Key Insights:**\n"
        answer += f"- **High Risk Flagged**: {summary['risk_breakdown']['high_risk_count']} works ({summary['risk_breakdown']['high_risk_percentage']}%)\n"
        answer += f"- **Medium Risk**: {summary['risk_breakdown']['medium_risk_count']} works ({summary['risk_breakdown']['medium_risk_percentage']}%)\n"
        answer += f"- **Compliant / Low Risk**: {summary['risk_breakdown']['low_risk_count']} works ({summary['risk_breakdown']['low_risk_percentage']}%)\n"
        answer += f"- **Overall Fund Utilization**: {summary['overall_utilization_rate']}%\n\n"
        answer += "Ask me to inspect specific projects, evaluate material reconciliation, or generate targeted verification checklists."
        return {
            "query": req.query,
            "answer": answer,
            "highlighted_works": [],
            "suggestions": ["Show top high-risk works", "Find duplicate works", "Show delayed projects in Uttar Pradesh"]
        }

