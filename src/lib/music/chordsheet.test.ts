import { describe, expect, it } from "vitest";
import { arrangementForPlay, collectChords } from "./chordsheet";
import { sectionsFromChordEstimate } from "./sheet-text";
import { normalizeEstimateChord } from "./chords";
import type { ChordArrangement } from "@/lib/domain/types";

function sheet(chords: string[]): ChordArrangement {
  return {
    id: "arr_test",
    songId: "song_test",
    title: "Test",
    status: "user",
    source: { kind: "user", name: "test" },
    originalKey: "G",
    capo: 0,
    tuning: ["E", "A", "D", "G", "B", "E"],
    tuningName: "Standard",
    bpm: null,
    timeSignature: "4/4",
    difficulty: null,
    lyricsRights: "unavailable",
    sections: sectionsFromChordEstimate([{ type: "verse", chords }]),
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };
}

describe("arrangementForPlay", () => {
  it("rewrites every sheet chord when the key and capo change", () => {
    const arrangement = sheet(["G", "D", "Em", "C"]);
    const upTwo = arrangementForPlay(arrangement, 2, 0);
    expect(collectChords(upTwo)).toEqual(["A", "E", "F#m", "D"]);

    const capo2 = arrangementForPlay(arrangement, 0, 2, { preferFlats: true });
    expect(collectChords(capo2)).toEqual(["F", "C", "Dm", "Bb"]);
  });
});

describe("normalizeEstimateChord", () => {
  it("accepts bracketed, spaced, and German H tokens", () => {
    expect(normalizeEstimateChord("[Am]")).toBe("Am");
    expect(normalizeEstimateChord("C add9")).toBe("Cadd9");
    expect(normalizeEstimateChord("H7")).toBe("B7");
    expect(normalizeEstimateChord("banana")).toBeNull();
  });
});
