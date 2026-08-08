/**
 * Folds live intelligence onto the local dataset.
 *
 * Every feed is optional and additive: a source that fails leaves the local
 * value untouched. The output is the same `Vulnerability` type the risk engine
 * already consumes — no competing model, no new fields.
 */

import type { Vulnerability } from "@/types/vulnerability";

import { getEpssScores } from "./epss";
import { getKevCatalog } from "./kev";
import { getNvdRecords } from "./nvd";

export type SourceStatus = "live" | "fallback";

export interface IntelligenceReport {
  vulnerabilities: Vulnerability[];
  sources: {
    kev: SourceStatus;
    epss: SourceStatus;
    nvd: SourceStatus;
  };
  warnings: string[];
  enrichedCount: number;
}

export interface EnrichOptions {
  /** Cap on NVD lookups; NVD is rate-limited without a key. */
  nvdLimit?: number;
}

/**
 * Returns the dataset with live KEV / EPSS / NVD values applied where
 * available. Never throws and never returns fewer records than it was given.
 */
export async function enrichVulnerabilities(
  base: Vulnerability[],
  options: EnrichOptions = {}
): Promise<IntelligenceReport> {
  const cveIds = base.map((v) => v.cve);
  const warnings: string[] = [];

  const [kevCatalog, epssScores, nvdRecords] = await Promise.all([
    getKevCatalog(),
    getEpssScores(cveIds),
    getNvdRecords(cveIds, options.nvdLimit ?? 5),
  ]);

  if (!kevCatalog) warnings.push("CISA KEV feed unavailable — using dataset KEV flags.");
  if (!epssScores) warnings.push("EPSS API unavailable — using dataset EPSS scores.");
  if (!nvdRecords) warnings.push("NVD API unavailable — using dataset descriptions and CVSS.");

  let enrichedCount = 0;

  const vulnerabilities = base.map((v) => {
    const key = v.cve.toUpperCase();
    const next: Vulnerability = { ...v };
    let touched = false;

    if (kevCatalog) {
      const live = kevCatalog.has(key);
      if (live !== v.kev) touched = true;
      next.kev = live;
    }

    const epss = epssScores?.get(key);
    if (typeof epss === "number") {
      if (epss !== v.epss) touched = true;
      next.epss = epss;
    }

    const nvd = nvdRecords?.get(key);
    if (nvd) {
      if (typeof nvd.cvss === "number" && nvd.cvss !== v.cvss) {
        next.cvss = nvd.cvss;
        touched = true;
      }
      if (nvd.description && nvd.description !== v.description) {
        next.description = nvd.description;
        touched = true;
      }
    }

    if (touched) enrichedCount++;
    return next;
  });

  return {
    vulnerabilities,
    sources: {
      kev: kevCatalog ? "live" : "fallback",
      epss: epssScores ? "live" : "fallback",
      nvd: nvdRecords ? "live" : "fallback",
    },
    warnings,
    enrichedCount,
  };
}
