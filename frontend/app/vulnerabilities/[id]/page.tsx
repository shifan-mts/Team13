import React from "react";
import { DEMO_VULNERABILITIES, getEvaluatedResults } from "@/lib/vulnerabilities";
import { calculateRisk } from "@/lib/risk-engine";
import { generateAiExplanation } from "@/lib/ai-explainer";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, Terminal, Calendar, Server, Globe, Flame, Code, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return DEMO_VULNERABILITIES.map((v) => ({
    id: v.id,
  }));
}

export default async function VulnerabilityDetailPage({ params }: PageProps) {
  const { id } = await params;
  const vuln = DEMO_VULNERABILITIES.find((v) => v.id === id || v.cve === id);

  if (!vuln) {
    notFound();
  }

  const result = calculateRisk(vuln);
  const { score, priority, factors } = result;
  const aiExplanation = generateAiExplanation(result);

  let priorityBadge = "bg-red-500/20 text-red-400 border-red-500/30";
  if (priority === "NEXT") priorityBadge = "bg-orange-500/20 text-orange-400 border-orange-500/30";
  if (priority === "LATER") priorityBadge = "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to PatchPilot Dashboard</span>
      </Link>

      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className={`px-3 py-1 rounded-xl border font-mono font-bold text-xs ${priorityBadge}`}>
                PATCH {priority}
              </span>
              <h1 className="text-2xl font-bold font-mono text-white">{vuln.cve}</h1>
            </div>
            <p className="text-xs text-slate-400">{vuln.vendor || "System"} Component Security Risk</p>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-400 font-semibold uppercase">Risk Score</div>
            <div className="text-3xl font-extrabold font-mono text-white">
              {score} <span className="text-sm font-normal text-slate-400">/ 100</span>
            </div>
          </div>
        </div>

        <div className="text-sm text-slate-300 leading-relaxed">
          {vuln.description}
        </div>

        {/* AI Summary */}
        <div className="glass-panel p-4 rounded-xl border border-indigo-500/30 bg-indigo-950/10 text-xs space-y-2">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold">
            <Sparkles className="h-4 w-4" />
            <span>AI Executive Summary</span>
          </div>
          <p className="text-slate-200">{aiExplanation.summary}</p>
        </div>

        {/* Factor Table */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white">Risk Engine Factor Breakdown</h3>
          <div className="grid grid-cols-1 gap-2">
            {factors.map((f, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-white">{f.name}</div>
                  <div className="text-[11px] text-slate-400">{f.evidence}</div>
                </div>
                <div className="text-right font-mono font-bold text-cyan-400">
                  {f.score} / 100
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
