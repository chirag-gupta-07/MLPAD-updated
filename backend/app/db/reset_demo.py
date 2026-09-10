"""
Master Reset Utility for MPLADS Risk Intelligence Platform.
Restores all operational, lifecycle, and citizen evidence databases to their
pristine demonstration state for presentations and judging.
"""

import logging
import sqlite3
from pathlib import Path
from backend.app.db.operations_db import get_connection as get_operations_conn, init_operations_db
from backend.app.db.lifecycle_db import get_connection as get_lifecycle_conn, init_lifecycle_db
from backend.app.db.citizen_evidence_db import get_connection as get_evidence_conn, init_db as init_evidence_db
from backend.app.db.seed_operations import seed_demo_operations
from backend.app.db.seed_scenarios import seed_demo_scenarios
from backend.app.services.citizen_evidence_service import seed_demo_citizen_evidence

logger = logging.getLogger(__name__)

OPERATIONS_TABLES = [
    "site_attendance",
    "daily_work_updates",
    "site_inventory_transactions",
    "agency_supply_records",
    "agency_contracts",
    "responsible_persons",
    "approval_actions",
    "project_approvals",
    "payment_actions",
    "payments",
    "development_requests",
    "operations_audit_log"
]

LIFECYCLE_TABLES = [
    "audit_logs",
    "citizen_complaints",
    "field_inspections",
    "site_checkins",
    "daily_updates",
    "material_ledger",
    "project_milestones",
    "project_scopes"
]

EVIDENCE_TABLES = [
    "citizen_evidence"
]


def reset_all_databases_to_demo_state() -> dict:
    """
    Clears all test transactions and reseeds baseline demo data across all databases.
    Returns status summary.
    """
    logger.info("Initiating full reset to original presentation demo state...")

    # 1. Reset Operations DB
    init_operations_db()
    with get_operations_conn() as conn:
        cursor = conn.cursor()
        for tbl in OPERATIONS_TABLES:
            try:
                cursor.execute(f"DELETE FROM {tbl};")
            except Exception as e:
                logger.warning(f"Could not clear table {tbl}: {e}")
        conn.commit()

    # 2. Reset Lifecycle DB
    init_lifecycle_db()
    with get_lifecycle_conn() as conn:
        cursor = conn.cursor()
        for tbl in LIFECYCLE_TABLES:
            try:
                cursor.execute(f"DELETE FROM {tbl};")
            except Exception as e:
                logger.warning(f"Could not clear table {tbl}: {e}")
        conn.commit()

    # 3. Reset Citizen Evidence DB
    init_evidence_db()
    with get_evidence_conn() as conn:
        cursor = conn.cursor()
        for tbl in EVIDENCE_TABLES:
            try:
                cursor.execute(f"DELETE FROM {tbl};")
            except Exception as e:
                logger.warning(f"Could not clear table {tbl}: {e}")
        conn.commit()

    # 4. Reset Relational Tenders and Bids to unawarded demonstration state
    try:
        from backend.app.db.database import SessionLocal
        from backend.app.db.models import Tender, Bid, WorkOrder, Work
        from datetime import datetime, timedelta

        db = SessionLocal()
        try:
            # Remove all work orders generated during demo awards
            db.query(WorkOrder).delete(synchronize_session=False)

            # Delete custom tenders and bids created during ad-hoc testing, keeping standard baseline demo tenders
            standard_tender_ids = ["NIT/2026/UP/VAR/0042", "NIT/2026/UP/VAR/0089"]
            db.query(Bid).filter(~Bid.tender_id.in_(standard_tender_ids)).delete(synchronize_session=False)
            ad_hoc_tenders = db.query(Tender).filter(~Tender.id.in_(standard_tender_ids)).all()
            for at in ad_hoc_tenders:
                db.delete(at)

            # Reset Standard Tender 1 (Basantpur Road)
            t1 = db.query(Tender).filter(Tender.id == "NIT/2026/UP/VAR/0042").first()
            if t1:
                t1.status = "PUBLISHED"
                t1.awarded_contractor_id = None
                t1.awarded_amount = None

            # Reset Standard Tender 2 (Streetlights)
            t2 = db.query(Tender).filter(Tender.id == "NIT/2026/UP/VAR/0089").first()
            if t2:
                t2.status = "PUBLISHED"
                t2.awarded_contractor_id = None
                t2.awarded_amount = None

            # Reset Tender 1 Bids to sealed envelope presentation state:
            # - Financial rank sealed (None)
            # - Cartel flags cleared
            # - Status SUBMITTED
            # - Technical status QUALIFIED for legitimate bidders
            bids = db.query(Bid).filter(Bid.tender_id == "NIT/2026/UP/VAR/0042").all()
            for b in bids:
                b.status = "SUBMITTED"
                b.financial_rank = None
                b.cartel_flags = None
                b.technical_status = "QUALIFIED"

            db.commit()
            logger.info("Tenders and bids reset to pristine pre-evaluation demonstration state.")
        except Exception as te:
            logger.warning(f"Could not reset tenders/bids: {te}")
            db.rollback()
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"Relational DB reset error: {e}")

    # 5. Re-seed all baseline data
    seed_demo_citizen_evidence(force=True)
    seed_demo_scenarios()
    seed_demo_operations(force=True)

    logger.info("All databases successfully restored to pristine presentation state.")
    return {
        "status": "success",
        "message": "All databases, tenders, and test records successfully reset to original demo state."
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    result = reset_all_databases_to_demo_state()
    print(f"\n[DONE] {result['message']}")
