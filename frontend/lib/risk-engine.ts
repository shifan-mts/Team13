import { Priority, RiskFactor, RiskResult, Vulnerability } from "@/types/vulnerability";

export const PRIORITY_THRESHOLDS = {
  NOW: 90,
  NEXT: 70,
};

export const WEIGHTS = {
  EXPLOITATION: 0.30,
  EPSS: 0.20,
  EXPOSURE: 0.15,
  BUSINESS: 0.15,
  CVSS: 0.10,
  EXPLOITABILITY: 0.10,
};

export function getPriority(score: number): Priority {
  if (score >= PRIORITY_THRESHOLDS.NOW) return "NOW";
  if (score >= PRIORITY_THRESHOLDS.NEXT) return "NEXT";
  return "LATER";
}

export function getRiskFactors(v: Vulnerability): RiskFactor[] {
  // 1. Exploitation Evidence (30%)
  const exploitationScore = v.kev ? 100 : 0;
  const exploitationEvidence = v.kev
    ? "Confirmed active exploitation listed in CISA KEV catalog"
    : "No active exploitation in CISA KEV catalog";

  // 2. EPSS (20%)
  const epssScore = Math.min(100, Math.round(v.epss * 100));
  const epssEvidence = `EPSS probability score: ${(v.epss * 100).toFixed(1)}%`;

  // 3. Asset Exposure (15%)
  const exposureScore = v.internetExposed ? 100 : 30;
  const exposureEvidence = v.internetExposed
    ? "Directly internet-facing service"
    : "Internal network asset (segmented)";

  // 4. Business Criticality (15%)
  const criticalityMap: Record<string, number> = {
    critical: 100,
    high: 75,
    medium: 45,
    low: 20,
  };
  const envMultiplierMap: Record<string, number> = {
    production: 1.0,
    staging: 0.7,
    development: 0.4,
  };
  const baseBiz = criticalityMap[v.businessImpact] ?? 50;
  const envMult = envMultiplierMap[v.environment] ?? 0.8;
  const businessScore = Math.min(100, Math.round(baseBiz * envMult));
  const businessEvidence = `${v.businessImpact.toUpperCase()} business impact in ${v.environment.toUpperCase()} environment`;

  // 5. CVSS Severity (10%)
  const cvssScore = Math.min(100, Math.round(v.cvss * 10));
  const cvssEvidence = `Base CVSS Score: ${v.cvss.toFixed(1)} / 10`;

  // 6. Exploitability (10%)
  const exploitabilityScore = v.exploitAvailable ? 100 : 25;
  const exploitabilityEvidence = v.exploitAvailable
    ? "Public functional exploit code published (PoC/Metasploit)"
    : "No public exploit code available";

  const factors: RiskFactor[] = [
    {
      name: "Exploitation Evidence",
      score: exploitationScore,
      weight: WEIGHTS.EXPLOITATION,
      evidence: exploitationEvidence,
    },
    {
      name: "EPSS Exploit Probability",
      score: epssScore,
      weight: WEIGHTS.EPSS,
      evidence: epssEvidence,
    },
    {
      name: "Asset Exposure",
      score: exposureScore,
      weight: WEIGHTS.EXPOSURE,
      evidence: exposureEvidence,
    },
    {
      name: "Business Criticality",
      score: businessScore,
      weight: WEIGHTS.BUSINESS,
      evidence: businessEvidence,
    },
    {
      name: "CVSS Severity",
      score: cvssScore,
      weight: WEIGHTS.CVSS,
      evidence: cvssEvidence,
    },
    {
      name: "Exploit Availability",
      score: exploitabilityScore,
      weight: WEIGHTS.EXPLOITABILITY,
      evidence: exploitabilityEvidence,
    },
  ];

  // Return sorted by weight descending
  return factors.sort((a, b) => b.weight - a.weight);
}

export function calculateRisk(v: Vulnerability): RiskResult {
  const factors = getRiskFactors(v);

  const rawScore = factors.reduce(
    (sum, factor) => sum + factor.score * factor.weight,
    0
  );

  const roundedScore = Math.min(100, Math.max(0, Math.round(rawScore)));
  const priority = getPriority(roundedScore);

  return {
    vulnerability: v,
    score: roundedScore,
    priority,
    factors,
  };
}
