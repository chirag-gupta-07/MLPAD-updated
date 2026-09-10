from fastapi import APIRouter, HTTPException, Query, Body, Depends
from typing import Optional, Dict, Any, List
from backend.app.db.operations_db import (
    submit_development_request, get_development_requests, get_development_request,
    find_nearby_requests, take_request_decision, upvote_development_request,
    get_demand_clusters_data, adopt_cluster_by_mp
)
from backend.app.services.demand_clustering import check_mplads_feasibility
from backend.app.db.models import User
from backend.app.api.auth import require_roles

router = APIRouter(prefix="/api/development-requests", tags=["Development Requests"])

@router.post("/")
async def submit_request(
    category: str = Body(...),
    description: str = Body(...),
    latitude: Optional[float] = Body(None),
    longitude: Optional[float] = Body(None),
    location_description: Optional[str] = Body(None),
    photo_path: Optional[str] = Body(None),
    citizen_name: Optional[str] = Body(None),
    citizen_contact: Optional[str] = Body(None)
) -> Dict[str, Any]:
    """Submit citizen development request."""
    try:
        return submit_development_request(
            category=category,
            description=description,
            latitude=latitude,
            longitude=longitude,
            location_description=location_description,
            photo_path=photo_path,
            citizen_name=citizen_name,
            citizen_contact=citizen_contact
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("", include_in_schema=False)
@router.get("/")
async def list_requests(
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    limit: int = Query(50, ge=1)
) -> List[Dict[str, Any]]:
    """List requests."""
    return get_development_requests(status, category, limit)

@router.get("/clusters")
async def list_demand_clusters(
    latitude: Optional[float] = Query(None),
    longitude: Optional[float] = Query(None),
    radius_km: Optional[float] = Query(None)
) -> List[Dict[str, Any]]:
    """
    Returns aggregated spatial-semantic demand hotspots and consensus clusters.
    If lat/lon/radius_km provided, filters to nearby area; otherwise returns all clusters.
    """
    clusters = get_demand_clusters_data()
    if latitude is not None and longitude is not None and radius_km is not None:
        from backend.app.services.demand_clustering import haversine_distance
        filtered = []
        for cl in clusters:
            d = haversine_distance(latitude, longitude, cl["latitude"], cl["longitude"])
            if d <= radius_km * 1000.0:
                filtered.append(cl)
        return filtered
    return clusters

@router.post("/negative-list-check")
async def check_statutory_negative_list(
    description: str = Body(..., embed=True),
    category: Optional[str] = Body("", embed=True)
) -> Dict[str, Any]:
    """Checks proposal text against Para 4.5 of MPLADS Guidelines 2016."""
    return check_mplads_feasibility(description, category or "")

@router.post("/{request_id}/upvote")
async def upvote_request(request_id: int) -> Dict[str, Any]:
    """Citizen endorses / upvotes a petition (+1 count)."""
    try:
        return upvote_development_request(request_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/clusters/{cluster_id}/recommend-by-mp")
async def mp_recommend_cluster(
    cluster_id: str,
    title: str = Body(...),
    estimated_cost: float = Body(...),
    constituency: Optional[str] = Body(None),
    district: Optional[str] = Body(None),
    state: Optional[str] = Body(None),
    sector: Optional[str] = Body(None),
    official_notice_memo: Optional[str] = Body(None),
    current_user: User = Depends(require_roles(["MP", "SUPER_ADMIN"]))
) -> Dict[str, Any]:
    """
    MP adopts a citizen demand hotspot cluster:
    Generates official MP Recommendation Notice, provisions Work in mplads_master.db,
    dispatches administrative proposal to DC Approvals queue in operations.db,
    and updates all underlying citizen petitions to 'RECOMMENDED_BY_MP'.
    """
    try:
        mp_full_name = current_user.full_name or "Hon'ble Member of Parliament"
        mp_dist = district or current_user.district or "Varanasi"
        mp_const = constituency or current_user.constituency or f"{mp_dist} Lok Sabha"
        mp_state = state or current_user.state or "Uttar Pradesh"
        
        return adopt_cluster_by_mp(
            cluster_id=cluster_id,
            title=title,
            estimated_cost=estimated_cost,
            mp_name=mp_full_name,
            constituency=mp_const,
            district=mp_dist,
            state=mp_state,
            sector=sector or "Public Works",
            official_notice_memo=official_notice_memo
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to issue MP recommendation notice: {e}")

@router.get("/{request_id}")
async def get_request_detail(request_id: int) -> Dict[str, Any]:
    """Get request details, find nearby similar requests and nearby projects."""
    req = get_development_request(request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if req.get("latitude") and req.get("longitude"):
        req["nearby_requests"] = find_nearby_requests(
            req["latitude"], req["longitude"], radius_km=5.0
        )
    else:
        req["nearby_requests"] = []
    return req

@router.post("/{request_id}/decision")
async def make_decision(
    request_id: int,
    new_status: str = Body(...),
    remarks: Optional[str] = Body(None),
    linked_project_id: Optional[str] = Body(None),
    decided_by: Optional[str] = Body(None),
    user_role: Optional[str] = Body(None),
    current_user: User = Depends(require_roles(["DISTRICT_COLLECTOR", "SUPER_ADMIN"]))
) -> Dict[str, Any]:
    """Official decision on development request."""
    try:
        return take_request_decision(
            request_id=request_id,
            decided_by=current_user.full_name,
            user_role=current_user.role,
            new_status=new_status,
            remarks=remarks,
            linked_project_id=linked_project_id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
