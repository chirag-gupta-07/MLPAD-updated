"""
Standard Schedule of Rates (SOR) BoQ & Milestone Lifecycle Synthesis Generator.
Per SIH26102 specifications:
When an un-onboarded legacy work from master_works.parquet is inspected, this service automatically
bootstraps standard MoSPI / CPWD Schedule of Rates (SOR) engineering baselines:
- Realistic Bill of Quantities (BoQ) Material Ledger (Planned, Ordered, Received, Used, Remaining, Test Certs)
- Sequential 4-Stage Project Milestones (Mobilization, Structural/Core, Finishing, Commissioning)
- Scope Definition with Measurable Physical Units (Km, Sq.m, Nos., Liters)
- Geotagged Field Check-ins and Baseline Field Inspection Reports
- Grounded in actual Sanctioned Cost, Total Expenditure, Completion %, Sector, and Delay/Anomaly Scores.
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Tuple


def _normalize_sector(sector: str, desc: str) -> str:
    s = (sector or "").lower()
    d = (desc or "").lower()
    
    if "road" in s or "pathway" in s or "bridge" in s or "road" in d or "culvert" in d:
        return "roads"
    if "water" in s or "drinking" in s or "borewell" in s or "ro system" in d or "filter" in d:
        return "water"
    if "solar" in s or "electric" in s or "light" in s or "highmast" in d or "led" in d:
        return "solar"
    if "health" in s or "hospital" in s or "sanitation" in s or "dispensary" in d or "icu" in d or "ambulance" in d:
        return "health"
    if "education" in s or "school" in s or "college" in d or "classroom" in d or "library" in d:
        return "education"
    if "irrigation" in s or "dam" in s or "canal" in d or "check dam" in d:
        return "irrigation"
    if "sport" in s or "stadium" in d or "gym" in d:
        return "sports"
    return "community"


def synthesize_work_lifecycle(work: Dict[str, Any]) -> Dict[str, Any]:
    """
    Synthesizes realistic BoQ materials, milestones, scope, check-ins, and inspections
    grounded in the project's actual sanctioned amount, reported progress, and sector.
    """
    work_id = work.get("work_id", "UNKNOWN")
    sector_raw = work.get("sector", "")
    desc = work.get("work_description", "MPLADS Community Infrastructure Project")
    sanctioned = float(work.get("sanctioned_amount") or 500000.0)
    expenditure = float(work.get("total_expenditure") or 0.0)
    reported_pct = float(work.get("completion_percentage") or 0.0)
    status = work.get("status", "In Progress")
    agency = work.get("implementing_agency") or "District Rural Development Agency (DRDA)"
    delay_score = float(work.get("delay_risk_score") or 0.0)
    anomaly_score = float(work.get("utilization_anomaly_score") or 0.0)
    
    sec_key = _normalize_sector(sector_raw, desc)
    fin_pct = min(100.0, round((expenditure / sanctioned * 100), 1)) if sanctioned > 0 else 0.0
    
    # Ground-truth verified %:
    # If high utilization anomaly or high delay, verified progress is typically lagging
    if anomaly_score >= 60.0 or (fin_pct >= 70.0 and reported_pct < 40.0):
        verified_pct = max(5.0, round(reported_pct * 0.7, 1))
    elif delay_score >= 65.0:
        verified_pct = max(10.0, round(reported_pct * 0.85, 1))
    elif reported_pct >= 100.0:
        verified_pct = 100.0
    else:
        verified_pct = round(reported_pct * 0.95, 1)

    # Base dates
    s_date_str = work.get("sanction_date") or "2024-04-01"
    try:
        base_date = datetime.strptime(str(s_date_str)[:10], "%Y-%m-%d")
    except Exception:
        base_date = datetime(2024, 4, 1)

    # 1. SCOPE DEFINITION
    unit_map = {
        "roads": ("Kilometers", max(0.5, round(sanctioned / 1200000.0, 2)), "M20/M25 concrete & 50mm Bituminous Concrete per MoRTH specifications"),
        "water": ("Units / Plants", max(1, int(round(sanctioned / 250000.0))), "Stainless Steel 304 RO Skid, 500 LPH multi-barrier filtration per BIS 10500"),
        "solar": ("Luminaires / Poles", max(2, int(round(sanctioned / 35000.0))), "120W Integrated Solar LED Street Luminaires with LiFePO4 Battery & MNRE Compliance"),
        "health": ("Beds / Facility Units", max(1, int(round(sanctioned / 400000.0))), "Medical Grade Anti-Bacterial Epoxy Flooring, MGPS Outlets & Class 10,000 Cleanroom"),
        "education": ("Classrooms / Halls", max(1, int(round(sanctioned / 350000.0))), "RCC Framed Structure, Dual-Desk Ergonomic Furniture & Vitrified Flooring"),
        "irrigation": ("Meters of Lining", max(50, int(round(sanctioned / 5000.0))), "PCC M15 Canal Bed Lining & Rubble Masonry Weirs per CWC Guidelines"),
        "sports": ("Meters / Courts", max(1, int(round(sanctioned / 500000.0))), "Synthetic Multi-Sport Surface, Chainlink Fencing & Solar Floodlighting"),
        "community": ("Square Meters", max(80, int(round(sanctioned / 2200.0))), "RCC Framed Structure with Brick Masonry, Truss Roofing and Sanitation Block")
    }
    
    unit_name, total_qty, tech_spec = unit_map.get(sec_key, unit_map["community"])
    planned_qty = total_qty
    rep_qty = round(planned_qty * (reported_pct / 100.0), 2)
    ver_qty = round(planned_qty * (verified_pct / 100.0), 2)
    
    scope = {
        "work_id": work_id,
        "approved_scope": desc,
        "measurable_unit": unit_name,
        "planned_quantity": planned_qty,
        "reported_quantity": rep_qty,
        "verified_quantity": ver_qty,
        "planned_completion_pct": 100.0,
        "reported_completion_pct": reported_pct,
        "verified_completion_pct": verified_pct,
        "responsible_agency": agency,
        "contractor_name": f"Registered MoSPI Vendor ({agency[:16]} Class-A)",
        "contractor_status": "VERIFIED",
        "technical_specifications": tech_spec,
        "completion_claim_status": "COMPLETED_VERIFIED" if verified_pct >= 100.0 else ("IN_EXECUTION" if reported_pct > 0 else "INITIAL_MOBILIZATION")
    }

    # 2. MILESTONES (4-Stage Schedule)
    milestone_templates = {
        "roads": [
            (1, "Subgrade Excavation & Formation Leveling", 25.0, 30),
            (2, "Granular Sub-Base (GSB) & Wet Mix Macadam (WMM)", 50.0, 60),
            (3, "Bituminous Binder Course / Dense Bituminous Macadam", 75.0, 60),
            (4, "Wearing Surface Layer, Shoulder Pitching & Road Signage", 100.0, 45)
        ],
        "water": [
            (1, "Site Identification, Hydrogeological Survey & Boring", 25.0, 20),
            (2, "Foundation Plinth, Civil Platform & RCC Pump Chamber", 50.0, 30),
            (3, "RO Plant / Filter Membrane Skid Assembly & Electricals", 75.0, 30),
            (4, "Pipeline Interconnection, Flow Testing & Water Quality Assay", 100.0, 20)
        ],
        "solar": [
            (1, "Geotagged Survey & Foundation Civil Footings", 25.0, 15),
            (2, "GI Octagonal Mast Erection & Hardware Fastening", 50.0, 20),
            (3, "Solar PV Panels & LiFePO4 Battery Pack Fitting", 75.0, 20),
            (4, "LED Luminaire Wiring, Dusk-Dawn Sensor Test & Commissioning", 100.0, 15)
        ],
        "health": [
            (1, "Civil Demolition, Partition Framing & Layout Finalization", 25.0, 30),
            (2, "Medical Gas Copper Pipeline & Oxygen Manifold Grid", 50.0, 45),
            (3, "Electrical Substation Cabling, UPS & HVAC Ducting", 75.0, 45),
            (4, "Sterilization, Pressure Testing & Clinical Handover", 100.0, 30)
        ],
        "education": [
            (1, "Earthwork, Foundation Plinth Beam & RCC Columns", 25.0, 40),
            (2, "Superstructure Brick Masonry & Lintel Slab Casting", 50.0, 50),
            (3, "Plastering, Electrical Wiring & Vitrified Tile Flooring", 75.0, 40),
            (4, "Doors/Windows, Exterior Weathercoat Painting & Dual-Desk Furnishing", 100.0, 30)
        ],
        "community": [
            (1, "Site Clearance, Foundation Raft & RCC Column Stub Casting", 25.0, 35),
            (2, "Brick Masonry Walls, Lintel Casting & Roof Truss Erection", 50.0, 45),
            (3, "Flooring, Sanitation Piping, Wall Plastering & Wiring", 75.0, 45),
            (4, "Exterior Painting, Sanitary Fittings, Doors & Electric Handover", 100.0, 30)
        ]
    }
    m_list = milestone_templates.get(sec_key, milestone_templates["community"])
    milestones = []
    curr_date = base_date
    for m_order, m_name, target_pct, duration in m_list:
        p_start = curr_date.strftime("%Y-%m-%d")
        curr_date += timedelta(days=duration)
        p_end = curr_date.strftime("%Y-%m-%d")
        
        if reported_pct >= target_pct:
            m_status = "VERIFIED" if verified_pct >= target_pct else "COMPLETED"
            a_end = p_end
            ver_by = f"Executive Engineer ({agency[:14]})"
            ver_date = (curr_date + timedelta(days=2)).strftime("%Y-%m-%d")
            remarks = "Milestone executed per CPWD specifications with QA clearance."
        elif reported_pct >= (target_pct - 25.0):
            m_status = "IN_PROGRESS"
            a_end = None
            ver_by = None
            ver_date = None
            remarks = "Active field execution stage; workforce deployed."
        else:
            m_status = "PENDING"
            a_end = None
            ver_by = None
            ver_date = None
            remarks = "Scheduled for subsequent execution window."
            
        milestones.append({
            "work_id": work_id,
            "milestone_order": m_order,
            "milestone_name": m_name,
            "target_percentage": target_pct,
            "planned_start_date": p_start,
            "planned_end_date": p_end,
            "actual_end_date": a_end,
            "status": m_status,
            "verified_by": ver_by,
            "verification_date": ver_date,
            "remarks": remarks
        })

    # 3. 5-WAY MATERIAL LEDGER (Sector BoQ Templates)
    mat_budget = sanctioned * 0.65
    
    boq_templates = {
        "roads": [
            ("Portland Pozzolana Cement (IS:1489)", "Civil", "Grade 43/53 Bags", "Bags", 380.0, 0.20, "Ultratech / Ambuja Cement Corp", "TC-CEM-2024-"),
            ("Bitumen VG-30 Bulk", "Civil", "Viscosity Grade 30 Bulk Bitumen", "Metric Tons", 52000.0, 0.45, "Indian Oil Corporation Refineries", "TC-BIT-VG30-"),
            ("Crushed Granite Aggregate 20mm/40mm", "Civil", "Hard Blue Metal Aggregate", "Cubic Meters", 1350.0, 0.25, "District Mineral Stone Crusher Unit", "TC-AGG-M20-"),
            ("Granular Sub-Base Soil/Gravel Mix", "Civil", "Graded Natural Sand & Stone Dust", "Cubic Meters", 480.0, 0.10, "Apex Earthworks Supply Co", "TC-GSB-GR1-")
        ],
        "water": [
            ("Multi-Grade Pressure Sand Filter & Carbon Skid", "Equipment", "SS-304 Vessels with multiport valves", "Sets", 120000.0, 0.35, "AquaTech Water Systems Ltd", "TC-ATW-SKID-"),
            ("High-Pressure Thin-Film Composite RO Membrane", "Consumables", "Dow Filmtec 8040 Equivalent Elements", "Nos.", 18000.0, 0.25, "Ion Exchange Technologies", "TC-MEM-8040-"),
            ("HDPE Class PE-100 Pressure Pipe 63mm", "Piping", "IS:4984 compliant potable lines", "Meters", 195.0, 0.25, "Supreme Industries Piping Division", "TC-PIP-HDPE-"),
            ("Submersible Stainless Borewell Pump 5HP", "Machinery", "Kirloskar/Crompton 3-Phase Pump", "Units", 42000.0, 0.15, "Crompton Industrial Power", "TC-PMP-5HP-")
        ],
        "solar": [
            ("High Efficiency Monocrystalline Solar PV Panels", "Electrical", "540W Tier-1 MNRE Approved Modules", "Modules", 12500.0, 0.40, "Tata Power Solar Systems", "TC-SOL-PV540-"),
            ("LiFePO4 Lithium Ferro Phosphate Battery Pack", "Storage", "12.8V 60Ah High Cycle Life Battery", "Units", 14000.0, 0.30, "Exide Industrial Energy Solutions", "TC-BAT-LFP60-"),
            ("Hot-Dip Galvanized Octagonal Mast 7M", "Hardware", "IS:2062 Grade with anchor bolts", "Poles", 9500.0, 0.20, "Utkarsh India Mast Division", "TC-MST-OCT7-"),
            ("Integrated MPPT Solar Charge Controller & LED 60W", "Electronics", "IP66 Die-Cast Aluminum Luminaire", "Nos.", 5500.0, 0.10, "Havells India Commercial Lighting", "TC-LED-60W-")
        ],
        "health": [
            ("Degreased Seamless Medical Gas Copper Piping", "Mechanical", "BS EN 13348 medical gas pipe 22mm", "Meters", 850.0, 0.30, "Apex MedGas Systems", "TC-MED-COP22-"),
            ("Digital Automatic Oxygen Manifold 2x10", "Machinery", "With audio-visual pressure alarms", "Units", 250000.0, 0.35, "BOC Healthcare Equipment", "TC-OXY-MAN20-"),
            ("Modular ICU Bed Anti-Bacterial Partitions", "Civil", "Compact Laminate with HEPA seals", "Square Meters", 3200.0, 0.20, "Godrej Interio Healthcare", "TC-PAR-ICU10-"),
            ("Cleanroom Class 10,000 Fan Filter Units (FFU)", "HVAC", "H14 Grade HEPA 99.997% efficiency", "Units", 38000.0, 0.15, "Airflow Cleanrooms India", "TC-FFU-H14-")
        ],
        "education": [
            ("OPC 53 Grade Structural Cement", "Civil", "High Early Strength IS:12269", "Bags", 390.0, 0.25, "Shree Ultra Cement Ltd", "TC-CEM-53GR-"),
            ("Fe-500D TMT Reinforcement Steel Bars", "Civil", "Corrosion Resistant High Yield Rebars", "Metric Tons", 62000.0, 0.35, "Jindal Steel & Power Ltd", "TC-TMT-500D-"),
            ("Vitrified High-Traffic Floor Tiles 600x600mm", "Finishes", "Heavy Duty Anti-Skid Ceramic Tiles", "Square Meters", 650.0, 0.20, "Kajaria Ceramics Ltd", "TC-TIL-600X-"),
            ("Ergonomic Dual Study Desks & Bench Sets", "Furniture", "Pre-laminated Particle Board & Steel Frame", "Sets", 4200.0, 0.20, "Featherlite Educational Fixtures", "TC-DESK-STU-")
        ],
        "community": [
            ("PPC Cement IS:1489 Fly-Ash Blend", "Civil", "General Purpose Structural Concrete", "Bags", 385.0, 0.25, "Dalmia Bharat Cement Ltd", "TC-CEM-DALM-"),
            ("Fe-500 TMT Steel Reinforcement", "Civil", "Thermo-Mechanically Treated Rebars", "Metric Tons", 61000.0, 0.30, "Tata Tiscon Structural Steel", "TC-TMT-TATA-"),
            ("First Class Burnt Red Clay Bricks", "Civil", "Compressive Strength 10.5 N/mm2", "Nos. (Thousands)", 8200.0, 0.20, "Local Clay Brick Kiln Cluster", "TC-BRK-RED1-"),
            ("Galvanized Corrugated Roofing Sheets 0.5mm", "Roofing", "High Tensile PPGI Color Coated Sheets", "Square Meters", 480.0, 0.25, "JSW Coloron+ Roofing", "TC-RFS-JSW05-")
        ]
    }
    
    raw_boq = boq_templates.get(sec_key, boq_templates["community"])
    materials = []
    
    for idx, (mat_name, category, spec, unit, unit_rate, budget_share, supplier, tc_prefix) in enumerate(raw_boq):
        allocated_val = mat_budget * budget_share
        planned_q = max(1.0, round(allocated_val / unit_rate, 1))
        ordered_q = planned_q
        
        rec_ratio = min(1.0, max(0.0, (reported_pct + 10.0) / 100.0))
        used_ratio = min(rec_ratio, max(0.0, reported_pct / 100.0))
        
        rec_q = round(planned_q * rec_ratio, 1)
        used_q = round(planned_q * used_ratio, 1)
        
        if reported_pct >= 100.0:
            rec_q = planned_q
            used_q = planned_q
            rem_q = 0.0
        else:
            rem_q = round(max(0.0, rec_q - used_q), 1)
            
        materials.append({
            "work_id": work_id,
            "material_name": mat_name,
            "category": category,
            "specification": spec,
            "unit": unit,
            "planned_quantity": planned_q,
            "ordered_quantity": ordered_q,
            "received_quantity": rec_q,
            "used_quantity": used_q,
            "remaining_quantity": rem_q,
            "estimated_unit_rate": unit_rate,
            "actual_unit_rate": round(unit_rate * 1.02, 1),
            "supplier_name": supplier,
            "invoice_ref": f"GSTIN-INV-{202400 + idx}-{work_id[-4:]}",
            "quality_status": "VERIFIED" if verified_pct >= 50.0 else "DOCUMENTATION_COMPLETE",
            "test_certificate_ref": f"{tc_prefix}{work_id[-6:]}"
        })

    # 4. SITE CHECK-INS (Geotagged Attendance)
    lat = float(work.get("latitude") or 26.8467)
    lon = float(work.get("longitude") or 80.9462)
    checkins = []
    if reported_pct > 0:
        c_time = (datetime.now(timezone.utc) - timedelta(days=2)).strftime("%Y-%m-%d 09:15:20")
        checkins.append({
            "work_id": work_id,
            "responsible_person_id": "RESP-ENG-104",
            "responsible_person_name": "Er. Arvind Kumar",
            "checkin_timestamp": c_time,
            "gps_latitude": round(lat + 0.00012, 6),
            "gps_longitude": round(lon + 0.00015, 6),
            "project_latitude": lat,
            "project_longitude": lon,
            "distance_meters": 18.4,
            "status": "WITHIN_SITE_RADIUS",
            "site_photo_url": "demo_evidence_1.jpg"
        })

    # 5. FIELD INSPECTIONS
    inspections = []
    if verified_pct > 0:
        insp_date = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")
        inspections.append({
            "work_id": work_id,
            "inspector_name": "Er. D.K. Mishra",
            "inspector_designation": "Assistant Executive Engineer (AEE)",
            "inspection_date": insp_date,
            "gps_latitude": round(lat + 0.00008, 6),
            "gps_longitude": round(lon + 0.00009, 6),
            "distance_from_site_meters": 12.5,
            "checklist_json": "[]",
            "measurements_taken": f"Physical measurements verified against MB (Measurement Book) entry: {ver_qty} {unit_name} executed.",
            "observed_progress_pct": verified_pct,
            "result": "VERIFIED" if (reported_pct - verified_pct) <= 10.0 else "PARTIALLY_VERIFIED",
            "remarks": f"Site inspected per MoSPI guidelines. Executed work corresponds to {verified_pct}% physical baseline.",
            "photo_urls_json": '["demo_evidence_1.jpg"]'
        })

    # 6. DAILY UPDATES
    daily_updates = []
    if reported_pct > 0:
        d_date = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
        daily_updates.append({
            "work_id": work_id,
            "update_date": d_date,
            "responsible_person_name": "Suresh Patel",
            "responsible_person_role": "Junior Engineer / Site Supervisor",
            "aggregate_workers_present": 14,
            "work_performed_today": f"Structural execution per approved schedule for {desc[:40]}...",
            "physical_progress_reported": reported_pct,
            "materials_received_today": "Standard scheduled supplies",
            "materials_used_today": "Core construction consumables",
            "issues_faced": "None reported",
            "delay_reason": "None",
            "next_planned_activity": "Next scheduled milestone execution",
            "photo_url": "demo_evidence_2.jpg"
        })

    # 7. CITIZEN COMPLAINTS (Empty or Seeded)
    complaints = []

    # 8. AUDIT LOGS
    audit_logs = [
        {
            "work_id": work_id,
            "action_type": "SANCTION_RECORDED",
            "performed_by": "District Magistrate Office (DIO)",
            "user_role": "DISTRICT_AUTHORITY",
            "timestamp": f"{s_date_str} 10:00:00 UTC",
            "previous_value": "SANCTION_PENDING",
            "new_value": f"SANCTIONED_₹{sanctioned:,.2f}",
            "reason": "Administrative approval and sanction accorded under MPLADS guidelines."
        }
    ]
    if expenditure > 0:
        audit_logs.append({
            "work_id": work_id,
            "action_type": "FUND_DISBURSAL",
            "performed_by": "Nodal Treasury / PFMS",
            "user_role": "TREASURY_OFFICER",
            "timestamp": f"{s_date_str} 14:30:00 UTC",
            "previous_value": "0.0",
            "new_value": f"₹{expenditure:,.2f}",
            "reason": "Installment fund release per work order."
        })

    return {
        "work_id": work_id,
        "is_synthesized": True,
        "scope": scope,
        "milestones": milestones,
        "materials": materials,
        "daily_updates": daily_updates,
        "checkins": checkins,
        "inspections": inspections,
        "complaints": complaints,
        "audit_logs": audit_logs
    }
