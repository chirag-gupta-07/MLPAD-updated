"""
Contractor Management, KYC Onboarding, and Work Order Progress Tracking API.
"""

import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.db.models import ContractorProfile, WorkOrder, Bid, Tender, Work, User
from backend.app.api.auth import get_current_user, require_roles
from backend.app.services.contractor_ai import verify_kyc_documents, verify_photo_exif_geofence

router = APIRouter(prefix="/api/contractors", tags=["Contractor & Vendor Registry"])


class KYCSubmissionRequest(BaseModel):
    firm_name: str
    license_class: str = "Class-B"
    pan: str
    gstin: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    bank_name: Optional[str] = "State Bank of India"
    bank_account_no: Optional[str] = None
    bank_ifsc: Optional[str] = None


class ProgressUpdateRequest(BaseModel):
    progress_percentage: float
    remarks: Optional[str] = None


@router.get("")
def list_contractors(
    license_class: Optional[str] = None,
    kyc_status: Optional[str] = None,
    current_user: User = Depends(require_roles(["DISTRICT_COLLECTOR", "VIGILANCE", "SUPER_ADMIN"])),
    db: Session = Depends(get_db)
):
    """Lists enlisted government contractors."""
    query = db.query(ContractorProfile)
    if license_class:
        query = query.filter(ContractorProfile.license_class == license_class)
    if kyc_status:
        query = query.filter(ContractorProfile.kyc_status == kyc_status)

    contractors = query.order_by(ContractorProfile.performance_score.desc()).all()
    return [
        {
            "id": c.id,
            "firm_name": c.firm_name,
            "license_class": c.license_class,
            "pan": c.pan,
            "gstin": c.gstin,
            "kyc_status": c.kyc_status,
            "performance_score": c.performance_score,
            "total_works_completed": c.total_works_completed,
            "contact_email": c.contact_email,
            "contact_phone": c.contact_phone
        }
        for c in contractors
    ]


@router.post("/kyc")
def submit_contractor_kyc(
    req: KYCSubmissionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submits contractor KYC documents and executes AI format & state code validation."""
    ai_validation = verify_kyc_documents(req.pan, req.gstin)

    contractor = db.query(ContractorProfile).filter(ContractorProfile.user_id == current_user.id).first()
    if not contractor:
        contractor = ContractorProfile(
            id=f"cnt_{current_user.id}",
            user_id=current_user.id,
            firm_name=req.firm_name,
            license_class=req.license_class,
            pan=req.pan.upper(),
            gstin=req.gstin.upper(),
            kyc_status="ACTIVE" if ai_validation["is_approved"] else "PENDING_KYC",
            contact_email=req.contact_email or current_user.email,
            contact_phone=req.contact_phone,
            bank_name=req.bank_name,
            bank_account_no=req.bank_account_no,
            bank_ifsc=req.bank_ifsc,
            performance_score=80.0
        )
        db.add(contractor)
    else:
        contractor.firm_name = req.firm_name
        contractor.license_class = req.license_class
        contractor.pan = req.pan.upper()
        contractor.gstin = req.gstin.upper()
        contractor.kyc_status = "ACTIVE" if ai_validation["is_approved"] else "PENDING_KYC"
        contractor.bank_name = req.bank_name
        contractor.bank_account_no = req.bank_account_no
        contractor.bank_ifsc = req.bank_ifsc

    db.commit()
    db.refresh(contractor)

    return {
        "status": "SUCCESS",
        "kyc_status": contractor.kyc_status,
        "ai_validation": ai_validation,
        "message": "KYC verified and approved automatically." if ai_validation["is_approved"] else "KYC submitted. Pending officer document verification."
    }


@router.get("/my-bids")
def get_my_submitted_bids(
    current_user: User = Depends(require_roles(["CONTRACTOR", "SUPER_ADMIN"])),
    db: Session = Depends(get_db)
):
    """Returns all bids submitted by the logged-in contractor."""
    contractor = db.query(ContractorProfile).filter(ContractorProfile.user_id == current_user.id).first()
    if not contractor:
        return []

    bids = db.query(Bid).filter(Bid.contractor_id == contractor.id).order_by(Bid.created_at.desc()).all()
    results = []
    for b in bids:
        tender = db.query(Tender).filter(Tender.id == b.tender_id).first()
        results.append({
            "bid_id": b.id,
            "tender_id": b.tender_id,
            "tender_title": tender.title if tender else "N/A",
            "department": tender.department if tender else "N/A",
            "tender_cost": tender.estimated_cost if tender else 0,
            "quoted_amount": b.quoted_amount,
            "technical_status": b.technical_status,
            "financial_rank": b.financial_rank,
            "status": b.status,
            "created_at": b.created_at.strftime("%Y-%m-%d %H:%M") if b.created_at else None
        })
    return results


@router.get("/my-work-orders")
def get_my_work_orders(
    current_user: User = Depends(require_roles(["CONTRACTOR", "SUPER_ADMIN"])),
    db: Session = Depends(get_db)
):
    """Returns active government Work Orders assigned to this contractor."""
    contractor = db.query(ContractorProfile).filter(ContractorProfile.user_id == current_user.id).first()
    if not contractor:
        # If admin or no contractor profile, show all work orders
        work_orders = db.query(WorkOrder).order_by(WorkOrder.awarded_date.desc()).all()
    else:
        work_orders = db.query(WorkOrder).filter(WorkOrder.contractor_id == contractor.id).order_by(WorkOrder.awarded_date.desc()).all()

    results = []
    for wo in work_orders:
        tender = db.query(Tender).filter(Tender.id == wo.tender_id).first()
        work = db.query(Work).filter(Work.work_id == wo.work_id).first()
        results.append({
            "id": wo.id,
            "tender_id": wo.tender_id,
            "work_id": wo.work_id,
            "project_title": tender.title if tender else (work.work_description if work else "Public Work"),
            "district": tender.district if tender else (work.district if work else "Varanasi"),
            "sanctioned_amount": wo.sanctioned_amount,
            "current_progress_pct": wo.current_progress_pct,
            "awarded_date": wo.awarded_date.strftime("%Y-%m-%d") if wo.awarded_date else None,
            "target_completion_date": wo.target_completion_date.strftime("%Y-%m-%d") if wo.target_completion_date else None,
            "status": wo.status
        })
    return results


@router.post("/work-orders/{work_order_id}/update-progress")
def update_work_order_progress(
    work_order_id: str,
    req: ProgressUpdateRequest,
    current_user: User = Depends(require_roles(["CONTRACTOR", "SUPER_ADMIN"])),
    db: Session = Depends(get_db)
):
    """Contractor records physical progress milestone."""
    wo = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work Order not found")

    if current_user.role != "SUPER_ADMIN":
        contractor = db.query(ContractorProfile).filter(ContractorProfile.user_id == current_user.id).first()
        if not contractor or wo.contractor_id != contractor.id:
            raise HTTPException(status_code=403, detail="Forbidden: You can only update progress on your own work orders.")

    new_pct = min(100.0, max(0.0, req.progress_percentage))
    wo.current_progress_pct = new_pct
    
    if new_pct >= 100.0:
        wo.status = "COMPLETED"
    elif new_pct > 0:
        wo.status = "IN_PROGRESS"

    # Also update master work progress and expenditure
    if wo.work_id:
        master_work = db.query(Work).filter(Work.work_id == wo.work_id).first()
        if master_work:
            master_work.completion_percentage = new_pct
            master_work.total_expenditure = round(master_work.sanctioned_amount * (new_pct / 100.0), 2)
            wo.expenditure_disbursed = master_work.total_expenditure
            if new_pct >= 100.0:
                master_work.status = "COMPLETED"
            elif new_pct > 0:
                master_work.status = "IN_PROGRESS"

            # Generate running bill / milestone payment request in operations.db
            try:
                from backend.app.db.operations_db import create_payment_request
                contractor = db.query(ContractorProfile).filter(ContractorProfile.id == wo.contractor_id).first()
                firm = contractor.firm_name if contractor else "Contractor"
                milestone_amt = round(master_work.sanctioned_amount * (new_pct / 100.0), 2)
                create_payment_request(
                    project_id=wo.work_id,
                    amount=milestone_amt,
                    contractor_agency=firm,
                    invoice_reference=f"BILL-{wo.id}-P{int(new_pct)}",
                    category="RUNNING_BILL",
                    milestone_id=f"MILESTONE_{int(new_pct)}",
                    requested_by=current_user.full_name or firm,
                    user_role="Contractor",
                    remarks=f"Running bill claim for achievement of {new_pct}% physical milestone on Work Order {wo.id}."
                )
            except Exception as e:
                print(f"Warning: could not create milestone payment: {e}")

    db.commit()

    # Invalidate data service cache
    try:
        from backend.app.services.data_service import invalidate_cache
        invalidate_cache()
    except Exception:
        pass

    return {
        "status": "SUCCESS",
        "work_order_id": wo.id,
        "new_progress_pct": wo.current_progress_pct,
        "work_status": wo.status,
        "message": f"Progress updated to {new_pct}% successfully. Master monitoring dashboard and running bill synchronized."
    }


@router.post("/work-orders/{work_order_id}/verify-photo")
async def verify_work_order_photo(
    work_order_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles(["CONTRACTOR", "DISTRICT_COLLECTOR", "SUPER_ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Extracts EXIF GPS coordinates from uploaded milestone photo and checks
    anti-tamper geofencing (must be within 50m of project location).
    """
    wo = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work Order not found")

    work = db.query(Work).filter(Work.work_id == wo.work_id).first()
    target_lat = work.latitude if (work and work.latitude) else 25.3176
    target_lon = work.longitude if (work and work.longitude) else 82.9739

    contents = await file.read()
    verification = verify_photo_exif_geofence(contents, target_lat, target_lon, max_distance_meters=50.0)

    return {
        "filename": file.filename,
        "work_order_id": work_order_id,
        "verification_result": verification
    }
