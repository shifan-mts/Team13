"use client";

import React from "react";
import { ShieldCheck, RefreshCw, Bot, Server } from "lucide-react";

interface NavbarProps {
  onOpenAnalyze: () => void;
  onOpenCopilot: () => void;
}

export function Navbar({ onOpenAnalyze, onOpenCopilot }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 bg-[#0b0f17]/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & System Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-cyan-400 shadow-sm">
                <ShieldCheck className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-white text-base tracking-tight">
                    PatchPilot <span className="text-cyan-400 font-mono text-xs px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/50">AI</span>
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium hidden sm:inline-block">
                  Risk-Based Vulnerability Prioritization
                </span>
              </div>
            </div>

            {/* Live Telemetry Indicator */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-300 font-mono text-[11px]">
                Engine: <span className="text-emerald-400 font-semibold">Active</span> • 18 CVEs Monitored
              </span>
            </div>
          </div>

          {/* Action Header Controls */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onOpenAnalyze}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/70 text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
              <span>Run Threat Scan</span>
            </button>

            <button
              onClick={onOpenCopilot}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all"
            >
              <Bot className="h-3.5 w-3.5 text-indigo-200" />
              <span>Security Assistant</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
