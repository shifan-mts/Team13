import { NextResponse } from "next/server";

import { findInDataset, jsonError } from "@/lib/api-utils";
import { calculateRisk } from "@/lib/risk-engine";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET /api/vulnerabilities/:id — by dataset id or CVE. */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const vulnerability = findInDataset(id);

    if (!vulnerability) {
      return jsonError(`No vulnerability found for '${id}'.`, 404);
    }

    return NextResponse.json({
      success: true,
      data: { vulnerability, risk: calculateRisk(vulnerability) },
    });
  } catch {
    return jsonError("Unable to load vulnerability.", 500);
  }
}
