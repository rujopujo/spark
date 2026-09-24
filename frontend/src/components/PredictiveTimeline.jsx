import React, { useState } from 'react';
import { TrendingUp, Clock, AlertCircle, Sparkles, Calendar, ChevronRight } from 'lucide-react';
import { sound } from '../utils/sound';

const HOURLY_PREDICTIONS = [
  { hour: '00:00', rate: 15, label: 'Night Owl' },
  { hour: '02:00', rate: 10, label: 'Minimal Flow' },
  { hour: '04:00', rate: 12, label: 'Dawn Setup' },
  { hour: '06:00', rate: 30, label: 'Early Arrivals' },
  { hour: '08:00', rate: 75, label: 'Morning Rush' },
  { hour: '09:00', rate: 90, label: 'Peak Capacity' },
  { hour: '11:00', rate: 80, label: 'High Load' },
  { hour: '13:00', rate: 65, label: 'Midday Flux' },
  { hour: '15:00', rate: 70, label: 'Afternoon Flow' },
  { hour: '17:00', rate: 85, label: 'Evening Commute' },
  { hour: '19:00', rate: 60, label: 'Dusk Departure' },
  { hour: '21:00', rate: 35, label: 'Late Shift' },
  { hour: '23:00', rate: 20, label: 'Overnight' },
];

export default function PredictiveTimeline({ onSelectHourScenario }) {
  const [hoveredIndex, setHoveredIndex] = useState(4); // Default to 08:00

  const selected = HOURLY_PREDICTIONS[hoveredIndex] || HOURLY_PREDICTIONS[4];

  const handleBarHover = (idx) => {
    setHoveredIndex(idx);
    sound.playBlip(700 + idx * 40, 0.02, 'sine', 0.03);
  };

  const handleClick = (item) => {
    sound.toggle();
    onSelectHourScenario(item);
  };

  return (
    <div className="cssda-glass rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-violet-100 text-violet-700 border border-violet-200">
              <TrendingUp className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold font-display text-slate-900 flex items-center gap-2">
              Predictive 24-Hour Occupancy Forecast
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 font-bold uppercase">
                Interactive Scrubber
              </span>
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
            Hover over any time slot to scrub the temporal neural-network projection and click to simulate that hour.
          </p>
        </div>

        {/* Selected Hour Stats Pill */}
        <div className="p-2 px-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3 font-mono text-xs shadow-2xs">
          <div className="flex items-center gap-1.5 text-slate-700 font-bold">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            <span>{selected.hour}</span>
          </div>
          <span className="text-slate-300">|</span>
          <span className="text-indigo-700 font-bold">{selected.rate}% Load</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500 text-[11px]">{selected.label}</span>
        </div>
      </div>

      {/* Interactive Bar Chart / Waveform */}
      <div className="flex items-end justify-between gap-1.5 h-24 pt-4 px-1 select-none">
        {HOURLY_PREDICTIONS.map((item, idx) => {
          const isSelected = hoveredIndex === idx;
          const isHigh = item.rate >= 75;
          const isModerate = item.rate >= 50 && item.rate < 75;

          return (
            <div
              key={idx}
              onMouseEnter={() => handleBarHover(idx)}
              onClick={() => handleClick(item)}
              className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer"
            >
              {/* Bar Column */}
              <div className="w-full flex items-end justify-center h-full">
                <div
                  className={`w-full max-w-[28px] rounded-t-lg transition-all duration-200 ${
                    isSelected
                      ? "bg-indigo-600 shadow-md shadow-indigo-500/30 scale-y-105"
                      : isHigh
                      ? "bg-rose-400 group-hover:bg-rose-500"
                      : isModerate
                      ? "bg-sky-400 group-hover:bg-sky-500"
                      : "bg-slate-300 group-hover:bg-slate-400"
                  }`}
                  style={{ height: `${item.rate}%` }}
                ></div>
              </div>

              {/* Time Label */}
              <span className={`text-[9px] font-mono mt-2 transition-colors ${isSelected ? "text-indigo-700 font-bold" : "text-slate-400"}`}>
                {item.hour.split(':')[0]}h
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend / Status Note */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-slate-300"></span>
            <span>&lt;50% Light Flow</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-sky-400"></span>
            <span>50-74% Moderate</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-rose-400"></span>
            <span>≥75% Peak Rush</span>
          </span>
        </div>
        <span className="text-indigo-600 font-semibold cursor-pointer hover:underline" onClick={() => handleClick(selected)}>
          Click to load {selected.hour} simulation scenario →
        </span>
      </div>
    </div>
  );
}
