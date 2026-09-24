import React, { useState, useEffect, useRef } from "react";
import {
  Video,
  Camera,
  Layers,
  Sliders,
  Upload,
  RefreshCw,
  Maximize2,
  Minimize2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Radio,
  Download,
  Link as LinkIcon,
  Play,
  Pause,
  Sparkles,
  RotateCcw,
  FastForward,
  Clock,
  Compass,
  Gauge,
  ArrowUpRight,
  ShieldAlert,
  Film,
  MonitorPlay
} from "lucide-react";
import PolygonCalibrator from "./PolygonCalibrator";

export default function LiveCameraFeed({ parkingState, onLog, isCommandCenterView, onToggleCommandCenter }) {
  const [activeSource, setActiveSource] = useState("aerial_lot");
  const [sourcesList, setSourcesList] = useState([]);
  const [confidence, setConfidence] = useState(0.30);
  const [iouThresh, setIouThresh] = useState(0.40);
  const [showBBoxes, setShowBBoxes] = useState(true);
  const [showPolygons, setShowPolygons] = useState(true);
  const [showAnimatic, setShowAnimatic] = useState(true);
  const [motionFilter, setMotionFilter] = useState("all"); // "all" | "moving" | "stationary"
  const [isPaused, setIsPaused] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [isFeedFullscreen, setIsFeedFullscreen] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const [streamTimestamp, setStreamTimestamp] = useState(Date.now());
  const [tabMode, setTabMode] = useState("sources"); // "sources", "motion", "tuning", "dwell", "upload", "url"
  const [showCalibrator, setShowCalibrator] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  // Three rendering engines: "ai_vision" (MJPEG), "hd_video" (HTML5 Video), "canvas" (Canvas Live Frame)
  const [displayMode, setDisplayMode] = useState("ai_vision");

  const videoContainerRef = useRef(null);
  const nativeVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const canvasIntervalRef = useRef(null);

  useEffect(() => {
    fetchSources();
  }, []);

  // Canvas rendering loop when displayMode === "canvas"
  useEffect(() => {
    if (displayMode === "canvas") {
      let isMounted = true;
      const img = new Image();

      const fetchNextFrame = () => {
        if (!isMounted) return;
        img.src = `http://localhost:8000/api/live-frame?t=${Date.now()}`;
        img.onload = () => {
          if (!isMounted || !canvasRef.current) return;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");
          canvas.width = img.width || 1280;
          canvas.height = img.height || 720;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvasIntervalRef.current = setTimeout(fetchNextFrame, 45);
        };
        img.onerror = () => {
          if (!isMounted) return;
          canvasIntervalRef.current = setTimeout(fetchNextFrame, 200);
        };
      };

      fetchNextFrame();

      return () => {
        isMounted = false;
        if (canvasIntervalRef.current) clearTimeout(canvasIntervalRef.current);
      };
    }
  }, [displayMode, streamTimestamp]);

  const fetchSources = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/video-sources");
      if (res.ok) {
        const data = await res.json();
        setSourcesList(data.sources || []);
        setActiveSource(data.active_source || "real_traffic");
        if (data.confidence_threshold !== undefined) setConfidence(data.confidence_threshold);
        if (data.iou_threshold !== undefined) setIouThresh(data.iou_threshold);
        if (data.show_bboxes !== undefined) setShowBBoxes(data.show_bboxes);
        if (data.show_polygons !== undefined) setShowPolygons(data.show_polygons);
        if (data.playback_speed !== undefined) setPlaybackSpeed(data.playback_speed);
        setStreamError(false);
      }
    } catch (e) {
      console.warn("Could not reach /api/video-sources:", e);
    }
  };

  const handleSwitchSource = async (sourceId, url = null) => {
    try {
      setActiveSource(sourceId);
      setStreamError(false);
      const res = await fetch("http://localhost:8000/api/set-video-source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_id: sourceId, custom_url: url })
      });
      if (res.ok) {
        const data = await res.json();
        setSourcesList(data.info.sources);
        setStreamTimestamp(Date.now());
        if (onLog) onLog("system", `Switched video source to: ${sourceId.toUpperCase()}`);
      }
    } catch (e) {
      console.error("Failed to switch source:", e);
    }
  };

  const handleUpdateDetectionParams = async (newConf, newIou, newBBoxes, newPolygons) => {
    const c = newConf !== undefined ? newConf : confidence;
    const i = newIou !== undefined ? newIou : iouThresh;
    const b = newBBoxes !== undefined ? newBBoxes : showBBoxes;
    const p = newPolygons !== undefined ? newPolygons : showPolygons;

    setConfidence(c);
    setIouThresh(i);
    setShowBBoxes(b);
    setShowPolygons(p);

    try {
      await fetch("http://localhost:8000/api/detection-params", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confidence: c,
          iou: i,
          bboxes: b,
          polygons: p
        })
      });
    } catch (e) {
      console.error("Failed to update detection params:", e);
    }
  };

  const handlePlaybackSpeed = async (speed) => {
    setPlaybackSpeed(speed);
    if (nativeVideoRef.current) {
      nativeVideoRef.current.playbackRate = speed;
    }
    try {
      await fetch("http://localhost:8000/api/video-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speed })
      });
      if (onLog) onLog("system", `Adjusted video playback speed to ${speed}x`);
    } catch (e) {
      console.error("Failed to update speed:", e);
    }
  };

  const handleRestartVideo = async () => {
    if (nativeVideoRef.current) {
      nativeVideoRef.current.currentTime = 0;
      nativeVideoRef.current.play().catch(() => {});
    }
    try {
      await fetch("http://localhost:8000/api/video-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restart: true })
      });
      if (onLog) onLog("system", "Restarted video playback from frame 0.");
    } catch (e) {
      console.error("Failed to restart video:", e);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(`Uploading ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)...`);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/api/upload-video", {
        method: "POST",
        body: formData
      });

      if (res.ok) {
        setUploadProgress(`Loaded! Initializing YOLOv8 on ${file.name}...`);
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress("");
          setActiveSource("upload");
          setStreamTimestamp(Date.now());
          fetchSources();
          if (onLog) onLog("system", `Custom parking lot video uploaded: ${file.name}`);
        }, 1200);
      } else {
        const err = await res.json();
        setUploadProgress(`Error: ${err.detail || "Upload failed"}`);
        setIsUploading(false);
      }
    } catch (err) {
      setUploadProgress(`Network error: ${err.message}`);
      setIsUploading(false);
    }
  };

  const handleDownloadSnapshot = () => {
    const streamUrl = `http://localhost:8000/api/live-frame?t=${Date.now()}`;
    const a = document.createElement("a");
    a.href = streamUrl;
    a.download = `spark-camera-snapshot-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (onLog) onLog("system", "Saved live camera frame snapshot to downloads.");
  };

  const toggleFeedFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch(() => {});
      setIsFeedFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFeedFullscreen(false);
      }
    }
  };

  const currentFps = parkingState?.fps || 0;
  const currentLatency = parkingState?.latency_ms || 0;
  const vehicleCount = parkingState?.detected_vehicles_count || 0;
  const occupiedSlots = parkingState?.occupied_slots || 0;
  const enteringSlots = parkingState?.entering_slots || 0;
  const totalSlots = parkingState?.total_slots || 16;
  const availableSlots = parkingState?.available_slots || (totalSlots - occupiedSlots);
  const trackedVehicles = parkingState?.tracked_vehicles || [];
  const motionSummary = parkingState?.motion_summary || { moving: 0, maneuvering: 0, stationary: 0, total: 0 };
  const movingCount = (motionSummary.moving || 0) + (motionSummary.maneuvering || 0);
  const stationaryCount = motionSummary.stationary || 0;

  // Active parked or maneuvering vehicles list
  const activeDetections = (parkingState?.slots || []).filter(
    (s) => s.status === "OCCUPIED" || s.status === "ENTERING"
  );

  return (
    <section className="cssda-glass rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm transition-all">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-indigo-700 font-bold mb-1">
            <span className="p-1 rounded-md bg-indigo-100 text-indigo-700 border border-indigo-200">
              <Camera className="w-3.5 h-3.5" />
            </span>
            <span>AUTONOMOUS SURVEILLANCE PIPELINE</span>
            <span className="text-slate-300">//</span>
            <span className="text-slate-500 font-medium">YOLOv8 Edge Vision + Spatial Polygon IoU</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold font-display text-slate-900 tracking-tight">
            Live Camera Surveillance & Real Vehicle Detector
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Real surveillance feeds with moving cars, buses, and trucks. Calibrate bays, track dwell times, or upload custom footage.
          </p>
        </div>

        {/* Live Metrics & Calibration Launcher */}
        <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
          {/* Calibrate Bays Button */}
          <button
            onClick={() => setShowCalibrator(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-xs"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Calibrate Bay Polygons</span>
          </button>

          {/* Dual View Toggle */}
          {onToggleCommandCenter && (
            <button
              onClick={onToggleCommandCenter}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                isCommandCenterView
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{isCommandCenterView ? "Exit Command Center" : "Dual-View Split"}</span>
            </button>
          )}

          <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-2xs font-semibold">
            FPS: <span className="font-bold text-indigo-600">{currentFps}</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-2xs font-semibold">
            LATENCY: <span className="font-bold text-sky-600">{currentLatency}ms</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Live Video Stream (8 cols) + Controls & Fleet Inspector (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Video Canvas */}
        <div className="lg:col-span-8 flex flex-col space-y-3">
          {/* Display Engine Mode Switcher Bar */}
          <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-slate-100/90 border border-slate-200/90 text-xs font-mono font-bold">
            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold px-1">
              <span>Display Mode:</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setDisplayMode("ai_vision");
                  setStreamError(false);
                  setStreamTimestamp(Date.now());
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl transition-all ${
                  displayMode === "ai_vision"
                    ? "bg-indigo-600 text-white shadow-2xs font-bold"
                    : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
                }`}
              >
                <MonitorPlay className="w-3.5 h-3.5" />
                <span>AI Vision Stream</span>
              </button>

              <button
                onClick={() => {
                  setDisplayMode("hd_video");
                  setStreamTimestamp(Date.now());
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl transition-all ${
                  displayMode === "hd_video"
                    ? "bg-indigo-600 text-white shadow-2xs font-bold"
                    : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Native HD Video</span>
              </button>

              <button
                onClick={() => {
                  setDisplayMode("canvas");
                  setStreamTimestamp(Date.now());
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl transition-all ${
                  displayMode === "canvas"
                    ? "bg-indigo-600 text-white shadow-2xs font-bold"
                    : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Canvas Mode</span>
              </button>
            </div>
          </div>

          <div
            ref={videoContainerRef}
            className="relative w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-300 shadow-md aspect-video group select-none"
          >
            {/* ENGINE 1: Live MJPEG Stream */}
            {displayMode === "ai_vision" && (
              !streamError ? (
                <img
                  src={isPaused ? undefined : `http://localhost:8000/api/live-stream?t=${streamTimestamp}`}
                  alt="SPARK Live YOLOv8 Camera Feed"
                  className="w-full h-full object-contain bg-slate-950"
                  onError={() => setStreamError(true)}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center space-y-3">
                  <AlertCircle className="w-10 h-10 text-amber-500 animate-bounce" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-200 font-display">
                      Connecting to Camera Stream...
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm">
                      You can also switch to <strong>Native HD Video</strong> or <strong>Canvas Mode</strong> above.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setStreamError(false);
                        setStreamTimestamp(Date.now());
                      }}
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-mono font-bold hover:bg-indigo-700 transition shadow-sm"
                    >
                      <RefreshCw className="w-3.5 h-3.5 inline mr-1.5" /> Reconnect
                    </button>
                    <button
                      onClick={() => setDisplayMode("hd_video")}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-mono font-bold hover:bg-slate-700 transition shadow-sm"
                    >
                      Switch to HD Video
                    </button>
                  </div>
                </div>
              )
            )}

            {/* ENGINE 2: Native HTML5 Video Player with Live SVG Overlays */}
            {displayMode === "hd_video" && (
              <div className="relative w-full h-full">
                <video
                  ref={nativeVideoRef}
                  key={`${activeSource}-${streamTimestamp}`}
                  src={`http://localhost:8000/api/video-file/${activeSource}`}
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls
                  className="w-full h-full object-contain bg-slate-950"
                  onPlay={() => setIsPaused(false)}
                  onPause={() => setIsPaused(true)}
                />

                {/* SVG AR Polygon & Bounding Box Overlays over the Native Video */}
                {showPolygons && (
                  <svg
                    viewBox="0 0 1280 720"
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  >
                    {(parkingState?.slots || []).map((slot) => {
                      if (!slot.polygon || slot.polygon.length < 3) return null;
                      const isOccupied = slot.status === "OCCUPIED";
                      const isEntering = slot.status === "ENTERING";
                      const ptsString = slot.polygon.map((p) => p.join(",")).join(" ");

                      let strokeColor = "#0284c7";
                      let fillColor = "rgba(2, 132, 199, 0.18)";
                      if (isOccupied) {
                        strokeColor = "#f97316";
                        fillColor = "rgba(249, 115, 22, 0.35)";
                      } else if (isEntering) {
                        strokeColor = "#f59e0b";
                        fillColor = "rgba(245, 158, 11, 0.28)";
                      }

                      return (
                        <g key={slot.id}>
                          <polygon
                            points={ptsString}
                            fill={fillColor}
                            stroke={strokeColor}
                            strokeWidth="2"
                          />
                          <text
                            x={slot.polygon[0][0] + 5}
                            y={Math.max(25, slot.polygon[0][1] - 8)}
                            fill="#ffffff"
                            fontSize="13"
                            fontFamily="monospace"
                            fontWeight="bold"
                            filter="drop-shadow(0px 1px 3px rgba(0,0,0,0.9))"
                          >
                            {slot.label} [{slot.status?.slice(0, 3)}]
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                )}
              </div>
            )}

            {/* ENGINE 3: Fast Frame Canvas Mode */}
            {displayMode === "canvas" && (
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain bg-slate-950"
              />
            )}

            {/* Top Video Telemetry Badge Overlay */}
            <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-white font-mono text-[11px] font-bold border border-white/20 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>SPARK // YOLOv8n</span>
              </span>

              <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-indigo-200 font-mono text-[11px] border border-white/10">
                {activeSource === "aerial_lot" && "Aerial Drone Surveillance (2.5 Min 4K)"}
                {activeSource === "real_traffic" && "Curbside Traffic Camera"}
                {activeSource === "real_aerial" && "Overhead Lot Perspective"}
                {activeSource === "demo" && "Demo Synthetic Feed"}
                {activeSource === "webcam" && "Webcam 0"}
                {activeSource === "upload" && "Custom Upload"}
                {activeSource === "url" && "Network Stream"}
              </span>

              <span className="px-2 py-0.5 rounded-lg bg-indigo-900/80 text-indigo-200 font-mono text-[10px] border border-indigo-400/30">
                {playbackSpeed}x SPEED
              </span>
            </div>

            {/* Bottom Right Floating Video Controls */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
              {/* Restart Video */}
              <button
                onClick={handleRestartVideo}
                className="p-2 rounded-xl bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 transition shadow-xs text-xs font-mono"
                title="Restart Video from Start"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Snapshot Button */}
              <button
                onClick={handleDownloadSnapshot}
                className="p-2 rounded-xl bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 transition shadow-xs text-xs font-mono"
                title="Download Snapshot"
              >
                <Download className="w-4 h-4" />
              </button>

              {/* Pause / Resume Button */}
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="p-2 rounded-xl bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 transition shadow-xs text-xs font-mono"
                title={isPaused ? "Resume Live Feed" : "Freeze Frame"}
              >
                {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4" />}
              </button>

              {/* Fullscreen Button */}
              <button
                onClick={toggleFeedFullscreen}
                className="p-2 rounded-xl bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 transition shadow-xs text-xs font-mono"
                title="Toggle Fullscreen"
              >
                {isFeedFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>

            {/* Paused State Overlay */}
            {isPaused && displayMode !== "hd_video" && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center pointer-events-none">
                <div className="px-4 py-2 rounded-2xl bg-black/80 text-white font-mono text-xs font-bold border border-white/25 flex items-center gap-2">
                  <Pause className="w-4 h-4 text-amber-400" />
                  <span>FRAME FROZEN (INSPECTION MODE)</span>
                </div>
              </div>
            )}
          </div>

          {/* Under-Video Quick Stats Ribbon with Multi-Tier Statuses */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-slate-100/90 border border-slate-200/90 text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-500 inline-block"></span>
                <span>Vacant ({availableSlots})</span>
              </span>

              <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block"></span>
                <span>Entering ({enteringSlots})</span>
              </span>

              <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block"></span>
                <span>Parked ({occupiedSlots})</span>
              </span>
            </div>

            {/* Playback Speed Pill Bar */}
            <div className="flex items-center gap-1">
              <span className="text-slate-500 text-[10px] mr-1">Speed:</span>
              {[0.5, 1.0, 1.5, 2.0].map((s) => (
                <button
                  key={s}
                  onClick={() => handlePlaybackSpeed(s)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                    playbackSpeed === s
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Feeds, CV Tuning, Upload, URL & Dwell Analytics Tabs */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          {/* Subtabs Navigation */}
          <div className="flex p-1 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-mono font-bold">
            <button
              onClick={() => setTabMode("sources")}
              className={`flex-1 py-1.5 px-2 rounded-xl transition-all ${
                tabMode === "sources"
                  ? "bg-white text-indigo-700 shadow-2xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Feeds
            </button>
            <button
              onClick={() => setTabMode("motion")}
              className={`flex-1 py-1.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1 ${
                tabMode === "motion"
                  ? "bg-white text-cyan-700 shadow-2xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${movingCount > 0 ? "bg-cyan-500 animate-pulse" : "bg-slate-400"}`}></span>
              <span>Motion ({trackedVehicles.length || vehicleCount})</span>
            </button>
            <button
              onClick={() => setTabMode("tuning")}
              className={`flex-1 py-1.5 px-2 rounded-xl transition-all ${
                tabMode === "tuning"
                  ? "bg-white text-indigo-700 shadow-2xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tuning
            </button>
            <button
              onClick={() => setTabMode("dwell")}
              className={`flex-1 py-1.5 px-2 rounded-xl transition-all ${
                tabMode === "dwell"
                  ? "bg-white text-indigo-700 shadow-2xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Dwell ({occupiedSlots})
            </button>
            <button
              onClick={() => setTabMode("upload")}
              className={`flex-1 py-1.5 px-2 rounded-xl transition-all ${
                tabMode === "upload"
                  ? "bg-white text-indigo-700 shadow-2xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Upload
            </button>
            <button
              onClick={() => setTabMode("url")}
              className={`flex-1 py-1.5 px-2 rounded-xl transition-all ${
                tabMode === "url"
                  ? "bg-white text-indigo-700 shadow-2xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              URL
            </button>
          </div>

          {/* TAB 1: Video Sources List */}
          {tabMode === "sources" && (
            <div className="space-y-2.5">
              <div className="text-[11px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                Select Camera Source
              </div>

              {[
                {
                  id: "aerial_lot",
                  title: "Aerial Parking Lot Drone Feed",
                  desc: "2.5-min bird's-eye 4K lot view with active vehicle tracking & motion ribbons (1280x720)",
                  badge: "2.5 MIN DRONE (RECOMMENDED)",
                  icon: Camera
                },
                {
                  id: "real_traffic",
                  title: "Curbside Traffic Camera",
                  desc: "Moving vehicles with curbside bay detection (1280x720)",
                  badge: "STREET CAM",
                  icon: Video
                },
                {
                  id: "real_aerial",
                  title: "Overhead Lot Perspective",
                  desc: "Angled high perspective with pre-calibrated stalls (1100x720)",
                  badge: "ANGLED LOT",
                  icon: Layers
                },
                {
                  id: "webcam",
                  title: "Local USB Webcam (Index 0)",
                  desc: "Live camera hardware for testing toy cars or desk scenarios",
                  badge: "LIVE HARDWARE",
                  icon: Radio
                },
                {
                  id: "demo",
                  title: "Demo Synthetic Lot",
                  desc: "Standard 20-bay calibration test loop",
                  badge: "SYNTHETIC",
                  icon: Sliders
                }
              ].map((src) => {
                const isActive = activeSource === src.id;
                const IconComponent = src.icon;
                return (
                  <button
                    key={src.id}
                    onClick={() => handleSwitchSource(src.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                      isActive
                        ? "bg-indigo-50/90 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs"
                        : "bg-white hover:bg-slate-50 border-slate-200 shadow-2xs"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`text-xs font-bold font-display ${isActive ? "text-indigo-950" : "text-slate-900"}`}>
                          {src.title}
                        </span>
                        <span
                          className={`text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded-md ${
                            isActive
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {src.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        {src.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB: Active Fleet Motion Radar Inspector */}
          {tabMode === "motion" && (
            <div className="space-y-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs font-mono">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
                    Active Fleet Motion Radar
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Real-time position, speed (km/h) & trajectory
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800 font-bold">
                    {movingCount} MOVING
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">
                    {stationaryCount} PARKED
                  </span>
                </div>
              </div>

              {/* Filter pills */}
              <div className="flex gap-1.5 text-[10px]">
                <button
                  onClick={() => setMotionFilter("all")}
                  className={`px-2 py-0.5 rounded-lg font-bold border transition ${
                    motionFilter === "all" ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                >
                  All ({trackedVehicles.length})
                </button>
                <button
                  onClick={() => setMotionFilter("moving")}
                  className={`px-2 py-0.5 rounded-lg font-bold border transition ${
                    motionFilter === "moving" ? "bg-cyan-600 text-white border-cyan-600" : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                >
                  In Motion ({movingCount})
                </button>
                <button
                  onClick={() => setMotionFilter("stationary")}
                  className={`px-2 py-0.5 rounded-lg font-bold border transition ${
                    motionFilter === "stationary" ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                >
                  Parked ({stationaryCount})
                </button>
              </div>

              {/* Vehicle list */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {trackedVehicles.length > 0 ? (
                  trackedVehicles
                    .filter((v) => {
                      if (motionFilter === "moving") return v.motion_state === "IN_MOTION" || v.motion_state === "MANEUVERING";
                      if (motionFilter === "stationary") return v.motion_state === "STATIONARY";
                      return true;
                    })
                    .map((veh) => {
                      const isMoving = veh.motion_state === "IN_MOTION";
                      const isManeuver = veh.motion_state === "MANEUVERING";

                      return (
                        <div
                          key={veh.id}
                          className={`p-2.5 rounded-xl border text-xs transition-all ${
                            isMoving
                              ? "bg-cyan-50/60 border-cyan-200 text-cyan-950"
                              : isManeuver
                              ? "bg-amber-50/60 border-amber-200 text-amber-950"
                              : "bg-slate-50/80 border-slate-200 text-slate-900"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5 font-bold">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isMoving ? "bg-cyan-500 animate-ping" : isManeuver ? "bg-amber-500 animate-pulse" : "bg-indigo-600"
                                }`}
                              ></span>
                              <span className="text-slate-900 font-bold">{veh.id}</span>
                              <span className="text-[10px] text-slate-500 font-sans">{veh.name}</span>
                            </div>
                            <span
                              className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                                isMoving
                                  ? "bg-cyan-600 text-white"
                                  : isManeuver
                                  ? "bg-amber-500 text-white"
                                  : "bg-indigo-100 text-indigo-800 border border-indigo-200"
                              }`}
                            >
                              {isMoving ? "IN MOTION" : isManeuver ? "MANEUVERING" : "PARKED"}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-[10px] bg-white/80 p-1.5 rounded-lg border border-slate-100">
                            <div>
                              <span className="text-slate-400 block text-[9px] uppercase">Speed</span>
                              <span className={`font-bold ${isMoving ? "text-cyan-700" : "text-slate-700"}`}>
                                {veh.speed_kmh} km/h
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[9px] uppercase">Heading</span>
                              <span className="font-bold text-slate-700">{veh.heading}°</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[9px] uppercase">Location</span>
                              <span className="font-bold text-indigo-700 truncate block">
                                {veh.assigned_slot ? `Bay ${veh.assigned_slot}` : "Transit Lane"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No active vehicles tracked in current frame.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Computer Vision Tuning Sliders */}
          {tabMode === "tuning" && (
            <div className="space-y-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                YOLOv8 & Spatial IoU Cutoffs
              </div>

              {/* Confidence Threshold */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-700 font-semibold">Confidence Threshold</span>
                  <span className="font-bold text-indigo-600">{Math.round(confidence * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.85"
                  step="0.05"
                  value={confidence}
                  onChange={(e) => handleUpdateDetectionParams(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <p className="text-[10px] text-slate-500">
                  Minimum probability score for YOLO to classify a vehicle.
                </p>
              </div>

              {/* IoU Threshold */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-700 font-semibold">IoU Occupancy Cutoff</span>
                  <span className="font-bold text-sky-600">{Math.round(iouThresh * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.15"
                  max="0.75"
                  step="0.05"
                  value={iouThresh}
                  onChange={(e) => handleUpdateDetectionParams(undefined, parseFloat(e.target.value))}
                  className="w-full accent-sky-600 cursor-pointer"
                />
                <p className="text-[10px] text-slate-500">
                  Spatial intersection ratio required to declare a bay occupied.
                </p>
              </div>

              {/* Overlay Toggles */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs font-mono">
                  <span className="flex items-center gap-2 text-slate-700 font-medium">
                    {showBBoxes ? <Eye className="w-3.5 h-3.5 text-indigo-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                    Vehicle Bounding Boxes
                  </span>
                  <input
                    type="checkbox"
                    checked={showBBoxes}
                    onChange={(e) => handleUpdateDetectionParams(undefined, undefined, e.target.checked)}
                    className="accent-indigo-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs font-mono">
                  <span className="flex items-center gap-2 text-slate-700 font-medium">
                    {showPolygons ? <Layers className="w-3.5 h-3.5 text-sky-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                    Slot Polygon Outlines
                  </span>
                  <input
                    type="checkbox"
                    checked={showPolygons}
                    onChange={(e) => handleUpdateDetectionParams(undefined, undefined, undefined, e.target.checked)}
                    className="accent-sky-600 rounded"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: Dwell Time & Active Vehicles Inspector */}
          {tabMode === "dwell" && (
            <div className="space-y-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[11px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                  Parked Fleet Dwell Times
                </span>
                <span className="text-[10px] font-mono text-indigo-700 font-bold">
                  {occupiedSlots} OCCUPIED / {enteringSlots} ENTERING
                </span>
              </div>

              {activeDetections.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {activeDetections.map((slot) => {
                    const dwellSec = slot.dwell_seconds || 0;
                    const dwellStr = `${Math.floor(dwellSec / 60)}m ${dwellSec % 60}s`;
                    const isOccupied = slot.status === "OCCUPIED";

                    return (
                      <div
                        key={slot.id}
                        className={`p-2.5 rounded-xl border text-xs font-mono flex items-center justify-between ${
                          isOccupied
                            ? "bg-orange-50/70 border-orange-200 text-orange-950"
                            : "bg-amber-50/70 border-amber-200 text-amber-950"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5 font-bold">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isOccupied ? "bg-orange-500" : "bg-amber-500"
                              }`}
                            ></span>
                            <span>{slot.label}</span>
                            <span className="text-[10px] font-normal text-slate-500">
                              ({slot.vehicle_class || "vehicle"})
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 block">
                            IoU: {(slot.iou * 100).toFixed(1)}% • ID: {slot.vehicle_id || "Detecting"}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[11px] font-bold block">
                            {isOccupied ? dwellStr : "Entering..."}
                          </span>
                          <span
                            className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md ${
                              isOccupied
                                ? "bg-orange-600 text-white"
                                : "bg-amber-600 text-white"
                            }`}
                          >
                            {slot.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 font-mono text-xs">
                  No occupied bays detected in active frame.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Video File Upload */}
          {tabMode === "upload" && (
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="text-[11px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                Upload Parking Lot Video
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Have parking footage from YouTube, dashcam, or phone? Upload it below to test vehicle detection on your own clip.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/avi,video/quicktime,video/webm"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full py-6 px-4 rounded-2xl border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 hover:bg-indigo-50 transition flex flex-col items-center justify-center text-center space-y-2 group"
              >
                <div className="p-3 rounded-full bg-indigo-100 text-indigo-700 group-hover:scale-110 transition-transform">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-indigo-900 block font-display">
                    {isUploading ? "Uploading & Initializing..." : "Select MP4 / AVI / MOV Video"}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Max size 250 MB • Direct local edge processing
                  </span>
                </div>
              </button>

              {uploadProgress && (
                <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 font-mono text-xs flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin shrink-0" />
                  <span className="truncate">{uploadProgress}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Network Stream URL */}
          {tabMode === "url" && (
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="text-[11px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                Network Camera Stream
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Connect an online IP camera stream, RTSP link, or direct MP4 URL:
              </p>

              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="https://example.com/parking-feed.mp4"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                <button
                  onClick={() => {
                    if (customUrl.trim()) {
                      handleSwitchSource("url", customUrl.trim());
                    }
                  }}
                  disabled={!customUrl.trim()}
                  className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Connect Stream URL</span>
                </button>
              </div>
            </div>
          )}

          {/* Real-time Detection Inspector Box */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-sm space-y-2.5 font-mono">
            <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
              <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Detection Summary</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">
                ● ACTIVE
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Tracked Vehicles:</span>
                <span className="text-white font-bold">{vehicleCount} active</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>In Motion:</span>
                <span className="text-cyan-400 font-bold">{movingCount} vehicles</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Stationary / Parked:</span>
                <span className="text-indigo-300 font-bold">{stationaryCount} vehicles</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Bays Occupied:</span>
                <span className="text-orange-400 font-bold">{occupiedSlots} / {totalSlots}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Bays Free:</span>
                <span className="text-emerald-400 font-bold">{availableSlots}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Multi-Object Tracking:</span>
                <span className="text-sky-300">Active Velocity & Ribbons</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Spatial Geometry:</span>
                <span className="text-amber-300">16-Bay High-Tech Layout</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Polygon Calibrator Modal Overlay */}
      <PolygonCalibrator
        isOpen={showCalibrator}
        onClose={() => setShowCalibrator(false)}
        onSaveSuccess={() => {
          setStreamTimestamp(Date.now());
          fetchSources();
        }}
        onLog={onLog}
      />
    </section>
  );
}
