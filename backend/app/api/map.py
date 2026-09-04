from fastapi import APIRouter, Query
from typing import Dict, Any, List, Optional
from backend.app.services.data_service import get_map_markers

router = APIRouter(prefix="/api/map", tags=["Geospatial GIS"])


@router.get("/markers")
def get_gis_markers(
    limit: int = Query(2500, description="Max markers to return for map rendering"),
    risk_level: Optional[str] = Query(None, description="Optional risk filter: HIGH, MEDIUM, LOW"),
    state: Optional[str] = Query(None, description="Optional state filter")
) -> List[Dict[str, Any]]:
    return get_map_markers(limit=limit, risk_level=risk_level, state=state)
