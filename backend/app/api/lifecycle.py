from fastapi import APIRouter, HTTPException, Query, Body
from typing import Optional, Dict, Any, List
from backend.app.services.data_service import get_work_by_id
from backend.app.db.lifecycle_db import (
    get_project_lifecycle,
    add_field_inspection,
    record_audit_event,
    get_connection
)
from backend.app.services.verification_engine import calculate_cross_source_consistency

router = APIRouter(prefix="/api/projects", tags=["Project Lifecycle"])


@router.get("/{work_id:path}/lifecycle")
def get_work_lifecycle_endpoint(work_id: str) -> Dict[str, Any]:
    work = get_work_by_id(work_id)
    if not work:
        raise HTTPException(status_code=404, detail=f"Work with ID {work_id} not found in master database")

    lifecycle = get_project_lifecycle(work_id)
    # If the project does not have customized manual records, synthesize realistic BoQ & milestone baselines
    if not lifecycle.get("scope") or not lifecycle.get("materials"):
        from backend.app.services.lifecycle_synthesizer import synthesize_work_lifecycle
        synthesized = synthesize_work_lifecycle(work)
        # Retain any user-submitted inspections, complaints, or check-ins that may exist
        if lifecycle.get("inspections"):
            synthesized["inspections"] = lifecycle["inspections"]
        if lifecycle.get("complaints"):
            synthesized["complaints"] = lifecycle["complaints"]
        if lifecycle.get("checkins"):
            synthesized["checkins"] = lifecycle["checkins"]
        if lifecycle.get("audit_logs"):
            # prepend or merge
            synthesized["audit_logs"] = lifecycle["audit_logs"] + synthesized["audit_logs"]
        lifecycle = synthesized

    consistency = calculate_cross_source_consistency(work, lifecycle)

    return {
        "work_id": work_id,
        "work_summary": {
            "work_description": work.get("work_description"),
            "sector": work.get("sector"),
            "district": work.get("district"),
            "state": work.get("state"),
            "sanctioned_amount": work.get("sanctioned_amount"),
            "total_expenditure": work.get("total_expenditure"),
            "status": work.get("status"),
            "completion_percentage": work.get("completion_percentage"),
            "composite_risk_score": work.get("composite_risk_score"),
            "risk_level": work.get("risk_level")
        },
        "lifecycle": lifecycle,
        "consistency": consistency
    }


@router.post("/{work_id:path}/inspections")
def record_inspection_endpoint(work_id: str, inspection_data: Dict[str, Any] = Body(...)) -> Dict[str, Any]:
    work = get_work_by_id(work_id)
    if not work:
        raise HTTPException(status_code=404, detail=f"Work with ID {work_id} not found")

    insp_id = add_field_inspection(work_id, inspection_data)
    return {
        "status": "SUCCESS",
        "message": "Field inspection recorded and verified progress updated",
        "inspection_id": insp_id
    }


@router.post("/{work_id:path}/checkin")
def record_site_checkin_endpoint(work_id: str, checkin_data: Dict[str, Any] = Body(...)) -> Dict[str, Any]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO site_checkins (
                work_id, responsible_person_id, responsible_person_name, checkin_timestamp,
                gps_latitude, gps_longitude, project_latitude, project_longitude, distance_meters, status, site_photo_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            work_id,
            checkin_data.get("responsible_person_id", "RESP-01"),
            checkin_data.get("responsible_person_name", "Site Incharge"),
            checkin_data.get("checkin_timestamp"),
            checkin_data.get("gps_latitude"),
            checkin_data.get("gps_longitude"),
            checkin_data.get("project_latitude"),
            checkin_data.get("project_longitude"),
            checkin_data.get("distance_meters", 15.0),
            checkin_data.get("status", "WITHIN_SITE_RADIUS"),
            checkin_data.get("site_photo_url")
        ))
        conn.commit()

    record_audit_event(
        work_id=work_id,
        action_type="SITE_CHECKIN_RECORDED",
        performed_by=checkin_data.get("responsible_person_name", "Site Incharge"),
        user_role="SITE_RESPONSIBLE_PERSON",
        prev_val="",
        new_val={"distance_m": checkin_data.get("distance_meters"), "status": checkin_data.get("status")},
        reason="Routine site geotagged check-in"
    )
    return {"status": "SUCCESS", "message": "Geotagged site check-in logged"}


@router.post("/reset-demo")
def reset_demo_lifecycle_endpoint() -> Dict[str, Any]:
    """Wipes all test changes and resets to original presentation demo state."""
    from backend.app.db.reset_demo import reset_all_databases_to_demo_state
    result = reset_all_databases_to_demo_state()
    return result

