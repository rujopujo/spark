"""Parking slot polygons: load, save, and decide which ones are occupied."""

import json
import os
from collections import deque

import numpy as np
import cv2


class OccupancySmoother:
    """Majority vote over the last N frames, to steady a per-frame verdict.

    A single missed detection flips a slot to free for one frame and back
    again, which makes the counter jitter. Requiring a slot to be occupied in
    most of a short window absorbs that without adding real latency.
    """

    def __init__(self, window: int = 5):
        """
        Args:
            window (int): Frames to vote over. 1 disables smoothing.
        """
        self.window = max(1, window)
        self._history = deque(maxlen=self.window)

    def update(self, occupied_ids: set) -> set:
        """Fold this frame's verdict into the window and return the smoothed one.

        Args:
            occupied_ids (set): Slot IDs judged occupied in the current frame.

        Returns:
            set: Slot IDs occupied in more than half of the buffered frames.
        """
        self._history.append(set(occupied_ids))
        if self.window == 1:
            return set(occupied_ids)

        votes = {}
        for frame_ids in self._history:
            for slot_id in frame_ids:
                votes[slot_id] = votes.get(slot_id, 0) + 1
        return {slot_id for slot_id, count in votes.items()
                if count * 2 > len(self._history)}


def classify_slots(slots: list[dict], detections: list[dict]) -> set[int]:
    """Return IDs of slots whose polygon contains the centroid of at least one detection."""
    occupied = set()
    for det in detections:
        # If the detection is explicitly labeled as empty, it does not occupy the slot
        if det["class_name"].lower() == "empty":
            continue
            
        x1, y1, x2, y2 = det["bbox"]
        cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
        for slot in slots:
            pts = np.array(slot["polygon"], dtype=np.float32)
            if cv2.pointPolygonTest(pts, (cx, cy), measureDist=False) >= 0:
                occupied.add(slot["id"])
    return occupied


def make_tiles(frame_shape, rows: int, cols: int, overlap: float = 0.10) -> list[tuple]:
    """Split a frame into a grid of overlapping tile regions.

    Args:
        frame_shape: (h, w, ...) shape of the source frame.
        rows (int): Number of tile rows.
        cols (int): Number of tile columns.
        overlap (float): Fractional overlap added to each tile edge so vehicles
            straddling a boundary still appear whole in at least one tile.

    Returns:
        list[tuple]: (x1, y1, x2, y2) pixel regions, left-to-right, top-to-bottom.
    """
    h, w = frame_shape[:2]
    tile_w, tile_h = w / cols, h / rows
    pad_x, pad_y = int(tile_w * overlap), int(tile_h * overlap)

    tiles = []
    for r in range(rows):
        for c in range(cols):
            x1 = max(0, int(c * tile_w) - pad_x)
            y1 = max(0, int(r * tile_h) - pad_y)
            x2 = min(w, int((c + 1) * tile_w) + pad_x)
            y2 = min(h, int((r + 1) * tile_h) + pad_y)
            tiles.append((x1, y1, x2, y2))
    return tiles


def save_slots(slots: list[dict], path: str) -> None:
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path, "w") as f:
        json.dump(slots, f, indent=2)


def load_slots(path: str) -> list[dict]:
    if not os.path.exists(path):
        return []
    with open(path) as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError:
            return []

    if not isinstance(data, list):
        return []

    normalized = []
    for idx, item in enumerate(data):
        if not isinstance(item, dict):
            continue

        # Extract coordinates from points, polygon, or bbox
        points = item.get("points") or item.get("polygon") or item.get("bbox")
        if not points:
            continue

        # If it's a bounding box [x1, y1, x2, y2], convert it to a 4-point polygon
        if len(points) == 4 and not isinstance(points[0], list):
            x1, y1, x2, y2 = points
            points = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]]

        slot_id = item.get("id")
        if slot_id is None:
            slot_id = idx

        normalized.append({
            "id": int(slot_id),
            "polygon": points,
            "points": points  # provide both for backend-frontend compatibility
        })

    return normalized
