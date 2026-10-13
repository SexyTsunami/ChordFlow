import type { ChordArrangement, Song } from "@/lib/domain/types";
import { chordSequenceToInline, sectionTypeFromLabel } from "./sheet-text";
import { normalizeEstimateChord } from "./chords";
import { parseInlineChords } from "./chordsheet";

const STAMP = "2024-01-01T00:00:00.000Z";
const SECTION_HEADER = /^\*\*(.+?)\*\*\s*(.*)$/;
const META_SECTIONS = /^(notes?|sources?|credits?)$/i;
const FORM_SECTION = /^form$/i;
const KEY_RE =
  /\bKey:\s*([A-G](?:#|b|♯|♭)?(?:\s*(?:major|minor|maj|min)|m)?)/i;
const KEY_FALLBACK = /\bconcert\s+([A-G](?:#|b|♯|♭)?)/i;
const CAPO_RE = /\bcapo\s*[-:]?\s*(\d+)/i;
const TIME_RE = /\b(\d+\/\d+)\b/;

export type ParsedDatabaseSong = {
  song: Song;
  arrangement: ChordArrangement;
};

type DraftSection = {
  type: ReturnType<typeof sectionTypeFromLabel>;
  label: string;
  annotation?: string;
  lines: string[][];
  notes: string[];
};

function looksLatin(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9 .,'&+!?-]*$/.test(value);
}

function parseTitleLine(line: string): Pick<Song, "title" | "titleEn" | "titlePinyin"> {
  const trimmed = line.trim();
  const match = trimmed.match(/^(.+?)\s*\((.+)\)\s*$/);
  if (!match) return { title: trimmed };
  const title = match[1].trim();
  const inner = match[2].trim();
  const parts = inner.split(/\s*\/\s*/).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      title,
      titlePinyin: looksLatin(parts[0]) ? parts[0] : undefined,
      titleEn: parts[parts.length - 1],
    };
  }
  if (/[\u4e00-\u9fff]/.test(title) && looksLatin(inner)) {
    return { title, titlePinyin: inner };
  }
  return { title, titleEn: inner };
}

function parseArtistLine(line: string): Pick<Song, "artist" | "artistZhHans"> {
  const rest = line.replace(/^Artist:\s*/i, "").trim();
  const match = rest.match(/^(.+?)\s*\((.+)\)\s*$/);
  if (!match) return { artist: rest || "Unknown artist" };
  const chinese = match[2]
    .split(/\s*\/\s*/)
    .map((part) => part.trim())
    .find((part) => /[\u4e00-\u9fff]/.test(part));
  return {
    artist: match[1].trim(),
    artistZhHans: chinese,
  };
}

function normalizeKey(raw: string | undefined): string | null {
  if (!raw) return null;
  const compact = raw
    .replace(/♯/g, "#")
    .replace(/♭/g, "b")
    .replace(/\s+/g, " ")
    .trim();
  const match = compact.match(/^([A-G](?:#|b)?)(?:\s*(major|minor|maj|min)|m)?$/i);
  if (!match) return null;
  const root = `${match[1][0].toUpperCase()}${match[1].slice(1)}`;
  const quality = (match[2] ?? "").toLowerCase();
  if (quality.startsWith("min") || compact.endsWith("m")) return `${root}m`;
  return root;
}

function parseChordCells(line: string): string[] {
  const trimmed = line.trim();
  // Standalone chord rows only — skip prose that mentions chords in backticks.
  if (!/^(`[^`]+`\s*)+$/.test(trimmed)) return [];
  const ticks = [...trimmed.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
  return ticks
    .flatMap((cell) => cell.split(/\s*[–—−\-]\s*|\s*,\s*|\s{2,}/))
    .map((token) => normalizeEstimateChord(token))
    .filter((token): token is string => Boolean(token));
}

function appendProse(bucket: string[], line: string) {
  const trimmed = line.trim();
  if (!trimmed) {
    if (bucket.length && bucket[bucket.length - 1] !== "") bucket.push("");
    return;
  }
  const last = bucket[bucket.length - 1];
  if (last && last !== "") {
    bucket[bucket.length - 1] = `${last} ${trimmed}`;
    return;
  }
  if (last === "") {
    bucket[bucket.length - 1] = trimmed;
    return;
  }
  bucket.push(trimmed);
}

function joinProse(bucket: string[]): string | undefined {
  const text = bucket.filter(Boolean).join("\n\n").trim();
  return text || undefined;
}

export function parseDatabaseMarkdown(
  slug: string,
  markdown: string,
): ParsedDatabaseSong | null {
  const lines = markdown.replace(/^\uFEFF/, "").split(/\r?\n/);
  let titleLine = "";
  let artistLine = "";
  let bodyStart = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;
    if (!titleLine) {
      titleLine = line;
      continue;
    }
    if (/^Artist:/i.test(line)) {
      artistLine = line;
      bodyStart = index + 1;
      break;
    }
    bodyStart = index;
    break;
  }
  if (!titleLine) return null;

  const titles = parseTitleLine(titleLine);
  const artists = parseArtistLine(artistLine);
  const body = lines.slice(bodyStart).join("\n");
  const key =
    normalizeKey(body.match(KEY_RE)?.[1]) ??
    normalizeKey(body.match(KEY_FALLBACK)?.[1]);
  const suggestedCapo = Number(body.match(CAPO_RE)?.[1] ?? 0);
  const timeSignature = body.match(TIME_RE)?.[1] ?? "4/4";

  const sections: DraftSection[] = [];
  const songNotes: string[] = [];
  const formLines: string[] = [];
  const miscNotes: string[] = [];
  let current: DraftSection | null = null;
  let mode: "preamble" | "section" | "form" | "misc" = "preamble";

  for (const raw of lines.slice(bodyStart)) {
    const header = SECTION_HEADER.exec(raw.trim());
    if (header) {
      const label = header[1].trim();
      const annotation = header[2].trim() || undefined;
      if (FORM_SECTION.test(label)) {
        current = null;
        mode = "form";
        continue;
      }
      if (META_SECTIONS.test(label)) {
        current = null;
        mode = "misc";
        if (annotation) appendProse(miscNotes, annotation);
        continue;
      }
      current = {
        type: sectionTypeFromLabel(label),
        label,
        annotation,
        lines: [],
        notes: [],
      };
      sections.push(current);
      mode = "section";
      continue;
    }

    const chords = parseChordCells(raw);
    if (chords.length) {
      if (!current) {
        current = { type: "verse", label: "Verse", lines: [], notes: [] };
        sections.push(current);
        mode = "section";
      }
      current.lines.push(chords);
      continue;
    }

    if (mode === "preamble") appendProse(songNotes, raw);
    else if (mode === "form") appendProse(formLines, raw);
    else if (mode === "misc") appendProse(miscNotes, raw);
    else if (current) appendProse(current.notes, raw);
    else appendProse(miscNotes, raw);
  }

  const usable = sections.filter(
    (section) => section.lines.length > 0 || joinProse(section.notes),
  );
  if (usable.length === 0) return null;

  const id = `db_${slug}`;
  const song: Song = {
    id,
    title: titles.title,
    titleEn: titles.titleEn,
    titlePinyin: titles.titlePinyin,
    artist: artists.artist,
    artistZhHans: artists.artistZhHans,
    originalKey: key,
    arrangementStatus: "user",
    tags: ["chord-database"],
    origin: "seed",
    createdAt: STAMP,
    updatedAt: STAMP,
  };

  const arrangement: ChordArrangement = {
    id: `arr_db_${slug}`,
    songId: id,
    title: "ChordDatabase sheet",
    status: "user",
    source: { kind: "user", name: "ChordDatabase" },
    originalKey: key,
    capo: 0,
    tuning: ["E", "A", "D", "G", "B", "E"],
    tuningName: "Standard",
    bpm: null,
    timeSignature,
    difficulty: null,
    notes: joinProse(songNotes),
    form: joinProse(formLines),
    miscNotes: joinProse(miscNotes),
    lyricsRights: "unavailable",
    lyricsAttribution: "Chords only — from ChordDatabase.",
    sections: usable.map((section, sectionIndex) => ({
      id: `${slug}_sec_${sectionIndex}`,
      type: section.type,
      label: section.label,
      annotation: section.annotation,
      notes: joinProse(section.notes),
      lines: section.lines.map((chords, lineIndex) => {
        const line = parseInlineChords(chordSequenceToInline(chords.join(" ")));
        return {
          ...line,
          id: `${slug}_line_${sectionIndex}_${lineIndex}`,
          chords: line.chords.map((event, eventIndex) => ({
            ...event,
            id: `${slug}_c_${sectionIndex}_${lineIndex}_${eventIndex}`,
          })),
        };
      }),
    })),
    createdAt: STAMP,
    updatedAt: STAMP,
  };

  if (
    !arrangement.notes &&
    Number.isFinite(suggestedCapo) &&
    suggestedCapo > 0
  ) {
    arrangement.notes = `Common guitar capo: fret ${suggestedCapo}. Sheet is written in concert pitch.`;
  }

  return { song, arrangement };
}
