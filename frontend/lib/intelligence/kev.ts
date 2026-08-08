/**
 * CISA Known Exploited Vulnerabilities catalog.
 *
 * Server-side only. Cached for the process lifetime so the catalog is
 * downloaded at most once per TTL. Every failure is swallowed — callers
 * receive `null` and fall back to the local dataset's `kev` values.
 */

const KEV_FEED_URL =
  "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";

const TTL_MS = 60 * 60 * 1000; // 1 hour
const TIMEOUT_MS = 8_000;

interface KevCache {
  cves: Set<string>;
  fetchedAt: number;
}

let cache: KevCache | null = null;
let inFlight: Promise<Set<string> | null> | null = null;

function isFresh(entry: KevCache | null): entry is KevCache {
  return entry !== null && Date.now() - entry.fetchedAt < TTL_MS;
}

async function download(): Promise<Set<string> | null> {
  try {
    const response = await fetch(KEV_FEED_URL, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;

    const body: unknown = await response.json();
    const entries = (body as { vulnerabilities?: unknown })?.vulnerabilities;
    if (!Array.isArray(entries)) return null;

    const cves = new Set<string>();
    for (const entry of entries) {
      const id = (entry as { cveID?: unknown })?.cveID;
      if (typeof id === "string") cves.add(id.toUpperCase());
    }
    return cves.size > 0 ? cves : null;
  } catch {
    return null;
  }
}

/** Returns the KEV CVE set, or null when the feed is unavailable. */
export async function getKevCatalog(): Promise<Set<string> | null> {
  if (isFresh(cache)) return cache.cves;

  // Collapse concurrent callers onto one download.
  if (!inFlight) {
    inFlight = download().then((cves) => {
      if (cves) cache = { cves, fetchedAt: Date.now() };
      inFlight = null;
      return cves;
    });
  }
  return inFlight;
}

/** Test seam — drops the cached catalog. */
export function __resetKevCache(): void {
  cache = null;
  inFlight = null;
}
