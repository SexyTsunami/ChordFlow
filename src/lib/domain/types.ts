import { z } from "zod";

/**
 * Core domain model for ChordFlow.
 *
 * These schemas are the single source of truth: API routes validate against
 * them, the storage adapters persist them, and the UI renders them. Provider
 * specific shapes (Spotify, YouTube, lyrics providers) are deliberately kept
 * out of this file and normalised into these types at the adapter boundary.
 */

/* ------------------------------------------------------------- primitives */

export const IsoDate = z.string().min(1);

export const SectionTypeSchema = z.enum([
  "intro",
  "verse",
  "pre-chorus",
  "chorus",
  "bridge",
  "instrumental",
  "solo",
  "interlude",
  "outro",
  "other",
]);
export type SectionType = z.infer<typeof SectionTypeSchema>;

export const SECTION_LABELS: Record<SectionType, string> = {
  intro: "Intro",
  verse: "Verse",
  "pre-chorus": "Pre-Chorus",
  chorus: "Chorus",
  bridge: "Bridge",
  instrumental: "Instrumental",
  solo: "Solo",
  interlude: "Interlude",
  outro: "Outro",
  other: "Section",
};

export const DifficultySchema = z.enum([
  "beginner",
  "easy",
  "intermediate",
  "advanced",
]);
export type Difficulty = z.infer<typeof DifficultySchema>;

/**
 * How trustworthy an arrangement is. This is surfaced in the UI everywhere an
 * arrangement is shown so an AI estimate is never mistaken for a verified one.
 */
export const ArrangementStatusSchema = z.enum([
  "verified",
  "user",
  "ai-estimate",
  "unavailable",
]);
export type ArrangementStatus = z.infer<typeof ArrangementStatusSchema>;

export const ARRANGEMENT_STATUS_META: Record<
  ArrangementStatus,
  { label: string; tone: "sage" | "amber" | "rose" | "neutral"; help: string }
> = {
  verified: {
    label: "Verified",
    tone: "sage",
    help: "Checked against a trusted source or confirmed by ear.",
  },
  user: {
    label: "My arrangement",
    tone: "amber",
    help: "Created or edited by you in ChordFlow.",
  },
  "ai-estimate": {
    label: "AI estimate",
    tone: "rose",
    help: "Suggested by a language model. Not verified — check by ear.",
  },
  unavailable: {
    label: "No arrangement",
    tone: "neutral",
    help: "No chord sheet is stored for this song yet.",
  },
};

export const LyricsRightsSchema = z.enum([
  "original-sample",
  "user-provided",
  "licensed-provider",
  "unavailable",
]);
export type LyricsRights = z.infer<typeof LyricsRightsSchema>;

/* ------------------------------------------------------------- catalogue */

export const ArtistSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameZhHant: z.string().optional(),
  nameZhHans: z.string().optional(),
  pinyin: z.string().optional(),
});
export type Artist = z.infer<typeof ArtistSchema>;

export const AlbumSchema = z.object({
  id: z.string(),
  title: z.string(),
  titleZhHant: z.string().optional(),
  pinyin: z.string().optional(),
  artistId: z.string(),
  releaseYear: z.number().int().optional(),
});
export type Album = z.infer<typeof AlbumSchema>;

export const SongSchema = z.object({
  id: z.string(),
  /** Traditional Chinese title, or the native title for non-CJK songs. */
  title: z.string().min(1),
  titleZhHans: z.string().optional(),
  titlePinyin: z.string().optional(),
  titleEn: z.string().optional(),
  artist: z.string().min(1),
  artistZhHans: z.string().optional(),
  artistPinyin: z.string().optional(),
  album: z.string().optional(),
  albumZhHans: z.string().optional(),
  releaseYear: z.number().int().optional(),
  /** Only set when the key has actually been verified — never guessed. */
  originalKey: z.string().nullable().optional(),
  difficulty: DifficultySchema.nullable().optional(),
  /** Official / authorised reference for the song (label channel, store page). */
  sourceUrl: z.string().url().optional(),
  arrangementStatus: ArrangementStatusSchema.default("unavailable"),
  tags: z.array(z.string()).default([]),
  /** Where the record came from: bundled seed, an import, or hand-entered. */
  origin: z.enum(["seed", "import", "user"]).default("user"),
  createdAt: IsoDate.optional(),
  updatedAt: IsoDate.optional(),
});
export type Song = z.infer<typeof SongSchema>;

/* ----------------------------------------------------------- arrangements */

/**
 * A chord anchored to a character offset inside a lyric line.
 *
 * Using a character offset (rather than whitespace padding) is what makes
 * Chinese lyrics work: 晴天 has no spaces, so "the chord sits above the 3rd
 * character" is the only alignment model that survives re-wrapping and font
 * size changes.
 */
export const ChordEventSchema = z.object({
  id: z.string(),
  /** Chord symbol as written, e.g. "C", "Am7", "F#m7b5", "G/B". */
  chord: z.string().min(1),
  /** 0-based index into the line's `text`. May equal text.length (trailing). */
  offset: z.number().int().min(0),
});
export type ChordEvent = z.infer<typeof ChordEventSchema>;

export const LyricLineSchema = z.object({
  id: z.string(),
  text: z.string().default(""),
  chords: z.array(ChordEventSchema).default([]),
  /** Romanisation shown under the line when "Show pinyin" is on. */
  pinyin: z.string().optional(),
  /** Optional English rendering, shown when "Show translation" is on. */
  translation: z.string().optional(),
  /** Optional performance note shown in a dimmer style, e.g. "x2, palm mute". */
  note: z.string().optional(),
});
export type LyricLine = z.infer<typeof LyricLineSchema>;

export const ArrangementSectionSchema = z.object({
  id: z.string(),
  type: SectionTypeSchema,
  /** Overrides the default label, e.g. "Chorus 2". */
  label: z.string().optional(),
  /** Trailing header note from markdown, e.g. "(twice)" or "(short)". */
  annotation: z.string().optional(),
  /** Prose from the markdown that belongs under this section's Details button. */
  notes: z.string().optional(),
  repeat: z.number().int().min(1).optional(),
  lines: z.array(LyricLineSchema).default([]),
});
export type ArrangementSection = z.infer<typeof ArrangementSectionSchema>;

export const ArrangementSourceSchema = z.object({
  kind: z.enum(["demo", "user", "provider", "ai", "import"]),
  name: z.string().optional(),
  url: z.string().url().optional(),
  attribution: z.string().optional(),
});
export type ArrangementSource = z.infer<typeof ArrangementSourceSchema>;

export const ChordArrangementSchema = z.object({
  id: z.string(),
  songId: z.string(),
  title: z.string().default("Arrangement"),
  status: ArrangementStatusSchema,
  source: ArrangementSourceSchema,
  /** Key the chords are written in. Null when unknown — never invented. */
  originalKey: z.string().nullable().default(null),
  capo: z.number().int().min(0).max(12).default(0),
  tuning: z.array(z.string()).default(["E", "A", "D", "G", "B", "E"]),
  tuningName: z.string().default("Standard"),
  bpm: z.number().int().min(20).max(300).nullable().default(null),
  timeSignature: z.string().default("4/4"),
  difficulty: DifficultySchema.nullable().default(null),
  /** Song-level markdown prose, shown under Song Details. */
  notes: z.string().optional(),
  /** Song structure line from the markdown Form section. */
  form: z.string().optional(),
  /** Leftover markdown prose that does not belong to a named section. */
  miscNotes: z.string().optional(),
  /**
   * Rights basis for the lyric text stored in `sections`. The renderer uses
   * this to decide whether lyrics may be displayed at all.
   */
  lyricsRights: LyricsRightsSchema.default("unavailable"),
  lyricsAttribution: z.string().optional(),
  sections: z.array(ArrangementSectionSchema).default([]),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});
export type ChordArrangement = z.infer<typeof ChordArrangementSchema>;

/* ------------------------------------------------------------- playlists */

export const PlaylistSourceSchema = z.enum([
  "local",
  "spotify",
  "youtube",
  "manual",
  "csv",
  "seed",
]);
export type PlaylistSource = z.infer<typeof PlaylistSourceSchema>;

export const MatchStatusSchema = z.enum([
  "matched",
  "probable",
  "unmatched",
  "unavailable",
]);
export type MatchStatus = z.infer<typeof MatchStatusSchema>;

export const PlaylistTrackSchema = z.object({
  id: z.string(),
  /** 0-based index preserving the order of the source playlist. */
  position: z.number().int().min(0),
  title: z.string(),
  artist: z.string().default(""),
  album: z.string().optional(),
  durationMs: z.number().int().nullable().optional(),
  externalId: z.string().optional(),
  externalUrl: z.string().url().optional(),
  /** Set when the track was matched to a song in the ChordFlow library. */
  songId: z.string().nullable().default(null),
  matchStatus: MatchStatusSchema.default("unmatched"),
  matchConfidence: z.number().min(0).max(1).optional(),
  /** Spotify/YouTube can list tracks that are region locked or deleted. */
  isUnavailable: z.boolean().default(false),
  note: z.string().optional(),
});
export type PlaylistTrack = z.infer<typeof PlaylistTrackSchema>;

export const PlaylistSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  source: PlaylistSourceSchema,
  sourceUrl: z.string().url().optional(),
  externalId: z.string().optional(),
  owner: z.string().optional(),
  imageUrl: z.string().url().optional(),
  trackCount: z.number().int().min(0).default(0),
  tracks: z.array(PlaylistTrackSchema).default([]),
  /** Number of source entries dropped as exact duplicates during import. */
  duplicatesRemoved: z.number().int().min(0).default(0),
  importWarnings: z.array(z.string()).default([]),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});
export type Playlist = z.infer<typeof PlaylistSchema>;

/* ------------------------------------------------------------ user state */

export const FavoriteSchema = z.object({
  id: z.string(),
  songId: z.string(),
  createdAt: IsoDate,
});
export type Favorite = z.infer<typeof FavoriteSchema>;

export const RecentPlaySchema = z.object({
  songId: z.string(),
  openedAt: IsoDate,
  /** Last scroll offset as a 0..1 fraction so "continue practising" resumes. */
  progress: z.number().min(0).max(1).default(0),
});
export type RecentPlay = z.infer<typeof RecentPlaySchema>;

export const PracticeSessionSchema = z.object({
  id: z.string(),
  songId: z.string(),
  arrangementId: z.string().nullable().default(null),
  startedAt: IsoDate,
  durationSeconds: z.number().int().min(0).default(0),
  bpm: z.number().int().nullable().default(null),
  transpose: z.number().int().default(0),
  capo: z.number().int().min(0).max(12).default(0),
  completed: z.boolean().default(false),
  notes: z.string().optional(),
});
export type PracticeSession = z.infer<typeof PracticeSessionSchema>;

export const UserPreferencesSchema = z.object({
  id: z.literal("preferences").default("preferences"),
  fontScale: z.number().min(0.75).max(2.2).default(1),
  showPinyin: z.boolean().default(false),
  showChordDiagrams: z.boolean().default(true),
  plainMode: z.boolean().default(false),
  scrollSpeed: z.number().min(5).max(160).default(36),
  metronomeBpm: z.number().int().min(30).max(240).default(80),
  metronomeAccent: z.number().int().min(1).max(12).default(4),
  preferFlats: z.boolean().default(false),
  lastSongId: z.string().nullable().default(null),
  /** Arrangement ids the user deleted. Seeds are rematerialized unless listed here. */
  hiddenArrangementIds: z.array(z.string()).default([]),
  /** Concert singing key saved per song id, e.g. { db_hey-jude: "G" }. */
  favoriteKeys: z.record(z.string(), z.string()).default({}),
  updatedAt: IsoDate.optional(),
});
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

export const DEFAULT_PREFERENCES: UserPreferences =
  UserPreferencesSchema.parse({});

/* ------------------------------------------------------- lyric documents */

export const LyricDocumentSchema = z.object({
  id: z.string(),
  songId: z.string(),
  language: z.enum(["zh-Hant", "zh-Hans", "en", "pinyin", "other"]),
  rights: LyricsRightsSchema,
  provider: z.string().optional(),
  attribution: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  body: z.string(),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});
export type LyricDocument = z.infer<typeof LyricDocumentSchema>;
