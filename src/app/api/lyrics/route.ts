import { NextResponse } from "next/server";
import { z } from "zod";
import { activeLyricsProvider } from "@/lib/providers/lyrics";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  title: z.string().min(1).max(300),
  artist: z.string().max(300).default(""),
});

/**
 * Lyrics lookup.
 *
 * With no licensed provider configured this still returns 200 — with
 * `document: null` and a list of authorised places to read the lyrics. That is
 * a real answer, not a stub pretending an integration succeeded.
 */
export async function GET(request: Request) {
  const limit = rateLimit(clientKey(request, "lyrics"), { limit: 30, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: { code: "rate_limited", message: "Slow down a moment." } },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const url = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    title: url.searchParams.get("title") ?? "",
    artist: url.searchParams.get("artist") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: "invalid_input", message: "A song title is required." } },
      { status: 400 },
    );
  }

  const provider = activeLyricsProvider();
  const result = await provider.fetchLyrics(parsed.data);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, provider: provider.id, error: result.error },
      { status: result.error.code === "not_found" ? 404 : 502 },
    );
  }

  return NextResponse.json(
    { ok: true, provider: provider.id, providerName: provider.name, ...result.data },
    { headers: { "Cache-Control": "private, max-age=300" } },
  );
}
