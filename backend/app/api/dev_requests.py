from fastapi import APIRouter, HTTPException, Query, Body
from typing import Optional, Dict, Any, List
from backend.app.db.operations_db import (
    submit_development_request, get_development_requests, get_development_request,
    find_nearby_requests, take_request_decision
)

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
async def find_clusters(
    latitude: float = Query(...),
    longitude: float = Query(...),
    radius_km: float = Query(2.0, ge=0.1)
) -> List[Dict[str, Any]]:
    """Find geographic clusters."""
    return find_nearby_requests(latitude, longitude, radius_km)

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
    decided_by: str = Body(...),
    user_role: str = Body(...),
    new_status: str = Body(...),
    remarks: Optional[str] = Body(None),
    linked_project_id: Optional[str] = Body(None)
) -> Dict[str, Any]:
    """Official decision on development request."""
    try:
        return take_request_decision(
            request_id=request_id,
            decided_by=decided_by,
            user_role=user_role,
            new_status=new_status,
            remarks=remarks,
            linked_project_id=linked_project_id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
