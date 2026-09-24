import React, { useState } from 'react';
import { 
  Car, 
  CheckCircle2, 
  Eye, 
  Layers, 
  Compass, 
  Scan, 
  Maximize2, 
  Sparkles, 
  Clock, 
  Radio, 
  ArrowRightLeft,
  Navigation,
  Crosshair,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Video,
  SlidersHorizontal
} from 'lucide-react';
import { sound } from '../utils/sound';

export default function ParkingDigitalTwin({ 
  parkingState, 
  onSelectSlot, 
  selectedSlot,
  onParkVehicleInSlot
}) {
  const [viewMode, setViewMode] = useState("cad"); // "cad" | "iso" | "cv"
  const [selectedZone, setSelectedZone] = useState("all"); // "all" | "zone_a" | "zone_b"
  const [activeCamera, setActiveCamera] = useState("CAM-01"); // "CAM-01" | "CAM-02" | "CAM-03"
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showDimensions, setShowDimensions] = useState(true);
  const [showVectors, setShowVectors] = useState(true);
  const [dragOverSlotId, setDragOverSlotId] = useState(null);

  const { slots, timestamp } = parkingState;
  const hasAB = slots.some(s => s.label?.includes("A") || s.label?.includes("B"));
  const zoneA = hasAB
    ? slots.filter(s => s.label?.includes("A"))
    : slots.slice(0, Math.ceil(slots.length / 2));
  const zoneB = hasAB
    ? slots.filter(s => s.label?.includes("B"))
    : slots.slice(Math.ceil(slots.length / 2));

  const displayedSlots = selectedZone === "zone_a" 
    ? zoneA 
    : selectedZone === "zone_b" 
    ? zoneB 
    : slots;

  const handleModeChange = (mode) => {
    sound.toggle();
    setViewMode(mode);
  };

  const handleSlotClick = (slot) => {
    sound.baySelect();
    onSelectSlot(slot);
  };

  const handleZoom = (delta) => {
    sound.click();
    setZoomLevel(prev => Math.min(1.4, Math.max(0.8, Math.round((prev + delta) * 10) / 10)));
  };

  const handleResetZoom = () => {
    sound.click();
    setZoomLevel(1);
  };

  const handleDrop = (e, slot) => {
    e.preventDefault();
    setDragOverSlotId(null);
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (dataStr) {
        const vehicle = JSON.parse(dataStr);
        sound.dropSnap();
        if (onParkVehicleInSlot) {
          onParkVehicleInSlot(slot.id, vehicle);
        }
      }
    } catch (err) {}
  };

  return (
    <div className="cssda-glass rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm relative overflow-hidden">
      {/* Background subtle grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:18px_18px] opacity-40 pointer-events-none"></div>

      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 relative z-10">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 border border-indigo-200">
              <Scan className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold font-display text-slate-900 tracking-wide">
              Facility Digital Twin & Live Grid
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold uppercase">
              IoU ≥ 0.40 CALIBRATED
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Spatial Top-Down Polygon Inference Engine • Drop vehicles directly onto bays to park
          </p>
        </div>

        {/* View Mode & Camera Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* View Modes */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200">
            <button
              onClick={() => handleModeChange("cad")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
                viewMode === "cad"
                  ? "bg-white text-indigo-700 border border-slate-200 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>CAD Blueprint</span>
            </button>

            <button
              onClick={() => handleModeChange("iso")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
                viewMode === "iso"
                  ? "bg-white text-sky-700 border border-slate-200 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>3D Isometric</span>
            </button>

            <button
              onClick={() => handleModeChange("cv")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
                viewMode === "cv"
                  ? "bg-white text-violet-700 border border-slate-200 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>AI Vision HUD</span>
            </button>
          </div>

          {/* Camera Angles */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-mono">
            {["CAM-01", "CAM-02", "CAM-03"].map((cam) => (
              <button
                key={cam}
                onClick={() => {
                  sound.click();
                  setActiveCamera(cam);
                }}
                className={`px-2.5 py-1 rounded-xl text-[10px] transition-all font-bold ${
                  activeCamera === cam
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title={cam === "CAM-01" ? "North Ingress 4K" : cam === "CAM-02" ? "South Perimeter" : "Drone Composite"}
              >
                {cam}
              </button>
            ))}
          </div>

          {/* Interactive Zoom Buttons */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 border border-slate-200">
            <button
              onClick={() => handleZoom(0.1)}
              className="p-1 rounded-xl hover:bg-white text-slate-700 hover:text-indigo-600 transition-colors"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[10px] px-1 font-bold text-slate-700">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => handleZoom(-0.1)}
              className="p-1 rounded-xl hover:bg-white text-slate-700 hover:text-indigo-600 transition-colors"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1 rounded-xl hover:bg-white text-slate-500 hover:text-slate-800 transition-colors"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Layer Visibility Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 font-semibold">Active Sensor:</span>
          <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg text-[10px]">
            {activeCamera === "CAM-01" ? "North Deck Ingress (Gate A)" : activeCamera === "CAM-02" ? "South Perimeter Array (Gate B)" : "High-Altitude 4K Drone"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Zone filter buttons */}
          {["all", "zone_a", "zone_b"].map((zone) => (
            <button
              key={zone}
              onClick={() => {
                sound.click();
                setSelectedZone(zone);
              }}
              className={`px-2 py-0.5 rounded-lg text-[10px] transition-all uppercase font-bold border ${
                selectedZone === zone
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {zone === "all" ? "All Bays" : zone === "zone_a" ? "Zone A" : "Zone B"}
            </button>
          ))}

          <span className="text-slate-300">|</span>

          {/* Toggle Dimension Tags */}
          <button
            onClick={() => {
              sound.click();
              setShowDimensions(!showDimensions);
            }}
            className={`px-2 py-0.5 rounded-lg text-[10px] border transition-colors ${
              showDimensions ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-bold" : "bg-white border-slate-200 text-slate-500"
            }`}
          >
            {showDimensions ? "Dimensions ON" : "Dimensions OFF"}
          </button>
        </div>
      </div>

      {/* Zoomable Canvas Stage */}
      <div 
        className="transition-transform duration-300 origin-top"
        style={{ transform: `scale(${zoomLevel})` }}
      >
        {viewMode === "cad" && (
          <CadBlueprintView 
            zoneA={zoneA}
            zoneB={zoneB}
            selectedZone={selectedZone}
            onSelectSlot={handleSlotClick}
            selectedSlot={selectedSlot}
            showDimensions={showDimensions}
            onDrop={handleDrop}
            dragOverSlotId={dragOverSlotId}
            setDragOverSlotId={setDragOverSlotId}
          />
        )}

        {viewMode === "iso" && (
          <IsometricView 
            slots={displayedSlots}
            onSelectSlot={handleSlotClick}
            selectedSlot={selectedSlot}
          />
        )}

        {viewMode === "cv" && (
          <ComputerVisionHudView 
            slots={displayedSlots}
            onSelectSlot={handleSlotClick}
            selectedSlot={selectedSlot}
            timestamp={timestamp}
          />
        )}
      </div>

      {/* Bottom Telemetry & Legend Bar */}
      <div className="mt-5 pt-3 border-t border-slate-200/90 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 shadow-xs"></span>
            <span className="text-slate-700 font-semibold">VACANT BAY</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500 shadow-xs"></span>
            <span className="text-slate-700 font-semibold">OCCUPIED</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-slate-500">
            <Navigation className="w-3 h-3 text-amber-500" />
            <span>PRIMARY INGRESS AXIS: 90° EAST</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-slate-600">
          <span className="flex items-center gap-1 font-bold text-indigo-700">
            <Clock className="w-3.5 h-3.5" />
            {timestamp ? new Date(timestamp).toLocaleTimeString() : "--:--:--"}
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500 font-semibold">{activeCamera} RTSP STREAM</span>
        </div>
      </div>
    </div>
  );
}

// 1. Architectural CAD Blueprint View
function CadBlueprintView({ 
  zoneA, 
  zoneB, 
  selectedZone, 
  onSelectSlot, 
  selectedSlot, 
  showDimensions,
  onDrop,
  dragOverSlotId,
  setDragOverSlotId
}) {
  return (
    <div className="bg-[#f8fafc] rounded-2xl p-4 sm:p-6 border border-slate-200 relative overflow-hidden shadow-inner select-none">
      {/* Millimeter Grid Texture */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.035)_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      {/* Perimeter Header */}
      <div className="relative z-10 flex items-center justify-between text-[11px] font-mono text-slate-500 mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-indigo-700 font-bold">PARKING DECK NORTH [ZONE A & B]</span>
          <span>[19.0760° N, 72.8777° E]</span>
        </div>
        <div className="flex items-center gap-3">
          <span>SCALE 1:50</span>
          <span>SLOT DIM: 2.6m × 5.0m</span>
        </div>
      </div>

      <div className="relative z-10 space-y-5">
        {/* Zone A (North Array) */}
        {(selectedZone === "all" || selectedZone === "zone_a") && (
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-bold font-mono tracking-wider text-slate-700 uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                {zoneA[0]?.label?.includes("A") ? `Zone A • North Bays (${zoneA.length} Stalls: A-01..A-${String(zoneA.length).padStart(2, '0')})` : `Zone A • North Bays (${zoneA.length} Stalls)`}
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                Direct Ingress Array
              </span>
            </div>
            <div className={`grid gap-2.5 ${zoneA.length <= 8 ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-8" : "grid-cols-2 sm:grid-cols-5 lg:grid-cols-10"}`}>
              {zoneA.map(slot => (
                <CadSlotCard
                  key={slot.id}
                  slot={slot}
                  isSelected={selectedSlot?.id === slot.id}
                  onSelect={() => onSelectSlot(slot)}
                  showDimensions={showDimensions}
                  onDrop={onDrop}
                  isDragOver={dragOverSlotId === slot.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverSlotId(slot.id);
                  }}
                  onDragLeave={() => setDragOverSlotId(null)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Central Drive Lane Marker */}
        <div className="relative py-2 my-2 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-2 border-dashed border-amber-400"></div>
          </div>
          <div className="relative bg-amber-50 px-4 py-1 text-[10px] font-mono uppercase tracking-widest text-amber-800 border border-amber-300 rounded-full flex items-center gap-2 shadow-xs font-bold">
            <ArrowRightLeft className="w-3 h-3 text-amber-600" />
            <span>Central Two-Way Ingress / Egress Transit Corridor</span>
            <span className="text-amber-700">15 KM/H LIMIT</span>
          </div>
        </div>

        {/* Zone B (South Array) */}
        {(selectedZone === "all" || selectedZone === "zone_b") && (
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-bold font-mono tracking-wider text-slate-700 uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                {zoneB[0]?.label?.includes("B") ? `Zone B • South Bays (${zoneB.length} Stalls: B-01..B-${String(zoneB.length).padStart(2, '0')})` : `Zone B • South Bays (${zoneB.length} Stalls)`}
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                Perpendicular Array
              </span>
            </div>
            <div className={`grid gap-2.5 ${zoneB.length <= 8 ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-8" : "grid-cols-2 sm:grid-cols-5 lg:grid-cols-10"}`}>
              {zoneB.map(slot => (
                <CadSlotCard
                  key={slot.id}
                  slot={slot}
                  isSelected={selectedSlot?.id === slot.id}
                  onSelect={() => onSelectSlot(slot)}
                  showDimensions={showDimensions}
                  onDrop={onDrop}
                  isDragOver={dragOverSlotId === slot.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverSlotId(slot.id);
                  }}
                  onDragLeave={() => setDragOverSlotId(null)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// CAD Slot Card Item (Electric Cobalt & Sunset Coral)
function CadSlotCard({ 
  slot, 
  isSelected, 
  onSelect, 
  showDimensions,
  onDrop,
  isDragOver,
  onDragOver,
  onDragLeave
}) {
  const isOccupied = slot.status === "OCCUPIED";
  const isEntering = slot.status === "ENTERING";
  const dwellSec = slot.dwell_seconds || 0;
  const dwellStr = dwellSec > 0 ? `${Math.floor(dwellSec / 60)}:${String(dwellSec % 60).padStart(2, '0')}` : null;

  return (
    <div
      onClick={onSelect}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, slot)}
      className={`cursor-pointer rounded-xl p-3 flex flex-col items-center justify-between min-h-[105px] transition-all duration-300 relative group overflow-hidden ${
        isDragOver ? "drag-target-active" : ""
      } ${
        isSelected
          ? "ring-2 ring-indigo-600 shadow-lg scale-[1.03]"
          : ""
      } ${
        isOccupied
          ? "bay-occupied text-orange-950"
          : isEntering
          ? "bg-amber-50/90 border border-amber-300 text-amber-950 shadow-2xs"
          : "bay-free text-blue-950"
      }`}
    >
      {/* Top Slot Header */}
      <div className="w-full flex items-center justify-between font-mono text-[11px]">
        <span className="font-bold text-slate-800">
          {slot.label}
        </span>
        <span
          className={`w-2 h-2 rounded-full ${
            isOccupied
              ? "bg-orange-500 shadow-xs animate-pulse"
              : isEntering
              ? "bg-amber-500 shadow-xs animate-ping"
              : "bg-blue-500 shadow-xs"
          }`}
        ></span>
      </div>

      {/* Center Vehicle or Check Glyph */}
      <div className="my-2 flex flex-col items-center">
        {isOccupied ? (
          <div className="p-2 rounded-xl bg-orange-100 text-orange-600 group-hover:scale-115 transition-transform duration-300 shadow-xs">
            <Car className="w-6 h-6 stroke-[2.2]" />
          </div>
        ) : isEntering ? (
          <div className="p-2 rounded-xl bg-amber-100 text-amber-600 group-hover:scale-115 transition-transform duration-300 shadow-xs">
            <Car className="w-6 h-6 stroke-[2.2] animate-bounce" />
          </div>
        ) : (
          <div className="p-2 rounded-xl bg-blue-100 text-blue-600 group-hover:scale-115 transition-transform duration-300 shadow-xs">
            <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
          </div>
        )}
      </div>

      {/* Bottom Status & IoU / Dwell Pill */}
      <div className="w-full flex items-center justify-between text-[10px] font-mono">
        <span
          className={`font-extrabold px-1.5 py-0.5 rounded tracking-wider uppercase ${
            isOccupied
              ? "text-orange-800 bg-orange-100/90 border border-orange-200"
              : isEntering
              ? "text-amber-800 bg-amber-100/90 border border-amber-200"
              : "text-blue-800 bg-blue-100/90 border border-blue-200"
          }`}
        >
          {isOccupied ? (dwellStr ? `BUSY ${dwellStr}` : "BUSY") : isEntering ? "ENTER" : "FREE"}
        </span>
        <span className="text-slate-500 text-[9px] font-medium">
          {showDimensions ? "2.6×5m" : slot.iou !== undefined ? `IoU .${Math.round(slot.iou * 100)}` : isOccupied ? "IoU .68" : "IoU .00"}
        </span>
      </div>
    </div>
  );
}

// 2. Isometric 3D Radar Deck View
function IsometricView({ slots, onSelectSlot, selectedSlot }) {
  return (
    <div className="bg-slate-100 rounded-2xl p-6 border border-slate-200 relative overflow-hidden min-h-[360px] flex flex-col items-center justify-center">
      {/* Radar sweep line */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
        <div className="w-[450px] h-[450px] rounded-full border border-indigo-400 relative">
          <div className="absolute inset-0 rounded-full border border-dashed border-indigo-300 animate-radar"></div>
          <div className="w-full h-full border-t-2 border-indigo-500 origin-center animate-radar"></div>
        </div>
      </div>

      {/* Isometric 3D Grid Stage */}
      <div className="relative z-10 w-full max-w-4xl [perspective:1200px]">
        <div className="[transform:rotateX(52deg)_rotateZ(-22deg)] transition-all duration-700 grid grid-cols-5 sm:grid-cols-10 gap-3 p-4 bg-white/90 backdrop-blur-md rounded-3xl border border-indigo-200 shadow-xl shadow-slate-300/40">
          {slots.map(slot => {
            const isOccupied = slot.status === "OCCUPIED";
            return (
              <div
                key={slot.id}
                onClick={() => onSelectSlot(slot)}
                className={`cursor-pointer rounded-xl p-2.5 h-24 flex flex-col items-center justify-between border transition-all duration-300 transform hover:-translate-y-3 hover:shadow-lg ${
                  isOccupied
                    ? "bg-orange-50 border-orange-300 shadow-sm"
                    : "bg-blue-50 border-blue-300 shadow-sm"
                } ${selectedSlot?.id === slot.id ? "ring-2 ring-indigo-600 scale-105" : ""}`}
              >
                <span className="text-[10px] font-mono font-bold text-slate-800">
                  {slot.label}
                </span>

                <div className="p-1.5 rounded-lg bg-white/80 shadow-xs">
                  {isOccupied ? (
                    <Car className="w-5 h-5 text-orange-600 animate-pulse" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  )}
                </div>

                <span className={`text-[9px] font-mono font-bold uppercase ${isOccupied ? "text-orange-700" : "text-blue-700"}`}>
                  {isOccupied ? "OCC" : "VAC"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 text-[11px] font-mono text-indigo-700 font-semibold flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5" />
        <span>Isometric Raycasted Radar Sweep • Real-Time Spatial Positioning</span>
      </div>
    </div>
  );
}

// 3. Computer Vision AI HUD View
function ComputerVisionHudView({ slots, onSelectSlot, selectedSlot, timestamp }) {
  return (
    <div className="bg-slate-50 rounded-2xl p-4 sm:p-6 border border-indigo-300 relative overflow-hidden min-h-[360px]">
      {/* HUD Scanline */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/10 to-transparent w-full h-8 animate-scanline pointer-events-none"></div>

      {/* Camera HUD Metadata Overlay */}
      <div className="flex items-center justify-between border-b border-indigo-200 pb-3 mb-4 text-[11px] font-mono text-indigo-900 font-bold">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping"></span>
          <span>● REC [CAM-01 TOP-DOWN]</span>
          <span className="text-slate-500 font-medium">1080P @ 60FPS</span>
        </div>
        <div className="flex items-center gap-4 text-slate-600">
          <span>YOLOv8n TENSOR ENGINE</span>
          <span>CONF: ≥0.75</span>
          <span>IoU_MATCH: 0.40</span>
        </div>
      </div>

      {/* Target Reticles for Slots */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {slots.map(slot => {
          const isOccupied = slot.status === "OCCUPIED";
          return (
            <div
              key={slot.id}
              onClick={() => onSelectSlot(slot)}
              className={`cursor-pointer rounded-xl p-3 border font-mono relative transition-all duration-300 ${
                isOccupied
                  ? "bg-orange-50/80 border-orange-300 text-orange-950 shadow-xs"
                  : "bg-blue-50/80 border-blue-300 text-blue-950 shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold">{slot.label}</span>
                <span className="text-[10px] font-semibold">{isOccupied ? "[VEHICLE]" : "[CLEAR]"}</span>
              </div>
              
              {/* Simulated Bounding Box Graphic */}
              <div className="h-14 rounded bg-white border border-dashed border-slate-300 flex flex-col items-center justify-center relative">
                {isOccupied && (
                  <div className="absolute inset-1 border border-orange-500 bg-orange-100/70 rounded flex items-center justify-center">
                    <span className="text-[9px] bg-orange-600 text-white px-1 font-bold rounded">
                      CLASS: CAR (94%)
                    </span>
                  </div>
                )}
                {!isOccupied && (
                  <span className="text-[10px] text-blue-700 font-mono font-medium">
                    NO_DETECTION
                  </span>
                )}
              </div>

              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                <span>IoU: {isOccupied ? "0.68" : "0.00"}</span>
                <span className="font-semibold text-slate-700">STATUS: {slot.status}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
