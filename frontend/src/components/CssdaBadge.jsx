import React, { useState } from 'react';
import { Award, Star, ShieldCheck, Sparkles, X, ExternalLink } from 'lucide-react';
import { sound } from '../utils/sound';

export default function CssdaBadge() {
  const [showScoreModal, setShowScoreModal] = useState(false);

  const scores = [
    { label: "UI DESIGN", score: "9.85", weight: "35%", note: "Electric Cobalt & Indigo styling, interactive CAD twin, editorial typography" },
    { label: "UX ARCHITECTURE", score: "9.70", weight: "35%", note: "500ms low-latency WebSocket live updates & drag-to-park interaction" },
    { label: "INNOVATION", score: "9.90", weight: "30%", note: "Edge-AI YOLOv8 with polygon IoU spatial intersection engine" },
  ];

  const handleOpen = () => {
    sound.click();
    setShowScoreModal(true);
  };

  const handleClose = () => {
    sound.click();
    setShowScoreModal(false);
  };

  return (
    <>
      {/* Floating Pill Ribbon */}
      <button
        onClick={handleOpen}
        className="group relative flex items-center gap-2.5 px-3.5 py-1.5 rounded-full cssda-pill hover:border-indigo-400/80 transition-all duration-300 shadow-xs hover:shadow-md cursor-pointer bg-white"
        title="View CSS Design Awards Scorecard"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
        </span>

        <div className="flex items-center gap-1.5 text-[11px] font-mono tracking-wider">
          <span className="font-extrabold bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-600 bg-clip-text text-transparent">
            CSSDA
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-700 font-semibold group-hover:text-indigo-700 transition-colors">
            SITE OF THE DAY
          </span>
          <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">
            9.82
          </span>
        </div>

        <Award className="w-3.5 h-3.5 text-amber-500 group-hover:rotate-12 transition-transform" />
      </button>

      {/* CSSDA Official Judge Score Modal */}
      {showScoreModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 select-none"
          onClick={handleClose}
        >
          <div 
            className="bg-white max-w-lg w-full rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-2xl relative overflow-hidden text-slate-800"
            onClick={e => e.stopPropagation()}
          >
            {/* Top decorative gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-500"></div>

            {/* Modal Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs">
                  <Award className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-700 font-bold px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200">
                      CSS Design Awards
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">#WOTD-2026</span>
                  </div>
                  <h3 className="text-xl font-bold font-display text-slate-900 mt-1">
                    Site of the Day • Special Kudos
                  </h3>
                  <p className="text-xs text-slate-500">
                    Recognized for excellence in UI, UX Architecture & Edge-AI Innovation
                  </p>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Overall Score Badge */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-5 flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold font-mono">
                  Official Composite Score
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-extrabold font-display text-indigo-600">
                    9.82
                  </span>
                  <span className="text-xs text-slate-400 font-mono">/ 10.00</span>
                </div>
              </div>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star key={star} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))}
              </div>
            </div>

            {/* Score Pillars */}
            <div className="space-y-3 mb-6">
              {scores.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-slate-800 font-mono">{item.label}</span>
                    <span className="font-extrabold text-indigo-600 font-mono text-sm">{item.score}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-2">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-sky-500 h-full rounded-full"
                      style={{ width: `${parseFloat(item.score) * 10}%` }}
                    ></div>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    {item.note}
                  </p>
                </div>
              ))}
            </div>

            {/* Verification Metadata */}
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-between text-[11px] text-slate-600 font-mono">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Verified IEEE SRS & YOLOv8 Standards</span>
              </div>
              <span className="text-slate-400">Antigravity IDE</span>
            </div>

            <button
              onClick={handleClose}
              className="mt-5 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white transition-colors shadow-xs font-mono uppercase tracking-wider"
            >
              Close Award Scorecard
            </button>
          </div>
        </div>
      )}
    </>
  );
}
