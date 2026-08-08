import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as aiCompare } from "@/app/api/ai/compare/route";
import { POST as aiExplain } from "@/app/api/ai/explain/route";
import { POST as analyze } from "@/app/api/analyze/route";
import { GET as getVulnerability } from "@/app/api/vulnerabilities/[id]/route";
import { GET as listVulnerabilities } from "@/app/api/vulnerabilities/route";
import { enrichVulnerabilities } from "@/lib/intelligence/normalize";
import { __resetEpssCache } from "@/lib/intelligence/epss";
import { __resetKevCache } from "@/lib/intelligence/kev";
import { __resetNvdCache } from "@/lib/intelligence/nvd";
import { getVulnerabilities } from "@/lib/vulnerabilities";

function post(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Simulates every outbound call failing — Ollama and the intel feeds. */
function killNetwork() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new TypeError("fetch failed: ECONNREFUSED");
    }) as unknown as typeof fetch
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  __resetKevCache();
  __resetEpssCache();
  __resetNvdCache();
});

describe("GET /api/vulnerabilities", () => {
  it("returns the scored dataset sorted by risk descending", async () => {
    const response = await listVulnerabilities(
      new Request("http://localhost/api/vulnerabilities")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.count).toBe(18);
    expect(body.source).toBe("local");
    expect(body.stats).toMatchObject({
      total: 18,
      nowCount: 11,
      nextCount: 3,
      laterCount: 4,
      kevCount: 15,
      avgRiskScore: 79,
    });

    const scores = body.data.map((r: { score: number }) => r.score);
    expect(scores).toEqual([...scores].sort((a: number, b: number) => b - a));
  });
});

describe("GET /api/vulnerabilities/:id", () => {
  it("returns vulnerability and engine-computed risk", async () => {
    const response = await getVulnerability(
      new Request("http://localhost/api/vulnerabilities/CVE-2024-1709"),
      { params: Promise.resolve({ id: "CVE-2024-1709" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.vulnerability.cve).toBe("CVE-2024-1709");
    expect(body.data.risk.score).toBe(99);
    expect(body.data.risk.priority).toBe("NOW");
  });

  it("404s for an unknown CVE", async () => {
    const response = await getVulnerability(
      new Request("http://localhost/api/vulnerabilities/CVE-0000-0000"),
      { params: Promise.resolve({ id: "CVE-0000-0000" }) }
    );
    expect(response.status).toBe(404);
    expect((await response.json()).success).toBe(false);
  });
});

describe("POST /api/analyze", () => {
  it("analyzes the whole dataset when given no body", async () => {
    const response = await analyze(post("http://localhost/api/analyze", {}));
    const body = await response.json();

    expect(body.count).toBe(18);
    const scores = body.data.map((r: { score: number }) => r.score);
    expect(scores).toEqual([...scores].sort((a: number, b: number) => b - a));
  });

  it("filters to requested ids", async () => {
    const response = await analyze(
      post("http://localhost/api/analyze", { ids: ["CVE-2024-1709", "CVE-2023-22515"] })
    );
    const body = await response.json();

    expect(body.count).toBe(2);
    expect(body.data[0].vulnerability.cve).toBe("CVE-2024-1709");
  });

  it("rejects malformed vulnerability records", async () => {
    const response = await analyze(
      post("http://localhost/api/analyze", { vulnerabilities: [{ cve: "CVE-X" }] })
    );
    expect(response.status).toBe(400);
  });
});

describe("POST /api/ai/explain", () => {
  it("explains a CVE and reports the provider", async () => {
    killNetwork(); // Ollama unreachable -> deterministic path
    const response = await aiExplain(
      post("http://localhost/api/ai/explain", { vulnerability: "CVE-2024-1709" })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.cve).toBe("CVE-2024-1709");
    expect(body.score).toBe(99);
    expect(body.priority).toBe("NOW");
    expect(body.provider).toBe("fallback");
    expect(typeof body.summary).toBe("string");
    expect(Array.isArray(body.whyPrioritized)).toBe(true);
    expect(typeof body.recommendation).toBe("string");
  });

  it("ignores a client-supplied risk and recomputes it", async () => {
    killNetwork();
    const real = getVulnerabilities().find((v) => v.cve === "CVE-2023-22515")!;
    const response = await aiExplain(
      post("http://localhost/api/ai/explain", {
        vulnerability: real,
        risk: { score: 100, priority: "NOW" }, // spoofed
      })
    );
    const body = await response.json();

    expect(body.score).toBe(26);
    expect(body.priority).toBe("LATER");
  });

  it("400s on an unknown CVE", async () => {
    const response = await aiExplain(
      post("http://localhost/api/ai/explain", { vulnerability: "not-a-cve" })
    );
    expect(response.status).toBe(400);
  });
});

describe("POST /api/ai/compare", () => {
  it("picks the engine's higher-risk CVE even when its CVSS is lower", async () => {
    killNetwork();
    const response = await aiCompare(
      post("http://localhost/api/ai/compare", {
        cveIdA: "CVE-2024-23897", // CVSS 7.5, actively exploited
        cveIdB: "CVE-2023-22515", // CVSS 10.0, dormant
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.higherRiskCve).toBe("CVE-2024-23897");
    expect(body.a.cvss).toBeLessThan(body.b.cvss);
    expect(body.a.score).toBeGreaterThan(body.b.score);
    expect(body.provider).toBe("fallback");
  });

  it("400s when the two CVEs are the same", async () => {
    const response = await aiCompare(
      post("http://localhost/api/ai/compare", {
        cveIdA: "CVE-2024-1709",
        cveIdB: "CVE-2024-1709",
      })
    );
    expect(response.status).toBe(400);
  });
});

describe("intelligence fallback", () => {
  it("keeps every record and reports fallback when all feeds are down", async () => {
    killNetwork();
    const base = getVulnerabilities();
    const report = await enrichVulnerabilities(base, { nvdLimit: 1 });

    expect(report.vulnerabilities).toHaveLength(base.length);
    expect(report.sources).toEqual({ kev: "fallback", epss: "fallback", nvd: "fallback" });
    expect(report.warnings.length).toBe(3);
    expect(report.vulnerabilities[0].kev).toBe(base[0].kev);
  });
});
