import { NextResponse } from "next/server";
import { exchangeSpotifyCode } from "@/lib/providers/spotify";
import {
  SPOTIFY_STATE_COOKIE,
  SPOTIFY_TOKEN_COOKIE,
} from "@/lib/providers/spotify-cookies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function back(origin: string, params: Record<string, string>) {
  const url = new URL("/settings", origin);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const denied = url.searchParams.get("error");

  if (denied) {
    return back(origin, { spotify: "denied" });
  }

  const expectedState = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SPOTIFY_STATE_COOKIE}=`))
    ?.split("=")[1];

  if (!code || !state || !expectedState || state !== expectedState) {
    return back(origin, { spotify: "state_mismatch" });
  }

  const result = await exchangeSpotifyCode(code, `${origin}/api/auth/spotify/callback`);
  if (!result.ok) {
    return back(origin, { spotify: "failed" });
  }

  const response = back(origin, { spotify: "connected" });
  const secure = origin.startsWith("https://");
  response.cookies.set(SPOTIFY_TOKEN_COOKIE, result.data.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    // Match the token's own lifetime; we do not persist refresh tokens.
    maxAge: Math.max(60, result.data.expiresIn - 60),
  });
  response.cookies.set(SPOTIFY_STATE_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
