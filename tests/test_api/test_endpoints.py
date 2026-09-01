"""
End-to-End Test Suite for FastAPI Backend Endpoints.
"""

import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "SIH26102" in data["problem_statement"]


def test_risk_summary_endpoint():
    response = client.get("/api/risk/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["total_works"] > 0
    assert "total_sanctioned_crore" in data
    assert "risk_breakdown" in data
    assert data["risk_breakdown"]["high_risk_count"] >= 0


def test_works_paginated_endpoint():
    response = client.get("/api/works?page=1&page_size=5")
    assert response.status_code == 200
    data = response.json()
    assert len(data["works"]) == 5
    assert "total_records" in data
    assert "composite_risk_score" in data["works"][0]


def test_gis_markers_endpoint():
    response = client.get("/api/map/markers")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "latitude" in data[0]
    assert "longitude" in data[0]
    assert "risk_level" in data[0]


def test_assistant_query_endpoint():
    response = client.post("/api/assistant/query", json={"query": "Show top high risk works"})
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert len(data["answer"]) > 20
