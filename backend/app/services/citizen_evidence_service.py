"""
Citizen Evidence Business Logic & Signal Analysis Service.
Handles proximity checks via Haversine formula, discrepancy analysis against official e-SAKSHI data,
and supervisory verification lifecycle management.
"""

import math
import uuid
import shutil
import logging
import json
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
import pandas as pd
from fastapi import UploadFile

try:
    import imagehash
    from PIL import Image as PILImage
    IMAGEHASH_AVAILABLE = True
except ImportError:
    IMAGEHASH_AVAILABLE = False

from backend.app.db.citizen_evidence_db import get_all_phashes

from backend.app.db.citizen_evidence_db import (
    init_db,
    insert_evidence,
    get_all_evidence,
    get_evidence_by_id,
    update_evidence_verification,
    get_evidence_stats,
    get_evidence_count,
    UPLOADS_DIR
)
from backend.app.services.data_service import get_work_by_id, get_dataframe

logger = logging.getLogger(__name__)

def compute_photo_phash(photo_path: Path) -> Optional[str]:
    if not IMAGEHASH_AVAILABLE:
        return None
    try:
        img = PILImage.open(photo_path)
        return str(imagehash.phash(img))
    except Exception as e:
        logger.warning(f"pHash computation failed: {e}")
        return None

def check_photo_reuse(phash_str: str, current_work_id: str) -> Dict[str, Any]:
    if not phash_str:
        return {"flag": None, "matches": []}
    existing = get_all_phashes(exclude_work_id=current_work_id)
    matches = []
    for rec in existing:
        try:
            existing_hash = imagehash.hex_to_hash(rec["photo_phash"])
            current_hash = imagehash.hex_to_hash(phash_str)
            distance = current_hash - existing_hash
            if distance < 8:
                matches.append({
                    "matched_evidence_id": rec["id"],
                    "matched_work_id": rec["work_id"],
                    "hamming_distance": distance
                })
        except Exception:
            continue
    flag = "REUSED_PHOTO_SUSPECTED" if matches else None
    return {"flag": flag, "matches": matches}

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance between two GPS coordinates in kilometers."""
    R = 6371.0  # Earth radius in kilometers

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    return round(R * c, 3)


def categorize_proximity(distance_km: float) -> str:
    """Categorizes spatial proximity between citizen reporting location and project site."""
    if distance_km <= 1.0:
        return "HIGH_PROXIMITY"
    elif distance_km <= 5.0:
        return "MODERATE_PROXIMITY"
    else:
        return "LOCATION_MISMATCH"


def save_evidence_photo(upload_file: UploadFile) -> Tuple[str, str]:
    """Saves uploaded photo to uploads directory and returns (filename, url_path)."""
    file_ext = Path(upload_file.filename).suffix.lower()
    if file_ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        file_ext = ".jpg"

    unique_filename = f"{uuid.uuid4().hex[:12]}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}{file_ext}"
    dest_path = UPLOADS_DIR / unique_filename

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)

    url_path = f"/api/citizen-evidence/photo/{unique_filename}"
    return unique_filename, url_path


def create_citizen_evidence_submission(
    work_id: str,
    issue_type: str,
    description: str,
    latitude: float,
    longitude: float,
    citizen_name: Optional[str] = None,
    citizen_contact: Optional[str] = None,
    claimed_progress: Optional[float] = None,
    photo_file: Optional[UploadFile] = None
) -> Dict[str, Any]:
    """
    Validates and stores citizen ground evidence, computing distance to work centroid
    and physical progress discrepancy.
    """
    # Look up official work details
    work = get_work_by_id(work_id)
    if work and "latitude" in work and "longitude" in work and pd.notnull(work["latitude"]) and pd.notnull(work["longitude"]):
        work_lat = float(work["latitude"])
        work_lon = float(work["longitude"])
        dist_km = haversine_distance_km(latitude, longitude, work_lat, work_lon)
        proximity_flag = categorize_proximity(dist_km)
    else:
        # If work is a newly uploaded/custom ID without recorded GPS centroid,
        # anchor to the citizen's ground location as initial reference.
        work_lat = latitude
        work_lon = longitude
        dist_km = 0.0
        proximity_flag = "HIGH_PROXIMITY"
    official_progress = float(work.get("completion_percentage", 0.0)) if work else 0.0

    # Progress discrepancy
    progress_val = claimed_progress if claimed_progress is not None else official_progress
    gap = round(abs(official_progress - progress_val), 1)

    # Save photo if provided
    photo_filename = None
    photo_url = None
    
    photo_phash = None
    reused_photo_flag = None
    reused_photo_matches = []
    classified_stage = "UNVERIFIED"
    image_progress_mismatch = None
    mismatch_severity = None
    
    if photo_file:
        try:
            photo_filename, photo_url = save_evidence_photo(photo_file)
            
            photo_path = UPLOADS_DIR / photo_filename
            
            # 6a: Perceptual hash duplicate detection
            photo_phash = compute_photo_phash(photo_path)
            if photo_phash:
                reuse_result = check_photo_reuse(photo_phash, work_id)
                reused_photo_flag = reuse_result["flag"]
                reused_photo_matches = reuse_result["matches"]
            
            # 6b: Construction stage classification
            try:
                from backend.app.services.image_classifier import classify_construction_stage
                classification = classify_construction_stage(str(photo_path))
                classified_stage = classification.get("classified_stage", "UNVERIFIED")
            except Exception as e:
                logger.warning(f"Image classification failed: {e}")
                classified_stage = "UNVERIFIED"
            
            # 6c: Cross-check classified stage vs official progress
            if classified_stage not in ("UNVERIFIED", "NOT_CONSTRUCTION"):
                if official_progress > 80.0 and classified_stage in ("EMPTY_SITE", "FOUNDATION"):
                    image_progress_mismatch = "IMAGE_PROGRESS_MISMATCH"
                    mismatch_severity = "HIGH"
                elif official_progress > 50.0 and classified_stage == "EMPTY_SITE":
                    image_progress_mismatch = "IMAGE_PROGRESS_MISMATCH"
                    mismatch_severity = "MEDIUM"
                    
        except Exception as e:
            logger.error("Failed to process evidence photo: %s", e)

    evidence_id = f"CE-{uuid.uuid4().hex[:8].upper()}"
    now_iso = datetime.now(timezone.utc).isoformat()

    record = {
        "id": evidence_id,
        "work_id": work_id,
        "citizen_name": citizen_name.strip() if citizen_name else "Anonymous Citizen",
        "citizen_contact": citizen_contact.strip() if citizen_contact else None,
        "issue_type": issue_type,
        "description": description.strip(),
        "photo_filename": photo_filename,
        "photo_url": photo_url,
        "latitude": latitude,
        "longitude": longitude,
        "work_latitude": work_lat,
        "work_longitude": work_lon,
        "distance_from_site_km": dist_km,
        "proximity_flag": proximity_flag,
        "official_progress": official_progress,
        "claimed_progress": progress_val,
        "progress_gap": gap,
        "submission_timestamp": now_iso,
        "verification_status": "PENDING_VERIFICATION",
        "admin_notes": None,
        "verified_at": None,
        "verified_by": None,
        "photo_phash": photo_phash,
        "reused_photo_flag": reused_photo_flag,
        "reused_photo_matches": json.dumps(reused_photo_matches) if reused_photo_matches else None,
        "classified_stage": classified_stage,
        "image_progress_mismatch": image_progress_mismatch,
        "mismatch_severity": mismatch_severity
    }

    insert_evidence(record)
    logger.info("New citizen evidence submitted for work %s (ID: %s, Distance: %.2f km)", work_id, evidence_id, dist_km)
    
    # Attach work context for caller
    if work:
        record["work_description"] = work.get("work_description", "")
        record["district"] = work.get("district", "")
        record["state"] = work.get("state", "")
        record["sector"] = work.get("sector", "")
        record["sanctioned_amount"] = work.get("sanctioned_amount", 0.0)

    return record


def get_enriched_evidence_list(
    work_id: Optional[str] = None,
    verification_status: Optional[str] = None,
    issue_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
) -> List[Dict[str, Any]]:
    """Fetches evidence records and enriches them with work metadata from the data lake."""
    raw_list = get_all_evidence(work_id=work_id, verification_status=verification_status, issue_type=issue_type, limit=limit, offset=offset)
    
    # Pre-fetch works lookup
    df = get_dataframe()
    works_map = {}
    if "work_id" in df.columns:
        relevant_ids = {r["work_id"] for r in raw_list}
        matches = df[df["work_id"].isin(relevant_ids)]
        for _, row in matches.iterrows():
            works_map[row["work_id"]] = {
                "work_description": row.get("work_description", ""),
                "district": row.get("district", ""),
                "state": row.get("state", ""),
                "sector": row.get("sector", ""),
                "sanctioned_amount": float(row.get("sanctioned_amount", 0.0)),
                "composite_risk_score": float(row.get("composite_risk_score", 0.0)),
                "risk_level": row.get("risk_level", "LOW")
            }

    for item in raw_list:
        w_info = works_map.get(item["work_id"], {})
        item.update(w_info)
        if item.get("photo_filename"):
            item["photo_url"] = f"/api/citizen-evidence/photo/{item['photo_filename']}"

    return raw_list


def seed_demo_citizen_evidence(force: bool = False):
    """Seeds initial demonstration citizen evidence records if database is empty or forced."""
    init_db()
    if not force and get_evidence_count() > 0:
        return

    df = get_dataframe()
    if df.empty or "work_id" not in df.columns:
        return

    # Select high-risk and medium-risk works for compelling demo signals
    if "risk_level" in df.columns:
        high_works = df[df["risk_level"] == "HIGH"].head(3)
        med_works = df[df["risk_level"] == "MEDIUM"].head(2)
        selected_works = pd.concat([high_works, med_works]) if len(high_works) > 0 else df.head(5)
    else:
        selected_works = df.head(5)

    sample_reports = [
        {
            "issue_type": "WORK_NOT_STARTED",
            "description": "Ground inspection shows only weed-covered open ground. Portal claims 85% completion and funds released, but zero construction has commenced.",
            "claimed_progress": 0.0,
            "citizen_name": "Ramesh Chandra Sharma (Gram Panchayat Member)",
            "verification_status": "FIELD_INSPECTION_SCHEDULED",
            "admin_notes": "Collector ordered physical site inspection on 12th Sept following citizen photo evidence."
        },
        {
            "issue_type": "SUBSTANDARD_WORK",
            "description": "Constructed community hall roof already showing large structural cracks after 3 months. Inferior cement mix and rusted rebar used.",
            "claimed_progress": 60.0,
            "citizen_name": "Pooja Verma",
            "verification_status": "SUPERVISORY_VERIFIED",
            "admin_notes": "PWD Junior Engineer confirmed structural defects on 2nd Sept. Show cause notice issued."
        },
        {
            "issue_type": "PROGRESS_DELAYED",
            "description": "Road paving stopped 8 months ago. Heavy gravel left strewn across village approach causing daily accidents. No labor on site.",
            "claimed_progress": 35.0,
            "citizen_name": "Vijay K. Yadav",
            "verification_status": "PENDING_VERIFICATION",
            "admin_notes": None
        },
        {
            "issue_type": "COMPLETED_OPERATIONAL",
            "description": "Solar drinking water kiosk successfully installed, water filtration tested, and fully utilized by 350+ households daily.",
            "claimed_progress": 100.0,
            "citizen_name": "Sunita Devi (Self Help Group Lead)",
            "verification_status": "SUPERVISORY_VERIFIED",
            "admin_notes": "Asset verified operational and geo-tagged in field audit."
        },
        {
            "issue_type": "ABANDONED_SITE",
            "description": "Primary healthcare sub-center foundation dug in 2023, boundary wall collapsed, site waterlogged and abandoned by contractor.",
            "claimed_progress": 15.0,
            "citizen_name": "Anonymous Resident",
            "verification_status": "PENDING_VERIFICATION",
            "admin_notes": None
        }
    ]

    idx = 0
    for _, row in selected_works.iterrows():
        if idx >= len(sample_reports):
            break
        report = sample_reports[idx]
        w_id = str(row["work_id"])
        w_lat = float(row.get("latitude", 20.5937))
        w_lon = float(row.get("longitude", 78.9629))
        official_p = float(row.get("completion_percentage", 50.0))

        # Add tiny realistic GPS jitter for ground proximity (within 300 meters)
        jitter_lat = w_lat + (idx * 0.0012)
        jitter_lon = w_lon - (idx * 0.0008)
        dist_km = haversine_distance_km(jitter_lat, jitter_lon, w_lat, w_lon)

        evidence_id = f"CE-DEMO-{idx+1:03d}"
        now_iso = datetime.now(timezone.utc).isoformat()
        gap = round(abs(official_p - report["claimed_progress"]), 1)

        insert_evidence({
            "id": evidence_id,
            "work_id": w_id,
            "citizen_name": report["citizen_name"],
            "citizen_contact": "resident.audit@mplads.gov.in",
            "issue_type": report["issue_type"],
            "description": report["description"],
            "photo_filename": f"demo_evidence_{idx+1}.jpg",
            "photo_url": None,
            "latitude": jitter_lat,
            "longitude": jitter_lon,
            "work_latitude": w_lat,
            "work_longitude": w_lon,
            "distance_from_site_km": dist_km,
            "proximity_flag": "HIGH_PROXIMITY",
            "official_progress": official_p,
            "claimed_progress": report["claimed_progress"],
            "progress_gap": gap,
            "submission_timestamp": now_iso,
            "verification_status": report["verification_status"],
            "admin_notes": report["admin_notes"],
            "verified_at": now_iso if report["verification_status"] != "PENDING_VERIFICATION" else None,
            "verified_by": "District Monitoring Cell" if report["verification_status"] != "PENDING_VERIFICATION" else None
        })
        idx += 1

    logger.info("Successfully seeded %d demonstration citizen evidence records.", idx)
