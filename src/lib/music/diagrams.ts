import { parseChord, noteName } from "./chords";

/**
 * Guitar chord diagram generation.
 *
 * Two sources of shapes:
 *  1. A table of idiomatic open-position voicings (what people actually play).
 *  2. Movable E-form / A-form barre templates, used for everything else so an
 *     unusual chord still produces a correct, playable diagram.
 */

export type Barre = {
  fret: number;
  /** String indices, 0 = low E (6th string) … 5 = high E (1st string). */
  from: number;
  to: number;
};

export type ChordDiagram = {
  name: string;
  /** 6 entries, index 0 = low E. -1 = muted, 0 = open, n = absolute fret. */
  frets: number[];
  /** 6 entries, 0 = no finger / open / muted, 1-4 = index…pinky. */
  fingers: number[];
  /** Lowest fret drawn on the diagram (1 for open-position shapes). */
  baseFret: number;
  barres: Barre[];
  /** Slash-chord bass note, when the symbol requested one. */
  bassNote?: string;
  /** Set when we had to approximate (e.g. 13th rendered as a 7th shape). */
  approximated?: boolean;
};

export const STANDARD_TUNING = ["E", "A", "D", "G", "B", "E"];
/** Pitch classes of standard tuning, low to high. */
const TUNING_PCS = [4, 9, 2, 7, 11, 4];

const E_FORM_ROOT_PC = 4; // low E string
const A_FORM_ROOT_PC = 9; // A string

type Template = {
  /** Fret offsets relative to the root fret; -1 means muted. */
  offsets: number[];
  fingers: number[];
  /** String index that carries the root. */
  rootString: number;
};

/** Open E / open A voicings expressed as offsets, used as movable templates. */
const E_FORM: Record<string, Template> = {
  maj: { offsets: [0, 2, 2, 1, 0, 0], fingers: [1, 3, 4, 2, 1, 1], rootString: 0 },
  m: { offsets: [0, 2, 2, 0, 0, 0], fingers: [1, 3, 4, 1, 1, 1], rootString: 0 },
  "7": { offsets: [0, 2, 0, 1, 0, 0], fingers: [1, 3, 1, 2, 1, 1], rootString: 0 },
  m7: { offsets: [0, 2, 0, 0, 0, 0], fingers: [1, 3, 1, 1, 1, 1], rootString: 0 },
  maj7: { offsets: [0, 2, 1, 1, 0, 0], fingers: [1, 4, 2, 3, 1, 1], rootString: 0 },
  sus4: { offsets: [0, 2, 2, 2, 0, 0], fingers: [1, 2, 3, 4, 1, 1], rootString: 0 },
  sus2: { offsets: [0, 2, 4, 4, 0, 0], fingers: [1, 2, 3, 4, 1, 1], rootString: 0 },
  "6": { offsets: [0, 2, 2, 1, 2, 0], fingers: [1, 3, 4, 2, 4, 1], rootString: 0 },
  m6: { offsets: [0, 2, 2, 0, 2, 0], fingers: [1, 3, 4, 1, 4, 1], rootString: 0 },
  "7sus4": { offsets: [0, 2, 0, 2, 0, 0], fingers: [1, 3, 1, 4, 1, 1], rootString: 0 },
  "9": { offsets: [0, 2, 0, 1, 0, 2], fingers: [1, 3, 1, 2, 1, 4], rootString: 0 },
  add9: { offsets: [0, 2, 2, 1, 0, 2], fingers: [1, 3, 4, 2, 1, 4], rootString: 0 },
  aug: { offsets: [0, 3, 2, 1, 1, 0], fingers: [1, 4, 3, 2, 2, 1], rootString: 0 },
  mmaj7: { offsets: [0, 2, 1, 0, 0, 0], fingers: [1, 3, 2, 1, 1, 1], rootString: 0 },
};

const A_FORM: Record<string, Template> = {
  maj: { offsets: [-1, 0, 2, 2, 2, 0], fingers: [0, 1, 3, 3, 3, 1], rootString: 1 },
  m: { offsets: [-1, 0, 2, 2, 1, 0], fingers: [0, 1, 3, 4, 2, 1], rootString: 1 },
  "7": { offsets: [-1, 0, 2, 0, 2, 0], fingers: [0, 1, 3, 1, 4, 1], rootString: 1 },
  m7: { offsets: [-1, 0, 2, 0, 1, 0], fingers: [0, 1, 3, 1, 2, 1], rootString: 1 },
  maj7: { offsets: [-1, 0, 2, 1, 2, 0], fingers: [0, 1, 3, 2, 4, 1], rootString: 1 },
  sus4: { offsets: [-1, 0, 2, 2, 3, 0], fingers: [0, 1, 2, 3, 4, 1], rootString: 1 },
  sus2: { offsets: [-1, 0, 2, 2, 0, 0], fingers: [0, 1, 3, 4, 1, 1], rootString: 1 },
  "6": { offsets: [-1, 0, 2, 2, 2, 2], fingers: [0, 1, 2, 3, 4, 4], rootString: 1 },
  m6: { offsets: [-1, 0, 2, 2, 1, 2], fingers: [0, 1, 3, 4, 2, 4], rootString: 1 },
  "7sus4": { offsets: [-1, 0, 2, 0, 3, 0], fingers: [0, 1, 3, 1, 4, 1], rootString: 1 },
  "9": { offsets: [-1, 0, 2, 4, 2, 3], fingers: [0, 1, 2, 4, 2, 3], rootString: 1 },
  add9: { offsets: [-1, 0, 2, 4, 2, 0], fingers: [0, 1, 2, 4, 3, 1], rootString: 1 },
  dim: { offsets: [-1, 0, 1, 2, 1, -1], fingers: [0, 1, 2, 4, 3, 0], rootString: 1 },
  dim7: { offsets: [-1, 0, 1, 2, 1, 2], fingers: [0, 1, 2, 3, 2, 4], rootString: 1 },
  m7b5: { offsets: [-1, 0, 1, 0, 1, -1], fingers: [0, 1, 2, 1, 3, 0], rootString: 1 },
  aug: { offsets: [-1, 0, 3, 2, 2, 1], fingers: [0, 1, 4, 2, 3, 1], rootString: 1 },
  mmaj7: { offsets: [-1, 0, 2, 1, 1, 0], fingers: [0, 1, 4, 2, 3, 1], rootString: 1 },
};

/** Idiomatic open-position voicings, keyed by the exact chord symbol. */
const OPEN_CHORDS: Record<string, { frets: number[]; fingers: number[] }> = {
  C: { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
  Cmaj7: { frets: [-1, 3, 2, 0, 0, 0], fingers: [0, 3, 2, 0, 0, 0] },
  C7: { frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0] },
  Cadd9: { frets: [-1, 3, 2, 0, 3, 0], fingers: [0, 2, 1, 0, 3, 0] },
  Csus2: { frets: [-1, 3, 0, 0, 1, 3], fingers: [0, 3, 0, 0, 1, 4] },
  D: { frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
  Dm: { frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
  D7: { frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3] },
  Dm7: { frets: [-1, -1, 0, 2, 1, 1], fingers: [0, 0, 0, 2, 1, 1] },
  Dmaj7: { frets: [-1, -1, 0, 2, 2, 2], fingers: [0, 0, 0, 1, 2, 3] },
  Dsus2: { frets: [-1, -1, 0, 2, 3, 0], fingers: [0, 0, 0, 1, 2, 0] },
  Dsus4: { frets: [-1, -1, 0, 2, 3, 3], fingers: [0, 0, 0, 1, 2, 3] },
  E: { frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] },
  Em: { frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] },
  E7: { frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0] },
  Em7: { frets: [0, 2, 0, 0, 0, 0], fingers: [0, 2, 0, 0, 0, 0] },
  Emaj7: { frets: [0, 2, 1, 1, 0, 0], fingers: [0, 3, 1, 2, 0, 0] },
  Esus4: { frets: [0, 2, 2, 2, 0, 0], fingers: [0, 1, 2, 3, 0, 0] },
  Fmaj7: { frets: [-1, -1, 3, 2, 1, 0], fingers: [0, 0, 3, 2, 1, 0] },
  G: { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3] },
  G7: { frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1] },
  Gmaj7: { frets: [3, 2, 0, 0, 0, 2], fingers: [3, 1, 0, 0, 0, 2] },
  Gsus4: { frets: [3, 3, 0, 0, 1, 3], fingers: [2, 3, 0, 0, 1, 4] },
  A: { frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0] },
  Am: { frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
  A7: { frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0] },
  Am7: { frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 0, 2, 0, 1, 0] },
  Amaj7: { frets: [-1, 0, 2, 1, 2, 0], fingers: [0, 0, 2, 1, 3, 0] },
  Asus2: { frets: [-1, 0, 2, 2, 0, 0], fingers: [0, 0, 1, 2, 0, 0] },
  Asus4: { frets: [-1, 0, 2, 2, 3, 0], fingers: [0, 0, 1, 2, 3, 0] },
  B7: { frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4] },
  "G/B": { frets: [-1, 2, 0, 0, 0, 3], fingers: [0, 2, 0, 0, 0, 3] },
  "C/G": { frets: [3, 3, 2, 0, 1, 0], fingers: [3, 4, 2, 0, 1, 0] },
  "D/F#": { frets: [2, 0, 0, 2, 3, 2], fingers: [1, 0, 0, 2, 4, 3] },
  "Am/G": { frets: [3, 0, 2, 2, 1, 0], fingers: [3, 0, 2, 4, 1, 0] },
  "F/C": { frets: [-1, 3, 3, 2, 1, 1], fingers: [0, 3, 4, 2, 1, 1] },
};

/** Map a raw chord-quality string onto one of our template keys. */
export function canonicalQuality(quality: string): {
  key: string;
  approximated: boolean;
} {
  const q = quality.trim().replace(/^-/, "m").replace(/[()]/g, "");
  const lower = q.toLowerCase();

  if (q === "" || lower === "maj" || lower === "major" || lower === "M") {
    return { key: "maj", approximated: false };
  }
  const table: Array<[RegExp, string, boolean]> = [
    [/^(m|min|minor)7b5$/i, "m7b5", false],
    [/^(ø|o7|°7|dim7)$/i, "dim7", false],
    [/^(°|dim|o)$/i, "dim", false],
    [/^(\+|aug|#5)$/i, "aug", false],
    [/^(m|min|minor)(maj|M)7$/i, "mmaj7", false],
    [/^(m|min|minor)6$/i, "m6", false],
    [/^(m|min|minor)7$/i, "m7", false],
    [/^(m|min|minor)9$/i, "m7", true],
    [/^(m|min|minor)11$/i, "m7", true],
    [/^(m|min|minor)(add)?9$/i, "m7", true],
    [/^(m|min|minor)$/i, "m", false],
    [/^(maj|M|△|Δ)7$/i, "maj7", false],
    [/^(maj|M|△|Δ)9$/i, "maj7", true],
    [/^7sus4?$/i, "7sus4", false],
    [/^9sus4?$/i, "7sus4", true],
    [/^sus2$/i, "sus2", false],
    [/^sus4?$/i, "sus4", false],
    [/^add9$/i, "add9", false],
    [/^add11$/i, "add9", true],
    [/^6\/?9$/i, "6", true],
    [/^6$/i, "6", false],
    [/^9$/i, "9", false],
    [/^(11|13)$/i, "9", true],
    [/^7[#b](5|9|11|13)$/i, "7", true],
    [/^7$/i, "7", false],
    [/^5$/i, "maj", true],
  ];
  for (const [pattern, key, approx] of table) {
    if (pattern.test(q)) return { key, approximated: approx };
  }
  // Anything exotic falls back to a plain triad and is flagged as approximate.
  if (/^m/i.test(q) && !/^maj/i.test(q)) return { key: "m", approximated: true };
  return { key: "maj", approximated: true };
}

function computeBarres(frets: number[], rootFret: number): Barre[] {
  if (rootFret <= 0) return [];
  const indices = frets
    .map((f, i) => (f === rootFret ? i : -1))
    .filter((i) => i !== -1);
  if (indices.length < 2) return [];
  const from = indices[0];
  const to = indices[indices.length - 1];
  for (let i = from; i <= to; i += 1) {
    if (frets[i] < rootFret) return [];
  }
  return [{ fret: rootFret, from, to }];
}

function fromTemplate(template: Template, rootFret: number): {
  frets: number[];
  fingers: number[];
  barres: Barre[];
} {
  const frets = template.offsets.map((o) => (o === -1 ? -1 : o + rootFret));
  const barres = computeBarres(frets, rootFret);
  const fingers = template.fingers.map((f, i) =>
    frets[i] <= 0 ? 0 : rootFret === 0 && f === 1 ? 0 : f,
  );
  return { frets, fingers, barres };
}

function baseFretFor(frets: number[]): number {
  const fretted = frets.filter((f) => f > 0);
  if (fretted.length === 0) return 1;
  const min = Math.min(...fretted);
  const max = Math.max(...fretted);
  if (max <= 4) return 1;
  return Math.max(1, min);
}

/**
 * Build a diagram for a chord symbol. Returns `null` only when the symbol is
 * not a chord at all (free text, "N.C.", …).
 */
export function getChordDiagram(symbol: string): ChordDiagram | null {
  const parsed = parseChord(symbol);
  if (!parsed) return null;

  const open = OPEN_CHORDS[parsed.raw];
  if (open) {
    return {
      name: parsed.raw,
      frets: open.frets,
      fingers: open.fingers,
      baseFret: baseFretFor(open.frets),
      barres: computeBarres(open.frets, Math.min(...open.frets.filter((f) => f > 0))),
      bassNote: parsed.bassText ?? undefined,
    };
  }

  // Slash chords reuse the base triad's shape; the bass is labelled separately.
  const baseSymbol = `${parsed.rootText}${parsed.quality}`;
  const baseOpen = parsed.bassText ? OPEN_CHORDS[baseSymbol] : undefined;
  if (baseOpen) {
    return {
      name: parsed.raw,
      frets: baseOpen.frets,
      fingers: baseOpen.fingers,
      baseFret: baseFretFor(baseOpen.frets),
      barres: computeBarres(
        baseOpen.frets,
        Math.min(...baseOpen.frets.filter((f) => f > 0)),
      ),
      bassNote: parsed.bassText ?? undefined,
      approximated: true,
    };
  }

  const { key, approximated } = canonicalQuality(parsed.quality);
  const eFret = ((parsed.rootPc - E_FORM_ROOT_PC) % 12 + 12) % 12;
  const aFret = ((parsed.rootPc - A_FORM_ROOT_PC) % 12 + 12) % 12;

  const candidates: Array<{ fret: number; template: Template }> = [];
  if (E_FORM[key]) candidates.push({ fret: eFret, template: E_FORM[key] });
  if (A_FORM[key]) candidates.push({ fret: aFret, template: A_FORM[key] });
  if (candidates.length === 0) {
    candidates.push({ fret: eFret, template: E_FORM.maj });
  }

  // Prefer the shape that sits lowest on the neck; treat fret 0 as ideal.
  candidates.sort((a, b) => a.fret - b.fret);
  const chosen = candidates[0];
  const { frets, fingers, barres } = fromTemplate(chosen.template, chosen.fret);

  return {
    name: parsed.raw,
    frets,
    fingers,
    baseFret: baseFretFor(frets),
    barres,
    bassNote: parsed.bassText ?? undefined,
    approximated: approximated || Boolean(parsed.bassText),
  };
}

/** Human readable description for screen readers. */
export function describeDiagram(diagram: ChordDiagram): string {
  const stringNames = ["6th (low E)", "5th (A)", "4th (D)", "3rd (G)", "2nd (B)", "1st (high E)"];
  const parts = diagram.frets.map((fret, i) => {
    if (fret === -1) return `${stringNames[i]} string muted`;
    if (fret === 0) return `${stringNames[i]} string open`;
    const finger = diagram.fingers[i];
    return `${stringNames[i]} string fret ${fret}${finger ? ` with finger ${finger}` : ""}`;
  });
  const barre = diagram.barres.length
    ? ` Barre across fret ${diagram.barres[0].fret}.`
    : "";
  return `${diagram.name} chord diagram.${barre} ${parts.join(", ")}.`;
}

/** Note names sounded by a diagram, low to high. Useful for the info panel. */
export function diagramNotes(diagram: ChordDiagram, preferFlats = false): string[] {
  return diagram.frets
    .map((fret, i) =>
      fret === -1 ? null : noteName(TUNING_PCS[i] + fret, preferFlats),
    )
    .filter((n): n is string => n !== null);
}
