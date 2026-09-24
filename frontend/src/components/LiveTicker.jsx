import React from 'react';
import { Activity, Radio, Cpu, ShieldCheck, Zap } from 'lucide-react';

export default function LiveTicker({ parkingState, isSimulationMode, connectionStatus }) {
  const tickerItems = [
    {
      icon: <Radio className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />,
      label: isSimulationMode ? "SIMULATION FALLBACK" : "LIVE WS STREAM",
      value: isSimulationMode ? "OFFLINE ENGINE ACTIVE" : "500MS REFRESH RATE",
    },
    {
      icon: <Cpu className="w-3.5 h-3.5 text-sky-600" />,
      label: "INFERENCE MODEL",
      value: "ULTRALYTICS YOLOV8N • CLASSES [2, 3, 5, 7]",
    },
    {
      icon: <Activity className="w-3.5 h-3.5 text-amber-600" />,
      label: "OCCUPANCY LOAD",
      value: `${parkingState.occupancy_rate}% (${parkingState.occupied_slots}/${parkingState.total_slots} BAYS)`,
    },
    {
      icon: <Zap className="w-3.5 h-3.5 text-violet-600" />,
      label: "EDGE LATENCY",
      value: "14.2MS INFERENCE • 60 FPS CV PIPELINE",
    },
    {
      icon: <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />,
      label: "IOU DECISION BOUNDARY",
      value: "THRESHOLD ≥ 0.40 • 3-FRAME MAJORITY VOTE",
    },
  ];

  return (
    <div className="w-full bg-white/80 backdrop-blur-md border-y border-slate-200/90 overflow-hidden py-2 select-none shadow-xs">
      <div className="flex animate-marquee items-center gap-8 text-[11px] font-mono tracking-wider">
        {[...tickerItems, ...tickerItems].map((item, index) => (
          <div key={index} className="flex items-center gap-2 shrink-0 px-3 py-0.5 rounded-full bg-slate-50 border border-slate-200">
            {item.icon}
            <span className="text-slate-500 font-medium">{item.label}:</span>
            <span className="text-slate-800 font-bold">{item.value}</span>
            <span className="text-indigo-400 ml-2">●</span>
          </div>
        ))}
      </div>
    </div>
  );
}
