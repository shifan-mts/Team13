import { NextResponse } from "next/server";

import { generateLocalExplanation } from "@/lib/ai-explainer";
import { jsonError, resolveRisk } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/explain
 *
 * Body: { vulnerability: Vulnerability | string }
 *
 * The server-side boundary between the browser and Ollama — the browser never
 * talks to the model directly. Any `risk` in the body is ignored: the engine
 * recomputes it here so the LLM can only ever explain an authoritative result.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.");
  }

  const { vulnerability, cve } = (body ?? {}) as {
    vulnerability?: unknown;
    cve?: unknown;
  };

  const risk = resolveRisk(vulnerability ?? cve);
  if (!risk) {
    return jsonError("Provide a known CVE id or a complete vulnerability record.");
  }

  // generateLocalExplanation never throws — it degrades to deterministic text.
  const explanation = await generateLocalExplanation(risk);

  return NextResponse.json({
    cve: risk.vulnerability.cve,
    score: risk.score,
    priority: risk.priority,
    summary: explanation.summary,
    whyPrioritized: explanation.keyDrivers,
    recommendation: explanation.remediationAdvice,
    recommendedCommand: explanation.recommendedCommand,
    provider: explanation.provider ?? "fallback",
  });
}
