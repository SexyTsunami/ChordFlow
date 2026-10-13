import { NextResponse } from "next/server";
import { z } from "zod";
import { aiChordAssistant } from "@/lib/providers/ai";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BodySchema = z.object({
  task: z.enum([
    "suggest-progression",
    "estimate-structure",
    "simplify-chords",
    "explain-progression",
    "suggest-capo",
    "align-chords",
    "convert-sheet",
  ]),
  songTitle: z.string().max(300).optional(),
  artist: z.string().max(300).optional(),
  key: z.string().max(16).nullable().optional(),
  userContent: z.string().max(12_000).optional(),
  chords: z.array(z.string().max(24)).max(200).optional(),
  notes: z.string().max(1000).optional(),
});

/** Optional AI chord assistance. Returns 501 when no API key is configured. */
export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "ai"), { limit: 8, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "rate_limited",
          message: "AI assistance is limited to 8 requests per minute.",
          hint: `Try again in ${limit.retryAfterSeconds}s.`,
        },
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "invalid_input", message: "Expected a JSON body." } },
      { status: 400 },
    );
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "invalid_input",
          message: "That request is not something the assistant can run.",
        },
      },
      { status: 400 },
    );
  }

  const result = await aiChordAssistant.run(parsed.data);
  if (!result.ok) {
    const status =
      result.error.code === "not_configured"
        ? 501
        : result.error.code === "unauthorized"
          ? 401
          : result.error.code === "rate_limited"
            ? 429
            : result.error.code === "timeout"
              ? 504
              : 502;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }

  return NextResponse.json(
    { ok: true, ...result.data },
    { headers: { "Cache-Control": "no-store" } },
  );
}
