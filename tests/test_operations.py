"""
Tests for the MLPAD Operations module — covers attendance, inventory, payments,
approvals, development requests, and audit logging.
"""

import pytest
import sys
import os
import json
from pathlib import Path

# Ensure project root is on path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.db.operations_db import (
    init_operations_db, get_connection, haversine_distance,
    add_responsible_person, get_responsible_persons,
    record_checkin, get_attendance_history, get_attendance_summary,
    submit_daily_update, get_daily_updates,
    create_agency_contract, record_agency_supply, get_agency_supply,
    record_site_transaction, get_site_inventory, get_site_inventory_transactions,
    get_material_reconciliation,
    create_proposal, take_approval_action, get_approvals, get_approval_actions,
    APPROVAL_TRANSITIONS,
    create_payment_request, take_payment_action, get_payments, get_payment_actions,
    PAYMENT_TRANSITIONS,
    submit_development_request, get_development_requests, find_nearby_requests,
    take_request_decision,
    get_audit_log, get_unified_timeline,
    log_audit
)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    """Initialize the operations database and clean up test data for idempotency."""
    init_operations_db()
    # Clean up any leftover test data from previous runs
    with get_connection() as conn:
        for table in [
            "operations_audit_log", "payment_actions", "payments",
            "approval_actions", "project_approvals",
            "site_inventory_transactions", "agency_supply_records", "agency_contracts",
            "daily_work_updates", "site_attendance", "responsible_persons",
            "development_requests"
        ]:
            try:
                conn.execute(f"DELETE FROM {table} WHERE project_id LIKE 'TEST-%'")
            except Exception:
                pass
        # Also clean dev requests without project_id
        try:
            conn.execute("DELETE FROM development_requests WHERE request_id LIKE 'DR-%' AND (location_description LIKE '%Park%' OR description LIKE '%No proper road%' OR description LIKE '%Road needed%' OR description LIKE '%No drinking water%')")
        except Exception:
            pass
        try:
            conn.execute("DELETE FROM operations_audit_log WHERE project_id LIKE 'TEST-%' OR entity_id = '999'")
        except Exception:
            pass
        conn.commit()
    yield


# ---------------------------------------------------------------------------
# Haversine distance tests
# ---------------------------------------------------------------------------

class TestHaversine:
    def test_same_point_zero_distance(self):
        assert haversine_distance(28.6139, 77.2090, 28.6139, 77.2090) == 0.0

    def test_known_distance(self):
        # Delhi to roughly 500m away
        d = haversine_distance(28.6139, 77.2090, 28.6185, 77.2090)
        assert 400 < d < 600  # approximately 500m

    def test_large_distance(self):
        # Delhi to Mumbai ~1150km
        d = haversine_distance(28.6139, 77.2090, 19.0760, 72.8777)
        assert 1_100_000 < d < 1_200_000


# ---------------------------------------------------------------------------
# Responsible Persons tests
# ---------------------------------------------------------------------------

class TestResponsiblePersons:
    def test_add_and_get(self):
        pid = add_responsible_person("TEST-001", "Rajesh Kumar", "Site Head", "9876543210")
        assert pid > 0
        persons = get_responsible_persons("TEST-001")
        assert len(persons) >= 1
        assert any(p["person_name"] == "Rajesh Kumar" for p in persons)


# ---------------------------------------------------------------------------
# Site Attendance tests
# ---------------------------------------------------------------------------

class TestAttendance:
    def test_checkin_verified(self):
        pid = add_responsible_person("TEST-ATT-001", "Suresh Singh", "Site Supervisor")
        result = record_checkin(
            "TEST-ATT-001", pid, "Suresh Singh", "Site Supervisor",
            checkin_lat=28.6139, checkin_lon=77.2090,
            project_lat=28.6142, project_lon=77.2093,
            allowed_radius=500.0
        )
        assert result["location_status"] == "VERIFIED"
        assert result["distance_meters"] < 500

    def test_checkin_mismatch(self):
        pid = add_responsible_person("TEST-ATT-002", "Amit Verma", "Site Head")
        result = record_checkin(
            "TEST-ATT-002", pid, "Amit Verma", "Site Head",
            checkin_lat=28.6139, checkin_lon=77.2090,
            project_lat=28.6300, project_lon=77.2300,  # ~2.5km away
            allowed_radius=500.0
        )
        assert result["location_status"] == "MISMATCH"
        assert result["distance_meters"] > 500

    def test_checkin_manual(self):
        pid = add_responsible_person("TEST-ATT-003", "Priya Sharma", "Agency Representative")
        result = record_checkin(
            "TEST-ATT-003", pid, "Priya Sharma", "Agency Representative",
            checkin_lat=28.6139, checkin_lon=77.2090
        )
        assert result["location_status"] == "MANUAL"

    def test_attendance_history(self):
        history = get_attendance_history("TEST-ATT-001")
        assert len(history) >= 1
        assert history[0]["person_name"] == "Suresh Singh"

    def test_attendance_summary(self):
        summary = get_attendance_summary("TEST-ATT-001")
        assert "total_checkins" in summary
        assert "verified" in summary
        assert summary["total_checkins"] >= 1


# ---------------------------------------------------------------------------
# Daily Work Updates tests
# ---------------------------------------------------------------------------

class TestDailyUpdates:
    def test_submit_update(self):
        uid = submit_daily_update(
            "TEST-DU-001", "Rajesh Kumar", "2026-09-05",
            "Base preparation completed for 120 metres",
            work_category="Road Construction",
            cumulative_progress_pct=76.0,
            worker_count=15,
            materials_used=[{"material": "Cement", "quantity": 40, "unit": "bags"}]
        )
        assert uid > 0

    def test_get_updates(self):
        updates = get_daily_updates("TEST-DU-001")
        assert len(updates) >= 1
        assert updates[0]["work_description"] == "Base preparation completed for 120 metres"
        assert updates[0]["cumulative_progress_pct"] == 76.0
        assert isinstance(updates[0]["materials_used"], list)


# ---------------------------------------------------------------------------
# Inventory tests
# ---------------------------------------------------------------------------

class TestInventory:
    def test_agency_supply_flow(self):
        contract_id = create_agency_contract("TEST-INV-001", "ABC Infrastructure Pvt Ltd",
                                              contract_value=5000000)
        assert contract_id > 0

        supply_id = record_agency_supply(
            contract_id, "TEST-INV-001", "Cement", "bags",
            contracted_quantity=500, supplied_quantity=480,
            contracted_rate=350, actual_rate=360, delivery_date="2026-08-15"
        )
        assert supply_id > 0

        supplies = get_agency_supply("TEST-INV-001")
        assert len(supplies) >= 1

    def test_site_inventory_ledger(self):
        record_site_transaction("TEST-INV-001", "Cement", "bags", "2026-08-15", "RECEIVED", 100)
        record_site_transaction("TEST-INV-001", "Cement", "bags", "2026-08-16", "USED", 20)
        record_site_transaction("TEST-INV-001", "Cement", "bags", "2026-08-17", "RECEIVED", 50)
        record_site_transaction("TEST-INV-001", "Cement", "bags", "2026-08-17", "USED", 30)

        inventory = get_site_inventory("TEST-INV-001")
        cement = next(i for i in inventory if i["material_name"] == "Cement")
        assert cement["total_received"] == 150
        assert cement["total_used"] == 50
        assert cement["current_stock"] == 100

    def test_transaction_ledger(self):
        txns = get_site_inventory_transactions("TEST-INV-001", "Cement")
        assert len(txns) >= 4

    def test_reconciliation(self):
        recon = get_material_reconciliation("TEST-INV-001")
        assert len(recon) >= 1
        cement_recon = next(r for r in recon if r["material_name"] == "Cement")
        assert cement_recon["agency_supplied"] == 480
        assert cement_recon["site_received"] == 150
        assert cement_recon["has_issues"]  # 480 supplied but only 150 received at site


# ---------------------------------------------------------------------------
# Approval Workflow tests
# ---------------------------------------------------------------------------

class TestApprovals:
    def test_create_proposal(self):
        aid = create_proposal("TEST-APPR-001", "MP Office", 1500000,
                              "Road construction in village XYZ",
                              user_role="MP Representative")
        assert aid > 0

    def test_approval_transitions(self):
        aid = create_proposal("TEST-APPR-002", "Block Office", 800000,
                              "Community hall construction",
                              user_role="Block Development Officer")

        result = take_approval_action(aid, "Reviewer", "District Official",
                                       "REVIEW", "UNDER_REVIEW", "Starting review")
        assert result["new_status"] == "UNDER_REVIEW"

        result = take_approval_action(aid, "Eligibility Officer", "Technical Officer",
                                       "REVIEW", "ELIGIBILITY_CHECK", "Eligibility verified")
        assert result["new_status"] == "ELIGIBILITY_CHECK"

    def test_invalid_transition(self):
        aid = create_proposal("TEST-APPR-003", "Test", 100000, "Test project")
        with pytest.raises(ValueError):
            take_approval_action(aid, "User", "Role", "APPROVE", "SANCTIONED")

    def test_get_approvals(self):
        approvals = get_approvals()
        assert len(approvals) >= 3  # We created 3 above

    def test_approval_actions_audit(self):
        approvals = get_approvals()
        test_approval = next(a for a in approvals if a["project_id"] == "TEST-APPR-002")
        actions = get_approval_actions(approval_id=test_approval["id"])
        assert len(actions) >= 3  # PROPOSE + 2 transitions


# ---------------------------------------------------------------------------
# Payment Workflow tests
# ---------------------------------------------------------------------------

class TestPayments:
    def test_create_payment_request(self):
        pid = create_payment_request("TEST-PAY-001", 500000, "XYZ Contractors",
                                      requested_by="Site Engineer")
        assert pid > 0

    def test_payment_transitions(self):
        pid = create_payment_request("TEST-PAY-002", 200000, "ABC Agency")
        result = take_payment_action(pid, "Reviewer", "Finance Officer",
                                      "REVIEW", "UNDER_REVIEW")
        assert result["new_status"] == "UNDER_REVIEW"

        result = take_payment_action(pid, "Approver", "District Collector",
                                      "APPROVE", "APPROVED", "Verified and approved")
        assert result["new_status"] == "APPROVED"

        result = take_payment_action(pid, "Treasury", "Treasury Officer",
                                      "PROCESS", "PROCESSING")
        assert result["new_status"] == "PROCESSING"

        result = take_payment_action(pid, "Bank", "Payment System",
                                      "PAY", "PAID", transaction_reference="TXN-DEMO-12345")
        assert result["new_status"] == "PAID"

    def test_invalid_payment_transition(self):
        pid = create_payment_request("TEST-PAY-003", 100000)
        with pytest.raises(ValueError):
            take_payment_action(pid, "User", "Role", "PAY", "PAID")

    def test_get_payments(self):
        payments = get_payments(project_id="TEST-PAY-002")
        assert len(payments) >= 1

    def test_payment_actions_audit(self):
        payments = get_payments(project_id="TEST-PAY-002")
        actions = get_payment_actions(payments[0]["id"])
        assert len(actions) >= 5  # REQUEST + 4 transitions


# ---------------------------------------------------------------------------
# Development Requests tests
# ---------------------------------------------------------------------------

class TestDevelopmentRequests:
    def test_submit_request(self):
        result = submit_development_request(
            "Road", "No proper road in our locality",
            latitude=28.6139, longitude=77.2090,
            citizen_name="Citizen A", location_description="Near Park"
        )
        assert result["status"] == "SUBMITTED"
        assert result["request_id"].startswith("DR-")

    def test_submit_multiple_nearby(self):
        for i in range(3):
            submit_development_request(
                "Road", f"Road needed - request {i}",
                latitude=28.6139 + i * 0.001, longitude=77.2090
            )

    def test_find_nearby(self):
        nearby = find_nearby_requests(28.6139, 77.2090, radius_km=5.0)
        assert len(nearby) >= 3

    def test_request_decision(self):
        result = submit_development_request(
            "Water", "No drinking water facility",
            latitude=26.9, longitude=80.9
        )
        decision = take_request_decision(
            result["id"], "District Collector", "Authorized Authority",
            "VALIDATED", "Validated for feasibility study"
        )
        assert decision["new_status"] == "VALIDATED"


# ---------------------------------------------------------------------------
# Audit Log tests
# ---------------------------------------------------------------------------

class TestAuditLog:
    def test_audit_log_exists(self):
        log_audit("test_entity", "999", "TEST-AUDIT", "Tester", "QA",
                  "TEST_ACTION", {"old": 1}, {"new": 2})
        logs = get_audit_log(project_id="TEST-AUDIT")
        assert len(logs) >= 1
        assert logs[0]["entity_type"] == "test_entity"

    def test_audit_json_values(self):
        logs = get_audit_log(project_id="TEST-AUDIT")
        assert logs[0]["previous_value"] == {"old": 1}
        assert logs[0]["new_value"] == {"new": 2}


# ---------------------------------------------------------------------------
# Unified Timeline tests
# ---------------------------------------------------------------------------

class TestTimeline:
    def test_timeline_aggregation(self):
        # Create some data for a test project
        pid = add_responsible_person("TEST-TL-001", "Timeline Tester", "Site Head")
        record_checkin("TEST-TL-001", pid, "Timeline Tester", "Site Head",
                       28.6139, 77.2090, 28.6139, 77.2090)
        submit_daily_update("TEST-TL-001", "Timeline Tester", "2026-09-05", "Test update")
        record_site_transaction("TEST-TL-001", "Sand", "tonnes", "2026-09-05", "RECEIVED", 10)

        timeline = get_unified_timeline("TEST-TL-001")
        assert len(timeline) >= 3
        event_types = {e["type"] for e in timeline}
        assert "attendance" in event_types
        assert "daily_update" in event_types
        assert "inventory" in event_types
