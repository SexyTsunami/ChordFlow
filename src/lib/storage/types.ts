import type {
  ChordArrangement,
  Favorite,
  Playlist,
  PracticeSession,
  RecentPlay,
  Song,
  UserPreferences,
} from "@/lib/domain/types";

/**
 * The single persistence seam.
 *
 * `LocalStore` (IndexedDB) is the default and always works offline.
 * `SupabaseStore` implements the same contract for signed-in, synced use.
 * Nothing above this interface knows which one is active.
 */
export interface LibraryStore {
  readonly id: "local" | "supabase";
  readonly label: string;

  /** Songs the user added or imported. Bundled seed songs live in code. */
  listSongs(): Promise<Song[]>;
  upsertSong(song: Song): Promise<void>;
  deleteSong(songId: string): Promise<void>;

  listArrangements(): Promise<ChordArrangement[]>;
  getArrangementsForSong(songId: string): Promise<ChordArrangement[]>;
  saveArrangement(arrangement: ChordArrangement): Promise<void>;
  deleteArrangement(arrangementId: string): Promise<void>;

  listPlaylists(): Promise<Playlist[]>;
  getPlaylist(playlistId: string): Promise<Playlist | null>;
  savePlaylist(playlist: Playlist): Promise<void>;
  deletePlaylist(playlistId: string): Promise<void>;

  listFavorites(): Promise<Favorite[]>;
  setFavorite(songId: string, isFavorite: boolean): Promise<void>;

  listRecent(): Promise<RecentPlay[]>;
  recordRecent(entry: RecentPlay): Promise<void>;

  getPreferences(): Promise<UserPreferences | null>;
  savePreferences(preferences: UserPreferences): Promise<void>;

  listPracticeSessions(): Promise<PracticeSession[]>;
  savePracticeSession(session: PracticeSession): Promise<void>;
}
