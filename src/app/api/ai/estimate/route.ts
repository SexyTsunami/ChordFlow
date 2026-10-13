import { NextResponse } from "next/server";
import { z } from "zod";
import { SectionTypeSchema } from "@/lib/domain/types";
import { normalizeEstimateChord } from "@/lib/music/chords";
import { AI_DISCLAIMER, aiChordAssistant } from "@/lib/providers/ai";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const BodySchema = z.object({
  title: z.string().min(1).max(300),
  artist: z.string().max(300).default(""),
});

const SectionSchema = z.object({
  type: SectionTypeSchema,
  label: z.string().max(40).optional(),
  chords: z.array(z.string().max(16)).min(1).max(24),
});

/**
 * One-song chords-only estimate from title + artist.
 *
 * This does not read Spotify audio, does not scrape tab sites, and does not
 * return lyrics. The client calls it once per track so a long playlist cannot
 * blow a single serverless timeout.
 */
export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "ai-estimate"), {
    limit: 120,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "rate_limited",
          message: "Estimate rate limit reached.",
          hint: `Wait ${limit.retryAfterSeconds}s, then the playlist run will continue.`,
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
      { ok: false, error: { code: "invalid_input", message: "A song title is required." } },
      { status: 400 },
    );
  }

  const result = await aiChordAssistant.run({
    task: "estimate-structure",
    songTitle: parsed.data.title,
    artist: parsed.data.artist,
    notes: "Chords only. No lyrics.",
  });

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
    return NextResponse.json(
      { ok: false, error: result.error },
      {
        status,
        headers: status === 429 ? { "Retry-After": "20" } : undefined,
      },
    );
  }

  const rawSections = result.data.suggestion?.sections ?? [];
  const sections = rawSections
    .map((section) => {
      const rawType = String(section.type ?? "verse")
        .toLowerCase()
        .replace(/[_ ]+/g, "-");
      const aliased =
        rawType === "prechorus" || rawType === "pre-chorus"
          ? "pre-chorus"
          : rawType === "hook" || rawType === "refrain"
            ? "chorus"
            : rawType === "coda" || rawType === "ending"
              ? "outro"
              : rawType === "solo" || rawType === "instrumental"
                ? "bridge"
                : rawType;
      const typeParsed = SectionTypeSchema.safeParse(aliased);
      const chords = (section.chords ?? [])
        .map((symbol) => normalizeEstimateChord(symbol))
        .filter((symbol): symbol is string => Boolean(symbol));
      if (!typeParsed.success || chords.length === 0) return null;
      const checked = SectionSchema.safeParse({
        type: typeParsed.data,
        label: section.label,
        chords,
      });
      return checked.success ? checked.data : null;
    })
    .filter((section): section is z.infer<typeof SectionSchema> => section !== null);

  if (sections.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "upstream_error",
          message: "The model did not return a usable chord structure.",
        },
      },
      { status: 502 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      title: parsed.data.title,
      artist: parsed.data.artist,
      key: result.data.suggestion?.key ?? null,
      capo:
        typeof result.data.suggestion?.capo === "number"
          ? result.data.suggestion.capo
          : 0,
      sections,
      message: result.data.message,
      model: result.data.model,
      disclaimer: result.data.disclaimer || AI_DISCLAIMER,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
