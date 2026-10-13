import { NextResponse } from "next/server";
import { providerStatus } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Booleans only. This endpoint exists so the UI can say "Spotify is not
 * configured" before the user wastes a click — it never returns key material.
 */
export function GET() {
  return NextResponse.json(providerStatus(), {
    headers: { "Cache-Control": "no-store" },
  });
}
