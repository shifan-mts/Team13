import { NextResponse } from "next/server";

import { jsonError, parseVulnerability } from "@/lib/api-utils";
import { enrichVulnerabilities } from "@/lib/intelligence/normalize";
import { calculateRisk } from "@/lib/risk-engine";
import { getPriorityStats, getVulnerabilities } from "@/lib/vulnerabilities";
import type { Vulnerability } from "@/types/vulnerability";

export const dynamic = "force-dynamic";

/**
 * POST /api/analyze
 *
 * Body (all optional):
 *   { ids?: string[], vulnerabilities?: Vulnerability[], live?: boolean }
 *
 * Scores everything with the canonical engine and returns it sorted by risk
 * descending. With no body it analyzes the full local dataset.
 */
export async function POST(request: Request) {
  let body: unknown = {};
  try {
    const text = await request.text();
    if (text.trim().length > 0) body = JSON.parse(text);
  } catch {
    return jsonError("Request body must be valid JSON.");
  }

  const { ids, vulnerabilities, live } = (body ?? {}) as {
    ids?: unknown;
    vulnerabilities?: unknown;
    live?: unknown;
  };

  let subjects: Vulnerability[];

  if (Array.isArray(vulnerabilities) && vulnerabilities.length > 0) {
    const parsed = vulnerabilities.map(parseVulnerability);
    if (parsed.some((v) => v === null)) {
      return jsonError("One or more vulnerability records were malformed.");
    }
    subjects = parsed as Vulnerability[];
  } else if (Array.isArray(ids) && ids.length > 0) {
    const wanted = new Set(ids.filter((i): i is string => typeof i === "string").map((i) => i.toLowerCase()));
    subjects = getVulnerabilities().filter(
      (v) => wanted.has(v.id.toLowerCase()) || wanted.has(v.cve.toLowerCase())
    );
    if (subjects.length === 0) return jsonError("No matching vulnerabilities for the supplied ids.", 404);
  } else {
    subjects = getVulnerabilities();
  }

  const warnings: string[] = [];
  let sources: Record<string, string> | undefined;

  if (live === true) {
    try {
      const report = await enrichVulnerabilities(subjects);
      subjects = report.vulnerabilities;
      warnings.push(...report.warnings);
      sources = report.sources;
    } catch {
      warnings.push("Unable to retrieve live intelligence. Using cached vulnerability data.");
    }
  }

  const data = subjects.map(calculateRisk).sort((a, b) => b.score - a.score);

  return NextResponse.json({
    success: true,
    count: data.length,
    analyzedAt: new Date().toISOString(),
    ...(sources ? { sources } : {}),
    ...(warnings.length > 0 ? { warnings } : {}),
    stats: getPriorityStats(data),
    data,
  });
}
