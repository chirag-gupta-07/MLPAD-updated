from fastapi import APIRouter, HTTPException, Query, Body
from typing import Optional, Dict, Any, List
from backend.app.db.operations_db import (
    ensure_project_operations,
    create_payment_request, get_payments, get_payment_by_id, take_payment_action, get_payment_actions
)

router = APIRouter(prefix="/api/payments", tags=["Payments"])

@router.post("/request")
async def request_payment(
    project_id: str = Body(...),
    amount: float = Body(...),
    contractor_agency: Optional[str] = Body(None),
    invoice_reference: Optional[str] = Body(None),
    date: Optional[str] = Body(None),
    category: Optional[str] = Body(None),
    milestone_id: Optional[str] = Body(None),
    supporting_documents: Optional[List[Dict[str, Any]]] = Body(None),
    requested_by: Optional[str] = Body("System"),
    user_role: Optional[str] = Body("Contractor"),
    remarks: Optional[str] = Body(None)
) -> Dict[str, Any]:
    """Submit payment request."""
    try:
        row_id = create_payment_request(
            project_id=project_id,
            amount=amount,
            contractor_agency=contractor_agency,
            invoice_reference=invoice_reference,
            date=date,
            category=category,
            milestone_id=milestone_id,
            supporting_documents=supporting_documents,
            requested_by=requested_by,
            user_role=user_role,
            remarks=remarks
        )
        return {"status": "success", "id": row_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("", include_in_schema=False)
@router.get("/")
async def list_payments(
    project_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1)
) -> List[Dict[str, Any]]:
    """List payments."""
    if project_id:
        ensure_project_operations(project_id)
    return get_payments(project_id, status, limit)

@router.get("/{payment_id}")
async def get_payment(payment_id: int) -> Dict[str, Any]:
    """Get payment details with action history."""
    payment = get_payment_by_id(payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    actions = get_payment_actions(payment_id=payment_id)
    payment["actions"] = actions
    return payment

@router.post("/{payment_id}/action")
async def action_on_payment(
    payment_id: int,
    user_name: str = Body(...),
    user_role: str = Body(...),
    action: str = Body(...),
    new_status: str = Body(...),
    remarks: Optional[str] = Body(None),
    transaction_reference: Optional[str] = Body(None)
) -> Dict[str, Any]:
    """Take payment action."""
    try:
        return take_payment_action(
            payment_id=payment_id,
            user_name=user_name,
            user_role=user_role,
            action=action,
            new_status=new_status,
            remarks=remarks,
            transaction_reference=transaction_reference
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/project/{project_id}")
async def project_payment_history(project_id: str) -> List[Dict[str, Any]]:
    """Payment history for project."""
    return get_payments(project_id=project_id)
