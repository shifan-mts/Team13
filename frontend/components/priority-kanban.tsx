"use client";

import React from "react";
import { RiskResult } from "@/types/vulnerability";
import { Flame, Globe, Code, AlertOctagon, AlertTriangle, CheckCircle2, ChevronRight, Server } from "lucide-react";

interface PriorityKanbanProps {
  results: RiskResult[];
  onSelectResult: (result: RiskResult) => void;
}

export function PriorityKanban({ results, onSelectResult }: PriorityKanbanProps) {
  const nowResults = results.filter((r) => r.priority === "NOW");
  const nextResults = results.filter((r) => r.priority === "NEXT");
  const laterResults = results.filter((r) => r.priority === "LATER");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* Column 1: PATCH NOW */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between p-3 rounded-xl bg-red-950/30 border border-red-500/30">
          <div className="flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 text-red-500" />
            <span className="font-bold text-red-400 text-sm tracking-wide">PATCH NOW</span>
            <span className="text-[11px] text-red-300/70 font-mono">(&ge;90)</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30">
            {nowResults.length}
          </span>
        </div>

        <div className="flex flex-col gap-3 max-h-[700px] overflow-y-auto pr-1">
          {nowResults.map((result) => (
            <KanbanCard key={result.vulnerability.id} result={result} onSelect={onSelectResult} />
          ))}
        </div>
      </div>

      {/* Column 2: PATCH NEXT */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between p-3 rounded-xl bg-orange-950/30 border border-orange-500/30">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            <span className="font-bold text-orange-400 text-sm tracking-wide">PATCH NEXT</span>
            <span className="text-[11px] text-orange-300/70 font-mono">(70–89)</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold border border-orange-500/30">
            {nextResults.length}
          </span>
        </div>

        <div className="flex flex-col gap-3 max-h-[700px] overflow-y-auto pr-1">
          {nextResults.map((result) => (
            <KanbanCard key={result.vulnerability.id} result={result} onSelect={onSelectResult} />
          ))}
        </div>
      </div>

      {/* Column 3: PATCH LATER */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between p-3 rounded-xl bg-yellow-950/30 border border-yellow-500/30">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-yellow-400" />
            <span className="font-bold text-yellow-400 text-sm tracking-wide">PATCH LATER</span>
            <span className="text-[11px] text-yellow-300/70 font-mono">(&lt;70)</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold border border-yellow-500/30">
            {laterResults.length}
          </span>
        </div>

        <div className="flex flex-col gap-3 max-h-[700px] overflow-y-auto pr-1">
          {laterResults.map((result) => (
            <KanbanCard key={result.vulnerability.id} result={result} onSelect={onSelectResult} />
          ))}
        </div>
      </div>
    </div>
  );
}

function KanbanCard({
  result,
  onSelect,
}: {
  result: RiskResult;
  onSelect: (result: RiskResult) => void;
}) {
  const { vulnerability: v, score, priority } = result;

  let cardBorderClass = "border-priority-now hover:border-red-500/60";
  let badgeBg = "bg-red-500/20 text-red-400 border-red-500/30";
  if (priority === "NEXT") {
    cardBorderClass = "border-priority-next hover:border-orange-500/60";
    badgeBg = "bg-orange-500/20 text-orange-400 border-orange-500/30";
  } else if (priority === "LATER") {
    cardBorderClass = "border-priority-later hover:border-yellow-500/60";
    badgeBg = "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  }

  return (
    <div
      onClick={() => onSelect(result)}
      className={`glass-card p-4 rounded-xl cursor-pointer ${cardBorderClass} group transition-all`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-white text-sm group-hover:text-cyan-400 transition-colors">
            {v.cve}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            {v.vendor || "Software"}
          </span>
        </div>
        <div className={`px-2 py-0.5 rounded-lg border font-mono font-bold text-xs ${badgeBg}`}>
          {score}<span className="text-[10px] opacity-70">/100</span>
        </div>
      </div>

      <p className="text-xs text-slate-300 line-clamp-2 mb-3 leading-relaxed">
        {v.description}
      </p>

      {/* Asset Info */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800/80">
        <Server className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
        <span className="font-mono text-[11px] truncate text-slate-300">{v.assetName}</span>
        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold bg-slate-800 text-slate-400">
          {v.environment}
        </span>
      </div>

      {/* Threat Indicators & Badges */}
      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60">
        <div className="flex items-center gap-1.5">
          {v.kev && (
            <span
              title="CISA KEV Listed (Active Exploitation)"
              className="p-1 rounded bg-red-500/10 text-red-400 border border-red-500/20"
            >
              <Flame className="h-3.5 w-3.5" />
            </span>
          )}
          {v.exploitAvailable && (
            <span
              title="Public Exploit Code Available"
              className="p-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20"
            >
              <Code className="h-3.5 w-3.5" />
            </span>
          )}
          {v.internetExposed && (
            <span
              title="Internet Exposed Asset"
              className="p-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
            >
              <Globe className="h-3.5 w-3.5" />
            </span>
          )}
          <span className="text-[11px] text-slate-400 ml-1">
            CVSS: <span className="text-slate-200 font-semibold">{v.cvss.toFixed(1)}</span>
          </span>
        </div>

        <div className="flex items-center text-xs text-cyan-400 group-hover:translate-x-0.5 transition-transform">
          <span>Details</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  );
}
