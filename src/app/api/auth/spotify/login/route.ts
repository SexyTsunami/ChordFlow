import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { serverEnv } from "@/lib/env";
import { buildSpotifyAuthorizeUrl, isSpotifyConfigured } from "@/lib/providers/spotify";
import { SPOTIFY_STATE_COOKIE } from "@/lib/providers/spotify-cookies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Start the Spotify Authorization Code flow for private playlists. */
export function GET(request: Request) {
  if (!isSpotifyConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "not_configured",
          message: "Spotify is not configured.",
          hint: "Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.",
        },
      },
      { status: 501 },
    );
  }

  const origin = new URL(request.url).origin || serverEnv.appUrl;
  const redirectUri = `${origin}/api/auth/spotify/callback`;
  const state = randomBytes(16).toString("hex");

  const response = NextResponse.redirect(buildSpotifyAuthorizeUrl(state, redirectUri));
  response.cookies.set(SPOTIFY_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: "/",
    maxAge: 600,
  });
  return response;
}
