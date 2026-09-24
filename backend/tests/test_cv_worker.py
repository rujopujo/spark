import pytest
import sys
import os

# Add backend to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.cv_worker import compute_iou, get_current_parking_state

def test_compute_iou_exact_overlap():
    # Box matching slot exactly
    box = [100, 100, 200, 200]
    poly = [[100, 100], [200, 100], [200, 200], [100, 200]]
    iou = compute_iou(box, poly)
    assert abs(iou - 1.0) < 1e-5

def test_compute_iou_partial_overlap():
    # Box overlapping half the slot
    box = [100, 100, 150, 200]
    poly = [[100, 100], [200, 100], [200, 200], [100, 200]]
    iou = compute_iou(box, poly)
    # Area box = 50*100 = 5000, Area poly = 100*100 = 10000, Inter = 5000, Union = 10000 -> IoU = 0.5
    assert abs(iou - 0.5) < 1e-4

def test_compute_iou_disjoint():
    # Box far away from slot
    box = [500, 500, 600, 600]
    poly = [[100, 100], [200, 100], [200, 200], [100, 200]]
    iou = compute_iou(box, poly)
    assert iou == 0.0

def test_get_current_parking_state_structure():
    state = get_current_parking_state()
    assert "total_slots" in state
    assert "available_slots" in state
    assert "occupied_slots" in state
    assert "occupancy_rate" in state
    assert "slots" in state
