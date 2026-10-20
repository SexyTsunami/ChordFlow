/**
 * iTunes Search API helper.
 *
 * Looks up a ~30 second official `.m4a` preview from Apple's catalog.
 * No API key. Results are matched by title/artist so a Chinese songbook
 * title still finds the English store listing when it can.
 */

export type ItunesPreview = {
  previewUrl: string;
  trackName: string;
  artistName: string;
  collectionName?: string;
  artworkUrl?: string;
  trackViewUrl?: string;
};

export type ItunesSearchQuery = {
  title: string;
  artist: string;
  titleEn?: string;
  artistZh?: string;
};

type ItunesSongResult = {
  previewUrl?: string;
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  artworkUrl100?: string;
  trackViewUrl?: string;
};

type ItunesSearchResponse = {
  resultCount?: number;
  results?: ItunesSongResult[];
};

const ITUNES_SEARCH = "https://itunes.apple.com/search";

export function foldItunesText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsFolded(haystack: string, needle: string): boolean {
  const h = foldItunesText(haystack);
  const n = foldItunesText(needle);
  if (!h || !n) return false;
  if (h.includes(n) || n.includes(h)) return true;
  const tokens = n.split(" ").filter((token) => token.length > 1);
  return tokens.length > 0 && tokens.every((token) => h.includes(token));
}

export function scoreItunesResult(
  track: { trackName: string; artistName: string },
  query: ItunesSearchQuery,
): number {
  const titles = [query.title, query.titleEn].filter(Boolean) as string[];
  const artists = [query.artist, query.artistZh].filter(Boolean) as string[];
  let score = 0;

  if (titles.some((title) => foldItunesText(track.trackName) === foldItunesText(title))) {
    score += 8;
  } else if (titles.some((title) => containsFolded(track.trackName, title))) {
    score += 5;
  } else {
    return 0;
  }

  if (artists.some((artist) => containsFolded(track.artistName, artist))) {
    score += 6;
  }

  return score;
}

export function pickItunesPreview(
  results: ItunesSongResult[],
  query: ItunesSearchQuery,
): ItunesPreview | null {
  const ranked = results
    .filter((item) => item.previewUrl && item.trackName && item.artistName)
    .map((item) => ({
      item,
      score: scoreItunesResult(
        { trackName: item.trackName!, artistName: item.artistName! },
        query,
      ),
    }))
    .filter((entry) => entry.score >= 5)
    .sort((a, b) => b.score - a.score);

  const winner = ranked[0]?.item;
  if (!winner?.previewUrl || !winner.trackName || !winner.artistName) return null;

  return {
    previewUrl: winner.previewUrl,
    trackName: winner.trackName,
    artistName: winner.artistName,
    collectionName: winner.collectionName,
    artworkUrl: winner.artworkUrl100?.replace("100x100bb", "200x200bb"),
    trackViewUrl: winner.trackViewUrl,
  };
}

export function itunesSearchTerms(query: ItunesSearchQuery): string[] {
  const terms: string[] = [];
  const add = (value: string) => {
    const term = value.replace(/\s+/g, " ").trim();
    if (term && !terms.includes(term)) terms.push(term);
  };

  if (query.artistZh) add(`${query.title} ${query.artistZh}`);
  add(`${query.title} ${query.artist}`);
  if (query.titleEn) add(`${query.titleEn} ${query.artist}`);
  if (query.titleEn && query.artistZh) add(`${query.titleEn} ${query.artistZh}`);
  return terms.slice(0, 3);
}

function hasCjk(...values: Array<string | undefined>): boolean {
  return values.some((value) => Boolean(value && /[\u4e00-\u9fff]/.test(value)));
}

function searchUrl(term: string, country?: string): string {
  const params = new URLSearchParams({
    term,
    media: "music",
    entity: "song",
    limit: "8",
  });
  if (country) params.set("country", country);
  return `${ITUNES_SEARCH}?${params.toString()}`;
}

async function fetchItunesSongs(term: string, country?: string): Promise<ItunesSongResult[]> {
  const response = await fetch(searchUrl(term, country), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return [];
  const body = (await response.json()) as ItunesSearchResponse;
  return body.results ?? [];
}

export async function searchItunesPreview(
  query: ItunesSearchQuery,
): Promise<ItunesPreview | null> {
  const title = query.title.trim();
  const artist = query.artist.trim();
  if (!title || !artist) return null;

  const cleaned: ItunesSearchQuery = {
    title,
    artist,
    titleEn: query.titleEn?.trim() || undefined,
    artistZh: query.artistZh?.trim() || undefined,
  };

  const countries: Array<string | undefined> = hasCjk(
    cleaned.title,
    cleaned.artist,
    cleaned.artistZh,
  )
    ? ["TW", "HK", undefined]
    : [undefined, "TW", "HK"];

  let winner: ItunesPreview | null = null;
  let winnerScore = -1;

  for (const term of itunesSearchTerms(cleaned)) {
    const batches = await Promise.all(
      countries.map((country) => fetchItunesSongs(term, country)),
    );
    for (const results of batches) {
      const candidate = pickItunesPreview(results, cleaned);
      if (!candidate) continue;
      const score = scoreItunesResult(candidate, cleaned);
      if (score > winnerScore) {
        winner = candidate;
        winnerScore = score;
      }
    }
    if (winnerScore >= 12) return winner;
  }

  return winner;
}
