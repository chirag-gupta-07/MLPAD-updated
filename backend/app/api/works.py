import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, Dict, Any
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.services.data_service import get_works_paginated, get_work_by_id
from backend.app.db.database import get_db
from backend.app.db.models import Work, User
from backend.app.api.auth import get_current_user, require_roles

router = APIRouter(prefix="/api/works", tags=["Works"])


class RecommendWorkRequest(BaseModel):
    title: str
    description: Optional[str] = None
    sector: str = "Roads & Pathways"
    estimated_cost: float = 1500000.0
    district: Optional[str] = "Varanasi"
    state: Optional[str] = "Uttar Pradesh"
    constituency: Optional[str] = "Varanasi Lok Sabha"
    latitude: Optional[float] = 25.3176
    longitude: Optional[float] = 82.9739


@router.get("")
def list_works(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    risk_level: Optional[str] = Query(None, description="Filter by risk: HIGH, MEDIUM, LOW"),
    state: Optional[str] = Query(None, description="Filter by state"),
    sector: Optional[str] = Query(None, description="Filter by sector"),
    search: Optional[str] = Query(None, description="Search query across ID, description, MP, district"),
    verification_queue: bool = Query(False, description="Filter for works in the verification queue"),
    sort_by: str = Query("composite_risk_score", description="Column to sort by"),
    sort_order: str = Query("desc", description="Sort order: asc or desc")
) -> Dict[str, Any]:
    return get_works_paginated(
        page=page,
        page_size=page_size,
        risk_level=risk_level,
        state=state,
        sector=sector,
        search=search,
        verification_queue=verification_queue,
        sort_by=sort_by,
        sort_order=sort_order
    )


@router.post("/recommend")
def recommend_work_by_mp(
    req: RecommendWorkRequest,
    current_user: User = Depends(require_roles(["MP", "SUPER_ADMIN"])),
    db: Session = Depends(get_db)
):
    """Hon'ble Member of Parliament recommends a new work for their constituency."""
    new_id = f"MPLADS/REC/{req.district[:3].upper()}/{datetime.utcnow().year}/{uuid.uuid4().hex[:6].upper()}"
    
    new_work = Work(
        work_id=new_id,
        work_description=f"{req.title}: {req.description or 'Constituency development work'}",
        state=req.state,
        district=req.district,
        constituency=req.constituency or f"{req.district} Lok Sabha",
        mp_name=current_user.full_name,
        sector=req.sector,
        sanctioned_amount=req.estimated_cost,
        total_expenditure=0.0,
        completion_percentage=0.0,
        status="RECOMMENDED",  # Pending DC Sanction
        composite_risk_score=12.0,
        risk_level="LOW",
        latitude=req.latitude,
        longitude=req.longitude,
        implementing_agency="Awaiting Tender Allocation"
    )

    db.add(new_work)
    db.commit()
    db.refresh(new_work)

    return {
        "status": "SUCCESS",
        "work_id": new_work.work_id,
        "message": f"Proposal {new_id} officially submitted to District Collector for technical and financial sanction.",
        "work": {
            "work_id": new_work.work_id,
            "title": req.title,
            "cost": new_work.sanctioned_amount,
            "status": new_work.status,
            "recommended_by": new_work.mp_name
        }
    }


@router.get("/{work_id:path}")
def get_work_detail(work_id: str) -> Dict[str, Any]:
    work = get_work_by_id(work_id)
    if not work:
        raise HTTPException(status_code=404, detail=f"Work with ID {work_id} not found")
    return work
