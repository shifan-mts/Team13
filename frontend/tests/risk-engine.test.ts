import { describe, expect, it } from "vitest";

import {
  PRIORITY_THRESHOLDS,
  calculateRisk,
  getPriority,
  getRiskFactors,
} from "@/lib/risk-engine";
import type { RiskResult, Vulnerability } from "@/types/vulnerability";

/** Baseline record; each test overrides only the fields it cares about. */
function vuln(overrides: Partial<Vulnerability> = {}): Vulnerability {
  return {
    id: "vuln-test",
    cve: "CVE-TEST-0000",
    description: "Synthetic record for engine tests.",
    cvss: 5,
    epss: 0.05,
    kev: false,
    exploitAvailable: false,
    internetExposed: false,
    assetName: "test-asset",
    assetCriticality: "medium",
    environment: "development",
    businessImpact: "medium",
    ...overrides,
  };
}

/** factors[] is an array of named entries; look one up by name. */
function factor(result: RiskResult, name: string): number {
  const match = result.factors.find((f) => f.name === name);
  if (!match) throw new Error(`missing factor: ${name}`);
  return match.score;
}

/** overview.md §4 — the inversion the whole product rests on. */
const SCENARIO_A = vuln({
  cve: "CVE-DEMO-A",
  cvss: 9.8,
  epss: 0.1,
  kev: false,
  exploitAvailable: false,
  internetExposed: false,
  assetCriticality: "low",
  businessImpact: "low",
  environment: "development",
});

const SCENARIO_B = vuln({
  cve: "CVE-DEMO-B",
  cvss: 8.1,
  epss: 0.97,
  kev: true,
  exploitAvailable: true,
  internetExposed: true,
  assetCriticality: "critical",
  businessImpact: "critical",
  environment: "production",
});

describe("critical validation scenario", () => {
  it("ranks the actively exploited 8.1 above the dormant 9.8", () => {
    const a = calculateRisk(SCENARIO_A);
    const b = calculateRisk(SCENARIO_B);

    expect(b.score).toBeGreaterThan(a.score);
    expect(b.score - a.score).toBeGreaterThan(30);
    expect(b.priority).toBe("NOW");
    expect(a.priority).toBe("LATER");
  });
});

describe("calculateRisk", () => {
  it("scores an actively exploited, exposed vulnerability as NOW", () => {
    const result = calculateRisk(SCENARIO_B);

    expect(result.score).toBeGreaterThanOrEqual(PRIORITY_THRESHOLDS.NOW);
    expect(result.priority).toBe("NOW");
    expect(factor(result, "Exploitation Evidence")).toBe(100);
    expect(factor(result, "Asset Exposure")).toBe(100);
  });

  it("scores high CVSS with no exploitation well below the exploited case", () => {
    const result = calculateRisk(SCENARIO_A);

    expect(factor(result, "CVSS Severity")).toBe(98);
    expect(factor(result, "Exploitation Evidence")).toBe(0);
    expect(result.score).toBeLessThan(PRIORITY_THRESHOLDS.NEXT);
  });

  it("classifies a genuinely low-risk vulnerability as LATER", () => {
    const result = calculateRisk(vuln({ cvss: 3.1, epss: 0.01 }));

    expect(result.priority).toBe("LATER");
  });

  it("normalizes CVSS and EPSS onto 0-100", () => {
    const result = calculateRisk(vuln({ cvss: 8.1, epss: 0.97 }));

    expect(factor(result, "CVSS Severity")).toBe(81);
    expect(factor(result, "EPSS Exploit Probability")).toBe(97);
  });

  it("keeps the score an integer within 0-100 across extremes", () => {
    const inputs: Vulnerability[] = [
      vuln({ cvss: 0, epss: 0 }),
      vuln({ cvss: 10, epss: 1 }),
      SCENARIO_A,
      SCENARIO_B,
      vuln({
        cvss: 10,
        epss: 1,
        kev: true,
        exploitAvailable: true,
        internetExposed: true,
        assetCriticality: "critical",
        businessImpact: "critical",
        environment: "production",
      }),
    ];

    for (const input of inputs) {
      const { score } = calculateRisk(input);
      expect(Number.isInteger(score)).toBe(true);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it("is deterministic for identical input", () => {
    expect(calculateRisk(SCENARIO_B)).toEqual(calculateRisk(SCENARIO_B));
  });

  it("returns the vulnerability and all six factors, weight-sorted", () => {
    const result = calculateRisk(SCENARIO_B);

    expect(result.vulnerability).toEqual(SCENARIO_B);
    expect(result.factors).toHaveLength(6);

    const weights = result.factors.map((f) => f.weight);
    expect(weights).toEqual([...weights].sort((a, b) => b - a));
    expect(weights.reduce((sum, w) => sum + w, 0)).toBeCloseTo(1);
  });

  it("gives every factor human-readable evidence", () => {
    for (const f of getRiskFactors(SCENARIO_B)) {
      expect(f.evidence.length).toBeGreaterThan(0);
    }
  });
});

describe("getPriority boundaries", () => {
  it.each([
    [100, "NOW"],
    [90, "NOW"],
    [89, "NEXT"],
    [70, "NEXT"],
    [69, "LATER"],
    [0, "LATER"],
  ])("maps %i to %s", (score, expected) => {
    expect(getPriority(score)).toBe(expected);
  });
});
