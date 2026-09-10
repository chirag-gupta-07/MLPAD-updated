"""
Citizen Public Demand Clustering & Feasibility Pre-Check Engine (SIH26102).
Aggregates duplicate and nearby citizen development requests into high-consensus hotspots
and prepares them for official recommendation notice issuance by the Hon'ble MP.
"""

import math
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Standard Schedule of Rates (SOR) approximate budget envelopes per category (in INR)
CATEGORY_BUDGET_ENVELOPES = {
    "Water": 1500000.0,            # ₹15.0 Lakh (High-capacity RO plant / Tubewell network)
    "Drinking Water": 1500000.0,
    "Road": 2800000.0,             # ₹28.0 Lakh (Concrete / Bituminous link road 1.5 km)
    "Roads": 2800000.0,
    "Drainage": 1800000.0,         # ₹18.0 Lakh (Covered pucca RCC storm drainage channel)
    "School": 2200000.0,           # ₹22.0 Lakh (Smart classroom addition & solar electrification)
    "Hospital": 2500000.0,         # ₹25.0 Lakh (Sub-center diagnostic & maternity equipment upgrade)
    "Hospital/Health": 2500000.0,
    "Community Facility": 3000000.0,# ₹30.0 Lakh (Gram Panchayat multi-purpose community asset)
    "Electricity": 1600000.0,      # ₹16.0 Lakh (Solar streetlights & transformer augmentation)
    "Sanitation": 1200000.0,       # ₹12.0 Lakh (Community sanitation & bio-digester complex)
    "Other": 1500000.0
}

# Negative List Keywords under Para 4.5 of MPLADS Guidelines 2016
PROHIBITED_KEYWORDS = {
    "religious": ["mandir", "temple", "masjid", "mosque", "church", "gurudwara", "ashram", "samadhi", "dargah", "puja", "shrine"],
    "private_property": ["private land", "personal house", "my plot", "private shop", "commercial complex", "private society", "family property"],
    "non_durable": ["repair grant", "maintenance cash", "salary", "petrol", "consumable", "festival", "sports kit only"],
    "defence_restricted": ["cantonment area", "military station", "defence barrier"]
}


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance in meters between two GPS coordinates."""
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return 999999.0
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def check_mplads_feasibility(text: str, category: str = "") -> Dict[str, Any]:
    """
    Scans citizen description against Para 4.5 of MPLADS 2016 Guidelines.
    Returns feasibility flag, reason, and recommended compliant alternative.
    """
    clean = (text or "").lower()
    for cat_key, words in PROHIBITED_KEYWORDS.items():
        for w in words:
            if w in clean:
                if cat_key == "religious":
                    return {
                        "is_feasible": False,
                        "violates_para": "Para 4.5(b) - Places of Religious Worship / Faith",
                        "matched_term": w,
                        "warning": f"MPLADS funds cannot be utilized on places of worship or religious structures under Para 4.5(b).",
                        "suggestion": "Consider reformulating as a Secular Community Hall or Public Utility Asset on Gram Sabha land."
                    }
                elif cat_key == "private_property":
                    return {
                        "is_feasible": False,
                        "violates_para": "Para 4.5(a) - Works on Private Land / Property",
                        "matched_term": w,
                        "warning": f"MPLADS works can only be executed on Government, Municipal, or Gram Panchayat public land under Para 4.5(a).",
                        "suggestion": "Ensure the proposal is situated on designated government/community land with NOC from Gram Pradhan."
                    }
                elif cat_key == "non_durable":
                    return {
                        "is_feasible": False,
                        "violates_para": "Para 4.5(d) - Recurring or Non-Durable Expenditure",
                        "matched_term": w,
                        "warning": f"MPLADS funds are strictly for creating permanent, durable community assets under Para 4.5(d).",
                        "suggestion": "Propose permanent physical infrastructure rather than operational maintenance."
                    }
    return {
        "is_feasible": True,
        "violates_para": None,
        "matched_term": None,
        "warning": None,
        "suggestion": "Proposal complies with MPLADS 2016 durable public asset guidelines."
    }


def cluster_development_requests(requests: List[Dict[str, Any]], radius_meters: float = 1500.0) -> List[Dict[str, Any]]:
    """
    Aggregates development requests into spatial-category clusters within radius_meters (default 1.5 km).
    Identifies high-priority hotspots and computes consensus scores.
    """
    if not requests:
        return []

    # Map standardized categories
    def norm_cat(c: str) -> str:
        c_low = (c or "").lower()
        if "water" in c_low or "borewell" in c_low or "tank" in c_low:
            return "Water"
        if "road" in c_low or "bridge" in c_low or "pathway" in c_low:
            return "Road"
        if "drain" in c_low or "sewer" in c_low:
            return "Drainage"
        if "school" in c_low or "education" in c_low:
            return "School"
        if "health" in c_low or "hospital" in c_low or "dispensary" in c_low:
            return "Hospital"
        if "light" in c_low or "electr" in c_low or "solar" in c_low:
            return "Electricity"
        if "communit" in c_low or "hall" in c_low:
            return "Community Facility"
        return "Other"

    # Greedy spatial clustering per normalized category
    clusters: List[Dict[str, Any]] = []
    assigned_ids = set()

    # Sort requests by upvotes + date
    sorted_reqs = sorted(
        requests,
        key=lambda r: (r.get("upvotes", 1) or 1, r.get("id", 0)),
        reverse=True
    )

    for base_req in sorted_reqs:
        r_id = base_req.get("id")
        if r_id in assigned_ids:
            continue

        base_lat = base_req.get("latitude") or 25.3176
        base_lon = base_req.get("longitude") or 82.9739
        base_cat = norm_cat(base_req.get("category", "Other"))

        # Find all unassigned requests of same category within radius
        cluster_members = [base_req]
        assigned_ids.add(r_id)

        for other_req in sorted_reqs:
            o_id = other_req.get("id")
            if o_id in assigned_ids:
                continue

            o_lat = other_req.get("latitude") or 25.3176
            o_lon = other_req.get("longitude") or 82.9739
            o_cat = norm_cat(other_req.get("category", "Other"))

            if base_cat == o_cat:
                dist = haversine_distance(base_lat, base_lon, o_lat, o_lon)
                if dist <= radius_meters:
                    cluster_members.append(other_req)
                    assigned_ids.add(o_id)

        # Build Cluster Record
        petition_count = len(cluster_members)
        total_upvotes = sum(int(m.get("upvotes", 1) or 1) for m in cluster_members)

        # Center GPS
        avg_lat = sum(float(m.get("latitude") or base_lat) for m in cluster_members) / petition_count
        avg_lon = sum(float(m.get("longitude") or base_lon) for m in cluster_members) / petition_count

        # Check existing nearby project match from base
        nearby_prjs = base_req.get("nearby_projects") or []
        has_existing_work = len(nearby_prjs) > 0

        # Consensus Score (0 - 100%)
        # Base 40 + 15 per additional petition + 3 per upvote + 20 if unserved area
        consensus = 40.0 + ((petition_count - 1) * 15.0) + (total_upvotes * 3.0)
        if not has_existing_work:
            consensus += 15.0  # Bonus for neglected area with zero sanctioned projects
        consensus = min(100.0, max(25.0, round(consensus, 1)))

        # Status of cluster: if any member is already recommended by MP, cluster is RECOMMENDED
        is_recommended = any(m.get("status") in ("RECOMMENDED_BY_MP", "APPROVED", "SANCTIONED", "LINKED_TO_PROJECT") for m in cluster_members)
        is_sanctioned = any(m.get("status") == "SANCTIONED" for m in cluster_members)

        if is_sanctioned:
            cluster_status = "SANCTIONED_BY_DC"
        elif is_recommended:
            cluster_status = "RECOMMENDED_BY_MP"
        elif petition_count >= 2:
            cluster_status = "HIGH_PRIORITY_HOTSPOT"
        else:
            cluster_status = "INDIVIDUAL_PETITION"

        # Auto-suggested proposal title
        loc_desc = base_req.get("location_description") or "Local Area"
        suggested_title = f"{base_cat} Infrastructure Facility at {loc_desc}"
        if base_cat == "Water":
            suggested_title = f"Installation of Community Drinking Water Facility at {loc_desc}"
        elif base_cat == "Road":
            suggested_title = f"Construction & Paving of Link Road at {loc_desc}"
        elif base_cat == "Drainage":
            suggested_title = f"Pucca Storm Water Drainage & Sanitation Line at {loc_desc}"
        elif base_cat == "School":
            suggested_title = f"Upgradation of Primary/Secondary Educational Facility at {loc_desc}"
        elif base_cat == "Hospital":
            suggested_title = f"Primary Healthcare Sub-Center Modernization at {loc_desc}"

        estimated_cost = CATEGORY_BUDGET_ENVELOPES.get(base_cat, 1500000.0)

        # Linked project ID if already adopted
        linked_pid = next((m.get("linked_project_id") for m in cluster_members if m.get("linked_project_id")), None)
        mp_notice_num = next((m.get("mp_notice_number") for m in cluster_members if m.get("mp_notice_number")), None)

        cluster_id = f"HOTSPOT-{base_cat.upper()[:4]}-{int(avg_lat*100) % 1000}{int(avg_lon*100) % 1000}"

        clusters.append({
            "cluster_id": cluster_id,
            "category": base_cat,
            "suggested_title": suggested_title,
            "location_description": loc_desc,
            "latitude": round(avg_lat, 6),
            "longitude": round(avg_lon, 6),
            "petition_count": petition_count,
            "total_upvotes": total_upvotes,
            "consensus_score": consensus,
            "status": cluster_status,
            "estimated_cost": estimated_cost,
            "has_existing_nearby_work": has_existing_work,
            "linked_project_id": linked_pid,
            "mp_notice_number": mp_notice_num,
            "members": [
                {
                    "id": m.get("id"),
                    "request_id": m.get("request_id"),
                    "citizen_name": m.get("citizen_name") or "Citizen Auditor",
                    "citizen_contact": m.get("citizen_contact"),
                    "description": m.get("description"),
                    "request_date": m.get("request_date"),
                    "upvotes": m.get("upvotes", 1) or 1,
                    "status": m.get("status")
                }
                for m in cluster_members
            ]
        })

    # Sort clusters by consensus_score desc (high priority first)
    clusters.sort(key=lambda c: (c["petition_count"] >= 2, c["consensus_score"]), reverse=True)
    return clusters
