import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ArrangementSection,
  ChordArrangement,
  Favorite,
  LyricLine,
  Playlist,
  PlaylistTrack,
  PracticeSession,
  RecentPlay,
  Song,
  UserPreferences,
} from "@/lib/domain/types";
import { DEFAULT_PREFERENCES } from "@/lib/domain/types";
import { nowIso } from "@/lib/utils";
import type { LibraryStore } from "./types";

/**
 * Supabase-backed library, used when Supabase is configured *and* a user is
 * signed in. Row level security scopes every query to `auth.uid()`; the
 * explicit `user_id` here keeps inserts valid against those policies.
 */

type Row = Record<string, unknown>;

function fail(context: string, error: { message: string } | null): void {
  if (error) throw new Error(`${context}: ${error.message}`);
}

/* ------------------------------------------------------------ row mapping */

function rowToSong(row: Row): Song {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    titleZhHans: (row.title_zh_hans as string) ?? undefined,
    titlePinyin: (row.title_pinyin as string) ?? undefined,
    titleEn: (row.title_en as string) ?? undefined,
    artist: String(row.artist ?? ""),
    artistZhHans: (row.artist_zh_hans as string) ?? undefined,
    artistPinyin: (row.artist_pinyin as string) ?? undefined,
    album: (row.album as string) ?? undefined,
    albumZhHans: (row.album_zh_hans as string) ?? undefined,
    releaseYear: (row.release_year as number) ?? undefined,
    originalKey: (row.original_key as string) ?? null,
    difficulty: (row.difficulty as Song["difficulty"]) ?? null,
    sourceUrl: (row.source_url as string) ?? undefined,
    arrangementStatus: (row.arrangement_status as Song["arrangementStatus"]) ?? "unavailable",
    tags: (row.tags as string[]) ?? [],
    origin: (row.origin as Song["origin"]) ?? "user",
    createdAt: (row.created_at as string) ?? undefined,
    updatedAt: (row.updated_at as string) ?? undefined,
  };
}

function songToRow(song: Song, userId: string): Row {
  return {
    id: song.id,
    user_id: userId,
    title: song.title,
    title_zh_hans: song.titleZhHans ?? null,
    title_pinyin: song.titlePinyin ?? null,
    title_en: song.titleEn ?? null,
    artist: song.artist,
    artist_zh_hans: song.artistZhHans ?? null,
    artist_pinyin: song.artistPinyin ?? null,
    album: song.album ?? null,
    album_zh_hans: song.albumZhHans ?? null,
    release_year: song.releaseYear ?? null,
    original_key: song.originalKey ?? null,
    difficulty: song.difficulty ?? null,
    source_url: song.sourceUrl ?? null,
    arrangement_status: song.arrangementStatus,
    tags: song.tags ?? [],
    origin: song.origin,
  };
}

function rowToPlaylist(row: Row): Playlist {
  const tracks = ((row.playlist_tracks as Row[]) ?? [])
    .map(
      (t): PlaylistTrack => ({
        id: String(t.id),
        position: Number(t.position ?? 0),
        title: String(t.title ?? ""),
        artist: String(t.artist ?? ""),
        album: (t.album as string) ?? undefined,
        durationMs: (t.duration_ms as number) ?? null,
        externalId: (t.external_id as string) ?? undefined,
        externalUrl: (t.external_url as string) ?? undefined,
        songId: (t.song_id as string) ?? null,
        matchStatus: (t.match_status as PlaylistTrack["matchStatus"]) ?? "unmatched",
        matchConfidence: (t.match_confidence as number) ?? undefined,
        isUnavailable: Boolean(t.is_unavailable),
        note: (t.note as string) ?? undefined,
      }),
    )
    .sort((a, b) => a.position - b.position);

  return {
    id: String(row.id),
    name: String(row.name ?? "Playlist"),
    description: (row.description as string) ?? undefined,
    source: (row.source as Playlist["source"]) ?? "manual",
    sourceUrl: (row.source_url as string) ?? undefined,
    externalId: (row.external_id as string) ?? undefined,
    owner: (row.owner as string) ?? undefined,
    imageUrl: (row.image_url as string) ?? undefined,
    trackCount: Number(row.track_count ?? tracks.length),
    tracks,
    duplicatesRemoved: Number(row.duplicates_removed ?? 0),
    importWarnings: (row.import_warnings as string[]) ?? [],
    createdAt: String(row.created_at ?? nowIso()),
    updatedAt: String(row.updated_at ?? nowIso()),
  };
}

function rowToArrangement(row: Row): ChordArrangement {
  const sections = ((row.arrangement_sections as Row[]) ?? [])
    .map((section): ArrangementSection & { position: number } => {
      const lines = ((section.arrangement_lines as Row[]) ?? [])
        .map((line): LyricLine & { position: number } => ({
          id: String(line.id),
          text: String(line.text ?? ""),
          pinyin: (line.pinyin as string) ?? undefined,
          translation: (line.translation as string) ?? undefined,
          note: (line.note as string) ?? undefined,
          position: Number(line.position ?? 0),
          chords: ((line.chord_events as Row[]) ?? [])
            .map((event) => ({
              id: String(event.id),
              chord: String(event.chord ?? ""),
              offset: Number(event.offset ?? 0),
            }))
            .sort((a, b) => a.offset - b.offset),
        }))
        .sort((a, b) => a.position - b.position);

      return {
        id: String(section.id),
        type: (section.type as ArrangementSection["type"]) ?? "verse",
        label: (section.label as string) ?? undefined,
        repeat: (section.repeat_count as number) ?? undefined,
        position: Number(section.position ?? 0),
        lines: lines.map(({ position: _position, ...line }) => line),
      };
    })
    .sort((a, b) => a.position - b.position);

  return {
    id: String(row.id),
    songId: String(row.song_id),
    title: String(row.title ?? "Arrangement"),
    status: (row.status as ChordArrangement["status"]) ?? "user",
    source: {
      kind: (row.source_kind as ChordArrangement["source"]["kind"]) ?? "user",
      name: (row.source_name as string) ?? undefined,
      url: (row.source_url as string) ?? undefined,
      attribution: (row.source_attribution as string) ?? undefined,
    },
    originalKey: (row.original_key as string) ?? null,
    capo: Number(row.capo ?? 0),
    tuning: (row.tuning as string[]) ?? ["E", "A", "D", "G", "B", "E"],
    tuningName: String(row.tuning_name ?? "Standard"),
    bpm: (row.bpm as number) ?? null,
    timeSignature: String(row.time_signature ?? "4/4"),
    difficulty: (row.difficulty as ChordArrangement["difficulty"]) ?? null,
    notes: (row.notes as string) ?? undefined,
    lyricsRights: (row.lyrics_rights as ChordArrangement["lyricsRights"]) ?? "unavailable",
    lyricsAttribution: (row.lyrics_attribution as string) ?? undefined,
    sections: sections.map(({ position: _position, ...section }) => section),
    createdAt: String(row.created_at ?? nowIso()),
    updatedAt: String(row.updated_at ?? nowIso()),
  };
}

const ARRANGEMENT_SELECT =
  "*, arrangement_sections(*, arrangement_lines(*, chord_events(*)))";

/* ------------------------------------------------------------------ store */

export class SupabaseStore implements LibraryStore {
  readonly id = "supabase" as const;
  readonly label = "Synced (Supabase)";

  constructor(
    private readonly client: SupabaseClient,
    private readonly userId: string,
  ) {}

  async listSongs(): Promise<Song[]> {
    const { data, error } = await this.client.from("songs").select("*");
    fail("Load songs", error);
    return (data ?? []).map(rowToSong);
  }

  async upsertSong(song: Song): Promise<void> {
    const { error } = await this.client
      .from("songs")
      .upsert(songToRow(song, this.userId));
    fail("Save song", error);
  }

  async deleteSong(songId: string): Promise<void> {
    const { error } = await this.client.from("songs").delete().eq("id", songId);
    fail("Delete song", error);
  }

  async listArrangements(): Promise<ChordArrangement[]> {
    const { data, error } = await this.client
      .from("chord_arrangements")
      .select(ARRANGEMENT_SELECT);
    fail("Load arrangements", error);
    return (data ?? []).map(rowToArrangement);
  }

  async getArrangementsForSong(songId: string): Promise<ChordArrangement[]> {
    const { data, error } = await this.client
      .from("chord_arrangements")
      .select(ARRANGEMENT_SELECT)
      .eq("song_id", songId);
    fail("Load arrangements", error);
    return (data ?? []).map(rowToArrangement);
  }

  /**
   * Arrangements are written as a whole: the parent row is upserted, then the
   * section tree is replaced. `on delete cascade` removes the old lines and
   * chord events, which keeps ordering and offsets consistent.
   */
  async saveArrangement(arrangement: ChordArrangement): Promise<void> {
    const parent = {
      id: arrangement.id,
      user_id: this.userId,
      song_id: arrangement.songId,
      title: arrangement.title,
      status: arrangement.status,
      source_kind: arrangement.source.kind,
      source_name: arrangement.source.name ?? null,
      source_url: arrangement.source.url ?? null,
      source_attribution: arrangement.source.attribution ?? null,
      original_key: arrangement.originalKey,
      capo: arrangement.capo,
      tuning: arrangement.tuning,
      tuning_name: arrangement.tuningName,
      bpm: arrangement.bpm,
      time_signature: arrangement.timeSignature,
      difficulty: arrangement.difficulty,
      notes: arrangement.notes ?? null,
      lyrics_rights: arrangement.lyricsRights,
      lyrics_attribution: arrangement.lyricsAttribution ?? null,
    };

    const upsert = await this.client.from("chord_arrangements").upsert(parent);
    fail("Save arrangement", upsert.error);

    const wipe = await this.client
      .from("arrangement_sections")
      .delete()
      .eq("arrangement_id", arrangement.id);
    fail("Replace arrangement sections", wipe.error);

    const sectionRows: Row[] = [];
    const lineRows: Row[] = [];
    const chordRows: Row[] = [];

    arrangement.sections.forEach((section, sectionIndex) => {
      sectionRows.push({
        id: section.id,
        user_id: this.userId,
        arrangement_id: arrangement.id,
        position: sectionIndex,
        type: section.type,
        label: section.label ?? null,
        repeat_count: section.repeat ?? null,
      });
      section.lines.forEach((line, lineIndex) => {
        lineRows.push({
          id: line.id,
          user_id: this.userId,
          section_id: section.id,
          position: lineIndex,
          text: line.text ?? "",
          pinyin: line.pinyin ?? null,
          translation: line.translation ?? null,
          note: line.note ?? null,
        });
        line.chords.forEach((chord) => {
          chordRows.push({
            id: chord.id,
            user_id: this.userId,
            line_id: line.id,
            chord: chord.chord,
            offset: chord.offset,
          });
        });
      });
    });

    if (sectionRows.length) {
      const result = await this.client.from("arrangement_sections").insert(sectionRows);
      fail("Save arrangement sections", result.error);
    }
    if (lineRows.length) {
      const result = await this.client.from("arrangement_lines").insert(lineRows);
      fail("Save arrangement lines", result.error);
    }
    if (chordRows.length) {
      const result = await this.client.from("chord_events").insert(chordRows);
      fail("Save chord events", result.error);
    }
  }

  async deleteArrangement(arrangementId: string): Promise<void> {
    const { error } = await this.client
      .from("chord_arrangements")
      .delete()
      .eq("id", arrangementId);
    fail("Delete arrangement", error);
  }

  async listPlaylists(): Promise<Playlist[]> {
    const { data, error } = await this.client
      .from("playlists")
      .select("*, playlist_tracks(*)")
      .order("updated_at", { ascending: false });
    fail("Load playlists", error);
    return (data ?? []).map(rowToPlaylist);
  }

  async getPlaylist(playlistId: string): Promise<Playlist | null> {
    const { data, error } = await this.client
      .from("playlists")
      .select("*, playlist_tracks(*)")
      .eq("id", playlistId)
      .maybeSingle();
    fail("Load playlist", error);
    return data ? rowToPlaylist(data) : null;
  }

  async savePlaylist(playlist: Playlist): Promise<void> {
    const upsert = await this.client.from("playlists").upsert({
      id: playlist.id,
      user_id: this.userId,
      name: playlist.name,
      description: playlist.description ?? null,
      source: playlist.source,
      source_url: playlist.sourceUrl ?? null,
      external_id: playlist.externalId ?? null,
      owner: playlist.owner ?? null,
      image_url: playlist.imageUrl ?? null,
      track_count: playlist.tracks.length,
      duplicates_removed: playlist.duplicatesRemoved,
      import_warnings: playlist.importWarnings,
    });
    fail("Save playlist", upsert.error);

    const wipe = await this.client
      .from("playlist_tracks")
      .delete()
      .eq("playlist_id", playlist.id);
    fail("Replace playlist tracks", wipe.error);

    if (playlist.tracks.length) {
      const insert = await this.client.from("playlist_tracks").insert(
        playlist.tracks.map((track, index) => ({
          id: track.id,
          user_id: this.userId,
          playlist_id: playlist.id,
          position: index,
          title: track.title,
          artist: track.artist,
          album: track.album ?? null,
          duration_ms: track.durationMs ?? null,
          external_id: track.externalId ?? null,
          external_url: track.externalUrl ?? null,
          song_id: null, // seed song ids are not rows in `songs`
          match_status: track.matchStatus,
          match_confidence: track.matchConfidence ?? null,
          is_unavailable: track.isUnavailable,
          note: track.songId ? `songId:${track.songId}` : (track.note ?? null),
        })),
      );
      fail("Save playlist tracks", insert.error);
    }
  }

  async deletePlaylist(playlistId: string): Promise<void> {
    const { error } = await this.client.from("playlists").delete().eq("id", playlistId);
    fail("Delete playlist", error);
  }

  async listFavorites(): Promise<Favorite[]> {
    const { data, error } = await this.client.from("favorites").select("*");
    fail("Load favourites", error);
    return (data ?? []).map((row: Row) => ({
      id: String(row.id),
      songId: String(row.song_id),
      createdAt: String(row.created_at ?? nowIso()),
    }));
  }

  async setFavorite(songId: string, isFavorite: boolean): Promise<void> {
    if (!isFavorite) {
      const { error } = await this.client
        .from("favorites")
        .delete()
        .eq("song_id", songId);
      fail("Remove favourite", error);
      return;
    }
    const { error } = await this.client.from("favorites").upsert(
      { id: `fav_${songId}`, user_id: this.userId, song_id: songId },
      { onConflict: "user_id,song_id" },
    );
    fail("Add favourite", error);
  }

  async listRecent(): Promise<RecentPlay[]> {
    const { data, error } = await this.client
      .from("recent_plays")
      .select("*")
      .order("opened_at", { ascending: false })
      .limit(50);
    fail("Load recent songs", error);
    return (data ?? []).map((row: Row) => ({
      songId: String(row.song_id),
      openedAt: String(row.opened_at ?? nowIso()),
      progress: Number(row.progress ?? 0),
    }));
  }

  async recordRecent(entry: RecentPlay): Promise<void> {
    const { error } = await this.client.from("recent_plays").upsert({
      user_id: this.userId,
      song_id: entry.songId,
      opened_at: entry.openedAt,
      progress: entry.progress,
    });
    fail("Record recent song", error);
  }

  async getPreferences(): Promise<UserPreferences | null> {
    const { data, error } = await this.client
      .from("user_preferences")
      .select("*")
      .maybeSingle();
    fail("Load preferences", error);
    if (!data) return null;
    const row = data as Row;
    return {
      ...DEFAULT_PREFERENCES,
      fontScale: Number(row.font_scale ?? 1),
      showPinyin: Boolean(row.show_pinyin),
      showChordDiagrams: Boolean(row.show_chord_diagrams ?? true),
      plainMode: Boolean(row.plain_mode),
      scrollSpeed: Number(row.scroll_speed ?? 36),
      metronomeBpm: Number(row.metronome_bpm ?? 80),
      metronomeAccent: Number(row.metronome_accent ?? 4),
      preferFlats: Boolean(row.prefer_flats),
      lastSongId: (row.last_song_id as string) ?? null,
      updatedAt: (row.updated_at as string) ?? undefined,
    };
  }

  async savePreferences(preferences: UserPreferences): Promise<void> {
    const { error } = await this.client.from("user_preferences").upsert({
      user_id: this.userId,
      font_scale: preferences.fontScale,
      show_pinyin: preferences.showPinyin,
      show_chord_diagrams: preferences.showChordDiagrams,
      plain_mode: preferences.plainMode,
      scroll_speed: preferences.scrollSpeed,
      metronome_bpm: preferences.metronomeBpm,
      metronome_accent: preferences.metronomeAccent,
      prefer_flats: preferences.preferFlats,
      last_song_id: preferences.lastSongId,
      updated_at: nowIso(),
    });
    fail("Save preferences", error);
  }

  async listPracticeSessions(): Promise<PracticeSession[]> {
    const { data, error } = await this.client
      .from("practice_sessions")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(200);
    fail("Load practice sessions", error);
    return (data ?? []).map((row: Row) => ({
      id: String(row.id),
      songId: String(row.song_id),
      arrangementId: (row.arrangement_id as string) ?? null,
      startedAt: String(row.started_at ?? nowIso()),
      durationSeconds: Number(row.duration_seconds ?? 0),
      bpm: (row.bpm as number) ?? null,
      transpose: Number(row.transpose ?? 0),
      capo: Number(row.capo ?? 0),
      completed: Boolean(row.completed),
      notes: (row.notes as string) ?? undefined,
    }));
  }

  async savePracticeSession(session: PracticeSession): Promise<void> {
    const { error } = await this.client.from("practice_sessions").upsert({
      id: session.id,
      user_id: this.userId,
      song_id: session.songId,
      arrangement_id: session.arrangementId,
      started_at: session.startedAt,
      duration_seconds: session.durationSeconds,
      bpm: session.bpm,
      transpose: session.transpose,
      capo: session.capo,
      completed: session.completed,
      notes: session.notes ?? null,
    });
    fail("Save practice session", error);
  }
}
