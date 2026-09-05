"""
Cross-Source Consistency Engine & Targeted Field Verification Checklist Generator.
Per SIH26102 specifications:
- Triangulates: Finance vs Materials vs Physical Progress vs Complaints vs Inspections
- Generates targeted, context-dependent field inspection checklists
- Evaluates Evidence Confidence (0-100) independently from Risk Score
- Never accuses; frames all outputs as "Requires Supervisory Verification"
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


def calculate_cross_source_consistency(work: Dict[str, Any], lifecycle: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluates consistency across independent data streams:
    1. Financial Utilization Rate (%)
    2. Material Delivery & Consumption Rate (%)
    3. Physical Progress (Planned vs Reported vs Verified) (%)
    4. Citizen Complaint Signals
    5. Inspection Findings
    """
    sanctioned = float(work.get("sanctioned_amount") or 0.0)
    expenditure = float(work.get("total_expenditure") or 0.0)
    fin_util_pct = round((expenditure / sanctioned * 100), 1) if sanctioned > 0 else 0.0

    scope = lifecycle.get("scope") or {}
    reported_pct = float(scope.get("reported_completion_pct") or work.get("completion_percentage") or 0.0)
    verified_pct = float(scope.get("verified_completion_pct") or 0.0)

    materials = lifecycle.get("materials") or []
    complaints = lifecycle.get("complaints") or []
    inspections = lifecycle.get("inspections") or []
    daily_updates = lifecycle.get("daily_updates") or []

    # Material Consumption %
    total_mat_planned = sum(float(m.get("planned_quantity") or 0) for m in materials)
    total_mat_used = sum(float(m.get("used_quantity") or 0) for m in materials)
    mat_consumption_pct = round((total_mat_used / total_mat_planned * 100), 1) if total_mat_planned > 0 else 0.0

    inconsistencies = []
    verification_checklist = []

    # 1. Financial vs Physical Progress Mismatch
    # E.g. Finance >= 85% and progress < 80% (or fin - progress >= 15%)
    fin_progress_gap = round(fin_util_pct - reported_pct, 1)
    if (fin_util_pct >= 70.0 and reported_pct < 40.0) or (fin_progress_gap >= 15.0 and fin_util_pct >= 60.0):
        inconsistencies.append({
            "type": "FINANCIAL_PHYSICAL_MISMATCH",
            "severity": "HIGH",
            "description": f"Financial disbursement ({fin_util_pct}%) is {fin_progress_gap}% ahead of recorded physical progress ({reported_pct}%).",
            "rationale": "High capital disbursement ahead of physical milestones requires expenditure verification."
        })
        verification_checklist.append({
            "id": "chk_fin_mismatch",
            "item": "Verify bank payment vouchers and contractor mobilization ledger against physical ground deliverables.",
            "category": "Financial"
        })

    # 2. Material Consumption vs Physical Progress Mismatch
    mat_progress_gap = round(mat_consumption_pct - reported_pct, 1)
    if (mat_consumption_pct >= 70.0 and reported_pct < 40.0) or (mat_progress_gap >= 15.0 and mat_consumption_pct >= 60.0):
        inconsistencies.append({
            "type": "MATERIAL_PROGRESS_MISMATCH",
            "severity": "HIGH",
            "description": f"Recorded material consumption ({mat_consumption_pct}%) is {mat_progress_gap}% higher than physical progress ({reported_pct}%).",
            "rationale": "High material consumption without corresponding physical asset creation indicates inventory leakage risk."
        })
        verification_checklist.append({
            "id": "chk_mat_recon",
            "item": "Audit physical inventory on site: count remaining bags/reinforcement and match with supplier delivery challans.",
            "category": "Materials"
        })

    # 3. Reported vs Verified Progress Gap
    rep_ver_gap = round(reported_pct - verified_pct, 1)
    if verified_pct > 0 and rep_ver_gap >= 10.0:
        inconsistencies.append({
            "type": "REPORTED_VS_VERIFIED_GAP",
            "severity": "HIGH",
            "description": f"Contractor reported completion ({reported_pct}%) exceeds official field-verified completion ({verified_pct}%) by {rep_ver_gap}%.",
            "rationale": "Discrepancy between self-reported contractor claims and independent supervisory measurements."
        })
        verification_checklist.append({
            "id": "chk_physical_dim",
            "item": "Conduct joint cross-measurement of approved physical dimensions (length, breadth, thickness).",
            "category": "Physical"
        })

    # 4. Material Reconciliation Rules Check
    for m in materials:
        used = float(m.get("used_quantity") or 0)
        recd = float(m.get("received_quantity") or 0)
        plnd = float(m.get("planned_quantity") or 0)
        name = m.get("material_name")

        if used > recd and recd > 0:
            inconsistencies.append({
                "type": "USED_EXCEEDS_RECEIVED",
                "severity": "MEDIUM",
                "description": f"Material '{name}' used quantity ({used}) exceeds officially received quantity ({recd}).",
                "rationale": "Data reconciliation issue: unrecorded receipts or consumption logging error."
            })
            verification_checklist.append({
                "id": f"chk_mat_recd_{name}",
                "item": f"Reconcile store receipt vouchers (SRV) for '{name}' with gate registers.",
                "category": "Materials"
            })
        if recd > (plnd * 1.3) and plnd > 0:
            inconsistencies.append({
                "type": "PROCUREMENT_EXCEEDS_PLAN",
                "severity": "LOW",
                "description": f"Procured quantity of '{name}' ({recd}) exceeds sanctioned plan ({plnd}) by >30%.",
                "rationale": "Potential scope variation or unapproved excess procurement."
            })

    # 5. Citizen Complaint Signals
    active_complaints = [c for c in complaints if c.get("status") not in ["RESOLVED", "REJECTED"]]
    if len(active_complaints) >= 2:
        inconsistencies.append({
            "type": "REPEATED_CITIZEN_COMPLAINTS",
            "severity": "HIGH",
            "description": f"{len(active_complaints)} unresolved citizen reports filed flagging ground irregularities.",
            "rationale": "Corroborated public concern warrants prioritized supervisory site inspection."
        })
        verification_checklist.append({
            "id": "chk_complaints_field",
            "item": "Investigate citizen allegations in presence of local community representatives and record geo-tagged video.",
            "category": "Social Audit"
        })

    # Sector-specific targeted checklist items
    sector = (work.get("sector") or "").lower()
    if "road" in sector:
        verification_checklist.append({
            "id": "chk_road_cbr",
            "item": "Perform core drilling and bitumen content extraction test (ASTM D2172) for wearing course.",
            "category": "Technical Specifications"
        })
        verification_checklist.append({
            "id": "chk_road_chainage",
            "item": "Cross-verify total paved chainage using odometer/GIS tracking against DPR sanctioned length.",
            "category": "Physical Measurement"
        })
    elif "water" in sector:
        verification_checklist.append({
            "id": "chk_water_quality",
            "item": "Collect water samples from borewell/purifier outlet for BIS 10500 laboratory chemical & microbial assay.",
            "category": "Quality Assurance"
        })
        verification_checklist.append({
            "id": "chk_water_pressure",
            "item": "Verify hydrostatic pressure test across pipeline joints and inspect flow meter logs.",
            "category": "Technical Specifications"
        })
    elif "light" in sector or "solar" in sector or "electric" in sector:
        verification_checklist.append({
            "id": "chk_light_lux",
            "item": "Verify lux level at ground perimeter and inspect solar battery warranty certificates & serial numbers.",
            "category": "Technical Specifications"
        })
    elif "health" in sector or "hospital" in sector:
        verification_checklist.append({
            "id": "chk_health_oxygen",
            "item": "Inspect medical gas pipeline manifold and verify HVAC HEPA filter test reports for ICU compliance.",
            "category": "Technical Specifications"
        })

    # Baseline Standard Checklist Items if list is empty
    if not verification_checklist:
        verification_checklist = [
            {"id": "chk_base_1", "item": "Verify physical execution according to approved technical specifications.", "category": "Physical"},
            {"id": "chk_base_2", "item": "Verify material quality test certificates (cube test/mix design/ISI stamps).", "category": "Materials"},
            {"id": "chk_base_3", "item": "Inspect contractor daily logbook and site muster roll.", "category": "Compliance"}
        ]

    # Calculate Evidence Confidence (0-100)
    # Evaluates data completeness, independent verification & field corroboration
    evidence_points = 0
    max_evidence_points = 7

    if inspections:
        evidence_points += 2
    if len(daily_updates) >= 3:
        evidence_points += 1
    if materials:
        evidence_points += 1
    if scope and scope.get("approved_scope"):
        evidence_points += 1
    if any(m.get("quality_status") == "VERIFIED" for m in materials):
        evidence_points += 1
    # Check if there are discrepancies reducing confidence
    if inconsistencies:
        # Inconsistencies reduce evidence certainty
        evidence_points = max(1, evidence_points - 1)

    evidence_confidence_score = round((evidence_points / max_evidence_points) * 100.0, 1)

    return {
        "work_id": work.get("work_id"),
        "financial_utilization_pct": fin_util_pct,
        "material_consumption_pct": mat_consumption_pct,
        "reported_completion_pct": reported_pct,
        "verified_completion_pct": verified_pct,
        "inconsistencies": inconsistencies,
        "inconsistency_count": len(inconsistencies),
        "verification_checklist": verification_checklist,
        "evidence_confidence_score": evidence_confidence_score,
        "is_verification_recommended": len(inconsistencies) > 0 or evidence_confidence_score < 60.0
    }

