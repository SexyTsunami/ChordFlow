import type {
  ArrangementSection,
  LyricLine,
  SectionType,
} from "@/lib/domain/types";
import { createId } from "@/lib/utils";
import { normalizeEstimateChord, parseChord } from "./chords";
import { parseInlineChords, toInlineChords } from "./chordsheet";

/**
 * The editor's text format.
 *
 * A whole arrangement as plain text, so it can be typed, pasted, diffed and
 * copied out again:
 *
 *   [[Verse 1]]
 *   [G]巷口的晚[D/F#]風
 *   [Cadd9]路燈剛亮起        // let it ring
 *
 *   [[Chorus x2]]
 *   …
 *
 * Round-trips losslessly for section type, label, repeat count, lyric text,
 * chord offsets and per-line notes.
 */

const SECTION_HEADER = /^\s*\[\[(.+?)\]\]\s*$/;
const NOTE_SPLIT = /\s{2,}\/\/\s?(.*)$/;

const TYPE_PATTERNS: Array<[RegExp, SectionType]> = [
  [/^pre[-\s]?chorus/i, "pre-chorus"],
  [/^post[-\s]?chorus/i, "chorus"],
  [/^chorus|^副歌/i, "chorus"],
  [/^verse|^主歌/i, "verse"],
  [/^intro|^前奏/i, "intro"],
  [/^outro|^ending|^尾奏/i, "outro"],
  [/^bridge|^橋段/i, "bridge"],
  [/^instrumental|^間奏/i, "instrumental"],
  [/^solo/i, "solo"],
  [/^interlude/i, "interlude"],
];

export function sectionTypeFromLabel(label: string): SectionType {
  for (const [pattern, type] of TYPE_PATTERNS) {
    if (pattern.test(label.trim())) return type;
  }
  return "other";
}

export function parseSheetText(input: string): ArrangementSection[] {
  const lines = (input ?? "").split(/\r?\n/);
  const sections: ArrangementSection[] = [];
  let current: ArrangementSection | null = null;

  const startSection = (rawLabel: string) => {
    const label = rawLabel.trim();
    const repeatMatch = /\s*[x×]\s*(\d+)\s*$/i.exec(label);
    const cleanLabel = repeatMatch ? label.slice(0, repeatMatch.index).trim() : label;
    current = {
      id: createId("sec"),
      type: sectionTypeFromLabel(cleanLabel),
      label: cleanLabel || undefined,
      repeat: repeatMatch ? Number(repeatMatch[1]) : undefined,
      lines: [],
    };
    sections.push(current);
  };

  for (const raw of lines) {
    const header = SECTION_HEADER.exec(raw);
    if (header) {
      startSection(header[1]);
      continue;
    }
    if (!current) {
      // Content before any header still needs somewhere to live.
      if (!raw.trim()) continue;
      startSection("Verse");
    }
    const noteMatch = NOTE_SPLIT.exec(raw);
    const body = noteMatch ? raw.slice(0, noteMatch.index) : raw;
    const line: LyricLine = parseInlineChords(
      isChordSequenceLine(body) ? chordSequenceToInline(body) : body,
    );
    if (noteMatch?.[1]) line.note = noteMatch[1].trim();
    current!.lines.push(line);
  }

  // Drop trailing blank lines in each section; keep interior spacing.
  for (const section of sections) {
    while (
      section.lines.length > 0 &&
      !section.lines[section.lines.length - 1].text.trim() &&
      section.lines[section.lines.length - 1].chords.length === 0 &&
      !section.lines[section.lines.length - 1].note
    ) {
      section.lines.pop();
    }
  }

  return sections.filter((section) => section.lines.length > 0);
}

export function sectionsToSheetText(sections: ArrangementSection[]): string {
  return sections
    .map((section) => {
      const label = section.label ?? defaultLabel(section.type);
      const repeat = section.repeat && section.repeat > 1 ? ` x${section.repeat}` : "";
      const body = section.lines
        .map((line) => {
          const text = lineToEditable(line);
          return line.note ? `${text}  // ${line.note}` : text;
        })
        .join("\n");
      return `[[${label}${repeat}]]\n${body}`;
    })
    .join("\n\n");
}

function defaultLabel(type: SectionType): string {
  const labels: Record<SectionType, string> = {
    intro: "Intro",
    verse: "Verse",
    "pre-chorus": "Pre-Chorus",
    chorus: "Chorus",
    bridge: "Bridge",
    instrumental: "Instrumental",
    solo: "Solo",
    interlude: "Interlude",
    outro: "Outro",
    other: "Section",
  };
  return labels[type];
}

/**
 * Carry `pinyin` and `translation` across an edit.
 *
 * The text format does not encode them, so they are re-attached to any line
 * whose lyric text came through the edit unchanged. Reworded lines lose them,
 * which is the right outcome — a stale romanisation is worse than none.
 */
/** Keep section notes and header annotations when the sheet text is re-parsed. */
export function preserveSectionMeta(
  nextSections: ArrangementSection[],
  previousSections: ArrangementSection[],
): ArrangementSection[] {
  const previous = new Map(
    previousSections.map((section) => [
      (section.label ?? section.type).trim().toLowerCase(),
      section,
    ]),
  );
  return nextSections.map((section) => {
    const prior = previous.get((section.label ?? section.type).trim().toLowerCase());
    if (!prior) return section;
    return {
      ...section,
      notes: section.notes ?? prior.notes,
      annotation: section.annotation ?? prior.annotation,
    };
  });
}

export function preserveLineExtras(
  nextSections: ArrangementSection[],
  previousSections: ArrangementSection[],
): ArrangementSection[] {
  const extras = new Map<string, { pinyin?: string; translation?: string }>();
  for (const section of previousSections) {
    for (const line of section.lines) {
      if (!line.pinyin && !line.translation) continue;
      const key = line.text.trim();
      if (key && !extras.has(key)) {
        extras.set(key, { pinyin: line.pinyin, translation: line.translation });
      }
    }
  }
  if (extras.size === 0) return nextSections;

  return nextSections.map((section) => ({
    ...section,
    lines: section.lines.map((line) => {
      const extra = extras.get(line.text.trim());
      return extra ? { ...line, ...extra } : line;
    }),
  }));
}

/** True when every token is a chord symbol (no lyric text). */
export function isChordSequenceLine(input: string): boolean {
  const tokens = input
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.replace(/^\[/, "").replace(/\]$/, ""));
  return tokens.length > 0 && tokens.every((token) => Boolean(parseChord(token)));
}

/** `Am F C G` → `[Am]    [F]    [C]    [G]` for the aligned renderer. */
export function chordSequenceToInline(input: string): string {
  return input
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      const bare = token.replace(/^\[/, "").replace(/\]$/, "");
      return `[${bare}]`;
    })
    .join("    ");
}

function lineToEditable(line: LyricLine): string {
  if (line.chords.length > 0 && !/[^\s]/.test(line.text ?? "")) {
    return line.chords.map((event) => event.chord).join(" ");
  }
  return toInlineChords(line);
}

export type ChordEstimateSection = {
  type: SectionType;
  label?: string;
  chords: string[];
};

/** Build arrangement sections from a chords-only estimate (no lyrics). */
export function sectionsFromChordEstimate(
  input: ChordEstimateSection[],
): ArrangementSection[] {
  const sections: ArrangementSection[] = [];
  for (const section of input) {
    const chords = section.chords
      .map((symbol) => normalizeEstimateChord(symbol) ?? "")
      .filter(Boolean);
    if (chords.length === 0) continue;
    sections.push({
      id: createId("sec"),
      type: section.type,
      ...(section.label ? { label: section.label } : {}),
      lines: [parseInlineChords(chordSequenceToInline(chords.join(" ")))],
    });
  }
  return sections;
}

export const CHORDS_ONLY_TEMPLATE = `[[Intro]]
Am    F    C    G

[[Verse]]
Am    F    C    G

[[Pre-Chorus]]
Dm    G

[[Chorus]]
F    C    G    Am
`;

export const EMPTY_SHEET_TEMPLATE = `[[Intro]]
[Am]    [F]    [C]    [G]

[[Verse 1]]
[Am]Type your lyrics here, with [F]chords in square brackets
[C]The chord lands on the character right [G]after the bracket

[[Chorus]]
[F]Works the same for 中文 — [C]每個和弦都對準一個字
[G]No spaces needed  // strum: D DU UDU
`;
