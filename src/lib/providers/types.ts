import type {
  ChordArrangement,
  LyricDocument,
  Song,
} from "@/lib/domain/types";
import type { RawTrackInput } from "@/lib/import/normalize";

/**
 * Provider interfaces.
 *
 * The core app only ever talks to these. Concrete adapters (Spotify, YouTube,
 * a licensed lyrics API, an LLM) live behind them, so swapping a provider or
 * running with none configured changes nothing above this boundary.
 */

export type ProviderError = {
  code:
    | "not_configured"
    | "unauthorized"
    | "forbidden"
    | "not_found"
    | "rate_limited"
    | "quota_exceeded"
    | "upstream_error"
    | "timeout"
    | "invalid_input";
  message: string;
  /** Safe to show to the user; never contains tokens. */
  hint?: string;
};

export type ProviderResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ProviderError };

export function providerFailure<T>(
  code: ProviderError["code"],
  message: string,
  hint?: string,
): ProviderResult<T> {
  return { ok: false, error: { code, message, hint } };
}

/* -------------------------------------------------- playlist importing */

export type ImportedPlaylist = {
  name: string;
  description?: string;
  owner?: string;
  imageUrl?: string;
  externalId: string;
  externalUrl: string;
  /** In source order. */
  tracks: RawTrackInput[];
  /** Non-fatal problems: skipped items, truncated pages, unavailable tracks. */
  warnings: string[];
  /** Attribution string the UI must display. */
  attribution: string;
};

export interface PlaylistImportProvider {
  readonly id: string;
  readonly name: string;
  isConfigured(): boolean;
  fetchPlaylist(playlistId: string): Promise<ProviderResult<ImportedPlaylist>>;
}

/* --------------------------------------------------- song metadata */

export interface SongMetadataProvider {
  readonly id: string;
  isConfigured(): boolean;
  search(query: string, limit?: number): Promise<ProviderResult<Partial<Song>[]>>;
}

/* ------------------------------------------------------------- lyrics */

export type LyricsRequest = {
  title: string;
  artist: string;
  durationMs?: number | null;
};

export type LyricsResponse = {
  /** Null when the provider has no licence to return the words themselves. */
  document: LyricDocument | null;
  /** Always present: where the user can legitimately read the lyrics. */
  referenceUrls: Array<{ label: string; url: string }>;
  notice: string;
};

export interface LyricsProvider {
  readonly id: string;
  readonly name: string;
  isConfigured(): boolean;
  fetchLyrics(request: LyricsRequest): Promise<ProviderResult<LyricsResponse>>;
}

/* ------------------------------------------------- chord arrangements */

export type ArrangementSearchResult = {
  /** Not a full chord sheet — a pointer to one, plus whatever we may show. */
  title: string;
  artist: string;
  sourceName: string;
  sourceUrl: string;
  key?: string | null;
  capo?: number | null;
  /** Only populated when the provider's licence permits redistribution. */
  arrangement?: ChordArrangement;
};

export interface ChordArrangementProvider {
  readonly id: string;
  readonly name: string;
  isConfigured(): boolean;
  search(
    request: LyricsRequest,
  ): Promise<ProviderResult<ArrangementSearchResult[]>>;
}

/* ----------------------------------------------------- AI assistance */

export type AiTask =
  | "suggest-progression"
  | "estimate-structure"
  | "simplify-chords"
  | "explain-progression"
  | "suggest-capo"
  | "align-chords"
  | "convert-sheet";

export type AiChordRequest = {
  task: AiTask;
  songTitle?: string;
  artist?: string;
  key?: string | null;
  /** Lyrics or an existing sheet the user has confirmed they may use. */
  userContent?: string;
  chords?: string[];
  notes?: string;
};

export type AiChordResponse = {
  /** Markdown-ish explanation to show in the assistant panel. */
  message: string;
  /** Optional structured suggestion the editor can apply. */
  suggestion?: {
    chords?: string[];
    capo?: number;
    key?: string;
    /** Inline-bracket chord sheet lines, ready for `parseInlineChords`. */
    lines?: string[];
    /** Chords-only form: verse / chorus sequences with no lyrics. */
    sections?: Array<{
      type: string;
      label?: string;
      chords: string[];
    }>;
  };
  model: string;
  disclaimer: string;
};

export interface AIChordAssistant {
  readonly id: string;
  isConfigured(): boolean;
  run(request: AiChordRequest): Promise<ProviderResult<AiChordResponse>>;
}
