import type {
  ArrangementSection,
  ChordArrangement,
  ChordEvent,
  LyricLine,
} from "@/lib/domain/types";
import { createId } from "@/lib/utils";
import {
  capoShape,
  parseChord,
  transposeChord,
  type TransposeOptions,
} from "./chords";

/**
 * Turning stored arrangements into things we can render, edit and export.
 *
 * The storage model anchors each chord to a character offset in the lyric
 * line. Rendering splits the line at those offsets into segments, so a chord
 * always sits above the exact character it belongs to — including Chinese
 * lyrics, which have no word boundaries to lean on.
 */

export type ChordSegment = {
  /** Chord shown above this segment, if any. */
  chord: string | null;
  /** Lyric text under the chord, up to the next chord offset. */
  text: string;
  /** Offset of this segment's first character within the line. */
  offset: number;
};

const WIDE_CHAR =
  /[\u1100-\u115F\u2E80-\u303E\u3041-\u33FF\u3400-\u4DBF\u4E00-\u9FFF\uA000-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE10-\uFE19\uFE30-\uFE6F\uFF00-\uFF60\uFFE0-\uFFE6]/;

/** Monospace column width: CJK glyphs occupy two columns. */
export function displayWidth(text: string): number {
  let width = 0;
  for (const char of Array.from(text)) {
    width += WIDE_CHAR.test(char) ? 2 : 1;
  }
  return width;
}

function sortedChords(line: LyricLine): ChordEvent[] {
  const length = Array.from(line.text).length;
  return [...(line.chords ?? [])]
    .map((c) => ({ ...c, offset: Math.max(0, Math.min(c.offset, length)) }))
    .sort((a, b) => a.offset - b.offset);
}

/**
 * Split a lyric line into renderable segments.
 * Offsets count code points, so surrogate pairs and CJK behave correctly.
 */
export function lineSegments(line: LyricLine): ChordSegment[] {
  const chars = Array.from(line.text ?? "");
  const chords = sortedChords(line);

  if (chords.length === 0) {
    return [{ chord: null, text: line.text ?? "", offset: 0 }];
  }

  const segments: ChordSegment[] = [];
  if (chords[0].offset > 0) {
    segments.push({
      chord: null,
      text: chars.slice(0, chords[0].offset).join(""),
      offset: 0,
    });
  }

  for (let i = 0; i < chords.length; i += 1) {
    const start = chords[i].offset;
    const end = i + 1 < chords.length ? chords[i + 1].offset : chars.length;
    segments.push({
      chord: chords[i].chord,
      text: chars.slice(start, Math.max(start, end)).join(""),
      offset: start,
    });
  }

  return segments;
}

/**
 * Render a line the way a classic text chord sheet does: a chord row padded
 * with spaces above the lyric row. Used by "plain sheet" mode and copy/export.
 */
export function plainTextLine(line: LyricLine): {
  chordRow: string;
  lyricRow: string;
} {
  const chars = Array.from(line.text ?? "");
  const chords = sortedChords(line);
  let chordRow = "";

  for (const event of chords) {
    const column = displayWidth(chars.slice(0, event.offset).join(""));
    if (chordRow.length > column) chordRow += " ";
    else chordRow += " ".repeat(column - chordRow.length);
    chordRow += event.chord;
  }

  return { chordRow: chordRow.trimEnd(), lyricRow: line.text ?? "" };
}

export function sectionToPlainText(section: ArrangementSection): string {
  const header = `[${section.label ?? section.type}${
    section.repeat && section.repeat > 1 ? ` x${section.repeat}` : ""
  }]`;
  const body = section.lines
    .map((line) => {
      const { chordRow, lyricRow } = plainTextLine(line);
      const note = line.note ? `   (${line.note})` : "";
      return chordRow ? `${chordRow}\n${lyricRow}${note}` : `${lyricRow}${note}`;
    })
    .join("\n");
  return `${header}\n${body}`;
}

export function arrangementToPlainText(arrangement: ChordArrangement): string {
  return arrangement.sections.map(sectionToPlainText).join("\n\n");
}

/* ------------------------------------------------- inline bracket format */

/**
 * ChordPro-style inline format used by the arrangement editor:
 *   `[C]天空 [G]灰濛濛`
 * It is compact, human editable, and round-trips losslessly.
 */
export function parseInlineChords(input: string): LyricLine {
  const chords: ChordEvent[] = [];
  let text = "";
  let i = 0;

  while (i < input.length) {
    if (input[i] === "[") {
      const close = input.indexOf("]", i + 1);
      if (close !== -1) {
        const symbol = input.slice(i + 1, close).trim();
        if (symbol) {
          chords.push({
            id: createId("chord"),
            chord: symbol,
            offset: Array.from(text).length,
          });
        }
        i = close + 1;
        continue;
      }
    }
    text += input[i];
    i += 1;
  }

  return { id: createId("line"), text, chords };
}

export function toInlineChords(line: LyricLine): string {
  const chars = Array.from(line.text ?? "");
  const chords = sortedChords(line);
  let out = "";
  let cursor = 0;
  for (const event of chords) {
    out += chars.slice(cursor, event.offset).join("");
    out += `[${event.chord}]`;
    cursor = event.offset;
  }
  out += chars.slice(cursor).join("");
  return out;
}

/* ----------------------------------------------------------- transposing */

export function transposeLine(
  line: LyricLine,
  semitones: number,
  options?: TransposeOptions,
): LyricLine {
  if (semitones === 0 && !options?.preferFlats) return line;
  return {
    ...line,
    chords: line.chords.map((c) => ({
      ...c,
      chord: transposeChord(c.chord, semitones, options),
    })),
  };
}

/**
 * Transposed *view* of an arrangement. The stored record is never mutated, so
 * the user's original transcription survives every key change.
 */
export function transposeArrangement(
  arrangement: ChordArrangement,
  semitones: number,
  options?: TransposeOptions,
): ChordArrangement {
  if (semitones === 0 && !options?.preferFlats) return arrangement;
  return {
    ...arrangement,
    sections: arrangement.sections.map((section) => ({
      ...section,
      lines: section.lines.map((line) => transposeLine(line, semitones, options)),
    })),
  };
}

/** Rewrite every chord to the shape you finger with a capo. */
export function applyCapoToArrangement(
  arrangement: ChordArrangement,
  capo: number,
  options?: TransposeOptions,
): ChordArrangement {
  if (capo <= 0) return arrangement;
  return {
    ...arrangement,
    sections: arrangement.sections.map((section) => ({
      ...section,
      lines: section.lines.map((line) => ({
        ...line,
        chords: line.chords.map((event) => ({
          ...event,
          chord: capoShape(event.chord, capo, options),
        })),
      })),
    })),
  };
}

/**
 * Practice view: transpose sounding pitch, then show capo shapes on the sheet.
 * The stored arrangement is not mutated.
 */
export function arrangementForPlay(
  arrangement: ChordArrangement,
  transpose: number,
  capo: number,
  options?: TransposeOptions,
): ChordArrangement {
  return applyCapoToArrangement(
    transposeArrangement(arrangement, transpose, options),
    capo,
    options,
  );
}

/** Every chord symbol in the arrangement, in reading order. */
export function collectChords(arrangement: ChordArrangement): string[] {
  const out: string[] = [];
  for (const section of arrangement.sections) {
    for (const line of section.lines) {
      for (const event of line.chords) out.push(event.chord);
    }
  }
  return out;
}

export function countChordEvents(arrangement: ChordArrangement): number {
  return collectChords(arrangement).length;
}

export function hasLyrics(arrangement: ChordArrangement): boolean {
  return arrangement.sections.some((s) =>
    s.lines.some((l) => (l.text ?? "").trim().length > 0),
  );
}

/** Report chord symbols the parser could not understand, for editor warnings. */
export function invalidChords(arrangement: ChordArrangement): string[] {
  return Array.from(
    new Set(collectChords(arrangement).filter((c) => !parseChord(c))),
  );
}
