"""
SPARK - Trajectory & Telemetry Exporter for Aerial Drone Lot
Generates aerial_trajectories.json mapping frame_index to tracked vehicle states:
bounding boxes, center coordinates, speed in km/h, heading angle, motion state (STATIONARY/IN_MOTION/MANEUVERING),
assigned slot, and dwell seconds.
"""

import json
import math
import os

def generate_trajectories(output_path="aerial_trajectories.json", duration_sec=150, fps=24):
    total_frames = duration_sec * fps

    bay_centers = {
        "A-01": (155, 190), "A-02": (295, 190), "A-03": (435, 190), "A-04": (575, 190),
        "A-05": (715, 190), "A-06": (855, 190), "A-07": (995, 190), "A-08": (1135, 190),
        "B-01": (155, 530), "B-02": (295, 530), "B-03": (435, 530), "B-04": (575, 530),
        "B-05": (715, 530), "B-06": (855, 530), "B-07": (995, 530), "B-08": (1135, 530),
    }

    def interp(t, p0, p1):
        return p0 + (p1 - p0) * t

    def smooth_step(t):
        t = max(0.0, min(1.0, t))
        return t * t * (3 - 2 * t)

    def get_bbox(cx, cy, angle_deg, length, width):
        rad = math.radians(angle_deg)
        cos_a = math.cos(rad)
        sin_a = math.sin(rad)
        hl = length / 2.0
        hw = width / 2.0
        corners = [
            (cx - hl * cos_a - (-hw) * sin_a, cy - hl * sin_a + (-hw) * cos_a),
            (cx + hl * cos_a - (-hw) * sin_a, cy + hl * sin_a + (-hw) * cos_a),
            (cx + hl * cos_a - hw * sin_a,     cy + hl * sin_a + hw * cos_a),
            (cx - hl * cos_a - hw * sin_a,     cy - hl * sin_a + hw * cos_a)
        ]
        xs = [c[0] for c in corners]
        ys = [c[1] for c in corners]
        return [round(min(xs) - 3, 1), round(min(ys) - 3, 1), round(max(xs) + 3, 1), round(max(ys) + 3, 1)]

    trajectories = []

    # State histories for speed calculation
    last_positions = {}

    for f in range(total_frames):
        frame_vehicles = []

        # Permanent static cars
        perm = [
            ("VEH-01", "Silver Sedan", "A-01", 90, 128, 62),
            ("VEH-02", "Midnight SUV", "A-03", 90, 136, 66),
            ("VEH-04", "White Coupe", "A-08", 90, 130, 64),
            ("VEH-05", "Green Pickup", "B-02", 270, 142, 68),
            ("VEH-06", "Charcoal Sedan", "B-05", 270, 132, 64),
            ("VEH-07", "Yellow Coupe", "B-07", 270, 122, 60),
        ]
        for vid, vname, sname, ang, vl, vw in perm:
            cx, cy = bay_centers[sname]
            bb = get_bbox(cx, cy, ang, vl, vw)
            frame_vehicles.append({
                "id": vid, "name": vname, "class": "car",
                "center": [cx, cy], "bbox": bb, "heading": ang,
                "speed_kmh": 0.0, "motion_state": "STATIONARY",
                "slot": sname, "dwell_seconds": int(f / fps)
            })

        # Dynamic Car 5: Crimson Hatchback in Stall A-06 (departs t=88s to 116s)
        c5_start = 88 * fps
        c5_rev   = 98 * fps
        c5_exit  = 116 * fps
        if f < c5_start:
            cx, cy = bay_centers["A-06"]
            bb = get_bbox(cx, cy, 90, 118, 58)
            frame_vehicles.append({
                "id": "VEH-03", "name": "Crimson Hatchback", "class": "car",
                "center": [cx, cy], "bbox": bb, "heading": 90,
                "speed_kmh": 0.0, "motion_state": "STATIONARY",
                "slot": "A-06", "dwell_seconds": int(f / fps)
            })
        elif f < c5_rev:
            prog = smooth_step((f - c5_start) / (c5_rev - c5_start))
            cx = interp(prog, 855, 875)
            cy = interp(prog, 190, 360)
            ang = interp(prog, 90, 45)
            bb = get_bbox(cx, cy, ang, 118, 58)
            frame_vehicles.append({
                "id": "VEH-03", "name": "Crimson Hatchback", "class": "car",
                "center": [round(cx, 1), round(cy, 1)], "bbox": bb, "heading": round(ang, 1),
                "speed_kmh": 4.2, "motion_state": "MANEUVERING",
                "slot": None, "dwell_seconds": 0
            })
        elif f < c5_exit:
            prog = smooth_step((f - c5_rev) / (c5_exit - c5_rev))
            cx = interp(prog, 875, 1350)
            cy = 325
            ang = interp(prog, 45, 0)
            bb = get_bbox(cx, cy, ang, 118, 58)
            frame_vehicles.append({
                "id": "VEH-03", "name": "Crimson Hatchback", "class": "car",
                "center": [round(cx, 1), round(cy, 1)], "bbox": bb, "heading": round(ang, 1),
                "speed_kmh": 22.4, "motion_state": "IN_MOTION",
                "slot": None, "dwell_seconds": 0
            })

        # Dynamic Car 1: Blue Sedan (enters t=4s, parks B-04 at t=26s)
        c1_start = 4 * fps
        c1_turn  = 14 * fps
        c1_parked = 26 * fps
        if f >= c1_start:
            if f < c1_turn:
                prog = smooth_step((f - c1_start) / (c1_turn - c1_start))
                cx = interp(prog, -60, 610)
                cy = 325
                ang = 0
                bb = get_bbox(cx, cy, ang, 126, 62)
                frame_vehicles.append({
                    "id": "VEH-08", "name": "Royal Blue Sedan", "class": "car",
                    "center": [round(cx, 1), round(cy, 1)], "bbox": bb, "heading": ang,
                    "speed_kmh": 24.5, "motion_state": "IN_MOTION",
                    "slot": None, "dwell_seconds": 0
                })
            elif f < c1_parked:
                prog = smooth_step((f - c1_turn) / (c1_parked - c1_turn))
                if prog < 0.4:
                    sub = prog / 0.4
                    cx = interp(sub, 610, 625)
                    cy = interp(sub, 325, 375)
                    ang = interp(sub, 0, 45)
                else:
                    sub = (prog - 0.4) / 0.6
                    cx = interp(sub, 625, 575)
                    cy = interp(sub, 375, 530)
                    ang = interp(sub, 45, 270)
                bb = get_bbox(cx, cy, ang, 126, 62)
                frame_vehicles.append({
                    "id": "VEH-08", "name": "Royal Blue Sedan", "class": "car",
                    "center": [round(cx, 1), round(cy, 1)], "bbox": bb, "heading": round(ang, 1),
                    "speed_kmh": 3.8, "motion_state": "MANEUVERING",
                    "slot": "B-04" if cy > 440 else None, "dwell_seconds": 0
                })
            else:
                cx, cy = 575, 530
                bb = get_bbox(cx, cy, 270, 126, 62)
                dwell = int((f - c1_parked) / fps)
                frame_vehicles.append({
                    "id": "VEH-08", "name": "Royal Blue Sedan", "class": "car",
                    "center": [cx, cy], "bbox": bb, "heading": 270,
                    "speed_kmh": 0.0, "motion_state": "STATIONARY",
                    "slot": "B-04", "dwell_seconds": dwell
                })

        # Dynamic Car 2: Red SUV (enters t=24s, parks A-04 at t=46s)
        c2_start = 24 * fps
        c2_turn  = 36 * fps
        c2_parked = 46 * fps
        if f >= c2_start:
            if f < c2_turn:
                prog = smooth_step((f - c2_start) / (c2_turn - c2_start))
                cx = interp(prog, 1340, 575)
                cy = 395
                ang = 180
                bb = get_bbox(cx, cy, ang, 134, 66)
                frame_vehicles.append({
                    "id": "VEH-09", "name": "Crimson SUV", "class": "car",
                    "center": [round(cx, 1), round(cy, 1)], "bbox": bb, "heading": ang,
                    "speed_kmh": 21.8, "motion_state": "IN_MOTION",
                    "slot": None, "dwell_seconds": 0
                })
            elif f < c2_parked:
                prog = smooth_step((f - c2_turn) / (c2_parked - c2_turn))
                cx = 575
                cy = interp(prog, 395, 190)
                ang = interp(prog, 180, 270)
                bb = get_bbox(cx, cy, ang, 134, 66)
                frame_vehicles.append({
                    "id": "VEH-09", "name": "Crimson SUV", "class": "car",
                    "center": [round(cx, 1), round(cy, 1)], "bbox": bb, "heading": round(ang, 1),
                    "speed_kmh": 4.5, "motion_state": "MANEUVERING",
                    "slot": "A-04" if cy < 280 else None, "dwell_seconds": 0
                })
            else:
                cx, cy = 575, 190
                bb = get_bbox(cx, cy, 270, 134, 66)
                dwell = int((f - c2_parked) / fps)
                frame_vehicles.append({
                    "id": "VEH-09", "name": "Crimson SUV", "class": "car",
                    "center": [cx, cy], "bbox": bb, "heading": 270,
                    "speed_kmh": 0.0, "motion_state": "STATIONARY",
                    "slot": "A-04", "dwell_seconds": dwell
                })

        # Dynamic Car 3: White Electric Hatchback (enters t=48s, parks B-01 at t=70s)
        c3_start = 48 * fps
        c3_turn  = 58 * fps
        c3_parked = 70 * fps
        if f >= c3_start:
            if f < c3_turn:
                prog = smooth_step((f - c3_start) / (c3_turn - c3_start))
                cx = interp(prog, -60, 155)
                cy = 325
                ang = 0
                bb = get_bbox(cx, cy, ang, 120, 60)
                frame_vehicles.append({
                    "id": "VEH-10", "name": "White Hatchback", "class": "car",
                    "center": [round(cx, 1), round(cy, 1)], "bbox": bb, "heading": ang,
                    "speed_kmh": 18.0, "motion_state": "IN_MOTION",
                    "slot": None, "dwell_seconds": 0
                })
            elif f < c3_parked:
                prog = smooth_step((f - c3_turn) / (c3_parked - c3_turn))
                cx = 155
                cy = interp(prog, 325, 530)
                ang = interp(prog, 0, 90)
                bb = get_bbox(cx, cy, ang, 120, 60)
                frame_vehicles.append({
                    "id": "VEH-10", "name": "White Hatchback", "class": "car",
                    "center": [round(cx, 1), round(cy, 1)], "bbox": bb, "heading": round(ang, 1),
                    "speed_kmh": 3.6, "motion_state": "MANEUVERING",
                    "slot": "B-01" if cy > 440 else None, "dwell_seconds": 0
                })
            else:
                cx, cy = 155, 530
                bb = get_bbox(cx, cy, 90, 120, 60)
                dwell = int((f - c3_parked) / fps)
                frame_vehicles.append({
                    "id": "VEH-10", "name": "White Hatchback", "class": "car",
                    "center": [cx, cy], "bbox": bb, "heading": 90,
                    "speed_kmh": 0.0, "motion_state": "STATIONARY",
                    "slot": "B-01", "dwell_seconds": dwell
                })

        # Dynamic Car 4: Black Luxury Sedan (enters t=68s, yields, parks A-07 at t=98s)
        c4_start = 68 * fps
        c4_yield = 78 * fps
        c4_turn  = 88 * fps
        c4_parked = 98 * fps
        if f >= c4_start:
            if f < c4_yield:
                prog = smooth_step((f - c4_start) / (c4_yield - c4_start))
                cx = interp(prog, -60, 560)
                cy = 325
                ang = 0
                bb = get_bbox(cx, cy, ang, 138, 64)
                frame_vehicles.append({
                    "id": "VEH-11", "name": "Black Sedan", "class": "car",
                    "center": [round(cx, 1), round(cy, 1)], "bbox": bb, "heading": ang,
                    "speed_kmh": 19.5, "motion_state": "IN_MOTION",
                    "slot": None, "dwell_seconds": 0
                })
            elif f < c4_turn:
                prog = smooth_step((f - c4_yield) / (c4_turn - c4_yield))
                cx = interp(prog, 560, 995)
                cy = 325
                ang = 0
                bb = get_bbox(cx, cy, ang, 138, 64)
                frame_vehicles.append({
                    "id": "VEH-11", "name": "Black Sedan", "class": "car",
                    "center": [round(cx, 1), round(cy, 1)], "bbox": bb, "heading": ang,
                    "speed_kmh": 16.0, "motion_state": "IN_MOTION",
                    "slot": None, "dwell_seconds": 0
                })
            elif f < c4_parked:
                prog = smooth_step((f - c4_turn) / (c4_parked - c4_turn))
                cx = 995
                cy = interp(prog, 325, 190)
                ang = interp(prog, 0, 270)
                bb = get_bbox(cx, cy, ang, 138, 64)
                frame_vehicles.append({
                    "id": "VEH-11", "name": "Black Sedan", "class": "car",
                    "center": [round(cx, 1), round(cy, 1)], "bbox": bb, "heading": round(ang, 1),
                    "speed_kmh": 3.9, "motion_state": "MANEUVERING",
                    "slot": "A-07" if cy < 280 else None, "dwell_seconds": 0
                })
            else:
                cx, cy = 995, 190
                bb = get_bbox(cx, cy, 270, 138, 64)
                dwell = int((f - c4_parked) / fps)
                frame_vehicles.append({
                    "id": "VEH-11", "name": "Black Sedan", "class": "car",
                    "center": [cx, cy], "bbox": bb, "heading": 270,
                    "speed_kmh": 0.0, "motion_state": "STATIONARY",
                    "slot": "A-07", "dwell_seconds": dwell
                })

        # Dynamic Car 6: Orange Crossover claims Stall A-06 (t=112s to 142s)
        c6_start = 112 * fps
        c6_turn  = 128 * fps
        c6_parked = 142 * fps
        if f >= c6_start:
            if f < c6_turn:
                prog = smooth_step((f - c6_start) / (c6_turn - c6_start))
                cx = interp(prog, -60, 855)
                cy = 325
                ang = 0
                bb = get_bbox(cx, cy, ang, 130, 64)
                frame_vehicles.append({
                    "id": "VEH-12", "name": "Orange Crossover", "class": "car",
                    "center": [round(cx, 1), round(cy, 1)], "bbox": bb, "heading": ang,
                    "speed_kmh": 20.2, "motion_state": "IN_MOTION",
                    "slot": None, "dwell_seconds": 0
                })
            elif f < c6_parked:
                prog = smooth_step((f - c6_turn) / (c6_parked - c6_turn))
                cx = 855
                cy = interp(prog, 325, 190)
                ang = interp(prog, 0, 270)
                bb = get_bbox(cx, cy, ang, 130, 64)
                frame_vehicles.append({
                    "id": "VEH-12", "name": "Orange Crossover", "class": "car",
                    "center": [round(cx, 1), round(cy, 1)], "bbox": bb, "heading": round(ang, 1),
                    "speed_kmh": 3.7, "motion_state": "MANEUVERING",
                    "slot": "A-06" if cy < 280 else None, "dwell_seconds": 0
                })
            else:
                cx, cy = 855, 190
                bb = get_bbox(cx, cy, 270, 130, 64)
                dwell = int((f - c6_parked) / fps)
                frame_vehicles.append({
                    "id": "VEH-12", "name": "Orange Crossover", "class": "car",
                    "center": [cx, cy], "bbox": bb, "heading": 270,
                    "speed_kmh": 0.0, "motion_state": "STATIONARY",
                    "slot": "A-06", "dwell_seconds": dwell
                })

        # Dynamic Car 7: Champagne Gold Sedan transit pass-through (t=130s to 148s)
        c7_start = 130 * fps
        c7_end   = 148 * fps
        if c7_start <= f <= c7_end:
            prog = smooth_step((f - c7_start) / (c7_end - c7_start))
            cx = interp(prog, 1340, -60)
            cy = 395
            ang = 180
            bb = get_bbox(cx, cy, ang, 132, 62)
            frame_vehicles.append({
                "id": "VEH-13", "name": "Champagne Sedan", "class": "car",
                "center": [round(cx, 1), round(cy, 1)], "bbox": bb, "heading": ang,
                "speed_kmh": 23.8, "motion_state": "IN_MOTION",
                "slot": None, "dwell_seconds": 0
            })

        trajectories.append(frame_vehicles)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(trajectories, f)

    file_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"Exported trajectories for {total_frames} frames ({file_mb:.2f} MB) to {output_path}")

if __name__ == "__main__":
    scripts_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(scripts_dir)
    data_dir = os.path.join(backend_dir, "data")
    out_file = os.path.join(data_dir, "aerial_trajectories.json")
    generate_trajectories(out_file)
