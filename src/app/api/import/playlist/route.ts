import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { parsePlaylistUrl } from "@/lib/import/parse-url";
import { fetchSpotifyPlaylist } from "@/lib/providers/spotify";
import { fetchYouTubePlaylist } from "@/lib/providers/youtube";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { SPOTIFY_TOKEN_COOKIE } from "@/lib/providers/spotify-cookies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  url: z.string().min(1).max(2048),
});

/**
 * Import a playlist from a provider URL.
 *
 * Failures are reported honestly: a missing API key returns `not_configured`
 * and the UI tells the user to use manual import instead. Nothing is ever
 * faked to make an unconfigured integration look like it worked.
 */
export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "import"), {
    limit: 15,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "rate_limited",
          message: "Too many imports in a short time.",
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

  const parsedBody = BodySchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { ok: false, error: { code: "invalid_input", message: "A playlist URL is required." } },
      { status: 400 },
    );
  }

  const target = parsePlaylistUrl(parsedBody.data.url);
  if (!target.ok) {
    return NextResponse.json(
      { ok: false, error: { code: "invalid_input", message: target.reason } },
      { status: 400 },
    );
  }

  const result =
    target.provider === "spotify"
      ? await fetchSpotifyPlaylist(
          target.playlistId,
          (await cookies()).get(SPOTIFY_TOKEN_COOKIE)?.value,
        )
      : await fetchYouTubePlaylist(target.playlistId);

  if (!result.ok) {
    const status =
      result.error.code === "not_configured"
        ? 501
        : result.error.code === "unauthorized"
          ? 401
          : result.error.code === "forbidden"
            ? 403
            : result.error.code === "not_found"
              ? 404
              : result.error.code === "rate_limited" || result.error.code === "quota_exceeded"
                ? 429
                : result.error.code === "timeout"
                  ? 504
                  : 502;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }

  return NextResponse.json(
    { ok: true, playlist: result.data },
    { headers: { "Cache-Control": "no-store" } },
  );
}
