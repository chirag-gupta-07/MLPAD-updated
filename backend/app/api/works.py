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

    # Insert into project_approvals in operations_db so District Collector sees it in Approvals page
    try:
        from backend.app.db.operations_db import create_proposal
        create_proposal(
            project_id=new_work.work_id,
            proposed_by=current_user.full_name or "Hon'ble MP",
            estimated_cost=req.estimated_cost,
            proposal_description=new_work.work_description,
            location_description=f"{req.district}, {req.state}",
            latitude=req.latitude,
            longitude=req.longitude,
            user_role="MP",
            remarks=f"Recommended under MPLADS by Hon'ble MP {current_user.full_name or ''} for {req.constituency or req.district}"
        )
    except Exception as e:
        print(f"Warning: could not insert into operations.db: {e}")

    # Invalidate data service cache
    from backend.app.services.data_service import invalidate_cache
    invalidate_cache()

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


@router.get("/mp-proposals")
def get_mp_proposals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns dynamic proposals submitted by Hon'ble MP and their live progress status."""
    rec_works = db.query(Work).filter(
        Work.work_id.like("MPLADS/REC/%")
    ).order_by(Work.work_id.desc()).all()

    from backend.app.db.operations_db import get_approvals
    try:
        proposals_map = {p["project_id"]: p for p in get_approvals(limit=100)}
    except Exception:
        proposals_map = {}

    results = []
    for w in rec_works:
        appr = proposals_map.get(w.work_id, {})
        curr_status = w.status
        
        if curr_status == "RECOMMENDED":
            stage = "Submitted to District Collector (Under Technical Scrutiny)"
        elif curr_status == "SANCTIONED":
            stage = "Sanctioned by Collector (NIT E-Tender Publishing)"
        elif curr_status == "TENDER_PUBLISHED":
            stage = "Tender Published (Two-Envelope Bidding Active)"
        elif curr_status == "EVALUATING":
            stage = "AI Document Scrutiny & L1 Financial Evaluation"
        elif curr_status == "AWARDED":
            stage = f"Tender Awarded to {w.implementing_agency} (Work Order Issued)"
        elif curr_status == "IN_PROGRESS":
            stage = f"Ground Execution Ongoing ({int(w.completion_percentage)}% Completed) - {w.implementing_agency}"
        elif curr_status == "COMPLETED":
            stage = f"Physical Work 100% Completed & Asset Commissioned - {w.implementing_agency}"
        elif curr_status == "REJECTED":
            stage = "Returned/Rejected by Collector"
        else:
            stage = curr_status

        results.append({
            "id": w.work_id,
            "title": w.work_description.split(":")[0] if ":" in (w.work_description or "") else (w.work_description or "MPLADS Work"),
            "cost": w.sanctioned_amount,
            "expenditure": w.total_expenditure,
            "completion_percentage": w.completion_percentage,
            "sector": w.sector,
            "district": w.district,
            "status": curr_status,
            "stage": stage,
            "implementing_agency": w.implementing_agency,
            "approval_id": appr.get("id")
        })

    # Default starter demo works if no database works exist yet
    if not results:
        results = [
            {
                "id": "MPLADS/REC/VAR/2026/0491",
                "title": "Solar High-Mast Illumination in Rohania Bazaar",
                "cost": 1800000,
                "expenditure": 0,
                "completion_percentage": 0,
                "sector": "Renewable Energy",
                "status": "SANCTIONED",
                "stage": "Sanctioned by Collector (NIT E-Tender Publishing)",
                "implementing_agency": "Awaiting Tender Allocation"
            },
            {
                "id": "MPLADS/REC/VAR/2026/0812",
                "title": "Concrete Link Road Connecting Basantpur Village",
                "cost": 2500000,
                "expenditure": 1125000,
                "completion_percentage": 45,
                "sector": "Roads & Pathways",
                "status": "IN_PROGRESS",
                "stage": "Ground Execution Ongoing (45% Completed) - Gandhi Construction Co.",
                "implementing_agency": "Gandhi Construction Co."
            },
            {
                "id": "MPLADS/REC/VAR/2026/0994",
                "title": "Renovation of Primary Health Sub-Center in Sewapuri",
                "cost": 1200000,
                "expenditure": 0,
                "completion_percentage": 0,
                "sector": "Healthcare & Public Health",
                "status": "RECOMMENDED",
                "stage": "Submitted to District Collector (Under Technical Scrutiny)",
                "implementing_agency": "Awaiting Tender Allocation"
            }
        ]

    return results


@router.get("/{work_id:path}")
def get_work_detail(work_id: str) -> Dict[str, Any]:
    work = get_work_by_id(work_id)
    if not work:
        raise HTTPException(status_code=404, detail=f"Work with ID {work_id} not found")
    return work
