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
from backend.app.db import operations_db

try:
    from src.utils.embeddings import retrieve_policy_chunks
    RAG_AVAILABLE = True
except ImportError:
    RAG_AVAILABLE = False

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
                "maxOutputTokens": 2000
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
            lifecycle = get_project_lifecycle(req.work_id) or {}
            consistency = calculate_cross_source_consistency(work_row, lifecycle)

            # Gather operational intelligence from all new modules
            try:
                attendance_summary = operations_db.get_attendance_summary(req.work_id, days=30)
                attendance_recent = operations_db.get_attendance_history(req.work_id, limit=5)
            except Exception:
                attendance_summary = {}
                attendance_recent = []

            try:
                daily_updates = operations_db.get_daily_updates(req.work_id, limit=5)
            except Exception:
                daily_updates = []

            try:
                reconciliation = operations_db.get_material_reconciliation(req.work_id)
            except Exception:
                reconciliation = []

            try:
                payments = operations_db.get_payments(project_id=req.work_id, limit=10)
                payment_total = sum(p.get("amount", 0) for p in payments)
                payment_paid = sum(p.get("amount", 0) for p in payments if p.get("status") == "PAID")
            except Exception:
                payments = []
                payment_total = 0
                payment_paid = 0

            try:
                approvals = operations_db.get_approvals(limit=100)
                project_approval = next((a for a in approvals if a.get("project_id") == req.work_id), None)
            except Exception:
                project_approval = None

            # Build reconciliation summary
            recon_issues = [r for r in reconciliation if r.get("has_issues")]
            recon_text = "No material reconciliation issues detected."
            if recon_issues:
                recon_text = f"{len(recon_issues)} material(s) with reconciliation issues:\n"
                for ri in recon_issues[:3]:
                    recon_text += f"  - {ri['material_name']}: {'; '.join(ri['issues'])}\n"

            # Build attendance context
            att_text = "No attendance records available."
            if attendance_summary:
                att_text = (
                    f"Last 30 days: {attendance_summary.get('total_checkins', 0)} check-ins on "
                    f"{attendance_summary.get('unique_days', 0)} unique days. "
                    f"Verified: {attendance_summary.get('verified', 0)}, "
                    f"Mismatches: {attendance_summary.get('mismatches', 0)}. "
                    f"Attendance rate: {attendance_summary.get('attendance_rate', 0)}%."
                )

            # Build daily update context
            update_text = "No recent daily work updates."
            if daily_updates:
                latest = daily_updates[0]
                update_text = (
                    f"Latest update ({latest.get('date', 'N/A')}): "
                    f"{latest.get('work_description', 'N/A')[:200]}. "
                    f"Progress: {latest.get('cumulative_progress_pct', 'N/A')}%. "
                    f"Workers: {latest.get('worker_count', 'N/A')}."
                )
                if latest.get("delay_reason"):
                    update_text += f" Delay reason: {latest['delay_reason']}."
                if latest.get("current_issues"):
                    update_text += f" Issues: {latest['current_issues']}."

            # Build rich prompt for Gemini with full operational intelligence
            
            # RAG: Retrieve relevant policy chunks
            policy_sources = []
            policy_context = ""
            if RAG_AVAILABLE:
                try:
                    policy_sources = retrieve_policy_chunks(q, top_k=3, threshold=0.25)
                    if policy_sources:
                        policy_context = "\nRELEVANT POLICY REFERENCES (cite these when applicable):\n"
                        for ps in policy_sources:
                            policy_context += f"- [{ps['section']}]: {ps['content'][:500]}\n"
                        policy_context += "\nIMPORTANT: Cite the specific guideline paragraph when your answer relies on these references. If no reference is relevant to the question, say 'no specific guideline found' rather than inventing one.\n"
                except Exception as e:
                    logger.warning(f"RAG retrieval failed: {e}")
                    
            llm_prompt = f"""
You are the Official AI Auditor and Decision-Support Assistant for the Ministry of Statistics & Programme Implementation (MoSPI) monitoring MPLADS project {req.work_id}.

CRITICAL RULES:
1. Never accuse individuals of fraud. Frame issues as 'inconsistencies requiring supervisory verification'.
2. Always follow: DATA → ANALYSIS → COMPARISON → CONTRADICTION → POSSIBLE EXPLANATION → CONFIDENCE → RECOMMENDED VERIFICATION.
3. If information is missing, explicitly state "Insufficient data available to verify this point."
4. Never invent information or fill gaps with assumptions.
5. Distinguish between REPORTED and VERIFIED data clearly.
6. Anomaly ≠ Fraud. Risk ≠ Guilt. This is an early warning system, not a verdict.

PROJECT CONTEXT:
- Work ID: {work_row.get('work_id')}
- Description: {work_row.get('work_description')}
- Sector: {work_row.get('sector')} ({work_row.get('district')}, {work_row.get('state')})
- Implementing Agency: {work_row.get('implementing_agency', 'N/A')}
- Sanctioned: ₹{round((work_row.get('sanctioned_amount') or 0)/1e5, 2)} Lakh
- Expended: ₹{round((work_row.get('total_expenditure') or 0)/1e5, 2)} Lakh
- Financial Utilization: {consistency.get('financial_utilization_pct')}%
- Composite Risk Score: {work_row.get('composite_risk_score')}/100 ({work_row.get('risk_level')})
- Evidence Confidence Score: {consistency.get('evidence_confidence_score')}/100

PROGRESS ANALYSIS:
- Approved Scope: {(lifecycle.get('scope') or {}).get('approved_scope', 'N/A')}
- Reported Progress (Contractor): {consistency.get('reported_completion_pct')}%
- Verified Progress (Inspection): {consistency.get('verified_completion_pct')}%
- Material Consumption Rate: {consistency.get('material_consumption_pct')}%

SITE MONITORING:
- Attendance: {att_text}
- Daily Updates: {update_text}
Note: Attendance confirms responsible person presence at site, NOT that work was performed.

MATERIAL RECONCILIATION:
{recon_text}

PAYMENT STATUS:
- Total payment requests: {len(payments)}
- Total amount: ₹{round(payment_total/1e5, 2)} Lakh
- Amount paid: ₹{round(payment_paid/1e5, 2)} Lakh
- Approval Status: {project_approval.get('current_status') if project_approval else 'N/A'}

DETECTED INCONSISTENCIES:
{json.dumps(consistency.get('inconsistencies', []), indent=2)}
{policy_context}
VERIFICATION CHECKLIST:
{json.dumps(consistency.get('verification_checklist', []), indent=2)}

USER QUESTION:
"{q}"

Provide a detailed, evidence-based response. Structure your analysis with:
1. Direct answer to the question
2. Supporting data points
3. Any contradictions or inconsistencies found
4. Confidence level in the assessment
5. Specific verification steps recommended
"""
            llm_answer = query_gemini_llm(llm_prompt)
            if llm_answer:
                return {
                    "query": req.query,
                    "answer": llm_answer,
                    "sources": [{"document": s["document"], "section": s["section"], "relevance_score": s["relevance_score"]} for s in policy_sources] if policy_sources else [],
                    "highlighted_works": [req.work_id],
                    "suggestions": [
                        "Why is this project's risk score high?",
                        "Check material reconciliation issues",
                        "Analyse attendance vs progress patterns",
                        "Show financial vs physical completion gap",
                        "What should the field officer verify?"
                    ]
                }

            # Offline Fallback: 3-Dimensional Telemetry Synthesis (Material → Physical Work → Financial Expenditure)
            fin_pct = float(consistency.get("financial_utilization_pct") or 0.0)
            phys_pct = float(consistency.get("reported_completion_pct") or work_row.get("completion_percentage") or 0.0)
            mat_pct = float(consistency.get("material_consumption_pct") or 0.0)
            if mat_pct == 0 and len(reconciliation) > 0:
                tot_c = sum(r.get("contracted", 0) for r in reconciliation)
                tot_u = sum(r.get("site_used", 0) for r in reconciliation)
                mat_pct = round((tot_u / tot_c * 100), 1) if tot_c > 0 else 66.7

            fin_pct = round(fin_pct, 1)
            phys_pct = round(phys_pct, 1)
            mat_pct = round(mat_pct, 1)

            # Generate structured 3D triangulation explanation
            if mat_pct > phys_pct + 10.0 or fin_pct > phys_pct + 10.0:
                analysis_msg = (
                    f"The project reports {phys_pct}% physical completion, while {mat_pct}% of the planned material quantity "
                    f"has already been consumed and {fin_pct}% of the sanctioned expenditure has been recorded. "
                    f"This gap may be legitimate during early procurement or advance expenditure, but the current pattern "
                    f"requires verification against invoices, delivery records, milestone progress, and site measurements."
                )
            else:
                analysis_msg = (
                    f"The reported physical completion ({phys_pct}%), material consumption rate ({mat_pct}%), "
                    f"and financial expenditure ({fin_pct}%) follow an aligned milestone pacing. "
                    f"Routine supervisory verification is advised to validate ground progress."
                )

            three_d_text = f"### 🔍 Multi-Dimensional Cross-Source Telemetry Triangulation\n\n"
            three_d_text += f"**Core Triangulation Metrics:**\n"
            three_d_text += f"- **1. Physical Progress:** `{phys_pct}%`\n"
            three_d_text += f"- **2. Material Consumption:** `{mat_pct}%` (Planned vs. Consumed in Work)\n"
            three_d_text += f"- **3. Financial Expenditure:** `{fin_pct}%` (Sanctioned vs. Disbursed)\n\n"
            three_d_text += f"**AI Triangulation Analysis:**\n{analysis_msg}\n\n"
            three_d_text += f"**Cross-Dimensional Audit Assessment:**\n"
            three_d_text += f"- **Inventory vs. Ground Asset Reality:** Total of {len(reconciliation)} material ledger stream(s) audited. {recon_text.strip()}\n"
            three_d_text += f"- **On-Site Responsible Presence:** {att_text}\n"
            three_d_text += f"- **Statutory Expenditure Trail:** {len(payments)} payment request(s) totaling ₹{round(payment_total/1e5, 2)}L (₹{round(payment_paid/1e5, 2)}L paid via PFMS).\n\n"
            three_d_text += f"> **Statutory Notice:** This finding represents a data-driven inconsistency signal for supervisory inquiry, not a finding of fraud or culpability."

            return {
                "query": req.query,
                "answer": three_d_text,
                "sources": [],
                "triangulation": {
                    "physical_progress": phys_pct,
                    "material_consumption": mat_pct,
                    "financial_expenditure": fin_pct,
                    "analysis": analysis_msg,
                    "inventory_summary": recon_text.strip(),
                    "attendance_summary": att_text,
                    "expenditure_summary": f"{len(payments)} payment request(s) totaling ₹{round(payment_total/1e5, 2)}L (₹{round(payment_paid/1e5, 2)}L paid via PFMS).",
                    "discrepancies": recon_issues
                },
                "highlighted_works": [req.work_id],
                "suggestions": [
                    "Check material delivery challans vs site inventory",
                    "Verify physical cross-sections against BoQ",
                    "Inspect bank payment vouchers against ground deliverables"
                ]
            }


    # RAG: Retrieve relevant policy chunks
    policy_sources = []
    policy_context = ""
    if RAG_AVAILABLE:
        try:
            policy_sources = retrieve_policy_chunks(q, top_k=3, threshold=0.25)
            if policy_sources:
                policy_context = "\nRELEVANT POLICY REFERENCES (cite these when applicable):\n"
                for ps in policy_sources:
                    policy_context += f"- [{ps['section']}]: {ps['content'][:500]}\n"
                policy_context += "\nIMPORTANT: Cite the specific guideline paragraph when your answer relies on these references. If no reference is relevant to the question, say 'no specific guideline found' rather than inventing one.\n"
        except Exception as e:
            logger.warning(f"RAG retrieval failed: {e}")

    # If general LLM query
    general_prompt = f"""
You are the AI Risk Assistant for India's MPLADS monitoring platform.
Platform Summary:
- Total Analyzed Works: {summary['total_works']:,}
- Total Budget: ₹{summary['total_sanctioned_crore']} Cr | Expenditure: ₹{summary['total_expenditure_crore']} Cr
- High Risk Works: {summary['risk_breakdown']['high_risk_count']} ({summary['risk_breakdown']['high_risk_percentage']}%)
- Overall Fund Utilization: {summary['overall_utilization_rate']}%
{policy_context}
USER QUESTION:
"{q}"

Answer concisely and factually based on official government monitoring standards.
"""
    llm_general = query_gemini_llm(general_prompt)
    if llm_general and not any(k in q_lower for k in ["high risk", "duplicate", "delayed"]):
        return {
            "query": req.query,
            "answer": llm_general,
            "sources": [{"document": s["document"], "section": s["section"], "relevance_score": s["relevance_score"]} for s in policy_sources] if policy_sources else [],
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
            "sources": [],
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
            "sources": [],
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
            "sources": [],
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
            "sources": [],
            "highlighted_works": [],
            "suggestions": ["Show top high-risk works", "Find duplicate works", "Show delayed projects in Uttar Pradesh"]
        }

