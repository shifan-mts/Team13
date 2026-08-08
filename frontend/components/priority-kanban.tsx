"use client";

import React from "react";
import { RiskResult } from "@/types/vulnerability";
import { Flame, Globe, Code, ChevronRight, Server, Clock } from "lucide-react";

interface PriorityKanbanProps {
  results: RiskResult[];
  onSelectResult: (result: RiskResult) => void;
}

export function PriorityKanban({ results, onSelectResult }: PriorityKanbanProps) {
  const nowList = results.filter((r) => r.priority === "NOW");
  const nextList = results.filter((r) => r.priority === "NEXT");
  const laterList = results.filter((r) => r.priority === "LATER");

  const columns = [
    {
      id: "NOW",
      title: "PATCH NOW",
      description: "Active Exploitation & Immediate Risk",
      sla: "< 24h SLA",
      count: nowList.length,
      items: nowList,
      headerBadge: "bg-red-500/10 text-red-400 border-red-500/30",
      accentBorder: "border-priority-now",
      riskBadgeBg: "bg-red-500/10 text-red-400 border-red-500/30",
    },
    {
      id: "NEXT",
      title: "PATCH NEXT",
      description: "Elevated Vulnerabilities for Next Sprint",
      sla: "7-Day SLA",
      count: nextList.length,
      items: nextList,
      headerBadge: "bg-orange-500/10 text-orange-400 border-orange-500/30",
      accentBorder: "border-priority-next",
      riskBadgeBg: "bg-orange-500/10 text-orange-400 border-orange-500/30",
    },
    {
      id: "LATER",
      title: "PATCH LATER",
      description: "Contained Internal Risks & Routine Patches",
      sla: "30-Day SLA",
      count: laterList.length,
      items: laterList,
      headerBadge: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
      accentBorder: "border-priority-later",
      riskBadgeBg: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {columns.map((col) => (
        <div key={col.id} className="flex flex-col space-y-3">
          {/* Column Header */}
          <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center justify-between bg-[#0e1422]/90">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`px-2 py-0.5 rounded-md border font-mono font-bold text-xs ${col.headerBadge}`}>
                  {col.title}
                </span>
                <span className="text-xs font-mono font-bold text-slate-300">
                  ({col.count})
                </span>
              </div>
              <p className="text-[11px] text-slate-400">{col.description}</p>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded-md border border-slate-800">
              <Clock className="h-3 w-3 text-slate-400" />
              <span>{col.sla}</span>
            </div>
          </div>

          {/* Cards Stack */}
          <div className="space-y-3 flex-1">
            {col.items.length === 0 ? (
              <div className="p-8 text-center glass-panel rounded-xl border border-dashed border-slate-800 text-xs text-slate-500">
                No vulnerabilities in this priority tier.
              </div>
            ) : (
              col.items.map((result) => {
                const { vulnerability: v, score } = result;

                return (
                  <div
                    key={v.id}
                    onClick={() => onSelectResult(result)}
                    className={`glass-card p-4 rounded-xl border cursor-pointer hover:border-slate-600 transition-all ${col.accentBorder}`}
                  >
                    {/* Header: CVE & Risk Score Pill */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-white text-sm tracking-tight">
                        {v.cve}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 font-mono">
                          CVSS {v.cvss.toFixed(1)}
                        </span>
                        <div className={`px-2 py-0.5 rounded-md border font-mono font-bold text-xs ${col.riskBadgeBg}`}>
                          Risk {score}
                        </div>
                      </div>
                    </div>

                    {/* Vendor & Description */}
                    <p className="text-xs text-slate-300 line-clamp-2 mb-3 leading-relaxed">
                      {v.description}
                    </p>

                    {/* Threat Signal Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[10px]">
                      {v.kev && (
                        <span className="px-2 py-0.5 rounded-md bg-red-950/40 border border-red-500/30 text-red-300 flex items-center gap-1">
                          <Flame className="h-3 w-3 text-red-400" />
                          <span>CISA KEV</span>
                        </span>
                      )}
                      {v.exploitAvailable && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-950/40 border border-amber-500/30 text-amber-300 flex items-center gap-1">
                          <Code className="h-3 w-3 text-amber-400" />
                          <span>PoC Public</span>
                        </span>
                      )}
                      {v.internetExposed && (
                        <span className="px-2 py-0.5 rounded-md bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 flex items-center gap-1">
                          <Globe className="h-3 w-3 text-cyan-400" />
                          <span>Exposed</span>
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                        EPSS {(v.epss * 100).toFixed(0)}%
                      </span>
                    </div>

                    {/* Footer: Asset Info & Action */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-1.5 text-[11px] truncate max-w-[200px]">
                        <Server className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{v.assetName}</span>
                      </div>
                      <span className="flex items-center text-cyan-400 hover:text-cyan-300 font-semibold text-[11px] transition-colors">
                        Details <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
