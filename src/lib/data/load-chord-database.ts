import "server-only";

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { ChordArrangement, Song } from "@/lib/domain/types";
import { parseDatabaseMarkdown } from "@/lib/music/parse-database-md";

export type ChordDatabaseCatalog = {
  songs: Song[];
  arrangements: ChordArrangement[];
};

let cached: ChordDatabaseCatalog | null = null;

export function chordDatabaseDir(): string {
  return path.join(process.cwd(), "ChordDatabase");
}

export async function loadChordDatabase(): Promise<ChordDatabaseCatalog> {
  if (process.env.NODE_ENV === "production" && cached) return cached;
  const dir = chordDatabaseDir();
  const names = (await readdir(dir)).filter((name) => name.endsWith(".md")).sort();
  const songs: Song[] = [];
  const arrangements: ChordArrangement[] = [];

  for (const name of names) {
    const slug = name.slice(0, -3);
    const markdown = await readFile(path.join(dir, name), "utf8");
    const parsed = parseDatabaseMarkdown(slug, markdown);
    if (!parsed) continue;
    songs.push(parsed.song);
    arrangements.push(parsed.arrangement);
  }

  songs.sort((a, b) => a.title.localeCompare(b.title, "en"));
  cached = { songs, arrangements };
  return cached;
}
