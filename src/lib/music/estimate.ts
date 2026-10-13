import type { ChordArrangement, PlaylistTrack, Song } from "@/lib/domain/types";
import { createId, nowIso } from "@/lib/utils";
import {
  sectionsFromChordEstimate,
  type ChordEstimateSection,
} from "./sheet-text";

export type ChordEstimate = {
  title: string;
  artist: string;
  key: string | null;
  capo: number;
  sections: ChordEstimateSection[];
  message?: string;
  model?: string;
  disclaimer: string;
};

export function arrangementFromEstimate(
  songId: string,
  estimate: ChordEstimate,
): ChordArrangement {
  const timestamp = nowIso();
  return {
    id: createId("arr"),
    songId,
    title: "AI chord estimate",
    status: "ai-estimate",
    source: {
      kind: "ai",
      name: estimate.model ? `AI (${estimate.model})` : "AI estimate",
      attribution: estimate.disclaimer,
    },
    originalKey: estimate.key,
    capo: estimate.capo ?? 0,
    tuning: ["E", "A", "D", "G", "B", "E"],
    tuningName: "Standard",
    bpm: null,
    timeSignature: "4/4",
    difficulty: null,
    notes: estimate.message,
    lyricsRights: "unavailable",
    lyricsAttribution: "Chords only — no lyrics were generated.",
    sections: sectionsFromChordEstimate(estimate.sections),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function findSongForTrack(
  track: PlaylistTrack,
  songs: Song[],
  arrangements: ChordArrangement[],
): Song | undefined {
  if (track.songId) {
    const existing = songs.find((song) => song.id === track.songId);
    if (existing) return existing;
  }
  const title = track.title.trim().toLowerCase();
  const artist = (track.artist ?? "").trim().toLowerCase();
  const withSheet = new Set(arrangements.map((item) => item.songId));
  return songs.find(
    (song) =>
      withSheet.has(song.id) &&
      song.title.trim().toLowerCase() === title &&
      song.artist.trim().toLowerCase() === artist,
  );
}

export function songFromTrack(track: PlaylistTrack): Song {
  const timestamp = nowIso();
  return {
    id: track.songId ?? createId("song"),
    title: track.title,
    artist: track.artist || "Unknown artist",
    album: track.album,
    sourceUrl: track.externalUrl,
    originalKey: null,
    difficulty: null,
    arrangementStatus: "ai-estimate",
    tags: ["import"],
    origin: "import",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
