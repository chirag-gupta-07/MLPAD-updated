"""
Contractor AI Intelligence Services for SIH 2026.
Provides:
1. Contractor Reliability & Performance Scoring
2. Tender Cartel & Bid-Rigging Detection
3. Abnormally Low Bid (Dumping) Screener
4. KYC Document Scrutiny
5. Site Inspection Photo EXIF & Geofence Verification (<= 50m)
"""

import re
import io
import math
import logging
from typing import Dict, Any, List, Optional
from geopy.distance import geodesic

logger = logging.getLogger(__name__)

PAN_REGEX = r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$"
GSTIN_REGEX = r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"


def calculate_contractor_reliability(history: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes a composite reliability score (0-100) using historical performance metrics.
    Features:
    - total_works: past volume of projects
    - on_time_ratio: fraction completed within sanctioned deadline
    - cost_overrun_pct: % budget escalation on past projects
    - citizen_rating: public feedback average (1-5)
    """
    total = max(1, history.get("total_works", 1))
    on_time = history.get("completed_on_time", total) / total
    cost_overrun = min(1.0, max(0.0, history.get("avg_cost_overrun_pct", 5.0) / 100.0))
    rating = min(5.0, max(1.0, history.get("citizen_rating", 4.2))) / 5.0

    # Weighted Composite Scoring
    raw_score = (0.45 * on_time) + (0.35 * (1.0 - cost_overrun)) + (0.20 * rating)
    score = round(raw_score * 100, 1)

    if score >= 75.0:
        tier = "TIER_1_RELIABLE"
        badge = "Gold Class"
        recommendation = "Recommended for high-value tenders. Excellent track record."
    elif score >= 50.0:
        tier = "TIER_2_MODERATE"
        badge = "Silver Class"
        recommendation = "Standard eligibility. Regular milestone verification advised."
    else:
        tier = "TIER_3_HIGH_RISK"
        badge = "Bronze Class (Monitored)"
        recommendation = "High risk of delay or budget escalation. Requires pre-sanction audit."

    return {
        "reliability_score": score,
        "tier": tier,
        "badge": badge,
        "on_time_percentage": round(on_time * 100, 1),
        "cost_overrun_risk": "HIGH" if cost_overrun > 0.20 else "LOW",
        "recommendation": recommendation
    }


def detect_cartel_and_collusion(bids: List[Dict[str, Any]], estimated_cost: float) -> List[Dict[str, Any]]:
    """
    Evaluates submitted bids for illegal collusion, price-fixing, and dumping.
    Detects:
    1. IP Address / Device Collision (Multiple bids from same source).
    2. Abnormally Low Bid / Dumping (< 25% below government estimate).
    3. Suspiciously Clustered Bids (Bids within 0.5% margin of each other).
    """
    flags = []
    if not bids:
        return flags

    # 1. IP / Network Collision Check
    ip_map: Dict[str, List[str]] = {}
    for b in bids:
        ip = b.get("submission_ip", "127.0.0.1")
        c_id = b.get("contractor_id", "Unknown")
        ip_map.setdefault(ip, []).append(c_id)

    for ip, c_list in ip_map.items():
        if len(c_list) > 1 and ip not in ("127.0.0.1", "localhost"):
            flags.append({
                "type": "IP_COLLUSION",
                "severity": "CRITICAL",
                "contractors": c_list,
                "message": f"Multiple bidders ({', '.join(c_list)}) submitted tenders from the same IP address: {ip}",
                "rule": "CVC Anti-Cartel Guideline Section 4.2"
            })

    # 2. Abnormally Low Bid (Suicide Bidding)
    if estimated_cost > 0:
        for b in bids:
            quoted = float(b.get("quoted_amount", 0.0))
            if quoted > 0 and quoted < (estimated_cost * 0.75):
                discount_pct = round(((estimated_cost - quoted) / estimated_cost) * 100, 1)
                flags.append({
                    "type": "ABNORMALLY_LOW_BID",
                    "severity": "HIGH",
                    "contractor_id": b.get("contractor_id"),
                    "quoted_amount": quoted,
                    "estimated_cost": estimated_cost,
                    "message": f"Contractor quoted {discount_pct}% below the government estimate. High risk of abandonment or substandard materials.",
                    "rule": "GFR 2017 Rule 173 (xxiv)"
                })

    # 3. Synchronized Margin Clustering (Artificially tight spread)
    if len(bids) >= 2:
        amounts = sorted([float(b.get("quoted_amount", 0)) for b in bids if float(b.get("quoted_amount", 0)) > 0])
        for i in range(len(amounts) - 1):
            diff_pct = abs(amounts[i + 1] - amounts[i]) / amounts[i] * 100
            if diff_pct < 0.25:  # Within 0.25% margin
                flags.append({
                    "type": "MARGIN_SYNCHRONIZATION",
                    "severity": "MEDIUM",
                    "message": f"Suspiciously identical bid amounts detected ({amounts[i]} vs {amounts[i+1]}, difference < 0.25%). Possible price collusion.",
                    "rule": "Competition Commission of India (CCI) Bid-Rigging Filter"
                })

    return flags


def verify_kyc_documents(pan: str, gstin: str) -> Dict[str, Any]:
    """Validates PAN and GSTIN formats, extracting jurisdictional state codes."""
    pan_clean = (pan or "").strip().upper()
    gstin_clean = (gstin or "").strip().upper()

    pan_valid = bool(re.match(PAN_REGEX, pan_clean))
    gstin_valid = bool(re.match(GSTIN_REGEX, gstin_clean))

    # Cross-match PAN inside GSTIN (characters 3-12 of GSTIN is the entity PAN)
    pan_matches_gstin = False
    if pan_valid and gstin_valid and len(gstin_clean) == 15:
        pan_matches_gstin = (gstin_clean[2:12] == pan_clean)

    state_code = gstin_clean[:2] if gstin_valid else None

    return {
        "pan": pan_clean,
        "pan_valid": pan_valid,
        "gstin": gstin_clean,
        "gstin_valid": gstin_valid,
        "pan_matches_gstin": pan_matches_gstin,
        "gstin_state_code": state_code,
        "is_approved": (pan_valid and gstin_valid and pan_matches_gstin)
    }


def verify_photo_exif_geofence(
    image_bytes: bytes,
    target_lat: float,
    target_lon: float,
    max_distance_meters: float = 50.0
) -> Dict[str, Any]:
    """
    Extracts hardware EXIF GPS coordinates from site photos and verifies
    physical presence within max_distance_meters (default: 50m).
    """
    try:
        import exifread
        f = io.BytesIO(image_bytes)
        tags = exifread.process_file(f, details=False)

        lat_tag = tags.get("GPS GPSLatitude")
        lat_ref = tags.get("GPS GPSLatitudeRef")
        lon_tag = tags.get("GPS GPSLongitude")
        lon_ref = tags.get("GPS GPSLongitudeRef")

        if not lat_tag or not lon_tag:
            return {
                "verified": False,
                "status": "MISSING_EXIF_GPS",
                "message": "Photo lacks hardware GPS coordinates. Geo-fenced site presence could not be authenticated.",
                "distance_meters": None
            }

        # Convert EXIF DMS to Decimal Degrees
        def dms_to_dd(dms_values, ref):
            degrees = float(dms_values[0].num) / float(dms_values[0].den)
            minutes = float(dms_values[1].num) / float(dms_values[1].den)
            seconds = float(dms_values[2].num) / float(dms_values[2].den)
            dd = degrees + (minutes / 60.0) + (seconds / 3600.0)
            if ref and str(ref).strip().upper() in ["S", "W"]:
                dd = -dd
            return dd

        photo_lat = dms_to_dd(lat_tag.values, lat_ref)
        photo_lon = dms_to_dd(lon_tag.values, lon_ref)

        distance_m = geodesic((photo_lat, photo_lon), (target_lat, target_lon)).meters

        is_valid = distance_m <= max_distance_meters
        return {
            "verified": is_valid,
            "status": "GEO_AUTHENTIC" if is_valid else "GEOFENCE_VIOLATION",
            "distance_meters": round(distance_m, 1),
            "photo_coordinates": {"lat": photo_lat, "lon": photo_lon},
            "site_coordinates": {"lat": target_lat, "lon": target_lon},
            "message": f"Photo verified {round(distance_m, 1)}m from site." if is_valid else
                       f"Photo taken {round(distance_m, 1)}m away from sanctioned project site (Threshold: {max_distance_meters}m)!"
        }
    except Exception as e:
        logger.warning(f"EXIF extraction error: {e}")
        return {
            "verified": False,
            "status": "PARSING_ERROR",
            "message": f"Could not parse EXIF metadata: {str(e)}",
            "distance_meters": None
        }


def verify_technical_bid_pdf(pdf_bytes: bytes, estimated_tender_cost: float = 4500000.0) -> Dict[str, Any]:
    """
    AI-powered scrutiny of Envelope-1 Technical Bid PDF using Gemini 3.6 Flash Vision.
    Validates:
    - Vendor PAN, GSTIN & State Jurisdiction
    - Statutory CA Turnover Certificate & ICAI UDIN
    - Past Experience Completion & GFR 2017 Rule 173(v) 40% threshold
    - Satisfactory Track Record & Liquidated Damages Check
    """
    import os
    import json
    from dotenv import load_dotenv

    load_dotenv(".env")
    gemini_key = os.getenv("GEMINI_API_KEY")

    if not gemini_key:
        return {
            "success": False,
            "verdict": "ERROR",
            "error": "GEMINI_API_KEY not configured in environment."
        }

    try:
        import pypdfium2 as pdfium
        pdf = pdfium.PdfDocument(pdf_bytes)
        num_pages = len(pdf)
        images = [pdf[i].render(scale=1.5).to_pil() for i in range(min(num_pages, 5))]
    except Exception as e:
        logger.error(f"Error reading PDF with pypdfium2: {e}")
        return {
            "success": False,
            "verdict": "ERROR",
            "error": f"Failed to process PDF bytes: {str(e)}"
        }

    try:
        import google.generativeai as genai
        genai.configure(api_key=gemini_key)
        model = genai.GenerativeModel("gemini-3.6-flash")
    except Exception as e:
        return {
            "success": False,
            "verdict": "ERROR",
            "error": f"Failed to initialize Gemini model: {str(e)}"
        }

    min_past_work_40 = estimated_tender_cost * 0.40
    min_turnover_30 = estimated_tender_cost * 0.30

    prompt = f"""
You are a senior Government of India Procurement Auditor evaluating an Envelope-1 Technical Bid dossier for an MPLADS Infrastructure Tender.
Estimated Tender Cost: INR {estimated_tender_cost:,.2f}
Minimum required single similar work (40% threshold): INR {min_past_work_40:,.2f}
Minimum annual civil turnover required (30% threshold): INR {min_turnover_30:,.2f}

Inspect the submitted document pages thoroughly.
Extract the following exact fields into a valid JSON object without markdown formatting:
{{
  "vendor_name": "string",
  "vendor_pan": "string",
  "vendor_gstin": "string",
  "pan_valid_format": true,
  "gstin_valid_format": true,
  "pan_gstin_matched": true,
  "gstin_state_code": "string",
  "ca_firm_name": "string or null",
  "ca_udin": "string or null",
  "ca_udin_present": true,
  "certified_average_turnover": "string or number",
  "turnover_compliant": true,
  "past_work_title": "string or null",
  "past_work_issuing_authority": "string or null",
  "past_work_value": "string or number",
  "past_work_nature_similar": true,
  "past_work_value_compliant": true,
  "past_work_completion_ontime": true,
  "litigation_penalty_found": false,
  "overall_verdict": "QUALIFIED" or "DISQUALIFIED",
  "score": 88,
  "audit_summary": "string",
  "checklist": [
    {{"item": "Permanent Account Number (PAN) Verification", "passed": true, "note": "..."}},
    {{"item": "GSTIN Active & State Registration Matching", "passed": true, "note": "..."}},
    {{"item": "Statutory CA Turnover Certificate & ICAI UDIN", "passed": true, "note": "..."}},
    {{"item": "GFR Rule 173 Past Experience Benchmark (>= 40%)", "passed": true, "note": "..."}},
    {{"item": "Similar Nature of Work & Satisfactory Track Record", "passed": true, "note": "..."}}
  ],
  "reasons_for_rejection": ["..."]
}}
Return ONLY the JSON string.
"""

    try:
        response = model.generate_content([prompt, *images])
        raw_txt = response.text.strip()
        if raw_txt.startswith("```json"):
            raw_txt = raw_txt[7:]
        elif raw_txt.startswith("```"):
            raw_txt = raw_txt[3:]
        if raw_txt.endswith("```"):
            raw_txt = raw_txt[:-3]
        data = json.loads(raw_txt.strip())
        data["tender_estimated_cost"] = estimated_tender_cost
        data["success"] = True
        return data
    except Exception as e:
        logger.error(f"Gemini document verification error: {e}")
        return {
            "success": False,
            "verdict": "ERROR",
            "error": f"AI Verification failed: {str(e)}"
        }

