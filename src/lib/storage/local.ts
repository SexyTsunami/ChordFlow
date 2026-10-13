import type {
  ChordArrangement,
  Favorite,
  Playlist,
  PracticeSession,
  RecentPlay,
  Song,
  UserPreferences,
} from "@/lib/domain/types";
import type { LibraryStore } from "./types";

/**
 * IndexedDB-backed local library.
 *
 * This is the default store: everything in ChordFlow works with no account,
 * no network and no API keys. Only user data lives here — never secrets.
 */

const DB_NAME = "chordflow";
const DB_VERSION = 1;

const STORES = {
  songs: "songs",
  arrangements: "arrangements",
  playlists: "playlists",
  favorites: "favorites",
  recent: "recent",
  preferences: "preferences",
  practice: "practice_sessions",
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available in this browser."));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORES.songs)) {
        db.createObjectStore(STORES.songs, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.arrangements)) {
        const store = db.createObjectStore(STORES.arrangements, { keyPath: "id" });
        store.createIndex("songId", "songId", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.playlists)) {
        db.createObjectStore(STORES.playlists, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.favorites)) {
        db.createObjectStore(STORES.favorites, { keyPath: "songId" });
      }
      if (!db.objectStoreNames.contains(STORES.recent)) {
        db.createObjectStore(STORES.recent, { keyPath: "songId" });
      }
      if (!db.objectStoreNames.contains(STORES.preferences)) {
        db.createObjectStore(STORES.preferences, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.practice)) {
        const store = db.createObjectStore(STORES.practice, { keyPath: "id" });
        store.createIndex("songId", "songId", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open the local database."));
    request.onblocked = () =>
      reject(new Error("The local database is blocked by another open tab."));
  });

  return dbPromise;
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDb();
  const tx = db.transaction(storeName, "readonly");
  return promisify(tx.objectStore(storeName).getAll() as IDBRequest<T[]>);
}

async function getOne<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
  const db = await openDb();
  const tx = db.transaction(storeName, "readonly");
  const result = await promisify(tx.objectStore(storeName).get(key) as IDBRequest<T>);
  return result ?? null;
}

async function put<T>(storeName: string, value: T): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).put(value);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB write aborted"));
  });
}

async function remove(storeName: string, key: IDBValidKey): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).delete(key);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB delete failed"));
  });
}

export class LocalStore implements LibraryStore {
  readonly id = "local" as const;
  readonly label = "This device";

  listSongs() {
    return getAll<Song>(STORES.songs);
  }
  upsertSong(song: Song) {
    return put(STORES.songs, song);
  }
  deleteSong(songId: string) {
    return remove(STORES.songs, songId);
  }

  listArrangements() {
    return getAll<ChordArrangement>(STORES.arrangements);
  }
  async getArrangementsForSong(songId: string) {
    const db = await openDb();
    const tx = db.transaction(STORES.arrangements, "readonly");
    const index = tx.objectStore(STORES.arrangements).index("songId");
    return promisify(index.getAll(songId) as IDBRequest<ChordArrangement[]>);
  }
  saveArrangement(arrangement: ChordArrangement) {
    return put(STORES.arrangements, arrangement);
  }
  deleteArrangement(arrangementId: string) {
    return remove(STORES.arrangements, arrangementId);
  }

  listPlaylists() {
    return getAll<Playlist>(STORES.playlists);
  }
  getPlaylist(playlistId: string) {
    return getOne<Playlist>(STORES.playlists, playlistId);
  }
  savePlaylist(playlist: Playlist) {
    return put(STORES.playlists, playlist);
  }
  deletePlaylist(playlistId: string) {
    return remove(STORES.playlists, playlistId);
  }

  listFavorites() {
    return getAll<Favorite>(STORES.favorites);
  }
  async setFavorite(songId: string, isFavorite: boolean) {
    if (!isFavorite) return remove(STORES.favorites, songId);
    const favorite: Favorite & { songId: string } = {
      id: `fav_${songId}`,
      songId,
      createdAt: new Date().toISOString(),
    };
    return put(STORES.favorites, favorite);
  }

  listRecent() {
    return getAll<RecentPlay>(STORES.recent);
  }
  recordRecent(entry: RecentPlay) {
    return put(STORES.recent, entry);
  }

  getPreferences() {
    return getOne<UserPreferences>(STORES.preferences, "preferences");
  }
  savePreferences(preferences: UserPreferences) {
    return put(STORES.preferences, preferences);
  }

  listPracticeSessions() {
    return getAll<PracticeSession>(STORES.practice);
  }
  savePracticeSession(session: PracticeSession) {
    return put(STORES.practice, session);
  }
}

/** In-memory fallback for private-mode browsers where IndexedDB throws. */
export class MemoryStore implements LibraryStore {
  readonly id = "local" as const;
  readonly label = "This session (not saved)";

  private songs = new Map<string, Song>();
  private arrangements = new Map<string, ChordArrangement>();
  private playlists = new Map<string, Playlist>();
  private favorites = new Map<string, Favorite>();
  private recent = new Map<string, RecentPlay>();
  private practice = new Map<string, PracticeSession>();
  private preferences: UserPreferences | null = null;

  async listSongs() {
    return [...this.songs.values()];
  }
  async upsertSong(song: Song) {
    this.songs.set(song.id, song);
  }
  async deleteSong(songId: string) {
    this.songs.delete(songId);
  }
  async listArrangements() {
    return [...this.arrangements.values()];
  }
  async getArrangementsForSong(songId: string) {
    return [...this.arrangements.values()].filter((a) => a.songId === songId);
  }
  async saveArrangement(arrangement: ChordArrangement) {
    this.arrangements.set(arrangement.id, arrangement);
  }
  async deleteArrangement(id: string) {
    this.arrangements.delete(id);
  }
  async listPlaylists() {
    return [...this.playlists.values()];
  }
  async getPlaylist(id: string) {
    return this.playlists.get(id) ?? null;
  }
  async savePlaylist(playlist: Playlist) {
    this.playlists.set(playlist.id, playlist);
  }
  async deletePlaylist(id: string) {
    this.playlists.delete(id);
  }
  async listFavorites() {
    return [...this.favorites.values()];
  }
  async setFavorite(songId: string, isFavorite: boolean) {
    if (isFavorite) {
      this.favorites.set(songId, {
        id: `fav_${songId}`,
        songId,
        createdAt: new Date().toISOString(),
      });
    } else {
      this.favorites.delete(songId);
    }
  }
  async listRecent() {
    return [...this.recent.values()];
  }
  async recordRecent(entry: RecentPlay) {
    this.recent.set(entry.songId, entry);
  }
  async getPreferences() {
    return this.preferences;
  }
  async savePreferences(preferences: UserPreferences) {
    this.preferences = preferences;
  }
  async listPracticeSessions() {
    return [...this.practice.values()];
  }
  async savePracticeSession(session: PracticeSession) {
    this.practice.set(session.id, session);
  }
}

/** Pick IndexedDB when it works, otherwise degrade to memory with a warning. */
export async function createLocalStore(): Promise<LibraryStore> {
  try {
    await openDb();
    return new LocalStore();
  } catch {
    dbPromise = null;
    return new MemoryStore();
  }
}
