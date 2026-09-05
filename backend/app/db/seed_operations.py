import sqlite3
import json
import random
from datetime import datetime, timedelta, timezone
import logging
from backend.app.db.operations_db import get_connection, init_operations_db

logger = logging.getLogger(__name__)

# The 10 demo projects from seed_scenarios.py
PROJECT_IDS = [
    "WS/MP498/2024-2025/133447",
    "WS/MP18249/2025-2026/153603",
    "WS/MP18250/2024-2025/135269",
    "WS/MP492/2024-2025/134984",
    "WS/MP18006/2024-2025/135658",
    "WS/MP347/2024-2025/136720",
    "WS/MP492/2024-2025/134981",
    "WS/MP18311/2024-2025/136803",
    "WS/MP823/2024-2025/137367",
    "WS/MP443/2024-2025/138721"
]

INDIAN_NAMES = [
    "Ramesh Kumar", "Suresh Patel", "Amit Sharma", "Vikas Singh", 
    "Rahul Gupta", "Vijay Yadav", "Sanjay Verma", "Deepak Mishra",
    "Rajesh Chauhan", "Sunil Reddy", "Prakash Das", "Anand Tiwari"
]

AGENCIES = [
    "National Infra Buildcon Ltd", "UNITECH INSULATION", "Jal Aqua Tech Solutions",
    "Surya Lightronics Pvt Ltd", "Sri Venkateswara Constructions", "Southern Coastal Bridges Consortium",
    "Bharat Steel Fabricators", "Rajasthan Gramin Nirman Ltd", "Bengal Metropolitan Builders",
    "Apex Civic Engineers"
]

MATERIALS = {
    "Road": ["Bitumen VG-30", "Gravel", "Cement", "Sand", "Crushed Stone"],
    "Building": ["Cement", "Steel TMT", "Bricks", "Sand", "Concrete"],
    "Water": ["PVC Pipes", "Valves", "Cement", "Steel", "Filter Media"],
    "Electrical": ["LED Fixtures", "Wiring", "Poles", "Transformers"]
}

def random_date(start_date, end_date):
    time_between_dates = end_date - start_date
    days_between_dates = time_between_dates.days
    random_number_of_days = random.randrange(days_between_dates)
    return start_date + timedelta(days=random_number_of_days)

def seed_demo_operations(force: bool = False):
    init_operations_db()
    
    with get_connection() as conn:
        c = conn.cursor()
        
        # Check if already seeded
        c.execute("SELECT COUNT(*) FROM project_approvals")
        if not force and c.fetchone()[0] > 0:
            logger.info("Operations DB already seeded. Skipping.")
            return

        start_dt = datetime(2025, 6, 1, tzinfo=timezone.utc)
        end_dt = datetime(2026, 9, 5, tzinfo=timezone.utc)
        
        # Seed Responsible Persons
        for pid in PROJECT_IDS:
            for _ in range(random.randint(1, 2)):
                name = random.choice(INDIAN_NAMES)
                role = random.choice(["Site Supervisor", "Site Head", "Project Representative"])
                c.execute("""
                    INSERT INTO responsible_persons (project_id, person_name, person_role, contact, assigned_date)
                    VALUES (?, ?, ?, ?, ?)
                """, (pid, name, role, "9876543210", start_dt.strftime("%Y-%m-%d")))
        
        # Site Attendance
        for pid in PROJECT_IDS:
            c.execute("SELECT id, person_name, person_role FROM responsible_persons WHERE project_id = ?", (pid,))
            persons = c.fetchall()
            if not persons: continue
            
            person = persons[0]
            num_days = random.randint(15, 25)
            
            project_lat = 26.84 + random.uniform(-0.1, 0.1)
            project_lon = 80.94 + random.uniform(-0.1, 0.1)
            
            for _ in range(num_days):
                r_dt = random_date(start_dt, end_dt)
                r_date = r_dt.strftime("%Y-%m-%d")
                checkin_time = r_dt.strftime("%Y-%m-%dT09:00:00Z")
                checkout_time = r_dt.strftime("%Y-%m-%dT18:00:00Z")
                
                status_roll = random.random()
                if status_roll < 0.8:
                    loc_status = "VERIFIED"
                    clat = project_lat + random.uniform(-0.001, 0.001)
                    clon = project_lon + random.uniform(-0.001, 0.001)
                    dist = random.uniform(10, 300)
                elif status_roll < 0.95:
                    loc_status = "MISMATCH"
                    clat = project_lat + random.uniform(0.01, 0.05)
                    clon = project_lon + random.uniform(0.01, 0.05)
                    dist = random.uniform(800, 5000)
                else:
                    loc_status = "UNKNOWN"
                    clat = project_lat
                    clon = project_lon
                    dist = None

                c.execute("""
                    INSERT INTO site_attendance 
                    (project_id, person_id, person_name, person_role, date, checkin_time, checkout_time, 
                     checkin_lat, checkin_lon, project_lat, project_lon, distance_meters, location_status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (pid, person['id'], person['person_name'], person['person_role'], r_date, checkin_time, checkout_time,
                      clat, clon, project_lat, project_lon, dist, loc_status))
                
        # Daily Work Updates
        for pid in PROJECT_IDS:
            c.execute("SELECT id, person_name FROM responsible_persons WHERE project_id = ?", (pid,))
            persons = c.fetchall()
            person = persons[0] if persons else {'id': None, 'person_name': "Unknown"}
            
            prog = 0.0
            for i in range(random.randint(10, 20)):
                r_dt = start_dt + timedelta(days=i*3)
                r_date = r_dt.strftime("%Y-%m-%d")
                prog += random.uniform(1.0, 5.0)
                if prog > 100: prog = 100
                
                c.execute("""
                    INSERT INTO daily_work_updates 
                    (project_id, person_id, person_name, date, work_description, cumulative_progress_pct, worker_count)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (pid, person['id'], person['person_name'], r_date, f"Daily progress log {i}", round(prog, 1), random.randint(10, 50)))

        # Agency Contracts
        for i, pid in enumerate(PROJECT_IDS):
            agency_name = AGENCIES[i % len(AGENCIES)]
            c.execute("""
                INSERT INTO agency_contracts (project_id, agency_name, contract_reference, contract_date, contract_value, status)
                VALUES (?, ?, ?, ?, ?, 'ACTIVE')
            """, (pid, agency_name, f"CONT-{pid[-4:]}", start_dt.strftime("%Y-%m-%d"), random.uniform(1000000, 5000000)))
            contract_id = c.lastrowid
            
            # Agency Supply Records & Site Inventory
            mats = MATERIALS["Road"] if i % 2 == 0 else MATERIALS["Building"]
            for m in mats:
                cont_qty = round(random.uniform(100, 1000), 2)
                sup_qty = round(random.uniform(50, cont_qty), 2)
                
                # Deliberate discrepancies
                if i in [0, 1] and random.random() < 0.5:
                    rec_qty = round(sup_qty * 0.7, 2)  # missing receipts
                else:
                    rec_qty = sup_qty
                
                used_qty = round(random.uniform(0, rec_qty), 2)
                
                c.execute("""
                    INSERT INTO agency_supply_records 
                    (contract_id, project_id, material_name, unit, contracted_quantity, supplied_quantity, delivery_date, verification_status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'VERIFIED')
                """, (contract_id, pid, m, "Units", cont_qty, sup_qty, start_dt.strftime("%Y-%m-%d")))
                
                c.execute("""
                    INSERT INTO site_inventory_transactions 
                    (project_id, material_name, unit, date, transaction_type, quantity)
                    VALUES (?, ?, ?, ?, 'RECEIVED', ?)
                """, (pid, m, "Units", start_dt.strftime("%Y-%m-%d"), rec_qty))
                
                c.execute("""
                    INSERT INTO site_inventory_transactions 
                    (project_id, material_name, unit, date, transaction_type, quantity)
                    VALUES (?, ?, ?, ?, 'USED', ?)
                """, (pid, m, "Units", (start_dt + timedelta(days=10)).strftime("%Y-%m-%d"), used_qty))
                
        # Project Approvals and Approval Actions
        statuses = ['SANCTIONED', 'AUTHORITY_REVIEW', 'UNDER_REVIEW', 'REJECTED']
        for i, pid in enumerate(PROJECT_IDS):
            status = statuses[i % len(statuses)]
            c.execute("""
                INSERT INTO project_approvals 
                (project_id, current_status, proposed_by, proposed_date, estimated_cost, proposal_description, latitude, longitude)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (pid, status, "District Admin", start_dt.strftime("%Y-%m-%d"), random.uniform(500000, 2000000), "Project Proposal", 26.84, 80.94))
            approval_id = c.lastrowid
            
            c.execute("""
                INSERT INTO approval_actions 
                (approval_id, project_id, user_name, user_role, action, new_status)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (approval_id, pid, "District Admin", "Admin", "PROPOSE", status))

        # Payments and Payment Actions
        pay_stages = ['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING', 'PAID', 'RECONCILED']
        categories = ['Running Account Bill', 'Mobilization Advance', 'Material Procurement Bill', 'Final Settlement Bill']
        milestones = [
            'Milestone 1 - Survey, DPR & Site Levelling',
            'Milestone 2 - Foundation & Substructure Works',
            'Milestone 3 - Superstructure Civil Works',
            'Milestone 4 - Quality Inspection & Handover'
        ]
        p_idx = 0
        for pid in PROJECT_IDS:
            agency_name = AGENCIES[p_idx % len(AGENCIES)]
            for j in range(3):
                p_idx += 1
                pay_status = pay_stages[p_idx % len(pay_stages)]
                amount = round(random.uniform(250000, 1500000), 2)
                inv_ref = f"INV-2026-NIB-{1000 + p_idx}"
                category = categories[j % len(categories)]
                milestone = milestones[j % len(milestones)]
                txn_ref = f"TXN-DEMO-PFMS-{90000 + p_idx}" if pay_status in ('PAID', 'RECONCILED') else None
                rec_status = "RECONCILED" if pay_status == "RECONCILED" else ("PENDING_RECONCILIATION" if pay_status == "PAID" else "NOT_APPLICABLE")

                c.execute("""
                    INSERT INTO payments 
                    (project_id, contractor_agency, payment_request_id, invoice_reference, amount, date, category, milestone_id, status, approved_by, transaction_reference, reconciliation_status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (pid, agency_name, f"PAY-{pid[-4:]}-{j+1}", inv_ref, amount, start_dt.strftime("%Y-%m-%d"), category, milestone, pay_status, "Executive Engineer PWD" if pay_status in ('APPROVED', 'PROCESSING', 'PAID', 'RECONCILED') else None, txn_ref, rec_status))
                pay_id = c.lastrowid
                
                # Seed realistic action trail
                c.execute("""
                    INSERT INTO payment_actions 
                    (payment_id, project_id, user_name, user_role, action, previous_status, new_status, remarks)
                    VALUES (?, ?, ?, ?, 'REQUEST', NULL, 'REQUESTED', ?)
                """, (pay_id, pid, agency_name, "Contractor", f"Invoice submitted against {milestone}"))

                if pay_status in ('UNDER_REVIEW', 'APPROVED', 'PROCESSING', 'PAID', 'RECONCILED'):
                    c.execute("""
                        INSERT INTO payment_actions 
                        (payment_id, project_id, user_name, user_role, action, previous_status, new_status, remarks)
                        VALUES (?, ?, ?, ?, 'REVIEW', 'REQUESTED', 'UNDER_REVIEW', 'Measurement book entries and quality test certificates scrutinized')
                    """, (pay_id, pid, "Assistant Engineer", "Technical Reviewer"))

                if pay_status in ('APPROVED', 'PROCESSING', 'PAID', 'RECONCILED'):
                    c.execute("""
                        INSERT INTO payment_actions 
                        (payment_id, project_id, user_name, user_role, action, previous_status, new_status, remarks)
                        VALUES (?, ?, ?, ?, 'APPROVE', 'UNDER_REVIEW', 'APPROVED', 'Milestone completion verified on-site. Financial sanction passed')
                    """, (pay_id, pid, "Executive Engineer", "Sanctioning Authority"))

                if pay_status in ('PROCESSING', 'PAID', 'RECONCILED'):
                    c.execute("""
                        INSERT INTO payment_actions 
                        (payment_id, project_id, user_name, user_role, action, previous_status, new_status, remarks)
                        VALUES (?, ?, ?, ?, 'PROCESS', 'APPROVED', 'PROCESSING', 'Payment batch dispatched to simulated treasury gateway')
                    """, (pay_id, pid, "Treasury Officer", "Disbursal Officer"))

                if pay_status in ('PAID', 'RECONCILED'):
                    c.execute("""
                        INSERT INTO payment_actions 
                        (payment_id, project_id, user_name, user_role, action, previous_status, new_status, remarks)
                        VALUES (?, ?, ?, ?, 'PAY', 'PROCESSING', 'PAID', 'Disbursement confirmed via PFMS simulated UTR advice')
                    """, (pay_id, pid, "Demo PFMS Processor", "Banking Gateway"))

                if pay_status == 'RECONCILED':
                    c.execute("""
                        INSERT INTO payment_actions 
                        (payment_id, project_id, user_name, user_role, action, previous_status, new_status, remarks)
                        VALUES (?, ?, ?, ?, 'RECONCILE', 'PAID', 'RECONCILED', 'Matched with bank passbook statement and monthly treasury scroll')
                    """, (pay_id, pid, "Chief Accounts Officer", "Reconciliation Officer"))
                
        # Development Requests
        dev_cats = ['Road', 'Hospital', 'School', 'Water', 'Drainage']
        for i in range(20):
            c.execute("""
                INSERT INTO development_requests 
                (request_id, category, location_description, latitude, longitude, description, citizen_name, status, linked_project_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (f"DEV-REQ-{i}", random.choice(dev_cats), f"Location {i}", 26.84 + random.uniform(-0.1, 0.1), 80.94 + random.uniform(-0.1, 0.1), 
                  "Need better facilities", "Citizen", "LINKED_TO_PROJECT" if i < 5 else "SUBMITTED", PROJECT_IDS[i % 5] if i < 5 else None))

        # Operations Audit Log
        for pid in PROJECT_IDS:
            c.execute("""
                INSERT INTO operations_audit_log 
                (entity_type, entity_id, project_id, user_name, user_role, action, remarks)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, ("SYSTEM", "SEED", pid, "Admin", "Admin", "DATA_SEED", "Seeded mock data for demo"))

        conn.commit()
    logger.info("Demo operations seeded successfully.")

if __name__ == "__main__":
    seed_demo_operations()
    print("Demo operations seeded successfully.")
