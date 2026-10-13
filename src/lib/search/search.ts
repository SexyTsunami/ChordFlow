import type { Difficulty, Song } from "@/lib/domain/types";

/**
 * Song search tuned for a bilingual library.
 *
 * A single query box has to cope with 晴天, 晴天 (simplified), "qing tian",
 * "qingtian", "qt" and "Sunny Day". Rather than guessing which one the user
 * typed, every song is reduced to a bundle of normalised haystacks and the
 * best scoring match wins.
 */

const DIFFICULTY_ORDER: Record<Difficulty, number> = {
  beginner: 0,
  easy: 1,
  intermediate: 2,
  advanced: 3,
};

/** Lowercase, strip pinyin tone marks and punctuation. */
export function normalize(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[·‧、，,.。!！?？'"“”‘’()（）\[\]【】\-_/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Same as `normalize` but with all spacing removed, for "qingtian". */
export function compact(input: string): string {
  return normalize(input).replace(/\s+/g, "");
}

/** First letter of each pinyin syllable: "Qing Tian" -> "qt". */
export function pinyinInitials(pinyin: string): string {
  return normalize(pinyin)
    .split(" ")
    .filter(Boolean)
    .map((syllable) => syllable[0])
    .join("");
}

export type SongHaystack = {
  titles: string[];
  people: string[];
  pinyinCompact: string[];
  initials: string[];
};

export function buildHaystack(song: Song): SongHaystack {
  const titles = [song.title, song.titleZhHans, song.titleEn, song.titlePinyin]
    .filter(Boolean)
    .map((v) => normalize(v as string));

  const people = [
    song.artist,
    song.artistZhHans,
    song.artistPinyin,
    song.album,
    song.albumZhHans,
    ...(song.tags ?? []),
  ]
    .filter(Boolean)
    .map((v) => normalize(v as string));

  const pinyinCompact = [song.titlePinyin, song.artistPinyin]
    .filter(Boolean)
    .map((v) => compact(v as string));

  const initials = [song.titlePinyin, song.artistPinyin]
    .filter(Boolean)
    .map((v) => pinyinInitials(v as string));

  return { titles, people, pinyinCompact, initials };
}

/** 0 when the song does not match at all. Higher is a better match. */
export function scoreSong(song: Song, query: string): number {
  const q = normalize(query);
  if (!q) return 1;
  const qCompact = compact(query);
  const hay = buildHaystack(song);

  let best = 0;
  const bump = (value: number) => {
    if (value > best) best = value;
  };

  for (const title of hay.titles) {
    if (title === q) bump(120);
    else if (title.startsWith(q)) bump(95);
    else if (title.includes(q)) bump(75);
    const titleCompact = title.replace(/\s+/g, "");
    if (titleCompact === qCompact) bump(115);
    else if (titleCompact.startsWith(qCompact)) bump(90);
    else if (titleCompact.includes(qCompact)) bump(65);
  }

  for (const value of hay.pinyinCompact) {
    if (value === qCompact) bump(110);
    else if (value.startsWith(qCompact)) bump(85);
    else if (value.includes(qCompact)) bump(55);
  }

  // Initial-letter search only makes sense for short, letters-only queries.
  if (/^[a-z]{1,8}$/.test(qCompact)) {
    for (const value of hay.initials) {
      if (value === qCompact) bump(80);
      else if (value.startsWith(qCompact)) bump(60);
    }
  }

  for (const value of hay.people) {
    if (value === q) bump(50);
    else if (value.includes(q)) bump(35);
    else if (value.replace(/\s+/g, "").includes(qCompact)) bump(30);
  }

  return best;
}

export type SortKey = "relevance" | "title" | "artist" | "difficulty" | "year";

export type SearchOptions = {
  query?: string;
  tags?: string[];
  difficulty?: Difficulty[];
  /** Restrict to songs that have (or lack) a chord sheet. */
  hasArrangement?: boolean;
  sort?: SortKey;
  direction?: "asc" | "desc";
  limit?: number;
};

function sortValue(song: Song, key: SortKey): string | number {
  switch (key) {
    case "title":
      return (song.titlePinyin || song.titleEn || song.title).toLowerCase();
    case "artist":
      return (song.artistPinyin || song.artist).toLowerCase();
    case "difficulty":
      // Songs without a rated difficulty sort last in ascending order.
      return song.difficulty ? DIFFICULTY_ORDER[song.difficulty] : 99;
    case "year":
      return song.releaseYear ?? 0;
    default:
      return 0;
  }
}

export function searchSongs(songs: Song[], options: SearchOptions = {}): Song[] {
  const {
    query = "",
    tags,
    difficulty,
    hasArrangement,
    sort = query.trim() ? "relevance" : "title",
    direction = "asc",
    limit,
  } = options;

  const scored: Array<{ song: Song; score: number; index: number }> = [];

  songs.forEach((song, index) => {
    if (tags?.length && !tags.every((t) => song.tags?.includes(t))) return;
    if (difficulty?.length && (!song.difficulty || !difficulty.includes(song.difficulty))) {
      return;
    }
    if (typeof hasArrangement === "boolean") {
      const has = song.arrangementStatus !== "unavailable";
      if (has !== hasArrangement) return;
    }
    const score = query.trim() ? scoreSong(song, query) : 1;
    if (score <= 0) return;
    scored.push({ song, score, index });
  });

  scored.sort((a, b) => {
    if (sort === "relevance") {
      if (b.score !== a.score) return b.score - a.score;
      return a.index - b.index;
    }
    const av = sortValue(a.song, sort);
    const bv = sortValue(b.song, sort);
    let cmp: number;
    if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
    else cmp = String(av).localeCompare(String(bv), "en");
    if (cmp === 0) cmp = a.index - b.index;
    return direction === "desc" ? -cmp : cmp;
  });

  const result = scored.map((s) => s.song);
  return typeof limit === "number" ? result.slice(0, limit) : result;
}
