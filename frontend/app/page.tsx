"use client";

import React, { useState } from "react";
import { getEvaluatedResults, getPriorityStats } from "@/lib/vulnerabilities";
import { RiskResult } from "@/types/vulnerability";
import { Navbar } from "@/components/navbar";
import { StatsOverview } from "@/components/stats-overview";
import { PriorityKanban } from "@/components/priority-kanban";
import { VulnerabilityTable } from "@/components/vulnerability-table";
import { VulnerabilityDetail } from "@/components/vulnerability-detail";
import { AnalyzeModal } from "@/components/analyze-modal";
import { AiCopilotDrawer } from "@/components/ai-copilot-drawer";
import { LayoutGrid, List } from "lucide-react";

export default function DashboardPage() {
  const [results, setResults] = useState<RiskResult[]>(() => getEvaluatedResults());
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [selectedResult, setSelectedResult] = useState<RiskResult | null>(null);
  const [isAnalyzeOpen, setIsAnalyzeOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  const stats = getPriorityStats(results);

  const handleAnalyzeComplete = () => {
    setResults(getEvaluatedResults());
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navbar */}
      <Navbar
        onOpenAnalyze={() => setIsAnalyzeOpen(true)}
        onOpenCopilot={() => setIsCopilotOpen(true)}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header Title Strip */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800 bg-[#0d121f]/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Vulnerability Risk Prioritization Roadmap
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl">
              Auditable risk engine mapping CISA KEV exploitation, EPSS 30-day exploit probability, and perimeter exposure into actionable remediation tiers.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setViewMode("kanban")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === "kanban"
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Kanban</span>
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === "table"
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span>Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Posture Stats Banner */}
        <StatsOverview
          stats={stats}
          selectedPriority={selectedPriorityFilter}
          onSelectPriority={(p) => setSelectedPriorityFilter(p)}
        />

        {/* Main View: Kanban or Table */}
        {viewMode === "kanban" ? (
          <PriorityKanban
            results={
              selectedPriorityFilter === "ALL"
                ? results
                : results.filter((r) => r.priority === selectedPriorityFilter)
            }
            onSelectResult={(res) => setSelectedResult(res)}
          />
        ) : (
          <VulnerabilityTable
            results={results}
            onSelectResult={(res) => setSelectedResult(res)}
            filterPriority={selectedPriorityFilter}
            onFilterPriorityChange={(p) => setSelectedPriorityFilter(p)}
          />
        )}
      </main>

      {/* Slide-over Detail Drawer */}
      <VulnerabilityDetail
        result={selectedResult}
        onClose={() => setSelectedResult(null)}
      />

      {/* Threat Scan Simulation Modal */}
      <AnalyzeModal
        isOpen={isAnalyzeOpen}
        onClose={() => setIsAnalyzeOpen(false)}
        onComplete={handleAnalyzeComplete}
      />

      {/* Security Assistant Drawer */}
      <AiCopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        results={results}
      />
    </div>
  );
}
