"""Occupancy pipeline that batch-infers a grid of frame tiles instead of the whole frame."""

import cv2
import time

from src.detector import VehicleDetector
from src.video import ensure_parent_dir, get_display_size, open_video
from src.slots import OccupancySmoother, classify_slots, load_slots, make_tiles
from src.overlay import draw_slots, draw_occupancy_stats
from src.logger import logger


def _detections_from_tiles(detector, frame, tiles, imgsz):
    """Run one batched inference over all tiles and remap boxes to frame coords.

    Each tile is detected independently; its boxes are shifted by the tile's
    top-left offset so they live in the original frame's coordinate space.
    """
    crops = [frame[y1:y2, x1:x2] for (x1, y1, x2, y2) in tiles]
    tile_results = detector.detect_batch(crops, imgsz=imgsz)

    detections = []
    for (x1, y1, _, _), dets in zip(tiles, tile_results):
        for det in dets:
            bx1, by1, bx2, by2 = det["bbox"]
            detections.append({
                **det,
                "bbox": [bx1 + x1, by1 + y1, bx2 + x1, by2 + y1],
            })
    return detections


def run_tiled(video_path: str, config: dict, save_path: str = None) -> None:
    """Split each frame into a grid of tiles, batch-infer them in one model
    call, remap the boxes to full-frame coordinates, then assign occupancy.

    Each tile is upscaled to the inference size on its own, so a car that
    covers few pixels in the full frame covers many in its tile. The batch is
    a handful of tiles rather than one patch per slot, which keeps the cost
    close to a single full-frame call.

    Args:
        video_path (str): Path to the input video.
        config (dict): Loaded configuration dictionary.
        save_path (str, optional): Path to save the annotated output video.
    """
    slots = load_slots(config["parking"].get("slots_path", ""))
    logger.info(f"Loaded {len(slots)} slots")
    if not slots:
        logger.error("No slots found — run --discover-slots first.")
        return

    detector = VehicleDetector(
        model_path=config["model"]["path"],
        confidence=config["model"]["confidence"],
        classes=config["model"]["classes"],
        imgsz=config["model"].get("imgsz", 640),
    )

    smoother = OccupancySmoother(config["parking"].get("smoothing_window", 5))

    tiling = config.get("tiling", {})
    rows = tiling.get("rows", 3)
    cols = tiling.get("cols", 3)
    overlap = tiling.get("overlap", 0.10)

    cap = open_video(video_path)
    w, h = get_display_size(config)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps_src = cap.get(cv2.CAP_PROP_FPS) or 30
    interval = config["video"].get("frame_interval", 1)
    max_frames = config["video"].get("max_frames", None)

    writer = None
    if save_path:
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out_fps = max(1.0, fps_src / interval)
        writer = cv2.VideoWriter(ensure_parent_dir(save_path), fourcc, out_fps, (w, h))
        logger.info(f"Saving to {save_path} at {out_fps:.1f} FPS")

    logger.info(f"frames: {total_frames} | interval: {interval} | "
                f"tiles: {rows}x{cols} (overlap {overlap})")

    tiles = None
    frame_idx = 0
    start = time.time()
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % interval == 0:
                # Tile layout depends only on frame size — compute once
                if tiles is None:
                    tiles = make_tiles(frame.shape, rows, cols, overlap)
                    logger.info(f"{len(tiles)} tiles, ~{len(slots) // len(tiles)} slots each")

                detections = _detections_from_tiles(detector, frame, tiles,
                                                    config["model"].get("imgsz", 640))
                occupied_ids = smoother.update(classify_slots(slots, detections))

                draw_slots(frame, slots, occupied_ids)
                draw_occupancy_stats(frame, frame_idx, total_frames,
                                     len(occupied_ids), len(slots))
                frame = cv2.resize(frame, (w, h))
                if writer:
                    writer.write(frame)
                logger.info(f"Frame {frame_idx}: {len(occupied_ids)} occupied / "
                            f"{len(slots) - len(occupied_ids)} free")

            if max_frames and frame_idx >= max_frames - 1:
                break
            frame_idx += 1
    finally:
        elapsed = time.time() - start
        cap.release()
        if writer:
            writer.release()
            logger.info(f"Saved: {save_path}")
        logger.info(f"Done. {frame_idx} frames in {elapsed:.1f}s")
