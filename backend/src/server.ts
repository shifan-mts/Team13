/**
 * PatchPilot AI — standalone API service.
 *
 * Serves the same five endpoints as the built-in Next.js route handlers, as a
 * separate process on its own port.
 *
 * It imports the canonical risk engine from ../frontend/lib rather than
 * carrying a copy: there is exactly one risk engine in this repository, and it
 * is frontend/lib/risk-engine.ts. Do not duplicate it here.
 */

import cors from "cors";
import express, { type Request, type Response } from "express";

import { generateLocalComparison, generateLocalExplanation } from "@/lib/ai-explainer";
import { findInDataset, parseVulnerability, resolveRisk } from "@/lib/api-utils";
import { enrichVulnerabilities } from "@/lib/intelligence/normalize";
import { calculateRisk } from "@/lib/risk-engine";
import {
  getEvaluatedResults,
  getPriorityStats,
  getVulnerabilities,
} from "@/lib/vulnerabilities";
import type { Vulnerability } from "@/types/vulnerability";

const PORT = Number(process.env.PORT ?? 8000);

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const fail = (res: Response, message: string, status = 400) =>
  res.status(status).json({ success: false, error: message });

/** Liveness probe — lets the frontend decide whether to use this service. */
app.get("/api/health", (_req, res) => {
  res.json({ success: true, service: "patchpilot-backend", uptime: process.uptime() });
});

/** GET /api/vulnerabilities[?live=true] */
app.get("/api/vulnerabilities", async (req: Request, res: Response) => {
  try {
    if (req.query.live !== "true") {
      const data = getEvaluatedResults();
      return res.json({
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

    return res.json({
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
    const data = getEvaluatedResults();
    return res.json({
      success: true,
      count: data.length,
      source: "local",
      warnings: ["Unable to retrieve live intelligence. Using cached vulnerability data."],
      stats: getPriorityStats(data),
      data,
    });
  }
});

/** GET /api/vulnerabilities/:id — by dataset id or CVE. */
app.get("/api/vulnerabilities/:id", (req: Request, res: Response) => {
  const vulnerability = findInDataset(req.params.id);
  if (!vulnerability) {
    return fail(res, `No vulnerability found for '${req.params.id}'.`, 404);
  }
  return res.json({
    success: true,
    data: { vulnerability, risk: calculateRisk(vulnerability) },
  });
});

/** POST /api/analyze — { ids?, vulnerabilities?, live? } */
app.post("/api/analyze", async (req: Request, res: Response) => {
  const { ids, vulnerabilities, live } = (req.body ?? {}) as {
    ids?: unknown;
    vulnerabilities?: unknown;
    live?: unknown;
  };

  let subjects: Vulnerability[];

  if (Array.isArray(vulnerabilities) && vulnerabilities.length > 0) {
    const parsed = vulnerabilities.map(parseVulnerability);
    if (parsed.some((v) => v === null)) {
      return fail(res, "One or more vulnerability records were malformed.");
    }
    subjects = parsed as Vulnerability[];
  } else if (Array.isArray(ids) && ids.length > 0) {
    const wanted = new Set(
      ids.filter((i): i is string => typeof i === "string").map((i) => i.toLowerCase())
    );
    subjects = getVulnerabilities().filter(
      (v) => wanted.has(v.id.toLowerCase()) || wanted.has(v.cve.toLowerCase())
    );
    if (subjects.length === 0) {
      return fail(res, "No matching vulnerabilities for the supplied ids.", 404);
    }
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

  return res.json({
    success: true,
    count: data.length,
    analyzedAt: new Date().toISOString(),
    ...(sources ? { sources } : {}),
    ...(warnings.length > 0 ? { warnings } : {}),
    stats: getPriorityStats(data),
    data,
  });
});

/**
 * POST /api/ai/explain — { vulnerability | cve }
 * Any client-supplied `risk` is ignored; the engine recomputes it here.
 */
app.post("/api/ai/explain", async (req: Request, res: Response) => {
  const { vulnerability, cve } = (req.body ?? {}) as {
    vulnerability?: unknown;
    cve?: unknown;
  };

  const risk = resolveRisk(vulnerability ?? cve);
  if (!risk) {
    return fail(res, "Provide a known CVE id or a complete vulnerability record.");
  }

  const explanation = await generateLocalExplanation(risk);

  return res.json({
    cve: risk.vulnerability.cve,
    score: risk.score,
    priority: risk.priority,
    summary: explanation.summary,
    whyPrioritized: explanation.keyDrivers,
    recommendation: explanation.remediationAdvice,
    recommendedCommand: explanation.recommendedCommand,
    provider: explanation.provider ?? "fallback",
  });
});

/** POST /api/ai/compare — { cveIdA, cveIdB } or { a, b } */
app.post("/api/ai/compare", async (req: Request, res: Response) => {
  const { cveIdA, cveIdB, a, b } = (req.body ?? {}) as Record<string, unknown>;

  const riskA = resolveRisk(a ?? cveIdA);
  const riskB = resolveRisk(b ?? cveIdB);

  if (!riskA || !riskB) {
    return fail(res, "Provide two known CVE ids or two complete vulnerability records.");
  }
  if (riskA.vulnerability.cve === riskB.vulnerability.cve) {
    return fail(res, "Pick two different vulnerabilities to compare.");
  }

  const comparison = await generateLocalComparison(riskA, riskB);

  return res.json({
    success: true,
    higherRiskCve: comparison.higherRiskCve,
    comparisonSummary: comparison.comparisonSummary,
    provider: comparison.provider,
    a: {
      cve: riskA.vulnerability.cve,
      cvss: riskA.vulnerability.cvss,
      score: riskA.score,
      priority: riskA.priority,
    },
    b: {
      cve: riskB.vulnerability.cve,
      cvss: riskB.vulnerability.cvss,
      score: riskB.score,
      priority: riskB.priority,
    },
  });
});

app.use((_req, res) => fail(res, "Not found.", 404));

app.listen(PORT, () => {
  console.log(`PatchPilot backend listening on http://localhost:${PORT}`);
});
