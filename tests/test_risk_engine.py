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
