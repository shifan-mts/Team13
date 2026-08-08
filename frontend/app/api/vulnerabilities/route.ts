import { NextResponse } from "next/server";

import { enrichVulnerabilities } from "@/lib/intelligence/normalize";
import { calculateRisk } from "@/lib/risk-engine";
import {
  getEvaluatedResults,
  getPriorityStats,
  getVulnerabilities,
} from "@/lib/vulnerabilities";

export const dynamic = "force-dynamic";

/**
 * GET /api/vulnerabilities
 * GET /api/vulnerabilities?live=true   — fold in CISA KEV / EPSS / NVD
 *
 * The default path is local-only so the dashboard never blocks on an
 * external feed. `live=true` is the opt-in enrichment used by Analyze.
 */
export async function GET(request: Request) {
  try {
    const live = new URL(request.url).searchParams.get("live") === "true";

    if (!live) {
      const data = getEvaluatedResults();
      return NextResponse.json({
        success: true,
        count: data.length,
        source: "local",
        stats: getPriorityStats(data),
        data,
      });
    }

    const report = await enrichVulnerabilities(getVulnerabilities());
    const data = report.vulnerabilities
      .map(calculateRisk)
      .sort((a, b) => b.score - a.score);

    return NextResponse.json({
      success: true,
      count: data.length,
      source: "live",
      sources: report.sources,
      enrichedCount: report.enrichedCount,
      warnings: report.warnings,
      stats: getPriorityStats(data),
      data,
    });
  } catch {
    // Live enrichment blew up — still serve something usable.
    const data = getEvaluatedResults();
    return NextResponse.json({
      success: true,
      count: data.length,
      source: "local",
      warnings: ["Unable to retrieve live intelligence. Using cached vulnerability data."],
      stats: getPriorityStats(data),
      data,
    });
  }
}
