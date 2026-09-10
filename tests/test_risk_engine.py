"""
Unit and Boundary Test Suite for Multi-Signal Risk Engine.
Tests:
1. Weights sum validation (sum == 1.0)
2. Boundary cases: All zero scores
3. Boundary cases: All maximum (100) scores
4. Handling of missing / NaN sub-scores
5. Data quality and model confidence calculation
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
import pandas as pd
import numpy as np
from src.risk.risk_engine import calculate_composite_risk, WEIGHTS, calculate_data_quality_and_confidence


def test_risk_weights_sum_to_one():
    total_w = sum(WEIGHTS.values())
    assert np.isclose(total_w, 1.0, atol=1e-4), f"Weights must sum to 1.0, got {total_w}"


def test_boundary_all_zeros():
    df_zero = pd.DataFrame([{
        "work_id": "TEST_ZERO",
        "district": "TestDistrict",
        "financial_anomaly_score": 0.0,
        "delay_risk_score": 0.0,
        "duplicate_risk_score": 0.0,
        "utilization_anomaly_score": 0.0,
        "stall_risk_score": 0.0,
        "sanctioned_amount": 100000,
        "total_expenditure": 50000,
        "sanction_date": "2024-01-01",
        "expected_completion_date": "2024-12-31",
        "work_description": "Construction of concrete road in village",
        "implementing_agency": "District PWD"
    }])
    df_result = calculate_composite_risk(df_zero)
    assert df_result.loc[0, "composite_risk_score"] == 0.0
    assert df_result.loc[0, "risk_level"] == "LOW"


def test_boundary_all_maximum():
    df_max = pd.DataFrame([{
        "work_id": "TEST_MAX",
        "district": "TestDistrict",
        "financial_anomaly_score": 100.0,
        "delay_risk_score": 100.0,
        "duplicate_risk_score": 100.0,
        "utilization_anomaly_score": 100.0,
        "stall_risk_score": 100.0,
        "sanctioned_amount": 100000,
        "total_expenditure": 50000,
        "sanction_date": "2024-01-01",
        "expected_completion_date": "2024-12-31",
        "work_description": "Construction of concrete road in village",
        "implementing_agency": "District PWD"
    }])
    df_result = calculate_composite_risk(df_max)
    assert df_result.loc[0, "composite_risk_score"] == 100.0
    assert df_result.loc[0, "risk_level"] == "HIGH"


def test_handling_missing_nan_scores():
    df_nan = pd.DataFrame([{
        "work_id": "TEST_NAN",
        "district": "TestDistrict",
        "financial_anomaly_score": np.nan,
        "delay_risk_score": np.nan,
        "duplicate_risk_score": np.nan,
        "utilization_anomaly_score": np.nan,
        "stall_risk_score": np.nan,
        "sanctioned_amount": 0,
        "total_expenditure": 0
    }])
    df_result = calculate_composite_risk(df_nan)
    assert not np.isnan(df_result.loc[0, "composite_risk_score"])
    assert 0.0 <= df_result.loc[0, "composite_risk_score"] <= 100.0


def test_data_quality_and_confidence():
    row_complete = pd.Series({
        "sanctioned_amount": 500000,
        "total_expenditure": 200000,
        "sanction_date": "2024-01-01",
        "expected_completion_date": "2024-12-31",
        "work_description": "Installation of high mast solar lighting systems",
        "implementing_agency": "Nodal Electricity Board"
    })
    q_score, conf = calculate_data_quality_and_confidence(row_complete)
    assert q_score == 100.0
    assert conf == "HIGH"


def test_network_risk_over_concentrated_contractor():
    """Test that a contractor over-concentrated in one constituency gets highest risk."""
    import pandas as pd
    try:
        from src.risk.network_analysis import build_award_graph, compute_network_risk_scores
    except ImportError:
        pytest.skip("networkx not available")
    
    # Create synthetic data: 3 contractors, 2 constituencies
    # Contractor A: 10 works ALL in constituency X (over-concentrated)
    # Contractor B: 5 works split across X and Y
    # Contractor C: 3 works split across X and Y
    records = []
    for i in range(10):
        records.append({"implementing_agency": "Contractor_A", "constituency": "Constituency_X", "district": "District_1", "mp_name": "MP_1", "sanctioned_amount": 1000000})
    for i in range(3):
        records.append({"implementing_agency": "Contractor_B", "constituency": "Constituency_X", "district": "District_1", "mp_name": "MP_1", "sanctioned_amount": 800000})
    for i in range(2):
        records.append({"implementing_agency": "Contractor_B", "constituency": "Constituency_Y", "district": "District_2", "mp_name": "MP_2", "sanctioned_amount": 900000})
    for i in range(2):
        records.append({"implementing_agency": "Contractor_C", "constituency": "Constituency_X", "district": "District_1", "mp_name": "MP_1", "sanctioned_amount": 500000})
    for i in range(1):
        records.append({"implementing_agency": "Contractor_C", "constituency": "Constituency_Y", "district": "District_2", "mp_name": "MP_2", "sanctioned_amount": 600000})
    
    df = pd.DataFrame(records)
    G = build_award_graph(df)
    scores = compute_network_risk_scores(G)
    
    # Contractor A should have the highest risk (over-concentrated in one area)
    score_a = scores.get("Contractor_A", {}).get("network_risk_score", 0)
    score_b = scores.get("Contractor_B", {}).get("network_risk_score", 0)
    score_c = scores.get("Contractor_C", {}).get("network_risk_score", 0)
    
    assert score_a > score_b, f"Contractor_A ({score_a}) should have higher risk than Contractor_B ({score_b})"
    assert score_a > score_c, f"Contractor_A ({score_a}) should have higher risk than Contractor_C ({score_c})"
