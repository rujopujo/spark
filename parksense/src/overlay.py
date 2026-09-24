"""Draws slot polygons, detection boxes and the occupancy counter onto a frame."""

import cv2
import numpy as np

_BLUE          = (220, 130, 20)   # vehicle bbox  (BGR vivid blue)
_EMPTY_FILL    = (40,  180,  60)  # green fill
_EMPTY_BORDER  = (20,  220,  70)  # green border
_OCC_FILL      = (40,   40, 200)  # red fill
_OCC_BORDER    = (30,   30, 240)  # red border


def draw_slots(frame, slots: list[dict], occupied_ids: set = None) -> None:
    if occupied_ids is None:
        occupied_ids = set()
    overlay = frame.copy()
    for slot in slots:
        pts      = np.array(slot["polygon"], dtype=np.int32)
        occupied = slot["id"] in occupied_ids
        cv2.fillPoly(overlay, [pts], _OCC_FILL if occupied else _EMPTY_FILL)
    # Blend fill very lightly
    cv2.addWeighted(overlay, 0.18, frame, 0.82, 0, frame)
    # Draw borders + center dot on top of blended frame
    for slot in slots:
        pts      = np.array(slot["polygon"], dtype=np.int32)
        occupied = slot["id"] in occupied_ids
        cv2.polylines(frame, [pts], isClosed=True,
                      color=_OCC_BORDER if occupied else _EMPTY_BORDER,
                      thickness=1, lineType=cv2.LINE_AA)
        cx = int(pts[:, 0].mean())
        cy = int(pts[:, 1].mean())
        cv2.circle(frame, (cx, cy), 3,
                   _OCC_BORDER if occupied else _EMPTY_BORDER, -1, cv2.LINE_AA)


def draw_detections(frame, detections: list[dict]) -> None:
    """Draw bounding boxes on the frame for each detection.

    Args:
        frame: OpenCV image frame (modified in place).
        detections (list[dict]): List of detections from the VehicleDetector.
    """
    # Scale line thickness with image size so boxes stay visible on large frames
    h, w = frame.shape[:2]
    thickness = max(2, round((h + w) / 2 * 0.003))

    for det in detections:
        x1, y1, x2, y2 = det["bbox"]
        class_name = det["class_name"].lower()

        # Color formatting based on detection class
        if "empty" in class_name:
            color = (0, 220, 0)      # Clean Green in BGR
        elif "occupied" in class_name:
            color = (0, 0, 225)      # Clean Red in BGR
        else:
            color = (0, 255, 0)      # Default Green for others (e.g. standard vehicle classes)

        # Draw bounding box (dynamic thickness) without any text labels
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, thickness, lineType=cv2.LINE_AA)


def draw_occupancy_stats(frame, frame_idx: int, total_frames: int, occupied: int, total: int) -> None:
    """Draw an occupied / free counter box in the top-left corner."""
    lines = [
        f"Frame:    {frame_idx} / {total_frames}",
        f"Occupied: {occupied} / {total}",
        f"Free:     {total - occupied}",
    ]
    h = len(lines) * 22 + 12
    cv2.rectangle(frame, (0, 0), (230, h), (10, 10, 10), -1)
    cv2.rectangle(frame, (0, 0), (230, h), (55, 55, 55), 1)
    for i, line in enumerate(lines):
        cv2.putText(frame, line, (10, 22 + i * 22),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.58, (210, 210, 210), 1, cv2.LINE_AA)


def draw_stats(frame, frame_idx: int, total_frames: int, detected: int) -> None:
    lines = [
        f"Frame:    {frame_idx} / {total_frames}",
        f"Vehicles: {detected}",
    ]
    h = len(lines) * 20 + 10
    cv2.rectangle(frame, (0, 0), (230, h), (10, 10, 10), -1)
    cv2.rectangle(frame, (0, 0), (230, h), (55, 55, 55), 1)
    for i, line in enumerate(lines):
        cv2.putText(frame, line, (10, 19 + i * 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.52, (210, 210, 210), 1, cv2.LINE_AA)
