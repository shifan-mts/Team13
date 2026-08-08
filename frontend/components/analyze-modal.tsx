"use client";

import React, { useState, useEffect } from "react";
import { X, Terminal, CheckCircle2, Loader2, Play, ShieldAlert } from "lucide-react";

interface AnalyzeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const STEPS = [
  { id: 1, text: "Scanning asset inventory & loading CVE records...", delay: 600 },
  { id: 2, text: "Enriching threat intelligence (CISA KEV catalog, EPSS 2.0 probabilities)...", delay: 900 },
  { id: 3, text: "Evaluating internet exposure & network perimeter access controls...", delay: 800 },
  { id: 4, text: "Running deterministic Risk Scoring Engine (Weighted 6-Factor matrix)...", delay: 1000 },
  { id: 5, text: "Generating explainable priority roadmap & AI remediation advice...", delay: 700 },
];

export function AnalyzeModal({ isOpen, onClose, onComplete }: AnalyzeModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStepIndex(0);
      setLogs([]);
      setIsFinished(false);
      return;
    }

    let isMounted = true;
    let step = 0;

    const runStep = () => {
      if (step < STEPS.length) {
        const stepData = STEPS[step];
        if (isMounted) {
          setCurrentStepIndex(step);
          setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${stepData.text}`]);
        }
        step++;
        setTimeout(runStep, stepData.delay);
      } else {
        if (isMounted) {
          setIsFinished(true);
          setLogs((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] SUCCESS: Analysis complete! 18 CVEs prioritized into PATCH NOW, NEXT, and LATER.`,
          ]);
        }
      }
    };

    runStep();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const progressPercent = Math.min(100, Math.round(((currentStepIndex + (isFinished ? 1 : 0)) / STEPS.length) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl glass-panel rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Terminal className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Environment Threat Analysis</h3>
              <p className="text-xs text-slate-400">PatchPilot Risk Engine — Real-World Prioritization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Analysis Progress</span>
            <span className="text-cyan-400 font-mono font-semibold">{progressPercent}%</span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300 shadow-sm shadow-cyan-500/50"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Live Logs Terminal Window */}
        <div className="p-6">
          <div className="h-56 bg-slate-950/90 rounded-xl p-4 font-mono text-xs border border-slate-800/80 overflow-y-auto flex flex-col gap-2">
            {logs.map((log, index) => (
              <div
                key={index}
                className={`flex items-start gap-2 ${
                  index === logs.length - 1 && !isFinished
                    ? "text-cyan-400 font-semibold"
                    : index === logs.length - 1 && isFinished
                    ? "text-emerald-400 font-semibold"
                    : "text-slate-400"
                }`}
              >
                {index === logs.length - 1 && !isFinished ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                )}
                <span>{log}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldAlert className="h-4 w-4 text-cyan-400" />
            <span>Deterministic Scoring • CISA KEV + EPSS 2.0</span>
          </div>
          {isFinished ? (
            <button
              onClick={() => {
                onComplete();
                onClose();
              }}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 transition-all"
            >
              View Updated Priority Roadmap
            </button>
          ) : (
            <button
              disabled
              className="px-5 py-2 rounded-xl bg-slate-800 text-slate-500 text-xs font-semibold flex items-center gap-2 cursor-not-allowed"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Analyzing...</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
