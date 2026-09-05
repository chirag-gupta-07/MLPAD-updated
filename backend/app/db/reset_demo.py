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

    # 4. Re-seed all baseline data
    seed_demo_citizen_evidence(force=True)
    seed_demo_scenarios()
    seed_demo_operations(force=True)

    logger.info("All databases successfully restored to pristine presentation state.")
    return {
        "status": "success",
        "message": "All databases and test records successfully reset to original demo state."
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    result = reset_all_databases_to_demo_state()
    print(f"\n[DONE] {result['message']}")
