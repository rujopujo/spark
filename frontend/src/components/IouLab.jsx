import React, { useState, useRef } from 'react';
import { Cpu, Move, Sparkles, CheckCircle2, AlertTriangle, ArrowRight, Play, RefreshCw } from 'lucide-react';
import { sound } from '../utils/sound';

export default function IouLab() {
  const [xOffset, setXOffset] = useState(45);
  const [yOffset, setYOffset] = useState(35);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, startX: 0, startY: 0 });
  const svgRef = useRef(null);

  const bay = { x: 40, y: 30, w: 120, h: 100, area: 12000 };
  const vehicle = { x: xOffset, y: yOffset, w: 110, h: 90, area: 9900 };

  const xOverlap = Math.max(0, Math.min(bay.x + bay.w, vehicle.x + vehicle.w) - Math.max(bay.x, vehicle.x));
  const yOverlap = Math.max(0, Math.min(bay.y + bay.h, vehicle.y + vehicle.h) - Math.max(bay.y, vehicle.y));
  const intersectionArea = xOverlap * yOverlap;
  const unionArea = bay.area + vehicle.area - intersectionArea;
  const iou = unionArea > 0 ? intersectionArea / unionArea : 0;
  const iouPercentage = Math.round(iou * 1000) / 10;
  const isOccupied = iou >= 0.40;

  // Direct Mouse Drag on Canvas
  const handleMouseDown = (e) => {
    setIsDragging(true);
    sound.dragStart();
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: xOffset,
      startY: yOffset,
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;

    // Convert screen px delta to SVG coordinate units (scale factor ~0.7)
    const newX = Math.min(180, Math.max(0, Math.round(dragStartRef.current.startX + dx * 0.7)));
    const newY = Math.min(80, Math.max(0, Math.round(dragStartRef.current.startY + dy * 0.7)));

    setXOffset(newX);
    setYOffset(newY);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      sound.dropSnap();
      if (isOccupied) {
        sound.triggerOccupied();
      } else {
        sound.triggerFree();
      }
    }
  };

  const handleSliderChange = (e, axis) => {
    const val = Number(e.target.value);
    if (axis === 'x') setXOffset(val);
    if (axis === 'y') setYOffset(val);
  };

  const applyPreset = (preset) => {
    sound.click();
    if (preset === 'clear') {
      setXOffset(180);
      setYOffset(35);
      sound.triggerFree();
    } else if (preset === 'edge') {
      setXOffset(125);
      setYOffset(35);
      sound.triggerFree();
    } else if (preset === 'perfect') {
      setXOffset(45);
      setYOffset(35);
      sound.triggerOccupied();
    } else if (preset === 'partial') {
      setXOffset(90);
      setYOffset(40);
      sound.triggerOccupied();
    }
  };

  // Center coordinates for vector line
  const bayCenterX = bay.x + bay.w / 2;
  const bayCenterY = bay.y + bay.h / 2;
  const vehicleCenterX = vehicle.x + vehicle.w / 2;
  const vehicleCenterY = vehicle.y + vehicle.h / 2;

  return (
    <div className="cssda-glass rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 border border-indigo-200">
              <Cpu className="w-4 h-4" />
            </span>
            <h3 className="text-lg font-bold font-display text-slate-900 flex items-center gap-2">
              Interactive IoU Spatial Overlap Playground
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold uppercase flex items-center gap-1">
                <Move className="w-3 h-3" /> Canvas Drag Active
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Grab and freely drag the vehicle bounding box directly on the blueprint to compute real-time spatial IoU.
          </p>
        </div>

        {/* Preset Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-mono text-slate-500 mr-1 font-semibold">Presets:</span>
          {[
            { id: "perfect", label: "Full Bay (0.75)" },
            { id: "partial", label: "Threshold (0.42)" },
            { id: "edge", label: "Edge Clip (0.19)" },
            { id: "clear", label: "Empty (0.00)" },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id)}
              className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 hover:border-slate-300 transition-colors shadow-2xs"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Interactive Visual Canvas with Direct Mouse Dragging */}
        <div 
          ref={svgRef}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`lg:col-span-7 bg-[#f8fafc] rounded-2xl p-4 border border-slate-200 relative h-64 overflow-hidden flex items-center justify-center select-none shadow-inner ${
            isDragging ? "cursor-grabbing ring-2 ring-indigo-500" : "cursor-grab"
          }`}
        >
          {/* Subtle Grid */}
          <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>

          <svg className="w-full h-full" viewBox="0 0 320 160">
            {/* Centroid Distance Vector Line */}
            <line
              x1={bayCenterX}
              y1={bayCenterY}
              x2={vehicleCenterX}
              y2={vehicleCenterY}
              stroke="rgba(99, 102, 241, 0.4)"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />

            {/* Slot Polygon (Predefined Ground Truth) */}
            <rect
              x={bay.x}
              y={bay.y}
              width={bay.w}
              height={bay.h}
              fill="rgba(37, 99, 235, 0.08)"
              stroke="#2563eb"
              strokeWidth="2"
              strokeDasharray="4 2"
              rx="4"
            />
            <text x={bay.x + 8} y={bay.y + 18} fill="#1d4ed8" fontSize="9" fontFamily="monospace" fontWeight="bold">
              POLYGON: Slot-01 (12,000 px²)
            </text>
            <circle cx={bayCenterX} cy={bayCenterY} r="3" fill="#2563eb" />

            {/* Overlapping Intersection Area */}
            {intersectionArea > 0 && (
              <rect
                x={Math.max(bay.x, vehicle.x)}
                y={Math.max(bay.y, vehicle.y)}
                width={xOverlap}
                height={yOverlap}
                fill={isOccupied ? "rgba(234, 88, 12, 0.35)" : "rgba(14, 165, 233, 0.3)"}
                stroke={isOccupied ? "#ea580c" : "#0284c7"}
                strokeWidth="1.5"
                rx="2"
              />
            )}

            {/* Draggable Simulated Vehicle Bounding Box */}
            <g
              onMouseDown={handleMouseDown}
              className="cursor-grab active:cursor-grabbing group"
            >
              <rect
                x={vehicle.x}
                y={vehicle.y}
                width={vehicle.w}
                height={vehicle.h}
                fill="rgba(124, 58, 237, 0.14)"
                stroke={isDragging ? "#6366f1" : "#7c3aed"}
                strokeWidth={isDragging ? "2.5" : "2"}
                rx="6"
              />
              <text x={vehicle.x + 6} y={vehicle.y + 16} fill="#6d28d9" fontSize="8" fontFamily="monospace" fontWeight="bold">
                YOLOv8 BBox (Car: 96%) ✋ DRAG
              </text>

              {/* Centroid Reticle */}
              <circle cx={vehicleCenterX} cy={vehicleCenterY} r="3" fill="#7c3aed" />
              <line x1={vehicleCenterX - 6} y1={vehicleCenterY} x2={vehicleCenterX + 6} y2={vehicleCenterY} stroke="#7c3aed" strokeWidth="1" />
              <line x1={vehicleCenterX} y1={vehicleCenterY - 6} x2={vehicleCenterX} y2={vehicleCenterY + 6} stroke="#7c3aed" strokeWidth="1" />
            </g>
          </svg>

          {/* Floating Result Badge */}
          <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-white/95 border border-slate-200 flex items-center gap-2 font-mono text-xs shadow-md">
            <span className={`w-2 h-2 rounded-full ${isOccupied ? "bg-orange-500 animate-pulse" : "bg-blue-500"}`}></span>
            <span className="text-slate-500 font-medium">STATE:</span>
            <span className={`font-bold ${isOccupied ? "text-orange-700" : "text-blue-700"}`}>
              {isOccupied ? "OCCUPIED" : "FREE"}
            </span>
          </div>

          <div className="absolute top-3 left-3 text-[10px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md font-semibold">
            CLICK & DRAG CAR ON CANVAS
          </div>
        </div>

        {/* Math & Sliders Controls */}
        <div className="lg:col-span-5 space-y-4">
          {/* Real-time Math Score Box */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 font-mono space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase text-slate-500 font-semibold">Intersection Over Union</span>
              <span className={`text-xl font-extrabold ${isOccupied ? "text-orange-700" : "text-blue-700"}`}>
                {iou.toFixed(3)} ({iouPercentage}%)
              </span>
            </div>

            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden relative">
              {/* Threshold marker at 40% */}
              <div className="absolute top-0 bottom-0 left-[40%] w-0.5 bg-amber-500 z-10" title="Threshold: 0.40"></div>
              <div
                className={`h-full rounded-full transition-all duration-150 ${isOccupied ? "bg-orange-500" : "bg-blue-600"}`}
                style={{ width: `${Math.min(100, iouPercentage)}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>0.00 (Vacant)</span>
              <span className="text-amber-700 font-bold">▲ Cutoff 0.40</span>
              <span>1.00 (Exact Match)</span>
            </div>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Intersection Area:</span>
                <span className="text-slate-900 font-bold">{Math.round(intersectionArea).toLocaleString()} px²</span>
              </div>
              <div className="flex justify-between">
                <span>Union Area:</span>
                <span className="text-slate-900 font-bold">{Math.round(unionArea).toLocaleString()} px²</span>
              </div>
            </div>
          </div>

          {/* Interactive Coordinate Sliders */}
          <div className="space-y-3 font-mono text-xs">
            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span>Horizontal Position (X)</span>
                <span className="text-indigo-700 font-bold">{xOffset}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="180"
                value={xOffset}
                onChange={(e) => handleSliderChange(e, 'x')}
                className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span>Vertical Position (Y)</span>
                <span className="text-indigo-700 font-bold">{yOffset}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                value={yOffset}
                onChange={(e) => handleSliderChange(e, 'y')}
                className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
