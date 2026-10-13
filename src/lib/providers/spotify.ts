import "server-only";

import { serverEnv } from "@/lib/env";
import type { RawTrackInput } from "@/lib/import/normalize";
import { parseSpotifyEmbedHtml } from "@/lib/import/spotify-embed";
import { fetchWithTimeout, isAbortError, safeLogValue } from "./http";
import { fetchPublicHtml } from "./playlist-page";
import {
  providerFailure,
  type ImportedPlaylist,
  type PlaylistImportProvider,
  type ProviderResult,
} from "./types";

/**
 * Spotify Web API adapter.
 *
 * Two auth modes:
 *  - Client credentials (app token) for public playlists.
 *  - A user access token (from the OAuth routes) for playlists that only the
 *    signed-in account may read.
 *
 * Audio is never requested or downloaded; only playlist metadata and track
 * names are read, which is what the Developer Terms allow for this use.
 */

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_BASE = "https://api.spotify.com/v1";
const PAGE_SIZE = 100;
const MAX_PAGES = 20; // 2000 tracks — well past any practical personal playlist.

export const SPOTIFY_ATTRIBUTION = "Playlist data from Spotify";
export const SPOTIFY_SCOPES = ["playlist-read-private", "playlist-read-collaborative"];

let cachedToken: { value: string; expiresAt: number } | null = null;

export function isSpotifyConfigured(): boolean {
  return Boolean(serverEnv.spotifyClientId && serverEnv.spotifyClientSecret);
}

function basicAuthHeader(): string {
  const raw = `${serverEnv.spotifyClientId}:${serverEnv.spotifyClientSecret}`;
  return `Basic ${Buffer.from(raw).toString("base64")}`;
}

/** Client-credentials token, cached in memory until shortly before expiry. */
async function getAppToken(): Promise<ProviderResult<string>> {
  if (!isSpotifyConfigured()) {
    return providerFailure(
      "not_configured",
      "Spotify is not configured.",
      "Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to import Spotify playlists.",
    );
  }
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return { ok: true, data: cachedToken.value };
  }

  try {
    const response = await fetchWithTimeout(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "client_credentials" }).toString(),
      timeoutMs: 8000,
    });

    if (!response.ok) {
      return providerFailure(
        response.status === 400 || response.status === 401
          ? "unauthorized"
          : "upstream_error",
        "Spotify rejected the configured credentials.",
        "Check SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in your environment.",
      );
    }

    const json = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!json.access_token) {
      return providerFailure("upstream_error", "Spotify returned no access token.");
    }
    cachedToken = {
      value: json.access_token,
      expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
    };
    return { ok: true, data: cachedToken.value };
  } catch (error) {
    if (isAbortError(error)) {
      return providerFailure("timeout", "Spotify did not respond in time.");
    }
    console.error("[spotify] token request failed:", safeLogValue(error));
    return providerFailure("upstream_error", "Could not reach Spotify.");
  }
}

type SpotifyImage = { url?: string };
type SpotifyArtist = { name?: string };
type SpotifyTrack = {
  id?: string;
  name?: string;
  duration_ms?: number;
  is_playable?: boolean;
  artists?: SpotifyArtist[];
  album?: { name?: string };
  external_urls?: { spotify?: string };
  type?: string;
};
type SpotifyPlaylistItem = {
  track?: SpotifyTrack | null;
  is_local?: boolean;
};
type SpotifyPlaylist = {
  name?: string;
  description?: string;
  owner?: { display_name?: string };
  images?: SpotifyImage[];
  external_urls?: { spotify?: string };
  tracks?: { total?: number; items?: SpotifyPlaylistItem[]; next?: string | null };
};

function describeHttpError(status: number): ProviderResult<never> {
  switch (status) {
    case 401:
      return providerFailure(
        "unauthorized",
        "Spotify rejected the request.",
        "The token expired or the playlist needs a signed-in Spotify account. Try connecting your Spotify account.",
      );
    case 403:
      return providerFailure(
        "forbidden",
        "Your Spotify credentials are not allowed to read that playlist.",
        "Not every public-looking playlist is readable with an app token — editorial and algorithmic playlists in particular. Connect the account that can open it.",
      );
    case 404:
      return providerFailure(
        "not_found",
        "Spotify could not find that playlist.",
        "Check the link, or make sure the playlist is not private or deleted.",
      );
    case 429:
      return providerFailure(
        "rate_limited",
        "Spotify is rate limiting this app. Wait a moment and try again.",
      );
    default:
      return providerFailure(
        "upstream_error",
        `Spotify returned an unexpected error (HTTP ${status}).`,
      );
  }
}

async function authorizedGet<T>(
  url: string,
  token: string,
): Promise<ProviderResult<T>> {
  try {
    const response = await fetchWithTimeout(url, {
      headers: { Authorization: `Bearer ${token}` },
      timeoutMs: 10_000,
    });
    if (!response.ok) return describeHttpError(response.status);
    return { ok: true, data: (await response.json()) as T };
  } catch (error) {
    if (isAbortError(error)) {
      return providerFailure("timeout", "Spotify did not respond in time.");
    }
    console.error("[spotify] request failed:", safeLogValue(error));
    return providerFailure("upstream_error", "Could not reach Spotify.");
  }
}

export function toRawTrack(item: SpotifyPlaylistItem): RawTrackInput | null {
  const track = item.track;
  // Podcast episodes and removed tracks come back as null or a non-track type.
  if (!track || (track.type && track.type !== "track")) return null;
  const title = (track.name ?? "").trim();
  if (!title) return null;
  return {
    title,
    artist: (track.artists ?? [])
      .map((a) => a.name)
      .filter(Boolean)
      .join(", "),
    album: track.album?.name,
    durationMs: track.duration_ms ?? null,
    externalId: track.id ?? undefined,
    externalUrl: track.external_urls?.spotify,
    // `is_playable` is only present on market-filtered responses.
    isUnavailable: track.is_playable === false,
  };
}

export async function fetchSpotifyPlaylistFromPage(
  playlistId: string,
): Promise<ProviderResult<ImportedPlaylist>> {
  const page = await fetchPublicHtml(
    `https://open.spotify.com/embed/playlist/${encodeURIComponent(playlistId)}`,
  );
  if (!page.ok) return page;

  const parsed = parseSpotifyEmbedHtml(page.data, playlistId);
  if (!parsed) {
    return providerFailure(
      "not_found",
      "Could not read tracks from that Spotify page.",
      "The playlist may be private, or Spotify hid the list. Paste the track list instead.",
    );
  }

  const warnings: string[] = [];
  if (parsed.truncated) {
    warnings.push(
      `The public Spotify page only listed ${parsed.tracks.length} tracks. Longer playlists need official API keys, or split the list.`,
    );
  }

  return {
    ok: true,
    data: {
      name: parsed.name,
      owner: parsed.owner,
      imageUrl: parsed.imageUrl,
      externalId: playlistId,
      externalUrl: `https://open.spotify.com/playlist/${playlistId}`,
      tracks: parsed.tracks,
      warnings,
      attribution: "Playlist data from the public Spotify page",
    },
  };
}

/**
 * Read a playlist. Uses the official API when keys (or a user token) are set;
 * otherwise reads titles and artists from Spotify's public embed page.
 */
export async function fetchSpotifyPlaylist(
  playlistId: string,
  userToken?: string,
): Promise<ProviderResult<ImportedPlaylist>> {
  if (!userToken && !isSpotifyConfigured()) {
    return fetchSpotifyPlaylistFromPage(playlistId);
  }

  let token = userToken;
  if (!token) {
    const appToken = await getAppToken();
    if (!appToken.ok) return appToken;
    token = appToken.data;
  }

  const warnings: string[] = [];
  const meta = await authorizedGet<SpotifyPlaylist>(
    `${API_BASE}/playlists/${encodeURIComponent(playlistId)}?fields=name,description,owner(display_name),images,external_urls,tracks(total)`,
    token,
  );
  if (!meta.ok) return meta;

  const tracks: RawTrackInput[] = [];
  let offset = 0;
  let page = 0;
  let total = meta.data.tracks?.total ?? 0;

  while (page < MAX_PAGES) {
    const url =
      `${API_BASE}/playlists/${encodeURIComponent(playlistId)}/tracks` +
      `?limit=${PAGE_SIZE}&offset=${offset}` +
      `&fields=total,next,items(is_local,track(id,name,type,duration_ms,is_playable,external_urls(spotify),album(name),artists(name)))`;

    const pageResult = await authorizedGet<{
      total?: number;
      next?: string | null;
      items?: SpotifyPlaylistItem[];
    }>(url, token);
    if (!pageResult.ok) return pageResult;

    total = pageResult.data.total ?? total;
    const items = pageResult.data.items ?? [];
    for (const item of items) {
      if (item.is_local) {
        warnings.push("Skipped a local file that Spotify does not expose.");
        continue;
      }
      const raw = toRawTrack(item);
      if (!raw) {
        warnings.push("Skipped an item that is not a music track (episode or removed track).");
        continue;
      }
      tracks.push(raw);
    }

    offset += PAGE_SIZE;
    page += 1;
    if (!pageResult.data.next || items.length === 0) break;
  }

  if (page >= MAX_PAGES && tracks.length < total) {
    warnings.push(
      `Imported the first ${tracks.length} of ${total} tracks. Very long playlists are truncated.`,
    );
  }

  return {
    ok: true,
    data: {
      name: meta.data.name?.trim() || "Spotify playlist",
      description: meta.data.description || undefined,
      owner: meta.data.owner?.display_name,
      imageUrl: meta.data.images?.[0]?.url,
      externalId: playlistId,
      externalUrl:
        meta.data.external_urls?.spotify ??
        `https://open.spotify.com/playlist/${playlistId}`,
      tracks,
      warnings,
      attribution: SPOTIFY_ATTRIBUTION,
    },
  };
}

export const spotifyProvider: PlaylistImportProvider = {
  id: "spotify",
  name: "Spotify",
  isConfigured: isSpotifyConfigured,
  fetchPlaylist: (playlistId) => fetchSpotifyPlaylist(playlistId),
};

/* --------------------------------------------------------- user OAuth */

export function buildSpotifyAuthorizeUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: serverEnv.spotifyClientId ?? "",
    response_type: "code",
    redirect_uri: redirectUri,
    state,
    scope: SPOTIFY_SCOPES.join(" "),
    show_dialog: "false",
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function exchangeSpotifyCode(
  code: string,
  redirectUri: string,
): Promise<ProviderResult<{ accessToken: string; expiresIn: number; refreshToken?: string }>> {
  if (!isSpotifyConfigured()) {
    return providerFailure("not_configured", "Spotify is not configured.");
  }
  try {
    const response = await fetchWithTimeout(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }).toString(),
      timeoutMs: 8000,
    });
    if (!response.ok) {
      return providerFailure(
        "unauthorized",
        "Spotify refused the authorization code.",
        "Make sure the redirect URI in your Spotify app settings matches this app's URL exactly.",
      );
    }
    const json = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
    };
    if (!json.access_token) {
      return providerFailure("upstream_error", "Spotify returned no access token.");
    }
    return {
      ok: true,
      data: {
        accessToken: json.access_token,
        expiresIn: json.expires_in ?? 3600,
        refreshToken: json.refresh_token,
      },
    };
  } catch (error) {
    if (isAbortError(error)) {
      return providerFailure("timeout", "Spotify did not respond in time.");
    }
    console.error("[spotify] code exchange failed:", safeLogValue(error));
    return providerFailure("upstream_error", "Could not reach Spotify.");
  }
}
