"""
Database repository for Feature 7.6: Citizen Evidence.
Uses SQLite for persistent, transactional storage of citizen reports, photo metadata,
GPS coordinates, and administrative verification status.
"""

import sqlite3
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[3]
DB_DIR = PROJECT_ROOT / "data" / "citizen_evidence"
DB_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR = DB_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DB_DIR / "citizen_evidence.db"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initializes the citizen_evidence table schema if it does not exist."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS citizen_evidence (
                id TEXT PRIMARY KEY,
                work_id TEXT NOT NULL,
                citizen_name TEXT,
                citizen_contact TEXT,
                issue_type TEXT NOT NULL,
                description TEXT NOT NULL,
                photo_filename TEXT,
                photo_url TEXT,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                work_latitude REAL,
                work_longitude REAL,
                distance_from_site_km REAL,
                proximity_flag TEXT,
                official_progress REAL,
                claimed_progress REAL,
                progress_gap REAL,
                submission_timestamp TEXT NOT NULL,
                verification_status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
                admin_notes TEXT,
                verified_at TEXT,
                verified_by TEXT,
                photo_phash TEXT,
                classified_stage TEXT,
                reused_photo_flag TEXT,
                reused_photo_matches TEXT,
                image_progress_mismatch TEXT,
                mismatch_severity TEXT
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_evidence_work_id ON citizen_evidence (work_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_evidence_status ON citizen_evidence (verification_status);")
        
        # Add columns if they do not exist (migration)
        for col in ["photo_phash", "classified_stage", "reused_photo_flag", "reused_photo_matches", "image_progress_mismatch", "mismatch_severity"]:
            try:
                cursor.execute(f"ALTER TABLE citizen_evidence ADD COLUMN {col} TEXT")
            except sqlite3.OperationalError:
                # Column already exists
                pass

        conn.commit()
        logger.info("Citizen evidence database initialized successfully at %s", DB_PATH)

def get_all_phashes(exclude_work_id: str = None) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        if exclude_work_id:
            cursor.execute("SELECT id, work_id, photo_phash FROM citizen_evidence WHERE photo_phash IS NOT NULL AND work_id != ?", (exclude_work_id,))
        else:
            cursor.execute("SELECT id, work_id, photo_phash FROM citizen_evidence WHERE photo_phash IS NOT NULL")
        return [dict(row) for row in cursor.fetchall()]


def insert_evidence(record: Dict[str, Any]) -> Dict[str, Any]:
    full_record = {
        "id": record.get("id"),
        "work_id": record.get("work_id"),
        "citizen_name": record.get("citizen_name"),
        "citizen_contact": record.get("citizen_contact"),
        "issue_type": record.get("issue_type"),
        "description": record.get("description"),
        "photo_filename": record.get("photo_filename"),
        "photo_url": record.get("photo_url"),
        "latitude": record.get("latitude"),
        "longitude": record.get("longitude"),
        "work_latitude": record.get("work_latitude"),
        "work_longitude": record.get("work_longitude"),
        "distance_from_site_km": record.get("distance_from_site_km"),
        "proximity_flag": record.get("proximity_flag"),
        "official_progress": record.get("official_progress"),
        "claimed_progress": record.get("claimed_progress"),
        "progress_gap": record.get("progress_gap"),
        "submission_timestamp": record.get("submission_timestamp"),
        "verification_status": record.get("verification_status", "PENDING_VERIFICATION"),
        "admin_notes": record.get("admin_notes"),
        "verified_at": record.get("verified_at"),
        "verified_by": record.get("verified_by"),
        "photo_phash": record.get("photo_phash"),
        "classified_stage": record.get("classified_stage"),
        "reused_photo_flag": record.get("reused_photo_flag"),
        "reused_photo_matches": record.get("reused_photo_matches"),
        "image_progress_mismatch": record.get("image_progress_mismatch"),
        "mismatch_severity": record.get("mismatch_severity")
    }
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO citizen_evidence (
                id, work_id, citizen_name, citizen_contact, issue_type,
                description, photo_filename, photo_url, latitude, longitude,
                work_latitude, work_longitude, distance_from_site_km, proximity_flag,
                official_progress, claimed_progress, progress_gap,
                submission_timestamp, verification_status, admin_notes, verified_at, verified_by,
                photo_phash, classified_stage, reused_photo_flag, reused_photo_matches,
                image_progress_mismatch, mismatch_severity
            ) VALUES (
                :id, :work_id, :citizen_name, :citizen_contact, :issue_type,
                :description, :photo_filename, :photo_url, :latitude, :longitude,
                :work_latitude, :work_longitude, :distance_from_site_km, :proximity_flag,
                :official_progress, :claimed_progress, :progress_gap,
                :submission_timestamp, :verification_status, :admin_notes, :verified_at, :verified_by,
                :photo_phash, :classified_stage, :reused_photo_flag, :reused_photo_matches,
                :image_progress_mismatch, :mismatch_severity
            )
        """, full_record)
        conn.commit()
    return record


def get_all_evidence(
    work_id: Optional[str] = None,
    verification_status: Optional[str] = None,
    issue_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
) -> List[Dict[str, Any]]:
    query = "SELECT * FROM citizen_evidence WHERE 1=1"
    params = []

    if work_id:
        query += " AND work_id = ?"
        params.append(work_id)

    if verification_status:
        query += " AND verification_status = ?"
        params.append(verification_status)

    if issue_type:
        query += " AND issue_type = ?"
        params.append(issue_type)

    query += " ORDER BY submission_timestamp DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def get_evidence_by_id(evidence_id: str) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM citizen_evidence WHERE id = ?", (evidence_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def update_evidence_verification(
    evidence_id: str,
    status: str,
    admin_notes: Optional[str] = None,
    verified_by: Optional[str] = "District Nodal Officer"
) -> Optional[Dict[str, Any]]:
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE citizen_evidence
            SET verification_status = ?,
                admin_notes = COALESCE(?, admin_notes),
                verified_at = ?,
                verified_by = ?
            WHERE id = ?
        """, (status, admin_notes, now_iso, verified_by, evidence_id))
        conn.commit()

    return get_evidence_by_id(evidence_id)


def delete_evidence(evidence_id: str) -> bool:
    """Deletes a citizen evidence record by ID and removes its photo if existing."""
    record = get_evidence_by_id(evidence_id)
    if not record:
        return False

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM citizen_evidence WHERE id = ?", (evidence_id,))
        conn.commit()

    photo_filename = record.get("photo_filename")
    if photo_filename:
        photo_path = UPLOADS_DIR / photo_filename
        if photo_path.exists() and not photo_filename.startswith("demo_evidence_"):
            try:
                photo_path.unlink()
            except Exception:
                pass

    return True


def get_evidence_count(work_id: Optional[str] = None) -> int:
    with get_connection() as conn:
        cursor = conn.cursor()
        if work_id:
            cursor.execute("SELECT COUNT(*) FROM citizen_evidence WHERE work_id = ?", (work_id,))
        else:
            cursor.execute("SELECT COUNT(*) FROM citizen_evidence")
        return cursor.fetchone()[0]


def get_evidence_stats() -> Dict[str, Any]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM citizen_evidence")
        total = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM citizen_evidence WHERE verification_status = 'PENDING_VERIFICATION'")
        pending = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM citizen_evidence WHERE verification_status = 'SUPERVISORY_VERIFIED'")
        verified = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM citizen_evidence WHERE verification_status = 'FIELD_INSPECTION_SCHEDULED'")
        inspection_scheduled = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM citizen_evidence WHERE proximity_flag = 'HIGH_PROXIMITY'")
        high_proximity = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM citizen_evidence WHERE progress_gap >= 30.0")
        high_discrepancy = cursor.fetchone()[0]

        return {
            "total_reports": total,
            "pending_verification": pending,
            "supervisory_verified": verified,
            "inspection_scheduled": inspection_scheduled,
            "high_proximity_reports": high_proximity,
            "significant_discrepancies": high_discrepancy
        }
