import { NextResponse } from "next/server";
import { loadChordDatabase } from "@/lib/data/load-chord-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const catalog = await loadChordDatabase();
    return NextResponse.json(catalog, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read ChordDatabase.";
    return NextResponse.json(
      { ok: false, error: message, songs: [], arrangements: [] },
      { status: 500 },
    );
  }
}
