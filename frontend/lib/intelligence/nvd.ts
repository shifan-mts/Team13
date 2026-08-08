/**
 * Minimal NVD enrichment — description and CVSS base score only.
 *
 * Server-side only. The public endpoint works without a key; NVD_API_KEY is
 * honoured if present purely to raise the rate limit. Failures return null and
 * the local dataset's values stand.
 */

const NVD_API_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0";
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const TIMEOUT_MS = 8_000;

export interface NvdRecord {
  cve: string;
  description?: string;
  cvss?: number;
}

const cache = new Map<string, { record: NvdRecord; fetchedAt: number }>();

function readEnv(key: string): string | undefined {
  return typeof process !== "undefined" ? process.env?.[key] : undefined;
}

/** Prefers CVSS v3.1, then v3.0, then v2 — whichever the record carries. */
function extractCvss(metrics: Record<string, unknown> | undefined): number | undefined {
  if (!metrics) return undefined;
  for (const key of ["cvssMetricV31", "cvssMetricV30", "cvssMetricV2"]) {
    const list = metrics[key];
    if (!Array.isArray(list) || list.length === 0) continue;
    const score = (list[0] as { cvssData?: { baseScore?: unknown } })?.cvssData?.baseScore;
    if (typeof score === "number" && score >= 0 && score <= 10) return score;
  }
  return undefined;
}

async function fetchOne(cve: string): Promise<NvdRecord | null> {
  try {
    const apiKey = readEnv("NVD_API_KEY");
    const response = await fetch(`${NVD_API_URL}?cveId=${encodeURIComponent(cve)}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        Accept: "application/json",
        ...(apiKey ? { apiKey } : {}),
      },
    });
    if (!response.ok) return null;

    const body: unknown = await response.json();
    const item = (body as { vulnerabilities?: unknown[] })?.vulnerabilities?.[0];
    const record = (item as { cve?: Record<string, unknown> })?.cve;
    if (!record) return null;

    const descriptions = record.descriptions;
    const english = Array.isArray(descriptions)
      ? descriptions.find((d) => (d as { lang?: string })?.lang === "en")
      : undefined;
    const description = (english as { value?: unknown })?.value;

    return {
      cve,
      description: typeof description === "string" ? description : undefined,
      cvss: extractCvss(record.metrics as Record<string, unknown> | undefined),
    };
  } catch {
    return null;
  }
}

/**
 * Enriches the given CVEs. NVD is rate-limited without a key, so this is
 * capped and sequential; callers should treat it as best-effort.
 */
export async function getNvdRecords(
  cveIds: string[],
  limit = 5
): Promise<Map<string, NvdRecord> | null> {
  const records = new Map<string, NvdRecord>();
  const missing: string[] = [];

  for (const cve of [...new Set(cveIds.map((c) => c.toUpperCase()))]) {
    const entry = cache.get(cve);
    if (entry && Date.now() - entry.fetchedAt < TTL_MS) records.set(cve, entry.record);
    else missing.push(cve);
  }

  let anyFetched = false;
  for (const cve of missing.slice(0, limit)) {
    const record = await fetchOne(cve);
    if (!record) continue;
    anyFetched = true;
    cache.set(cve, { record, fetchedAt: Date.now() });
    records.set(cve, record);
  }

  if (!anyFetched && records.size === 0) return null;
  return records;
}

/** Test seam — drops cached records. */
export function __resetNvdCache(): void {
  cache.clear();
}
