"use client";

import React, { useState } from "react";
import { RiskResult } from "@/types/vulnerability";
import { generateAiComparison } from "@/lib/ai-explainer";
import { apiUrl } from "@/lib/api-base";
import { X, Sparkles, ArrowRight, Bot, ShieldCheck, Terminal, HelpCircle, Loader2, Wand2 } from "lucide-react";

interface AiCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  results: RiskResult[];
}

export function AiCopilotDrawer({ isOpen, onClose, results }: AiCopilotDrawerProps) {
  const [selectedCveA, setSelectedCveA] = useState<string>(results[0]?.vulnerability.cve || "");
  const [selectedCveB, setSelectedCveB] = useState<string>(results[1]?.vulnerability.cve || "");
  const [comparisonText, setComparisonText] = useState<string>("");
  const [provider, setProvider] = useState<"local" | "fallback" | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  /**
   * The product thesis in one click. Picks the pair that actually *shows* the
   * inversion: a high-CVSS CVE the engine ranked LATER, against the highest-risk
   * CVE whose CVSS is strictly lower. Falls back to plain highest-vs-lowest if
   * no such inversion exists in the current dataset.
   */
  const loadDemoPair = () => {
    const highCvssLowRisk = [...results]
      .filter((r) => r.priority === "LATER")
      .sort((a, b) => b.vulnerability.cvss - a.vulnerability.cvss)[0];

    // Lowest-CVSS CVE the engine still ranked NOW — the widest, clearest gap.
    const lowerCvssHighRisk = [...results]
      .filter(
        (r) =>
          r.priority === "NOW" &&
          (!highCvssLowRisk || r.vulnerability.cvss < highCvssLowRisk.vulnerability.cvss)
      )
      .sort((a, b) => a.vulnerability.cvss - b.vulnerability.cvss)[0];

    const a = lowerCvssHighRisk ?? results[0];
    const b = highCvssLowRisk ?? results[results.length - 1];

    if (a) setSelectedCveA(a.vulnerability.cve);
    if (b) setSelectedCveB(b.vulnerability.cve);
    setComparisonText("");
    setProvider(null);
  };

  const handleCompare = async () => {
    const resA = results.find((r) => r.vulnerability.cve === selectedCveA);
    const resB = results.find((r) => r.vulnerability.cve === selectedCveB);
    if (!resA || !resB) return;

    setLoading(true);
    try {
      const response = await fetch(apiUrl("/api/ai/compare"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cveIdA: selectedCveA, cveIdB: selectedCveB }),
      });
      if (!response.ok) throw new Error("request failed");
      const data = await response.json();
      setComparisonText(data.comparisonSummary || generateAiComparison(resA, resB));
      setProvider(data.provider === "local" ? "local" : "fallback");
    } catch {
      // Offline or API down — the deterministic rationale still works.
      setComparisonText(generateAiComparison(resA, resB));
      setProvider("fallback");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm animate-fade-in flex justify-end">
      <div className="w-full max-w-xl bg-[#090d16] border-l border-slate-800 h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-20 glass-panel border-b border-slate-800 px-6 py-4 flex items-center justify-between bg-[#090d16]/90">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">PatchPilot AI Copilot</h2>
              <p className="text-xs text-slate-400">Explainable Decision Support Engine</p>
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
          {/* Quick Info Box */}
          <div className="glass-panel p-4 rounded-xl border border-indigo-500/20 bg-indigo-950/10 text-xs text-slate-300">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-1">
              <Bot className="h-4 w-4" />
              <span>Downstream Explainable AI</span>
            </div>
            <p>
              The AI Copilot derives clear rationale from the deterministic risk engine output without altering scoring weights or priorities.
            </p>
          </div>

          {/* CVE Comparison Tool */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-cyan-400" />
              <span>CVE Comparative Rationale Tool</span>
            </h3>
            <p className="text-xs text-slate-400">
              Select two vulnerabilities to compare why PatchPilot prioritizes one over the other.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">CVE #1</label>
                <select
                  value={selectedCveA}
                  onChange={(e) => setSelectedCveA(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl p-2.5 font-mono focus:outline-none focus:border-cyan-500"
                >
                  {results.map((r) => (
                    <option key={r.vulnerability.id} value={r.vulnerability.cve}>
                      {r.vulnerability.cve} (Risk: {r.score})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">CVE #2</label>
                <select
                  value={selectedCveB}
                  onChange={(e) => setSelectedCveB(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl p-2.5 font-mono focus:outline-none focus:border-cyan-500"
                >
                  {results.map((r) => (
                    <option key={r.vulnerability.id} value={r.vulnerability.cve}>
                      {r.vulnerability.cve} (Risk: {r.score})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={loadDemoPair}
                className="shrink-0 px-3 py-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-700/70 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
                title="Highest risk vs highest CVSS still ranked LATER"
              >
                <Wand2 className="h-3.5 w-3.5 text-cyan-400" />
                <span>Demo pair</span>
              </button>
              <button
                onClick={handleCompare}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Generating…</span>
                  </>
                ) : (
                  <>
                    <span>Generate Comparison Rationale</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Comparison Output Display */}
          {comparisonText && (
            <div className="glass-panel p-5 rounded-2xl border border-indigo-500/40 bg-slate-950/80 text-xs text-slate-200 space-y-3 animate-fade-in">
              <div className="font-semibold text-indigo-300 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>AI Rationale Output</span>
                </div>
                {provider && (
                  <span
                    className={`px-2 py-0.5 rounded-lg border text-[10px] font-mono ${
                      provider === "local"
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                        : "bg-slate-500/10 text-slate-400 border-slate-600/40"
                    }`}
                  >
                    {provider === "local" ? "LOCAL MODEL" : "DETERMINISTIC"}
                  </span>
                )}
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
