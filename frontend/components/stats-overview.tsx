"use client";

import React from "react";
import { PriorityStats } from "@/types/vulnerability";
import { AlertOctagon, AlertTriangle, CheckCircle2, ShieldCheck, Flame, Gauge } from "lucide-react";

interface StatsOverviewProps {
  stats: PriorityStats;
  selectedPriority: string;
  onSelectPriority: (priority: string) => void;
}

export function StatsOverview({ stats, selectedPriority, onSelectPriority }: StatsOverviewProps) {
  const cards = [
    {
      id: "ALL",
      label: "Total Monitored CVEs",
      value: stats.total,
      subtext: "12 Assets Evaluated",
      icon: ShieldCheck,
      color: "text-slate-300",
      activeBg: "bg-slate-800/80 border-slate-600 text-white",
      inactiveBg: "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700",
    },
    {
      id: "NOW",
      label: "PATCH NOW",
      value: stats.nowCount,
      subtext: "🔴 24-Hour Remediation SLA",
      icon: AlertOctagon,
      color: "text-red-400",
      activeBg: "bg-red-950/40 border-red-500/50 text-red-300",
      inactiveBg: "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-red-900/50",
    },
    {
      id: "NEXT",
      label: "PATCH NEXT",
      value: stats.nextCount,
      subtext: "🟠 7-Day Sprint Window",
      icon: AlertTriangle,
      color: "text-orange-400",
      activeBg: "bg-orange-950/40 border-orange-500/50 text-orange-300",
      inactiveBg: "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-orange-900/50",
    },
    {
      id: "LATER",
      label: "PATCH LATER",
      value: stats.laterCount,
      subtext: "🟡 Routine Maintenance",
      icon: CheckCircle2,
      color: "text-yellow-400",
      activeBg: "bg-yellow-950/40 border-yellow-500/50 text-yellow-300",
      inactiveBg: "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-yellow-900/50",
    },
    {
      id: "KEV",
      label: "CISA KEV Signals",
      value: stats.kevCount,
      subtext: "Confirmed Wild Exploits",
      icon: Flame,
      color: "text-rose-400",
      activeBg: "bg-slate-900/90 border-slate-700 text-slate-200",
      inactiveBg: "bg-slate-900/60 border-slate-800 text-slate-400",
      isFilterable: false,
    },
    {
      id: "RISK",
      label: "Mean Risk Score",
      value: `${stats.avgRiskScore}/100`,
      subtext: "Deterministic Composite",
      icon: Gauge,
      color: "text-cyan-400",
      activeBg: "bg-slate-900/90 border-slate-700 text-slate-200",
      inactiveBg: "bg-slate-900/60 border-slate-800 text-slate-400",
      isFilterable: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = selectedPriority === card.id;
        const isInteractive = card.isFilterable !== false;

        return (
          <button
            key={card.id}
            disabled={!isInteractive}
            onClick={() => isInteractive && onSelectPriority(card.id)}
            className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
              isSelected ? card.activeBg : card.inactiveBg
            } ${isInteractive ? "cursor-pointer" : "cursor-default"}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                {card.label}
              </span>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </div>

            <div>
              <div className="text-2xl font-extrabold font-mono text-white tracking-tight">
                {card.value}
              </div>
              <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                {card.subtext}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
