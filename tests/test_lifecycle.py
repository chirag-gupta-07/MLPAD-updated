import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from backend.app.db.lifecycle_db import init_lifecycle_db, get_project_lifecycle, add_field_inspection, record_audit_event
from backend.app.db.seed_scenarios import seed_demo_scenarios
from backend.app.services.verification_engine import calculate_cross_source_consistency


def test_lifecycle_db_init_and_query():
    seed_demo_scenarios()
    w_id = 'WS/MP498/2024-2025/133447'
    data = get_project_lifecycle(w_id)
    assert data is not None
    assert 'milestones' in data
    assert 'materials' in data
    assert 'complaints' in data
    assert len(data['milestones']) >= 4


def test_cross_source_consistency_engine():
    w_id = 'WS/MP498/2024-2025/133447'
    lifecycle = get_project_lifecycle(w_id)
    work = {
        'work_id': w_id,
        'sanctioned_amount': 1602957.0,
        'total_expenditure': 1602957.0,
        'completion_percentage': 90.0,
        'sector': 'Roads, Pathways & Bridges'
    }
    consistency = calculate_cross_source_consistency(work, lifecycle)
    assert consistency['work_id'] == w_id
    assert 'verification_checklist' in consistency
    assert len(consistency['verification_checklist']) > 0
    assert 0 <= consistency['evidence_confidence_score'] <= 100


def test_add_field_inspection_and_audit():
    w_id = 'WS/MP498/2024-2025/133447'
    insp_id = add_field_inspection(w_id, {
        'inspector_name': 'Automated Test Officer',
        'inspector_designation': 'Vigilance Division',
        'observed_progress_pct': 78.0,
        'result': 'PARTIALLY_VERIFIED',
        'remarks': 'Test automated verification execution'
    })
    assert insp_id > 0
    lifecycle = get_project_lifecycle(w_id)
    assert any(i['inspector_name'] == 'Automated Test Officer' for i in lifecycle['inspections'])
