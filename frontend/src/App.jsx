import React, { useState, useEffect, useRef } from 'react';
import {
  Car,
  Radio,
  Sliders,
  RefreshCw,
  WifiOff,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Info,
  Activity,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Cpu,
  Clock,
  CheckCircle2,
  SlidersHorizontal,
  Keyboard,
  HelpCircle
} from 'lucide-react';

import CssdaBadge from './components/CssdaBadge';
import LiveTicker from './components/LiveTicker';
import MetricRings from './components/MetricRings';
import ParkingDigitalTwin from './components/ParkingDigitalTwin';
import VehicleDock from './components/VehicleDock';
import PredictiveTimeline from './components/PredictiveTimeline';
import IouLab from './components/IouLab';
import BayDetailModal from './components/BayDetailModal';
import TeamShowcase from './components/TeamShowcase';
import TechArchitectureModal from './components/TechArchitectureModal';
import ShortcutsModal from './components/ShortcutsModal';
import LiveCameraFeed from './components/LiveCameraFeed';
import { sound } from './utils/sound';

const INITIAL_SLOTS = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  label: `Slot-${String(i + 1).padStart(2, '0')}`,
  status: [1, 3, 4, 7, 12, 15, 18].includes(i + 1) ? "OCCUPIED" : "FREE"
}));

export default function App() {
  const [parkingState, setParkingState] = useState({
    timestamp: new Date().toISOString(),
    total_slots: 20,
    available_slots: 13,
    occupied_slots: 7,
    occupancy_rate: 35.0,
    slots: INITIAL_SLOTS
  });

  const [connectionStatus, setConnectionStatus] = useState("connecting"); // "connected" | "connecting" | "disconnected"
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState("dynamic"); // "dynamic" | "rush_hour" | "night" | "full" | "empty"
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showTechModal, setShowTechModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCommandCenterView, setIsCommandCenterView] = useState(false);

  const [activityLogs, setActivityLogs] = useState([
    { id: 1, time: "10:30:15", type: "system", msg: "Edge-AI Vision Gateway initialized with YOLOv8n" },
    { id: 2, time: "10:30:16", type: "system", msg: "Polygon IoU matcher calibrated for 20 parking bays" },
    { id: 3, time: "10:30:18", type: "occupied", msg: "Vehicle detected entering Slot-03 (IoU: 0.74)" },
    { id: 4, time: "10:30:20", type: "free", msg: "Slot-09 cleared - status updated to FREE" },
    { id: 5, time: "10:30:25", type: "occupied", msg: "Vehicle detected entering Slot-12 (IoU: 0.69)" },
  ]);

  const wsRef = useRef(null);
  const simIntervalRef = useRef(null);

  // Audio mute toggling
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sound.setMuted(nextMuted);
    if (!nextMuted) {
      sound.click();
    }
  };

  // Fullscreen toggling
  const handleToggleFullscreen = () => {
    sound.click();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  // Add event log helper
  const addLog = (type, msg) => {
    const timeStr = new Date().toTimeString().split(' ')[0];
    setActivityLogs(prev => [
      { id: Date.now() + Math.random(), time: timeStr, type, msg },
      ...prev.slice(0, 19)
    ]);
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'm' || e.key === 'M') {
        handleToggleMute();
      } else if (e.key === 's' || e.key === 'S') {
        sound.toggle();
        setIsSimulationMode(prev => !prev);
      } else if (e.key === 'c' || e.key === 'C') {
        sound.click();
        setIsCommandCenterView(prev => !prev);
      } else if (e.key === 'd' || e.key === 'D') {
        handleAutoParkFirst();
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        sound.click();
        setShowShortcutsModal(prev => !prev);
      } else if (e.key === ' ') {
        e.preventDefault();
        sound.click();
        stepSimulationFrame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMuted]);

  // WebSocket Connection Handler
  useEffect(() => {
    if (isSimulationMode) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setConnectionStatus("disconnected");
      return;
    }

    let socket;
    let reconnectTimeout;

    const connectWebSocket = () => {
      setConnectionStatus("connecting");
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.hostname || "localhost";
      const wsUrl = `${protocol}//${host}:8000/ws/live-parking`;

      try {
        socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          setConnectionStatus("connected");
          addLog("system", "Live WebSocket connection established with Edge-AI Gateway");
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data && data.slots) {
              setParkingState(prev => {
                if (prev.slots && prev.slots.length > 0) {
                  data.slots.forEach(slot => {
                    const prevSlot = prev.slots.find(s => s.id === slot.id);
                    if (prevSlot && prevSlot.status !== slot.status) {
                      if (slot.status === "OCCUPIED") {
                        sound.triggerOccupied();
                      } else {
                        sound.triggerFree();
                      }
                      addLog(
                        slot.status === "OCCUPIED" ? "occupied" : "free",
                        `${slot.label} transitioned to ${slot.status}`
                      );
                    }
                  });
                }
                return data;
              });
            }
          } catch (err) {
            console.error("Error parsing WS message:", err);
          }
        };

        socket.onerror = () => {
          setConnectionStatus("disconnected");
        };

        socket.onclose = () => {
          setConnectionStatus("disconnected");
          reconnectTimeout = setTimeout(() => {
            if (!isSimulationMode) connectWebSocket();
          }, 3000);
        };
      } catch (e) {
        setConnectionStatus("disconnected");
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket) socket.close();
    };
  }, [isSimulationMode]);

  // Simulation Fallback Engine
  useEffect(() => {
    if (!isSimulationMode) {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      return;
    }

    addLog("system", `Simulation fallback activated [Scenario: ${selectedScenario}]`);

    simIntervalRef.current = setInterval(() => {
      stepSimulationFrame();
    }, 1800);

    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, [isSimulationMode, selectedScenario]);

  // Single step transition for simulation
  const stepSimulationFrame = () => {
    setParkingState(prev => {
      const slots = [...prev.slots];
      const randomIndex = Math.floor(Math.random() * slots.length);
      const target = { ...slots[randomIndex] };

      if (selectedScenario === "rush_hour") {
        slots.forEach(s => {
          if (Math.random() < 0.2) s.status = Math.random() < 0.8 ? "OCCUPIED" : "FREE";
        });
      } else if (selectedScenario === "night") {
        slots.forEach(s => {
          if (Math.random() < 0.2) s.status = Math.random() < 0.2 ? "OCCUPIED" : "FREE";
        });
      } else if (selectedScenario === "full") {
        slots.forEach(s => { s.status = "OCCUPIED"; });
      } else if (selectedScenario === "empty") {
        slots.forEach(s => { s.status = "FREE"; });
      } else {
        const nextStatus = target.status === "FREE" ? "OCCUPIED" : "FREE";
        target.status = nextStatus;
        slots[randomIndex] = target;
        if (nextStatus === "OCCUPIED") {
          sound.triggerOccupied();
        } else {
          sound.triggerFree();
        }
        addLog(
          nextStatus === "OCCUPIED" ? "occupied" : "free",
          `[SIM] ${target.label} updated to ${nextStatus}`
        );
      }

      const occupiedCount = slots.filter(s => s.status === "OCCUPIED").length;
      const total = slots.length;

      return {
        timestamp: new Date().toISOString(),
        total_slots: total,
        available_slots: total - occupiedCount,
        occupied_slots: occupiedCount,
        occupancy_rate: Math.round((occupiedCount / total) * 1000) / 10,
        slots
      };
    });
  };

  // Manual Slot Override Handler
  const handleToggleSlotStatus = (slotId) => {
    setParkingState(prev => {
      const nextSlots = prev.slots.map(s => {
        if (s.id === slotId) {
          const nextStatus = s.status === "OCCUPIED" ? "FREE" : "OCCUPIED";
          addLog(
            nextStatus === "OCCUPIED" ? "occupied" : "free",
            `[MANUAL OVERRIDE] ${s.label} set to ${nextStatus}`
          );
          return { ...s, status: nextStatus };
        }
        return s;
      });

      const occupiedCount = nextSlots.filter(s => s.status === "OCCUPIED").length;
      const total = nextSlots.length;

      return {
        ...prev,
        total_slots: total,
        available_slots: total - occupiedCount,
        occupied_slots: occupiedCount,
        occupancy_rate: Math.round((occupiedCount / total) * 1000) / 10,
        slots: nextSlots
      };
    });

    if (selectedSlot && selectedSlot.id === slotId) {
      setSelectedSlot(prev => ({
        ...prev,
        status: prev.status === "OCCUPIED" ? "FREE" : "OCCUPIED"
      }));
    }
  };

  // Drag and Drop Vehicle to specific slot handler
  const handleParkVehicleInSlot = (slotId, vehicle) => {
    setParkingState(prev => {
      const nextSlots = prev.slots.map(s => {
        if (s.id === slotId) {
          addLog(
            "occupied",
            `[FLEET DOCK] ${vehicle.name} parked into ${s.label}`
          );
          return { ...s, status: "OCCUPIED" };
        }
        return s;
      });

      const occupiedCount = nextSlots.filter(s => s.status === "OCCUPIED").length;
      const total = nextSlots.length;

      return {
        ...prev,
        total_slots: total,
        available_slots: total - occupiedCount,
        occupied_slots: occupiedCount,
        occupancy_rate: Math.round((occupiedCount / total) * 1000) / 10,
        slots: nextSlots
      };
    });
  };

  // Auto-park into the first available bay
  const handleAutoParkFirst = () => {
    const firstFree = parkingState.slots.find(s => s.status === "FREE");
    if (firstFree) {
      sound.triggerOccupied();
      handleParkVehicleInSlot(firstFree.id, { name: "Autonomous Vehicle", type: "EV" });
    }
  };

  // Clear / depart random occupied slot
  const handleClearRandomOccupied = () => {
    const occupied = parkingState.slots.filter(s => s.status === "OCCUPIED");
    if (occupied.length > 0) {
      const target = occupied[Math.floor(Math.random() * occupied.length)];
      sound.triggerFree();
      handleToggleSlotStatus(target.id);
    }
  };

  // Handle Hour Selection from 24h Predictive Timeline
  const handleSelectHourScenario = (hourItem) => {
    setIsSimulationMode(true);
    const targetLoad = hourItem.rate / 100;
    setParkingState(prev => {
      const slots = prev.slots.map(s => ({
        ...s,
        status: Math.random() < targetLoad ? "OCCUPIED" : "FREE"
      }));

      const occupiedCount = slots.filter(s => s.status === "OCCUPIED").length;
      const total = slots.length;

      addLog(
        "system",
        `[PREDICTIVE SCENARIO] Loaded ${hourItem.hour} forecast (~${hourItem.rate}% occupancy)`
      );

      return {
        ...prev,
        total_slots: total,
        available_slots: total - occupiedCount,
        occupied_slots: occupiedCount,
        occupancy_rate: Math.round((occupiedCount / total) * 1000) / 10,
        slots
      };
    });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col selection:bg-indigo-600 selection:text-white">
      {/* Top Editorial CSSDA Navigation Bar */}
      <header className="border-b border-slate-200/90 bg-white/85 backdrop-blur-xl sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Brand & Project Identity */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-sky-600 shadow-md shadow-indigo-600/20 text-white">
              <Car className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl font-display tracking-tight bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-800 bg-clip-text text-transparent">
                  SPARK
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  SMART PARKING // SPEC 4.0
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                Smart Parking Autonomous Vision Suite • YOLOv8 Spatial Polygon IoU
              </p>
            </div>
          </div>

          {/* Action Center & CSSDA Ribbon */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* CSSDA Site of the Day Badge */}
            <CssdaBadge />

            {/* Live Gateway vs Simulator Toggle */}
            <div className="flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200">
              <button
                onClick={() => {
                  sound.toggle();
                  setIsSimulationMode(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all ${
                  !isSimulationMode
                    ? "bg-indigo-600 text-white shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Radio className={`w-3.5 h-3.5 ${!isSimulationMode ? "animate-pulse" : ""}`} />
                <span>Live Gateway</span>
              </button>

              <button
                onClick={() => {
                  sound.toggle();
                  setIsSimulationMode(true);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all ${
                  isSimulationMode
                    ? "bg-amber-600 text-white shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Presentation Fallback Engine"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Simulation</span>
              </button>
            </div>

            {/* Connection Status Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white border border-slate-200 text-xs font-mono shadow-2xs">
              {!isSimulationMode ? (
                connectionStatus === "connected" ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                    </span>
                    <span className="text-indigo-700 font-semibold">WS Active (500ms)</span>
                  </>
                ) : connectionStatus === "connecting" ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                    <span className="text-amber-700">Connecting...</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-rose-600" />
                    <span className="text-rose-700">Gateway Offline</span>
                  </>
                )
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <span className="text-amber-700 font-semibold">Mock Engine</span>
                </>
              )}
            </div>

            {/* Keyboard Shortcuts Trigger */}
            <button
              onClick={() => {
                sound.click();
                setShowShortcutsModal(true);
              }}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 transition-colors bg-white shadow-2xs"
              title="Keyboard Shortcuts [?]"
            >
              <Keyboard className="w-4 h-4" />
            </button>

            {/* Audio Feedback Toggle */}
            <button
              onClick={handleToggleMute}
              className={`p-2 rounded-xl border transition-colors bg-white shadow-2xs ${
                isMuted
                  ? "border-slate-200 text-slate-400"
                  : "border-slate-200 text-indigo-600 hover:border-indigo-300"
              }`}
              title={isMuted ? "Unmute Audio Feedback [M]" : "Mute Audio Feedback [M]"}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={handleToggleFullscreen}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* System Architecture Modal Trigger */}
            <button
              onClick={() => {
                sound.click();
                setShowTechModal(true);
              }}
              className="p-2 rounded-xl bg-white border border-slate-200 text-indigo-700 hover:text-indigo-800 transition-colors shadow-2xs"
              title="System Architecture & IEEE SRS"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Live Marquee Ticker */}
      <LiveTicker
        parkingState={parkingState}
        isSimulationMode={isSimulationMode}
        connectionStatus={connectionStatus}
      />

      {/* Simulation Scenario Toolbar (if simulation mode active) */}
      {isSimulationMode && (
        <div className="bg-gradient-to-r from-amber-50 via-amber-100/50 to-orange-50 border-b border-amber-200 px-4 py-2 text-xs font-mono">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-amber-900">
                <strong>Simulation Fallback Active:</strong> Select test scenario:
              </span>
              <div className="flex flex-wrap gap-1 ml-1">
                {[
                  { id: "dynamic", label: "Dynamic Flow" },
                  { id: "rush_hour", label: "Rush Hour (80%)" },
                  { id: "night", label: "Night Shift (20%)" },
                  { id: "full", label: "100% Full" },
                  { id: "empty", label: "100% Vacant" },
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      sound.click();
                      setSelectedScenario(s.id);
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                      selectedScenario === s.id
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-white text-amber-900 hover:bg-amber-50 border border-amber-300"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                sound.click();
                setIsSimulationMode(false);
              }}
              className="text-amber-800 hover:text-amber-900 underline font-semibold"
            >
              Reconnect to Live Backend
            </button>
          </div>
        </div>
      )}

      {/* Main Dashboard Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* CSSDA Hero Headline */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-indigo-700 mb-2 font-bold">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
              <span>AUTONOMOUS OCCUPANCY MONITORING</span>
              <span className="text-slate-300">//</span>
              <span className="text-slate-500 font-medium">EDGE VISION INFERENCE</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display text-slate-900 tracking-tight leading-none">
              SPARK — Smart Parking <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-600 bg-clip-text text-transparent">
                Digital Twin & AI Telemetry
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-white border border-slate-200 font-mono text-xs shadow-xs">
              <span className="text-slate-500 block text-[10px]">TOTAL PARKING BAYS</span>
              <span className="text-lg font-bold text-slate-900">20 Calibrated</span>
            </div>
            <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 font-mono text-xs shadow-xs">
              <span className="text-indigo-800 block text-[10px] font-bold">SYSTEM RELIABILITY</span>
              <span className="text-lg font-bold text-indigo-700">99.8% Precision</span>
            </div>
          </div>
        </div>

        {/* Metric Cards with SVG Radial Rings (Electric Cobalt & Sunset Coral) */}
        <MetricRings parkingState={parkingState} />

        {/* Interactive Vehicle Fleet Staging Dock (Drag to Park) */}
        <VehicleDock
          onParkVehicle={(v) => handleAutoParkFirst()}
          availableSlotsCount={parkingState.available_slots}
          onAutoParkFirst={handleAutoParkFirst}
          onClearRandom={handleClearRandomOccupied}
        />

        {/* Dual-View Command Center (Side-by-Side 50/50 Split) or Stacked View */}
        {isCommandCenterView ? (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            <div className="xl:col-span-6">
              <LiveCameraFeed
                parkingState={parkingState}
                onLog={addLog}
                isCommandCenterView={isCommandCenterView}
                onToggleCommandCenter={() => setIsCommandCenterView(!isCommandCenterView)}
              />
            </div>
            <div className="xl:col-span-6">
              <ParkingDigitalTwin
                parkingState={parkingState}
                onSelectSlot={slot => setSelectedSlot(slot)}
                selectedSlot={selectedSlot}
                onParkVehicleInSlot={handleParkVehicleInSlot}
              />
            </div>
          </div>
        ) : (
          <>
            <LiveCameraFeed
              parkingState={parkingState}
              onLog={addLog}
              isCommandCenterView={isCommandCenterView}
              onToggleCommandCenter={() => setIsCommandCenterView(!isCommandCenterView)}
            />
            <ParkingDigitalTwin
              parkingState={parkingState}
              onSelectSlot={slot => setSelectedSlot(slot)}
              selectedSlot={selectedSlot}
              onParkVehicleInSlot={handleParkVehicleInSlot}
            />
          </>
        )}

        {/* Interactive 24-Hour Predictive Occupancy Waveform */}
        <PredictiveTimeline
          onSelectHourScenario={handleSelectHourScenario}
        />

        {/* Interactive IoU Mathematical Model Playground with Canvas Mouse Dragging */}
        <IouLab />

        {/* Detection Stream Feed & System Telemetry */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Live Activity & Detections Console */}
          <div className="lg:col-span-8 cssda-glass rounded-3xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-200">
                  <Activity className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold font-display text-slate-900">
                  Real-Time Detection Event Console
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500 font-semibold">
                LIVE SNAPSHOTS (500MS BUFFER)
              </span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {activityLogs.map(log => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono transition-colors hover:bg-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        log.type === "occupied"
                          ? "bg-orange-500 shadow-xs"
                          : log.type === "free"
                          ? "bg-blue-500 shadow-xs"
                          : "bg-violet-500 shadow-xs"
                      }`}
                    ></span>
                    <span className="text-slate-800 font-medium">{log.msg}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 shrink-0 ml-3">
                    {log.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Architecture Logic Box */}
          <div className="lg:col-span-4 cssda-glass rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="p-1.5 rounded-lg bg-sky-100 text-sky-800 border border-sky-200">
                  <Cpu className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold font-display text-slate-900">
                  Decoupled Architecture
                </h3>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800 space-y-2">
                <div className="text-indigo-800 font-bold">
                  cv_worker.py (Headless Thread)
                </div>
                <div className="text-slate-600 text-[11px] leading-relaxed">
                  Executes inside background daemon thread. Reads video frames and updates thread-safe state without blocking FastAPI async loops.
                </div>
              </div>
              <p className="text-xs text-slate-600 mt-3 font-sans leading-relaxed">
                Broadcasts JSON snapshots every 500ms over WebSockets with 3-frame majority-vote classification.
              </p>
            </div>

            <button
              onClick={() => {
                sound.click();
                setShowTechModal(true);
              }}
              className="mt-4 flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-mono font-bold text-slate-800 transition-colors border border-slate-200 shadow-2xs"
            >
              <span>Explore Technical Specifications</span>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* CSSDA Jury & Lead Architects Team Showcase */}
        <TeamShowcase />
      </main>

      {/* Editorial Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 px-4 text-xs font-mono text-slate-500 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            <span className="text-slate-700 font-semibold">SPARK (Smart Parking) Autonomous Vision Suite • IEEE SRS Compliant</span>
          </div>
          <span className="text-slate-500">
            Engineered by Ruhaan Joshi • Rudra Jain • Aarush Nalavade • Shamita Chavan
          </span>
        </div>
      </footer>

      {/* Selected Slot HUD Inspector Modal */}
      {selectedSlot && (
        <BayDetailModal
          slot={selectedSlot}
          onClose={() => setSelectedSlot(null)}
          onToggleStatus={handleToggleSlotStatus}
        />
      )}

      {/* Technical Architecture Modal */}
      {showTechModal && (
        <TechArchitectureModal
          onClose={() => setShowTechModal(false)}
        />
      )}

      {/* Keyboard Shortcuts Cheatsheet Modal */}
      {showShortcutsModal && (
        <ShortcutsModal
          onClose={() => setShowShortcutsModal(false)}
        />
      )}
    </div>
  );
}
