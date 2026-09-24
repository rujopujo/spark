import React from 'react';
import { Users, Award, ShieldCheck, Terminal, Cpu, CheckCircle2, Sparkles, ExternalLink } from 'lucide-react';
import { sound } from '../utils/sound';

const TEAM_MEMBERS = [
  {
    name: "Ruhaan Joshi",
    roll: "24101C0057",
    role: "Backend FastAPI Architecture & YOLOv8 Vision Pipeline",
    badge: "Vision & Edge-AI Lead",
    avatar: "RJ",
    skills: ["FastAPI Gateway", "Ultralytics YOLOv8n", "Polygon IoU Math", "Decoupled Threads"],
    gradient: "from-indigo-600 to-blue-600"
  },
  {
    name: "Rudra Jain",
    roll: "24101C0062",
    role: "React Frontend, Vercel Deployment & WebSocket Dashboard",
    badge: "Frontend Lead",
    avatar: "RJ",
    skills: ["React 19 Architecture", "WebSocket Subscriptions", "CSSDA UI/UX Design", "Vercel CI/CD"],
    gradient: "from-sky-500 to-indigo-600"
  },
  {
    name: "Aarush Nalavade",
    roll: "24101C0073",
    role: "QA Execution & System Testing",
    badge: "QA & Verification Lead",
    avatar: "AN",
    skills: ["Majority-Vote Verification", "IoU Edge Cases", "Stress Benchmarks", "System Integrity"],
    gradient: "from-purple-500 to-violet-600"
  },
  {
    name: "Shamita Chavan",
    roll: "24101C0066",
    role: "IEEE SRS Documentation & Process Modeling",
    badge: "Documentation & SRS Lead",
    avatar: "SC",
    skills: ["IEEE SRS Compliance", "Process Flow Modeling", "Architecture Schemas", "System Specs"],
    gradient: "from-amber-500 to-rose-600"
  }
];

export default function TeamShowcase() {
  return (
    <section className="cssda-glass rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-200">
              <Users className="w-4 h-4" />
            </span>
            <h3 className="text-xl font-bold font-display text-slate-900">
              Project Engineering Roster & Architects
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold">
              CORE TEAM
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Antigravity IDE Spec • Smart Automated Parking Lot Occupancy Tracker
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
          <Award className="w-4 h-4 text-amber-500" />
          <span>CSSDA Nominee Showcase</span>
        </div>
      </div>

      {/* Grid of Team Members */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {TEAM_MEMBERS.map((member, idx) => (
          <div
            key={idx}
            onMouseEnter={() => sound.playBlip(1100, 0.02, 'sine', 0.03)}
            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all duration-300 flex flex-col justify-between group relative overflow-hidden shadow-2xs"
          >
            {/* Ambient subtle glow on card top */}
            <div className={`absolute -top-10 -right-10 w-24 h-24 bg-gradient-to-br ${member.gradient} opacity-10 rounded-full blur-2xl group-hover:opacity-25 transition-opacity`}></div>

            <div>
              {/* Member Avatar & Roll Badge */}
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${member.gradient} flex items-center justify-center font-bold text-white font-display text-base shadow-sm`}>
                  {member.avatar}
                </div>
                <span className="text-[11px] font-mono font-bold px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-600">
                  {member.roll}
                </span>
              </div>

              {/* Name & Role */}
              <h4 className="font-bold font-display text-slate-900 text-base group-hover:text-indigo-700 transition-colors">
                {member.name}
              </h4>
              <span className="inline-block mt-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                {member.badge}
              </span>
              <p className="text-xs text-slate-600 mt-2.5 leading-relaxed font-sans">
                {member.role}
              </p>
            </div>

            {/* Skills / Specializations */}
            <div className="mt-5 pt-3 border-t border-slate-100">
              <div className="flex flex-wrap gap-1">
                {member.skills.map((skill, sIdx) => (
                  <span
                    key={sIdx}
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
