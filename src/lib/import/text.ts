import type { RawTrackInput } from "./normalize";
import { safeParseUrl } from "./parse-url";

/**
 * Credential-free imports: a pasted track list, or a CSV file.
 * These always work, which is what keeps the app usable with no API keys.
 */

const LIST_SEPARATORS = [" - ", " – ", " — ", "\t", " by ", " | ", " / "];

export type TrackListOrder = "title-first" | "artist-first";

/** Strip "1.", "01)", "- " and similar list decorations. */
function stripBullet(line: string): string {
  return line.replace(/^\s*(?:\d{1,3}\s*[.)\-:]\s*|[-•*·]\s+)/, "").trim();
}

/**
 * Parse a pasted list of songs, one per line.
 * Supported shapes: "Title - Artist", "Artist - Title", "Title by Artist",
 * tab separated, or a bare title.
 */
export function parseTrackList(
  input: string,
  order: TrackListOrder = "title-first",
): RawTrackInput[] {
  const lines = (input ?? "").split(/\r?\n/);
  const out: RawTrackInput[] = [];

  for (const rawLine of lines) {
    const line = stripBullet(rawLine);
    if (!line) continue;

    let title = line;
    let artist = "";

    for (const separator of LIST_SEPARATORS) {
      const index = line.indexOf(separator);
      if (index > 0 && index < line.length - separator.length) {
        const left = line.slice(0, index).trim();
        const right = line.slice(index + separator.length).trim();
        if (!left || !right) break;
        // " by " always means "Title by Artist" regardless of the order flag.
        if (separator === " by " || order === "title-first") {
          title = left;
          artist = right;
        } else {
          title = right;
          artist = left;
        }
        break;
      }
    }

    out.push({ title, artist });
  }

  return out;
}

/* ------------------------------------------------------------------- CSV */

/** Minimal RFC 4180 parser: quoted fields, escaped quotes, embedded newlines. */
export function parseCsvRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const text = (input ?? "").replace(/^\uFEFF/, "");

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\r") {
      // handled by the \n branch
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

const HEADER_ALIASES: Record<string, "title" | "artist" | "album" | "sourceUrl"> = {
  title: "title",
  song: "title",
  "song title": "title",
  track: "title",
  "track name": "title",
  name: "title",
  歌名: "title",
  歌曲: "title",
  artist: "artist",
  "artist name": "artist",
  artists: "artist",
  performer: "artist",
  歌手: "artist",
  album: "album",
  "album name": "album",
  專輯: "album",
  专辑: "album",
  url: "sourceUrl",
  link: "sourceUrl",
  "source url": "sourceUrl",
  source_url: "sourceUrl",
  sourceurl: "sourceUrl",
  "track url": "sourceUrl",
  "spotify track id": "sourceUrl",
};

export type CsvParseResult = {
  tracks: RawTrackInput[];
  warnings: string[];
};

/**
 * Parse a CSV export. A header row is detected automatically; without one the
 * first two columns are treated as title and artist.
 */
export function parseTracksCsv(input: string): CsvParseResult {
  const rows = parseCsvRows(input);
  const warnings: string[] = [];
  if (rows.length === 0) return { tracks: [], warnings: ["The CSV file is empty."] };

  const headerCandidates = rows[0].map((cell) =>
    cell.trim().toLowerCase().replace(/^"|"$/g, ""),
  );
  const mapped = headerCandidates.map((cell) => HEADER_ALIASES[cell]);
  const hasHeader = mapped.some((m) => m === "title") && mapped.some((m) => m);

  const columns: Record<string, number> = {};
  let startRow = 0;

  if (hasHeader) {
    mapped.forEach((key, index) => {
      if (key && !(key in columns)) columns[key] = index;
    });
    startRow = 1;
  } else {
    warnings.push(
      "No recognised header row — using column 1 as title and column 2 as artist.",
    );
    columns.title = 0;
    if (rows[0].length > 1) columns.artist = 1;
    if (rows[0].length > 2) columns.sourceUrl = 2;
  }

  const tracks: RawTrackInput[] = [];
  for (let i = startRow; i < rows.length; i += 1) {
    const row = rows[i];
    const title = (row[columns.title] ?? "").trim();
    if (!title) {
      warnings.push(`Row ${i + 1} has no title and was skipped.`);
      continue;
    }
    const sourceUrlRaw =
      columns.sourceUrl !== undefined ? (row[columns.sourceUrl] ?? "").trim() : "";
    const sourceUrl = sourceUrlRaw ? safeParseUrl(sourceUrlRaw) : null;
    if (sourceUrlRaw && !sourceUrl) {
      warnings.push(`Row ${i + 1} has an invalid source URL and it was dropped.`);
    }

    tracks.push({
      title,
      artist: columns.artist !== undefined ? (row[columns.artist] ?? "").trim() : "",
      album: columns.album !== undefined ? (row[columns.album] ?? "").trim() : undefined,
      externalUrl: sourceUrl ? sourceUrl.toString() : undefined,
    });
  }

  if (tracks.length === 0) warnings.push("No usable rows were found in the CSV.");
  return { tracks, warnings };
}

export const CSV_TEMPLATE = `title,artist,album,source_url
晴天,周杰倫,葉惠美,
告白氣球,周杰倫,周杰倫的床邊故事,
Mojito,周杰倫,Single,
`;
