"""
FastAPI REST Router for Feature 7.6: Citizen Evidence & Ground Truth Verification.
Supports citizen multipart photographic submissions, supervisory review, and social audit feeds.
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query, Body, Depends
from fastapi.responses import FileResponse
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

from backend.app.db.citizen_evidence_db import UPLOADS_DIR, delete_evidence
from backend.app.services.citizen_evidence_service import (
    create_citizen_evidence_submission,
    get_enriched_evidence_list,
    get_evidence_by_id,
    update_evidence_verification,
    get_evidence_stats,
    seed_demo_citizen_evidence
)
from backend.app.db.models import User
from backend.app.api.auth import require_roles

router = APIRouter(prefix="/api/citizen-evidence", tags=["Citizen Evidence"])


class VerificationUpdateRequest(BaseModel):
    status: str = Field(..., description="Status: PENDING_VERIFICATION, FIELD_INSPECTION_SCHEDULED, SUPERVISORY_VERIFIED, REJECTED_UNVERIFIABLE")
    admin_notes: Optional[str] = Field(None, description="Official remarks or findings from site inspection")
    verified_by: Optional[str] = Field("District Nodal Officer", description="Name or designation of reviewing authority")


@router.post("", summary="Submit new Citizen Evidence with optional photograph")
async def submit_citizen_evidence(
    work_id: str = Form(..., description="Associated MPLADS Work ID"),
    issue_type: str = Form(..., description="Issue category (e.g. WORK_NOT_STARTED, PROGRESS_DELAYED, SUBSTANDARD_WORK, etc.)"),
    description: str = Form(..., min_length=10, description="Citizen's ground observations and narrative description"),
    latitude: float = Form(..., ge=-90.0, le=90.0, description="Citizen device GPS Latitude"),
    longitude: float = Form(..., ge=-180.0, le=180.0, description="Citizen device GPS Longitude"),
    citizen_name: Optional[str] = Form(None, description="Citizen full name (or leave empty for anonymous)"),
    citizen_contact: Optional[str] = Form(None, description="Optional phone or email for supervisory follow-up"),
    claimed_progress: Optional[float] = Form(None, ge=0.0, le=100.0, description="Observed completion percentage (0-100)"),
    photo: Optional[UploadFile] = File(None, description="Ground photo proof (JPG, PNG, WebP)")
) -> Dict[str, Any]:
    try:
        record = create_citizen_evidence_submission(
            work_id=work_id,
            issue_type=issue_type,
            description=description,
            latitude=latitude,
            longitude=longitude,
            citizen_name=citizen_name,
            citizen_contact=citizen_contact,
            claimed_progress=claimed_progress,
            photo_file=photo
        )
        return {
            "status": "success",
            "message": "Citizen evidence received successfully. Recorded as a supporting early-warning signal pending supervisory verification.",
            "data": record
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record evidence: {str(e)}")


@router.get("", summary="List citizen evidence submissions with optional filtering")
def list_citizen_evidence(
    work_id: Optional[str] = Query(None, description="Filter by specific Work ID"),
    verification_status: Optional[str] = Query(None, description="Filter: PENDING_VERIFICATION, FIELD_INSPECTION_SCHEDULED, SUPERVISORY_VERIFIED, REJECTED_UNVERIFIABLE"),
    issue_type: Optional[str] = Query(None, description="Filter by issue type"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
) -> Dict[str, Any]:
    records = get_enriched_evidence_list(
        work_id=work_id,
        verification_status=verification_status,
        issue_type=issue_type,
        limit=limit,
        offset=offset
    )
    return {
        "count": len(records),
        "limit": limit,
        "offset": offset,
        "evidence": records
    }


@router.get("/stats", summary="Get macro indicators and statistics for Citizen Evidence")
def get_citizen_evidence_statistics() -> Dict[str, Any]:
    return get_evidence_stats()


@router.get("/work/{work_id}", summary="Get all citizen evidence attached to a specific work")
def get_evidence_for_work(work_id: str) -> Dict[str, Any]:
    records = get_enriched_evidence_list(work_id=work_id)
    return {
        "work_id": work_id,
        "total_submissions": len(records),
        "evidence": records
    }


@router.get("/{evidence_id}", summary="Get specific evidence details by ID")
def get_single_evidence(evidence_id: str) -> Dict[str, Any]:
    record = get_evidence_by_id(evidence_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Evidence with ID {evidence_id} not found")
    return record


@router.patch("/{evidence_id}/verify", summary="District Collector / Nodal Authority verification action")
def verify_citizen_evidence(
    evidence_id: str,
    payload: VerificationUpdateRequest,
    current_user: User = Depends(require_roles(["DISTRICT_COLLECTOR", "SUPER_ADMIN"]))
) -> Dict[str, Any]:
    verified_by = current_user.full_name or payload.verified_by
    updated = update_evidence_verification(
        evidence_id=evidence_id,
        status=payload.status,
        admin_notes=payload.admin_notes,
        verified_by=verified_by
    )
    if not updated:
        raise HTTPException(status_code=404, detail=f"Evidence with ID {evidence_id} not found")
    return {
        "status": "success",
        "message": f"Evidence {evidence_id} updated to {payload.status}.",
        "data": updated
    }


@router.get("/photo/{filename}", summary="Serve citizen evidence photograph")
def get_evidence_photo(filename: str):
    file_path = UPLOADS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Photo not found")
    return FileResponse(str(file_path))


@router.delete("/{evidence_id}", summary="Delete a citizen evidence report")
def delete_citizen_evidence(
    evidence_id: str,
    current_user: User = Depends(require_roles(["SUPER_ADMIN"]))
) -> Dict[str, Any]:
    success = delete_evidence(evidence_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Evidence with ID {evidence_id} not found")
    return {
        "status": "success",
        "message": f"Evidence {evidence_id} deleted successfully."
    }

