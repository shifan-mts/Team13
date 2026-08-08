"use client";

import React, { useState } from "react";
import { RiskResult } from "@/types/vulnerability";
import { generateAiComparison } from "@/lib/ai-explainer";
import { X, Bot, ArrowRight, ShieldCheck, HelpCircle } from "lucide-react";

interface AiCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  results: RiskResult[];
}

export function AiCopilotDrawer({ isOpen, onClose, results }: AiCopilotDrawerProps) {
  const [selectedCveA, setSelectedCveA] = useState<string>(results[0]?.vulnerability.cve || "");
  const [selectedCveB, setSelectedCveB] = useState<string>(results[1]?.vulnerability.cve || "");
  const [comparisonText, setComparisonText] = useState<string>("");

  if (!isOpen) return null;

  const handleCompare = () => {
    const resA = results.find((r) => r.vulnerability.cve === selectedCveA);
    const resB = results.find((r) => r.vulnerability.cve === selectedCveB);

    if (resA && resB) {
      const text = generateAiComparison(resA, resB);
      setComparisonText(text);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-sm animate-fade-in flex justify-end">
      <div className="w-full max-w-xl bg-[#0b0f17] border-l border-slate-800 h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-20 glass-panel border-b border-slate-800 px-6 py-4 flex items-center justify-between bg-[#0b0f17]/90">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Security Assistant</h2>
              <p className="text-xs text-slate-400">Decision support & comparative rationale</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          {/* Info Banner */}
          <div className="glass-panel p-4 rounded-xl border border-indigo-500/20 bg-indigo-950/10 text-xs text-slate-300">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-1">
              <Bot className="h-4 w-4" />
              <span>Auditable Downstream Rationale</span>
            </div>
            <p>
              The security assistant translates the deterministic risk engine factors into comparative rationale without inventing or altering risk numbers.
            </p>
          </div>

          {/* CVE Comparison Tool */}
          <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-cyan-400" />
              <span>CVE Priority Comparison Tool</span>
            </h3>
            <p className="text-xs text-slate-400">
              Select two vulnerabilities to view why PatchPilot prioritizes one over the other based on active exploitation & exposure.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">CVE Target #1</label>
                <select
                  value={selectedCveA}
                  onChange={(e) => setSelectedCveA(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-lg p-2 font-mono focus:outline-none focus:border-cyan-500"
                >
                  {results.map((r) => (
                    <option key={r.vulnerability.id} value={r.vulnerability.cve}>
                      {r.vulnerability.cve} (Risk: {r.score})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">CVE Target #2</label>
                <select
                  value={selectedCveB}
                  onChange={(e) => setSelectedCveB(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-lg p-2 font-mono focus:outline-none focus:border-cyan-500"
                >
                  {results.map((r) => (
                    <option key={r.vulnerability.id} value={r.vulnerability.cve}>
                      {r.vulnerability.cve} (Risk: {r.score})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleCompare}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
            >
              <span>Generate Comparative Rationale</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Comparison Output Display */}
          {comparisonText && (
            <div className="glass-panel p-5 rounded-xl border border-indigo-500/40 bg-slate-950/80 text-xs text-slate-200 space-y-3 animate-fade-in">
              <div className="font-semibold text-indigo-300 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Comparative Rationale Output</span>
              </div>
              <div className="prose prose-invert prose-xs max-w-none text-slate-300 leading-relaxed space-y-2 whitespace-pre-line font-sans">
                {comparisonText}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
