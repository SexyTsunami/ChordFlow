import "server-only";

import { serverEnv } from "@/lib/env";
import { nowIso } from "@/lib/utils";
import { fetchWithTimeout, isAbortError, safeLogValue } from "./http";
import {
  providerFailure,
  type LyricsProvider,
  type LyricsRequest,
  type LyricsResponse,
  type ProviderResult,
} from "./types";

/**
 * Lyrics providers.
 *
 * ChordFlow never scrapes lyric sites and never generates song lyrics. There
 * are exactly two legitimate ways words appear in the app:
 *   1. You paste lyrics you have the right to use (stored as `user-provided`).
 *   2. A licensed provider returns them under its own terms.
 *
 * With nothing configured, `referenceLinksProvider` still gives a useful
 * answer: authorised places to read the lyrics, and an empty editor.
 */

function searchLinks(request: LyricsRequest) {
  const query = encodeURIComponent(`${request.artist} ${request.title}`.trim());
  return [
    {
      label: "Search YouTube (official uploads)",
      url: `https://www.youtube.com/results?search_query=${query}`,
    },
    {
      label: "Search Musixmatch (licensed lyrics)",
      url: `https://www.musixmatch.com/search/${query}`,
    },
    {
      label: "Search KKBOX (licensed, strong Mandarin catalogue)",
      url: `https://www.kkbox.com/tw/tc/search.php?word=${query}`,
    },
    {
      label: "Search Apple Music",
      url: `https://music.apple.com/search?term=${query}`,
    },
  ];
}

/**
 * Always-available fallback. Returns no lyric text — only places to read them
 * legitimately — so the UI can show an honest empty state.
 */
export const referenceLinksProvider: LyricsProvider = {
  id: "reference-links",
  name: "Authorised sources",
  isConfigured: () => true,
  async fetchLyrics(request) {
    return {
      ok: true,
      data: {
        document: null,
        referenceUrls: searchLinks(request),
        notice:
          "No licensed lyrics provider is configured, so ChordFlow does not display lyrics for this song. Open an authorised source below, or paste lyrics you have the right to use into the editor.",
      },
    };
  },
};

/* ------------------------------------------------------------ Musixmatch */

const MUSIXMATCH_BASE = "https://api.musixmatch.com/ws/1.1";

type MusixmatchResponse = {
  message?: {
    header?: { status_code?: number; hint?: string };
    body?: {
      lyrics?: {
        lyrics_body?: string;
        lyrics_copyright?: string;
        explicit?: number;
        restricted?: number;
        pixel_tracking_url?: string;
      };
    };
  };
};

/**
 * Musixmatch adapter.
 *
 * Note: on the free developer plan `matcher.lyrics.get` returns a *30% excerpt*
 * plus a mandatory copyright notice. We surface exactly what the API returns
 * and label it, rather than pretending to have the full lyric.
 */
export const musixmatchProvider: LyricsProvider = {
  id: "musixmatch",
  name: "Musixmatch",
  isConfigured: () =>
    serverEnv.lyricsProvider === "musixmatch" && Boolean(serverEnv.lyricsProviderApiKey),

  async fetchLyrics(request): Promise<ProviderResult<LyricsResponse>> {
    if (!this.isConfigured()) {
      return providerFailure(
        "not_configured",
        "Musixmatch is not configured.",
        "Set LYRICS_PROVIDER=musixmatch and LYRICS_PROVIDER_API_KEY.",
      );
    }
    const params = new URLSearchParams({
      q_track: request.title,
      q_artist: request.artist,
      apikey: serverEnv.lyricsProviderApiKey ?? "",
    });

    try {
      const response = await fetchWithTimeout(
        `${MUSIXMATCH_BASE}/matcher.lyrics.get?${params.toString()}`,
        { timeoutMs: 9000 },
      );
      const json = (await response.json().catch(() => null)) as MusixmatchResponse | null;
      const status = json?.message?.header?.status_code ?? response.status;

      if (status === 401 || status === 403) {
        return providerFailure(
          "unauthorized",
          "Musixmatch rejected the API key.",
          json?.message?.header?.hint,
        );
      }
      if (status === 402) {
        return providerFailure(
          "forbidden",
          "Your Musixmatch plan does not include this endpoint.",
        );
      }
      if (status === 404) {
        return providerFailure("not_found", "Musixmatch has no match for that song.");
      }
      if (status === 429) {
        return providerFailure("rate_limited", "Musixmatch rate limit reached.");
      }
      if (status !== 200) {
        return providerFailure(
          "upstream_error",
          `Musixmatch returned status ${status}.`,
        );
      }

      const lyrics = json?.message?.body?.lyrics;
      const body = (lyrics?.lyrics_body ?? "").trim();
      if (!body) {
        return providerFailure("not_found", "Musixmatch returned no lyrics.");
      }
      if (lyrics?.restricted === 1) {
        return providerFailure(
          "forbidden",
          "Musixmatch marks these lyrics as restricted and they may not be displayed.",
        );
      }

      const timestamp = nowIso();
      return {
        ok: true,
        data: {
          document: {
            id: `lyrics_mxm_${Date.now()}`,
            songId: "",
            language: "other",
            rights: "licensed-provider",
            provider: "musixmatch",
            attribution:
              lyrics?.lyrics_copyright?.trim() || "Lyrics provided by Musixmatch",
            body,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
          referenceUrls: searchLinks(request),
          notice:
            "Lyrics supplied by Musixmatch under their API terms. Free plans return a partial excerpt only.",
        },
      };
    } catch (error) {
      if (isAbortError(error)) {
        return providerFailure("timeout", "Musixmatch did not respond in time.");
      }
      console.error("[lyrics] musixmatch request failed:", safeLogValue(error));
      return providerFailure("upstream_error", "Could not reach Musixmatch.");
    }
  },
};

const PROVIDERS: LyricsProvider[] = [musixmatchProvider, referenceLinksProvider];

/** The first configured provider; always resolves, worst case to the links. */
export function activeLyricsProvider(): LyricsProvider {
  return PROVIDERS.find((p) => p.isConfigured()) ?? referenceLinksProvider;
}
