import type { LyricLine } from "@/lib/domain/types";
import { parseInlineChords } from "@/lib/music/chordsheet";

/** Deterministic lyric-line factory so server and client markup match. */
export function makeLineFactory(prefix: string) {
  let count = 0;
  return function line(
    inline: string,
    extras?: Pick<LyricLine, "pinyin" | "translation" | "note">,
  ): LyricLine {
    count += 1;
    const parsed = parseInlineChords(inline);
    return {
      ...parsed,
      ...extras,
      id: `${prefix}_line_${count}`,
      chords: parsed.chords.map((chord, index) => ({
        ...chord,
        id: `${prefix}_line_${count}_c${index}`,
      })),
    };
  };
}

export const SAMPLE_ARTIST = {
  name: "ChordFlow 原創示範",
  nameZhHans: "ChordFlow 原创示范",
  pinyin: "ChordFlow Yuan Chuang Shi Fan",
} as const;

export const SAMPLE_SOURCE = {
  kind: "demo" as const,
  name: "ChordFlow original",
  attribution: "Original words and chords written for ChordFlow.",
};

export const SAMPLE_STAMP = "2024-01-01T00:00:00.000Z";
