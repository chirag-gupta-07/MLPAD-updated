from fastapi import APIRouter, HTTPException, Query, Body, Depends
from typing import Optional, Dict, Any, List
from backend.app.db.operations_db import (
    record_checkin, record_checkout, get_attendance_history, get_attendance_summary,
    get_responsible_persons, add_responsible_person
)
from backend.app.db.models import User
from backend.app.api.auth import get_current_user

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])

@router.get("/persons")
async def list_responsible_persons(project_id: str = Query(...)) -> List[Dict[str, Any]]:
    """List or auto-ensure responsible persons for a project."""
    return get_responsible_persons(project_id)

@router.post("/checkin")
async def checkin(
    project_id: str = Body(...),
    latitude: float = Body(...),
    longitude: float = Body(...),
    person_id: Optional[int] = Body(None),
    project_lat: Optional[float] = Body(None),
    project_lon: Optional[float] = Body(None),
    remarks: Optional[str] = Body(None),
    site_photo_path: Optional[str] = Body(None),
    person_name: Optional[str] = Body(None),
    person_role: Optional[str] = Body(None),
    allowed_radius: Optional[float] = Body(None),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Record geo-tagged check-in with GPS proximity validation."""
    try:
        return record_checkin(
            project_id=project_id,
            person_id=person_id,
            person_name=current_user.full_name,
            person_role=current_user.role,
            checkin_lat=latitude,
            checkin_lon=longitude,
            project_lat=project_lat,
            project_lon=project_lon,
            allowed_radius=500.0,
            site_photo_path=site_photo_path,
            remarks=remarks
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/checkout")
async def checkout(
    attendance_id: int = Body(...),
    person_name: Optional[str] = Body(None),
    person_role: Optional[str] = Body(None),
    current_user: User = Depends(get_current_user)
) -> Dict[str, str]:
    """Record check-out."""
    try:
        record_checkout(attendance_id, current_user.full_name, current_user.role)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/history")
async def attendance_history_query(
    project_id: str = Query(...),
    limit: int = Query(30, ge=1)
) -> List[Dict[str, Any]]:
    """Get attendance history by query parameter (handles complex project IDs with slashes)."""
    return get_attendance_history(project_id, limit)

@router.get("/summary")
async def attendance_summary_query(
    project_id: str = Query(...),
    days: int = Query(30, ge=1)
) -> Dict[str, Any]:
    """Get attendance statistics by query parameter."""
    return get_attendance_summary(project_id, days)

@router.get("/project/{project_id:path}/summary")
async def attendance_summary_path(
    project_id: str,
    days: int = Query(30, ge=1)
) -> Dict[str, Any]:
    """Get attendance statistics by path."""
    return get_attendance_summary(project_id, days)

@router.get("/project/{project_id:path}")
async def attendance_history_path(
    project_id: str,
    limit: int = Query(30, ge=1)
) -> List[Dict[str, Any]]:
    """Get attendance history by path."""
    return get_attendance_history(project_id, limit)
