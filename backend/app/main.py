import asyncio
import sys
import os
from contextlib import asynccontextmanager
from typing import Optional
from pydantic import BaseModel
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form, HTTPException, Response
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware

# Ensure app package is importable
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

try:
    from app.cv_worker import (
        start_cv_worker,
        get_current_parking_state,
        get_video_frame_generator,
        get_latest_frame_bytes,
        get_video_file_path,
        get_video_sources_info,
        set_video_source,
        set_detection_params,
        get_slots_config,
        set_slots_config,
        get_slot_presets,
        apply_slot_preset,
        set_video_playback_controls
    )
except ImportError:
    from cv_worker import (
        start_cv_worker,
        get_current_parking_state,
        get_video_frame_generator,
        get_latest_frame_bytes,
        get_video_file_path,
        get_video_sources_info,
        set_video_source,
        set_detection_params,
        get_slots_config,
        set_slots_config,
        get_slot_presets,
        apply_slot_preset,
        set_video_playback_controls
    )

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

async def broadcast_parking_state():
    while True:
        state = get_current_parking_state()
        if manager.active_connections:
            await manager.broadcast(state)
        await asyncio.sleep(0.5)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start CV background daemon thread and broadcast loop
    start_cv_worker()
    broadcast_task = asyncio.create_task(broadcast_parking_state())
    yield
    # Shutdown
    broadcast_task.cancel()

app = FastAPI(title="Smart Parking Tracker API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Retain backward compatible startup event as per PDF spec
@app.on_event("startup")
async def startup_event():
    # cv_worker and broadcast task handled in lifespan, safe fallback
    pass

@app.websocket("/ws/live-parking")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    # Immediately send the current state upon connection
    initial_state = get_current_parking_state()
    if initial_state.get("total_slots", 0) > 0:
        await websocket.send_json(initial_state)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

@app.get("/api/live-stream")
async def live_stream():
    """Streams MJPEG frames annotated with YOLOv8 bounding boxes and parking bay IoU status."""
    return StreamingResponse(
        get_video_frame_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )

@app.get("/api/live-frame")
async def live_frame():
    """Returns single latest annotated JPEG frame instantly."""
    frame_bytes = get_latest_frame_bytes()
    if frame_bytes is None:
        raise HTTPException(status_code=503, detail="Frame not ready yet")
    return Response(
        content=frame_bytes,
        media_type="image/jpeg",
        headers={"Cache-Control": "no-cache, no-store, must-revalidate"}
    )

@app.get("/api/video-file/{source_id}")
async def get_raw_video_file(source_id: str):
    """Serves the raw MP4 video file with HTTP byte-range streaming for smooth HTML5 video playback."""
    file_path = get_video_file_path(source_id)
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Video file for '{source_id}' not found.")
    return FileResponse(
        path=file_path,
        media_type="video/mp4",
        filename=os.path.basename(file_path)
    )

@app.get("/api/video-sources")
async def get_video_sources():
    """Returns available camera/video sources and current detection parameters."""
    return get_video_sources_info()

class SetSourcePayload(BaseModel):
    source_id: str
    custom_url: Optional[str] = None

@app.post("/api/set-video-source")
async def update_video_source(payload: SetSourcePayload):
    """Hot-swaps the active video input (real traffic, aerial, demo, webcam, upload, or URL)."""
    ok, msg = set_video_source(payload.source_id, payload.custom_url)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {"success": True, "message": msg, "info": get_video_sources_info()}

@app.post("/api/upload-video")
async def upload_custom_video(file: UploadFile = File(...)):
    """Uploads a user parking lot video and immediately switches the CV worker to process it."""
    if not file.filename.lower().endswith((".mp4", ".avi", ".mov", ".mkv", ".webm")):
        raise HTTPException(status_code=400, detail="Only video files (.mp4, .avi, .mov, .mkv, .webm) are supported.")

    data_dir = os.path.join(parent_dir, "data")
    os.makedirs(data_dir, exist_ok=True)
    dest_path = os.path.join(data_dir, "uploaded_video.mp4")

    contents = await file.read()
    with open(dest_path, "wb") as f:
        f.write(contents)

    set_video_source("upload")
    return {
        "success": True,
        "filename": file.filename,
        "size_bytes": len(contents),
        "message": f"Successfully loaded uploaded video '{file.filename}' into SPARK CV Worker."
    }

class DetectionParamsPayload(BaseModel):
    confidence: Optional[float] = None
    iou: Optional[float] = None
    bboxes: Optional[bool] = None
    polygons: Optional[bool] = None

@app.post("/api/detection-params")
async def update_detection_params(payload: DetectionParamsPayload):
    """Adjusts YOLOv8 confidence, IoU occupancy threshold, and overlay toggles in real-time."""
    set_detection_params(
        confidence=payload.confidence,
        iou=payload.iou,
        bboxes=payload.bboxes,
        polygons=payload.polygons
    )
    return {"success": True, "info": get_video_sources_info()}

class SlotsConfigPayload(BaseModel):
    slots: list[dict]
    preset_id: Optional[str] = "custom"

class VideoControlPayload(BaseModel):
    speed: Optional[float] = None
    seek_pct: Optional[float] = None
    restart: Optional[bool] = False

@app.get("/api/slots-config")
async def get_slots():
    """Returns currently calibrated parking slot polygons."""
    return get_slots_config()

@app.post("/api/slots-config")
async def update_slots(payload: SlotsConfigPayload):
    """Saves custom-calibrated parking slot polygons from the in-browser canvas editor."""
    ok, msg = set_slots_config(payload.slots, payload.preset_id or "custom")
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {"success": True, "message": msg, "config": get_slots_config()}

@app.get("/api/slot-presets")
async def get_presets():
    """Returns library of perspective-calibrated slot presets."""
    return get_slot_presets()

@app.post("/api/slot-presets/{preset_id}")
async def load_preset(preset_id: str):
    """Applies a pre-calibrated slot polygon layout (e.g. curbside_traffic, aerial_lot, webcam_desk)."""
    ok, msg = apply_slot_preset(preset_id)
    if not ok:
        raise HTTPException(status_code=404, detail=msg)
    return {"success": True, "message": msg, "config": get_slots_config()}

@app.post("/api/video-control")
async def video_control(payload: VideoControlPayload):
    """Controls video playback speed, seeking, and playback restart."""
    res = set_video_playback_controls(
        speed=payload.speed,
        seek_pct=payload.seek_pct,
        restart=bool(payload.restart)
    )
    return res

@app.get("/api/status")
async def get_status():
    return {"status": "online", "service": "SPARK Edge-AI Vision Gateway"}

@app.get("/api/parking-state")
async def get_state():
    return get_current_parking_state()

@app.get("/")
async def root():
    return {
        "title": "SPARK — Smart Automated Parking Lot Occupancy Tracker API",
        "status": "online",
        "team": {
            "Ruhaan Joshi": "Backend FastAPI Architecture & YOLOv8 Vision Pipeline (24101C0057)",
            "Rudra Jain": "React Frontend, Vercel Deployment & WebSocket Dashboard (24101C0062)",
            "Aarush Nalavade": "QA Execution & System Testing (24101C0073)",
            "Shamita Chavan": "IEEE SRS Documentation & Process Modeling (24101C0066)"
        },
        "endpoints": {
            "status": "/api/status",
            "parking_state": "/api/parking-state",
            "live_stream": "/api/live-stream",
            "video_sources": "/api/video-sources",
            "set_video_source": "/api/set-video-source",
            "upload_video": "/api/upload-video",
            "detection_params": "/api/detection-params",
            "slots_config": "/api/slots-config",
            "slot_presets": "/api/slot-presets",
            "video_control": "/api/video-control",
            "websocket": "/ws/live-parking"
        }
    }


