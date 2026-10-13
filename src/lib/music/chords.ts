/**
 * Chord parsing, transposition and capo maths.
 *
 * Everything here is pure and synchronous so it can be unit tested and used
 * identically on the server and in the browser.
 */

export const SHARP_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

export const FLAT_NAMES = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
] as const;

const LETTER_PITCH: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/** Keys conventionally written with flats. Used to pick enharmonic spelling. */
const FLAT_KEYS = new Set([
  "F",
  "Bb",
  "Eb",
  "Ab",
  "Db",
  "Gb",
  "Cb",
  "Dm",
  "Gm",
  "Cm",
  "Fm",
  "Bbm",
  "Ebm",
  "Abm",
]);

const NO_CHORD = new Set(["N.C.", "NC", "N.C", "-", "—", "%"]);

export type ParsedChord = {
  /** Pitch class 0-11 of the root. */
  rootPc: number;
  /** Root exactly as written, e.g. "Bb". */
  rootText: string;
  /** Everything after the root, e.g. "m7", "sus4", "maj7". */
  quality: string;
  /** Pitch class of the slash bass note, when present. */
  bassPc: number | null;
  bassText: string | null;
  raw: string;
};

/** Normalise unicode accidentals so ♯/♭ behave like #/b. */
export function normalizeAccidentals(input: string): string {
  return input.replace(/♯/g, "#").replace(/♭/g, "b").replace(/\u2010|\u2011/g, "-");
}

function readNote(
  input: string,
): { pc: number; text: string; length: number } | null {
  const letter = input[0]?.toUpperCase();
  if (!letter || !(letter in LETTER_PITCH)) return null;
  let pc = LETTER_PITCH[letter];
  let i = 1;
  let accidentals = "";
  while (i < input.length && (input[i] === "#" || input[i] === "b")) {
    // Only treat up to two accidentals as part of the note name; beyond that
    // it is almost certainly chord-quality text like "7b9b13".
    if (accidentals.length >= 2) break;
    pc += input[i] === "#" ? 1 : -1;
    accidentals += input[i];
    i += 1;
  }
  return {
    pc: ((pc % 12) + 12) % 12,
    text: letter + accidentals,
    length: i,
  };
}

/**
 * Parse a chord symbol. Returns `null` for anything that is not a chord,
 * including "N.C." and free text, so callers can pass through unknown tokens.
 */
/** Clean an estimate token so `[Am]`, `H7`, or `C add9` can still parse. */
export function normalizeEstimateChord(symbol: string): string | null {
  let raw = normalizeAccidentals(symbol ?? "").trim();
  raw = raw.replace(/^\[+|\]+$/g, "").trim();
  if (!raw) return null;
  if (/^H(?![a-gi-z])/i.test(raw)) raw = `B${raw.slice(1)}`;
  raw = raw.replace(/\s+/g, "");
  const parsed = parseChord(raw);
  return parsed ? raw : null;
}

export function parseChord(symbol: string): ParsedChord | null {
  const raw = normalizeAccidentals(symbol ?? "").trim();
  if (!raw || NO_CHORD.has(raw.toUpperCase())) return null;

  const slashIndex = raw.indexOf("/");
  const head = slashIndex === -1 ? raw : raw.slice(0, slashIndex);
  const tail = slashIndex === -1 ? "" : raw.slice(slashIndex + 1);

  const root = readNote(head);
  if (!root) return null;

  const quality = head.slice(root.length);
  // Reject tokens that only coincidentally start with a note letter, such as
  // "Bridge" or "End".
  if (quality && !/^[A-Za-z0-9#b+°ø△Δ\-(),.\s]*$/.test(quality)) return null;
  if (/^[a-z]{3,}/.test(quality) && !/^(maj|min|sus|add|dim|aug|alt)/.test(quality)) {
    return null;
  }

  let bassPc: number | null = null;
  let bassText: string | null = null;
  if (tail) {
    const bass = readNote(tail);
    if (!bass || bass.length !== tail.length) return null;
    bassPc = bass.pc;
    bassText = bass.text;
  }

  return { rootPc: root.pc, rootText: root.text, quality, bassPc, bassText, raw };
}

export function isChordSymbol(symbol: string): boolean {
  return parseChord(symbol) !== null;
}

export function pitchClassOf(note: string): number | null {
  const parsed = readNote(normalizeAccidentals(note).trim());
  if (!parsed) return null;
  return parsed.pc;
}

export function noteName(pitchClass: number, preferFlats = false): string {
  const pc = ((pitchClass % 12) + 12) % 12;
  return preferFlats ? FLAT_NAMES[pc] : SHARP_NAMES[pc];
}

/** True when a key signature is conventionally spelled with flats. */
export function keyPrefersFlats(key: string | null | undefined): boolean {
  if (!key) return false;
  const normalized = normalizeAccidentals(key).trim().replace(/\s+/g, "");
  const compact = normalized
    .replace(/minor$/i, "m")
    .replace(/major$/i, "")
    .replace(/maj$/i, "");
  return FLAT_KEYS.has(compact);
}

export type TransposeOptions = {
  /** Force flat spelling. Takes priority over `targetKey`. */
  preferFlats?: boolean;
  /** Derive flat/sharp spelling from the resulting key. */
  targetKey?: string | null;
};

function shouldUseFlats(options: TransposeOptions | undefined): boolean {
  if (!options) return false;
  if (typeof options.preferFlats === "boolean") return options.preferFlats;
  return keyPrefersFlats(options.targetKey);
}

/**
 * Transpose a single chord symbol by `semitones`.
 * Unrecognised tokens (including "N.C.") are returned untouched.
 */
export function transposeChord(
  symbol: string,
  semitones: number,
  options?: TransposeOptions,
): string {
  const parsed = parseChord(symbol);
  if (!parsed) return symbol;
  if (semitones === 0 && !options?.preferFlats && !options?.targetKey) {
    return parsed.raw;
  }
  const flats = shouldUseFlats(options);
  const root = noteName(parsed.rootPc + semitones, flats);
  const bass =
    parsed.bassPc === null ? "" : `/${noteName(parsed.bassPc + semitones, flats)}`;
  return `${root}${parsed.quality}${bass}`;
}

export function transposeChords(
  symbols: string[],
  semitones: number,
  options?: TransposeOptions,
): string[] {
  return symbols.map((s) => transposeChord(s, semitones, options));
}

/**
 * Transpose a key name such as "C", "Am", "F#m" or "Bb".
 * Returns `null` when the key is unknown — we never invent one.
 */
export function transposeKey(
  key: string | null | undefined,
  semitones: number,
  options?: TransposeOptions,
): string | null {
  if (!key) return null;
  const normalized = normalizeAccidentals(key).trim();
  const root = readNote(normalized);
  if (!root) return null;
  const suffix = normalized.slice(root.length);
  const isMinor = /^m(in(or)?)?$/i.test(suffix.trim()) || /^m\b/.test(suffix);
  const targetPc = ((root.pc + semitones) % 12 + 12) % 12;

  // Pick the spelling that produces a conventional key signature.
  const sharp = `${noteName(targetPc, false)}${isMinor ? "m" : ""}`;
  const flat = `${noteName(targetPc, true)}${isMinor ? "m" : ""}`;
  if (typeof options?.preferFlats === "boolean") {
    return options.preferFlats ? flat : sharp;
  }
  if (FLAT_KEYS.has(flat)) return flat;
  return sharp;
}

/** Shortest signed distance in semitones from `from` to `to` (-6..+6). */
export function semitonesBetween(from: string, to: string): number | null {
  const a = pitchClassOf(from);
  const b = pitchClassOf(to);
  if (a === null || b === null) return null;
  let diff = (b - a) % 12;
  if (diff > 6) diff -= 12;
  if (diff < -6) diff += 12;
  return diff;
}

/* ----------------------------------------------------------------- capo */

/**
 * Chord shapes you actually finger when a capo is clamped at `capo`.
 * A capo raises pitch, so the shape is the sounding chord transposed down.
 */
export function capoShape(
  soundingChord: string,
  capo: number,
  options?: TransposeOptions,
): string {
  return transposeChord(soundingChord, -capo, options);
}

export function capoShapes(
  soundingChords: string[],
  capo: number,
  options?: TransposeOptions,
): string[] {
  return soundingChords.map((c) => capoShape(c, capo, options));
}

/** Open-position shapes most guitarists can play without barring. */
export const EASY_OPEN_SHAPES = new Set([
  "C",
  "D",
  "E",
  "G",
  "A",
  "Am",
  "Em",
  "Dm",
  "C7",
  "D7",
  "E7",
  "G7",
  "A7",
  "B7",
  "Am7",
  "Em7",
  "Dm7",
  "Cmaj7",
  "Gmaj7",
  "Amaj7",
  "Dmaj7",
  "Fmaj7",
  "Asus2",
  "Asus4",
  "Dsus2",
  "Dsus4",
  "Esus4",
  "Gsus4",
  "Csus2",
]);

export type CapoSuggestion = {
  capo: number;
  /** Shapes you finger with this capo, in the same order as the input. */
  shapes: string[];
  /** How many distinct shapes are easy open chords. */
  easyCount: number;
  totalCount: number;
  score: number;
};

/**
 * Rank capo positions 0..`maxCapo` by how many of the song's chords become
 * easy open shapes. This is a playability heuristic, not music theory truth.
 */
export function suggestCapos(
  chords: string[],
  options?: { maxCapo?: number; preferFlats?: boolean; limit?: number },
): CapoSuggestion[] {
  const maxCapo = options?.maxCapo ?? 7;
  const limit = options?.limit ?? 4;
  const unique = Array.from(
    new Set(chords.map((c) => parseChord(c)?.raw).filter(Boolean) as string[]),
  );
  if (unique.length === 0) return [];

  const suggestions: CapoSuggestion[] = [];
  for (let capo = 0; capo <= maxCapo; capo += 1) {
    const shapes = capoShapes(unique, capo, { preferFlats: options?.preferFlats });
    const easyCount = shapes.filter((s) => EASY_OPEN_SHAPES.has(s)).length;
    // Prefer more easy shapes, then lower capo positions.
    const score = easyCount * 100 - capo;
    suggestions.push({
      capo,
      shapes,
      easyCount,
      totalCount: unique.length,
      score,
    });
  }

  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Collect the distinct chord symbols used by an arrangement, in order. */
export function uniqueChords(chords: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const chord of chords) {
    const parsed = parseChord(chord);
    if (!parsed) continue;
    if (seen.has(parsed.raw)) continue;
    seen.add(parsed.raw);
    out.push(parsed.raw);
  }
  return out;
}

/** Simplify a chord to a beginner-friendlier shape (triad / basic seventh). */
export function simplifyChord(symbol: string): string {
  const parsed = parseChord(symbol);
  if (!parsed) return symbol;
  const q = parsed.quality.toLowerCase();
  let simple = "";
  if (/^m(?!aj)/.test(q)) simple = q.includes("7") ? "m7" : "m";
  else if (q.startsWith("dim")) simple = "m";
  else if (q.startsWith("aug") || q.startsWith("+")) simple = "";
  else if (q.startsWith("maj") || q.startsWith("△")) simple = "maj7";
  else if (q.startsWith("sus")) simple = q.startsWith("sus2") ? "sus2" : "sus4";
  else if (q.includes("7")) simple = "7";
  return `${parsed.rootText}${simple}`;
}
