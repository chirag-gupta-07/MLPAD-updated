from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, Optional
from backend.app.services.data_service import get_work_by_id
from backend.app.db.operations_db import (
    ensure_project_operations,
    get_unified_timeline, get_attendance_summary, get_daily_updates,
    get_site_inventory, get_payments, get_approvals, get_development_requests
)

router = APIRouter(prefix="/api/projects", tags=["Project Details"])

@router.get("/{project_id:path}/snapshot")
async def get_snapshot(project_id: str) -> Dict[str, Any]:
    """Quick project snapshot combining work data and operational summaries."""
    ensure_project_operations(project_id)
    work = get_work_by_id(project_id)
    if not work:
        raise HTTPException(status_code=404, detail="Project not found")

    attendance = get_attendance_summary(project_id, days=30)
    updates = get_daily_updates(project_id, limit=1)
    latest_update = updates[0] if updates else None
    
    inventory = get_site_inventory(project_id)
    
    payments = get_payments(project_id=project_id)
    total_paid = sum(p["amount"] for p in payments if p["status"] == "PAID")
    
    matching_approvals = get_approvals(project_id=project_id, limit=1)
    project_approval = matching_approvals[0] if matching_approvals else None
    
    return {
        "work_data": work,
        "attendance_summary": attendance,
        "latest_update": latest_update,
        "inventory_items_count": len(inventory),
        "payments_summary": {
            "total_paid": total_paid,
            "payments_count": len(payments)
        },
        "approval_status": project_approval["current_status"] if project_approval else "UNKNOWN",
        "composite_risk_score": work.get("composite_risk_score", 0.0)
    }

@router.get("/{project_id:path}/timeline")
async def get_timeline(project_id: str) -> Dict[str, Any]:
    """Unified timeline of project operations."""
    timeline = get_unified_timeline(project_id, limit=100)
    return {"project_id": project_id, "timeline": timeline}

@router.get("/{project_id:path}/risk-breakdown")
async def get_risk_breakdown(project_id: str) -> Dict[str, Any]:
    """Detailed risk contributors."""
    work = get_work_by_id(project_id)
    if not work:
        raise HTTPException(status_code=404, detail="Project not found")
        
    risks = []
    if work.get("delay_risk_score", 0) > 50:
        risks.append({
            "factor": "Delay Risk",
            "value": work.get("delay_risk_score"),
            "reason": "Project is running behind schedule.",
            "evidence": "Schedule mismatch in daily updates vs plan."
        })
    if work.get("utilization_anomaly_score", 0) > 50:
        risks.append({
            "factor": "Utilization Anomaly",
            "value": work.get("utilization_anomaly_score"),
            "reason": "Fund utilization does not match physical progress.",
            "evidence": "Payment requests exceed recorded progress."
        })
        
    return {
        "project_id": project_id,
        "composite_risk_score": work.get("composite_risk_score", 0.0),
        "risk_factors": risks
    }

@router.get("/{project_id:path}/operations-summary")
async def get_operations_summary(project_id: str) -> Dict[str, Any]:
    """Get aggregated operations data."""
    ensure_project_operations(project_id)
    attendance = get_attendance_summary(project_id, days=30)
    updates = get_daily_updates(project_id, limit=100)
    inventory = get_site_inventory(project_id)
    payments = get_payments(project_id=project_id)
    
    all_approvals = get_approvals(limit=1000)
    project_approval = next((a for a in all_approvals if a["project_id"] == project_id), None)
    
    all_reqs = get_development_requests(limit=1000)
    project_reqs = [r for r in all_reqs if r.get("linked_project_id") == project_id]
    
    return {
        "project_id": project_id,
        "attendance": attendance,
        "daily_updates_count": len(updates),
        "material_count": len(inventory),
        "payments_count": len(payments),
        "approval_status": project_approval["current_status"] if project_approval else "UNKNOWN",
        "development_requests_count": len(project_reqs)
    }


@router.get("/{project_id:path}/explain-flag")
@router.post("/{project_id:path}/explain-flag")
async def get_project_explain_flag(project_id: str) -> Dict[str, Any]:
    """
    Dynamic GenAI Explainable AI (XAI) endpoint.
    Synthesizes why a project is flagged (or compliant) and returns a targeted SOP action plan.
    """
    from backend.app.services.xai_service import get_project_xai_explanation
    return get_project_xai_explanation(project_id)
