import { afterEach, describe, expect, it, vi } from "vitest";

import { generateAiExplanation, generateLocalExplanation } from "@/lib/ai-explainer";
import { calculateRisk } from "@/lib/risk-engine";
import type { Vulnerability } from "@/types/vulnerability";

/** Risk Engine -> RiskResult (98 / NOW) -> AI Explainer. */
const EXPLOITED: Vulnerability = {
  id: "vuln-ai-test",
  cve: "CVE-DEMO-001",
  description: "Authentication bypass allowing remote administrative access.",
  cvss: 8.1,
  epss: 0.97,
  kev: true,
  exploitAvailable: true,
  internetExposed: true,
  assetName: "prod-vpn-gateway-01",
  assetCriticality: "critical",
  environment: "production",
  businessImpact: "critical",
};

const RESULT = calculateRisk(EXPLOITED);

/** Build a fake Ollama /api/chat response carrying `payload` as its content. */
function ollamaReplying(payload: unknown) {
  return vi.fn(async () => ({
    ok: true,
    json: async () => ({ message: { content: JSON.stringify(payload) } }),
  })) as unknown as typeof fetch;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("risk engine feeds the explainer", () => {
  it("produces a 98 / NOW result the explainer describes without recomputing", () => {
    expect(RESULT.score).toBe(98);
    expect(RESULT.priority).toBe("NOW");

    const explanation = generateAiExplanation(RESULT);

    expect(explanation.summary).toContain("98/100");
    expect(explanation.provider).toBe("fallback");
    expect(explanation.keyDrivers.length).toBeGreaterThan(0);
  });
});

describe("generateLocalExplanation", () => {
  it("uses the model's prose when Ollama responds well", async () => {
    vi.stubGlobal(
      "fetch",
      ollamaReplying({
        summary: "Actively exploited bypass on the internet-facing VPN gateway.",
        whyPrioritized: ["Listed in CISA KEV", "Internet-facing critical asset"],
        recommendation: "Patch the gateway today and review admin accounts.",
      })
    );

    const explanation = await generateLocalExplanation(RESULT);

    expect(explanation.provider).toBe("local");
    expect(explanation.summary).toContain("VPN gateway");
    expect(explanation.keyDrivers).toContain("Listed in CISA KEV");
    // Shell commands stay deterministic even on the model path.
    expect(explanation.recommendedCommand).toBe(
      generateAiExplanation(RESULT).recommendedCommand
    );
  });

  it("falls back when Ollama is unavailable (connection refused)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed: ECONNREFUSED");
      }) as unknown as typeof fetch
    );

    const explanation = await generateLocalExplanation(RESULT);

    expect(explanation.provider).toBe("fallback");
    expect(explanation.summary).toContain("98/100");
    expect(explanation.remediationAdvice.length).toBeGreaterThan(0);
  });

  it("falls back on a non-OK response (model not pulled)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch
    );

    await expect(
      generateLocalExplanation(RESULT).then((e) => e.provider)
    ).resolves.toBe("fallback");
  });

  it("falls back on malformed JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ message: { content: "not json at all" } }),
      })) as unknown as typeof fetch
    );

    const explanation = await generateLocalExplanation(RESULT);
    expect(explanation.provider).toBe("fallback");
  });

  it("discards output that contradicts the engine's score", async () => {
    vi.stubGlobal(
      "fetch",
      ollamaReplying({
        summary: "This scores 42/100 and is low concern.",
        whyPrioritized: ["Not really a problem"],
        recommendation: "Ignore it.",
      })
    );

    const explanation = await generateLocalExplanation(RESULT);

    expect(explanation.provider).toBe("fallback");
    expect(explanation.summary).toContain("98/100");
  });

  it("discards output that contradicts the engine's priority", async () => {
    vi.stubGlobal(
      "fetch",
      ollamaReplying({
        summary: "Assign this to PATCH LATER.",
        whyPrioritized: ["Low urgency"],
        recommendation: "Defer.",
      })
    );

    expect((await generateLocalExplanation(RESULT)).provider).toBe("fallback");
  });

  it("never throws, whatever the transport does", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("boom");
      }) as unknown as typeof fetch
    );

    await expect(generateLocalExplanation(RESULT)).resolves.toBeDefined();
  });
});
