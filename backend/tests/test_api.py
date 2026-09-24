import pytest
import sys
import os
from fastapi.testclient import TestClient

# Add backend to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app

client = TestClient(app)

def test_api_status():
    response = client.get("/api/status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "SPARK Edge-AI Vision Gateway" in data["service"]

def test_api_parking_state():
    response = client.get("/api/parking-state")
    assert response.status_code == 200
    data = response.json()
    assert "total_slots" in data
    assert "slots" in data

def test_api_video_sources():
    response = client.get("/api/video-sources")
    assert response.status_code == 200
    data = response.json()
    assert "active_source" in data
    assert "sources" in data
    assert len(data["sources"]) > 0

def test_api_detection_params():
    response = client.post("/api/detection-params", json={"confidence": 0.35, "iou": 0.45})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["info"]["confidence_threshold"] == 0.35

def test_slots_config():
    response = client.get("/api/slots-config")
    assert response.status_code == 200
    data = response.json()
    assert "slots" in data
    assert len(data["slots"]) > 0

    # Test saving custom slots
    custom_slots = [
        {"id": 1, "label": "Test-01", "polygon": [[10, 10], [90, 10], [90, 90], [10, 90]]}
    ]
    post_res = client.post("/api/slots-config", json={"slots": custom_slots, "preset_id": "custom_test"})
    assert post_res.status_code == 200
    post_data = post_res.json()
    assert post_data["success"] is True

def test_slot_presets():
    response = client.get("/api/slot-presets")
    assert response.status_code == 200
    presets = response.json()
    assert len(presets) >= 3
    preset_ids = [p["id"] for p in presets]
    assert "curbside_traffic" in preset_ids

    # Test applying preset
    apply_res = client.post("/api/slot-presets/curbside_traffic")
    assert apply_res.status_code == 200
    apply_data = apply_res.json()
    assert apply_data["success"] is True

def test_video_control():
    response = client.post("/api/video-control", json={"speed": 1.5, "restart": False})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["playback_speed"] == 1.5

def test_live_frame():
    response = client.get("/api/live-frame")
    # Status can be 200 or 503 if first frame not rendered yet in test client
    assert response.status_code in [200, 503]
    if response.status_code == 200:
        assert response.headers["content-type"] == "image/jpeg"

def test_video_file():
    response = client.get("/api/video-file/real_traffic")
    assert response.status_code == 200
    assert response.headers["content-type"] == "video/mp4"

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "SPARK" in data["title"]
    assert "Ruhaan Joshi" in data["team"]
    assert "Rudra Jain" in data["team"]


