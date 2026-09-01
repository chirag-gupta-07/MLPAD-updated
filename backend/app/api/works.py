from fastapi import APIRouter, HTTPException, Query
from typing import Optional, Dict, Any
from backend.app.services.data_service import get_works_paginated, get_work_by_id

router = APIRouter(prefix="/api/works", tags=["Works"])


@router.get("")
def list_works(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    risk_level: Optional[str] = Query(None, description="Filter by risk: HIGH, MEDIUM, LOW"),
    state: Optional[str] = Query(None, description="Filter by state"),
    sector: Optional[str] = Query(None, description="Filter by sector"),
    search: Optional[str] = Query(None, description="Search query across ID, description, MP, district"),
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
        sort_by=sort_by,
        sort_order=sort_order
    )


@router.get("/{work_id}")
def get_work_detail(work_id: str) -> Dict[str, Any]:
    work = get_work_by_id(work_id)
    if not work:
        raise HTTPException(status_code=404, detail=f"Work with ID {work_id} not found")
    return work
