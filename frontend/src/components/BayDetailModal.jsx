import React from 'react';
import { X, Car, CheckCircle2, ShieldCheck, Clock, MapPin, Gauge, Cpu, ToggleLeft, ToggleRight } from 'lucide-react';
import { sound } from '../utils/sound';

export default function BayDetailModal({ slot, onClose, onToggleStatus }) {
  if (!slot) return null;

  const isOccupied = slot.status === "OCCUPIED";

  const handleToggle = () => {
    sound.toggle();
    if (isOccupied) {
      sound.triggerFree();
    } else {
      sound.triggerOccupied();
    }
    onToggleStatus(slot.id);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <div
        className="bg-white max-w-md w-full rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-5 relative overflow-hidden text-slate-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Accent Line */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 ${isOccupied ? "bg-orange-500" : "bg-blue-600"}`}></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xs ${
              isOccupied 
                ? "bg-orange-50 border-orange-200 text-orange-600" 
                : "bg-blue-50 border-blue-200 text-blue-600"
            }`}>
              {isOccupied ? <Car className="w-6 h-6 stroke-[2.2]" /> : <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold font-display text-slate-900">{slot.label}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                  isOccupied
                    ? "bg-orange-100 text-orange-800 border-orange-200"
                    : "bg-blue-100 text-blue-800 border-blue-200"
                }`}>
                  {slot.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {slot.id <= 10 ? "Zone A • North Ingress Deck" : "Zone B • South Perpendicular Array"}
              </p>
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

        {/* Telemetry Matrix Grid */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 font-mono text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 flex items-center gap-1.5 font-medium">
              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
              Bay Coordinates
            </span>
            <span className="text-slate-900 font-bold">Polygon #{slot.id} [2.6m × 5.0m]</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 flex items-center gap-1.5 font-medium">
              <Gauge className="w-3.5 h-3.5 text-sky-600" />
              IoU Overlap Value
            </span>
            <span className={`font-bold ${isOccupied ? "text-orange-700" : "text-blue-700"}`}>
              {isOccupied ? "0.684 (Vehicle Detected)" : "0.000 (Bay Vacant)"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 flex items-center gap-1.5 font-medium">
              <Cpu className="w-3.5 h-3.5 text-amber-600" />
              Inference Filter
            </span>
            <span className="text-indigo-700 font-semibold">3-Frame Majority Vote</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Dwell Duration
            </span>
            <span className="text-slate-900 font-semibold">{isOccupied ? "24m 12s" : "0m 00s"}</span>
          </div>
        </div>

        {/* Presentation Override Controls */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-800 font-mono">Manual Demo Override</div>
            <div className="text-[11px] text-slate-500">Toggle state to test system responsiveness</div>
          </div>
          <button
            onClick={handleToggle}
            className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all shadow-xs ${
              isOccupied
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-orange-600 hover:bg-orange-700 text-white"
            }`}
          >
            Mark {isOccupied ? "FREE" : "OCCUPIED"}
          </button>
        </div>

        {/* Action Buttons */}
        <button
          onClick={() => {
            sound.click();
            onClose();
          }}
          className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 font-mono text-xs font-bold text-slate-700 uppercase tracking-wider transition-colors border border-slate-200"
        >
          Dismiss Telemetry
        </button>
      </div>
    </div>
  );
}
