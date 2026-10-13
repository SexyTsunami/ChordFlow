import type { ChordArrangement, Song } from "@/lib/domain/types";
import {
  arrangementToDatabaseMarkdown,
  markdownFilenameForSong,
} from "@/lib/music/to-database-md";

export type SheetEditNote = {
  songId: string;
  filename: string;
  title: string;
  artist: string;
  markdown: string;
  /** Optional reminder you typed when saving, for later desktop work. */
  desktopNote?: string;
  updatedAt: string;
};

const STORAGE_KEY = "chordflow:sheet-edits";
const CHANGED_EVENT = "chordflow:sheet-edits-changed";

function readAll(): SheetEditNote[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SheetEditNote =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as SheetEditNote).songId === "string" &&
        typeof (item as SheetEditNote).markdown === "string",
    );
  } catch {
    return [];
  }
}

function writeAll(notes: SheetEditNote[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

export function listSheetEdits(): SheetEditNote[] {
  return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getSheetEdit(songId: string): SheetEditNote | null {
  return readAll().find((item) => item.songId === songId) ?? null;
}

export function saveSheetEditFromArrangement(
  song: Song,
  arrangement: ChordArrangement,
  desktopNote?: string,
): SheetEditNote {
  const note: SheetEditNote = {
    songId: song.id,
    filename: markdownFilenameForSong(song),
    title: song.title,
    artist: song.artist,
    markdown: arrangementToDatabaseMarkdown(song, arrangement),
    desktopNote: desktopNote?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  };
  const next = readAll().filter((item) => item.songId !== song.id);
  next.push(note);
  writeAll(next);
  return note;
}

export function removeSheetEdit(songId: string) {
  writeAll(readAll().filter((item) => item.songId !== songId));
}

export function clearSheetEdits() {
  writeAll([]);
}

export function subscribeSheetEdits(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => onChange();
  window.addEventListener(CHANGED_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHANGED_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function allEditsMarkdown(notes: SheetEditNote[]): string {
  if (notes.length === 0) return "";
  return notes
    .map((note) => {
      const header = [
        `# ${note.filename}`,
        `${note.title} · ${note.artist}`,
        `Saved ${note.updatedAt}`,
        note.desktopNote ? `Note: ${note.desktopNote}` : "",
        "",
        "Replace ChordDatabase/" + note.filename + " with:",
        "",
      ]
        .filter((line) => line !== "")
        .join("\n");
      return `${header}\n${note.markdown.trimEnd()}\n`;
    })
    .join("\n---\n\n");
}
