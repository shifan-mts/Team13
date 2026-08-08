"use client";

import React, { useState, useEffect } from "react";
import { X, ShieldAlert, CheckCircle2, Loader2, Play, Terminal } from "lucide-react";

interface AnalyzeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function AnalyzeModal({ isOpen, onClose, onComplete }: AnalyzeModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const steps = [
    { title: "Querying Infrastructure Inventory", desc: "Discovering active assets across production, staging, and internal subnets." },
    { title: "CISA KEV Catalog Synchronization", desc: "Fetching latest exploited vulnerability feed from CISA Known Exploited Vulnerabilities catalog." },
    { title: "EPSS 2.0 Exploit Probability Calculation", desc: "Mapping FIRST EPSS 30-day exploit probability vectors." },
    { title: "Environmental Exposure & Criticality Mapping", desc: "Evaluating network perimeter boundaries, open ports, and business impact tiers." },
    { title: "Executing Risk Scoring Engine", desc: "Computing deterministic 6-factor composite scores and generating priority tiers." },
  ];

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setIsRunning(false);
      setIsFinished(false);
      setLogs([]);
    }
  }, [isOpen]);

  const handleStartScan = () => {
    setIsRunning(true);
    setCurrentStep(0);
    setLogs(["[00:00.1] Initializing PatchPilot Security Telemetry Scanner v1.0..."]);

    const runNextStep = (stepIdx: number) => {
      if (stepIdx < steps.length) {
        setCurrentStep(stepIdx);
        setLogs((prev) => [
          ...prev,
          `[00:0${stepIdx + 1}.2] ${steps[stepIdx].title}...`,
        ]);
        setTimeout(() => {
          runNextStep(stepIdx + 1);
        }, 1000);
      } else {
        setIsRunning(false);
        setIsFinished(true);
        setLogs((prev) => [
          ...prev,
          "[00:06.0] Analysis complete! Evaluated 18 CVEs across 12 infrastructure assets.",
        ]);
        onComplete();
      }
    };

    setTimeout(() => {
      runNextStep(0);
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#0b0f17] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="glass-panel border-b border-slate-800 px-6 py-4 flex items-center justify-between bg-[#0b0f17]">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Environment Threat Analysis</h2>
              <p className="text-[11px] text-slate-400">Rescan telemetry & re-evaluate risk roadmap</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 space-y-5">
          {!isRunning && !isFinished && (
            <div className="glass-panel p-4 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-3">
              <p>
                Triggering an environment scan will query active infrastructure assets, pull real-time CISA KEV catalog signals, and execute the pure 6-factor risk scoring engine.
              </p>
              <button
                onClick={handleStartScan}
                className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all shadow-md shadow-cyan-600/20 flex items-center justify-center gap-2"
              >
                <Play className="h-4 w-4 fill-white" />
                <span>Begin Infrastructure Scan</span>
              </button>
            </div>
          )}

          {(isRunning || isFinished) && (
            <div className="space-y-4">
              {/* Progress Steps */}
              <div className="space-y-2">
                {steps.map((step, idx) => {
                  const isDone = idx < currentStep || isFinished;
                  const isCurrent = idx === currentStep && isRunning;

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border text-xs transition-all flex items-start gap-3 ${
                        isCurrent
                          ? "bg-slate-900 border-cyan-500/50 text-white"
                          : isDone
                          ? "bg-slate-950/60 border-slate-800 text-slate-300"
                          : "bg-slate-950/30 border-slate-900 text-slate-600"
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isDone ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : isCurrent ? (
                          <Loader2 className="h-4 w-4 text-cyan-400 animate-spin" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border border-slate-700 flex items-center justify-center text-[10px] text-slate-500 font-mono">
                            {idx + 1}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold">{step.title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{step.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Console Telemetry Box */}
              <div className="glass-panel p-4 rounded-xl border border-slate-800 bg-slate-950 font-mono text-[11px] space-y-1 max-h-36 overflow-y-auto">
                <div className="flex items-center gap-2 text-slate-400 font-semibold mb-2 text-[10px] uppercase tracking-wider">
                  <Terminal className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Scan Telemetry Stream</span>
                </div>
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
                    <span>{log}</span>
                  </div>
                ))}
              </div>

              {isFinished && (
                <button
                  onClick={onClose}
                  className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
                >
                  Close & View Updated Dashboard
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
