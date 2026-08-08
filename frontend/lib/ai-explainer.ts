import { RiskResult } from "@/types/vulnerability";

export interface ExplanationOutput {
  summary: string;
  remediationAdvice: string;
  keyDrivers: string[];
  recommendedCommand?: string;
  /** "local" = phrased by the Ollama model; "fallback" = deterministic templates. */
  provider?: "local" | "fallback";
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
    provider: "fallback",
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

/* ------------------------------------------------------------------ *
 * Optional local LLM (Ollama)
 *
 * The risk engine has already produced score, priority and factors.
 * The model only phrases them. It never computes, and a response that
 * contradicts the engine is discarded in favour of the deterministic
 * templates above.
 * ------------------------------------------------------------------ */

const DEFAULT_BASE_URL = "http://localhost:11434";
const DEFAULT_MODEL = "qwen3:4b";
const DEFAULT_TIMEOUT_MS = 20_000;

export interface LocalModelOptions {
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
}

const SYSTEM_PROMPT = `You are PatchPilot AI, a vulnerability prioritization assistant.

The numerical risk score and priority were already calculated
by a deterministic security risk engine.

You MUST NOT recalculate, change, or contradict them.

Use ONLY the supplied evidence.
Do not invent CVE facts, exploits, affected systems,
or remediation details.

Explain:
1. Why this vulnerability is risky.
2. Why PatchPilot assigned this priority.
3. What the IT team should do.
4. The concrete impact on the named asset if this is left unpatched.

Be concise and operational.

Reply with JSON only, in exactly this shape:
{"summary": string, "whyPrioritized": string[], "recommendation": string}`;

function readEnv(key: string): string | undefined {
  return typeof process !== "undefined" ? process.env?.[key] : undefined;
}

function buildUserPrompt(result: RiskResult): string {
  const { vulnerability: v, score, priority, factors } = result;

  return [
    `CVE: ${v.cve}`,
    `Description: ${v.description}`,
    `CVSS: ${v.cvss} / 10`,
    `EPSS: ${(v.epss * 100).toFixed(1)}%`,
    `Listed in CISA KEV: ${v.kev ? "yes" : "no"}`,
    `Public exploit available: ${v.exploitAvailable ? "yes" : "no"}`,
    `Internet exposed: ${v.internetExposed ? "yes" : "no"}`,
    `Affected asset: ${v.assetName}`,
    `Asset criticality: ${v.assetCriticality}`,
    `Business impact: ${v.businessImpact}`,
    `Environment: ${v.environment}`,
    ``,
    `Risk score (already calculated, do not change): ${score}/100`,
    `Priority (already calculated, do not change): ${priority}`,
    ``,
    `Risk factors:`,
    ...factors.map(
      (f) => `- ${f.name}: ${f.score}/100 (weight ${f.weight}) — ${f.evidence}`
    ),
  ].join("\n");
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const items = value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0
  );
  return items.length > 0 ? items : null;
}

/** Rejects output that restates a different score or priority than the engine's. */
function contradictsEngine(text: string, result: RiskResult): boolean {
  const claimedScores = [...text.matchAll(/(\d{1,3})\s*\/\s*100/g)].map((m) =>
    Number(m[1])
  );
  if (claimedScores.some((s) => s !== result.score)) return true;

  const otherPriorities = (["NOW", "NEXT", "LATER"] as const).filter(
    (p) => p !== result.priority
  );
  return otherPriorities.some((p) =>
    new RegExp(`PATCH\\s+${p}\\b`, "i").test(text)
  );
}

/**
 * Explain a RiskResult using a local Ollama model, falling back to the
 * deterministic templates on any failure. Never throws.
 */
async function requestOllamaJson(
  systemPrompt: string,
  userPrompt: string,
  options: LocalModelOptions
): Promise<unknown | null> {
  const baseUrl =
    options.baseUrl ?? readEnv("OLLAMA_BASE_URL") ?? DEFAULT_BASE_URL;
  const model = options.model ?? readEnv("OLLAMA_MODEL") ?? DEFAULT_MODEL;
  const envTimeout = Number(readEnv("OLLAMA_TIMEOUT_MS"));
  const timeoutMs =
    options.timeoutMs ??
    (Number.isFinite(envTimeout) && envTimeout > 0 ? envTimeout : DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        model,
        stream: false,
        format: "json",
        options: { temperature: 0.2 },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) return null;

    const body: unknown = await response.json();
    const content = (body as { message?: { content?: unknown } })?.message?.content;
    if (typeof content !== "string" || content.trim().length === 0) return null;

    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
}

export async function generateLocalExplanation(
  result: RiskResult,
  options: LocalModelOptions = {}
): Promise<ExplanationOutput> {
  const fallback = generateAiExplanation(result);

  try {
    const parsed = await requestOllamaJson(
      SYSTEM_PROMPT,
      buildUserPrompt(result),
      options
    );
    if (parsed === null) return fallback;

    const summary = (parsed as { summary?: unknown })?.summary;
    const recommendation = (parsed as { recommendation?: unknown })?.recommendation;
    const whyPrioritized = asStringArray(
      (parsed as { whyPrioritized?: unknown })?.whyPrioritized
    );

    if (
      typeof summary !== "string" ||
      summary.trim().length === 0 ||
      typeof recommendation !== "string" ||
      recommendation.trim().length === 0 ||
      !whyPrioritized
    ) {
      return fallback;
    }

    if (contradictsEngine(`${summary} ${recommendation} ${whyPrioritized.join(" ")}`, result)) {
      return fallback;
    }

    return {
      summary: summary.trim(),
      remediationAdvice: recommendation.trim(),
      keyDrivers: whyPrioritized,
      // Shell commands stay deterministic — the model must not invent them.
      recommendedCommand: fallback.recommendedCommand,
      provider: "local",
    };
  } catch {
    return fallback;
  }
}

const COMPARE_SYSTEM_PROMPT = `You are PatchPilot AI, a vulnerability prioritization assistant.

A deterministic security risk engine has ALREADY decided which of the two
vulnerabilities is higher priority. That decision is final.

You MUST NOT recalculate, change, or contradict the scores or priorities.
Use ONLY the supplied evidence. Do not invent CVE facts.

Explain in two or three sentences why the higher-risk CVE outranks the other,
even when its CVSS score is lower.

Reply with JSON only: {"comparisonSummary": string}`;

function buildComparePrompt(higher: RiskResult, lower: RiskResult): string {
  const describe = (r: RiskResult, label: string) =>
    [
      `${label}: ${r.vulnerability.cve}`,
      `  CVSS ${r.vulnerability.cvss}, EPSS ${(r.vulnerability.epss * 100).toFixed(1)}%`,
      `  KEV: ${r.vulnerability.kev ? "yes" : "no"}, public exploit: ${r.vulnerability.exploitAvailable ? "yes" : "no"}`,
      `  Internet exposed: ${r.vulnerability.internetExposed ? "yes" : "no"}`,
      `  Asset: ${r.vulnerability.assetName} (${r.vulnerability.businessImpact} impact, ${r.vulnerability.environment})`,
      `  Risk score (final): ${r.score}/100 — ${r.priority}`,
    ].join("\n");

  return [
    describe(higher, "HIGHER PRIORITY (decided by the engine)"),
    "",
    describe(lower, "LOWER PRIORITY"),
  ].join("\n");
}

export interface ComparisonOutput {
  higherRiskCve: string;
  comparisonSummary: string;
  provider: "local" | "fallback";
}

/**
 * Compares two scored vulnerabilities. The engine picks the winner; the model
 * only phrases the rationale, and is discarded if it names the wrong CVE or
 * restates a different score.
 */
export async function generateLocalComparison(
  resA: RiskResult,
  resB: RiskResult,
  options: LocalModelOptions = {}
): Promise<ComparisonOutput> {
  const higher = resA.score >= resB.score ? resA : resB;
  const lower = resA.score >= resB.score ? resB : resA;

  const deterministic: ComparisonOutput = {
    higherRiskCve: higher.vulnerability.cve,
    comparisonSummary: generateAiComparison(resA, resB),
    provider: "fallback",
  };

  const parsed = await requestOllamaJson(
    COMPARE_SYSTEM_PROMPT,
    buildComparePrompt(higher, lower),
    options
  );
  if (parsed === null) return deterministic;

  const summary = (parsed as { comparisonSummary?: unknown })?.comparisonSummary;
  if (typeof summary !== "string" || summary.trim().length === 0) return deterministic;

  // The model must not flip the engine's decision or restate other numbers.
  if (
    contradictsEngine(summary, higher) ||
    summary.toUpperCase().includes(lower.vulnerability.cve.toUpperCase() + " SHOULD BE PATCHED FIRST")
  ) {
    return deterministic;
  }

  return {
    higherRiskCve: higher.vulnerability.cve,
    comparisonSummary: summary.trim(),
    provider: "local",
  };
}
