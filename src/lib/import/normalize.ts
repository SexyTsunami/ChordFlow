import type { MatchStatus, PlaylistTrack, Song } from "@/lib/domain/types";
import { scoreSong } from "@/lib/search/search";
import { createId } from "@/lib/utils";

/**
 * Turning messy external track data into ChordFlow playlist tracks.
 *
 * YouTube video titles in particular are free text ("周杰倫 Jay Chou【告白氣球
 * Love Confession】Official MV"), so this module cleans them up and reports how
 * confident it is. A cleaned title is a guess, never an identification — the UI
 * always shows the match status next to it.
 */

export type RawTrackInput = {
  title: string;
  artist?: string;
  album?: string;
  durationMs?: number | null;
  externalId?: string;
  externalUrl?: string;
  isUnavailable?: boolean;
  /** Set by the YouTube adapter: the uploading channel. */
  channelTitle?: string;
  note?: string;
};

const NOISE_PATTERNS: RegExp[] = [
  /[([【「『〈]\s*(official|officical|offical)?\s*(music\s*)?(video|mv|m\/v|audio|lyric[s]?|visuali[sz]er|version|ver\.?|hd|hq|4k|1080p|720p|full|完整版|官方|官方版|高清|高畫質|中文字幕|動態歌詞|歌詞|字幕|live|現場)[^)\]】」』〉]*[)\]】」』〉]/gi,
  /\b(official\s+(music\s+)?video|official\s+audio|lyric\s+video|music\s+video)\b/gi,
  /【[^】]*(MV|官方|字幕|歌詞|完整版)[^】]*】/gi,
  /\s*[-–—]\s*topic\s*$/i,
];

const SPLITTERS = [" - ", " – ", " — ", " ‐ ", " _ ", " | ", "「", "【"];

/** Strip "(Official MV)" style noise from a video or track title. */
export function cleanTitle(raw: string): string {
  let out = (raw ?? "").replace(/\s+/g, " ").trim();
  for (const pattern of NOISE_PATTERNS) out = out.replace(pattern, " ");
  out = out
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s\-–—|]+/, "")
    .replace(/[\s\-–—|]+$/, "")
    .trim();
  return out;
}

export type TitleSplit = {
  title: string;
  artist: string;
  /** 0..1 — how confident the artist/title split is. */
  confidence: number;
};

/**
 * Split a free-text video title into artist and song.
 * `channelTitle` is used as a fallback artist when no separator is present.
 */
export function splitVideoTitle(
  rawTitle: string,
  channelTitle?: string,
): TitleSplit {
  const cleaned = cleanTitle(rawTitle);

  // 周杰倫【告白氣球】 / 周杰倫「告白氣球」
  const bracketed = /^(.{1,40}?)\s*[【「『]([^】」』]{1,80})[】」』]/.exec(cleaned);
  if (bracketed) {
    return {
      title: cleanTitle(bracketed[2]),
      artist: cleanTitle(bracketed[1]),
      confidence: 0.7,
    };
  }

  for (const splitter of SPLITTERS) {
    const index = cleaned.indexOf(splitter);
    if (index > 0 && index < cleaned.length - splitter.length) {
      const left = cleanTitle(cleaned.slice(0, index));
      const right = cleanTitle(cleaned.slice(index + splitter.length));
      if (left && right) {
        // Convention on music channels is "Artist - Title".
        return { title: right, artist: left, confidence: 0.65 };
      }
    }
  }

  const channel = channelTitle ? cleanTitle(channelTitle.replace(/\s*-\s*Topic$/i, "")) : "";
  return {
    title: cleaned,
    artist: channel,
    confidence: channel ? 0.35 : 0.2,
  };
}

/** Match an imported track against the local library. */
export function matchTrackToLibrary(
  track: { title: string; artist?: string },
  songs: Song[],
): { songId: string | null; status: MatchStatus; confidence: number } {
  if (!track.title.trim()) {
    return { songId: null, status: "unmatched", confidence: 0 };
  }

  let bestSong: Song | null = null;
  let bestScore = 0;

  for (const song of songs) {
    let score = scoreSong(song, track.title);
    if (score <= 0) continue;
    if (track.artist) {
      const artistScore = scoreSong(song, track.artist);
      // Agreeing on the artist as well is a strong signal.
      score += artistScore > 0 ? 25 : -15;
    }
    if (score > bestScore) {
      bestScore = score;
      bestSong = song;
    }
  }

  if (!bestSong || bestScore < 60) {
    return { songId: null, status: "unmatched", confidence: 0 };
  }
  if (bestScore >= 110) {
    return { songId: bestSong.id, status: "matched", confidence: 0.95 };
  }
  return { songId: bestSong.id, status: "probable", confidence: 0.6 };
}

/** Stable key used for duplicate detection. */
export function trackKey(track: { title: string; artist?: string; externalId?: string }) {
  if (track.externalId) return `id:${track.externalId}`;
  const title = cleanTitle(track.title).toLowerCase().replace(/\s+/g, "");
  const artist = (track.artist ?? "").toLowerCase().replace(/\s+/g, "");
  return `ta:${title}|${artist}`;
}

export type NormalizeResult = {
  tracks: PlaylistTrack[];
  duplicatesRemoved: number;
};

/**
 * Normalise raw provider tracks into playlist tracks.
 * Source order is preserved; exact duplicates are dropped (first wins).
 */
export function normalizeTracks(
  raw: RawTrackInput[],
  options: { library?: Song[]; splitTitles?: boolean } = {},
): NormalizeResult {
  const { library = [], splitTitles = false } = options;
  const seen = new Set<string>();
  const tracks: PlaylistTrack[] = [];
  let duplicatesRemoved = 0;

  for (const entry of raw) {
    let title = cleanTitle(entry.title);
    let artist = entry.artist ? cleanTitle(entry.artist) : "";
    let splitConfidence = 1;

    if (splitTitles && !artist) {
      const split = splitVideoTitle(entry.title, entry.channelTitle);
      title = split.title;
      artist = split.artist;
      splitConfidence = split.confidence;
    }

    if (!title) continue;

    const key = trackKey({ title, artist, externalId: entry.externalId });
    if (seen.has(key)) {
      duplicatesRemoved += 1;
      continue;
    }
    seen.add(key);

    const match = matchTrackToLibrary({ title, artist }, library);

    tracks.push({
      id: createId("track"),
      position: tracks.length,
      title,
      artist,
      album: entry.album,
      durationMs: entry.durationMs ?? null,
      externalId: entry.externalId,
      externalUrl: entry.externalUrl,
      songId: match.songId,
      matchStatus: entry.isUnavailable ? "unavailable" : match.status,
      matchConfidence: Math.min(match.confidence, splitConfidence),
      isUnavailable: Boolean(entry.isUnavailable),
      note: entry.note,
    });
  }

  return { tracks, duplicatesRemoved };
}

/** Re-number tracks after a reorder or removal so `position` stays canonical. */
export function reindexTracks(tracks: PlaylistTrack[]): PlaylistTrack[] {
  return tracks.map((track, index) => ({ ...track, position: index }));
}

export function moveTrack(
  tracks: PlaylistTrack[],
  from: number,
  to: number,
): PlaylistTrack[] {
  if (from === to || from < 0 || from >= tracks.length) return tracks;
  const target = Math.max(0, Math.min(to, tracks.length - 1));
  const next = [...tracks];
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved);
  return reindexTracks(next);
}
