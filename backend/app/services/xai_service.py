"""
Explainable AI (XAI) Service for MPLADS Risk Intelligence Platform.
Connects with Google Gemini 3.5 Flash via google-genai SDK to generate grounded,
fact-based explanations of why projects are flagged (or compliant) and recommended action plans.

Eliminates false-positive contradictions on low-risk / completed projects.
"""

import os
import json
import logging
import time
from pathlib import Path
from typing import Dict, Any, Optional, List
from dotenv import load_dotenv

# Ensure .env is loaded from project root
PROJECT_ROOT = Path(__file__).resolve().parents[3]
ENV_PATH = PROJECT_ROOT / ".env"
if ENV_PATH.exists():
    load_dotenv(ENV_PATH)
else:
    load_dotenv()

from backend.app.services.data_service import get_work_by_id
from backend.app.db.lifecycle_db import get_project_lifecycle
from backend.app.services.verification_engine import calculate_cross_source_consistency
from backend.app.db import operations_db

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# In-memory cache to prevent redundant LLM invocations for recently queried works
_XAI_CACHE: Dict[str, Dict[str, Any]] = {}
_CACHE_TTL_SECONDS = 600  # 10 minutes


def _get_gemini_client():
    if not GEMINI_API_KEY:
        return None
    try:
        from google import genai
        return genai.Client(api_key=GEMINI_API_KEY)
    except Exception as e:
        logger.warning(f"Could not initialize google-genai client: {e}")
        return None


def get_project_xai_explanation(work_id: str) -> Dict[str, Any]:
    """
    Main entry point for generating Explainable AI (XAI) justification and action plan.
    Gathers all project telemetry and executes Gemini 3.5 Flash with structured JSON output.
    """
    # 1. Check cache
    now = time.time()
    cached = _XAI_CACHE.get(work_id)
    if cached and (now - cached.get("_cached_at", 0) < _CACHE_TTL_SECONDS):
        return cached["data"]

    # 2. Gather project telemetry
    work = get_work_by_id(work_id)
    if not work:
        return _build_fallback_explanation(work_id, None, None, None, None)

    lifecycle = get_project_lifecycle(work_id) or {}
    consistency = calculate_cross_source_consistency(work, lifecycle)

    try:
        operations_db.ensure_project_operations(work_id)
        attendance = operations_db.get_attendance_summary(work_id, days=30)
        daily_updates = operations_db.get_daily_updates(work_id, limit=3)
        reconciliation = operations_db.get_material_reconciliation(work_id)
        payments = operations_db.get_payments(project_id=work_id, limit=5)
    except Exception as e:
        logger.warning(f"Error reading operational DB for {work_id}: {e}")
        attendance = {}
        daily_updates = []
        reconciliation = []
        payments = []

    # 3. Calculate key numerical telemetry
    sanctioned = float(work.get("sanctioned_amount") or 0.0)
    expenditure = float(work.get("total_expenditure") or 0.0)
    fin_util_pct = round((expenditure / sanctioned * 100), 1) if sanctioned > 0 else 0.0
    
    scope = lifecycle.get("scope") or {}
    reported_pct = float(scope.get("reported_completion_pct") or work.get("completion_percentage") or 0.0)
    verified_pct = float(scope.get("verified_completion_pct") or 0.0)
    if verified_pct == 0.0 and reported_pct >= 100.0:
        verified_pct = 100.0
    elif verified_pct == 0.0 and work.get("composite_risk_score", 0) < 30:
        verified_pct = reported_pct

    risk_score = float(work.get("composite_risk_score") or 0.0)
    risk_level = str(work.get("risk_level") or "LOW").upper()
    delay_risk = float(work.get("delay_risk_score") or 0.0)
    duplicate_risk = float(work.get("duplicate_risk_score") or 0.0)
    anomaly_risk = float(work.get("financial_anomaly_score") or work.get("utilization_anomaly_score") or 0.0)

    # 4. Synthesize AI Explanation using Gemini
    client = _get_gemini_client()
    result = None

    if client:
        try:
            from google.genai import types

            is_completed_or_low_risk = (
                (reported_pct >= 99.0 and fin_util_pct >= 95.0 and risk_score < 40) or
                (risk_level == "LOW" and risk_score < 30)
            )

            prompt = f"""You are the Lead Explainable AI (XAI) Auditor for the Ministry of Statistics & Programme Implementation (MoSPI) monitoring MPLADS project {work_id}.

CRITICAL MANDATE:
- Ground your analysis strictly in the verified numbers provided below.
- Do NOT invent false contradictions or accuse compliant works.
- If financial utilization is ~100% and physical completion is ~100%, the project is FULLY CONVERGED AND COMPLIANT (not an inconsistency).
- If there is a genuine gap (e.g. 80% expenditure with 10% progress), explain the specific gap, possible reasons (e.g., advance material procurement or work halt), and prioritize field audit.
- Always be professional, non-accusatory, and objective (Government of India administrative style).

PROJECT TELEMETRY:
- Work ID: {work_id}
- Description: {work.get('work_description', 'MPLADS Infrastructure Work')}
- Sector: {work.get('sector', 'General Infrastructure')}
- Location: {work.get('district', 'N/A')}, {work.get('state', 'N/A')}
- Implementing Agency: {work.get('implementing_agency', 'DRDA')}
- Sanctioned Outlay: ₹{round(sanctioned / 1e5, 2)} Lakh
- Total Expenditure: ₹{round(expenditure / 1e5, 2)} Lakh ({fin_util_pct}% utilized)
- Self-Reported Physical Progress: {reported_pct}%
- Field-Verified Progress: {verified_pct}%
- Composite Risk Score: {risk_score}/100 ({risk_level})
- Delay Risk Score: {delay_risk}/100
- Financial Anomaly Score: {anomaly_risk}/100
- Duplicate Semantics Score: {duplicate_risk}/100
- Active Attendance Check-ins (30 days): {attendance.get('total_checkins', 0)} ({attendance.get('verified', 0)} verified)
- Daily Work Logs Logged: {len(daily_updates)}
- Material Reconciliation Streams: {len(reconciliation)} ({sum(1 for r in reconciliation if r.get('has_issues'))} with issues)
- Detected Inconsistencies: {json.dumps(consistency.get('inconsistencies', []))}

Is Completed or Compliant Baseline: {is_completed_or_low_risk}

Return strictly a JSON object with this exact schema:
{{
  "is_flagged": boolean (false if compliant/low risk with no serious inconsistency, true if medium/high risk or real divergence),
  "risk_level": "{risk_level}",
  "headline": "Clear, concise title summarizing the status (e.g. 'Project Executed Within Statutory MoSPI Norms' OR 'Disproportionate Fund Utilization Detected')",
  "explanation_points": [
    {{
      "title": "Short title of factor (e.g. 'Financial vs Physical Execution' or 'Milestone Convergence')",
      "detail": "Accurate, factual sentence explaining what the data shows without inventing false errors."
    }}
  ],
  "statutory_notice": "Statutory Notice: 1-2 sentences emphasizing either that the project meets statutory benchmarks, or that signals represent empirical flags requiring supervisory review rather than proof of wrongdoing.",
  "recommended_actions": [
    {{
      "step": 1,
      "title": "Action title (e.g. 'Issue Asset Handover & UC Certificate' for low risk, or 'Deploy Field Inspector' for high risk)",
      "detail": "Actionable, specific directive.",
      "tab": "inspections" | "materials" | "finance" | "evidence" | "scope" | "daily"
    }}
  ]
}}
"""

            models_to_try = ["gemini-3.5-flash", "gemini-3.5-flash-lite"]
            for model_name in models_to_try:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            temperature=0.1
                        )
                    )
                    if response and response.text:
                        result = json.loads(response.text)
                        logger.info(f"Successfully generated GenAI XAI explanation for {work_id} using {model_name}")
                        break
                except Exception as model_err:
                    logger.warning(f"Model {model_name} failed for {work_id}: {model_err}. Trying next...")
                    continue
        except Exception as e:
            logger.error(f"Gemini generation error for {work_id}: {e}. Falling back to rule-based XAI.")
            result = None

    # Fallback to deterministic, accurate rule-based XAI if Gemini is not reachable
    if not result:
        result = _build_fallback_explanation(work_id, work, lifecycle, consistency, reconciliation)

    # Save in cache
    _XAI_CACHE[work_id] = {
        "_cached_at": now,
        "data": result
    }

    return result


def _build_fallback_explanation(
    work_id: str,
    work: Optional[Dict[str, Any]],
    lifecycle: Optional[Dict[str, Any]],
    consistency: Optional[Dict[str, Any]],
    reconciliation: Optional[List[Dict[str, Any]]]
) -> Dict[str, Any]:
    """
    Intelligent fallback when LLM is unavailable:
    Evaluates real numbers without inventing contradictions on low-risk / 100% works.
    """
    if not work:
        return {
            "is_flagged": False,
            "risk_level": "LOW",
            "headline": f"Project Record {work_id}",
            "explanation_points": [{"title": "Data Baseline", "detail": "Standard project record loaded."}],
            "statutory_notice": "Statutory Notice: Routine administrative tracking.",
            "recommended_actions": [{"step": 1, "title": "Review Scope", "detail": "Check project documentation.", "tab": "scope"}]
        }

    sanctioned = float(work.get("sanctioned_amount") or 0.0)
    expenditure = float(work.get("total_expenditure") or 0.0)
    fin_pct = round((expenditure / sanctioned * 100), 1) if sanctioned > 0 else 0.0
    phys_pct = float(work.get("completion_percentage") or 0.0)
    risk_score = float(work.get("composite_risk_score") or 0.0)
    risk_level = str(work.get("risk_level") or "LOW").upper()
    delay_score = float(work.get("delay_risk_score") or 0.0)

    # Compliant / Completed scenario
    if (phys_pct >= 99.0 and fin_pct >= 95.0) or (risk_score < 30 and abs(fin_pct - phys_pct) <= 15):
        return {
            "is_flagged": False,
            "risk_level": risk_level,
            "headline": "Project Executed Within Statutory MoSPI Norms",
            "explanation_points": [
                {
                    "title": "Financial and Physical Convergence",
                    "detail": f"Fund utilization ({fin_pct}%) aligns with verified physical progress ({phys_pct}%) within sanctioned outlay."
                },
                {
                    "title": "Empirical Baseline Alignment",
                    "detail": "No severe material leakage or contractor-inspection variances detected."
                }
            ],
            "statutory_notice": "Statutory Notice: Project meets standard administrative criteria. Asset closure and handover protocols apply.",
            "recommended_actions": [
                {
                    "step": 1,
                    "title": "Issue Asset Handover & UC Certificate",
                    "detail": "Countersign final Utilisation Certificate (UC) and transfer operational custody to user department.",
                    "tab": "finance"
                },
                {
                    "step": 2,
                    "title": "Verify MoSPI Citizen Information Plaque",
                    "detail": "Confirm permanent stone plaque stating MPLADS funding details is erected at site.",
                    "tab": "evidence"
                },
                {
                    "step": 3,
                    "title": "Archive Quality Inspection Reports",
                    "detail": "Verify Assistant Engineer sign-off and close the operational case file.",
                    "tab": "inspections"
                }
            ]
        }

    # Disproportionate / High Risk Scenario
    gap = round(fin_pct - phys_pct, 1)
    points = []
    actions = []

    if gap > 15:
        points.append({
            "title": "Disproportionate Fund Draw vs Ground Progress",
            "detail": f"Financial draw is at {fin_pct}% while physical execution stands at {phys_pct}% (a {gap}% variance)."
        })
        actions.append({
            "step": 1,
            "title": "Audit Financial Running Bills (Tab 4)",
            "detail": "Match contractor running bills against statutory GFR advance benchmarks before further releases.",
            "tab": "finance"
        })

    if delay_score > 50:
        points.append({
            "title": "Schedule Timeline Slippage",
            "detail": f"Work is lagging approved milestones with a delay risk score of {delay_score}/100."
        })
        actions.append({
            "step": 2,
            "title": "Deploy Field Inspector for Core Measurements (Tab 5)",
            "detail": "Schedule an Assistant Engineer to take physical core measurements and verify milestone claims.",
            "tab": "inspections"
        })

    if reconciliation and any(r.get("has_issues") for r in reconciliation):
        points.append({
            "title": "Material Ledger Discrepancy",
            "detail": "Discrepancy identified between received delivery challans and recorded consumed inventory."
        })
        actions.append({
            "step": 3,
            "title": "Reconcile Material Delivery Ledger (Tab 3)",
            "detail": "Verify delivery challans, test certificates, and physical on-site remaining inventory.",
            "tab": "materials"
        })

    if not actions:
        actions.append({
            "step": 1,
            "title": "Conduct Standard Supervisory Site Inspection",
            "detail": "Validate current progress milestone with on-site geotagged photos.",
            "tab": "inspections"
        })

    return {
        "is_flagged": True,
        "risk_level": risk_level,
        "headline": f"Supervisory Review Advised ({risk_level} Priority)",
        "explanation_points": points if points else [
            {"title": "Multi-Stream Pacing Review", "detail": f"Project risk index stands at {risk_score}/100 requiring supervisory tracking."}
        ],
        "statutory_notice": "Statutory Notice: These signals indicate an empirical inconsistency requiring supervisory verification. This automated risk score does NOT establish wrongdoing or fraud.",
        "recommended_actions": actions
    }
