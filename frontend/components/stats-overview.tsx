"use client";

import React from "react";
import { PriorityStats } from "@/types/vulnerability";
import { AlertOctagon, AlertTriangle, CheckCircle2, ShieldCheck, Flame, Gauge } from "lucide-react";

interface StatsOverviewProps {
  stats: PriorityStats;
  selectedPriority: string;
  onSelectPriority: (priority: string) => void;
}

export function StatsOverview({
  stats,
  selectedPriority,
  onSelectPriority,
}: StatsOverviewProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {/* Total CVEs */}
      <div className="glass-card p-4 rounded-xl border-slate-800">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Evaluated CVEs</span>
          <ShieldCheck className="h-4 w-4 text-cyan-400" />
        </div>
        <div className="text-2xl font-bold text-white">{stats.total}</div>
        <div className="text-[11px] text-slate-400 mt-1">100% Environment Scan</div>
      </div>

      {/* PATCH NOW */}
      <button
        onClick={() => onSelectPriority(selectedPriority === "NOW" ? "ALL" : "NOW")}
        className={`glass-card p-4 rounded-xl text-left transition-all relative overflow-hidden ${selectedPriority === "NOW"
            ? "border-red-500/80 bg-red-950/20 ring-1 ring-red-500/50"
            : "hover:border-red-500/40"
          }`}
      >
        <div className="absolute top-0 right-0 w-12 h-12 bg-red-500/10 rounded-bl-full pointer-events-none" />
        <div className="flex items-center justify-between text-red-400 text-xs mb-1 font-semibold">
          <span>PATCH NOW</span>
          <AlertOctagon className="h-4 w-4 text-red-500 animate-pulse" />
        </div>
        <div className="text-2xl font-bold text-red-400">{stats.nowCount}</div>
        <div className="text-[11px] text-red-300/80 mt-1 flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
          <span>Immediate Risk (&ge;90)</span>
        </div>
      </button>

      {/* PATCH NEXT */}
      <button
        onClick={() => onSelectPriority(selectedPriority === "NEXT" ? "ALL" : "NEXT")}
        className={`glass-card p-4 rounded-xl text-left transition-all relative overflow-hidden ${selectedPriority === "NEXT"
            ? "border-orange-500/80 bg-orange-950/20 ring-1 ring-orange-500/50"
            : "hover:border-orange-500/40"
          }`}
      >
        <div className="flex items-center justify-between text-orange-400 text-xs mb-1 font-semibold">
          <span>PATCH NEXT</span>
          <AlertTriangle className="h-4 w-4 text-orange-400" />
        </div>
        <div className="text-2xl font-bold text-orange-400">{stats.nextCount}</div>
        <div className="text-[11px] text-orange-300/80 mt-1">Next Window (70–89)</div>
      </button>

      {/* PATCH LATER */}
      <button
        onClick={() => onSelectPriority(selectedPriority === "LATER" ? "ALL" : "LATER")}
        className={`glass-card p-4 rounded-xl text-left transition-all relative overflow-hidden ${selectedPriority === "LATER"
            ? "border-yellow-500/80 bg-yellow-950/20 ring-1 ring-yellow-500/50"
            : "hover:border-yellow-500/40"
          }`}
      >
        <div className="flex items-center justify-between text-yellow-400 text-xs mb-1 font-semibold">
          <span>PATCH LATER</span>
          <CheckCircle2 className="h-4 w-4 text-yellow-400" />
        </div>
        <div className="text-2xl font-bold text-yellow-400">{stats.laterCount}</div>
        <div className="text-[11px] text-yellow-300/80 mt-1">Low Exposure (&lt;70)</div>
      </button>

      {/* KEV Active */}
      <div className="glass-card p-4 rounded-xl border-slate-800">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>CISA KEV Exploited</span>
          <Flame className="h-4 w-4 text-amber-500" />
        </div>
        <div className="text-2xl font-bold text-amber-400">{stats.kevCount}</div>
        <div className="text-[11px] text-slate-400 mt-1">Confirmed In-The-Wild</div>
      </div>

      {/* Avg Risk Score */}
      <div className="glass-card p-4 rounded-xl border-slate-800">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Avg Env Risk</span>
          <Gauge className="h-4 w-4 text-blue-400" />
        </div>
        <div className="text-2xl font-bold text-slate-100">{stats.avgRiskScore}<span className="text-xs text-slate-400 font-normal">/100</span></div>
        <div className="text-[11px] text-slate-400 mt-1">Environment Composite</div>
      </div>
    </div>
  );
}
