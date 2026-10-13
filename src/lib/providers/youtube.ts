import "server-only";

import { serverEnv } from "@/lib/env";
import type { RawTrackInput } from "@/lib/import/normalize";
import { parseYouTubePlaylistHtml } from "@/lib/import/youtube-page";
import { fetchWithTimeout, isAbortError, safeLogValue } from "./http";
import { fetchPublicHtml } from "./playlist-page";
import {
  providerFailure,
  type ImportedPlaylist,
  type PlaylistImportProvider,
  type ProviderResult,
} from "./types";

/**
 * YouTube Data API v3 adapter.
 *
 * Reads playlist metadata and video titles only. No audio or video is
 * downloaded, and a video title is treated as a *hint* about the song, never
 * as an identification — `normalizeTracks` records how confident the split was
 * and the UI shows that confidence next to every row.
 */

const API_BASE = "https://www.googleapis.com/youtube/v3";
const PAGE_SIZE = 50;
const MAX_PAGES = 20; // 1000 videos.

export const YOUTUBE_ATTRIBUTION = "Playlist data from YouTube";

export function isYouTubeConfigured(): boolean {
  return Boolean(serverEnv.youtubeApiKey);
}

type YouTubePlaylistItem = {
  snippet?: {
    title?: string;
    videoOwnerChannelTitle?: string;
    channelTitle?: string;
    position?: number;
    resourceId?: { videoId?: string };
  };
  status?: { privacyStatus?: string };
};

type YouTubeListResponse<T> = {
  items?: T[];
  nextPageToken?: string;
  pageInfo?: { totalResults?: number };
  error?: { message?: string; errors?: Array<{ reason?: string }> };
};

function describeYouTubeError(
  status: number,
  body: YouTubeListResponse<unknown> | null,
): ProviderResult<never> {
  const reason = body?.error?.errors?.[0]?.reason ?? "";
  if (reason === "quotaExceeded" || reason === "dailyLimitExceeded") {
    return providerFailure(
      "quota_exceeded",
      "The YouTube Data API daily quota for this key is used up.",
      "Quota resets at midnight Pacific time, or raise it in the Google Cloud console.",
    );
  }
  if (reason === "playlistNotFound" || status === 404) {
    return providerFailure(
      "not_found",
      "YouTube could not find that playlist.",
      "Private and deleted playlists are not readable through the API.",
    );
  }
  if (status === 403) {
    return providerFailure(
      "forbidden",
      "YouTube refused the request.",
      "Check that the API key is valid, unrestricted for this server, and that the YouTube Data API v3 is enabled.",
    );
  }
  if (status === 400) {
    return providerFailure(
      "invalid_input",
      "YouTube rejected the playlist id.",
    );
  }
  if (status === 429) {
    return providerFailure("rate_limited", "YouTube is rate limiting this key.");
  }
  return providerFailure(
    "upstream_error",
    `YouTube returned an unexpected error (HTTP ${status}).`,
  );
}

async function youtubeGet<T>(
  path: string,
  params: Record<string, string>,
): Promise<ProviderResult<YouTubeListResponse<T>>> {
  const search = new URLSearchParams({ ...params, key: serverEnv.youtubeApiKey ?? "" });
  try {
    const response = await fetchWithTimeout(`${API_BASE}/${path}?${search.toString()}`, {
      timeoutMs: 10_000,
    });
    const body = (await response.json().catch(() => null)) as YouTubeListResponse<T> | null;
    if (!response.ok) return describeYouTubeError(response.status, body);
    return { ok: true, data: body ?? {} };
  } catch (error) {
    if (isAbortError(error)) {
      return providerFailure("timeout", "YouTube did not respond in time.");
    }
    console.error("[youtube] request failed:", safeLogValue(error));
    return providerFailure("upstream_error", "Could not reach YouTube.");
  }
}

export async function fetchYouTubePlaylistFromPage(
  playlistId: string,
): Promise<ProviderResult<ImportedPlaylist>> {
  const page = await fetchPublicHtml(
    `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`,
  );
  if (!page.ok) return page;

  const parsed = parseYouTubePlaylistHtml(page.data, playlistId);
  if (!parsed) {
    return providerFailure(
      "not_found",
      "Could not read tracks from that YouTube page.",
      "YouTube often hides the list from a server fetch. Paste the track list, or add YOUTUBE_API_KEY.",
    );
  }

  return {
    ok: true,
    data: {
      name: parsed.name,
      owner: parsed.owner,
      externalId: playlistId,
      externalUrl: `https://www.youtube.com/playlist?list=${playlistId}`,
      tracks: parsed.tracks,
      warnings: [
        "Artist and song names were guessed from video titles — check them before practising.",
        parsed.tracks.length >= 100
          ? `The public page listed ${parsed.tracks.length} videos. Longer lists may be truncated.`
          : "",
      ].filter(Boolean),
      attribution: "Playlist data from the public YouTube page",
    },
  };
}

export async function fetchYouTubePlaylist(
  playlistId: string,
): Promise<ProviderResult<ImportedPlaylist>> {
  if (!isYouTubeConfigured()) {
    return fetchYouTubePlaylistFromPage(playlistId);
  }

  const meta = await youtubeGet<{
    snippet?: { title?: string; description?: string; channelTitle?: string; thumbnails?: Record<string, { url?: string }> };
    contentDetails?: { itemCount?: number };
  }>("playlists", { part: "snippet,contentDetails", id: playlistId, maxResults: "1" });
  if (!meta.ok) return meta;

  const playlist = meta.data.items?.[0];
  if (!playlist) {
    return providerFailure(
      "not_found",
      "That YouTube playlist is not available.",
      "It may be private, unlisted to this key, or deleted.",
    );
  }

  const warnings: string[] = [];
  const tracks: RawTrackInput[] = [];
  let pageToken: string | undefined;
  let page = 0;

  do {
    const params: Record<string, string> = {
      part: "snippet,status",
      playlistId,
      maxResults: String(PAGE_SIZE),
    };
    if (pageToken) params.pageToken = pageToken;

    const result = await youtubeGet<YouTubePlaylistItem>("playlistItems", params);
    if (!result.ok) return result;

    for (const item of result.data.items ?? []) {
      const title = (item.snippet?.title ?? "").trim();
      const privacy = item.status?.privacyStatus;
      // YouTube keeps removed videos in the list with these placeholder titles.
      if (!title || title === "Deleted video" || title === "Private video") {
        warnings.push("Skipped a deleted or private video.");
        continue;
      }
      const videoId = item.snippet?.resourceId?.videoId;
      tracks.push({
        title,
        channelTitle:
          item.snippet?.videoOwnerChannelTitle ?? item.snippet?.channelTitle,
        externalId: videoId,
        externalUrl: videoId
          ? `https://www.youtube.com/watch?v=${videoId}&list=${playlistId}`
          : undefined,
        isUnavailable: privacy === "private",
      });
    }

    pageToken = result.data.nextPageToken;
    page += 1;
  } while (pageToken && page < MAX_PAGES);

  if (pageToken) {
    warnings.push(
      `Imported the first ${tracks.length} videos. Very long playlists are truncated.`,
    );
  }
  if (tracks.length > 0) {
    warnings.push(
      "Artist and song names were guessed from video titles — check the match column before practising.",
    );
  }

  const thumbnails = playlist.snippet?.thumbnails ?? {};
  const imageUrl =
    thumbnails.high?.url ?? thumbnails.medium?.url ?? thumbnails.default?.url;

  return {
    ok: true,
    data: {
      name: playlist.snippet?.title?.trim() || "YouTube playlist",
      description: playlist.snippet?.description || undefined,
      owner: playlist.snippet?.channelTitle,
      imageUrl,
      externalId: playlistId,
      externalUrl: `https://www.youtube.com/playlist?list=${playlistId}`,
      tracks,
      warnings,
      attribution: YOUTUBE_ATTRIBUTION,
    },
  };
}

export const youtubeProvider: PlaylistImportProvider = {
  id: "youtube",
  name: "YouTube",
  isConfigured: isYouTubeConfigured,
  fetchPlaylist: fetchYouTubePlaylist,
};
