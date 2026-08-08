import { describe, expect, it } from "vitest";

import {
  calculateRisk,
  getPriority,
  type RiskInput,
} from "@/lib/risk-engine";

/** Baseline record; each test overrides only the fields it cares about. */
function vuln(overrides: Partial<RiskInput> = {}): RiskInput {
  return {
    cve: "CVE-TEST-0000",
    cvss: 5,
    epss: 0.05,
    kev: false,
    exploitAvailable: false,
    internetExposed: false,
    assetCriticality: "medium",
    businessImpact: "medium",
    environment: "development",
    ...overrides,
  };
}

/** Overview §4 / spec §8 — the scenario the whole product rests on. */
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

    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.priority).toBe("NOW");
    expect(result.reasons).toContain("Known exploited vulnerability");
    expect(result.reasons).toContain("Internet-facing asset");
    expect(result.recommendation).toMatch(/immediately/i);
  });

  it("scores high CVSS with no exploitation well below the exploited case", () => {
    const result = calculateRisk(SCENARIO_A);

    expect(result.factors.cvss).toBe(98);
    expect(result.score).toBeLessThan(70);
    expect(result.reasons).not.toContain("Known exploited vulnerability");
  });

  it("classifies a genuinely low-risk vulnerability as LATER", () => {
    const result = calculateRisk(vuln({ cvss: 3.1, epss: 0.01 }));

    expect(result.priority).toBe("LATER");
    expect(result.recommendation).toMatch(/routine/i);
  });

  it("normalizes CVSS and EPSS onto 0-100", () => {
    const { factors } = calculateRisk(vuln({ cvss: 8.1, epss: 0.97 }));

    expect(factors.cvss).toBeCloseTo(81);
    expect(factors.epss).toBeCloseTo(97);
  });

  it("keeps the score an integer within 0-100 across extremes", () => {
    const inputs: RiskInput[] = [
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
