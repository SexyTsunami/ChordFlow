import { describe, expect, it } from "vitest";
import type { ChordArrangement, PlaylistTrack, Song } from "@/lib/domain/types";
import { findSongForTrack } from "./estimate";

function song(partial: Partial<Song> & Pick<Song, "id" | "title" | "artist">): Song {
  return {
    originalKey: undefined,
    difficulty: null,
    arrangementStatus: "ai-estimate",
    tags: [],
    origin: "import",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

function track(partial: Partial<PlaylistTrack>): PlaylistTrack {
  return {
    id: "track_1",
    position: 0,
    title: "晴天",
    artist: "周杰倫",
    durationMs: undefined,
    songId: null,
    matchStatus: "unmatched",
    matchConfidence: 0,
    isUnavailable: false,
    ...partial,
  };
}

describe("findSongForTrack", () => {
  it("links a playlist row to an estimated song by title and artist", () => {
    const songs = [song({ id: "song_saved", title: "晴天", artist: "周杰倫" })];
    const arrangements = [{ songId: "song_saved" } as ChordArrangement];
    expect(findSongForTrack(track({ songId: null }), songs, arrangements)?.id).toBe(
      "song_saved",
    );
  });
});
