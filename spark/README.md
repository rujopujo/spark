# SPARK — Standalone Vision & Slot Configuration Engine

Counts occupied and free parking spaces from a single fixed camera, with zero per-space hardware sensors.

![SPARK running on an overhead parking lot clip](assets/demo.gif)

## What it does

A parking lot is watched by an overhead camera. Each space is defined once as a spatial polygon; from then on, every frame is scored and the lot's occupancy is reported in real-time. There is no hardware in the ground, no per-space wiring, and no per-camera model training — moving the system to a new lot means configuring polygons, not collecting a new dataset.

The detector leverages YOLOv8 fine-tuned for overhead parking imagery, which labels each space directly as `Empty` or `Occupied`.

## How it works

1. **Define the spaces.** `--discover-slots` extracts a reference frame and serves a local editor in the browser. You draw one polygon per space, drag vertices to fit, and save. The result is a JSON file of polygons, tied to that camera's viewpoint.
2. **Detect.** Each frame is run through the model, producing `Empty` / `Occupied` boxes.
3. **Assign to a space.** Each detection's centroid is tested against every polygon with `cv2.pointPolygonTest`. A space containing a non-empty detection is marked occupied.
4. **Steady the verdict.** The per-frame result is folded into a majority vote over recent frames, so temporary visual occlusions do not jitter the count.
5. **Render.** Spaces are filled over the frame, with an occupied / free counter in the HUD corner.

Two architectural choices:

- **Polygons, not a bounding-box grid.** An overhead camera sees spaces in perspective, so they are slanted quadrilaterals that change shape across the frame. Axis-aligned boxes cannot follow perspective without overlapping adjacent spaces.
- **Centroid-in-polygon assignment.** Testing the centroid assigns each vehicle to its primary stall, preventing spreading false positives when a vehicle bounding box spills into neighbouring stalls.

`--tiled` offers a tiled inference strategy: the frame is split into an overlapping grid, and the tiles are upscaled and batched into a single model pass.

## Setup

Python 3.10+:

```bash
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Place model weights in `models/` or configure the path in `config.yaml`.

## Usage

Run on any video and save the annotated result:

```bash
python main.py --video path/to/lot.mp4 --save outputs/result.mp4 --no-display
```

Inspect a single frame:

```bash
python main.py --frame 0 --save outputs/frame0.jpg --no-display
```

Configure bays with the interactive browser slot editor:

```bash
python main.py --video path/to/lot.mp4 --discover-slots
```

This opens the editor at `http://127.0.0.1:5050`. Click to place vertices, drag a vertex to reshape a space, and save.

Use tiled inference:

```bash
python main.py --tiled --save outputs/result.mp4 --no-display
```

All parameters — model path, confidence, inference size, tile grid, editor port — live in `config.yaml`. Run `python main.py --help` for the complete CLI reference.

## Tech Stack

Python 3.12+, YOLOv8 (Ultralytics), OpenCV, Flask, HTML5/SVG Slot Editor.
