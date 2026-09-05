from fastapi import APIRouter, HTTPException, Query, Body
from typing import Optional, Dict, Any, List
from backend.app.db.operations_db import submit_daily_update, get_daily_updates

router = APIRouter(prefix="/api/daily-updates", tags=["Daily Updates"])

@router.post("/")
async def submit_update(
    project_id: str = Body(...),
    person_name: str = Body(...),
    date: str = Body(...),
    work_description: str = Body(...),
    person_id: Optional[int] = Body(None),
    work_category: Optional[str] = Body(None),
    milestone_id: Optional[str] = Body(None),
    quantity_completed_today: Optional[float] = Body(None),
    unit: Optional[str] = Body(None),
    cumulative_progress_pct: Optional[float] = Body(None),
    worker_count: Optional[int] = Body(None),
    materials_received: Optional[List[Dict[str, Any]]] = Body(None),
    materials_used: Optional[List[Dict[str, Any]]] = Body(None),
    current_issues: Optional[str] = Body(None),
    delay_reason: Optional[str] = Body(None),
    expected_next_activity: Optional[str] = Body(None),
    site_photos: Optional[List[str]] = Body(None),
    remarks: Optional[str] = Body(None)
) -> Dict[str, Any]:
    """Submit daily work update."""
    try:
        row_id = submit_daily_update(
            project_id=project_id,
            person_name=person_name,
            date=date,
            work_description=work_description,
            person_id=person_id,
            work_category=work_category,
            milestone_id=milestone_id,
            quantity_completed_today=quantity_completed_today,
            unit=unit,
            cumulative_progress_pct=cumulative_progress_pct,
            worker_count=worker_count,
            materials_received=materials_received,
            materials_used=materials_used,
            current_issues=current_issues,
            delay_reason=delay_reason,
            expected_next_activity=expected_next_activity,
            site_photos=site_photos,
            remarks=remarks
        )
        return {"status": "success", "id": row_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/")
async def list_updates_query(
    project_id: str = Query(...),
    limit: int = Query(30, ge=1)
) -> List[Dict[str, Any]]:
    """List updates by query param (robust to slashes in project_id)."""
    return get_daily_updates(project_id, limit)

@router.get("/project/{project_id:path}")
async def list_updates(
    project_id: str,
    limit: int = Query(30, ge=1)
) -> List[Dict[str, Any]]:
    """List updates by path."""
    return get_daily_updates(project_id, limit)
