import React, { useState, useEffect, useRef } from "react";
import {
  Layers,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Check,
  Move,
  Info,
  Maximize2,
  X,
  Sparkles,
  MousePointer
} from "lucide-react";

export default function PolygonCalibrator({
  isOpen,
  onClose,
  onSaveSuccess,
  onLog
}) {
  const [slots, setSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [draggedVertex, setDraggedVertex] = useState(null); // { slotId, vertexIdx }
  const [newPolygonPoints, setNewPolygonPoints] = useState([]); // for drawing new slot
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [presets, setPresets] = useState([]);
  const [activePreset, setActivePreset] = useState("custom");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const svgRef = useRef(null);

  // Fetch current slot configuration and presets
  useEffect(() => {
    if (isOpen) {
      loadSlotsConfig();
      loadPresets();
    }
  }, [isOpen]);

  const loadSlotsConfig = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/slots-config");
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots || []);
        setActivePreset(data.active_preset || "custom");
        if (data.slots?.length > 0) setSelectedSlotId(data.slots[0].id);
      }
    } catch (e) {
      console.error("Failed to load slots config:", e);
    }
  };

  const loadPresets = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/slot-presets");
      if (res.ok) {
        const data = await res.json();
        setPresets(data);
      }
    } catch (e) {
      console.error("Failed to load presets:", e);
    }
  };

  const handleApplyPreset = async (presetId) => {
    try {
      setIsSaving(true);
      const res = await fetch(`http://localhost:8000/api/slot-presets/${presetId}`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setSlots(data.config.slots);
        setActivePreset(data.config.active_preset);
        setStatusMessage(`Loaded preset: ${presetId}`);
        if (onLog) onLog("system", `Calibrated slot layout to preset: ${presetId}`);
        setTimeout(() => setStatusMessage(""), 3000);
      }
    } catch (e) {
      console.error("Failed to apply preset:", e);
    } finally {
      setIsSaving(false);
    }
  };

  // Convert client mouse coordinates to SVG 1280x720 coordinates
  const getSvgCoordinates = (e) => {
    if (!svgRef.current) return [0, 0];
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 720 / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    return [Math.max(0, Math.min(1280, x)), Math.max(0, Math.min(720, y))];
  };

  // Handle canvas click while in drawing mode (creating a new 4-point bay)
  const handleSvgClick = (e) => {
    if (!isDrawingMode) return;
    const [x, y] = getSvgCoordinates(e);
    const updated = [...newPolygonPoints, [x, y]];
    if (updated.length === 4) {
      // 4 points clicked: create the new slot!
      const newId = (slots.length > 0 ? Math.max(...slots.map((s) => s.id)) : 0) + 1;
      const newSlot = {
        id: newId,
        label: `Bay-${String(newId).padStart(2, "0")}`,
        polygon: updated
      };
      const updatedSlots = [...slots, newSlot];
      setSlots(updatedSlots);
      setSelectedSlotId(newId);
      setNewPolygonPoints([]);
      setIsDrawingMode(false);
      setStatusMessage(`Created ${newSlot.label}!`);
      setTimeout(() => setStatusMessage(""), 3000);
    } else {
      setNewPolygonPoints(updated);
    }
  };

  // Dragging vertex handles
  const handleVertexMouseDown = (e, slotId, vertexIdx) => {
    e.stopPropagation();
    setSelectedSlotId(slotId);
    setDraggedVertex({ slotId, vertexIdx });
  };

  const handleMouseMove = (e) => {
    if (!draggedVertex) return;
    const [x, y] = getSvgCoordinates(e);
    setSlots((prev) =>
      prev.map((slot) => {
        if (slot.id !== draggedVertex.slotId) return slot;
        const newPoly = slot.polygon.map((pt, idx) =>
          idx === draggedVertex.vertexIdx ? [x, y] : pt
        );
        return { ...slot, polygon: newPoly };
      })
    );
  };

  const handleMouseUp = () => {
    setDraggedVertex(null);
  };

  // Delete selected slot
  const handleDeleteSelected = () => {
    if (!selectedSlotId) return;
    const filtered = slots.filter((s) => s.id !== selectedSlotId);
    setSlots(filtered);
    setSelectedSlotId(filtered[0]?.id || null);
    setStatusMessage("Deleted bay.");
    setTimeout(() => setStatusMessage(""), 2500);
  };

  // Save changes to backend
  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("http://localhost:8000/api/slots-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots, preset_id: "custom" })
      });
      if (res.ok) {
        setStatusMessage("Calibration saved to YOLOv8 inference engine!");
        if (onLog) onLog("system", `Saved ${slots.length} calibrated bay polygons to Edge-AI vision worker.`);
        if (onSaveSuccess) onSaveSuccess();
        setTimeout(() => {
          setStatusMessage("");
          onClose();
        }, 1200);
      }
    } catch (e) {
      console.error("Save error:", e);
      setStatusMessage("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const selectedSlot = slots.find((s) => s.id === selectedSlotId);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-6xl w-full flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold font-display text-lg text-slate-900">
                  Spatial Polygon Calibrator & Bay Editor
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                  LIVE OVERLAY STUDIO
                </span>
              </div>
              <p className="text-xs text-slate-500 font-sans">
                Drag corner vertices to snap bays onto real parking lot lines, or draw custom 4-point polygons.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {statusMessage && (
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                {statusMessage}
              </span>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Studio Workspace: Left Interactive Video Canvas (8 cols) + Right Controls (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          {/* Interactive SVG Canvas on top of Live Camera Stream */}
          <div
            className="lg:col-span-8 p-4 bg-slate-950 flex flex-col justify-center items-center relative select-none"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-800 shadow-inner bg-black">
              {/* Underlying Video Stream */}
              <img
                src="http://localhost:8000/api/live-stream"
                alt="Calibration Camera Stream"
                className="w-full h-full object-contain pointer-events-none opacity-85"
              />

              {/* Interactive SVG Calibration Layer */}
              <svg
                ref={svgRef}
                viewBox="0 0 1280 720"
                onClick={handleSvgClick}
                className={`absolute inset-0 w-full h-full ${
                  isDrawingMode ? "cursor-crosshair" : "cursor-default"
                }`}
              >
                {/* Render All Bay Polygons */}
                {slots.map((slot) => {
                  const isSelected = slot.id === selectedSlotId;
                  const ptsString = slot.polygon.map((p) => p.join(",")).join(" ");
                  const center = slot.polygon.reduce(
                    (acc, p) => [acc[0] + p[0] / 4, acc[1] + p[1] / 4],
                    [0, 0]
                  );

                  return (
                    <g key={slot.id} onClick={(e) => { e.stopPropagation(); setSelectedSlotId(slot.id); }}>
                      {/* Polygon Surface */}
                      <polygon
                        points={ptsString}
                        fill={isSelected ? "rgba(99, 102, 241, 0.35)" : "rgba(2, 132, 199, 0.20)"}
                        stroke={isSelected ? "#4f46e5" : "#0284c7"}
                        strokeWidth={isSelected ? "3" : "1.8"}
                        className="transition-colors hover:fill-indigo-500/40 cursor-pointer"
                      />

                      {/* Bay Center Label */}
                      <text
                        x={center[0]}
                        y={center[1]}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#ffffff"
                        fontSize="13"
                        fontFamily="monospace"
                        fontWeight="bold"
                        filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.8))"
                        className="pointer-events-none select-none"
                      >
                        {slot.label}
                      </text>

                      {/* Vertex Drag Handles for Selected Slot */}
                      {isSelected &&
                        slot.polygon.map((pt, idx) => (
                          <g key={idx}>
                            <circle
                              cx={pt[0]}
                              cy={pt[1]}
                              r="8"
                              fill="#4f46e5"
                              stroke="#ffffff"
                              strokeWidth="2.5"
                              className="cursor-move hover:scale-125 transition-transform"
                              onMouseDown={(e) => handleVertexMouseDown(e, slot.id, idx)}
                            />
                            <text
                              x={pt[0]}
                              y={pt[1] - 12}
                              textAnchor="middle"
                              fill="#a5b4fc"
                              fontSize="10"
                              fontFamily="monospace"
                              fontWeight="bold"
                              className="pointer-events-none select-none"
                            >
                              P{idx + 1}
                            </text>
                          </g>
                        ))}
                    </g>
                  );
                })}

                {/* Drawing Mode Guide Preview */}
                {isDrawingMode &&
                  newPolygonPoints.map((pt, idx) => (
                    <circle
                      key={idx}
                      cx={pt[0]}
                      cy={pt[1]}
                      r="6"
                      fill="#f97316"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  ))}
              </svg>

              {/* In-Canvas Instruction Badge */}
              <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-white font-mono text-[11px] flex items-center gap-2 pointer-events-none">
                <MousePointer className="w-3.5 h-3.5 text-indigo-400" />
                {isDrawingMode ? (
                  <span>
                    Click 4 corners on the video to define new bay ({newPolygonPoints.length}/4 points placed)
                  </span>
                ) : (
                  <span>
                    Click any bay to select • Drag 4 corner handles to snap to pavement lines
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Presets, Controls & Selected Bay Properties */}
          <div className="lg:col-span-4 p-5 bg-white border-l border-slate-200 flex flex-col justify-between overflow-y-auto space-y-5">
            <div className="space-y-4">
              {/* Presets Quick-Selector */}
              <div>
                <label className="text-[11px] font-mono text-slate-500 font-bold uppercase tracking-wider block mb-1.5">
                  Camera Perspective Presets
                </label>
                <div className="space-y-1.5">
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset.id)}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs font-mono transition-all flex items-center justify-between ${
                        activePreset === preset.id
                          ? "bg-indigo-50 border-indigo-300 text-indigo-950 font-bold"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                      }`}
                    >
                      <div className="truncate">
                        <span className="block truncate">{preset.name}</span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          {preset.slot_count} calibrated bays
                        </span>
                      </div>
                      {activePreset === preset.id && (
                        <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons: Add New Bay / Delete Bay */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    setIsDrawingMode(!isDrawingMode);
                    setNewPolygonPoints([]);
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all ${
                    isDrawingMode
                      ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                      : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200"
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isDrawingMode ? "Cancel Draw" : "New 4-Pt Bay"}</span>
                </button>

                <button
                  onClick={handleDeleteSelected}
                  disabled={!selectedSlotId}
                  className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Bay</span>
                </button>
              </div>

              {/* Selected Bay Inspector */}
              {selectedSlot && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      Selected Bay Properties
                    </span>
                    <span className="font-bold text-indigo-700">ID #{selectedSlot.id}</span>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Bay Label</label>
                    <input
                      type="text"
                      value={selectedSlot.label}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSlots((prev) =>
                          prev.map((s) => (s.id === selectedSlot.id ? { ...s, label: val } : s))
                        );
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block mb-1">Vertex Coordinates (1280x720)</span>
                    <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                      {selectedSlot.polygon.map((pt, i) => (
                        <div key={i} className="truncate">
                          P{i + 1}: [{pt[0]}, {pt[1]}]
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions: Save & Close */}
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <button
                onClick={handleSaveConfig}
                disabled={isSaving}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Saving to YOLOv8 Engine..." : "Apply & Save to Vision Engine"}</span>
              </button>

              <button
                onClick={onClose}
                className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-xs font-semibold transition"
              >
                Discard / Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
