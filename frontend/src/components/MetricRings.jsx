import React from 'react';
import { Layers, CheckCircle2, Car, TrendingUp, Cpu, Gauge } from 'lucide-react';

function RadialRing({ percentage, color = "#2563eb", size = 52, stroke = 4 }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(15, 23, 42, 0.08)"
          strokeWidth={stroke}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute font-mono text-[10px] font-bold text-slate-800">
        {Math.round(percentage)}%
      </span>
    </div>
  );
}

export default function MetricRings({ parkingState }) {
  const { total_slots, available_slots, occupied_slots, occupancy_rate } = parkingState;
  const availablePercentage = total_slots > 0 ? (available_slots / total_slots) * 100 : 0;
  const occupiedPercentage = total_slots > 0 ? (occupied_slots / total_slots) * 100 : 0;

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Calibrated Bays */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
              <Layers className="w-4 h-4 text-slate-600" />
            </span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              Total Capacity
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
            20 BAYS
          </span>
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <div>
            <div className="text-3xl font-extrabold font-display text-slate-900 tracking-tight">
              {total_slots}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 font-mono">
              Zone A (10) + Zone B (10)
            </div>
          </div>
          <RadialRing percentage={100} color="#6366f1" />
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>Camera Cam-01 North</span>
          <span className="text-indigo-600 font-semibold">Calibrated</span>
        </div>
      </div>

      {/* Available Slots (Electric Cobalt) */}
      <div className="bg-gradient-to-br from-white via-sky-50/50 to-indigo-50/30 rounded-2xl p-4 border border-sky-200/90 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-sky-100 text-sky-700 border border-sky-200">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-sky-900 font-semibold">
              Available Bays
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200 font-bold">
            READY
          </span>
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <div>
            <div className="text-3xl font-extrabold font-display text-sky-700 tracking-tight">
              {available_slots}
            </div>
            <div className="text-xs text-sky-900/80 mt-0.5 font-mono">
              Vacant for Parking
            </div>
          </div>
          <RadialRing percentage={availablePercentage} color="#0284c7" />
        </div>

        <div className="mt-3 pt-3 border-t border-sky-100 flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-500">Acceptance Rate</span>
          <span className="text-sky-700 font-semibold">{Math.round(availablePercentage)}% Open</span>
        </div>
      </div>

      {/* Occupied Slots (Radiant Sunset Coral) */}
      <div className="bg-gradient-to-br from-white via-orange-50/50 to-rose-50/30 rounded-2xl p-4 border border-orange-200/90 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-100 text-orange-700 border border-orange-200">
              <Car className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-orange-900 font-semibold">
              Occupied Bays
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200 font-bold">
            IN USE
          </span>
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <div>
            <div className="text-3xl font-extrabold font-display text-orange-700 tracking-tight">
              {occupied_slots}
            </div>
            <div className="text-xs text-orange-900/80 mt-0.5 font-mono">
              Active Vehicles
            </div>
          </div>
          <RadialRing percentage={occupiedPercentage} color="#ea580c" />
        </div>

        <div className="mt-3 pt-3 border-t border-orange-100 flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-500">IoU Confirmed</span>
          <span className="text-orange-700 font-semibold">{occupied_slots} Detected</span>
        </div>
      </div>

      {/* Occupancy Velocity & Index (Royal Violet) */}
      <div className="bg-gradient-to-br from-white via-violet-50/50 to-indigo-50/30 rounded-2xl p-4 border border-violet-200/90 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-violet-100 text-violet-700 border border-violet-200">
              <Gauge className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-violet-900 font-semibold">
              Load Index
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200 font-bold">
            {occupancy_rate > 75 ? "SURGE" : occupancy_rate > 40 ? "MODERATE" : "CLEAR"}
          </span>
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <div>
            <div className="text-3xl font-extrabold font-display text-slate-900 tracking-tight">
              {occupancy_rate}%
            </div>
            <div className="text-xs text-violet-700/90 mt-0.5 font-mono">
              Facility Utilization
            </div>
          </div>
          <RadialRing percentage={occupancy_rate} color="#7c3aed" />
        </div>

        <div className="mt-3 pt-3 border-t border-violet-100 flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-500">Flux Rate</span>
          <span className="text-violet-700 font-semibold">~14 Veh/Hr</span>
        </div>
      </div>
    </section>
  );
}
