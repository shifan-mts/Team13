import { NextResponse } from "next/server";

import { generateLocalComparison } from "@/lib/ai-explainer";
import { jsonError, resolveRisk } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/compare
 *
 * Body: { cveIdA, cveIdB }  — or { a, b } with full vulnerability records.
 *
 * The deterministic engine decides which is higher priority; the model only
 * phrases the rationale and is discarded if it disagrees.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.");
  }

  const { cveIdA, cveIdB, a, b } = (body ?? {}) as Record<string, unknown>;

  const riskA = resolveRisk(a ?? cveIdA);
  const riskB = resolveRisk(b ?? cveIdB);

  if (!riskA || !riskB) {
    return jsonError("Provide two known CVE ids or two complete vulnerability records.");
  }
  if (riskA.vulnerability.cve === riskB.vulnerability.cve) {
    return jsonError("Pick two different vulnerabilities to compare.");
  }

  const comparison = await generateLocalComparison(riskA, riskB);

  return NextResponse.json({
    success: true,
    higherRiskCve: comparison.higherRiskCve,
    comparisonSummary: comparison.comparisonSummary,
    provider: comparison.provider,
    a: { cve: riskA.vulnerability.cve, cvss: riskA.vulnerability.cvss, score: riskA.score, priority: riskA.priority },
    b: { cve: riskB.vulnerability.cve, cvss: riskB.vulnerability.cvss, score: riskB.score, priority: riskB.priority },
  });
}
