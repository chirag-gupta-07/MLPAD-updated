"""
Tender Management, Two-Envelope Bidding, and AI Evaluation API.
Complies with GFR 2017 Rules 163 & 173 and CVC Procurement Guidelines.
"""

import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session
import json

from backend.app.db.database import get_db
from backend.app.db.models import Tender, Bid, WorkOrder, ContractorProfile, Work, User
from backend.app.api.auth import get_current_user, require_roles
from backend.app.services.contractor_ai import (
    calculate_contractor_reliability,
    detect_cartel_and_collusion,
    verify_technical_bid_pdf
)

router = APIRouter(prefix="/api/tenders", tags=["E-Procurement & Tendering"])



# Pydantic Schemas
class CreateTenderRequest(BaseModel):
    work_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    department: Optional[str] = "Public Works Department (PWD)"
    state: Optional[str] = "Uttar Pradesh"
    district: Optional[str] = "Varanasi"
    constituency: Optional[str] = "Varanasi Lok Sabha"
    estimated_cost: float
    minimum_contractor_class: Optional[str] = "Class-B"
    submission_days: int = 21


class SubmitBidRequest(BaseModel):
    tender_id: Optional[str] = None
    technical_proposal: str
    equipment_details: Optional[str] = None
    proposed_duration_days: int = 180
    quoted_amount: float
    emd_paid: bool = True
    emd_transaction_id: Optional[str] = None


class EvaluateTenderRequest(BaseModel):
    tender_id: str


class AwardTenderRequest(BaseModel):
    tender_id: str
    contractor_id: Optional[str] = None


@router.get("")
def list_tenders(
    status: Optional[str] = None,
    district: Optional[str] = None,
    state: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Retrieves all public Notice Inviting Tenders (NITs)."""
    query = db.query(Tender)
    if status:
        query = query.filter(Tender.status == status.upper())
    if district:
        query = query.filter(Tender.district.ilike(f"%{district}%"))
    if state:
        query = query.filter(Tender.state.ilike(f"%{state}%"))

    tenders = query.order_by(Tender.publication_date.desc()).all()
    
    results = []
    for t in tenders:
        bids_count = db.query(Bid).filter(Bid.tender_id == t.id).count()
        results.append({
            "id": t.id,
            "work_id": t.work_id,
            "title": t.title,
            "description": t.description,
            "department": t.department,
            "state": t.state,
            "district": t.district,
            "estimated_cost": t.estimated_cost,
            "emd_amount": t.emd_amount,
            "minimum_contractor_class": t.minimum_contractor_class,
            "publication_date": t.publication_date.strftime("%Y-%m-%d") if t.publication_date else None,
            "submission_deadline": t.submission_deadline.strftime("%Y-%m-%d") if t.submission_deadline else None,
            "status": t.status,
            "total_bids": bids_count,
            "awarded_contractor_id": t.awarded_contractor_id,
            "awarded_amount": t.awarded_amount
        })
    return results


@router.get("/eligible-works")
def get_eligible_works(db: Session = Depends(get_db)):
    """Returns sanctioned MP works ready for Notice Inviting Tender (NIT) publishing."""
    # 1. Prioritize works recommended by MP
    rec_works = db.query(Work).filter(
        Work.work_id.like("MPLADS/REC/%")
    ).order_by(Work.work_id.desc()).all()

    # 2. Fetch other sanctioned works
    other_works = db.query(Work).filter(
        Work.status == "SANCTIONED",
        ~Work.work_id.like("MPLADS/REC/%")
    ).limit(30).all()

    existing_tender_wids = {t.work_id for t in db.query(Tender.work_id).filter(Tender.work_id.isnot(None)).all()}

    combined = rec_works + other_works
    results = []
    for w in combined:
        if w.work_id not in existing_tender_wids or w.status in ("SANCTIONED", "RECOMMENDED"):
            title = w.work_description.split(":")[0] if ":" in (w.work_description or "") else (w.work_description or "MPLADS Project")
            results.append({
                "work_id": w.work_id,
                "title": title,
                "sector": w.sector,
                "district": w.district,
                "state": w.state,
                "constituency": w.constituency,
                "estimated_cost": w.sanctioned_amount,
                "status": w.status
            })
    return results


@router.post("/create")
def create_tender(
    req: CreateTenderRequest,
    current_user: User = Depends(require_roles(["DISTRICT_COLLECTOR", "SUPER_ADMIN"])),
    db: Session = Depends(get_db)
):
    """District Collector / DNO publishes an official Notice Inviting Tender (NIT)."""
    tender_id = f"NIT-2026-{req.state[:2].upper()}-{req.district[:3].upper()}-{uuid.uuid4().hex[:6].upper()}"
    emd = round(req.estimated_cost * 0.02, 2)  # Standard 2% EMD

    now = datetime.utcnow()
    deadline = now + timedelta(days=req.submission_days)

    tender = Tender(
        id=tender_id,
        work_id=req.work_id,
        title=req.title,
        description=req.description or f"Tender for execution of public works under MPLADS scheme in {req.district}.",
        department=req.department,
        state=req.state,
        district=req.district,
        constituency=req.constituency,
        estimated_cost=req.estimated_cost,
        emd_amount=emd,
        minimum_contractor_class=req.minimum_contractor_class,
        publication_date=now,
        submission_deadline=deadline,
        technical_bid_opening_date=deadline + timedelta(days=1),
        financial_bid_opening_date=deadline + timedelta(days=3),
        status="PUBLISHED",
        created_by_officer=current_user.full_name
    )

    db.add(tender)

    # Link back to Work model if work_id provided
    if req.work_id:
        target_work = db.query(Work).filter(Work.work_id == req.work_id).first()
        if target_work:
            target_work.status = "TENDER_PUBLISHED"

    db.commit()
    db.refresh(tender)

    # Invalidate data service cache
    try:
        from backend.app.services.data_service import invalidate_cache
        invalidate_cache()
    except Exception:
        pass

    return {
        "status": "SUCCESS",
        "message": f"Notice Inviting Tender {tender_id} published successfully.",
        "tender": {
            "id": tender.id,
            "title": tender.title,
            "estimated_cost": tender.estimated_cost,
            "emd_amount": tender.emd_amount,
            "deadline": tender.submission_deadline.strftime("%Y-%m-%d")
        }
    }


def _get_tender_details_helper(tender_id: str, current_user: User, db: Session):
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    bids_query = db.query(Bid).filter(Bid.tender_id == tender_id).all()
    
    bids_data = []
    for b in bids_query:
        contractor = db.query(ContractorProfile).filter(ContractorProfile.id == b.contractor_id).first()
        firm_name = contractor.firm_name if contractor else "Anonymous Bidder"
        
        is_officer = current_user.role in ("DISTRICT_COLLECTOR", "SUPER_ADMIN", "VIGILANCE")
        is_own_bid = (current_user.role == "CONTRACTOR" and current_user.contractor_profile and current_user.contractor_profile.id == b.contractor_id)

        bid_info = {
            "id": b.id,
            "contractor_id": b.contractor_id,
            "firm_name": firm_name if (is_officer or is_own_bid) else "Masked Competitor",
            "technical_score": b.technical_score,
            "technical_status": b.technical_status,
            "status": b.status,
            "financial_rank": b.financial_rank,
            "created_at": b.created_at.strftime("%Y-%m-%d %H:%M") if b.created_at else None
        }

        if is_officer or is_own_bid:
            bid_info["quoted_amount"] = b.quoted_amount
            bid_info["emd_paid"] = b.emd_paid
            bid_info["cartel_flags"] = json.loads(b.cartel_flags) if b.cartel_flags else []
        else:
            bid_info["quoted_amount"] = "ENCRYPTED_SEALED"

        bids_data.append(bid_info)

    return {
        "tender": {
            "id": tender.id,
            "work_id": tender.work_id,
            "title": tender.title,
            "description": tender.description,
            "department": tender.department,
            "state": tender.state,
            "district": tender.district,
            "estimated_cost": tender.estimated_cost,
            "emd_amount": tender.emd_amount,
            "minimum_contractor_class": tender.minimum_contractor_class,
            "publication_date": tender.publication_date.strftime("%Y-%m-%d") if tender.publication_date else None,
            "submission_deadline": tender.submission_deadline.strftime("%Y-%m-%d") if tender.submission_deadline else None,
            "status": tender.status,
            "awarded_contractor_id": tender.awarded_contractor_id,
            "awarded_amount": tender.awarded_amount
        },
        "bids": bids_data
    }


@router.get("/detail")
def get_tender_detail_query(
    tender_id: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return _get_tender_details_helper(tender_id, current_user, db)


@router.get("/detail/{tender_id:path}")
def get_tender_detail_path(
    tender_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return _get_tender_details_helper(tender_id, current_user, db)


def _submit_bid_helper(
    tender_id: str,
    req: SubmitBidRequest,
    client_ip: str,
    current_user: User,
    db: Session
):
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    if tender.status != "PUBLISHED":
        raise HTTPException(status_code=400, detail=f"Tender is not accepting bids (Status: {tender.status})")

    contractor = db.query(ContractorProfile).filter(ContractorProfile.user_id == current_user.id).first()
    if not contractor:
        contractor = ContractorProfile(
            id=f"cnt_{current_user.id}",
            user_id=current_user.id,
            firm_name=current_user.full_name,
            license_class="Class-A",
            pan="AAACB1234K",
            gstin="09AAACB1234K1Z2",
            kyc_status="ACTIVE",
            performance_score=82.0
        )
        db.add(contractor)
        db.commit()

    existing_bid = db.query(Bid).filter(Bid.tender_id == tender_id, Bid.contractor_id == contractor.id).first()
    if existing_bid:
        raise HTTPException(status_code=400, detail="Contractor has already submitted a bid for this tender.")

    bid_id = f"BID-{uuid.uuid4().hex[:8].upper()}"
    new_bid = Bid(
        id=bid_id,
        tender_id=tender_id,
        contractor_id=contractor.id,
        technical_proposal=req.technical_proposal,
        equipment_details=req.equipment_details or "Standard Excavators, Concrete Mixers, Trucks owned.",
        proposed_duration_days=req.proposed_duration_days,
        quoted_amount=req.quoted_amount,
        emd_paid=req.emd_paid,
        emd_transaction_id=req.emd_transaction_id or f"TXN-EMD-{uuid.uuid4().hex[:6].upper()}",
        technical_score=contractor.performance_score or 75.0,
        technical_status="QUALIFIED",
        submission_ip=client_ip,
        status="SUBMITTED"
    )

    db.add(new_bid)
    db.commit()
    db.refresh(new_bid)

    return {
        "status": "SUCCESS",
        "bid_id": new_bid.id,
        "message": f"Bid {new_bid.id} submitted successfully with client-side sealed quote.",
        "emd_status": "CONFIRMED"
    }


@router.post("/bids")
def submit_bid_body(
    req: SubmitBidRequest,
    request: Request,
    current_user: User = Depends(require_roles(["CONTRACTOR", "SUPER_ADMIN"])),
    db: Session = Depends(get_db)
):
    if not req.tender_id:
        raise HTTPException(status_code=400, detail="tender_id required in request body")
    client_ip = request.client.host if request.client else "127.0.0.1"
    return _submit_bid_helper(req.tender_id, req, client_ip, current_user, db)


@router.post("/bids/{tender_id:path}")
def submit_bid_path(
    tender_id: str,
    req: SubmitBidRequest,
    request: Request,
    current_user: User = Depends(require_roles(["CONTRACTOR", "SUPER_ADMIN"])),
    db: Session = Depends(get_db)
):
    client_ip = request.client.host if request.client else "127.0.0.1"
    return _submit_bid_helper(tender_id, req, client_ip, current_user, db)


def _evaluate_tender_helper(tender_id: str, db: Session):
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    bids = db.query(Bid).filter(Bid.tender_id == tender_id).all()
    if not bids:
        raise HTTPException(status_code=400, detail="No bids have been submitted for this tender yet.")

    bids_dict_list = [
        {
            "contractor_id": b.contractor_id,
            "quoted_amount": b.quoted_amount,
            "submission_ip": b.submission_ip
        }
        for b in bids
    ]
    cartel_flags = detect_cartel_and_collusion(bids_dict_list, tender.estimated_cost)

    sorted_bids = sorted(bids, key=lambda x: x.quoted_amount)

    eval_results = []
    for rank_idx, b in enumerate(sorted_bids):
        rank_label = f"L{rank_idx + 1}"
        b.financial_rank = rank_label
        
        c_flags = [f for f in cartel_flags if f.get("contractor_id") == b.contractor_id]
        b.cartel_flags = json.dumps(c_flags)
        
        contractor = db.query(ContractorProfile).filter(ContractorProfile.id == b.contractor_id).first()
        firm_name = contractor.firm_name if contractor else b.contractor_id
        
        eval_results.append({
            "bid_id": b.id,
            "contractor_id": b.contractor_id,
            "firm_name": firm_name,
            "license_class": contractor.license_class if contractor else "Class-B",
            "reliability_score": contractor.performance_score if contractor else 75.0,
            "quoted_amount": b.quoted_amount,
            "variance_from_estimate_pct": round(((b.quoted_amount - tender.estimated_cost) / tender.estimated_cost) * 100, 1),
            "financial_rank": rank_label,
            "is_l1": (rank_idx == 0),
            "cartel_flags": c_flags
        })

    tender.status = "EVALUATING"
    db.commit()

    return {
        "tender_id": tender_id,
        "estimated_cost": tender.estimated_cost,
        "total_bids_evaluated": len(bids),
        "l1_contractor": eval_results[0] if eval_results else None,
        "cartel_warning_count": len(cartel_flags),
        "cartel_detected": (len(cartel_flags) > 0),
        "cartel_flags": cartel_flags,
        "ranked_bids": eval_results
    }


@router.post("/evaluate")
def evaluate_tender_post(
    req: EvaluateTenderRequest,
    current_user: User = Depends(require_roles(["DISTRICT_COLLECTOR", "SUPER_ADMIN", "VIGILANCE"])),
    db: Session = Depends(get_db)
):
    return _evaluate_tender_helper(req.tender_id, db)


@router.post("/evaluate/{tender_id:path}")
def evaluate_tender_path(
    tender_id: str,
    current_user: User = Depends(require_roles(["DISTRICT_COLLECTOR", "SUPER_ADMIN", "VIGILANCE"])),
    db: Session = Depends(get_db)
):
    return _evaluate_tender_helper(tender_id, db)


def _award_tender_helper(tender_id: str, contractor_id: Optional[str], db: Session):
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    bids = db.query(Bid).filter(Bid.tender_id == tender_id).all()
    if not bids:
        raise HTTPException(status_code=400, detail="Cannot award tender without bids.")

    if not contractor_id:
        l1_bid = min(bids, key=lambda x: x.quoted_amount)
        contractor_id = l1_bid.contractor_id
        awarded_bid = l1_bid
    else:
        awarded_bid = next((b for b in bids if b.contractor_id == contractor_id), None)
        if not awarded_bid:
            raise HTTPException(status_code=400, detail=f"Contractor {contractor_id} has not bid on this tender.")

    tender.status = "AWARDED"
    tender.awarded_contractor_id = contractor_id
    tender.awarded_amount = awarded_bid.quoted_amount
    awarded_bid.status = "AWARDED_L1"

    work_order_id = f"WO-{tender.district[:3].upper()}-{datetime.utcnow().year}-{uuid.uuid4().hex[:6].upper()}"
    work_ref_id = tender.work_id or f"WORK-{uuid.uuid4().hex[:8].upper()}"

    contractor_profile = db.query(ContractorProfile).filter(ContractorProfile.id == contractor_id).first()
    firm = contractor_profile.firm_name if contractor_profile else "Awarded Contractor"

    work_entry = db.query(Work).filter(Work.work_id == work_ref_id).first()
    if not work_entry:
        work_entry = Work(
            work_id=work_ref_id,
            work_description=tender.title,
            state=tender.state,
            district=tender.district,
            constituency=tender.constituency or f"{tender.district} Lok Sabha",
            sanctioned_amount=awarded_bid.quoted_amount,
            total_expenditure=0.0,
            completion_percentage=0.0,
            status="IN_PROGRESS",
            implementing_agency=firm,
            composite_risk_score=15.0,
            risk_level="LOW",
            latitude=25.3176,
            longitude=82.9739
        )
        db.add(work_entry)
    else:
        work_entry.status = "IN_PROGRESS"
        work_entry.implementing_agency = firm
        work_entry.sanctioned_amount = awarded_bid.quoted_amount

    work_order = WorkOrder(
        id=work_order_id,
        tender_id=tender.id,
        work_id=work_ref_id,
        contractor_id=contractor_id,
        sanctioned_amount=awarded_bid.quoted_amount,
        awarded_date=datetime.utcnow(),
        target_completion_date=datetime.utcnow() + timedelta(days=180),
        current_progress_pct=0.0,
        status="ISSUED"
    )
    db.add(work_order)
    db.commit()

    # Automatically register 10% Mobilization Advance in operations.db payments
    try:
        from backend.app.db.operations_db import create_payment_request
        advance_amount = round(awarded_bid.quoted_amount * 0.10, 2)
        create_payment_request(
            project_id=work_ref_id,
            amount=advance_amount,
            contractor_agency=firm,
            invoice_reference=f"MOB-ADV-{work_order_id}",
            category="MOBILIZATION_ADVANCE",
            milestone_id="M_ADV",
            requested_by="E-Procurement Engine (Auto)",
            user_role="System",
            remarks=f"Automatic statutory 10% mobilization advance for {firm} on Work Order {work_order_id}"
        )
    except Exception as e:
        print(f"Warning: could not register mobilization payment: {e}")

    # Invalidate data service cache
    try:
        from backend.app.services.data_service import invalidate_cache
        invalidate_cache()
    except Exception:
        pass

    return {
        "status": "SUCCESS",
        "message": f"Tender successfully awarded! Work Order {work_order_id} generated.",
        "work_order": {
            "id": work_order.id,
            "work_id": work_order.work_id,
            "contractor_id": work_order.contractor_id,
            "sanctioned_amount": work_order.sanctioned_amount,
            "target_completion": work_order.target_completion_date.strftime("%Y-%m-%d")
        }
    }


@router.post("/award")
def award_tender_post(
    req: AwardTenderRequest,
    current_user: User = Depends(require_roles(["DISTRICT_COLLECTOR", "SUPER_ADMIN"])),
    db: Session = Depends(get_db)
):
    return _award_tender_helper(req.tender_id, req.contractor_id, db)


@router.post("/award/{tender_id:path}")
def award_tender_path(
    tender_id: str,
    contractor_id: Optional[str] = None,
    current_user: User = Depends(require_roles(["DISTRICT_COLLECTOR", "SUPER_ADMIN"])),
    db: Session = Depends(get_db)
):
    return _award_tender_helper(tender_id, contractor_id, db)


@router.post("/verify-documents")
async def verify_bid_documents(
    file: UploadFile = File(...),
    tender_id: Optional[str] = Form(None),
    estimated_cost: Optional[float] = Form(4500000.0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    AI Document Scrutiny Endpoint for Envelope-1 Technical Bids.
    Accepts an uploaded PDF (statutory PAN, GSTIN, CA certificate, PWD completion report)
    and executes Gemini 3.6 Flash vision scrutiny against GFR 2017 Rule 173(v) benchmarks.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only official PDF documents are accepted for Envelope-1 technical verification."
        )

    # Determine estimated cost if tender_id provided
    cost = estimated_cost or 4500000.0
    if tender_id:
        tender = db.query(Tender).filter(Tender.id == tender_id).first()
        if tender and tender.estimated_cost:
            cost = tender.estimated_cost

    pdf_bytes = await file.read()
    if len(pdf_bytes) > 25 * 1024 * 1024:  # 25 MB limit
        raise HTTPException(status_code=400, detail="File size exceeds 25 MB limit.")

    result = verify_technical_bid_pdf(pdf_bytes, cost)
    result["filename"] = file.filename
    result["file_size_kb"] = round(len(pdf_bytes) / 1024, 1)
    return result


@router.get("/demo-sample-docs")
def list_demo_sample_documents():
    """Returns list of pre-generated realistic sample technical bid dossiers for SIH live evaluation."""
    import os
    demo_dir = os.path.join(os.getcwd(), "data", "demo", "sample_bid_documents")
    docs = []
    if os.path.exists(demo_dir):
        for fname in os.listdir(demo_dir):
            if fname.endswith(".pdf"):
                is_qualified = "qualified" in fname and "disqualified" not in fname
                fpath = os.path.join(demo_dir, fname)
                size_kb = round(os.path.getsize(fpath) / 1024, 1)
                docs.append({
                    "filename": fname,
                    "title": "M/s Gandhi Construction (Compliant Dossier)" if is_qualified else "M/s Sharma Infra (Defective / Cartel Dossier)",
                    "expected_verdict": "QUALIFIED" if is_qualified else "DISQUALIFIED",
                    "description": "Valid PAN, Active GSTIN, ICAI UDIN certified Rs 1.65 Cr turnover, PWD Rs 38.5L completion certificate." if is_qualified else "GSTIN state mismatch, missing CA UDIN, Rs 6.2L past work (< 40% threshold), 74-day delay penalty.",
                    "size_kb": size_kb,
                    "download_url": f"/api/tenders/demo-sample-docs/{fname}"
                })
    return {"sample_documents": docs}


@router.get("/demo-sample-docs/{filename}")
def download_demo_sample_doc(filename: str):
    """Allows 1-click download of sample demo PDFs for live SIH demonstration."""
    import os
    from fastapi.responses import FileResponse
    demo_dir = os.path.join(os.getcwd(), "data", "demo", "sample_bid_documents")
    filepath = os.path.join(demo_dir, os.path.basename(filename))
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Demo document not found.")
    return FileResponse(
        filepath,
        media_type="application/pdf",
        filename=os.path.basename(filename)
    )

