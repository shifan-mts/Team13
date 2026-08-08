import { RiskResult } from "@/types/vulnerability";

export interface ExplanationOutput {
  summary: string;
  remediationAdvice: string;
  keyDrivers: string[];
  recommendedCommand?: string;
}

export function generateAiExplanation(result: RiskResult): ExplanationOutput {
  const { vulnerability: v, score, priority, factors } = result;

  const topFactors = factors
    .filter((f) => f.score >= 50)
    .map((f) => f.evidence);

  let summary = "";
  let remediationAdvice = "";
  let recommendedCommand = "";

  if (priority === "NOW") {
    summary = `${v.cve} is categorized as PATCH NOW with an urgent Risk Score of ${score}/100. `;
    if (v.kev && v.internetExposed) {
      summary += `This vulnerability is currently being actively exploited in the wild and affects the internet-exposed critical asset '${v.assetName}'. Immediate remediation within 24 hours is strongly advised to prevent perimeter breach.`;
    } else if (v.kev) {
      summary += `Confirmed active exploitation listed in CISA KEV catalog combined with high EPSS probability (${(v.epss * 100).toFixed(1)}%) presents severe operational threat to ${v.assetName}.`;
    } else {
      summary += `High exploit probability combined with critical asset exposure requires immediate priority patching over unexploited higher-CVSS internal systems.`;
    }

    remediationAdvice = `Apply vendor patch immediately or isolate asset '${v.assetName}' from public network access. ${v.remediationAction ?? "Refer to security vendor advisory."}`;
    recommendedCommand = `sudo apt-get update && sudo apt-get install --only-upgrade ${v.vendor?.toLowerCase().replace(/\s+/g, "-") || "package-name"}`;
  } else if (priority === "NEXT") {
    summary = `${v.cve} has a Risk Score of ${score}/100 and is assigned to PATCH NEXT. While it poses significant potential risk to '${v.assetName}', it lacks active weaponized exploitation signals in public threat feeds.`;
    remediationAdvice = `Schedule patching within the upcoming standard 7-day maintenance window. ${v.remediationAction ?? "Monitor threat intelligence for active exploitation spikes."}`;
    recommendedCommand = `# Schedule remediation for maintenance window\nsudo systemctl status ${v.assetName.split("-")[0] || "service"}`;
  } else {
    summary = `${v.cve} carries a Risk Score of ${score}/100 (PATCH LATER). It affects internal or low-criticality asset '${v.assetName}' and has low exploit probability (${(v.epss * 100).toFixed(1)}%).`;
    remediationAdvice = `Address during routine quarterly maintenance cycle. Implement defense-in-depth network segmentation as compensating control.`;
    recommendedCommand = `# Routine check\napt-cache policy ${v.vendor?.toLowerCase() || "lib-package"}`;
  }

  return {
    summary,
    remediationAdvice,
    keyDrivers: topFactors.length > 0 ? topFactors : factors.map((f) => f.evidence),
    recommendedCommand,
  };
}

export function generateAiComparison(resA: RiskResult, resB: RiskResult): string {
  const higher = resA.score >= resB.score ? resA : resB;
  const lower = resA.score >= resB.score ? resB : resA;

  const vHigh = higher.vulnerability;
  const vLow = lower.vulnerability;

  return `
### Prioritization Rationale: Why ${vHigh.cve} outranks ${vLow.cve}

**${vHigh.cve} (Risk Score: ${higher.score}/100 — ${higher.priority})** should be remediated before **${vLow.cve} (Risk Score: ${lower.score}/100 — ${lower.priority})** for the following structural reasons:

1. **Real-World Exploitation**: ${vHigh.kev
      ? `Confirmed active exploitation in CISA KEV catalog for ${vHigh.cve}.`
      : `Higher EPSS exploit probability (${(vHigh.epss * 100).toFixed(1)}% vs ${(vLow.epss * 100).toFixed(1)}%).`
    }
2. **Asset Exposure**: ${vHigh.internetExposed && !vLow.internetExposed
      ? `${vHigh.cve} affects an internet-facing asset (${vHigh.assetName}), whereas ${vLow.cve} is contained within an internal network segment (${vLow.assetName}).`
      : `Asset exposure score for ${vHigh.cve} is ${higher.factors.find((f) => f.name === "Asset Exposure")?.score ?? 0}/100.`
    }
3. **Business Impact**: ${vHigh.cve} impacts a ${vHigh.businessImpact.toUpperCase()} criticality asset in ${vHigh.environment.toUpperCase()} environment.

*Note: Even if ${vLow.cve} has a higher base CVSS score (${vLow.cvss} vs ${vHigh.cvss}), PatchPilot prioritizes ${vHigh.cve} because real-world exploitability and exposure create an immediate threat.*
`.trim();
}
