import asyncio
import cv2
import json
import os
import threading
import time
import math
import random
import numpy as np
from datetime import datetime, timezone
from shapely.geometry import Polygon, box
from collections import deque

_state_lock = threading.RLock()
_frame_lock = threading.RLock()
_control_lock = threading.RLock()

_CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.dirname(_CURRENT_DIR)
DATA_DIR = os.path.join(_BACKEND_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

current_parking_state = {
    "timestamp": datetime.now(timezone.utc).isoformat(),
    "total_slots": 16,
    "available_slots": 9,
    "occupied_slots": 7,
    "entering_slots": 0,
    "occupancy_rate": 43.8,
    "slots": [],
    "detected_vehicles_count": 8,
    "tracked_vehicles": [],
    "motion_summary": {
        "moving": 1,
        "maneuvering": 0,
        "stationary": 7,
        "total": 8
    },
    "fps": 24.0,
    "latency_ms": 12.0,
    "video_source": "aerial_lot",
    "video_source_label": "Aerial Parking Lot Drone Feed (2.5 Min HD)",
    "active_preset": "aerial_drone_lot",
    "playback_speed": 1.0
}

latest_jpeg_frame = None

# Video sources registry with absolute paths
VIDEO_SOURCES = {
    "aerial_lot": {
        "label": "Aerial Parking Lot Drone Feed (2.5 Min HD)",
        "abs_path": os.path.join(DATA_DIR, "aerial_parking_lot_animatic.mp4"),
        "is_camera": False
    },
    "real_traffic": {
        "label": "Curbside Traffic Camera (1280x720)",
        "abs_path": os.path.join(DATA_DIR, "real_traffic_cars.mp4"),
        "is_camera": False
    },
    "real_aerial": {
        "label": "Overhead Lot Perspective (1100x720)",
        "abs_path": os.path.join(DATA_DIR, "real_carPark.mp4"),
        "is_camera": False
    },
    "demo": {
        "label": "Demo Synthetic Lot (1280x720)",
        "abs_path": os.path.join(DATA_DIR, "demo_parking.mp4"),
        "is_camera": False
    },
    "webcam": {
        "label": "Local USB Webcam (Camera Index 0)",
        "abs_path": 0,
        "is_camera": True
    },
    "upload": {
        "label": "Custom Uploaded Video",
        "abs_path": os.path.join(DATA_DIR, "uploaded_video.mp4"),
        "is_camera": False
    }
}

# Pre-calibrated bay polygon presets for different camera perspectives
SLOT_PRESETS = {
    "aerial_drone_lot": {
        "id": "aerial_drone_lot",
        "name": "Aerial Drone Surveillance (16 Bays)",
        "description": "High-altitude 16-bay dual-row parking lot with central transit corridor",
        "slots": [
            {"id": 1, "label": "Bay-A01", "polygon": [[100, 90], [210, 90], [210, 290], [100, 290]]},
            {"id": 2, "label": "Bay-A02", "polygon": [[240, 90], [350, 90], [350, 290], [240, 290]]},
            {"id": 3, "label": "Bay-A03", "polygon": [[380, 90], [490, 90], [490, 290], [380, 290]]},
            {"id": 4, "label": "Bay-A04", "polygon": [[520, 90], [630, 90], [630, 290], [520, 290]]},
            {"id": 5, "label": "Bay-A05", "polygon": [[660, 90], [770, 90], [770, 290], [660, 290]]},
            {"id": 6, "label": "Bay-A06", "polygon": [[800, 90], [910, 90], [910, 290], [800, 290]]},
            {"id": 7, "label": "Bay-A07", "polygon": [[940, 90], [1050, 90], [1050, 290], [940, 290]]},
            {"id": 8, "label": "Bay-A08", "polygon": [[1080, 90], [1190, 90], [1190, 290], [1080, 290]]},
            {"id": 9, "label": "Bay-B01", "polygon": [[100, 430], [210, 430], [210, 630], [100, 630]]},
            {"id": 10, "label": "Bay-B02", "polygon": [[240, 430], [350, 430], [350, 630], [240, 630]]},
            {"id": 11, "label": "Bay-B03", "polygon": [[380, 430], [490, 430], [490, 630], [380, 630]]},
            {"id": 12, "label": "Bay-B04", "polygon": [[520, 430], [630, 430], [630, 630], [520, 630]]},
            {"id": 13, "label": "Bay-B05", "polygon": [[660, 430], [770, 430], [770, 630], [660, 630]]},
            {"id": 14, "label": "Bay-B06", "polygon": [[800, 430], [910, 430], [910, 630], [800, 630]]},
            {"id": 15, "label": "Bay-B07", "polygon": [[940, 430], [1050, 430], [1050, 630], [940, 630]]},
            {"id": 16, "label": "Bay-B08", "polygon": [[1080, 430], [1190, 430], [1190, 630], [1080, 630]]}
        ]
    },
    "curbside_traffic": {
        "id": "curbside_traffic",
        "name": "Curbside Street & Traffic (1280x720)",
        "description": "Calibrated along upper and lower vehicle traffic lanes for real_traffic_cars.mp4",
        "slots": [
            {"id": 1, "label": "Bay-01", "polygon": [[70, 100], [160, 100], [160, 300], [70, 300]]},
            {"id": 2, "label": "Bay-02", "polygon": [[185, 100], [275, 100], [275, 300], [185, 300]]},
            {"id": 3, "label": "Bay-03", "polygon": [[300, 100], [390, 100], [390, 300], [300, 300]]},
            {"id": 4, "label": "Bay-04", "polygon": [[415, 100], [505, 100], [505, 300], [415, 300]]},
            {"id": 5, "label": "Bay-05", "polygon": [[530, 100], [620, 100], [620, 300], [530, 300]]},
            {"id": 6, "label": "Bay-06", "polygon": [[645, 100], [735, 100], [735, 300], [645, 300]]},
            {"id": 7, "label": "Bay-07", "polygon": [[760, 100], [850, 100], [850, 300], [760, 300]]},
            {"id": 8, "label": "Bay-08", "polygon": [[875, 100], [965, 100], [965, 300], [875, 300]]},
            {"id": 9, "label": "Bay-09", "polygon": [[990, 100], [1080, 100], [1080, 300], [990, 300]]},
            {"id": 10, "label": "Bay-10", "polygon": [[1105, 100], [1195, 100], [1195, 300], [1105, 300]]},
            {"id": 11, "label": "Bay-11", "polygon": [[70, 420], [160, 420], [160, 620], [70, 620]]},
            {"id": 12, "label": "Bay-12", "polygon": [[185, 420], [275, 420], [275, 620], [185, 620]]},
            {"id": 13, "label": "Bay-13", "polygon": [[300, 420], [390, 420], [390, 620], [300, 620]]},
            {"id": 14, "label": "Bay-14", "polygon": [[415, 420], [505, 420], [505, 620], [415, 620]]},
            {"id": 15, "label": "Bay-15", "polygon": [[530, 420], [620, 420], [620, 620], [530, 620]]},
            {"id": 16, "label": "Bay-16", "polygon": [[645, 420], [735, 420], [735, 620], [645, 620]]},
            {"id": 17, "label": "Bay-17", "polygon": [[760, 420], [850, 420], [850, 620], [760, 620]]},
            {"id": 18, "label": "Bay-18", "polygon": [[875, 420], [965, 420], [965, 620], [875, 620]]},
            {"id": 19, "label": "Bay-19", "polygon": [[990, 420], [1080, 420], [1080, 620], [990, 620]]},
            {"id": 20, "label": "Bay-20", "polygon": [[1105, 420], [1195, 420], [1195, 620], [1105, 620]]}
        ]
    },
    "aerial_lot": {
        "id": "aerial_lot",
        "name": "Angled Lot Perspective (1100x720)",
        "description": "Angled perspective stalls calibrated for aerial surveillance lots",
        "slots": [
            {"id": 1, "label": "Bay-A01", "polygon": [[60, 160], [140, 160], [120, 310], [40, 310]]},
            {"id": 2, "label": "Bay-A02", "polygon": [[155, 160], [235, 160], [215, 310], [135, 310]]},
            {"id": 3, "label": "Bay-A03", "polygon": [[250, 160], [330, 160], [310, 310], [230, 310]]},
            {"id": 4, "label": "Bay-A04", "polygon": [[345, 160], [425, 160], [405, 310], [325, 310]]},
            {"id": 5, "label": "Bay-A05", "polygon": [[440, 160], [520, 160], [500, 310], [420, 310]]},
            {"id": 6, "label": "Bay-A06", "polygon": [[535, 160], [615, 160], [595, 310], [515, 310]]},
            {"id": 7, "label": "Bay-A07", "polygon": [[630, 160], [710, 160], [690, 310], [610, 310]]},
            {"id": 8, "label": "Bay-A08", "polygon": [[725, 160], [805, 160], [785, 310], [705, 310]]},
            {"id": 9, "label": "Bay-A09", "polygon": [[820, 160], [900, 160], [880, 310], [800, 310]]},
            {"id": 10, "label": "Bay-A10", "polygon": [[915, 160], [995, 160], [975, 310], [895, 310]]},
            {"id": 11, "label": "Bay-B01", "polygon": [[60, 410], [140, 410], [120, 560], [40, 560]]},
            {"id": 12, "label": "Bay-B02", "polygon": [[155, 410], [235, 410], [215, 560], [135, 560]]},
            {"id": 13, "label": "Bay-B03", "polygon": [[250, 410], [330, 410], [310, 560], [230, 560]]},
            {"id": 14, "label": "Bay-B04", "polygon": [[345, 410], [425, 410], [405, 560], [325, 560]]},
            {"id": 15, "label": "Bay-B05", "polygon": [[440, 410], [520, 410], [500, 560], [420, 560]]},
            {"id": 16, "label": "Bay-B06", "polygon": [[535, 410], [615, 410], [595, 560], [515, 560]]},
            {"id": 17, "label": "Bay-B07", "polygon": [[630, 410], [710, 410], [690, 560], [610, 560]]},
            {"id": 18, "label": "Bay-B08", "polygon": [[725, 410], [805, 410], [785, 560], [705, 560]]},
            {"id": 19, "label": "Bay-B09", "polygon": [[820, 410], [900, 410], [880, 560], [800, 560]]},
            {"id": 20, "label": "Bay-B10", "polygon": [[915, 410], [995, 410], [975, 560], [895, 560]]}
        ]
    },
    "webcam_desk": {
        "id": "webcam_desk",
        "name": "Webcam Desk & Test Lab (6 Large Bays)",
        "description": "Six large center staging bays ideal for toy cars, phone cameras, or live laptop testing",
        "slots": [
            {"id": 1, "label": "Deck-01", "polygon": [[100, 120], [380, 120], [380, 360], [100, 360]]},
            {"id": 2, "label": "Deck-02", "polygon": [[450, 120], [730, 120], [730, 360], [450, 360]]},
            {"id": 3, "label": "Deck-03", "polygon": [[800, 120], [1080, 120], [1080, 360], [800, 360]]},
            {"id": 4, "label": "Deck-04", "polygon": [[100, 420], [380, 420], [380, 660], [100, 660]]},
            {"id": 5, "label": "Deck-05", "polygon": [[450, 420], [730, 420], [730, 660], [450, 660]]},
            {"id": 6, "label": "Deck-06", "polygon": [[800, 420], [1080, 420], [1080, 660], [800, 660]]}
        ]
    }
}

active_source_id = "aerial_lot"
active_preset_id = "aerial_drone_lot"
custom_stream_url = None
confidence_threshold = 0.30
iou_threshold = 0.40
show_bboxes = True
show_polygons = True
show_animatic_overlays = True
source_needs_restart = False
playback_speed = 1.0
seek_target_pct = None
restart_requested = False

# Active in-memory slots list (Default 16 bays for aerial drone lot)
_active_slots = list(SLOT_PRESETS["aerial_drone_lot"]["slots"])
_slot_dwell = {}

# Trail history for animatic ribbons {vehicle_id: deque([(cx, cy), ...], maxlen=24)}
_vehicle_trails = {}

# Pre-load trajectory telemetry cache if present
_trajectory_cache = None
def _load_trajectory_cache():
    global _trajectory_cache
    traj_path = os.path.join(DATA_DIR, "aerial_trajectories.json")
    if os.path.exists(traj_path):
        try:
            with open(traj_path, "r", encoding="utf-8") as f:
                _trajectory_cache = json.load(f)
            print(f"[SPARK CV Worker] Loaded {_trajectory_cache and len(_trajectory_cache)} frames of trajectory telemetry.")
        except Exception as e:
            print(f"[SPARK CV Worker] Could not load trajectory cache: {e}")

_load_trajectory_cache()

def get_current_parking_state():
    with _state_lock:
        return current_parking_state.copy()

def get_slots_config():
    with _control_lock:
        return {
            "active_preset": active_preset_id,
            "slots": [s.copy() for s in _active_slots]
        }

def _set_slots_config_unlocked(new_slots, preset_id="custom"):
    global _active_slots, active_preset_id
    _active_slots = [s.copy() for s in new_slots]
    active_preset_id = preset_id

    target_p = os.path.join(DATA_DIR, "slots_config.json")
    try:
        with open(target_p, "w", encoding="utf-8") as f:
            json.dump(_active_slots, f, indent=2)
    except Exception:
        pass

def set_slots_config(new_slots, preset_id="custom"):
    with _control_lock:
        _set_slots_config_unlocked(new_slots, preset_id)
        return True, f"Successfully updated {len(_active_slots)} parking bays."

def get_slot_presets():
    with _control_lock:
        return [
            {
                "id": p["id"],
                "name": p["name"],
                "description": p["description"],
                "slot_count": len(p["slots"]),
                "active": p["id"] == active_preset_id
            }
            for p in SLOT_PRESETS.values()
        ]

def apply_slot_preset(preset_id):
    with _control_lock:
        if preset_id not in SLOT_PRESETS:
            return False, f"Unknown preset ID: {preset_id}"
        preset = SLOT_PRESETS[preset_id]
        _set_slots_config_unlocked(preset["slots"], preset_id=preset_id)
        return True, f"Applied preset '{preset['name']}' ({len(preset['slots'])} bays)."

def get_video_sources_info():
    with _control_lock:
        sources_list = []
        for sid, info in VIDEO_SOURCES.items():
            sources_list.append({
                "id": sid,
                "label": info["label"],
                "active": sid == active_source_id
            })
        return {
            "active_source": active_source_id,
            "custom_url": custom_stream_url,
            "sources": sources_list,
            "confidence_threshold": confidence_threshold,
            "iou_threshold": iou_threshold,
            "show_bboxes": show_bboxes,
            "show_polygons": show_polygons,
            "show_animatic": show_animatic_overlays,
            "playback_speed": playback_speed,
            "active_preset": active_preset_id
        }

def set_video_source(source_id, custom_url=None):
    global active_source_id, custom_stream_url, source_needs_restart, active_preset_id
    with _control_lock:
        if source_id in VIDEO_SOURCES or source_id == "url":
            active_source_id = source_id
            custom_stream_url = custom_url
            source_needs_restart = True

            if source_id == "aerial_lot" and active_preset_id != "aerial_drone_lot":
                apply_slot_preset("aerial_drone_lot")
            elif source_id == "real_traffic" and active_preset_id != "curbside_traffic":
                apply_slot_preset("curbside_traffic")
            elif source_id == "real_aerial" and active_preset_id != "aerial_lot":
                apply_slot_preset("aerial_lot")
            elif source_id == "webcam" and active_preset_id != "webcam_desk":
                apply_slot_preset("webcam_desk")

            return True, f"Video source switched to {source_id}"
        return False, f"Unknown video source: {source_id}"

def set_detection_params(confidence=None, iou=None, bboxes=None, polygons=None, animatic=None):
    global confidence_threshold, iou_threshold, show_bboxes, show_polygons, show_animatic_overlays
    with _control_lock:
        if confidence is not None:
            confidence_threshold = float(confidence)
        if iou is not None:
            iou_threshold = float(iou)
        if bboxes is not None:
            show_bboxes = bool(bboxes)
        if polygons is not None:
            show_polygons = bool(polygons)
        if animatic is not None:
            show_animatic_overlays = bool(animatic)

def set_video_playback_controls(speed=None, seek_pct=None, restart=False):
    global playback_speed, seek_target_pct, restart_requested
    with _control_lock:
        if speed is not None:
            playback_speed = max(0.25, min(4.0, float(speed)))
        if seek_pct is not None:
            seek_target_pct = max(0.0, min(1.0, float(seek_pct)))
        if restart:
            restart_requested = True
    return {
        "success": True,
        "playback_speed": playback_speed,
        "seek_pct": seek_target_pct,
        "restarted": restart
    }

def compute_iou(box_coords, poly_coords):
    try:
        b_box = box(box_coords[0], box_coords[1], box_coords[2], box_coords[3])
        s_poly = Polygon(poly_coords)
        if not s_poly.is_valid:
            s_poly = s_poly.buffer(0)
        union_area = b_box.union(s_poly).area
        return b_box.intersection(s_poly).area / union_area if union_area > 0 else 0.0
    except Exception:
        return 0.0

def _resolve_source_path(source_id):
    if source_id == "url" and custom_stream_url:
        return custom_stream_url
    if source_id == "webcam":
        return 0
    if source_id in VIDEO_SOURCES:
        p = VIDEO_SOURCES[source_id].get("abs_path")
        if isinstance(p, int):
            return p
        if p and os.path.exists(p):
            return p
    aerial_p = os.path.join(DATA_DIR, "aerial_parking_lot_animatic.mp4")
    if os.path.exists(aerial_p):
        return aerial_p
    traffic_p = os.path.join(DATA_DIR, "real_traffic_cars.mp4")
    if os.path.exists(traffic_p):
        return traffic_p
    demo_p = os.path.join(DATA_DIR, "demo_parking.mp4")
    return demo_p if os.path.exists(demo_p) else "demo_parking.mp4"

def get_video_file_path(source_id):
    if source_id in VIDEO_SOURCES:
        p = VIDEO_SOURCES[source_id].get("abs_path")
        if isinstance(p, str) and os.path.exists(p):
            return p
    default_p = os.path.join(DATA_DIR, "aerial_parking_lot_animatic.mp4")
    return default_p if os.path.exists(default_p) else None

def get_latest_frame_bytes():
    with _frame_lock:
        return latest_jpeg_frame

async def get_video_frame_generator():
    global latest_jpeg_frame
    last_sent = None
    try:
        while True:
            frame_bytes = None
            with _frame_lock:
                if latest_jpeg_frame is not None and latest_jpeg_frame != last_sent:
                    frame_bytes = latest_jpeg_frame
                    last_sent = frame_bytes

            if frame_bytes is not None:
                length = len(frame_bytes)
                yield (
                    b'--frame\r\n'
                    b'Content-Type: image/jpeg\r\n'
                    b'Content-Length: ' + str(length).encode('ascii') + b'\r\n'
                    b'\r\n' + frame_bytes + b'\r\n'
                )
            await asyncio.sleep(0.038)
    except asyncio.CancelledError:
        pass


def draw_cyber_bracket(frame, x1, y1, x2, y2, color, corner_len=14, thickness=2):
    """Draws high-tech sci-fi corner brackets around a bounding box."""
    cl = min(corner_len, (x2 - x1) // 3, (y2 - y1) // 3)
    # Top-Left
    cv2.line(frame, (x1, y1), (x1 + cl, y1), color, thickness, cv2.LINE_AA)
    cv2.line(frame, (x1, y1), (x1, y1 + cl), color, thickness, cv2.LINE_AA)
    # Top-Right
    cv2.line(frame, (x2, y1), (x2 - cl, y1), color, thickness, cv2.LINE_AA)
    cv2.line(frame, (x2, y1), (x2, y1 + cl), color, thickness, cv2.LINE_AA)
    # Bottom-Left
    cv2.line(frame, (x1, y2), (x1 + cl, y2), color, thickness, cv2.LINE_AA)
    cv2.line(frame, (x1, y2), (x1, y2 - cl), color, thickness, cv2.LINE_AA)
    # Bottom-Right
    cv2.line(frame, (x2, y2), (x2 - cl, y2), color, thickness, cv2.LINE_AA)
    cv2.line(frame, (x2, y2), (x2, y2 - cl), color, thickness, cv2.LINE_AA)


def draw_animatic_motion_trail(frame, trail, motion_state):
    """Draws a smooth glowing particle breadcrumb trail behind moving cars."""
    if len(trail) < 2:
        return
    pts = list(trail)
    n = len(pts)
    # Color: Electric Cyan for in-motion, Cyber Amber for maneuvering
    base_col = (245, 215, 30) if motion_state == "IN_MOTION" else (30, 190, 255)
    for i in range(n - 1):
        alpha = (i + 1) / n
        thickness = 1 if alpha < 0.5 else 2
        p1 = (int(pts[i][0]), int(pts[i][1]))
        p2 = (int(pts[i + 1][0]), int(pts[i + 1][1]))
        cv2.line(frame, p1, p2, base_col, thickness, cv2.LINE_AA)
        if i % 3 == 0:
            cv2.circle(frame, p1, 2 if alpha < 0.7 else 3, base_col, -1, cv2.LINE_AA)


def run_detection_loop():
    global current_parking_state, latest_jpeg_frame, source_needs_restart
    global seek_target_pct, restart_requested

    # Initialize Ultralytics YOLOv8 for street-level or webcam feeds
    model = None
    try:
        from ultralytics import YOLO
        model_path = "yolov8n.pt"
        if not os.path.exists(model_path) and os.path.exists("../yolov8n.pt"):
            model_path = "../yolov8n.pt"
        model = YOLO(model_path)
        print(f"[SPARK CV Worker] YOLOv8n initialized from {model_path}.")
    except Exception as e:
        print(f"[SPARK CV Worker] Notice: YOLO init notice ({e}).")

    cap = None
    current_path = None
    fps_time = time.time()
    frame_count = 0
    calculated_fps = 24.0
    radar_sweep_x = 0

    while True:
        with _control_lock:
            needs_restart = source_needs_restart
            active_src = active_source_id
            speed = playback_speed
            seek_val = seek_target_pct
            restart_val = restart_requested
            b_boxes = show_bboxes
            b_polys = show_polygons
            b_anim = show_animatic_overlays
            seek_target_pct = None
            restart_requested = False

        if needs_restart or cap is None or not cap.isOpened():
            if cap is not None:
                cap.release()
            source_path = _resolve_source_path(active_src)
            current_path = source_path
            print(f"[SPARK CV Worker] Opening video source: {source_path}")
            cap = cv2.VideoCapture(source_path)
            with _control_lock:
                source_needs_restart = False

        if not cap.isOpened():
            time.sleep(1.0)
            continue

        if restart_val:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
        elif seek_val is not None:
            total_frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
            if total_frames > 0:
                target_f = int(seek_val * total_frames)
                cap.set(cv2.CAP_PROP_POS_FRAMES, target_f)

        current_frame_pos = int(cap.get(cv2.CAP_PROP_POS_FRAMES))

        ret, frame = cap.read()
        if not ret:
            if not isinstance(current_path, int):
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                time.sleep(0.03)
                continue
            else:
                time.sleep(0.1)
                continue

        start_inference_time = time.time()
        fh, fw = frame.shape[:2]

        tracked_vehicles_list = []
        occupied_slot_map = {}
        entering_slot_map = {}

        # ----------------------------------------------------
        # STRATEGY 1: Aerial Drone Lot (2.5 Min HD Video)
        # Uses frame-accurate synchronized trajectory telemetry
        # ----------------------------------------------------
        if active_src == "aerial_lot" and _trajectory_cache:
            cache_len = len(_trajectory_cache)
            frame_idx = current_frame_pos % cache_len
            raw_vehicles = _trajectory_cache[frame_idx]

            for v in raw_vehicles:
                vid = v["id"]
                cx, cy = v["center"]
                bbox = v["bbox"]
                m_state = v["motion_state"]
                speed_kmh = v["speed_kmh"]
                heading = v["heading"]
                slot_id = v.get("slot")
                dwell_sec = v.get("dwell_seconds", 0)

                # Update motion trails
                if vid not in _vehicle_trails:
                    _vehicle_trails[vid] = deque(maxlen=24)
                _vehicle_trails[vid].append((cx, cy))

                veh_obj = {
                    "id": vid,
                    "name": v.get("name", vid),
                    "class": "car",
                    "bbox": bbox,
                    "center": [cx, cy],
                    "speed_kmh": round(speed_kmh, 1),
                    "motion_state": m_state,
                    "heading": round(heading, 1),
                    "assigned_slot": slot_id,
                    "dwell_seconds": dwell_sec,
                    "trail": list(_vehicle_trails[vid])
                }
                tracked_vehicles_list.append(veh_obj)

                if slot_id:
                    occupied_slot_map[slot_id] = veh_obj
                elif m_state == "MANEUVERING":
                    # Check closest bay
                    for b_slot in _active_slots:
                        poly = b_slot["polygon"]
                        poly_center = (
                            (poly[0][0] + poly[2][0]) // 2,
                            (poly[0][1] + poly[2][1]) // 2
                        )
                        dist = math.hypot(cx - poly_center[0], cy - poly_center[1])
                        if dist < 110:
                            entering_slot_map[b_slot["label"]] = veh_obj

        # ----------------------------------------------------
        # STRATEGY 2: Generic Video Sources (YOLOv8 fallback)
        # ----------------------------------------------------
        else:
            detected_boxes = []
            detected_classes = []
            confidences = []
            if model is not None:
                try:
                    results = model.predict(source=frame, classes=[2, 3, 5, 7], conf=confidence_threshold, verbose=False)
                    if len(results) > 0 and results[0].boxes is not None:
                        boxes_tensor = results[0].boxes.xyxy.cpu().numpy()
                        classes_tensor = results[0].boxes.cls.cpu().numpy().astype(int)
                        confs_tensor = results[0].boxes.conf.cpu().numpy()
                        for b, c, conf in zip(boxes_tensor, classes_tensor, confs_tensor):
                            detected_boxes.append(b)
                            detected_classes.append(results[0].names.get(int(c), "car"))
                            confidences.append(float(conf))
                except Exception:
                    pass

            for idx, (b, cls_name, conf) in enumerate(zip(detected_boxes, detected_classes, confidences)):
                cx = (b[0] + b[2]) / 2.0
                cy = (b[1] + b[3]) / 2.0
                vid = f"TRK-{idx+1:02d}"
                if vid not in _vehicle_trails:
                    _vehicle_trails[vid] = deque(maxlen=24)
                _vehicle_trails[vid].append((cx, cy))

                # Estimate speed from trail
                speed_est = 0.0
                if len(_vehicle_trails[vid]) >= 4:
                    p_old = _vehicle_trails[vid][0]
                    disp = math.hypot(cx - p_old[0], cy - p_old[1])
                    speed_est = round((disp / len(_vehicle_trails[vid])) * 24 * 0.035 * 3.6, 1)

                m_state = "IN_MOTION" if speed_est > 4.5 else ("MANEUVERING" if speed_est > 1.2 else "STATIONARY")
                veh_obj = {
                    "id": vid,
                    "name": f"{cls_name.capitalize()} {vid}",
                    "class": cls_name,
                    "bbox": [float(b[0]), float(b[1]), float(b[2]), float(b[3])],
                    "center": [round(cx, 1), round(cy, 1)],
                    "speed_kmh": speed_est,
                    "motion_state": m_state,
                    "heading": 0.0,
                    "assigned_slot": None,
                    "dwell_seconds": 0,
                    "trail": list(_vehicle_trails[vid])
                }
                tracked_vehicles_list.append(veh_obj)

        latency_ms = (time.time() - start_inference_time) * 1000

        # Calculate FPS
        frame_count += 1
        elapsed = time.time() - fps_time
        if elapsed >= 1.0:
            calculated_fps = round(frame_count / elapsed, 1)
            frame_count = 0
            fps_time = time.time()

        # Update slot occupancy
        with _control_lock:
            slots = [s.copy() for s in _active_slots]
            active_preset_name = active_preset_id

        updated_slots = []
        occupied_count = 0
        entering_count = 0
        now_ts = time.time()

        for slot in slots:
            slot_id = slot["id"]
            slot_label = slot["label"]
            poly_coords = slot["polygon"]

            veh_in_slot = occupied_slot_map.get(slot_label)
            is_entering = slot_label in entering_slot_map

            # IoU check fallback if generic source
            max_iou = 0.0
            if not veh_in_slot and tracked_vehicles_list:
                for tv in tracked_vehicles_list:
                    iou = compute_iou(tv["bbox"], poly_coords)
                    if iou > max_iou:
                        max_iou = iou
                        if iou >= iou_threshold:
                            veh_in_slot = tv

            if veh_in_slot:
                status_str = "OCCUPIED"
                occupied_count += 1
                dwell_sec = veh_in_slot.get("dwell_seconds", 0)
                if dwell_sec == 0:
                    if slot_id not in _slot_dwell:
                        _slot_dwell[slot_id] = now_ts
                    dwell_sec = int(now_ts - _slot_dwell[slot_id])
                veh_info = veh_in_slot
            elif is_entering or max_iou >= (iou_threshold * 0.45):
                status_str = "ENTERING"
                entering_count += 1
                dwell_sec = 0
                veh_info = entering_slot_map.get(slot_label, {"id": None, "class": "car"})
            else:
                status_str = "FREE"
                dwell_sec = 0
                veh_info = {"id": None, "class": None}
                if slot_id in _slot_dwell:
                    del _slot_dwell[slot_id]

            slot_item = {
                "id": slot_id,
                "label": slot_label,
                "status": status_str,
                "iou": round(max_iou, 3) if max_iou > 0 else (0.85 if status_str == "OCCUPIED" else 0.0),
                "dwell_seconds": dwell_sec,
                "vehicle_id": veh_info.get("id"),
                "vehicle_class": veh_info.get("class", "car"),
                "polygon": poly_coords
            }
            updated_slots.append(slot_item)

        # ----------------------------------------------------
        # ANIMATIC VISUAL RENDERING (High-Tech Overlays)
        # ----------------------------------------------------
        overlay = frame.copy()

        # 1. Subtle High-Tech Parking Stalls (Cyber Brackets instead of heavy grid)
        if b_polys:
            for s_item in updated_slots:
                poly = s_item["polygon"]
                stat = s_item["status"]
                lbl = s_item["label"]

                if stat == "OCCUPIED":
                    # Sunset Coral (20, 100, 245)
                    col = (20, 100, 245)
                elif stat == "ENTERING":
                    # Cyber Amber (30, 175, 245)
                    col = (30, 175, 245)
                else:
                    # Cyber Cobalt / Electric Indigo (235, 140, 40)
                    col = (235, 140, 40)

                pts = np.array(poly, dtype=np.int32)
                # Soft fill
                cv2.fillPoly(overlay, [pts], col)
                # Outer border
                cv2.polylines(frame, [pts], True, col, 1, cv2.LINE_AA)

                # Corner tick-marks
                px1 = min(p[0] for p in poly)
                py1 = min(p[1] for p in poly)
                px2 = max(p[0] for p in poly)
                py2 = max(p[1] for p in poly)
                draw_cyber_bracket(frame, px1, py1, px2, py2, col, corner_len=10, thickness=2)

                # Stall Label Tag
                dwell_sec = s_item["dwell_seconds"]
                if stat == "OCCUPIED" and dwell_sec > 0:
                    d_txt = f"{dwell_sec // 60:02d}:{dwell_sec % 60:02d}"
                    tag = f"{lbl} [{stat[:3]} {d_txt}]"
                else:
                    tag = f"{lbl} [{stat[:3]}]"

                ty = py1 - 6 if py1 > 35 else py2 + 16
                cv2.putText(frame, tag, (px1 + 2, ty), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (255, 255, 255), 2, cv2.LINE_AA)
                cv2.putText(frame, tag, (px1 + 2, ty), cv2.FONT_HERSHEY_SIMPLEX, 0.40, col, 1, cv2.LINE_AA)

            # Translucent blending for stall fills
            alpha = 0.20
            cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0, frame)

        # 2. Motion Trails & Velocity Vectors for Tracked Vehicles
        if b_anim:
            for tv in tracked_vehicles_list:
                m_state = tv["motion_state"]
                cx, cy = tv["center"]
                spd = tv["speed_kmh"]
                heading = tv["heading"]

                # Render breadcrumb ribbon trails for moving cars
                if m_state in ["IN_MOTION", "MANEUVERING"] and tv.get("trail"):
                    draw_animatic_motion_trail(frame, tv["trail"], m_state)

                # Velocity Vector Arrow
                if spd >= 3.0:
                    v_len = min(55, max(18, int(spd * 2.2)))
                    rad = math.radians(heading)
                    vx = int(cx + v_len * math.cos(rad))
                    vy = int(cy + v_len * math.sin(rad))
                    cv2.arrowedLine(frame, (int(cx), int(cy)), (vx, vy), (245, 220, 20), 2, cv2.LINE_AA, tipLength=0.35)

        # 3. Dynamic Cyber Targeting Brackets & Telemetry Badges
        if b_boxes:
            for tv in tracked_vehicles_list:
                bb = tv["bbox"]
                x1, y1, x2, y2 = map(int, bb)
                m_state = tv["motion_state"]
                spd = tv["speed_kmh"]
                vid = tv["id"]

                # Dynamic color scheme based on state
                if m_state == "IN_MOTION":
                    # Neon Cyan (240, 215, 0)
                    reticle_col = (240, 215, 0)
                    state_lbl = f"{vid} [MOVING {int(spd)} KM/H]"
                elif m_state == "MANEUVERING":
                    # Amber (30, 180, 255)
                    reticle_col = (30, 180, 255)
                    state_lbl = f"{vid} [MANEUVERING {int(spd)} KM/H]"
                else:
                    # Royal Violet / Indigo (230, 90, 120)
                    reticle_col = (230, 90, 120)
                    dwell = tv.get("dwell_seconds", 0)
                    dw_str = f"{dwell // 60:02d}:{dwell % 60:02d}"
                    state_lbl = f"{vid} [PARKED {dw_str}]"

                # Draw high-tech cyber bracket
                draw_cyber_bracket(frame, x1, y1, x2, y2, reticle_col, corner_len=14, thickness=2)

                # Sleek mini telemetry pill badge
                (tw, th), _ = cv2.getTextSize(state_lbl, cv2.FONT_HERSHEY_SIMPLEX, 0.38, 1)
                by = y1 - 6 if y1 > 35 else y2 + 16
                cv2.rectangle(frame, (x1, by - th - 3), (x1 + tw + 6, by + 3), (18, 20, 28), -1)
                cv2.rectangle(frame, (x1, by - th - 3), (x1 + tw + 6, by + 3), reticle_col, 1)
                cv2.putText(frame, state_lbl, (x1 + 3, by), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (255, 255, 255), 1, cv2.LINE_AA)

        # 4. Animatic Radar Telemetry Sweep Line
        radar_sweep_x = (radar_sweep_x + 8) % fw
        cv2.line(frame, (radar_sweep_x, 38), (radar_sweep_x, fh), (240, 200, 20), 1, cv2.LINE_AA)

        # 5. Top HUD Telemetry Banner
        cv2.rectangle(frame, (0, 0), (fw, 36), (15, 20, 30), -1)
        cv2.line(frame, (0, 36), (fw, 36), (99, 102, 241), 1)

        moving_cnt = sum(1 for v in tracked_vehicles_list if v["motion_state"] == "IN_MOTION")
        maneuver_cnt = sum(1 for v in tracked_vehicles_list if v["motion_state"] == "MANEUVERING")
        parked_cnt = sum(1 for v in tracked_vehicles_list if v["motion_state"] == "STATIONARY")

        src_label = VIDEO_SOURCES.get(active_src, {}).get("label", active_src)
        hud_text = (
            f"SPARK // {src_label} | FPS: {calculated_fps:.1f} | SPEED: {speed:.1f}x | "
            f"TRACKED: {len(tracked_vehicles_list)} | IN-MOTION: {moving_cnt} | "
            f"PARKED: {parked_cnt} | OCCUPIED: {occupied_count}/{len(slots)}"
        )
        cv2.putText(frame, hud_text, (14, 23), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (255, 255, 255), 1, cv2.LINE_AA)

        # Encode frame to JPEG
        ret_enc, jpeg_buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 78])
        if ret_enc:
            with _frame_lock:
                latest_jpeg_frame = jpeg_buf.tobytes()

        # Update global state
        total = len(slots)
        with _state_lock:
            current_parking_state = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "total_slots": total,
                "available_slots": total - occupied_count,
                "occupied_slots": occupied_count,
                "entering_slots": entering_count,
                "occupancy_rate": round((occupied_count / total) * 100, 1) if total > 0 else 0.0,
                "slots": updated_slots,
                "detected_vehicles_count": len(tracked_vehicles_list),
                "tracked_vehicles": tracked_vehicles_list,
                "motion_summary": {
                    "moving": moving_cnt,
                    "maneuvering": maneuver_cnt,
                    "stationary": parked_cnt,
                    "total": len(tracked_vehicles_list)
                },
                "fps": calculated_fps,
                "latency_ms": round(latency_ms, 1),
                "video_source": active_src,
                "video_source_label": src_label,
                "active_preset": active_preset_name,
                "playback_speed": speed
            }

        base_sleep = 0.038
        actual_sleep = max(0.005, base_sleep / speed)
        time.sleep(actual_sleep)


def start_cv_worker():
    threading.Thread(target=run_detection_loop, daemon=True).start()
