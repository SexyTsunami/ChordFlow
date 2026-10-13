import { NextResponse } from "next/server";
import { z } from "zod";
import { activeArrangementProvider } from "@/lib/providers/arrangements";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  title: z.string().min(1).max(300),
  artist: z.string().max(300).default(""),
});

/**
 * Find places where a chord arrangement can legitimately be obtained.
 * ChordFlow deliberately returns links, not scraped chord sheets.
 */
export async function GET(request: Request) {
  const limit = rateLimit(clientKey(request, "arrangements"), {
    limit: 40,
    windowMs: 60_000,
  });
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

  const provider = activeArrangementProvider();
  const result = await provider.search(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    provider: provider.id,
    results: result.data,
    notice:
      "ChordFlow links to arrangements rather than copying them. Transcribe what you find into your own arrangement, or paste a sheet you have the right to use.",
  });
}
