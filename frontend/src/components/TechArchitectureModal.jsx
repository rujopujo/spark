import React from 'react';
import { X, Cpu, Server, ShieldCheck, Terminal, Layers, ArrowRight, Code } from 'lucide-react';
import { sound } from '../utils/sound';

export default function TechArchitectureModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <div
        className="bg-white max-w-2xl w-full rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-6 relative overflow-hidden max-h-[90vh] flex flex-col text-slate-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Accent Gradient */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-500"></div>

        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shadow-xs">
              <Cpu className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold uppercase">
                  System Architecture
                </span>
                <span className="text-xs text-slate-400 font-mono">SPEC 4.0</span>
              </div>
              <h3 className="text-xl font-bold font-display text-slate-900 mt-0.5">
                Edge-AI YOLOv8 Pipeline Specifications
              </h3>
            </div>
          </div>

          <button
            onClick={() => {
              sound.click();
              onClose();
            }}
            className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Scrollable Body */}
        <div className="overflow-y-auto space-y-4 pr-1 text-xs font-sans text-slate-600">
          {/* Section 1: Headless CV Daemon */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-indigo-800 font-bold font-mono text-sm">
              <Terminal className="w-4 h-4 text-indigo-600" />
              <span>1. Decoupled Headless CV Daemon (cv_worker.py)</span>
            </div>
            <p className="text-slate-600 leading-relaxed font-sans">
              The vision worker executes inside a dedicated Python background daemon thread using OpenCV and Ultralytics YOLOv8n. It processes video frames or camera streams asynchronously without popping GUI windows, writing detections directly to a thread-safe dictionary locked with <code className="text-indigo-800 bg-indigo-50 border border-indigo-200 px-1 py-0.5 rounded font-mono">_state_lock</code>.
            </p>
            <div className="p-2.5 rounded-xl bg-white font-mono text-[11px] text-slate-700 border border-slate-200 shadow-2xs">
              Target COCO Classes: 2 (car), 3 (motorcycle), 5 (bus), 7 (truck)
            </div>
          </div>

          {/* Section 2: Mathematical Model */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-sky-800 font-bold font-mono text-sm">
              <Code className="w-4 h-4 text-sky-600" />
              <span>2. Spatial Polygon Intersection Over Union (IoU)</span>
            </div>
            <p className="text-slate-600 leading-relaxed font-sans">
              Rather than checking centroids alone, SPARK (Smart Parking) calculates exact spatial polygon overlap between vehicle bounding boxes and pre-calibrated parking bay coordinates:
            </p>
            <div className="p-3 rounded-xl bg-white border border-sky-200 font-mono text-sky-800 text-center font-bold text-xs shadow-2xs">
              IoU = Area(BoundingBox ∩ SlotPolygon) / Area(BoundingBox ∪ SlotPolygon)
            </div>
            <ul className="text-slate-600 list-disc list-inside space-y-1 font-mono text-[11px]">
              <li>If IoU ≥ 0.40: Potential vehicle occupancy registered</li>
              <li>Temporal Smoothing: Bay transitions only after 3 consecutive majority-vote frames</li>
            </ul>
          </div>

          {/* Section 3: FastAPI Gateway */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-indigo-800 font-bold font-mono text-sm">
              <Server className="w-4 h-4 text-indigo-600" />
              <span>3. Low-Latency WebSocket Gateway (main.py)</span>
            </div>
            <p className="text-slate-600 leading-relaxed font-sans">
              FastAPI broadcasts real-time JSON snapshots over <code className="text-indigo-800 bg-indigo-50 border border-indigo-200 px-1 py-0.5 rounded font-mono">/ws/live-parking</code> at a 500ms cadence. Clients maintain resilient auto-reconnect loops and seamless zero-downtime fallback to the presentation simulator.
            </p>
          </div>

          {/* Section 4: SRS Compliance */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-amber-800 font-bold font-mono text-sm">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>4. IEEE SRS & Process Modeling Compliance</span>
            </div>
            <p className="text-slate-600 leading-relaxed font-sans">
              Compliant with IEEE 830 / ISO/IEC/IEEE 29148 standards for Software Requirements Specifications. Features decoupled micro-architecture, presentation resilience, and high test coverage.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 shrink-0">
          <button
            onClick={() => {
              sound.click();
              onClose();
            }}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 font-mono text-xs font-bold text-slate-800 uppercase tracking-wider transition-colors border border-slate-200"
          >
            Close Specifications
          </button>
        </div>
      </div>
    </div>
  );
}
