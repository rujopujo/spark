import React from 'react';
import { Car, Zap, Truck, Sparkles, PlusCircle, ArrowDownCircle, RefreshCw } from 'lucide-react';
import { sound } from '../utils/sound';

export const VEHICLE_TYPES = [
  { id: 'ev_sedan', name: 'Model S Electric', type: 'EV Sedan', classId: 2, icon: Zap, color: 'text-sky-600 bg-sky-50 border-sky-200' },
  { id: 'sedan', name: 'Urban Executive', type: 'Sedan', classId: 2, icon: Car, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { id: 'suv', name: 'Aero SUV 4x4', type: 'SUV / Crossover', classId: 2, icon: Car, color: 'text-violet-600 bg-violet-50 border-violet-200' },
  { id: 'van', name: 'Fleet Cargo Van', type: 'Commercial', classId: 5, icon: Truck, color: 'text-amber-600 bg-amber-50 border-amber-200' },
];

export default function VehicleDock({ onParkVehicle, availableSlotsCount, onAutoParkFirst, onClearRandom }) {
  const handleDragStart = (e, vehicle) => {
    sound.dragStart();
    e.dataTransfer.setData('text/plain', JSON.stringify(vehicle));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="cssda-glass rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-indigo-100 text-indigo-700 border border-indigo-200">
            <Car className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold font-display text-slate-900 flex items-center gap-2">
              Interactive Vehicle Fleet Staging Dock
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold uppercase">
                Drag & Drop Ready
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 font-mono">
              Drag any vehicle badge onto a parking slot below, or click to auto-park into the nearest bay.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sound.click();
              onAutoParkFirst();
            }}
            disabled={availableSlotsCount === 0}
            className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 ${
              availableSlotsCount > 0
                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Auto-Park Nearest</span>
          </button>

          <button
            onClick={() => {
              sound.click();
              onClearRandom();
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-xs font-bold transition-all border border-slate-200 flex items-center gap-1.5"
            title="Dispatch a parked vehicle"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Depart Vehicle</span>
          </button>
        </div>
      </div>

      {/* Draggable Vehicle Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        {VEHICLE_TYPES.map((v) => {
          const IconComponent = v.icon;
          return (
            <div
              key={v.id}
              draggable
              onDragStart={(e) => handleDragStart(e, v)}
              onClick={() => {
                sound.click();
                onParkVehicle(v);
              }}
              className="cursor-grab active:cursor-grabbing p-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all duration-200 flex items-center justify-between group shadow-2xs select-none"
              title="Drag onto any bay or click to park"
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg border ${v.color} shadow-2xs group-hover:scale-110 transition-transform`}>
                  <IconComponent className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 font-display leading-tight">
                    {v.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {v.type}
                  </div>
                </div>
              </div>

              <span className="text-[10px] font-mono text-indigo-600 font-bold opacity-75 group-hover:opacity-100">
                DRAG ⤹
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
