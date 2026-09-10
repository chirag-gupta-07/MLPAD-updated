from fastapi import APIRouter, HTTPException, Query, Body, Depends
from typing import Optional, Dict, Any, List
from backend.app.db.operations_db import (
    ensure_project_operations,
    record_agency_supply, get_agency_supply, get_agency_contracts,
    record_site_transaction, get_site_inventory, get_site_inventory_transactions,
    get_material_reconciliation
)
from backend.app.db.models import User
from backend.app.api.auth import get_current_user, require_roles

router = APIRouter(prefix="/api/inventory", tags=["Inventory"])

@router.post("/agency-supply")
async def record_supply(
    contract_id: int = Body(...),
    project_id: str = Body(...),
    material_name: str = Body(...),
    unit: str = Body(...),
    contracted_quantity: float = Body(...),
    supplied_quantity: float = Body(0),
    delivery_date: Optional[str] = Body(None),
    delivery_reference: Optional[str] = Body(None),
    supplier_name: Optional[str] = Body(None),
    invoice_reference: Optional[str] = Body(None),
    contracted_rate: Optional[float] = Body(None),
    actual_rate: Optional[float] = Body(None),
    quality_document: Optional[str] = Body(None),
    verification_status: Optional[str] = Body(None),
    current_user: User = Depends(require_roles(["CONTRACTOR", "DISTRICT_COLLECTOR", "SUPER_ADMIN"]))
) -> Dict[str, Any]:
    """Record agency supply delivery."""
    try:
        row_id = record_agency_supply(
            contract_id=contract_id,
            project_id=project_id,
            material_name=material_name,
            unit=unit,
            contracted_quantity=contracted_quantity,
            supplied_quantity=supplied_quantity,
            delivery_date=delivery_date,
            delivery_reference=delivery_reference,
            supplier_name=supplier_name,
            invoice_reference=invoice_reference,
            contracted_rate=contracted_rate,
            actual_rate=actual_rate,
            quality_document=quality_document,
            verification_status="PENDING"
        )
        return {"status": "success", "id": row_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/agency-supply")
async def list_agency_supply_query(project_id: str = Query(...)) -> List[Dict[str, Any]]:
    """Get agency supply records by query param."""
    ensure_project_operations(project_id)
    return get_agency_supply(project_id)

@router.get("/agency-supply/project/{project_id:path}")
async def list_agency_supply_path(project_id: str) -> List[Dict[str, Any]]:
    """Get agency supply records by path."""
    ensure_project_operations(project_id)
    return get_agency_supply(project_id)

@router.get("/contracts")
async def list_agency_contracts_query(project_id: str = Query(...)) -> List[Dict[str, Any]]:
    """Get agency contracts by query param."""
    ensure_project_operations(project_id)
    return get_agency_contracts(project_id)

@router.get("/contracts/project/{project_id:path}")
async def list_agency_contracts_path(project_id: str) -> List[Dict[str, Any]]:
    """Get agency contracts by path."""
    ensure_project_operations(project_id)
    return get_agency_contracts(project_id)

@router.post("/site-transaction")
async def record_transaction(
    project_id: str = Body(...),
    material_name: str = Body(...),
    unit: str = Body(...),
    date: str = Body(...),
    transaction_type: str = Body(...),
    quantity: float = Body(...),
    reference_note: Optional[str] = Body(None),
    recorded_by: Optional[str] = Body(None),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Record site inventory transaction."""
    try:
        row_id = record_site_transaction(
            project_id=project_id,
            material_name=material_name,
            unit=unit,
            date=date,
            transaction_type=transaction_type,
            quantity=quantity,
            reference_note=reference_note,
            recorded_by=current_user.full_name
        )
        return {"status": "success", "id": row_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/site")
async def site_inventory_query(project_id: str = Query(...)) -> List[Dict[str, Any]]:
    """Get current site inventory balances by query param."""
    ensure_project_operations(project_id)
    return get_site_inventory(project_id)

@router.get("/site/project/{project_id:path}")
async def site_inventory_path(project_id: str) -> List[Dict[str, Any]]:
    """Get current site inventory balances by path."""
    ensure_project_operations(project_id)
    return get_site_inventory(project_id)

@router.get("/transactions")
async def site_transactions_query(
    project_id: str = Query(...),
    material: Optional[str] = Query(None),
    limit: int = Query(100, ge=1)
) -> List[Dict[str, Any]]:
    """Get transaction ledger by query param."""
    ensure_project_operations(project_id)
    return get_site_inventory_transactions(project_id, material, limit)

@router.get("/site/project/{project_id:path}/transactions")
async def site_transactions_path(
    project_id: str,
    material: Optional[str] = Query(None),
    limit: int = Query(100, ge=1)
) -> List[Dict[str, Any]]:
    """Get transaction ledger by path."""
    ensure_project_operations(project_id)
    return get_site_inventory_transactions(project_id, material, limit)

@router.get("/reconciliation")
async def material_reconciliation_query(project_id: str = Query(...)) -> List[Dict[str, Any]]:
    """Get material reconciliation report by query param."""
    ensure_project_operations(project_id)
    return get_material_reconciliation(project_id)

@router.get("/reconciliation/project/{project_id:path}")
async def material_reconciliation_path(project_id: str) -> List[Dict[str, Any]]:
    """Get material reconciliation report by path."""
    ensure_project_operations(project_id)
    return get_material_reconciliation(project_id)
