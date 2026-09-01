from fastapi import APIRouter
from typing import Dict, Any, List
from backend.app.services.data_service import get_map_markers

router = APIRouter(prefix="/api/map", tags=["Geospatial GIS"])


@router.get("/markers")
def get_gis_markers() -> List[Dict[str, Any]]:
    return get_map_markers()
