import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <div className="glass-panel p-8 rounded-2xl border border-slate-800 max-w-md space-y-4">
        <div className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 mx-auto">
          <ShieldAlert className="h-6 w-6 text-cyan-400" />
        </div>
        <h2 className="text-xl font-bold text-white">404 — Vulnerability Not Found</h2>
        <p className="text-xs text-slate-400">
          The requested CVE or security resource could not be found in the current posture index.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
