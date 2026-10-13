"use client";

import * as React from "react";
import type {
  ChordArrangement,
  Playlist,
  PracticeSession,
  Song,
  UserPreferences,
} from "@/lib/domain/types";
import { DEFAULT_PREFERENCES } from "@/lib/domain/types";
import { createLocalStore } from "@/lib/storage/local";
import { SupabaseStore } from "@/lib/storage/supabase";
import type { LibraryStore } from "@/lib/storage/types";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { saveSheetEditFromArrangement } from "@/lib/storage/sheet-edits";
import { errorMessage, nowIso } from "@/lib/utils";

/**
 * Single source of truth for everything the UI renders.
 *
 * The playable catalog is ChordDatabase only. Favourites, singing keys and
 * recent plays stay on this device. Old imported/AI sheets are not merged back.
 */

export const SEED_SONGS: Song[] = [];

type LibraryState = {
  ready: boolean;
  error: string | null;
  storeLabel: string;
  storeId: "local" | "supabase";
  /** Seed songs plus everything the user added or imported. */
  songs: Song[];
  songsById: Map<string, Song>;
  arrangements: ChordArrangement[];
  playlists: Playlist[];
  favorites: Set<string>;
  recent: Array<{ songId: string; openedAt: string; progress: number }>;
  practiceSessions: PracticeSession[];
  preferences: UserPreferences;
};

type LibraryActions = {
  refresh: () => Promise<void>;
  toggleFavorite: (songId: string) => Promise<void>;
  recordOpen: (songId: string, progress?: number) => Promise<void>;
  upsertSong: (song: Song) => Promise<void>;
  deleteSong: (songId: string) => Promise<void>;
  saveArrangement: (arrangement: ChordArrangement) => Promise<void>;
  deleteArrangement: (arrangementId: string) => Promise<void>;
  deleteArrangementsForSong: (songId: string) => Promise<void>;
  savePlaylist: (playlist: Playlist) => Promise<void>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  savePracticeSession: (session: PracticeSession) => Promise<void>;
  updatePreferences: (patch: Partial<UserPreferences>) => Promise<void>;
  setFavoriteKey: (songId: string, key: string | null) => Promise<void>;
  arrangementsForSong: (songId: string) => ChordArrangement[];
};

const LibraryContext = React.createContext<(LibraryState & LibraryActions) | null>(
  null,
);

const SEED_ARRANGEMENTS: ChordArrangement[] = [];

export function isBundledArrangement(id: string): boolean {
  return id.startsWith("arr_db_");
}

export function isCatalogSong(id: string): boolean {
  return id.startsWith("db_");
}

const HIDDEN_ARRANGEMENTS_KEY = "chordflow:hidden-arrangements";

function readLocalHiddenArrangementIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(HIDDEN_ARRANGEMENTS_KEY) ?? "[]",
    ) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

function writeLocalHiddenArrangementIds(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HIDDEN_ARRANGEMENTS_KEY, JSON.stringify(ids));
}

function hiddenArrangementIds(preferences: UserPreferences | null | undefined): string[] {
  return Array.from(
    new Set([...(preferences?.hiddenArrangementIds ?? []), ...readLocalHiddenArrangementIds()]),
  );
}

function mergeArrangements(
  stored: ChordArrangement[],
  hiddenIds: Iterable<string>,
): ChordArrangement[] {
  const hidden = new Set(hiddenIds);
  return [
    ...SEED_ARRANGEMENTS.filter(
      (seed) => !hidden.has(seed.id) && !stored.some((item) => item.id === seed.id),
    ),
    ...stored.filter((item) => !hidden.has(item.id)),
  ];
}

async function persistHiddenArrangementIds(
  store: LibraryStore,
  ids: string[],
): Promise<string[]> {
  const preferences = {
    ...DEFAULT_PREFERENCES,
    ...(await store.getPreferences()),
  };
  const hidden = Array.from(
    new Set([...hiddenArrangementIds(preferences), ...ids]),
  );
  writeLocalHiddenArrangementIds(hidden);
  await store.savePreferences({
    ...preferences,
    id: "preferences",
    hiddenArrangementIds: hidden,
    updatedAt: nowIso(),
  });
  return hidden;
}

async function syncSongArrangementStatus(
  store: LibraryStore,
  songId: string,
  hiddenIds: Iterable<string>,
) {
  const stored = await store.listArrangements();
  const remaining = mergeArrangements(stored, hiddenIds).filter(
    (item) => item.songId === songId,
  );
  const userSongs = await store.listSongs();
  const song =
    userSongs.find((item) => item.id === songId) ??
    SEED_SONGS.find((item) => item.id === songId);
  if (!song) return;
  const nextStatus = bestArrangement(remaining)?.status ?? "unavailable";
  if (song.arrangementStatus === nextStatus && userSongs.some((item) => item.id === songId)) {
    return;
  }
  await store.upsertSong({
    ...song,
    arrangementStatus: nextStatus,
    updatedAt: nowIso(),
  });
}

async function fetchChordDatabase(): Promise<{
  songs: Song[];
  arrangements: ChordArrangement[];
}> {
  const response = await fetch("/api/library/database", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Could not load the ChordDatabase folder.");
  }
  return (await response.json()) as {
    songs: Song[];
    arrangements: ChordArrangement[];
  };
}

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const storeRef = React.useRef<LibraryStore | null>(null);
  const [state, setState] = React.useState<LibraryState>({
    ready: false,
    error: null,
    storeLabel: "This device",
    storeId: "local",
    songs: SEED_SONGS,
    songsById: new Map(SEED_SONGS.map((s) => [s.id, s])),
    arrangements: SEED_ARRANGEMENTS,
    playlists: [],
    favorites: new Set(),
    recent: [],
    practiceSessions: [],
    preferences: DEFAULT_PREFERENCES,
  });

  const loadGeneration = React.useRef(0);
  const load = React.useCallback(async (store: LibraryStore) => {
    const generation = ++loadGeneration.current;
    const [catalog, playlists, favorites, recent, practiceSessions, preferences, storedArrangements] =
      await Promise.all([
        fetchChordDatabase(),
        store.listPlaylists(),
        store.listFavorites(),
        store.listRecent(),
        store.listPracticeSessions(),
        store.getPreferences(),
        store.listArrangements(),
      ]);
    if (generation !== loadGeneration.current) return;

    const hidden = new Set(hiddenArrangementIds(preferences));
    const songs = catalog.songs;
    const arrangementsBySong = new Map<string, ChordArrangement>();
    for (const item of catalog.arrangements) {
      if (!hidden.has(item.id)) arrangementsBySong.set(item.songId, item);
    }
    for (const item of storedArrangements) {
      if (!hidden.has(item.id)) arrangementsBySong.set(item.songId, item);
    }
    setState({
      ready: true,
      error: null,
      storeLabel: store.label,
      storeId: store.id,
      songs,
      songsById: new Map(songs.map((s) => [s.id, s])),
      arrangements: [...arrangementsBySong.values()],
      playlists: playlists.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      favorites: new Set(favorites.map((f) => f.songId)),
      recent: recent.sort((a, b) => b.openedAt.localeCompare(a.openedAt)),
      practiceSessions,
      preferences: { ...DEFAULT_PREFERENCES, ...(preferences ?? {}) },
    });
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        let store: LibraryStore | null = null;

        if (isSupabaseConfigured()) {
          const client = getSupabaseBrowserClient();
          const { data } = (await client?.auth.getUser()) ?? { data: null };
          if (client && data?.user) store = new SupabaseStore(client, data.user.id);
        }
        if (!store) store = await createLocalStore();
        if (cancelled) return;

        storeRef.current = store;
        await load(store);
      } catch (error) {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          ready: true,
          error: errorMessage(error, "Could not open your local library."),
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [load]);

  const withStore = React.useCallback(
    async (fn: (store: LibraryStore) => Promise<void>) => {
      const store = storeRef.current;
      if (!store) throw new Error("The library is still loading.");
      await fn(store);
      await load(store);
    },
    [load],
  );

  const actions = React.useMemo<LibraryActions>(
    () => ({
      refresh: async () => {
        const store = storeRef.current;
        if (store) await load(store);
      },
      toggleFavorite: (songId) =>
        withStore(async (store) => {
          const isFavorite = state.favorites.has(songId);
          await store.setFavorite(songId, !isFavorite);
        }),
      recordOpen: (songId, progress = 0) =>
        withStore(async (store) => {
          await store.recordRecent({ songId, openedAt: nowIso(), progress });
        }),
      upsertSong: (song) =>
        withStore(async (store) => {
          await store.upsertSong({ ...song, updatedAt: nowIso() });
        }),
      deleteSong: (songId) =>
        withStore(async (store) => {
          await store.deleteSong(songId);
        }),
      saveArrangement: (arrangement) =>
        withStore(async (store) => {
          const preferences = {
            ...DEFAULT_PREFERENCES,
            ...(await store.getPreferences()),
          };
          const hidden = hiddenArrangementIds(preferences).filter(
            (id) => id !== arrangement.id,
          );
          if (hidden.length !== hiddenArrangementIds(preferences).length) {
            writeLocalHiddenArrangementIds(hidden);
            await store.savePreferences({
              ...preferences,
              id: "preferences",
              hiddenArrangementIds: hidden,
              updatedAt: nowIso(),
            });
          }
          const saved = { ...arrangement, updatedAt: nowIso() };
          await store.saveArrangement(saved);
          const song = state.songsById.get(arrangement.songId);
          if (song) saveSheetEditFromArrangement(song, saved);
          if (song && song.arrangementStatus !== arrangement.status) {
            await store.upsertSong({
              ...song,
              arrangementStatus: arrangement.status,
              updatedAt: nowIso(),
            });
          }
        }),
      deleteArrangement: async (arrangementId) => {
        setState((prev) => {
          const hidden = Array.from(
            new Set([...hiddenArrangementIds(prev.preferences), arrangementId]),
          );
          writeLocalHiddenArrangementIds(hidden);
          return {
            ...prev,
            arrangements: prev.arrangements.filter((item) => item.id !== arrangementId),
            preferences: {
              ...prev.preferences,
              hiddenArrangementIds: hidden,
            },
          };
        });
        await withStore(async (store) => {
          const stored = await store.listArrangements();
          const target =
            stored.find((item) => item.id === arrangementId) ??
            SEED_ARRANGEMENTS.find((item) => item.id === arrangementId);
          const hidden = await persistHiddenArrangementIds(store, [arrangementId]);
          await store.deleteArrangement(arrangementId);
          if (target) await syncSongArrangementStatus(store, target.songId, hidden);
        });
      },
      deleteArrangementsForSong: async (songId) => {
        setState((prev) => {
          const ids = [
            ...prev.arrangements
              .filter((item) => item.songId === songId)
              .map((item) => item.id),
            ...SEED_ARRANGEMENTS.filter((item) => item.songId === songId).map(
              (item) => item.id,
            ),
          ];
          const songs = prev.songs.map((song) =>
            song.id === songId ? { ...song, arrangementStatus: "unavailable" as const } : song,
          );
          const hidden = Array.from(
            new Set([...hiddenArrangementIds(prev.preferences), ...ids]),
          );
          writeLocalHiddenArrangementIds(hidden);
          return {
            ...prev,
            songs,
            songsById: new Map(songs.map((song) => [song.id, song])),
            arrangements: prev.arrangements.filter((item) => item.songId !== songId),
            preferences: {
              ...prev.preferences,
              hiddenArrangementIds: hidden,
            },
          };
        });
        await withStore(async (store) => {
          const stored = await store.listArrangements();
          const ids = Array.from(
            new Set([
              ...stored
                .filter((item) => item.songId === songId)
                .map((item) => item.id),
              ...SEED_ARRANGEMENTS.filter((item) => item.songId === songId).map(
                (item) => item.id,
              ),
            ]),
          );
          const hidden = await persistHiddenArrangementIds(store, ids);
          for (const id of ids) await store.deleteArrangement(id);
          await syncSongArrangementStatus(store, songId, hidden);
        });
      },
      savePlaylist: (playlist) =>
        withStore(async (store) => {
          await store.savePlaylist({ ...playlist, updatedAt: nowIso() });
        }),
      deletePlaylist: (playlistId) =>
        withStore(async (store) => {
          await store.deletePlaylist(playlistId);
        }),
      savePracticeSession: (session) =>
        withStore(async (store) => {
          await store.savePracticeSession(session);
        }),
      updatePreferences: async (patch) => {
        // Preferences change on every slider drag, so update optimistically
        // and persist without a full reload. Always start from the latest
        // state so a stale closure cannot wipe hiddenArrangementIds.
        let next: UserPreferences | null = null;
        setState((prev) => {
          next = {
            ...prev.preferences,
            ...patch,
            hiddenArrangementIds: hiddenArrangementIds(prev.preferences),
            updatedAt: nowIso(),
          };
          return { ...prev, preferences: next };
        });
        if (next) await storeRef.current?.savePreferences(next);
      },
      setFavoriteKey: async (songId, key) => {
        let next: UserPreferences | null = null;
        setState((prev) => {
          const favoriteKeys = { ...prev.preferences.favoriteKeys };
          if (key) favoriteKeys[songId] = key;
          else delete favoriteKeys[songId];
          next = {
            ...prev.preferences,
            favoriteKeys,
            updatedAt: nowIso(),
          };
          return { ...prev, preferences: next };
        });
        if (next) await storeRef.current?.savePreferences(next);
      },
      arrangementsForSong: (songId) =>
        state.arrangements.filter((a) => a.songId === songId),
    }),
    [load, state.arrangements, state.favorites, state.preferences, state.songsById, withStore],
  );

  const value = React.useMemo(() => ({ ...state, ...actions }), [state, actions]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = React.useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used inside <LibraryProvider>");
  return ctx;
}

/** Status shown on a song card: user arrangements take priority over seeds. */
export function bestArrangement(
  arrangements: ChordArrangement[],
): ChordArrangement | null {
  if (arrangements.length === 0) return null;
  const rank: Record<ChordArrangement["status"], number> = {
    verified: 0,
    user: 1,
    "ai-estimate": 2,
    unavailable: 3,
  };
  return [...arrangements].sort((a, b) => {
    const byStatus = rank[a.status] - rank[b.status];
    if (byStatus !== 0) return byStatus;
    return b.updatedAt.localeCompare(a.updatedAt);
  })[0];
}
