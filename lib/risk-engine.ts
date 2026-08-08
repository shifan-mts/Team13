/**
 * PatchPilot AI — deterministic risk engine.
 *
 * Pure, synchronous, no I/O. The same input always produces the same output;
 * no LLM is involved in producing the score, the reasons, or the recommendation.
 * See docs/RISK_ENGINE.md for the model rationale.
 */

export type Priority = "NOW" | "NEXT" | "LATER";

export type CriticalityLevel = "critical" | "high" | "medium" | "low";
export type Environment = "production" | "staging" | "development";

/**
 * Fields the engine reads. Structurally satisfied by the wider `Vulnerability`
 * record described in docs/architecture.md, so callers can pass that directly.
 */
export interface RiskInput {
  cve: string;
  cvss: number; // 0–10
  epss: number; // 0–1
  kev: boolean;
  exploitAvailable: boolean;
  internetExposed: boolean;
  assetCriticality: CriticalityLevel;
  businessImpact: CriticalityLevel;
  environment: Environment;
}

export interface RiskFactors {
  exploitation: number;
  epss: number;
  exposure: number;
  businessImpact: number;
  cvss: number;
  exploitability: number;
}

export interface RiskAssessment {
  cve: string;
  score: number;
  priority: Priority;
  factors: RiskFactors;
  reasons: string[];
  recommendation: string;
}

/** MVP weights. PatchPilot's own transparent model, not an industry standard. */
export const WEIGHTS = {
  exploitation: 0.3,
  epss: 0.2,
  exposure: 0.15,
  businessImpact: 0.15,
  cvss: 0.1,
  exploitability: 0.1,
} as const;

/** Score thresholds. Exported so the UI never hardcodes its own copy. */
export const PRIORITY_THRESHOLDS = { NOW: 90, NEXT: 70 } as const;

const CRITICALITY_SCORE: Record<CriticalityLevel, number> = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25,
};

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

/** Confirmed real-world exploitation signal. */
function exploitationScore(v: RiskInput): number {
  if (v.kev && v.exploitAvailable) return 100;
  if (v.kev) return 90;
  if (v.exploitAvailable) return 75;
  return 20;
}

/**
 * Ease of exploitation. Falls back to EPSS bands when there is no direct
 * KEV/public-exploit evidence.
 */
function exploitabilityScore(v: RiskInput): number {
  if (v.kev && v.exploitAvailable) return 100;
  if (v.kev) return 90;
  if (v.exploitAvailable) return 75;
  if (v.epss >= 0.7) return 70;
  if (v.epss >= 0.3) return 45;
  return 20;
}

/** Internal assets keep a non-zero floor: less reachable is not unreachable. */
const exposureScore = (v: RiskInput): number => (v.internetExposed ? 100 : 40);

export function getRiskFactors(v: RiskInput): RiskFactors {
  return {
    exploitation: exploitationScore(v),
    epss: clamp(v.epss * 100, 0, 100),
    exposure: exposureScore(v),
    businessImpact: CRITICALITY_SCORE[v.businessImpact],
    cvss: clamp(v.cvss * 10, 0, 100),
    exploitability: exploitabilityScore(v),
  };
}

export function getPriority(score: number): Priority {
  if (score >= PRIORITY_THRESHOLDS.NOW) return "NOW";
  if (score >= PRIORITY_THRESHOLDS.NEXT) return "NEXT";
  return "LATER";
}

/** Human-readable evidence, derived only from the input record. */
function buildReasons(v: RiskInput, f: RiskFactors): string[] {
  const reasons: string[] = [];

  if (v.kev) reasons.push("Known exploited vulnerability");
  if (v.epss >= 0.7) reasons.push("High exploit probability");
  if (v.internetExposed) reasons.push("Internet-facing asset");
  if (v.businessImpact === "critical" || v.businessImpact === "high") {
    reasons.push("Critical business asset");
  }
  if (v.exploitAvailable) reasons.push("Public exploit available");
  if (v.assetCriticality === "critical") reasons.push("Critical production asset");
  if (v.environment === "production") reasons.push("Running in production");
  if (f.cvss >= 90) reasons.push("Critical CVSS severity");

  if (reasons.length === 0) {
    reasons.push("No exploitation evidence or elevated exposure detected");
  }
  return reasons;
}

function buildRecommendation(priority: Priority, v: RiskInput): string {
  switch (priority) {
    case "NOW":
      return "Patch immediately because exploitation evidence and environmental exposure indicate high immediate risk.";
    case "NEXT":
      return v.internetExposed
        ? "Schedule this in the next remediation window; the asset is reachable from the internet but there is no confirmed active exploitation."
        : "Schedule this in the next remediation window; risk is elevated but currently contained.";
    case "LATER":
      return "Defer to routine patching. Severity alone does not justify displacing higher-risk work with active exploitation or greater exposure.";
  }
}

/**
 * Primary entry point. Returns a fully explained, deterministic assessment.
 */
export function calculateRisk(vulnerability: RiskInput): RiskAssessment {
  const factors = getRiskFactors(vulnerability);

  const weighted =
    factors.exploitation * WEIGHTS.exploitation +
    factors.epss * WEIGHTS.epss +
    factors.exposure * WEIGHTS.exposure +
    factors.businessImpact * WEIGHTS.businessImpact +
    factors.cvss * WEIGHTS.cvss +
    factors.exploitability * WEIGHTS.exploitability;

  const score = clamp(Math.round(weighted), 0, 100);
  const priority = getPriority(score);

  return {
    cve: vulnerability.cve,
    score,
    priority,
    factors,
    reasons: buildReasons(vulnerability, factors),
    recommendation: buildRecommendation(priority, vulnerability),
  };
}
