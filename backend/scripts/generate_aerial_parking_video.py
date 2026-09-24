"""
SPARK - Photorealistic Aerial Drone Parking Lot Video Generator (Optimized)
Generates a 150-second (2.5 minutes, 3600 frames @ 24fps) 1280x720 HD video
simulating an overhead 4K surveillance drone surveying a commercial parking facility.
"""

import cv2
import numpy as np
import os
import math
import sys

def draw_topdown_car(frame, cx, cy, angle_deg, length, width, color, is_braking=False, left_turn=False, right_turn=False, headlights=True, frame_idx=0):
    """
    Renders a realistic top-down aerial perspective of a vehicle with shadows,
    body highlights, windshields, roof, side mirrors, and lighting.
    Optimized for high-speed rendering (no full-frame copies).
    """
    rad = math.radians(angle_deg)
    cos_a = math.cos(rad)
    sin_a = math.sin(rad)

    def rot(dx, dy):
        return (int(cx + dx * cos_a - dy * sin_a), int(cy + dx * sin_a + dy * cos_a))

    hl = length / 2.0
    hw = width / 2.0

    # 1. Drop Shadow (fast direct dark charcoal rendering)
    shadow_offset_x = 4
    shadow_offset_y = 6
    s_pts = np.array([
        (int(cx + shadow_offset_x - hl * cos_a - (-hw) * sin_a), int(cy + shadow_offset_y - hl * sin_a + (-hw) * cos_a)),
        (int(cx + shadow_offset_x + hl * cos_a - (-hw) * sin_a), int(cy + shadow_offset_y + hl * sin_a + (-hw) * cos_a)),
        (int(cx + shadow_offset_x + hl * cos_a - hw * sin_a), int(cy + shadow_offset_y + hl * sin_a + hw * cos_a)),
        (int(cx + shadow_offset_x - hl * cos_a - hw * sin_a), int(cy + shadow_offset_y - hl * sin_a + hw * cos_a))
    ], dtype=np.int32)
    cv2.fillPoly(frame, [s_pts], (20, 22, 25))

    # 2. Main Car Body
    p_bl = rot(-hl, -hw)
    p_fl = rot(hl, -hw)
    p_fr = rot(hl, hw)
    p_br = rot(-hl, hw)
    body_pts = np.array([p_bl, p_fl, p_fr, p_br], dtype=np.int32)

    cv2.fillPoly(frame, [body_pts], color)
    dark_trim = tuple(max(0, c - 45) for c in color)
    cv2.polylines(frame, [body_pts], True, dark_trim, 2, cv2.LINE_AA)

    # 3. Side Mirrors
    sm_l1 = rot(hl * 0.35, -hw)
    sm_l2 = rot(hl * 0.35, -hw - 5)
    sm_r1 = rot(hl * 0.35, hw)
    sm_r2 = rot(hl * 0.35, hw + 5)
    cv2.line(frame, sm_l1, sm_l2, color, 3, cv2.LINE_AA)
    cv2.line(frame, sm_r1, sm_r2, color, 3, cv2.LINE_AA)

    # 4. Windshield (Front glass)
    fw_l1 = rot(hl * 0.15, -hw + 4)
    fw_r1 = rot(hl * 0.15, hw - 4)
    fw_l2 = rot(hl * 0.42, -hw + 6)
    fw_r2 = rot(hl * 0.42, hw - 6)
    front_windshield = np.array([fw_l1, fw_l2, fw_r2, fw_r1], dtype=np.int32)
    cv2.fillPoly(frame, [front_windshield], (35, 42, 48))

    # 5. Rear Window
    rw_l1 = rot(-hl * 0.45, -hw + 5)
    rw_r1 = rot(-hl * 0.45, hw - 5)
    rw_l2 = rot(-hl * 0.20, -hw + 4)
    rw_r2 = rot(-hl * 0.20, hw - 4)
    rear_windshield = np.array([rw_l1, rw_l2, rw_r2, rw_r1], dtype=np.int32)
    cv2.fillPoly(frame, [rear_windshield], (30, 36, 42))

    # 6. Roof area
    roof_bl = rot(-hl * 0.20, -hw + 5)
    roof_fl = rot(hl * 0.15, -hw + 5)
    roof_fr = rot(hl * 0.15, hw - 5)
    roof_br = rot(-hl * 0.20, hw - 5)
    roof_pts = np.array([roof_bl, roof_fl, roof_fr, roof_br], dtype=np.int32)
    roof_color = tuple(min(255, c + 20) for c in color)
    cv2.fillPoly(frame, [roof_pts], roof_color)

    # 7. Headlights
    hl_l = rot(hl - 2, -hw + 6)
    hl_r = rot(hl - 2, hw - 6)
    cv2.circle(frame, hl_l, 3, (240, 250, 255), -1, cv2.LINE_AA)
    cv2.circle(frame, hl_r, 3, (240, 250, 255), -1, cv2.LINE_AA)
    if headlights:
        cv2.line(frame, hl_l, rot(hl + 20, -hw + 4), (180, 210, 240), 2, cv2.LINE_AA)
        cv2.line(frame, hl_r, rot(hl + 20, hw - 4), (180, 210, 240), 2, cv2.LINE_AA)

    # 8. Taillights
    tl_l = rot(-hl + 2, -hw + 6)
    tl_r = rot(-hl + 2, hw - 6)
    tail_col = (20, 30, 255) if is_braking else (15, 20, 160)
    cv2.circle(frame, tl_l, 4 if is_braking else 3, tail_col, -1, cv2.LINE_AA)
    cv2.circle(frame, tl_r, 4 if is_braking else 3, tail_col, -1, cv2.LINE_AA)

    # 9. Turn Signals
    is_blink_on = (frame_idx % 12) < 6
    if is_blink_on:
        amber_col = (30, 180, 255)
        if left_turn:
            cv2.circle(frame, rot(hl - 2, -hw - 3), 4, amber_col, -1, cv2.LINE_AA)
            cv2.circle(frame, rot(-hl + 2, -hw - 3), 4, amber_col, -1, cv2.LINE_AA)
        if right_turn:
            cv2.circle(frame, rot(hl - 2, hw + 3), 4, amber_col, -1, cv2.LINE_AA)
            cv2.circle(frame, rot(-hl + 2, hw + 3), 4, amber_col, -1, cv2.LINE_AA)


def build_background_canvas(width=1280, height=720):
    canvas = np.zeros((height, width, 3), dtype=np.uint8)
    canvas[:] = (38, 40, 44)

    # Subtle asphalt texture
    np.random.seed(42)
    noise = np.random.randint(-4, 5, (height, width, 3), dtype=np.int16)
    canvas = np.clip(canvas.astype(np.int16) + noise, 0, 255).astype(np.uint8)

    # Outer curbs / sidewalks
    cv2.rectangle(canvas, (0, 0), (width, 80), (70, 75, 82), -1)
    cv2.line(canvas, (0, 80), (width, 80), (140, 145, 150), 3)

    cv2.rectangle(canvas, (0, 640), (width, height), (70, 75, 82), -1)
    cv2.line(canvas, (0, 640), (width, 640), (140, 145, 150), 3)

    cv2.rectangle(canvas, (0, 0), (70, height), (70, 75, 82), -1)
    cv2.line(canvas, (70, 0), (70, height), (140, 145, 150), 3)
    cv2.rectangle(canvas, (1210, 0), (width, height), (70, 75, 82), -1)
    cv2.line(canvas, (1210, 0), (1210, height), (140, 145, 150), 3)

    # Landscaped Green Planter Islands at corners
    for (ix, iy) in [(15, 15), (1225, 15), (15, 655), (1225, 655)]:
        cv2.rectangle(canvas, (ix, iy), (ix + 40, iy + 50), (42, 98, 48), -1)
        cv2.circle(canvas, (ix + 20, iy + 25), 15, (32, 120, 40), -1)
        cv2.circle(canvas, (ix + 20, iy + 25), 9, (25, 145, 45), -1)

    # Middle Center Crosswalk / Pedestrian Walkway
    for y_bar in range(290, 430, 24):
        cv2.rectangle(canvas, (595, y_bar), (635, y_bar + 14), (230, 230, 235), -1)

    # Drive Lane Markings
    cv2.line(canvas, (80, 290), (1200, 290), (190, 195, 200), 2, cv2.LINE_AA)
    cv2.line(canvas, (80, 430), (1200, 430), (190, 195, 200), 2, cv2.LINE_AA)
    # Center dashed yellow divider (y = 360)
    for x in range(90, 580, 45):
        cv2.line(canvas, (x, 360), (x + 25, 360), (30, 210, 240), 2, cv2.LINE_AA)
    for x in range(650, 1190, 45):
        cv2.line(canvas, (x, 360), (x + 25, 360), (30, 210, 240), 2, cv2.LINE_AA)

    # Directional transit arrows
    def draw_arrow(cx, cy):
        cv2.line(canvas, (cx - 18, cy), (cx + 14, cy), (220, 220, 220), 3, cv2.LINE_AA)
        cv2.line(canvas, (cx + 14, cy), (cx + 4, cy - 8), (220, 220, 220), 3, cv2.LINE_AA)
        cv2.line(canvas, (cx + 14, cy), (cx + 4, cy + 8), (220, 220, 220), 3, cv2.LINE_AA)

    def draw_left_arrow(cx, cy):
        cv2.line(canvas, (cx + 18, cy), (cx - 14, cy), (220, 220, 220), 3, cv2.LINE_AA)
        cv2.line(canvas, (cx - 14, cy), (cx - 4, cy - 8), (220, 220, 220), 3, cv2.LINE_AA)
        cv2.line(canvas, (cx - 14, cy), (cx - 4, cy + 8), (220, 220, 220), 3, cv2.LINE_AA)

    draw_arrow(320, 325)
    draw_arrow(940, 325)
    draw_left_arrow(280, 395)
    draw_left_arrow(900, 395)

    cv2.putText(canvas, "MAX 15", (470, 332), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (190, 190, 195), 1, cv2.LINE_AA)
    cv2.putText(canvas, "MAX 15", (700, 402), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (190, 190, 195), 1, cv2.LINE_AA)

    bay_xs = [
        (100, 210), (240, 350), (380, 490), (520, 630),
        (660, 770), (800, 910), (940, 1050), (1080, 1190)
    ]

    for i, (bx1, bx2) in enumerate(bay_xs):
        # Row A Stall Lines
        cv2.line(canvas, (bx1, 90), (bx1, 290), (210, 215, 220), 2, cv2.LINE_AA)
        cv2.line(canvas, (bx2, 90), (bx2, 290), (210, 215, 220), 2, cv2.LINE_AA)
        cv2.rectangle(canvas, (bx1 + 18, 105), (bx2 - 18, 115), (145, 150, 155), -1)
        cv2.rectangle(canvas, (bx1 + 18, 105), (bx2 - 18, 115), (70, 75, 80), 1)
        label_a = f"A-{i+1:02d}"
        cv2.putText(canvas, label_a, (bx1 + 35, 145), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (130, 135, 140), 1, cv2.LINE_AA)

        # Row B Stall Lines
        cv2.line(canvas, (bx1, 430), (bx1, 630), (210, 215, 220), 2, cv2.LINE_AA)
        cv2.line(canvas, (bx2, 430), (bx2, 630), (210, 215, 220), 2, cv2.LINE_AA)
        cv2.rectangle(canvas, (bx1 + 18, 605), (bx2 - 18, 615), (145, 150, 155), -1)
        cv2.rectangle(canvas, (bx1 + 18, 605), (bx2 - 18, 615), (70, 75, 80), 1)
        label_b = f"B-{i+1:02d}"
        cv2.putText(canvas, label_b, (bx1 + 35, 590), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (130, 135, 140), 1, cv2.LINE_AA)

    return canvas


def generate_aerial_video(output_path, duration_seconds=150, fps=24):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    width, height = 1280, 720
    total_frames = duration_seconds * fps

    # Use mp4v or XVID
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    bg_canvas = build_background_canvas(width, height)

    bay_centers = {
        "A-01": (155, 190), "A-02": (295, 190), "A-03": (435, 190), "A-04": (575, 190),
        "A-05": (715, 190), "A-06": (855, 190), "A-07": (995, 190), "A-08": (1135, 190),
        "B-01": (155, 530), "B-02": (295, 530), "B-03": (435, 530), "B-04": (575, 530),
        "B-05": (715, 530), "B-06": (855, 530), "B-07": (995, 530), "B-08": (1135, 530),
    }

    # Permanent static cars pre-drawn on base canvas for maximum performance
    perm_static = [
        {"bay": "A-01", "color": (195, 198, 202), "len": 128, "w": 62, "angle": 90},
        {"bay": "A-03", "color": (140, 60, 30),   "len": 136, "w": 66, "angle": 90},
        {"bay": "A-08", "color": (230, 235, 240), "len": 130, "w": 64, "angle": 90},
        {"bay": "B-02", "color": (45, 90, 50),    "len": 142, "w": 68, "angle": 270},
        {"bay": "B-05", "color": (40, 42, 45),    "len": 132, "w": 64, "angle": 270},
        {"bay": "B-07", "color": (20, 190, 230),  "len": 122, "w": 60, "angle": 270},
    ]
    for sc in perm_static:
        cx, cy = bay_centers[sc["bay"]]
        draw_topdown_car(bg_canvas, cx, cy, sc["angle"], sc["len"], sc["w"], sc["color"], is_braking=False)

    print(f"[Generator] Fast rendering {total_frames} frames ({duration_seconds}s) to {output_path}...", flush=True)

    def interp(t, p0, p1):
        return p0 + (p1 - p0) * t

    def smooth_step(t):
        t = max(0.0, min(1.0, t))
        return t * t * (3 - 2 * t)

    for f in range(total_frames):
        frame = bg_canvas.copy()

        # Temporary static car in A-06 (leaves at f = 88 * fps)
        if f < int(88 * fps):
            draw_topdown_car(frame, 855, 190, 90, 118, 58, (35, 35, 190), frame_idx=f)

        # Dynamic Car 1: Blue Sedan enters from left (t=4s to 26s), arrives at Stall B-04
        c1_start = 4 * fps
        c1_turn  = 14 * fps
        c1_parked = 26 * fps
        if f >= c1_start:
            c1_color = (180, 110, 40)
            if f < c1_turn:
                prog = smooth_step((f - c1_start) / (c1_turn - c1_start))
                cx = interp(prog, -60, 610)
                draw_topdown_car(frame, cx, 325, 0, 126, 62, c1_color, right_turn=prog > 0.6, frame_idx=f)
            elif f < c1_parked:
                prog = smooth_step((f - c1_turn) / (c1_parked - c1_turn))
                if prog < 0.4:
                    sub = prog / 0.4
                    cx = interp(sub, 610, 625)
                    cy = interp(sub, 325, 375)
                    angle = interp(sub, 0, 45)
                    draw_topdown_car(frame, cx, cy, angle, 126, 62, c1_color, is_braking=True, frame_idx=f)
                else:
                    sub = (prog - 0.4) / 0.6
                    cx = interp(sub, 625, 575)
                    cy = interp(sub, 375, 530)
                    angle = interp(sub, 45, 270)
                    draw_topdown_car(frame, cx, cy, angle, 126, 62, c1_color, is_braking=True, frame_idx=f)
            else:
                draw_topdown_car(frame, 575, 530, 270, 126, 62, c1_color, frame_idx=f)

        # Dynamic Car 2: Red SUV enters from right transit lane (t=24s to 46s), cruises to Stall A-04
        c2_start = 24 * fps
        c2_turn  = 36 * fps
        c2_parked = 46 * fps
        if f >= c2_start:
            c2_color = (40, 45, 205)
            if f < c2_turn:
                prog = smooth_step((f - c2_start) / (c2_turn - c2_start))
                cx = interp(prog, 1340, 575)
                draw_topdown_car(frame, cx, 395, 180, 134, 66, c2_color, right_turn=prog > 0.7, frame_idx=f)
            elif f < c2_parked:
                prog = smooth_step((f - c2_turn) / (c2_parked - c2_turn))
                cy = interp(prog, 395, 190)
                angle = interp(prog, 180, 270)
                draw_topdown_car(frame, 575, cy, angle, 134, 66, c2_color, is_braking=prog > 0.7, frame_idx=f)
            else:
                draw_topdown_car(frame, 575, 190, 270, 134, 66, c2_color, frame_idx=f)

        # Dynamic Car 3: White Electric Hatchback enters (t=48s to 70s), maneuvers slowly, parks in B-01
        c3_start = 48 * fps
        c3_turn  = 58 * fps
        c3_parked = 70 * fps
        if f >= c3_start:
            c3_color = (225, 225, 230)
            if f < c3_turn:
                prog = smooth_step((f - c3_start) / (c3_turn - c3_start))
                cx = interp(prog, -60, 155)
                draw_topdown_car(frame, cx, 325, 0, 120, 60, c3_color, right_turn=prog > 0.6, frame_idx=f)
            elif f < c3_parked:
                prog = smooth_step((f - c3_turn) / (c3_parked - c3_turn))
                cy = interp(prog, 325, 530)
                angle = interp(prog, 0, 90)
                draw_topdown_car(frame, 155, cy, angle, 120, 60, c3_color, is_braking=prog > 0.7, frame_idx=f)
            else:
                draw_topdown_car(frame, 155, 530, 90, 120, 60, c3_color, frame_idx=f)

        # Dynamic Car 4: Black Luxury Sedan enters (t=68s to 98s), yields at zebra crossing, parks in A-07
        c4_start = 68 * fps
        c4_yield = 78 * fps
        c4_turn  = 88 * fps
        c4_parked = 98 * fps
        if f >= c4_start:
            c4_color = (22, 24, 28)
            if f < c4_yield:
                prog = smooth_step((f - c4_start) / (c4_yield - c4_start))
                cx = interp(prog, -60, 560)
                draw_topdown_car(frame, cx, 325, 0, 138, 64, c4_color, is_braking=prog > 0.6, frame_idx=f)
            elif f < c4_turn:
                prog = smooth_step((f - c4_yield) / (c4_turn - c4_yield))
                cx = interp(prog, 560, 995)
                draw_topdown_car(frame, cx, 325, 0, 138, 64, c4_color, is_braking=prog > 0.7, left_turn=prog > 0.5, frame_idx=f)
            elif f < c4_parked:
                prog = smooth_step((f - c4_turn) / (c4_parked - c4_turn))
                cy = interp(prog, 325, 190)
                angle = interp(prog, 0, 270)
                draw_topdown_car(frame, 995, cy, angle, 138, 64, c4_color, is_braking=prog > 0.7, frame_idx=f)
            else:
                draw_topdown_car(frame, 995, 190, 270, 138, 64, c4_color, frame_idx=f)

        # Dynamic Car 5: Crimson Hatchback departs from A-06 (t=88s to 116s)
        c5_start = 88 * fps
        c5_rev   = 98 * fps
        c5_exit  = 116 * fps
        if c5_start <= f < c5_exit:
            c5_color = (35, 35, 190)
            if f < c5_rev:
                prog = smooth_step((f - c5_start) / (c5_rev - c5_start))
                cx = interp(prog, 855, 875)
                cy = interp(prog, 190, 360)
                angle = interp(prog, 90, 45)
                draw_topdown_car(frame, cx, cy, angle, 118, 58, c5_color, is_braking=True, frame_idx=f)
            else:
                prog = smooth_step((f - c5_rev) / (c5_exit - c5_rev))
                cx = interp(prog, 875, 1350)
                angle = interp(prog, 45, 0)
                draw_topdown_car(frame, cx, 325, angle, 118, 58, c5_color, frame_idx=f)

        # Dynamic Car 6: Orange Crossover enters, claims vacant Stall A-06 (t=112s to 142s)
        c6_start = 112 * fps
        c6_turn  = 128 * fps
        c6_parked = 142 * fps
        if f >= c6_start:
            c6_color = (25, 115, 235)
            if f < c6_turn:
                prog = smooth_step((f - c6_start) / (c6_turn - c6_start))
                cx = interp(prog, -60, 855)
                draw_topdown_car(frame, cx, 325, 0, 130, 64, c6_color, is_braking=prog > 0.7, left_turn=prog > 0.5, frame_idx=f)
            elif f < c6_parked:
                prog = smooth_step((f - c6_turn) / (c6_parked - c6_turn))
                cy = interp(prog, 325, 190)
                angle = interp(prog, 0, 270)
                draw_topdown_car(frame, 855, cy, angle, 130, 64, c6_color, is_braking=prog > 0.7, frame_idx=f)
            else:
                draw_topdown_car(frame, 855, 190, 270, 130, 64, c6_color, frame_idx=f)

        # Dynamic Car 7: Champagne Gold sedan pass-through (t=130s to 148s)
        c7_start = 130 * fps
        c7_end   = 148 * fps
        if c7_start <= f <= c7_end:
            c7_color = (130, 185, 215)
            prog = smooth_step((f - c7_start) / (c7_end - c7_start))
            cx = interp(prog, 1340, -60)
            draw_topdown_car(frame, cx, 395, 180, 132, 62, c7_color, frame_idx=f)

        out.write(frame)

        if f % (30 * fps) == 0:
            print(f"Progress: {int(f / fps)}s / {duration_seconds}s ({int(f / total_frames * 100)}%)", flush=True)

    out.release()
    file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"[Generator] Complete! File: {output_path} ({file_size_mb:.2f} MB, {total_frames} frames, {duration_seconds}s).", flush=True)

if __name__ == "__main__":
    scripts_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(scripts_dir)
    data_dir = os.path.join(backend_dir, "data")
    target = os.path.join(data_dir, "aerial_parking_lot_animatic.mp4")
    generate_aerial_video(target, duration_seconds=150, fps=24)
