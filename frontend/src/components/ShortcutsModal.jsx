import React from 'react';
import { X, Command, Keyboard, Sparkles } from 'lucide-react';
import { sound } from '../utils/sound';

export default function ShortcutsModal({ onClose }) {
  const shortcuts = [
    { key: "1", label: "CAD Blueprint View", desc: "Switch digital twin to precision architectural CAD mode" },
    { key: "2", label: "3D Isometric View", desc: "Switch to 3D perspective raycasted radar deck" },
    { key: "3", label: "AI Vision HUD", desc: "Switch to YOLOv8 camera tensor overlay mode" },
    { key: "C", label: "Dual-View Command Center", desc: "Toggle side-by-side 50/50 live camera & digital twin layout" },
    { key: "Space", label: "Simulate Event", desc: "Trigger next vehicle arrival or departure transition" },
    { key: "M", label: "Mute / Unmute", desc: "Toggle synthesized Web Audio feedback" },
    { key: "S", label: "Simulation Engine", desc: "Toggle between Live WebSocket and Mock Simulator" },
    { key: "D", label: "Auto-Park Vehicle", desc: "Dispatch a vehicle into the first available bay" },
    { key: "?", label: "Shortcuts Cheatsheet", desc: "Open or close this keyboard navigation guide" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <div
        className="bg-white max-w-md w-full rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-5 text-slate-800 relative overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-500"></div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-display text-slate-900">
                Keyboard Shortcuts
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Speed controls for power users & judges
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

        {/* Shortcuts list */}
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {shortcuts.map((item, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
            >
              <div>
                <div className="font-bold text-slate-800">{item.label}</div>
                <div className="text-[11px] text-slate-500 leading-tight">{item.desc}</div>
              </div>
              <kbd className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 font-mono font-bold text-xs text-indigo-700 shadow-2xs shrink-0 ml-3">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            sound.click();
            onClose();
          }}
          className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-mono text-xs font-bold text-white uppercase tracking-wider transition-colors shadow-xs"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
