/**
 * Safe parsing of playlist URLs.
 *
 * Everything here refuses to guess: an unrecognised or unsupported URL comes
 * back as an explicit failure with a reason the UI can show, rather than
 * silently falling through to an empty import.
 */

export type PlaylistProvider = "spotify" | "youtube";

export type ParsedPlaylistUrl =
  | {
      ok: true;
      provider: PlaylistProvider;
      playlistId: string;
      /** Canonical URL we will link back to for attribution. */
      canonicalUrl: string;
    }
  | {
      ok: false;
      provider: PlaylistProvider | null;
      reason: string;
    };

const SPOTIFY_HOSTS = new Set(["open.spotify.com", "play.spotify.com"]);
const YOUTUBE_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

const SPOTIFY_ID = /^[A-Za-z0-9]{16,40}$/;
/** YouTube playlist ids: PL…, OL…, UU…, RD…, FL…, LL and the like. */
const YOUTUBE_PLAYLIST_ID = /^[A-Za-z0-9_-]{2,64}$/;

/** Parse a URL, rejecting anything that is not plain http(s). */
export function safeParseUrl(input: string): URL | null {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return null;
  let candidate = trimmed;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(candidate)) candidate = `https://${candidate}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  return url;
}

function parseSpotify(url: URL): ParsedPlaylistUrl {
  // Paths look like /playlist/{id} or /intl-ja/playlist/{id}
  const segments = url.pathname.split("/").filter(Boolean);
  const typeIndex = segments.findIndex((s) =>
    ["playlist", "album", "track", "artist", "show", "episode"].includes(s),
  );
  if (typeIndex === -1) {
    return {
      ok: false,
      provider: "spotify",
      reason: "That Spotify link does not point at a playlist.",
    };
  }
  const type = segments[typeIndex];
  const id = segments[typeIndex + 1];
  if (type !== "playlist") {
    return {
      ok: false,
      provider: "spotify",
      reason: `Spotify ${type} links are not supported — paste a playlist link.`,
    };
  }
  if (!id || !SPOTIFY_ID.test(id)) {
    return {
      ok: false,
      provider: "spotify",
      reason: "Could not read a playlist id from that Spotify link.",
    };
  }
  return {
    ok: true,
    provider: "spotify",
    playlistId: id,
    canonicalUrl: `https://open.spotify.com/playlist/${id}`,
  };
}

function parseYouTube(url: URL): ParsedPlaylistUrl {
  const list = url.searchParams.get("list");
  if (!list) {
    return {
      ok: false,
      provider: "youtube",
      reason:
        "That YouTube link has no playlist id. Open the playlist itself and copy the URL containing `list=`.",
    };
  }
  if (!YOUTUBE_PLAYLIST_ID.test(list)) {
    return {
      ok: false,
      provider: "youtube",
      reason: "Could not read a playlist id from that YouTube link.",
    };
  }
  // "Mixes" (RD…) and the private Watch Later / Liked lists are not readable
  // through the public Data API, so say so up front instead of failing later.
  if (/^RD/.test(list)) {
    return {
      ok: false,
      provider: "youtube",
      reason:
        "YouTube auto-generated mixes (RD…) are not available through the Data API.",
    };
  }
  if (list === "WL" || list === "LL") {
    return {
      ok: false,
      provider: "youtube",
      reason:
        "Watch Later and Liked Videos are private lists that the Data API cannot read.",
    };
  }
  return {
    ok: true,
    provider: "youtube",
    playlistId: list,
    canonicalUrl: `https://www.youtube.com/playlist?list=${list}`,
  };
}

/** Detect the provider and extract the playlist id from a pasted URL or URI. */
export function parsePlaylistUrl(input: string): ParsedPlaylistUrl {
  const raw = (input ?? "").trim();
  if (!raw) {
    return { ok: false, provider: null, reason: "Paste a playlist link first." };
  }

  // Spotify URIs: spotify:playlist:37i9dQZF1DX…
  const uriMatch = /^spotify:(playlist|album|track|artist):([A-Za-z0-9]+)$/i.exec(raw);
  if (uriMatch) {
    const [, type, id] = uriMatch;
    if (type.toLowerCase() !== "playlist") {
      return {
        ok: false,
        provider: "spotify",
        reason: `Spotify ${type} URIs are not supported — use a playlist URI.`,
      };
    }
    return {
      ok: true,
      provider: "spotify",
      playlistId: id,
      canonicalUrl: `https://open.spotify.com/playlist/${id}`,
    };
  }

  const url = safeParseUrl(raw);
  if (!url) {
    return { ok: false, provider: null, reason: "That does not look like a valid URL." };
  }

  const host = url.hostname.toLowerCase();
  if (SPOTIFY_HOSTS.has(host)) return parseSpotify(url);
  if (YOUTUBE_HOSTS.has(host)) return parseYouTube(url);

  return {
    ok: false,
    provider: null,
    reason: `${url.hostname} is not a supported playlist source. ChordFlow reads Spotify and YouTube playlists.`,
  };
}

/** Best-effort provider detection used to label the input field live. */
export function detectProvider(input: string): PlaylistProvider | null {
  const raw = (input ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (raw.startsWith("spotify:") || raw.includes("spotify.com")) return "spotify";
  if (raw.includes("youtube.com") || raw.includes("youtu.be")) return "youtube";
  return null;
}
