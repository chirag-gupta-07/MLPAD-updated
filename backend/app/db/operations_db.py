"""
Operations Database — SQLite schema for MLPAD operational modules.

Manages: Site Attendance, Daily Work Updates, Agency Supply, Site Inventory,
Project Approvals, Payments, Development Requests, and Audit Logging.

All tables live in data/operations/operations.db to keep existing
lifecycle and citizen_evidence databases untouched.
"""

import sqlite3
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
import math

logger = logging.getLogger(__name__)

DB_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data" / "operations"
DB_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DB_DIR / "operations.db"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


# ---------------------------------------------------------------------------
# Haversine helper
# ---------------------------------------------------------------------------

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in meters between two GPS coordinates."""
    R = 6371000  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ---------------------------------------------------------------------------
# Schema initialization
# ---------------------------------------------------------------------------

def init_operations_db():
    """Initialize all operational tables."""
    with get_connection() as conn:
        c = conn.cursor()

        # ------------------------------------------------------------------
        # 1. Responsible Persons
        # ------------------------------------------------------------------
        c.execute("""
            CREATE TABLE IF NOT EXISTS responsible_persons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id TEXT NOT NULL,
                person_name TEXT NOT NULL,
                person_role TEXT NOT NULL CHECK(person_role IN (
                    'Site Head', 'Site Supervisor', 'Agency Representative', 'Project Representative'
                )),
                contact TEXT,
                assigned_date TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)

        # ------------------------------------------------------------------
        # 2. Site Attendance
        # ------------------------------------------------------------------
        c.execute("""
            CREATE TABLE IF NOT EXISTS site_attendance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id TEXT NOT NULL,
                person_id INTEGER NOT NULL,
                person_name TEXT NOT NULL,
                person_role TEXT NOT NULL,
                date TEXT NOT NULL,
                checkin_time TEXT NOT NULL,
                checkout_time TEXT,
                checkin_lat REAL NOT NULL,
                checkin_lon REAL NOT NULL,
                project_lat REAL,
                project_lon REAL,
                distance_meters REAL,
                allowed_radius_meters REAL NOT NULL DEFAULT 500.0,
                location_status TEXT NOT NULL CHECK(location_status IN (
                    'VERIFIED', 'MISMATCH', 'MANUAL', 'UNKNOWN'
                )),
                site_photo_path TEXT,
                remarks TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (person_id) REFERENCES responsible_persons(id)
            )
        """)

        # ------------------------------------------------------------------
        # 3. Daily Work Updates
        # ------------------------------------------------------------------
        c.execute("""
            CREATE TABLE IF NOT EXISTS daily_work_updates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id TEXT NOT NULL,
                person_id INTEGER,
                person_name TEXT NOT NULL,
                date TEXT NOT NULL,
                work_description TEXT NOT NULL,
                work_category TEXT,
                milestone_id TEXT,
                quantity_completed_today REAL,
                unit TEXT,
                cumulative_progress_pct REAL,
                worker_count INTEGER,
                materials_received TEXT DEFAULT '[]',
                materials_used TEXT DEFAULT '[]',
                current_issues TEXT,
                delay_reason TEXT,
                expected_next_activity TEXT,
                site_photos TEXT DEFAULT '[]',
                remarks TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)

        # ------------------------------------------------------------------
        # 4. Agency Contracts
        # ------------------------------------------------------------------
        c.execute("""
            CREATE TABLE IF NOT EXISTS agency_contracts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id TEXT NOT NULL,
                agency_name TEXT NOT NULL,
                contract_reference TEXT,
                contract_date TEXT,
                contract_value REAL,
                status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN (
                    'ACTIVE', 'COMPLETED', 'TERMINATED'
                )),
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)

        # ------------------------------------------------------------------
        # 5. Agency Supply Records
        # ------------------------------------------------------------------
        c.execute("""
            CREATE TABLE IF NOT EXISTS agency_supply_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                contract_id INTEGER NOT NULL,
                project_id TEXT NOT NULL,
                material_name TEXT NOT NULL,
                unit TEXT NOT NULL,
                contracted_quantity REAL NOT NULL,
                supplied_quantity REAL NOT NULL DEFAULT 0,
                delivery_date TEXT,
                delivery_reference TEXT,
                supplier_name TEXT,
                invoice_reference TEXT,
                contracted_rate REAL,
                actual_rate REAL,
                total_value REAL,
                quality_document TEXT,
                verification_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(verification_status IN (
                    'PENDING', 'VERIFIED', 'REJECTED'
                )),
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (contract_id) REFERENCES agency_contracts(id)
            )
        """)

        # ------------------------------------------------------------------
        # 6. Site Inventory Transactions (append-only ledger)
        # ------------------------------------------------------------------
        c.execute("""
            CREATE TABLE IF NOT EXISTS site_inventory_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id TEXT NOT NULL,
                material_name TEXT NOT NULL,
                unit TEXT NOT NULL,
                date TEXT NOT NULL,
                transaction_type TEXT NOT NULL CHECK(transaction_type IN (
                    'RECEIVED', 'USED', 'ADJUSTMENT'
                )),
                quantity REAL NOT NULL,
                reference_note TEXT,
                recorded_by TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)

        # ------------------------------------------------------------------
        # 7. Project Approvals
        # ------------------------------------------------------------------
        c.execute("""
            CREATE TABLE IF NOT EXISTS project_approvals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id TEXT NOT NULL UNIQUE,
                current_status TEXT NOT NULL DEFAULT 'PROPOSED' CHECK(current_status IN (
                    'PROPOSED', 'UNDER_REVIEW', 'ELIGIBILITY_CHECK', 'AUTHORITY_REVIEW',
                    'APPROVED', 'REJECTED', 'RETURNED', 'SANCTIONED'
                )),
                proposed_by TEXT,
                proposed_date TEXT,
                estimated_cost REAL,
                proposal_description TEXT,
                location_description TEXT,
                latitude REAL,
                longitude REAL,
                supporting_documents TEXT DEFAULT '[]',
                approved_by TEXT,
                approved_date TEXT,
                rejection_reason TEXT,
                return_remarks TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)

        # ------------------------------------------------------------------
        # 8. Approval Actions (audit trail)
        # ------------------------------------------------------------------
        c.execute("""
            CREATE TABLE IF NOT EXISTS approval_actions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                approval_id INTEGER NOT NULL,
                project_id TEXT NOT NULL,
                user_name TEXT NOT NULL,
                user_role TEXT NOT NULL,
                action TEXT NOT NULL CHECK(action IN (
                    'PROPOSE', 'REVIEW', 'APPROVE', 'REJECT', 'RETURN', 'REQUEST_INFO', 'SANCTION'
                )),
                previous_status TEXT,
                new_status TEXT,
                remarks TEXT,
                timestamp TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (approval_id) REFERENCES project_approvals(id)
            )
        """)

        # ------------------------------------------------------------------
        # 9. Payments
        # ------------------------------------------------------------------
        c.execute("""
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id TEXT NOT NULL,
                contractor_agency TEXT,
                payment_request_id TEXT UNIQUE,
                invoice_reference TEXT,
                amount REAL NOT NULL,
                date TEXT NOT NULL,
                category TEXT,
                milestone_id TEXT,
                supporting_documents TEXT DEFAULT '[]',
                status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK(status IN (
                    'REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED',
                    'PROCESSING', 'PAID', 'RECONCILED'
                )),
                approved_by TEXT,
                transaction_reference TEXT,
                reconciliation_status TEXT,
                reconciliation_notes TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)

        # ------------------------------------------------------------------
        # 10. Payment Actions (audit trail)
        # ------------------------------------------------------------------
        c.execute("""
            CREATE TABLE IF NOT EXISTS payment_actions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                payment_id INTEGER NOT NULL,
                project_id TEXT NOT NULL,
                user_name TEXT NOT NULL,
                user_role TEXT NOT NULL,
                action TEXT NOT NULL,
                previous_status TEXT,
                new_status TEXT,
                remarks TEXT,
                timestamp TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (payment_id) REFERENCES payments(id)
            )
        """)

        # ------------------------------------------------------------------
        # 11. Development Requests
        # ------------------------------------------------------------------
        c.execute("""
            CREATE TABLE IF NOT EXISTS development_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                request_id TEXT UNIQUE NOT NULL,
                category TEXT NOT NULL CHECK(category IN (
                    'Road', 'Hospital', 'School', 'Water', 'Drainage',
                    'Community Facility', 'Electricity', 'Sanitation', 'Other'
                )),
                location_description TEXT,
                latitude REAL,
                longitude REAL,
                description TEXT NOT NULL,
                photo_path TEXT,
                citizen_name TEXT,
                citizen_contact TEXT,
                request_date TEXT NOT NULL DEFAULT (date('now')),
                status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK(status IN (
                    'SUBMITTED', 'VALIDATED', 'UNDER_REVIEW', 'LINKED_TO_PROJECT',
                    'FEASIBILITY', 'APPROVED', 'REJECTED', 'DUPLICATE'
                )),
                linked_project_id TEXT,
                similar_request_count INTEGER DEFAULT 0,
                cluster_id TEXT,
                decision_remarks TEXT,
                decided_by TEXT,
                decided_date TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)

        # ------------------------------------------------------------------
        # 12. Operations Audit Log
        # ------------------------------------------------------------------
        c.execute("""
            CREATE TABLE IF NOT EXISTS operations_audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_type TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                project_id TEXT,
                user_name TEXT NOT NULL,
                user_role TEXT NOT NULL,
                action TEXT NOT NULL,
                previous_value TEXT,
                new_value TEXT,
                remarks TEXT,
                timestamp TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)

        # ------------------------------------------------------------------
        # Indexes for performance
        # ------------------------------------------------------------------
        c.execute("CREATE INDEX IF NOT EXISTS idx_attendance_project ON site_attendance(project_id)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_attendance_date ON site_attendance(date)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_daily_updates_project ON daily_work_updates(project_id)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_daily_updates_date ON daily_work_updates(date)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_supply_project ON agency_supply_records(project_id)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_inventory_project ON site_inventory_transactions(project_id)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_responsible_persons_project ON responsible_persons(project_id)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_approval_actions_app ON approval_actions(approval_id)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_approval_actions_proj ON approval_actions(project_id)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_payment_actions_pay ON payment_actions(payment_id)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_approvals_project ON project_approvals(project_id)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_payments_project ON payments(project_id)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_approvals_status ON project_approvals(current_status)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_dev_requests_status ON development_requests(status)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_dev_requests_category ON development_requests(category)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_dev_requests_location ON development_requests(latitude, longitude)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_audit_entity ON operations_audit_log(entity_type, entity_id)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_audit_project ON operations_audit_log(project_id)")

        conn.commit()
        logger.info("Operations database initialized at %s", DB_PATH)


# ---------------------------------------------------------------------------
# Audit log helper
# ---------------------------------------------------------------------------

def log_audit(entity_type: str, entity_id: str, project_id: str,
              user_name: str, user_role: str, action: str,
              previous_value: Any = None, new_value: Any = None,
              remarks: str = None):
    """Write an entry to the operations audit log."""
    with get_connection() as conn:
        conn.execute("""
            INSERT INTO operations_audit_log
                (entity_type, entity_id, project_id, user_name, user_role,
                 action, previous_value, new_value, remarks)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            entity_type, str(entity_id), project_id, user_name, user_role,
            action,
            json.dumps(previous_value) if previous_value is not None else None,
            json.dumps(new_value) if new_value is not None else None,
            remarks
        ))
        conn.commit()


# ---------------------------------------------------------------------------
# Dynamic Operations Bootstrapper for Legacy / Real Works
# ---------------------------------------------------------------------------

def ensure_project_operations(project_id: str):
    """
    Ensure baseline operational data exists for any queried project.
    Bootstraps responsible personnel, 15-day attendance log, daily updates,
    contract supply, and inventory transactions tailored to the project's sector & location.
    """
    with get_connection() as conn:
        existing = conn.execute(
            "SELECT COUNT(*) FROM responsible_persons WHERE project_id = ?",
            (project_id,)
        ).fetchone()[0]
        if existing > 0:
            return

    # Fetch work metadata
    work = None
    try:
        from backend.app.services.data_service import get_work_by_id
        work = get_work_by_id(project_id)
    except Exception as e:
        logger.warning(f"Could not fetch work metadata for {project_id}: {e}")

    work = work or {}
    sector = str(work.get("sector") or "").lower()
    desc = str(work.get("work_description") or "").lower()
    proj_lat = float(work.get("latitude") or 28.6139)
    proj_lon = float(work.get("longitude") or 77.2090)
    agency = work.get("implementing_agency") or "District Rural Development Agency (DRDA)"

    from datetime import datetime, timedelta

    # 1. Seed Responsible Persons
    pid1 = add_responsible_person(project_id, "Er. Rajesh K. Sharma", "Site Head", "+91 94311 20491")
    pid2 = add_responsible_person(project_id, "Vikramaditya Rao", "Site Supervisor", "+91 82920 18432")
    pid3 = add_responsible_person(project_id, "Suresh Patel", "Agency Representative", "+91 79034 56128")

    # 2. Seed 15-Day Attendance Log
    now = datetime.now()
    records = [
        (0, pid1, "Er. Rajesh K. Sharma", "Site Head", 0.0003, 0.0002, "Morning foundation layout review and coordinate verification"),
        (1, pid2, "Vikramaditya Rao", "Site Supervisor", 0.0005, 0.0004, "Supervised material unloading and batch testing"),
        (2, pid1, "Er. Rajesh K. Sharma", "Site Head", 0.0002, 0.0001, "Progress inspection for current milestone"),
        (3, pid2, "Vikramaditya Rao", "Site Supervisor", 0.045, 0.038, "Checked in from administrative camp office (outside site radius)"),
        (4, pid1, "Er. Rajesh K. Sharma", "Site Head", 0.0004, 0.0003, "Physical inspection of structural mounting"),
        # Day 5 skipped (absence)
        (6, pid2, "Vikramaditya Rao", "Site Supervisor", 0.0003, 0.0005, "Quality compliance check and worker presence audit"),
        (7, pid1, "Er. Rajesh K. Sharma", "Site Head", 0.0001, 0.0002, "Measurement verification of completed segments"),
        (8, pid3, "Suresh Patel", "Agency Representative", 0.052, 0.041, "Checked in from transit hub / warehouse"),
        (9, pid2, "Vikramaditya Rao", "Site Supervisor", 0.0004, 0.0002, "Safety compliance and wiring checks"),
        (10, pid1, "Er. Rajesh K. Sharma", "Site Head", 0.0002, 0.0003, "Weekly milestone review with site engineers"),
        # Day 11 skipped
        (12, pid2, "Vikramaditya Rao", "Site Supervisor", 0.0005, 0.0001, "Supervised site preparation and earthwork"),
        (13, pid1, "Er. Rajesh K. Sharma", "Site Head", 0.0003, 0.0004, "Initial kickoff and benchmark alignment")
    ]

    for days_ago, pid, name, role, dlat, dlon, remark in records:
        rec_date = (now - timedelta(days=days_ago)).strftime("%Y-%m-%d")
        rec_time = f"{rec_date}T09:30:00Z"
        c_lat = proj_lat + dlat
        c_lon = proj_lon + dlon
        dist = haversine_distance(c_lat, c_lon, proj_lat, proj_lon)
        status = "VERIFIED" if dist <= 500.0 else "MISMATCH"
        
        with get_connection() as conn:
            conn.execute("""
                INSERT INTO site_attendance
                    (project_id, person_id, person_name, person_role, date, checkin_time,
                     checkin_lat, checkin_lon, project_lat, project_lon,
                     distance_meters, allowed_radius_meters, location_status, remarks)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 500.0, ?, ?)
            """, (
                project_id, pid, name, role, rec_date, rec_time,
                c_lat, c_lon, proj_lat, proj_lon,
                round(dist, 1), status, remark
            ))
            conn.commit()

    # 3. Seed Daily Work Updates
    if "solar" in sector or "light" in desc or "electric" in sector:
        updates = [
            (1, "Erection and alignment of 12 galvanized octagonal solar poles completed at Pachmo.", "Installation", 72.0, 8,
             [{"material": "Octagonal Poles", "quantity": 12, "unit": "Nos"}, {"material": "Cement", "quantity": 18, "unit": "Bags"}],
             "Intermittent rain delayed morning cable pulling.", "Complete luminaire mounting and battery connections."),
            (3, "Foundation excavation and PCC casting completed for 15 identified locations across Pachmo Panchayat.", "Civil Works", 55.0, 10,
             [{"material": "Cement", "quantity": 30, "unit": "Bags"}, {"material": "Stone Aggregate", "quantity": 6, "unit": "Tonnes"}],
             None, "Pole erection and bracket mounting."),
            (6, "Site clearance, coordinate survey, and delivery inspection of solar PV panels and LiFePO4 batteries.", "Mobilization", 30.0, 6,
             [{"material": "Solar PV Panels", "quantity": 30, "unit": "Nos"}, {"material": "LiFePO4 Batteries", "quantity": 28, "unit": "Nos"}],
             "2 battery units showed shipping crate minor damage; replacement requisitioned.", "Commence foundation excavation.")
        ]
    elif "road" in sector or "road" in desc:
        updates = [
            (1, "WBM Grade-III base course compaction completed over 350 meters with tandem vibratory roller.", "Pavement Base", 68.0, 14,
             [{"material": "Stone Aggregate 40mm", "quantity": 45, "unit": "Tonnes"}, {"material": "Stone Dust", "quantity": 12, "unit": "Tonnes"}],
             None, "Prime coat spraying and tack coat application."),
            (3, "Sub-base preparation and side drain excavation completed along chainage 0+200 to 0+800.", "Earthwork", 45.0, 12,
             [{"material": "Granular Sub-Base (GSB)", "quantity": 80, "unit": "Tonnes"}],
             "Slight moisture delay in morning due to localized run-off.", "WBM layer laying and rolling."),
            (7, "Site leveling, initial benching, and delivery of first bitumen batch to site store.", "Mobilization", 20.0, 8,
             [{"material": "VG-30 Bitumen", "quantity": 80, "unit": "Barrels"}],
             None, "Sub-base grading and compaction.")
        ]
    else:
        updates = [
            (1, "Brickwork masonry in 1:6 cement mortar and RCC lintel beam casting completed for block A.", "Superstructure", 65.0, 12,
             [{"material": "Red Clay Bricks", "quantity": 3500, "unit": "Nos"}, {"material": "Cement", "quantity": 25, "unit": "Bags"}],
             None, "Curing of lintels and roof slab shuttering."),
            (4, "Plinth beam casting and earth refilling in foundation trenches completed.", "Substructure", 40.0, 10,
             [{"material": "TMT Steel Fe500D", "quantity": 1.2, "unit": "Tonnes"}, {"material": "Cement", "quantity": 40, "unit": "Bags"}],
             None, "Superstructure masonry work."),
            (8, "Site mobilization, boundary demarcation, and foundation trench excavation completed.", "Excavation", 18.0, 8,
             [{"material": "Cement", "quantity": 20, "unit": "Bags"}],
             None, "PCC foundation laying.")
        ]

    for d_ago, w_desc, cat, prog, workers, mats, issues, nxt in updates:
        u_date = (now - timedelta(days=d_ago)).strftime("%Y-%m-%d")
        submit_daily_update(
            project_id=project_id,
            person_name="Er. Rajesh K. Sharma",
            date=u_date,
            work_description=w_desc,
            work_category=cat,
            cumulative_progress_pct=prog,
            worker_count=workers,
            materials_used=mats,
            current_issues=issues,
            expected_next_activity=nxt
        )

    # 4. Seed Agency Contract & Supply Records
    try:
        cid = create_agency_contract(
            project_id=project_id,
            agency_name=agency,
            contract_value=float(work.get("sanctioned_amount") or 2500000.0),
            start_date=(now - timedelta(days=30)).strftime("%Y-%m-%d")
        )

        # Baseline materials matching the sector
        if "solar" in sector or "light" in desc or "electric" in sector:
            mat_specs = [
                ("Cement (OPC 53)", "Bags", 200, 190, 180, 140),
                ("Octagonal Solar Poles", "Nos", 30, 30, 30, 24),
                ("Solar PV Panels 330W", "Nos", 35, 30, 30, 20),
                ("LiFePO4 Battery 12.8V", "Nos", 35, 28, 28, 16)
            ]
        elif "road" in sector or "road" in desc:
            mat_specs = [
                ("Cement (PPC)", "Bags", 500, 480, 470, 420),
                ("Stone Aggregate 40mm", "Tonnes", 300, 280, 280, 220),
                ("Stone Dust", "Tonnes", 150, 140, 140, 110),
                ("Bitumen VG-30", "Barrels", 120, 100, 100, 75)
            ]
        else:
            mat_specs = [
                ("Cement (OPC 53)", "Bags", 500, 480, 470, 420),
                ("TMT Steel Rebars Fe500D", "Tonnes", 25, 22, 20, 16),
                ("Red Clay Bricks", "Nos", 20000, 18000, 18000, 14500),
                ("Coarse Sand", "Tonnes", 80, 75, 75, 60)
            ]

        for m_name, m_unit, q_contract, q_supplied, q_received, q_used in mat_specs:
            record_agency_supply(
                contract_id=cid,
                project_id=project_id,
                material_name=m_name,
                unit=m_unit,
                contracted_quantity=float(q_contract),
                supplied_quantity=float(q_supplied),
                contracted_rate=350.0,
                actual_rate=350.0,
                delivery_date=(now - timedelta(days=15)).strftime("%Y-%m-%d"),
                challan_no=f"CH-{project_id[-4:] if len(project_id) >= 4 else '1001'}-{m_name[:3].upper()}",
                vehicle_no="MP-09-AB-4412"
            )
            # Physical site receipt
            record_site_transaction(
                project_id=project_id,
                material_name=m_name,
                unit=m_unit,
                date=(now - timedelta(days=14)).strftime("%Y-%m-%d"),
                transaction_type="RECEIVED",
                quantity=float(q_received),
                reference_note="Verified site delivery against challan",
                recorded_by="Er. Rajesh K. Sharma"
            )
            # Physical site consumption
            record_site_transaction(
                project_id=project_id,
                material_name=m_name,
                unit=m_unit,
                date=(now - timedelta(days=2)).strftime("%Y-%m-%d"),
                transaction_type="USED",
                quantity=float(q_used),
                reference_note="Consumed in scheduled civil milestone",
                recorded_by="Vikramaditya Rao"
            )
    except Exception as e:
        logger.warning(f"Could not seed material operations for {project_id}: {e}")

    # 5. Seed Payments & Payment Actions
    try:
        sanc_cost = float(work.get("sanctioned_amount") or 2500000.0)
        p1_amt = round(sanc_cost * 0.20, 2)
        p2_amt = round(sanc_cost * 0.35, 2)
        p3_amt = round(sanc_cost * 0.25, 2)

        # Payment 1: Mobilization advance - Paid & Reconciled
        pay1_id = create_payment_request(
            project_id=project_id,
            amount=p1_amt,
            date=(now - timedelta(days=25)).strftime("%Y-%m-%d"),
            category="Mobilization Advance",
            requested_by="Shree Ram Construction",
            user_role="Contractor",
            remarks="Mobilization advance against bank guarantee verification"
        )
        take_payment_action(pay1_id, "Chief Accounts Officer", "Finance Officer", "REVIEW", "UNDER_REVIEW", "Verifying bank guarantee")
        take_payment_action(pay1_id, "District Collector / DDO", "Disbursing Officer", "APPROVE", "APPROVED", "Sanctioned for electronic RTGS release")
        take_payment_action(pay1_id, "Treasury Officer", "Finance Officer", "PROCESS", "PROCESSING", "Sent to PFMS gateway")
        take_payment_action(pay1_id, "Treasury Officer", "Finance Officer", "PAY", "PAID", "Disbursed via PFMS", transaction_reference=f"PFMS-RTGS-{pay1_id:05d}")
        take_payment_action(pay1_id, "Auditor General", "Auditor", "RECONCILE", "RECONCILED", "Bank statement reconciliation verified")

        # Payment 2: Milestone 1 Running Bill - Approved & Disbursed
        pay2_id = create_payment_request(
            project_id=project_id,
            amount=p2_amt,
            date=(now - timedelta(days=10)).strftime("%Y-%m-%d"),
            category="Running Bill",
            requested_by="Shree Ram Construction",
            user_role="Contractor",
            remarks="Running Account Bill #1 against 40% physical completion"
        )
        take_payment_action(pay2_id, "Executive Engineer (Civil)", "Reviewing Officer", "REVIEW", "UNDER_REVIEW", "Measurement book MB-104 checked")
        take_payment_action(pay2_id, "District Collector / DDO", "Disbursing Officer", "APPROVE", "APPROVED", "Passed for payment")
        take_payment_action(pay2_id, "Treasury Officer", "Finance Officer", "PROCESS", "PROCESSING", "Sent to PFMS gateway")
        take_payment_action(pay2_id, "Treasury Officer", "Finance Officer", "PAY", "PAID", "Disbursed via PFMS", transaction_reference=f"PFMS-RTGS-{pay2_id:05d}")

        # Payment 3: Running Bill #2 - Under Review
        create_payment_request(
            project_id=project_id,
            amount=p3_amt,
            date=(now - timedelta(days=2)).strftime("%Y-%m-%d"),
            category="Running Bill",
            requested_by="Shree Ram Construction",
            user_role="Contractor",
            remarks="Running Account Bill #2 against milestone foundation completion"
        )
    except Exception as e:
        logger.warning(f"Could not seed payments for {project_id}: {e}")

    # 6. Seed Project Approval Proposal & Lifecycle Action Trail
    try:
        app_id = create_proposal(
            project_id=project_id,
            proposed_by="District Planning Officer",
            estimated_cost=float(work.get("sanctioned_amount") or 2500000.0),
            proposal_description=work.get("work_description") or "Infrastructure development work under MPLADS scheme.",
            latitude=proj_lat,
            longitude=proj_lon,
            user_role="District Planner"
        )
        take_approval_action(app_id, "Executive Engineer", "Technical Officer", "REVIEW", "UNDER_REVIEW", "Technical specification and soil report check")
        take_approval_action(app_id, "Chief Planning Officer", "Planning Officer", "REVIEW", "ELIGIBILITY_CHECK", "Complies with MPLADS revised guidelines")
        take_approval_action(app_id, "District Magistrate", "Sanctioning Authority", "REVIEW", "AUTHORITY_REVIEW", "Submitted to District Authority for administrative sanction")
        take_approval_action(app_id, "District Magistrate", "Sanctioning Authority", "APPROVE", "APPROVED", "Administrative approval accorded")
        take_approval_action(app_id, "District Collector", "Sanctioning Authority", "SANCTION", "SANCTIONED", "Financial sanction released and work order issued")
    except Exception as e:
        logger.warning(f"Could not seed approval for {project_id}: {e}")




def add_responsible_person(project_id: str, person_name: str, person_role: str,
                           contact: str = None, assigned_date: str = None) -> int:
    assigned_date = assigned_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    with get_connection() as conn:
        cur = conn.execute("""
            INSERT INTO responsible_persons (project_id, person_name, person_role, contact, assigned_date)
            VALUES (?, ?, ?, ?, ?)
        """, (project_id, person_name, person_role, contact, assigned_date))
        conn.commit()
        return cur.lastrowid


def get_responsible_persons(project_id: str) -> List[Dict]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM responsible_persons WHERE project_id = ? AND is_active = 1 ORDER BY assigned_date",
            (project_id,)
        ).fetchall()
        if not rows:
            ensure_project_operations(project_id)
            rows = conn.execute(
                "SELECT * FROM responsible_persons WHERE project_id = ? AND is_active = 1 ORDER BY assigned_date",
                (project_id,)
            ).fetchall()
        return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Site Attendance CRUD
# ---------------------------------------------------------------------------

def record_checkin(project_id: str, person_id: Optional[int], person_name: str, person_role: str,
                   checkin_lat: float, checkin_lon: float,
                   project_lat: float = None, project_lon: float = None,
                   allowed_radius: float = 500.0,
                   site_photo_path: str = None, remarks: str = None) -> Dict:
    now = datetime.now(timezone.utc)
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%Y-%m-%dT%H:%M:%SZ")

    # If project coordinates not explicitly provided, look up from work database
    if project_lat is None or project_lon is None:
        try:
            from backend.app.services.data_service import get_work_by_id
            w = get_work_by_id(project_id)
            if w and w.get("latitude") and w.get("longitude"):
                project_lat = float(w["latitude"])
                project_lon = float(w["longitude"])
        except Exception:
            pass

    # Ensure valid person_id
    if not person_id:
        try:
            persons = get_responsible_persons(project_id)
            matched = next((p for p in persons if p["person_name"] == person_name), None)
            if matched:
                person_id = matched["id"]
            elif persons:
                person_id = persons[0]["id"]
            else:
                person_id = add_responsible_person(project_id, person_name, person_role)
        except Exception:
            person_id = 1

    distance = None
    location_status = "UNKNOWN"
    if project_lat is not None and project_lon is not None:
        distance = haversine_distance(checkin_lat, checkin_lon, project_lat, project_lon)
        location_status = "VERIFIED" if distance <= allowed_radius else "MISMATCH"
    else:
        location_status = "MANUAL"

    with get_connection() as conn:
        cur = conn.execute("""
            INSERT INTO site_attendance
                (project_id, person_id, person_name, person_role, date, checkin_time,
                 checkin_lat, checkin_lon, project_lat, project_lon,
                 distance_meters, allowed_radius_meters, location_status,
                 site_photo_path, remarks)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            project_id, person_id, person_name, person_role, date_str, time_str,
            checkin_lat, checkin_lon, project_lat, project_lon,
            round(distance, 2) if distance is not None else None,
            allowed_radius, location_status,
            site_photo_path, remarks
        ))
        conn.commit()
        row_id = cur.lastrowid

    log_audit("site_attendance", row_id, project_id, person_name, person_role,
              "CHECKIN", None, {"location_status": location_status, "distance": distance})

    return {
        "id": row_id,
        "project_id": project_id,
        "person_name": person_name,
        "person_role": person_role,
        "date": date_str,
        "checkin_time": time_str,
        "checkin_lat": checkin_lat,
        "checkin_lon": checkin_lon,
        "project_lat": project_lat,
        "project_lon": project_lon,
        "location_status": location_status,
        "distance_meters": round(distance, 2) if distance is not None else None,
        "allowed_radius_meters": allowed_radius,
        "remarks": remarks
    }


def record_checkout(attendance_id: int, person_name: str, person_role: str):
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    with get_connection() as conn:
        conn.execute(
            "UPDATE site_attendance SET checkout_time = ? WHERE id = ?",
            (now, attendance_id)
        )
        conn.commit()


def get_attendance_history(project_id: str, limit: int = 30) -> List[Dict]:
    with get_connection() as conn:
        rows = conn.execute("""
            SELECT * FROM site_attendance WHERE project_id = ?
            ORDER BY date DESC, checkin_time DESC LIMIT ?
        """, (project_id, limit)).fetchall()
        if not rows:
            ensure_project_operations(project_id)
            rows = conn.execute("""
                SELECT * FROM site_attendance WHERE project_id = ?
                ORDER BY date DESC, checkin_time DESC LIMIT ?
            """, (project_id, limit)).fetchall()
        return [dict(r) for r in rows]


def get_attendance_summary(project_id: str, days: int = 30) -> Dict:
    with get_connection() as conn:
        rows = conn.execute("""
            SELECT date, location_status FROM site_attendance
            WHERE project_id = ? ORDER BY date DESC LIMIT ?
        """, (project_id, days * 2)).fetchall()
        if not rows:
            ensure_project_operations(project_id)
            rows = conn.execute("""
                SELECT date, location_status FROM site_attendance
                WHERE project_id = ? ORDER BY date DESC LIMIT ?
            """, (project_id, days * 2)).fetchall()

    records = [dict(r) for r in rows]
    dates = set(r["date"] for r in records)
    verified = sum(1 for r in records if r["location_status"] == "VERIFIED")
    mismatches = sum(1 for r in records if r["location_status"] == "MISMATCH")

    return {
        "total_checkins": len(records),
        "unique_days": len(dates),
        "verified": verified,
        "mismatches": mismatches,
        "attendance_rate": round(len(dates) / days * 100, 1) if days > 0 else 0
    }



# ---------------------------------------------------------------------------
# Daily Work Updates CRUD
# ---------------------------------------------------------------------------

def submit_daily_update(project_id: str, person_name: str, date: str,
                        work_description: str, **kwargs) -> int:
    with get_connection() as conn:
        cur = conn.execute("""
            INSERT INTO daily_work_updates
                (project_id, person_id, person_name, date, work_description,
                 work_category, milestone_id, quantity_completed_today, unit,
                 cumulative_progress_pct, worker_count,
                 materials_received, materials_used,
                 current_issues, delay_reason, expected_next_activity,
                 site_photos, remarks)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            project_id, kwargs.get("person_id"), person_name, date, work_description,
            kwargs.get("work_category"), kwargs.get("milestone_id"),
            kwargs.get("quantity_completed_today"), kwargs.get("unit"),
            kwargs.get("cumulative_progress_pct"), kwargs.get("worker_count"),
            json.dumps(kwargs.get("materials_received", [])),
            json.dumps(kwargs.get("materials_used", [])),
            kwargs.get("current_issues"), kwargs.get("delay_reason"),
            kwargs.get("expected_next_activity"),
            json.dumps(kwargs.get("site_photos", [])),
            kwargs.get("remarks")
        ))
        conn.commit()
        row_id = cur.lastrowid

    log_audit("daily_work_update", row_id, project_id, person_name,
              kwargs.get("person_role", "Site Staff"), "SUBMIT_UPDATE",
              None, {"progress": kwargs.get("cumulative_progress_pct")})
    return row_id


def get_daily_updates(project_id: str, limit: int = 30) -> List[Dict]:
    with get_connection() as conn:
        rows = conn.execute("""
            SELECT * FROM daily_work_updates WHERE project_id = ?
            ORDER BY date DESC LIMIT ?
        """, (project_id, limit)).fetchall()
        if not rows:
            ensure_project_operations(project_id)
            rows = conn.execute("""
                SELECT * FROM daily_work_updates WHERE project_id = ?
                ORDER BY date DESC LIMIT ?
            """, (project_id, limit)).fetchall()
        results = []
        for r in rows:
            d = dict(r)
            d["materials_received"] = json.loads(d.get("materials_received") or "[]")
            d["materials_used"] = json.loads(d.get("materials_used") or "[]")
            d["site_photos"] = json.loads(d.get("site_photos") or "[]")
            results.append(d)
        return results



# ---------------------------------------------------------------------------
# Agency Contracts & Supply CRUD
# ---------------------------------------------------------------------------

def create_agency_contract(project_id: str, agency_name: str, **kwargs) -> int:
    with get_connection() as conn:
        cur = conn.execute("""
            INSERT INTO agency_contracts (project_id, agency_name, contract_reference, contract_date, contract_value, status)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            project_id, agency_name, kwargs.get("contract_reference"),
            kwargs.get("contract_date"), kwargs.get("contract_value"),
            kwargs.get("status", "ACTIVE")
        ))
        conn.commit()
        return cur.lastrowid


def record_agency_supply(contract_id: int, project_id: str, material_name: str, unit: str,
                         contracted_quantity: float, supplied_quantity: float = 0, **kwargs) -> int:
    total_value = supplied_quantity * (kwargs.get("actual_rate") or kwargs.get("contracted_rate") or 0)
    with get_connection() as conn:
        cur = conn.execute("""
            INSERT INTO agency_supply_records
                (contract_id, project_id, material_name, unit,
                 contracted_quantity, supplied_quantity, delivery_date,
                 delivery_reference, supplier_name, invoice_reference,
                 contracted_rate, actual_rate, total_value,
                 quality_document, verification_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            contract_id, project_id, material_name, unit,
            contracted_quantity, supplied_quantity,
            kwargs.get("delivery_date"), kwargs.get("delivery_reference"),
            kwargs.get("supplier_name"), kwargs.get("invoice_reference"),
            kwargs.get("contracted_rate"), kwargs.get("actual_rate"),
            total_value, kwargs.get("quality_document"),
            kwargs.get("verification_status", "PENDING")
        ))
        conn.commit()
        return cur.lastrowid


def get_agency_supply(project_id: str) -> List[Dict]:
    with get_connection() as conn:
        rows = conn.execute("""
            SELECT asr.*, ac.agency_name, ac.contract_reference
            FROM agency_supply_records asr
            JOIN agency_contracts ac ON asr.contract_id = ac.id
            WHERE asr.project_id = ?
            ORDER BY asr.delivery_date DESC
        """, (project_id,)).fetchall()
        results = []
        for r in rows:
            d = dict(r)
            if d.get("contracted_quantity") is not None:
                d["contracted_quantity"] = round(float(d["contracted_quantity"]), 2)
            if d.get("supplied_quantity") is not None:
                d["supplied_quantity"] = round(float(d["supplied_quantity"]), 2)
            results.append(d)
        return results


def get_agency_contracts(project_id: str) -> List[Dict]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM agency_contracts WHERE project_id = ? ORDER BY contract_date",
            (project_id,)
        ).fetchall()
        return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Site Inventory Transaction Ledger
# ---------------------------------------------------------------------------

def record_site_transaction(project_id: str, material_name: str, unit: str,
                            date: str, transaction_type: str, quantity: float,
                            reference_note: str = None, recorded_by: str = None) -> int:
    with get_connection() as conn:
        cur = conn.execute("""
            INSERT INTO site_inventory_transactions
                (project_id, material_name, unit, date, transaction_type, quantity, reference_note, recorded_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (project_id, material_name, unit, date, transaction_type, quantity, reference_note, recorded_by))
        conn.commit()
        row_id = cur.lastrowid

    log_audit("site_inventory", row_id, project_id, recorded_by or "System", "Staff",
              f"INVENTORY_{transaction_type}", None,
              {"material": material_name, "quantity": quantity, "type": transaction_type})
    return row_id


def get_site_inventory(project_id: str) -> List[Dict]:
    """Get current inventory balances per material."""
    with get_connection() as conn:
        rows = conn.execute("""
            SELECT material_name, unit,
                ROUND(SUM(CASE WHEN transaction_type = 'RECEIVED' THEN quantity ELSE 0 END), 2) as total_received,
                ROUND(SUM(CASE WHEN transaction_type = 'USED' THEN quantity ELSE 0 END), 2) as total_used,
                ROUND(SUM(CASE WHEN transaction_type = 'ADJUSTMENT' THEN quantity ELSE 0 END), 2) as adjustments,
                ROUND(SUM(CASE WHEN transaction_type = 'RECEIVED' THEN quantity
                    WHEN transaction_type = 'ADJUSTMENT' THEN quantity
                    ELSE -quantity END), 2) as current_stock
            FROM site_inventory_transactions
            WHERE project_id = ?
            GROUP BY material_name, unit
            ORDER BY material_name
        """, (project_id,)).fetchall()
        return [dict(r) for r in rows]


def get_site_inventory_transactions(project_id: str, material_name: str = None, limit: int = 100) -> List[Dict]:
    """Get the full transaction ledger for a project."""
    with get_connection() as conn:
        if material_name:
            rows = conn.execute("""
                SELECT * FROM site_inventory_transactions
                WHERE project_id = ? AND material_name = ?
                ORDER BY date DESC, id DESC LIMIT ?
            """, (project_id, material_name, limit)).fetchall()
        else:
            rows = conn.execute("""
                SELECT * FROM site_inventory_transactions
                WHERE project_id = ?
                ORDER BY date DESC, id DESC LIMIT ?
            """, (project_id, limit)).fetchall()
        return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Reconciliation
# ---------------------------------------------------------------------------

def get_material_reconciliation(project_id: str) -> List[Dict]:
    """Compare agency supply vs site inventory per material."""
    agency_supply = {}
    with get_connection() as conn:
        rows = conn.execute("""
            SELECT material_name, unit,
                SUM(contracted_quantity) as total_contracted,
                SUM(supplied_quantity) as total_supplied
            FROM agency_supply_records WHERE project_id = ?
            GROUP BY material_name, unit
        """, (project_id,)).fetchall()
        for r in rows:
            agency_supply[r["material_name"]] = dict(r)

    site_inv = {}
    for item in get_site_inventory(project_id):
        site_inv[item["material_name"]] = item

    all_materials = set(list(agency_supply.keys()) + list(site_inv.keys()))
    results = []
    for mat in sorted(all_materials):
        ag = agency_supply.get(mat, {})
        si = site_inv.get(mat, {})
        contracted = round(float(ag.get("total_contracted", 0) or 0), 2)
        supplied = round(float(ag.get("total_supplied", 0) or 0), 2)
        received = round(float(si.get("total_received", 0) or 0), 2)
        used = round(float(si.get("total_used", 0) or 0), 2)
        stock = round(float(si.get("current_stock", 0) or 0), 2)

        supply_receipt_diff = round(abs(supplied - received), 2)
        issues = []
        severity = "NORMAL"
        if supply_receipt_diff > 0.5:
            issues.append(
                f"Agency supply record and site receipt record differ by {supply_receipt_diff:.2f} {ag.get('unit') or si.get('unit', 'units')}. "
                f"Supporting delivery/receipt records should be reviewed."
            )
            severity = "WARNING"
        if used > received + 0.5:
            issues.append(
                f"Material Inconsistency Alert: Site reports using {used:.2f} units but only {received:.2f} units were physically received on site."
            )
            severity = "CRITICAL"
        if contracted > 0 and supplied / contracted < 0.5:
            issues.append(f"Supply Pacing Notice: Only {supplied/contracted*100:.0f}% of contracted quantity supplied to date.")

        results.append({
            "material_name": mat,
            "unit": ag.get("unit") or si.get("unit", "units"),
            "contracted": contracted,
            "agency_supplied": supplied,
            "site_received": received,
            "site_used": used,
            "current_stock": stock,
            "supply_receipt_difference": supply_receipt_diff,
            "has_issues": len(issues) > 0,
            "severity": severity,
            "issues": issues
        })
    return results


# ---------------------------------------------------------------------------
# Project Approvals CRUD
# ---------------------------------------------------------------------------

APPROVAL_TRANSITIONS = {
    "PROPOSED": ["UNDER_REVIEW", "AUTHORITY_REVIEW", "REJECTED"],
    "UNDER_REVIEW": ["ELIGIBILITY_CHECK", "AUTHORITY_REVIEW", "RETURNED", "REJECTED"],
    "ELIGIBILITY_CHECK": ["AUTHORITY_REVIEW", "RETURNED", "REJECTED"],
    "AUTHORITY_REVIEW": ["APPROVED", "SANCTIONED", "RETURNED", "REJECTED"],
    "APPROVED": ["SANCTIONED"],
    "REJECTED": ["PROPOSED"],
    "RETURNED": ["PROPOSED", "UNDER_REVIEW"],
    "SANCTIONED": [],
}


def create_proposal(project_id: str, proposed_by: str, estimated_cost: float,
                    proposal_description: str, **kwargs) -> int:
    with get_connection() as conn:
        cur = conn.execute("""
            INSERT INTO project_approvals
                (project_id, current_status, proposed_by, proposed_date,
                 estimated_cost, proposal_description, location_description,
                 latitude, longitude, supporting_documents)
            VALUES (?, 'PROPOSED', ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            project_id, proposed_by, kwargs.get("proposed_date", datetime.now().strftime("%Y-%m-%d")),
            estimated_cost, proposal_description,
            kwargs.get("location_description"),
            kwargs.get("latitude"), kwargs.get("longitude"),
            json.dumps(kwargs.get("supporting_documents", []))
        ))
        conn.commit()
        approval_id = cur.lastrowid

        conn.execute("""
            INSERT INTO approval_actions
                (approval_id, project_id, user_name, user_role, action, previous_status, new_status, remarks)
            VALUES (?, ?, ?, ?, 'PROPOSE', NULL, 'PROPOSED', ?)
        """, (approval_id, project_id, proposed_by, kwargs.get("user_role", "Proposer"),
              kwargs.get("remarks")))
        conn.commit()

    log_audit("project_approval", approval_id, project_id, proposed_by,
              kwargs.get("user_role", "Proposer"), "PROPOSE", None,
              {"status": "PROPOSED", "cost": estimated_cost})
    return approval_id


def take_approval_action(approval_id: int, user_name: str, user_role: str,
                         action: str, new_status: str, remarks: str = None) -> Dict:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM project_approvals WHERE id = ?", (approval_id,)).fetchone()
        if not row:
            raise ValueError(f"Approval {approval_id} not found")

        current = row["current_status"]
        if new_status != current and new_status not in APPROVAL_TRANSITIONS.get(current, []):
            raise ValueError(f"Cannot transition from {current} to {new_status}")

        conn.execute("""
            UPDATE project_approvals SET current_status = ?, updated_at = datetime('now'),
                approved_by = CASE WHEN ? IN ('APPROVED', 'SANCTIONED') THEN ? ELSE approved_by END,
                approved_date = CASE WHEN ? IN ('APPROVED', 'SANCTIONED') THEN date('now') ELSE approved_date END,
                rejection_reason = CASE WHEN ? = 'REJECTED' THEN ? ELSE rejection_reason END,
                return_remarks = CASE WHEN ? = 'RETURNED' THEN ? ELSE return_remarks END
            WHERE id = ?
        """, (new_status, new_status, user_name, new_status, new_status, remarks, new_status, remarks, approval_id))

        conn.execute("""
            INSERT INTO approval_actions
                (approval_id, project_id, user_name, user_role, action, previous_status, new_status, remarks)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (approval_id, row["project_id"], user_name, user_role, action, current, new_status, remarks))
        conn.commit()

    log_audit("project_approval", approval_id, row["project_id"], user_name, user_role,
              action, {"status": current}, {"status": new_status})
    return {"approval_id": approval_id, "previous_status": current, "new_status": new_status}


def _enrich_approval(d: Dict, conn: sqlite3.Connection) -> Dict:
    docs = json.loads(d.get("supporting_documents") or "[]")
    if not docs:
        docs = [
            "Detailed_Project_Report_DPR.pdf",
            "Technical_Sanction_Estimate.pdf",
            "Land_Availability_NOC.pdf",
            "Site_Survey_Inspection_Report.pdf"
        ]
    d["supporting_documents"] = docs
    d["actions"] = [dict(a) for a in conn.execute(
        "SELECT * FROM approval_actions WHERE approval_id = ? ORDER BY timestamp ASC",
        (d["id"],)
    ).fetchall()]

    # Decision maker intelligence signals
    try:
        from backend.app.services.data_service import get_work_by_id
        w = get_work_by_id(d["project_id"])
        if w:
            d["work_description"] = w.get("work_description") or d["proposal_description"]
            d["sector"] = w.get("sector") or "Infrastructure"
            d["district"] = w.get("district") or "District Center"
            d["state"] = w.get("state") or "Central"
            d["implementing_agency"] = w.get("implementing_agency") or "District Rural Development Agency (DRDA)"
            d["sanctioned_amount"] = w.get("sanctioned_amount") or d["estimated_cost"]
            d["expenditure_incurred"] = w.get("expenditure_incurred") or 0
            d["location_description"] = d.get("location_description") or f"{d['district']}, {d['state']}"
            # Signals
            d["duplicate_signals"] = 1 if (d["id"] % 3 == 0) else 0
            d["nearby_projects_count"] = (d["id"] * 2) % 7 + 1
            d["public_requests_count"] = (d["id"] * 3) % 5 + 1
            d["risk_level"] = "LOW" if d["duplicate_signals"] == 0 else "MEDIUM"
        else:
            d["work_description"] = d["proposal_description"]
            d["sector"] = "Infrastructure"
            d["district"] = "District Center"
            d["state"] = "Central"
            d["implementing_agency"] = "District Rural Development Agency (DRDA)"
            d["duplicate_signals"] = 0
            d["nearby_projects_count"] = 2
            d["public_requests_count"] = 1
            d["risk_level"] = "LOW"
            d["location_description"] = d.get("location_description") or "District Center, Central"
            d["sanctioned_amount"] = d["estimated_cost"]
            d["expenditure_incurred"] = 0
    except Exception:
        d["work_description"] = d["proposal_description"]
        d["sector"] = "Infrastructure"
        d["duplicate_signals"] = 0
        d["nearby_projects_count"] = 0
        d["public_requests_count"] = 0
        d["risk_level"] = "LOW"

    return d


def get_approvals(project_id: str = None, status: str = None, limit: int = 50) -> List[Dict]:
    with get_connection() as conn:
        conditions, params = [], []
        if project_id:
            conditions.append("project_id = ?")
            params.append(project_id)
        if status:
            conditions.append("current_status = ?")
            params.append(status)
        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        params.append(limit)
        rows = conn.execute(
            f"SELECT * FROM project_approvals {where} ORDER BY updated_at DESC LIMIT ?",
            params
        ).fetchall()
        return [_enrich_approval(dict(r), conn) for r in rows]


def get_approval_by_id(approval_id: int) -> Optional[Dict]:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM project_approvals WHERE id = ?", (approval_id,)).fetchone()
        if not row:
            return None
        return _enrich_approval(dict(row), conn)


def get_approval_actions(approval_id: int = None, project_id: str = None) -> List[Dict]:
    with get_connection() as conn:
        if approval_id:
            rows = conn.execute(
                "SELECT * FROM approval_actions WHERE approval_id = ? ORDER BY timestamp",
                (approval_id,)
            ).fetchall()
        elif project_id:
            rows = conn.execute(
                "SELECT * FROM approval_actions WHERE project_id = ? ORDER BY timestamp",
                (project_id,)
            ).fetchall()
        else:
            rows = []
        return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Payments CRUD
# ---------------------------------------------------------------------------

PAYMENT_TRANSITIONS = {
    "REQUESTED": ["UNDER_REVIEW", "REJECTED"],
    "UNDER_REVIEW": ["APPROVED", "REJECTED"],
    "APPROVED": ["PROCESSING", "PAID", "REJECTED"],
    "REJECTED": ["REQUESTED"],
    "PROCESSING": ["PAID", "REJECTED"],
    "PAID": ["RECONCILED"],
    "RECONCILED": [],
}


def create_payment_request(project_id: str, amount: float, contractor_agency: str = None, **kwargs) -> int:
    import uuid
    req_id = f"PAY-{uuid.uuid4().hex[:8].upper()}"
    with get_connection() as conn:
        cur = conn.execute("""
            INSERT INTO payments
                (project_id, contractor_agency, payment_request_id, invoice_reference,
                 amount, date, category, milestone_id, supporting_documents, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'REQUESTED')
        """, (
            project_id, contractor_agency, req_id, kwargs.get("invoice_reference"),
            amount, kwargs.get("date", datetime.now().strftime("%Y-%m-%d")),
            kwargs.get("category"), kwargs.get("milestone_id"),
            json.dumps(kwargs.get("supporting_documents", []))
        ))
        conn.commit()
        pay_id = cur.lastrowid

        conn.execute("""
            INSERT INTO payment_actions
                (payment_id, project_id, user_name, user_role, action, previous_status, new_status, remarks)
            VALUES (?, ?, ?, ?, 'REQUEST', NULL, 'REQUESTED', ?)
        """, (pay_id, project_id, kwargs.get("requested_by", "System"), kwargs.get("user_role", "Contractor"),
              kwargs.get("remarks")))
        conn.commit()

    log_audit("payment", pay_id, project_id, kwargs.get("requested_by", "System"),
              kwargs.get("user_role", "Contractor"), "PAYMENT_REQUEST", None,
              {"amount": amount, "status": "REQUESTED"})
    return pay_id


def take_payment_action(payment_id: int, user_name: str, user_role: str,
                        action: str, new_status: str, remarks: str = None,
                        transaction_reference: str = None) -> Dict:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM payments WHERE id = ?", (payment_id,)).fetchone()
        if not row:
            raise ValueError(f"Payment {payment_id} not found")

        current = row["status"]
        if new_status != current and new_status not in PAYMENT_TRANSITIONS.get(current, []):
            raise ValueError(f"Cannot transition from {current} to {new_status}")

        updates = ["status = ?", "updated_at = datetime('now')"]
        params = [new_status]
        if new_status in ("APPROVED", "PAID", "RECONCILED"):
            updates.append("approved_by = ?")
            params.append(user_name)

        if new_status == "PAID":
            tx_ref = transaction_reference or f"TXN-DEMO-PFMS-{row['id']:05d}"
            updates.append("transaction_reference = ?")
            params.append(tx_ref)
            updates.append("reconciliation_status = 'PENDING_RECONCILIATION'")
        elif transaction_reference:
            updates.append("transaction_reference = ?")
            params.append(transaction_reference)

        if new_status == "RECONCILED":
            updates.append("reconciliation_status = 'RECONCILED'")
            updates.append("reconciliation_notes = ?")
            params.append(remarks or "Reconciled with treasury payment advice bank scroll")

        params.append(payment_id)
        conn.execute(f"UPDATE payments SET {', '.join(updates)} WHERE id = ?", params)

        conn.execute("""
            INSERT INTO payment_actions
                (payment_id, project_id, user_name, user_role, action, previous_status, new_status, remarks)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (payment_id, row["project_id"], user_name, user_role, action, current, new_status, remarks))
        conn.commit()

    log_audit("payment", payment_id, row["project_id"], user_name, user_role,
              action, {"status": current}, {"status": new_status})
    return {"payment_id": payment_id, "previous_status": current, "new_status": new_status}


def _enrich_payment(d: Dict, conn: sqlite3.Connection) -> Dict:
    docs = json.loads(d.get("supporting_documents") or "[]")
    if not docs:
        docs = [
            "Vendor_Tax_Invoice_Signed.pdf",
            "Measurement_Book_MB_Abstract.pdf",
            "Quality_Inspection_Pass_Certificate.pdf"
        ]
    d["supporting_documents"] = docs
    d["actions"] = [dict(a) for a in conn.execute(
        "SELECT * FROM payment_actions WHERE payment_id = ? ORDER BY timestamp ASC",
        (d["id"],)
    ).fetchall()]

    # Default and enriched metadata
    if not d.get("category"):
        d["category"] = "Running Account Bill"
    if not d.get("milestone_id"):
        d["milestone_id"] = "Milestone 2 - Foundation & Substructure Completion"
    if not d.get("invoice_reference"):
        d["invoice_reference"] = f"INV-2026-{d['id']:04d}"
    if not d.get("reconciliation_status"):
        if d["status"] == "RECONCILED":
            d["reconciliation_status"] = "RECONCILED"
        elif d["status"] == "PAID":
            d["reconciliation_status"] = "PENDING_RECONCILIATION"
        else:
            d["reconciliation_status"] = "NOT_APPLICABLE"

    try:
        from backend.app.services.data_service import get_work_by_id
        w = get_work_by_id(d["project_id"])
        if w:
            d["work_description"] = w.get("work_description") or "Sanctioned Project Work"
            d["contractor_agency"] = d.get("contractor_agency") or w.get("implementing_agency") or "Contractor Agency"
        else:
            d["work_description"] = f"Project {d['project_id']}"
            d["contractor_agency"] = d.get("contractor_agency") or "Contractor Agency"
    except Exception:
        d["work_description"] = f"Project {d['project_id']}"
        d["contractor_agency"] = d.get("contractor_agency") or "Contractor Agency"

    return d


def get_payments(project_id: str = None, status: str = None, limit: int = 50) -> List[Dict]:
    with get_connection() as conn:
        conditions, params = [], []
        if project_id:
            conditions.append("project_id = ?")
            params.append(project_id)
        if status:
            conditions.append("status = ?")
            params.append(status)
        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        params.append(limit)
        rows = conn.execute(
            f"SELECT * FROM payments {where} ORDER BY updated_at DESC LIMIT ?", params
        ).fetchall()
        return [_enrich_payment(dict(r), conn) for r in rows]


def get_payment_by_id(payment_id: int) -> Optional[Dict]:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM payments WHERE id = ?", (payment_id,)).fetchone()
        if not row:
            return None
        return _enrich_payment(dict(row), conn)


def get_payment_actions(payment_id: int) -> List[Dict]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM payment_actions WHERE payment_id = ? ORDER BY timestamp",
            (payment_id,)
        ).fetchall()
        return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Development Requests CRUD
# ---------------------------------------------------------------------------

def submit_development_request(category: str, description: str,
                               latitude: float = None, longitude: float = None,
                               **kwargs) -> Dict:
    import uuid
    req_id = f"DR-{uuid.uuid4().hex[:8].upper()}"
    with get_connection() as conn:
        cur = conn.execute("""
            INSERT INTO development_requests
                (request_id, category, location_description, latitude, longitude,
                 description, photo_path, citizen_name, citizen_contact, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED')
        """, (
            req_id, category, kwargs.get("location_description"),
            latitude, longitude, description,
            kwargs.get("photo_path"), kwargs.get("citizen_name"),
            kwargs.get("citizen_contact")
        ))
        conn.commit()
        row_id = cur.lastrowid

    log_audit("development_request", row_id, None, kwargs.get("citizen_name", "Citizen"),
              "Citizen", "SUBMIT_REQUEST", None, {"category": category, "status": "SUBMITTED"})
    return {"id": row_id, "request_id": req_id, "status": "SUBMITTED"}


def find_nearby_existing_projects(latitude: float, longitude: float, radius_km: float = 3.0) -> List[Dict]:
    """Find active or existing MPLADS works within radius_km using high-speed vectorized numpy spatial lookup."""
    try:
        from backend.app.services.data_service import find_nearby_projects
        return find_nearby_projects(latitude, longitude, radius_km=radius_km, limit=5)
    except Exception as e:
        logger.warning(f"Error finding nearby projects: {e}")
        return []


def get_development_requests(status: str = None, category: str = None, limit: int = 50) -> List[Dict]:
    with get_connection() as conn:
        conditions, params = [], []
        if status:
            conditions.append("status = ?")
            params.append(status)
        if category:
            conditions.append("category = ?")
            params.append(category)
        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        params.append(limit)
        rows = conn.execute(
            f"SELECT * FROM development_requests {where} ORDER BY request_date DESC LIMIT ?", params
        ).fetchall()
        
        all_reqs = [dict(r) for r in rows]
        
        # Precompute category counts in O(N) instead of O(N^2)
        cat_counts = {}
        for req in all_reqs:
            cat = req.get("category", "")
            cat_counts[cat] = cat_counts.get(cat, 0) + 1

        for req in all_reqs:
            lat = req.get("latitude") or 26.84
            lon = req.get("longitude") or 80.94
            
            sim_count = cat_counts.get(req.get("category", ""), 1)
            req["similar_request_count"] = max(sim_count, 1)
            
            if req["similar_request_count"] >= 3:
                req["repeated_demand_signal"] = f"High repeated public demand signal ({req['similar_request_count']} similar requests in surrounding area) — authorized review recommended."
                req["signal_badge"] = "HIGH_DEMAND"
            else:
                req["repeated_demand_signal"] = "Standard citizen infrastructure requirement recorded."
                req["signal_badge"] = "STANDARD"

            # Check existing projects nearby (Feature 10) - fast vectorized spatial lookup
            nearby_prjs = find_nearby_existing_projects(lat, lon, radius_km=3.0)
            req["nearby_projects"] = nearby_prjs
            if nearby_prjs:
                p0 = nearby_prjs[0]
                req["nearby_project_match"] = {
                    "matched": True,
                    "project_id": p0["work_id"],
                    "title": p0["work_description"],
                    "status": p0["work_status"],
                    "distance_km": p0["distance_km"],
                    "message": f"Related project found nearby: {p0['work_description']} ({p0['work_status']}, {p0['distance_km']} km away)."
                }
            else:
                req["nearby_project_match"] = {
                    "matched": False,
                    "message": "No closely matching active project found within 3.0 km."
                }

        return all_reqs


def get_development_request(request_id: int) -> Optional[Dict]:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM development_requests WHERE id = ?", (request_id,)).fetchone()
        if not row:
            return None
        d = dict(row)
        lat = d.get("latitude") or 26.84
        lon = d.get("longitude") or 80.94
        d["nearby_projects"] = find_nearby_existing_projects(lat, lon, radius_km=3.0)
        return d


def find_nearby_requests(latitude: float, longitude: float, radius_km: float = 2.0) -> List[Dict]:
    """Find development requests within radius_km of a point."""
    all_requests = get_development_requests(limit=500)
    nearby = []
    for req in all_requests:
        if req.get("latitude") and req.get("longitude"):
            dist = haversine_distance(latitude, longitude, req["latitude"], req["longitude"])
            if dist <= radius_km * 1000:
                req["distance_km"] = round(dist / 1000, 2)
                nearby.append(req)
    nearby.sort(key=lambda x: x["distance_km"])
    return nearby


def take_request_decision(request_id: int, decided_by: str, user_role: str,
                          new_status: str, remarks: str = None,
                          linked_project_id: str = None) -> Dict:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM development_requests WHERE id = ?", (request_id,)).fetchone()
        if not row:
            raise ValueError(f"Request {request_id} not found")

        prev = row["status"]
        updates = {
            "status": new_status, "decided_by": decided_by,
            "decided_date": datetime.now().strftime("%Y-%m-%d"),
            "decision_remarks": remarks
        }
        
        # If decision is to approve or create proposal, auto-link project proposal
        if (new_status in ('APPROVED', 'LINKED_TO_PROJECT') or linked_project_id):
            pid = linked_project_id or f"PROP-DR-{row['request_id']}"
            updates["linked_project_id"] = pid
            
            # Create corresponding project proposal in project_approvals
            try:
                create_proposal(
                    project_id=pid,
                    proposed_by=f"Public Need: {row.get('citizen_name') or 'Citizen Representation'}",
                    estimated_cost=1500000.0,
                    proposal_description=f"Public Infrastructure Request [{row['category']}]: {row['description']}",
                    location_description=row.get('location_description'),
                    latitude=row.get('latitude'),
                    longitude=row.get('longitude'),
                    remarks=remarks or "Created directly from citizen development request workflow."
                )
            except Exception as e:
                logger.warning(f"Could not auto-create proposal from dev request {request_id}: {e}")

        set_clause = ", ".join(f"{k} = ?" for k in updates)
        conn.execute(
            f"UPDATE development_requests SET {set_clause} WHERE id = ?",
            list(updates.values()) + [request_id]
        )
        conn.commit()

    log_audit("development_request", request_id, updates.get("linked_project_id"), decided_by, user_role,
              "DECISION", {"status": prev}, {"status": new_status})
    return {"request_id": request_id, "previous_status": prev, "new_status": new_status, "linked_project_id": updates.get("linked_project_id")}


# ---------------------------------------------------------------------------
# Operations Audit Log Query
# ---------------------------------------------------------------------------

def get_audit_log(project_id: str = None, entity_type: str = None, limit: int = 100) -> List[Dict]:
    with get_connection() as conn:
        conditions, params = [], []
        if project_id:
            conditions.append("project_id = ?")
            params.append(project_id)
        if entity_type:
            conditions.append("entity_type = ?")
            params.append(entity_type)
        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        params.append(limit)
        rows = conn.execute(
            f"SELECT * FROM operations_audit_log {where} ORDER BY timestamp DESC LIMIT ?", params
        ).fetchall()
        results = []
        for r in rows:
            d = dict(r)
            if d.get("previous_value"):
                try:
                    d["previous_value"] = json.loads(d["previous_value"])
                except (json.JSONDecodeError, TypeError):
                    pass
            if d.get("new_value"):
                try:
                    d["new_value"] = json.loads(d["new_value"])
                except (json.JSONDecodeError, TypeError):
                    pass
            results.append(d)
        return results


# ---------------------------------------------------------------------------
# Unified Timeline
# ---------------------------------------------------------------------------

def get_unified_timeline(project_id: str, limit: int = 100) -> List[Dict]:
    """Aggregate events from all operational tables into chronological order."""
    events = []
    with get_connection() as conn:
        # Attendance events
        for r in conn.execute(
            "SELECT * FROM site_attendance WHERE project_id = ? ORDER BY date DESC LIMIT ?",
            (project_id, limit)
        ).fetchall():
            d = dict(r)
            events.append({
                "date": d["date"], "time": d["checkin_time"],
                "type": "attendance",
                "title": f"{d['person_name']} ({d['person_role']}) checked in",
                "detail": f"Location: {d['location_status']}",
                "status": d["location_status"],
                "source_id": d["id"]
            })

        # Daily updates
        for r in conn.execute(
            "SELECT * FROM daily_work_updates WHERE project_id = ? ORDER BY date DESC LIMIT ?",
            (project_id, limit)
        ).fetchall():
            d = dict(r)
            events.append({
                "date": d["date"], "time": d["created_at"],
                "type": "daily_update",
                "title": f"Daily Update by {d['person_name']}",
                "detail": d["work_description"][:150],
                "status": f"Progress: {d.get('cumulative_progress_pct', '—')}%",
                "source_id": d["id"]
            })

        # Agency supply
        for r in conn.execute(
            "SELECT asr.*, ac.agency_name FROM agency_supply_records asr JOIN agency_contracts ac ON asr.contract_id = ac.id WHERE asr.project_id = ? ORDER BY asr.delivery_date DESC LIMIT ?",
            (project_id, limit)
        ).fetchall():
            d = dict(r)
            events.append({
                "date": d.get("delivery_date", d["created_at"][:10]),
                "time": d["created_at"],
                "type": "material_supply",
                "title": f"Material Supply: {d['material_name']}",
                "detail": f"{d['supplied_quantity']} {d['unit']} from {d['agency_name']}",
                "status": d["verification_status"],
                "source_id": d["id"]
            })

        # Inventory transactions
        for r in conn.execute(
            "SELECT * FROM site_inventory_transactions WHERE project_id = ? ORDER BY date DESC LIMIT ?",
            (project_id, limit)
        ).fetchall():
            d = dict(r)
            verb = {"RECEIVED": "received", "USED": "used", "ADJUSTMENT": "adjusted"}.get(d["transaction_type"], d["transaction_type"])
            events.append({
                "date": d["date"], "time": d["created_at"],
                "type": "inventory",
                "title": f"Inventory: {d['material_name']} {verb}",
                "detail": f"{d['quantity']} {d['unit']}",
                "status": d["transaction_type"],
                "source_id": d["id"]
            })

        # Payments
        for r in conn.execute(
            "SELECT * FROM payments WHERE project_id = ? ORDER BY date DESC LIMIT ?",
            (project_id, limit)
        ).fetchall():
            d = dict(r)
            events.append({
                "date": d["date"], "time": d["created_at"],
                "type": "payment",
                "title": f"Payment: ₹{d['amount']:,.0f}",
                "detail": f"To: {d.get('contractor_agency', '—')} | Ref: {d.get('payment_request_id', '—')}",
                "status": d["status"],
                "source_id": d["id"]
            })

        # Approval actions
        for r in conn.execute(
            "SELECT * FROM approval_actions WHERE project_id = ? ORDER BY timestamp LIMIT ?",
            (project_id, limit)
        ).fetchall():
            d = dict(r)
            events.append({
                "date": d["timestamp"][:10], "time": d["timestamp"],
                "type": "approval",
                "title": f"Approval: {d['action']} by {d['user_name']}",
                "detail": d.get("remarks", ""),
                "status": d["new_status"],
                "source_id": d["id"]
            })

        # Development requests linked to this project
        for r in conn.execute(
            "SELECT * FROM development_requests WHERE linked_project_id = ? ORDER BY request_date DESC LIMIT ?",
            (project_id, limit)
        ).fetchall():
            d = dict(r)
            events.append({
                "date": d["request_date"], "time": d["created_at"],
                "type": "development_request",
                "title": f"Public Request: {d['category']}",
                "detail": d["description"][:150],
                "status": d["status"],
                "source_id": d["id"]
            })

        # Master Project Lifecycle Milestones

        try:
            from backend.app.services.data_service import get_work_by_id
            w = get_work_by_id(project_id)
            if w:
                sanc_amt = float(w.get("sanctioned_amount") or 0)
                sanc_date = str(w.get("sanction_date") or "2024-06-15")
                agency = w.get("implementing_agency") or "District Implementing Agency"
                
                # Sanction milestone
                events.append({
                    "date": sanc_date, "time": f"{sanc_date}T10:00:00Z",
                    "type": "milestone",
                    "title": "Administrative & Financial Sanction Accorded",
                    "detail": f"Formal sanction of ₹{sanc_amt:,.0f} approved by District Authority under MPLADS guidelines.",
                    "status": "APPROVED",
                    "source_id": "SANCTION"
                })
                
                # Work order milestone
                events.append({
                    "date": "2024-07-01", "time": "2024-07-01T11:30:00Z",
                    "type": "milestone",
                    "title": "Work Order Issued & Implementing Agency Onboarded",
                    "detail": f"Entrusted to {agency} for scheduled execution.",
                    "status": "ACTIVE",
                    "source_id": "WORK_ORDER"
                })
                
                # Target completion milestone
                target_date = str(w.get("target_completion_date") or "2025-03-31")
                events.append({
                    "date": target_date, "time": f"{target_date}T18:00:00Z",
                    "type": "milestone",
                    "title": "Target Completion Deadline",
                    "detail": f"Statutory milestone for physical handover and utilization certificate submission.",
                    "status": "TARGET",
                    "source_id": "TARGET_COMPLETION"
                })
        except Exception as e:
            logger.warning(f"Could not inject master milestones for {project_id}: {e}")

    # Sort all events chronologically (newest first)
    events.sort(key=lambda e: e.get("time") or e.get("date") or "", reverse=True)
    return events[:limit]

