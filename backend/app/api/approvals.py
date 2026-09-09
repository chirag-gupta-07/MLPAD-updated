from fastapi import APIRouter, HTTPException, Query, Body
from typing import Optional, Dict, Any, List
from backend.app.db.operations_db import (
    create_proposal, get_approvals, get_approval_by_id, take_approval_action, get_approval_actions
)

router = APIRouter(prefix="/api/approvals", tags=["Approvals"])

@router.post("/")
async def create_new_proposal(
    project_id: str = Body(...),
    proposed_by: str = Body(...),
    estimated_cost: float = Body(...),
    proposal_description: str = Body(...),
    location_description: Optional[str] = Body(None),
    latitude: Optional[float] = Body(None),
    longitude: Optional[float] = Body(None),
    supporting_documents: Optional[List[Dict[str, Any]]] = Body(None),
    remarks: Optional[str] = Body(None),
    user_role: Optional[str] = Body("Proposer")
) -> Dict[str, Any]:
    """Create project proposal."""
    try:
        row_id = create_proposal(
            project_id=project_id,
            proposed_by=proposed_by,
            estimated_cost=estimated_cost,
            proposal_description=proposal_description,
            location_description=location_description,
            latitude=latitude,
            longitude=longitude,
            supporting_documents=supporting_documents,
            remarks=remarks,
            user_role=user_role
        )
        return {"status": "success", "id": row_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("", include_in_schema=False)
@router.get("/")
async def list_approvals(
    project_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1)
) -> List[Dict[str, Any]]:
    """List proposals."""
    return get_approvals(project_id=project_id, status=status, limit=limit)

@router.get("/{approval_id}")
async def get_approval(approval_id: int) -> Dict[str, Any]:
    """Get specific approval with its action history."""
    approval = get_approval_by_id(approval_id)
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")
    actions = get_approval_actions(approval_id=approval_id)
    approval["actions"] = actions
    return approval

@router.post("/{approval_id}/action")
async def take_action(
    approval_id: int,
    user_name: str = Body(...),
    user_role: str = Body(...),
    action: str = Body(...),
    new_status: str = Body(...),
    remarks: Optional[str] = Body(None)
) -> Dict[str, Any]:
    """Take approval action."""
    try:
        action_res = take_approval_action(
            approval_id=approval_id,
            user_name=user_name,
            user_role=user_role,
            action=action,
            new_status=new_status,
            remarks=remarks
        )

        # Synchronize Work record in database
        try:
            from datetime import datetime
            from backend.app.db.database import SessionLocal
            from backend.app.db.models import Work
            from backend.app.db.operations_db import get_approval_by_id
            
            app_item = get_approval_by_id(approval_id)
            if app_item and app_item.get("project_id"):
                proj_id = app_item["project_id"]
                with SessionLocal() as db:
                    work = db.query(Work).filter(Work.work_id == proj_id).first()
                    if work:
                        work.status = new_status
                        if new_status in ("SANCTIONED", "APPROVED"):
                            work.sanction_date = datetime.utcnow().strftime("%Y-%m-%d")
                        db.commit()
        except Exception as e:
            print(f"Warning: could not sync approval to Work model: {e}")

        # Invalidate data service cache
        from backend.app.services.data_service import invalidate_cache
        invalidate_cache()

        return action_res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/project/{project_id:path}")
async def project_approval_history(project_id: str) -> List[Dict[str, Any]]:
    """Get approval history for a project by path."""
    return get_approval_actions(project_id=project_id)

@router.get("/project-actions")
async def project_approval_history_query(project_id: str = Query(...)) -> List[Dict[str, Any]]:
    """Get approval history for a project by query param."""
    return get_approval_actions(project_id=project_id)
