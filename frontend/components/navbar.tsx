"use client";

import React from "react";
import { ShieldAlert, Play, Bot, Sparkles, Server, Terminal } from "lucide-react";

interface NavbarProps {
  onOpenAnalyze: () => void;
  onOpenCopilot: () => void;
}

export function Navbar({ onOpenAnalyze, onOpenCopilot }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 bg-[#090d16]/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/20">
            <div className="h-full w-full bg-[#0b101d] rounded-[10px] flex items-center justify-center">
              <ShieldAlert className="h-5 w-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">
                PatchPilot <span className="text-cyan-400">AI</span>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                MVP v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Risk-Based Vulnerability Prioritization
            </p>
          </div>
        </div>

        {/* Status Badge & Actions */}
        <div className="flex items-center gap-3">
          {/* Active Environment Status */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
            <Server className="h-3.5 w-3.5 text-emerald-400" />
            <span>Prod Segment A</span>
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          {/* AI Copilot Button */}
          <button
            onClick={onOpenCopilot}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>AI Copilot</span>
          </button>

          {/* Analyze Environment Button */}
          <button
            onClick={onOpenAnalyze}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Analyze Environment</span>
          </button>
        </div>
      </div>
    </header>
  );
}
