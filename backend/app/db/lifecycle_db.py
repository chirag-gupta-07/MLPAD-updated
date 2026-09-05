"""
Database repository for Project Longitudinal Lifecycle, Milestones, Materials, Check-ins, Inspections, and Audit Logs (SIH26102).
"""

import sqlite3
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

DB_DIR = Path(r"C:\Users\kavit\Installation\SIH 2026\data\lifecycle")
DB_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DB_DIR / "project_lifecycle.db"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_lifecycle_db():
    """Initializes the complete longitudinal project lifecycle database schema."""
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS project_scopes (
                work_id TEXT PRIMARY KEY,
                approved_scope TEXT,
                measurable_unit TEXT,
                planned_quantity REAL DEFAULT 1.0,
                reported_quantity REAL DEFAULT 0.0,
                verified_quantity REAL DEFAULT 0.0,
                planned_completion_pct REAL DEFAULT 100.0,
                reported_completion_pct REAL DEFAULT 0.0,
                verified_completion_pct REAL DEFAULT 0.0,
                responsible_agency TEXT,
                contractor_name TEXT,
                contractor_status TEXT DEFAULT 'VERIFIED',
                technical_specifications TEXT,
                completion_claim_status TEXT DEFAULT 'PENDING_CLAIM',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS project_milestones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                work_id TEXT,
                milestone_order INTEGER,
                milestone_name TEXT,
                target_percentage REAL,
                planned_start_date TEXT,
                planned_end_date TEXT,
                actual_end_date TEXT,
                status TEXT DEFAULT 'PENDING',
                verified_by TEXT,
                verification_date TEXT,
                remarks TEXT
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS daily_updates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                work_id TEXT,
                update_date TEXT,
                responsible_person_name TEXT,
                responsible_person_role TEXT,
                aggregate_workers_present INTEGER DEFAULT 0,
                work_performed_today TEXT,
                physical_progress_reported REAL,
                materials_received_today TEXT,
                materials_used_today TEXT,
                issues_faced TEXT,
                delay_reason TEXT,
                next_planned_activity TEXT,
                photo_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS site_checkins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                work_id TEXT,
                responsible_person_id TEXT,
                responsible_person_name TEXT,
                checkin_timestamp TEXT,
                gps_latitude REAL,
                gps_longitude REAL,
                project_latitude REAL,
                project_longitude REAL,
                distance_meters REAL,
                status TEXT,
                site_photo_url TEXT
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS material_ledger (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                work_id TEXT,
                material_name TEXT,
                category TEXT,
                specification TEXT,
                unit TEXT,
                planned_quantity REAL DEFAULT 0.0,
                ordered_quantity REAL DEFAULT 0.0,
                received_quantity REAL DEFAULT 0.0,
                used_quantity REAL DEFAULT 0.0,
                remaining_quantity REAL DEFAULT 0.0,
                estimated_unit_rate REAL DEFAULT 0.0,
                actual_unit_rate REAL DEFAULT 0.0,
                supplier_name TEXT,
                invoice_ref TEXT,
                quality_status TEXT DEFAULT 'DOCUMENTATION_COMPLETE',
                test_certificate_ref TEXT,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS field_inspections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                work_id TEXT,
                inspector_name TEXT,
                inspector_designation TEXT,
                inspection_date TEXT,
                gps_latitude REAL,
                gps_longitude REAL,
                distance_from_site_meters REAL,
                checklist_json TEXT,
                measurements_taken TEXT,
                observed_progress_pct REAL,
                result TEXT,
                remarks TEXT,
                photo_urls_json TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS citizen_complaints (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                work_id TEXT,
                citizen_name TEXT DEFAULT 'Anonymous Citizen',
                issue_category TEXT,
                description TEXT,
                photo_url TEXT,
                submission_date TEXT,
                status TEXT DEFAULT 'SUBMITTED',
                is_repeated_signal BOOLEAN DEFAULT 0,
                escalation_recommended BOOLEAN DEFAULT 0,
                action_taken TEXT,
                resolved_date TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                work_id TEXT,
                action_type TEXT,
                performed_by TEXT,
                user_role TEXT,
                timestamp TEXT,
                previous_value TEXT,
                new_value TEXT,
                reason TEXT
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_scope_work_id ON project_scopes (work_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_milestones_work_id ON project_milestones (work_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_materials_work_id ON material_ledger (work_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_inspections_work_id ON field_inspections (work_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_complaints_work_id ON citizen_complaints (work_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_work_id ON audit_logs (work_id);")
        conn.commit()
    logger.info("Lifecycle SQLite Database initialized.")


def get_project_lifecycle(work_id: str) -> Dict[str, Any]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM project_scopes WHERE work_id = ?", (work_id,))
        scope_row = cursor.fetchone()
        scope = dict(scope_row) if scope_row else None

        cursor.execute("SELECT * FROM project_milestones WHERE work_id = ? ORDER BY milestone_order ASC", (work_id,))
        milestones = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM material_ledger WHERE work_id = ?", (work_id,))
        materials = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM daily_updates WHERE work_id = ? ORDER BY update_date DESC LIMIT 10", (work_id,))
        daily_updates = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM site_checkins WHERE work_id = ? ORDER BY checkin_timestamp DESC LIMIT 5", (work_id,))
        checkins = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM field_inspections WHERE work_id = ? ORDER BY inspection_date DESC", (work_id,))
        inspections = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM citizen_complaints WHERE work_id = ? ORDER BY submission_date DESC", (work_id,))
        complaints = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM audit_logs WHERE work_id = ? ORDER BY timestamp DESC LIMIT 20", (work_id,))
        audit_logs = [dict(r) for r in cursor.fetchall()]

    return {
        "work_id": work_id,
        "scope": scope,
        "milestones": milestones,
        "materials": materials,
        "daily_updates": daily_updates,
        "checkins": checkins,
        "inspections": inspections,
        "complaints": complaints,
        "audit_logs": audit_logs
    }


def record_audit_event(work_id: str, action_type: str, performed_by: str, user_role: str, prev_val: Any, new_val: Any, reason: str = ""):
    with get_connection() as conn:
        conn.execute("""
            INSERT INTO audit_logs (work_id, action_type, performed_by, user_role, timestamp, previous_value, new_value, reason)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            work_id,
            action_type,
            performed_by,
            user_role,
            datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
            json.dumps(prev_val) if isinstance(prev_val, (dict, list)) else str(prev_val or ""),
            json.dumps(new_val) if isinstance(new_val, (dict, list)) else str(new_val or ""),
            reason
        ))
        conn.commit()


def add_field_inspection(work_id: str, inspection_data: Dict[str, Any]) -> int:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO field_inspections (
                work_id, inspector_name, inspector_designation, inspection_date,
                gps_latitude, gps_longitude, distance_from_site_meters,
                checklist_json, measurements_taken, observed_progress_pct, result, remarks, photo_urls_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            work_id,
            inspection_data.get("inspector_name", "Authorized Officer"),
            inspection_data.get("inspector_designation", "District Inspection Cell"),
            inspection_data.get("inspection_date", datetime.now().strftime("%Y-%m-%d")),
            inspection_data.get("gps_latitude"),
            inspection_data.get("gps_longitude"),
            inspection_data.get("distance_from_site_meters", 0.0),
            json.dumps(inspection_data.get("checklist", [])),
            inspection_data.get("measurements_taken", ""),
            float(inspection_data.get("observed_progress_pct", 0.0)),
            inspection_data.get("result", "VERIFIED"),
            inspection_data.get("remarks", ""),
            json.dumps(inspection_data.get("photo_urls", []))
        ))
        insp_id = cursor.lastrowid

        if "observed_progress_pct" in inspection_data:
            cursor.execute("""
                UPDATE project_scopes 
                SET verified_completion_pct = ?, updated_at = CURRENT_TIMESTAMP
                WHERE work_id = ?
            """, (float(inspection_data["observed_progress_pct"]), work_id))
        conn.commit()

    record_audit_event(
        work_id=work_id,
        action_type="FIELD_INSPECTION_RECORDED",
        performed_by=inspection_data.get("inspector_name", "Inspector"),
        user_role="FIELD_INSPECTOR",
        prev_val="",
        new_val={"result": inspection_data.get("result"), "observed_pct": inspection_data.get("observed_progress_pct")},
        reason=inspection_data.get("remarks", "")
    )
    return insp_id

