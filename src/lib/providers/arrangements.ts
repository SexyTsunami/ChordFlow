import type {
  ArrangementSearchResult,
  ChordArrangementProvider,
  LyricsRequest,
} from "./types";

/**
 * Chord arrangement discovery.
 *
 * There is no general, licensed API that lets an app republish other people's
 * chord sheets, so ChordFlow does not try to. This provider returns *pointers*
 * to places where an arrangement can legitimately be found; the user then
 * transcribes it (or imports their own) in the editor.
 *
 * `ChordArrangementProvider` is the seam: if you later obtain a licensed feed,
 * implement the interface, populate `arrangement`, and the rest of the app
 * will render it with proper attribution and a "verified" badge.
 */

function buildLinks(request: LyricsRequest): ArrangementSearchResult[] {
  const q = `${request.artist} ${request.title}`.trim();
  const query = encodeURIComponent(q);
  const sites: Array<{ name: string; url: string }> = [
    {
      name: "Ultimate Guitar",
      url: `https://www.ultimate-guitar.com/search.php?search_type=title&value=${query}`,
    },
    {
      name: "Chordify",
      url: `https://chordify.net/search/${query}`,
    },
    {
      name: "魔鏡歌詞網 (chords & lyrics index)",
      url: `https://mojim.com/${query}.html`,
    },
    {
      name: "Google (chord sheets)",
      url: `https://www.google.com/search?q=${encodeURIComponent(`${q} 吉他譜 chords`)}`,
    },
  ];

  return sites.map((site) => ({
    title: request.title,
    artist: request.artist,
    sourceName: site.name,
    sourceUrl: site.url,
    key: null,
    capo: null,
  }));
}

export const referenceArrangementProvider: ChordArrangementProvider = {
  id: "reference-search",
  name: "Arrangement search links",
  isConfigured: () => true,
  async search(request) {
    if (!request.title.trim()) {
      return {
        ok: false,
        error: { code: "invalid_input", message: "A song title is required." },
      };
    }
    return { ok: true, data: buildLinks(request) };
  },
};

const PROVIDERS: ChordArrangementProvider[] = [referenceArrangementProvider];

export function activeArrangementProvider(): ChordArrangementProvider {
  return PROVIDERS.find((p) => p.isConfigured()) ?? referenceArrangementProvider;
}
