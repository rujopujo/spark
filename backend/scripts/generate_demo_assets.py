"""
Generate a synthetic demo parking lot video (backend/data/demo_parking.mp4)
Simulating an overhead camera viewing 20 parking bays with cars parking and leaving.
"""

import cv2
import numpy as np
import json
import os

_SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.dirname(_SCRIPTS_DIR)
_DEFAULT_OUT = os.path.join(_BACKEND_DIR, "data", "demo_parking.mp4")
_DEFAULT_CFG = os.path.join(_BACKEND_DIR, "data", "slots_config.json")

def create_demo_video(output_path=_DEFAULT_OUT, config_path=_DEFAULT_CFG, duration_sec=15, fps=20):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(config_path, "r") as f:
        slots = json.load(f)

    width, height = 1280, 720
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    total_frames = duration_sec * fps

    # Define some car simulation paths
    # Each car will occupy a slot for a period
    car_schedule = [
        {"slot_id": 1, "start_frame": 0, "end_frame": total_frames},
        {"slot_id": 3, "start_frame": 10, "end_frame": total_frames},
        {"slot_id": 4, "start_frame": 0, "end_frame": 120},
        {"slot_id": 7, "start_frame": 40, "end_frame": 240},
        {"slot_id": 12, "start_frame": 0, "end_frame": total_frames},
        {"slot_id": 15, "start_frame": 60, "end_frame": total_frames},
        {"slot_id": 18, "start_frame": 0, "end_frame": 180},
    ]

    slot_lookup = {s["id"]: s for s in slots}

    for frame_idx in range(total_frames):
        # Dark asphalt background
        frame = np.full((height, width, 3), 42, dtype=np.uint8)

        # Drive lane markings
        cv2.line(frame, (50, 360), (1230, 360), (220, 220, 220), 2, cv2.LINE_AA)
        for dx in range(80, 1200, 60):
            cv2.line(frame, (dx, 360), (dx + 30, 360), (255, 230, 0), 3)

        # Draw parking bay boundary lines and labels
        for slot in slots:
            poly = np.array(slot["polygon"], dtype=np.int32)
            cv2.polylines(frame, [poly], isClosed=True, color=(180, 180, 180), thickness=2, lineType=cv2.LINE_AA)
            # Label
            pt = slot["polygon"][0]
            cv2.putText(frame, slot["label"], (pt[0] + 8, pt[1] + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (160, 160, 160), 1, cv2.LINE_AA)

        # Draw cars according to schedule
        for car in car_schedule:
            if car["start_frame"] <= frame_idx <= car["end_frame"]:
                target_slot = slot_lookup[car["slot_id"]]
                poly = target_slot["polygon"]
                # Car bounding box slightly inside slot polygon
                cx1 = poly[0][0] + 8
                cy1 = poly[0][1] + 12
                cx2 = poly[2][0] - 8
                cy2 = poly[2][1] - 12
                
                # Draw car body
                color = (30 + (car["slot_id"] * 25) % 180, 50 + (car["slot_id"] * 30) % 150, 160 + (car["slot_id"] * 10) % 80)
                cv2.rectangle(frame, (cx1, cy1), (cx2, cy2), color, -1)
                cv2.rectangle(frame, (cx1, cy1), (cx2, cy2), (240, 240, 240), 2)
                # Windshield
                wy1 = cy1 + int((cy2 - cy1) * 0.25)
                wy2 = cy1 + int((cy2 - cy1) * 0.45)
                cv2.rectangle(frame, (cx1 + 6, wy1), (cx2 - 6, wy2), (20, 20, 20), -1)
                # Rear window
                ry1 = cy1 + int((cy2 - cy1) * 0.70)
                ry2 = cy1 + int((cy2 - cy1) * 0.85)
                cv2.rectangle(frame, (cx1 + 6, ry1), (cx2 - 6, ry2), (20, 20, 20), -1)

        out.write(frame)

    out.release()
    print(f"Generated demo video: {output_path} ({total_frames} frames, {width}x{height})")

if __name__ == "__main__":
    create_demo_video()
