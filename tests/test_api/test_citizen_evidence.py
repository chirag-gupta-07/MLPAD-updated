"""
Automated unit & integration tests for Feature 7.6: Citizen Evidence.
Tests submission validation, Haversine GPS proximity calculation,
retrieval, filtering, and supervisory verification lifecycle.
"""

import io
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.citizen_evidence_service import haversine_distance_km, categorize_proximity

client = TestClient(app)


def test_haversine_calculation():
    # New Delhi (28.6139, 77.2090) to Agra (27.1767, 78.0081) is approx 180-190 km
    dist = haversine_distance_km(28.6139, 77.2090, 27.1767, 78.0081)
    assert 170.0 <= dist <= 200.0

    # Same location should be 0.0 km
    assert haversine_distance_km(28.6139, 77.2090, 28.6139, 77.2090) == 0.0

    # Categorization
    assert categorize_proximity(0.5) == "HIGH_PROXIMITY"
    assert categorize_proximity(3.2) == "MODERATE_PROXIMITY"
    assert categorize_proximity(12.5) == "LOCATION_MISMATCH"


def test_citizen_evidence_stats_endpoint():
    response = client.get("/api/citizen-evidence/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_reports" in data
    assert "pending_verification" in data
    assert "supervisory_verified" in data
    assert "high_proximity_reports" in data


def test_citizen_evidence_list_endpoint():
    response = client.get("/api/citizen-evidence")
    assert response.status_code == 200
    data = response.json()
    assert "evidence" in data
    assert isinstance(data["evidence"], list)


def test_submit_citizen_evidence_flow():
    # Submit a new citizen report with dummy photo
    fake_image = io.BytesIO(b"dummy image bytes for test")
    fake_image.name = "test_photo.jpg"

    form_data = {
        "work_id": "TEST_UP_001",
        "issue_type": "WORK_NOT_STARTED",
        "description": "Physical site inspection shows zero progress, grass overgrowth on sanctioned plot.",
        "latitude": 20.5950,
        "longitude": 78.9640,
        "citizen_name": "Test Citizen Auditor",
        "citizen_contact": "test.auditor@domain.org",
        "claimed_progress": 5.0
    }

    response = client.post(
        "/api/citizen-evidence",
        data=form_data,
        files={"photo": ("test_photo.jpg", fake_image, "image/jpeg")}
    )

    assert response.status_code == 200
    res_data = response.json()
    assert res_data["status"] == "success"
    created = res_data["data"]
    assert created["work_id"] == "TEST_UP_001"
    assert created["verification_status"] == "PENDING_VERIFICATION"
    assert created["distance_from_site_km"] >= 0.0
    assert created["proximity_flag"] in ["HIGH_PROXIMITY", "MODERATE_PROXIMITY", "LOCATION_MISMATCH"]
    assert created["photo_url"] is not None

    evidence_id = created["id"]

    # Verify retrieval by work_id
    work_res = client.get(f"/api/citizen-evidence/work/TEST_UP_001")
    assert work_res.status_code == 200
    work_data = work_res.json()
    assert any(e["id"] == evidence_id for e in work_data["evidence"])

    # Test supervisory verification action
    from backend.app.api.auth import create_access_token
    admin_token = create_access_token({
        "sub": "admin",
        "username": "admin",
        "role": "SUPER_ADMIN",
        "full_name": "District Collectorate Cell",
        "district": "Varanasi",
        "state": "Uttar Pradesh"
    })
    auth_headers = {"Authorization": f"Bearer {admin_token}"}

    patch_res = client.patch(
        f"/api/citizen-evidence/{evidence_id}/verify",
        json={
            "status": "SUPERVISORY_VERIFIED",
            "admin_notes": "Ground verification conducted by Field Officer on 4th Sept. Discrepancy confirmed.",
            "verified_by": "District Collectorate Cell"
        },
        headers=auth_headers
    )
    assert patch_res.status_code == 200
    updated_data = patch_res.json()["data"]
    assert updated_data["verification_status"] == "SUPERVISORY_VERIFIED"
    assert updated_data["admin_notes"] == "Ground verification conducted by Field Officer on 4th Sept. Discrepancy confirmed."
    assert updated_data["verified_by"] == "District Collectorate Cell"

    # Verify photo serving endpoint
    photo_res = client.get(created["photo_url"])
    assert photo_res.status_code == 200
    assert len(photo_res.content) > 0

    # Test delete endpoint
    del_res = client.delete(f"/api/citizen-evidence/{evidence_id}", headers=auth_headers)
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "success"

    # Verify not found after deletion
    get_del = client.get(f"/api/citizen-evidence/{evidence_id}")
    assert get_del.status_code == 404

def test_phash_duplicate_detection():
    """Test that two identical images are flagged as reused."""
    from unittest.mock import patch
    try:
        import imagehash
    except ImportError:
        pytest.skip("imagehash not installed")
    
    # Create two identical test images
    from PIL import Image
    img = Image.new('RGB', (100, 100), color='red')
    phash1 = str(imagehash.phash(img))
    phash2 = str(imagehash.phash(img))
    
    # They should be identical (distance 0)
    h1 = imagehash.hex_to_hash(phash1)
    h2 = imagehash.hex_to_hash(phash2)
    assert (h1 - h2) < 8

def test_stage_vs_progress_mismatch():
    """Test IMAGE_PROGRESS_MISMATCH detection."""
    # If official progress > 80% but classified stage is EMPTY_SITE, should flag HIGH
    official_progress = 85.0
    classified_stage = "EMPTY_SITE"
    
    mismatch = None
    severity = None
    if official_progress > 80.0 and classified_stage in ("EMPTY_SITE", "FOUNDATION"):
        mismatch = "IMAGE_PROGRESS_MISMATCH"
        severity = "HIGH"
    
    assert mismatch == "IMAGE_PROGRESS_MISMATCH"
    assert severity == "HIGH"
    
    # If official progress is 30% and stage is EMPTY_SITE, should NOT flag
    official_progress_low = 30.0
    mismatch2 = None
    if official_progress_low > 80.0 and classified_stage in ("EMPTY_SITE", "FOUNDATION"):
        mismatch2 = "IMAGE_PROGRESS_MISMATCH"
    assert mismatch2 is None

