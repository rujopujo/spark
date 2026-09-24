# ParkSense

Counts occupied and free parking spaces from a single fixed camera, with no per-space sensors.

![ParkSense running on an overhead parking lot clip](assets/demo.gif)

## What it does

A parking lot is watched by one overhead camera. Each space is defined once as a polygon; from then on every frame is scored and the lot's occupancy is reported. There is no hardware in the ground, no per-space wiring, and no per-camera model training — moving the system to a new lot means drawing new polygons, not collecting a new dataset.

The detector is YOLOv8m fine-tuned for 13 epochs on over ten thousand hand-cleaned overhead parking images, which labels each space directly as `Empty` or `Occupied`. A stock COCO detector is a poor fit here: it learned cars in side profile, while an overhead camera only ever sees roofs.

## How it works

1. **Define the spaces.** `--discover-slots` extracts a reference frame and serves a local editor in the browser. You draw one polygon per space, drag vertices to fit, and save. The result is a JSON file of polygons, tied to that camera's viewpoint.
2. **Detect.** Each frame is run through the model, producing `Empty` / `Occupied` boxes.
3. **Assign to a space.** Each detection's centroid is tested against every polygon with `cv2.pointPolygonTest`. A space containing a non-empty detection is marked occupied.
4. **Steady the verdict.** The per-frame result is folded into a majority vote over the last few frames, so one missed detection does not flip a space and jitter the count.
5. **Render.** Spaces are filled red or green over the frame, with an occupied / free counter in the corner.

Two decisions worth calling out:

**Polygons, not a bounding-box grid.** An overhead camera sees spaces in perspective, so they are slanted quadrilaterals that change shape across the frame. Axis-aligned boxes cannot follow that without overlapping their neighbours, which then makes assignment ambiguous exactly where the lot is densest.

**Centroid-in-polygon, not IoU.** At this angle a car's bounding box spills into the spaces on either side, so an overlap threshold marks neighbours occupied too. Testing only the centroid gives each vehicle exactly one space, and the failure mode becomes a miss rather than a spreading false positive — which is the right trade when the output is a free-space count.

`--tiled` offers a second inference strategy: the frame is split into an overlapping grid, and the tiles are upscaled and batched into a single model call. A car covering few pixels in the full frame covers many in its tile, at roughly the cost of one full-frame pass.

## Setup

Python 3.12.

```bash
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

The weights are not in the repository. Download `parking_best_ep13.pt` from the [releases page](../../releases) and put it in `models/`.

You also need footage. Any fixed overhead view of a parking lot works; the [PKLot dataset](https://web.inf.ufpr.br/vri/databases/parking-lot-database/) is a convenient source of one. Put it at `videos/lot.mp4`, or point `video.source` in `config.yaml` somewhere else.

## Usage

Run on any video and save the annotated result:

```bash
python main.py --video path/to/lot.mp4 --save outputs/result.mp4 --no-display
```

Inspect a single frame:

```bash
python main.py --frame 0 --save outputs/frame0.jpg --no-display
```

Set up a new camera — draw the spaces once, then run against them:

```bash
python main.py --video path/to/lot.mp4 --discover-slots
```

This opens the editor at `http://127.0.0.1:5050`. Click to place vertices, drag a vertex to reshape a space, drag its body to move it, then save. Point `parking.slots_path` in `config.yaml` at the file it writes. `examples/slots_demo.json` shows the format — a list of `{id, points}`, 341 spaces for one lot.

Use the tiled inference path instead of a single full-frame pass:

```bash
python main.py --tiled --save outputs/result.mp4 --no-display
```

Everything tunable — model path, confidence, inference size, tile grid, editor port — lives in `config.yaml`. Common values are also exposed as flags; run `python main.py --help` for the full list.

## Tech stack

Python 3.12, YOLOv8m (Ultralytics), OpenCV, Flask, plain HTML/SVG for the editor.

## Improvements

This is a working system, not a finished product. It runs end to end and the parts below are where the remaining headroom is.

**The model.** This is the main lever. Thirteen epochs over ten thousand hand-cleaned overhead images is enough to make the approach work, not enough to close it out. Spaces that receive no detection at all are currently rendered as free, so more training data — more lots, more camera angles, more weather and more hours of the day — moves the count directly. The pipeline takes any Ultralytics checkpoint, so retraining means swapping `model.path` in `config.yaml`.

**Occlusion.** A van hides the space behind it and a tree shadows a whole row. Neither is solved by a better detector alone; carrying a space's recent state forward when it is temporarily unobservable would help.

**Fixed viewpoint.** Space polygons are tied to one camera position, so any pan, zoom or remount means redrawing them. Re-registering a new frame against the reference with a homography would let the polygons follow the camera.

**Latency.** Inference dominates, and the tiled path trades a larger effective resolution against a batch of crops. Exporting the model to ONNX or TensorRT, and tuning `imgsz` against the smallest space in view, is the path to running this on modest hardware.

A short majority-vote window over recent frames already steadies the counter against single-frame misses; the cost is that a genuine arrival takes a few frames to register. `parking.smoothing_window` controls it, and `1` turns it off.
