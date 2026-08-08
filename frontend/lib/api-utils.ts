/**
 * Shared helpers for the route handlers.
 *
 * Rule enforced here: risk is ALWAYS recomputed server-side by the canonical
 * engine. A client-supplied `risk` object is accepted in the request body for
 * convenience but never trusted — otherwise the browser could dictate scores.
 */

import { calculateRisk } from "@/lib/risk-engine";
import { getVulnerabilities } from "@/lib/vulnerabilities";
import type { RiskResult, Vulnerability } from "@/types/vulnerability";

const CRITICALITY = ["critical", "high", "medium", "low"] as const;
const ENVIRONMENTS = ["production", "staging", "development"] as const;

function isOneOf<T extends readonly string[]>(
  value: unknown,
  allowed: T
): value is T[number] {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

/** Structural check for a client-supplied vulnerability record. */
export function parseVulnerability(input: unknown): Vulnerability | null {
  if (typeof input !== "object" || input === null) return null;
  const v = input as Record<string, unknown>;

  if (typeof v.cve !== "string" || v.cve.trim().length === 0) return null;
  if (typeof v.cvss !== "number" || v.cvss < 0 || v.cvss > 10) return null;
  if (typeof v.epss !== "number" || v.epss < 0 || v.epss > 1) return null;
  if (typeof v.kev !== "boolean") return null;
  if (typeof v.exploitAvailable !== "boolean") return null;
  if (typeof v.internetExposed !== "boolean") return null;
  if (!isOneOf(v.assetCriticality, CRITICALITY)) return null;
  if (!isOneOf(v.businessImpact, CRITICALITY)) return null;
  if (!isOneOf(v.environment, ENVIRONMENTS)) return null;

  return {
    id: typeof v.id === "string" ? v.id : v.cve,
    cve: v.cve,
    description: typeof v.description === "string" ? v.description : "",
    cvss: v.cvss,
    epss: v.epss,
    kev: v.kev,
    exploitAvailable: v.exploitAvailable,
    internetExposed: v.internetExposed,
    assetName: typeof v.assetName === "string" ? v.assetName : "unknown-asset",
    assetCriticality: v.assetCriticality,
    environment: v.environment,
    businessImpact: v.businessImpact,
    publishedDate: typeof v.publishedDate === "string" ? v.publishedDate : undefined,
    vendor: typeof v.vendor === "string" ? v.vendor : undefined,
    remediationAction:
      typeof v.remediationAction === "string" ? v.remediationAction : undefined,
  };
}

/** Look a vulnerability up in the local dataset by id or CVE (case-insensitive). */
export function findInDataset(identifier: string): Vulnerability | undefined {
  const needle = identifier.trim().toLowerCase();
  return getVulnerabilities().find(
    (v) => v.id.toLowerCase() === needle || v.cve.toLowerCase() === needle
  );
}

/**
 * Resolve a request fragment into a scored RiskResult. Accepts either a CVE/id
 * string or a full vulnerability object. Always runs the engine.
 */
export function resolveRisk(input: unknown): RiskResult | null {
  if (typeof input === "string") {
    const found = findInDataset(input);
    return found ? calculateRisk(found) : null;
  }
  const parsed = parseVulnerability(input);
  return parsed ? calculateRisk(parsed) : null;
}

export function jsonError(message: string, status = 400) {
  return Response.json({ success: false, error: message }, { status });
}
