/**
 * EPSS exploit-probability scores from FIRST.
 *
 * Server-side only. Batched into one request, cached per CVE. Failures
 * return null so callers keep the local dataset's `epss` value — we never
 * invent a probability.
 */

const EPSS_API_URL = "https://api.first.org/data/v1/epss";
const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const TIMEOUT_MS = 8_000;
const MAX_BATCH = 100;

const cache = new Map<string, { score: number; fetchedAt: number }>();

function cached(cve: string): number | undefined {
  const entry = cache.get(cve);
  if (entry && Date.now() - entry.fetchedAt < TTL_MS) return entry.score;
  return undefined;
}

async function fetchBatch(cves: string[]): Promise<Map<string, number> | null> {
  try {
    const url = `${EPSS_API_URL}?cve=${encodeURIComponent(cves.join(","))}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;

    const body: unknown = await response.json();
    const rows = (body as { data?: unknown })?.data;
    if (!Array.isArray(rows)) return null;

    const scores = new Map<string, number>();
    for (const row of rows) {
      const id = (row as { cve?: unknown })?.cve;
      const raw = (row as { epss?: unknown })?.epss;
      const score = Number(raw);
      if (typeof id === "string" && Number.isFinite(score) && score >= 0 && score <= 1) {
        scores.set(id.toUpperCase(), score);
      }
    }
    return scores;
  } catch {
    return null;
  }
}

/**
 * Returns EPSS scores (0–1) for the requested CVEs. Missing entries simply
 * aren't in the map. Returns null only when the feed is entirely unreachable
 * and nothing was cached.
 */
export async function getEpssScores(
  cveIds: string[]
): Promise<Map<string, number> | null> {
  const wanted = [...new Set(cveIds.map((c) => c.toUpperCase()))];
  const scores = new Map<string, number>();
  const missing: string[] = [];

  for (const cve of wanted) {
    const hit = cached(cve);
    if (hit === undefined) missing.push(cve);
    else scores.set(cve, hit);
  }

  if (missing.length === 0) return scores;

  let anyFetched = false;
  for (let i = 0; i < missing.length; i += MAX_BATCH) {
    const batch = missing.slice(i, i + MAX_BATCH);
    const fetched = await fetchBatch(batch);
    if (!fetched) continue;
    anyFetched = true;
    for (const [cve, score] of fetched) {
      cache.set(cve, { score, fetchedAt: Date.now() });
      scores.set(cve, score);
    }
  }

  if (!anyFetched && scores.size === 0) return null;
  return scores;
}

/** Test seam — drops cached scores. */
export function __resetEpssCache(): void {
  cache.clear();
}
