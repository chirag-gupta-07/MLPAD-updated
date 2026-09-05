"""
Seed script for 10 realistic longitudinal demo scenarios (SIH26102).
Seeds Scope (Planned vs Reported vs Verified), Milestones, Materials, Check-ins, Inspections, and Complaints.
"""

import json
import logging
from backend.app.db.lifecycle_db import get_connection, init_lifecycle_db

logger = logging.getLogger(__name__)


def seed_demo_scenarios():
    init_lifecycle_db()
    with get_connection() as conn:
        c = conn.cursor()

        # 1. Flagship Road Demo Project (Scenario 1 & Judge Demo Flow)
        # WS/MP498/2024-2025/133447
        w_road = "WS/MP498/2024-2025/133447"
        c.execute("""
            INSERT OR REPLACE INTO project_scopes 
            (work_id, approved_scope, measurable_unit, planned_quantity, reported_quantity, verified_quantity, 
             planned_completion_pct, reported_completion_pct, verified_completion_pct, responsible_agency, contractor_name, contractor_status, technical_specifications)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            w_road,
            "Construction of 2.5 km Bituminous Road from Main Junction to High School",
            "Kilometers",
            2.5,
            2.5,
            2.0,
            100.0,
            90.0,
            78.0,
            "Public Works Department (PWD)",
            "National Infra Buildcon Ltd",
            "VERIFIED",
            "M20 grade concrete foundation with 50mm Bituminous Concrete overlay"
        ))

        # Milestones for road
        c.execute("DELETE FROM project_milestones WHERE work_id = ?", (w_road,))
        milestones = [
            (w_road, 1, "Earthwork & Formation Levelling", 25.0, "2024-08-01", "2024-09-15", "2024-09-10", "VERIFIED", "Executive Engineer PWD", "2024-09-12", "Earthwork passed compaction test"),
            (w_road, 2, "Granular Sub-Base (GSB) Preparation", 50.0, "2024-09-16", "2024-11-01", "2024-11-05", "VERIFIED", "Junior Engineer PWD", "2024-11-06", "Density tests verified at 98%"),
            (w_road, 3, "Wet Mix Macadam & Prime Coat", 75.0, "2024-11-06", "2024-12-20", "2024-12-28", "VERIFIED", "AEE Inspection Wing", "2024-12-30", "Prime coat thickness tested"),
            (w_road, 4, "Bituminous Surfacing & Shoulder Markings", 100.0, "2024-12-29", "2025-02-28", None, "IN_PROGRESS", None, None, "Shoulder leveling incomplete along chainage 1.8km")
        ]
        c.executemany("""
            INSERT INTO project_milestones 
            (work_id, milestone_order, milestone_name, target_percentage, planned_start_date, planned_end_date, actual_end_date, status, verified_by, verification_date, remarks)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, milestones)

        # Materials for road
        c.execute("DELETE FROM material_ledger WHERE work_id = ?", (w_road,))
        materials = [
            (w_road, "Portland Pozzolana Cement", "Civil", "Grade 43 IS:1489", "Bags", 500, 500, 470, 420, 50, 380, 385, "Ultratech Cement Corp", "INV-2024-8891", "VERIFIED", "TC-CEMENT-9921"),
            (w_road, "Bitumen VG-30", "Civil", "Viscosity Grade 30 Bulk", "Metric Tons", 45, 45, 42, 38, 4, 48000, 49200, "Indian Oil Refineries Ltd", "INV-BIT-4029", "VERIFIED", "TC-BIT-4481"),
            (w_road, "Crushed Stone Aggregate 20mm", "Civil", "Hard Blue Granite Metal", "Cubic Meters", 320, 320, 320, 310, 10, 1250, 1250, "Apex Stone Quarry Works", "INV-AGG-1120", "VERIFIED", "TC-AGG-0092")
        ]
        c.executemany("""
            INSERT INTO material_ledger 
            (work_id, material_name, category, specification, unit, planned_quantity, ordered_quantity, received_quantity, used_quantity, remaining_quantity, estimated_unit_rate, actual_unit_rate, supplier_name, invoice_ref, quality_status, test_certificate_ref)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, materials)

        # Daily updates for road
        c.execute("DELETE FROM daily_updates WHERE work_id = ?", (w_road,))
        updates = [
            (w_road, "2025-01-28", "Ramesh Chandra Verma", "Site Supervisor", 18, "Shoulder dressing and stone pitching at culvert outlet", 78.0, "None", "Aggregate: 2 Cu.m", "Minor traffic diversion delay", "Normal traffic", "Bituminous carpet compaction", "demo_evidence_1.jpg"),
            (w_road, "2025-01-20", "Ramesh Chandra Verma", "Site Supervisor", 24, "Bituminous concrete laying from chainage 1+200 to 1+800", 74.0, "Bitumen VG-30: 8 MT", "Bitumen: 8 MT, Aggregate: 60 Cu.m", "None", "None", "Culvert headwall construction", "demo_evidence_2.jpg"),
            (w_road, "2025-01-10", "Ramesh Chandra Verma", "Site Supervisor", 20, "Tack coat application and surface cleaning", 65.0, "Tack coat emulsion: 5 Drums", "Emulsion: 5 Drums", "Morning fog delayed bitumen heating", "Fog condition", "Dense Bituminous Macadam layer", "demo_evidence_3.jpg")
        ]
        c.executemany("""
            INSERT INTO daily_updates 
            (work_id, update_date, responsible_person_name, responsible_person_role, aggregate_workers_present, work_performed_today, physical_progress_reported, materials_received_today, materials_used_today, issues_faced, delay_reason, next_planned_activity, photo_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, updates)

        # Checkins for road
        c.execute("DELETE FROM site_checkins WHERE work_id = ?", (w_road,))
        c.execute("""
            INSERT INTO site_checkins 
            (work_id, responsible_person_id, responsible_person_name, checkin_timestamp, gps_latitude, gps_longitude, project_latitude, project_longitude, distance_meters, status, site_photo_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (w_road, "RESP-0092", "Ramesh Chandra Verma", "2025-01-28 08:35:12", 26.8467, 80.9462, 26.8465, 80.9460, 28.5, "WITHIN_SITE_RADIUS", "demo_evidence_1.jpg"))

        # Complaints for road
        c.execute("DELETE FROM citizen_complaints WHERE work_id = ?", (w_road,))
        complaints = [
            (w_road, "Virendra Singh", "Poor Quality", "Bitumen layer laid on damp base without proper prime coat along ward 4 stretch.", "demo_evidence_2.jpg", "2025-01-18", "CORROBORATED", 1, 1, "Notice issued to contractor for thickness core test", None),
            (w_road, "Kailash Nath", "Work Stopped", "No workers on site for 10 days near high school approach road.", "demo_evidence_3.jpg", "2025-01-25", "SUBMITTED", 1, 0, "Under supervisory verification", None)
        ]
        c.executemany("""
            INSERT INTO citizen_complaints 
            (work_id, citizen_name, issue_category, description, photo_url, submission_date, status, is_repeated_signal, escalation_recommended, action_taken, resolved_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, complaints)

        # Field Inspections for road
        c.execute("DELETE FROM field_inspections WHERE work_id = ?", (w_road,))
        c.execute("""
            INSERT INTO field_inspections 
            (work_id, inspector_name, inspector_designation, inspection_date, gps_latitude, gps_longitude, distance_from_site_meters, checklist_json, measurements_taken, observed_progress_pct, result, remarks, photo_urls_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            w_road,
            "Er. S. K. Dwivedi",
            "Assistant Executive Engineer (Vigilance)",
            "2025-01-22",
            26.8466,
            80.9461,
            18.2,
            json.dumps(["CBR Value Test Passed", "Bitumen Extracted Content: 5.1% (Standard)", "Total Completed Length: 2.0 km vs 2.5 km Claimed"]),
            "Carriageway width 3.75m verified. Completed length 2.0 km. Remaining 500m unpaved.",
            78.0,
            "PARTIALLY_VERIFIED",
            "Contractor reported 90% progress but physical inspection confirms 78% due to incomplete 500m tail stretch.",
            json.dumps(["demo_evidence_1.jpg", "demo_evidence_2.jpg"])
        ))

        # 2. Bhatpara Hospital Scenario (WS/MP18249/2025-2026/153603)
        w_hosp = "WS/MP18249/2025-2026/153603"
        c.execute("""
            INSERT OR REPLACE INTO project_scopes 
            (work_id, approved_scope, measurable_unit, planned_quantity, reported_quantity, verified_quantity, 
             planned_completion_pct, reported_completion_pct, verified_completion_pct, responsible_agency, contractor_name, contractor_status, technical_specifications)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            w_hosp,
            "Modernization & ICU Ward Expansion at Bhatpara State General Hospital",
            "Bed Capacity & Complex",
            50.0,
            10.0,
            10.0,
            100.0,
            10.0,
            10.0,
            "West Bengal State Health Infrastructure Development Corp",
            "UNITECH INSULATION",
            "VERIFIED",
            "Centralized oxygen piping, 50-bed ICU HVAC, biomedical floor finish"
        ))

        c.execute("DELETE FROM material_ledger WHERE work_id = ?", (w_hosp,))
        c.execute("""
            INSERT INTO material_ledger 
            (work_id, material_name, category, specification, unit, planned_quantity, ordered_quantity, received_quantity, used_quantity, remaining_quantity, estimated_unit_rate, actual_unit_rate, supplier_name, invoice_ref, quality_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (w_hosp, "Medical Gas Pipeline Tubing", "Mechanical", "Copper ASTM B819 Medical Grade", "Meters", 1200, 1200, 400, 120, 280, 2400, 2400, "Apex Gas Systems Ltd", "INV-GAS-901", "UNDER_VERIFICATION"))

        # 3. Arsenic-Free Water Tanks (WS/MP18250/2024-2025/135269)
        w3 = "WS/MP18250/2024-2025/135269"
        c.execute("""
            INSERT OR REPLACE INTO project_scopes 
            (work_id, approved_scope, measurable_unit, planned_quantity, reported_quantity, verified_quantity, 
             planned_completion_pct, reported_completion_pct, verified_completion_pct, responsible_agency, contractor_name, contractor_status, technical_specifications)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            w3, "Installation of 10 nos. Arsenic Free Community Water Tanks with Nano Filtration", "Water Tanks",
            10.0, 1.0, 1.0, 100.0, 10.0, 10.0,
            "Public Health Engineering Department (PHED)", "Jal Aqua Tech Solutions", "PENDING_REVIEW",
            "FRP Food Grade Tanks 5000L, Arsenic Adsorbent Media Filter Units, Solar Water Pump"
        ))

        # 4. LED Highmast Lighting (WS/MP492/2024-2025/134984)
        w4 = "WS/MP492/2024-2025/134984"
        c.execute("""
            INSERT OR REPLACE INTO project_scopes 
            (work_id, approved_scope, measurable_unit, planned_quantity, reported_quantity, verified_quantity, 
             planned_completion_pct, reported_completion_pct, verified_completion_pct, responsible_agency, contractor_name, contractor_status, technical_specifications)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            w4, "Installation of 156 LED Highmast Lights for Rural and Urban areas", "Highmast Poles",
            156.0, 156.0, 142.0, 100.0, 100.0, 91.0,
            "District Urban Development Authority (DUDA)", "Surya Lightronics Pvt Ltd", "VERIFIED",
            "12-meter polygonal galvanized highmast pole with 4x150W IP66 LED fixtures and dual-timer"
        ))

        # 5. BT Road Aragonda (WS/MP18006/2024-2025/135658)
        w5 = "WS/MP18006/2024-2025/135658"
        c.execute("""
            INSERT OR REPLACE INTO project_scopes 
            (work_id, approved_scope, measurable_unit, planned_quantity, reported_quantity, verified_quantity, 
             planned_completion_pct, reported_completion_pct, verified_completion_pct, responsible_agency, contractor_name, contractor_status, technical_specifications)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            w5, "BT Road from Aragonda Main Road to Kondrajukalava Village", "Kilometers",
            3.2, 1.2, 1.1, 100.0, 35.9, 34.0,
            "Panchayati Raj Engineering Division", "Sri Venkateswara Constructions", "VERIFIED",
            "Sub-base 150mm WBM Grade II, 20mm Premix Carpet with seal coat type B"
        ))

        # 6. Panayilthode Bridge Construction (WS/MP347/2024-2025/136720)
        w6 = "WS/MP347/2024-2025/136720"
        c.execute("""
            INSERT OR REPLACE INTO project_scopes 
            (work_id, approved_scope, measurable_unit, planned_quantity, reported_quantity, verified_quantity, 
             planned_completion_pct, reported_completion_pct, verified_completion_pct, responsible_agency, contractor_name, contractor_status, technical_specifications)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            w6, "Construction of bridge across Panayilthode in Kakkottuchal Nedumkottukonam road", "Spans / Meters",
            24.0, 16.0, 16.0, 100.0, 66.0, 66.0,
            "Kerala PWD Bridges Wing", "Southern Coastal Bridges Consortium", "VERIFIED",
            "RCC T-Beam superstructure with well foundation resting on hard rock strata"
        ))

        # 7. Yatri Passenger Bus Sheds (WS/MP492/2024-2025/134981)
        w7 = "WS/MP492/2024-2025/134981"
        c.execute("""
            INSERT OR REPLACE INTO project_scopes 
            (work_id, approved_scope, measurable_unit, planned_quantity, reported_quantity, verified_quantity, 
             planned_completion_pct, reported_completion_pct, verified_completion_pct, responsible_agency, contractor_name, contractor_status, technical_specifications)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            w7, "15 Yatri Tin/Bus sheds for rural and Urban Areas as per sanctioned list", "Shelter Units",
            15.0, 15.0, 15.0, 100.0, 100.0, 100.0,
            "District Rural Development Agency (DRDA)", "Bharat Steel Fabricators", "VERIFIED",
            "Tubular steel structure with pre-coated GI profile roofing sheets and stainless steel benches"
        ))

        # 8. Takhatgarh Community Center (WS/MP18311/2024-2025/136803)
        w8 = "WS/MP18311/2024-2025/136803"
        c.execute("""
            INSERT OR REPLACE INTO project_scopes 
            (work_id, approved_scope, measurable_unit, planned_quantity, reported_quantity, verified_quantity, 
             planned_completion_pct, reported_completion_pct, verified_completion_pct, responsible_agency, contractor_name, contractor_status, technical_specifications)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            w8, "Construction of community center at village Takhatgarh", "Square Feet",
            2400.0, 240.0, 240.0, 100.0, 10.0, 10.0,
            "Rural Engineering Services (RES)", "Rajasthan Gramin Nirman Ltd", "VERIFIED",
            "RCC framed structure with brick masonry in cement mortar 1:6 and Kota stone flooring"
        ))

        # 9. Chapra Bus Stand (WS/MP823/2024-2025/137367)
        w9 = "WS/MP823/2024-2025/137367"
        c.execute("""
            INSERT OR REPLACE INTO project_scopes 
            (work_id, approved_scope, measurable_unit, planned_quantity, reported_quantity, verified_quantity, 
             planned_completion_pct, reported_completion_pct, verified_completion_pct, responsible_agency, contractor_name, contractor_status, technical_specifications)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            w9, "Construction of Chapra Bus Stand at Karimpur Krishnagar Road", "Passenger Terminal Bays",
            12.0, 1.2, 1.2, 100.0, 10.0, 10.0,
            "West Bengal Transport Infrastructure Development Corp", "Bengal Metropolitan Builders", "VERIFIED",
            "Heavy-duty rigid pavement with M40 grade concrete and passenger waiting terminal building"
        ))

        # 10. General Workshed (WS/MP443/2024-2025/138721)
        w10 = "WS/MP443/2024-2025/138721"
        c.execute("""
            INSERT OR REPLACE INTO project_scopes 
            (work_id, approved_scope, measurable_unit, planned_quantity, reported_quantity, verified_quantity, 
             planned_completion_pct, reported_completion_pct, verified_completion_pct, responsible_agency, contractor_name, contractor_status, technical_specifications)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            w10, "General workshed with sanitation blocks (125x80 feet)", "Square Feet",
            10000.0, 10000.0, 10000.0, 100.0, 100.0, 100.0,
            "Zilla Parishad Works Division", "Apex Civic Engineers", "VERIFIED",
            "Industrial steel truss roofing with twin toilet blocks and dual leach pit septic systems"
        ))

        conn.commit()
    logger.info("10 diverse demo scenarios seeded successfully into project_lifecycle.db.")


if __name__ == "__main__":
    seed_demo_scenarios()
    print("10 diverse demo scenarios seeded successfully.")


