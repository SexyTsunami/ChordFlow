"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Clock3, Disc3, Heart, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Badge,
  EmptyState,
  Input,
  SectionHeading,
  Skeleton,
} from "@/components/ui/primitives";
import { useLibrary } from "@/components/providers/library-provider";
import { SongGrid, SongTable } from "@/components/song/song-list";
import { searchSongs } from "@/lib/search/search";
import { APP_NAME } from "@/lib/app-config";
import { useSheetEdits } from "@/lib/storage/use-sheet-edits";
import { formatRelativeTime } from "@/lib/utils";

export function HomeView() {
  const { ready, error, songs, songsById, favorites, recent, arrangements, preferences } =
    useLibrary();
  const [query, setQuery] = React.useState("");
  const takeHomeEdits = useSheetEdits();

  const results = React.useMemo(
    () => (query.trim() ? searchSongs(songs, { query, limit: 24 }) : []),
    [query, songs],
  );

  const recentSongs = React.useMemo(
    () =>
      recent
        .map((entry) => ({ entry, song: songsById.get(entry.songId) }))
        .filter(
          (
            item,
          ): item is {
            entry: (typeof recent)[number];
            song: NonNullable<ReturnType<typeof songsById.get>>;
          } => Boolean(item.song),
        )
        .slice(0, 6),
    [recent, songsById],
  );

  const favoriteSongs = React.useMemo(
    () =>
      [...favorites]
        .map((id) => songsById.get(id))
        .filter((song): song is NonNullable<typeof song> => Boolean(song))
        .slice(0, 8),
    [favorites, songsById],
  );

  const topArtists = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const song of songs) {
      counts.set(song.artist, (counts.get(song.artist) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [songs]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-6 lg:py-8">
      <section className="mb-8">
        <p className="text-[11px] font-medium tracking-[0.18em] text-amber uppercase">
          {APP_NAME}
        </p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Your ChordDatabase songbook
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
          Browse every sheet in the folder, search by title or artist, favourite
          songs for playing, and save a singing key for quick reference.
        </p>

        <div className="relative mt-5">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a title or artist…"
            aria-label="Search your songbook"
            className="h-11 pl-9"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-faint">
          <Badge tone="outline">{songs.length} songs</Badge>
          <Badge tone="outline">{arrangements.length} sheets</Badge>
          <Badge tone="outline">{favorites.size} play favourites</Badge>
          <Badge tone="outline">
            {Object.keys(preferences.favoriteKeys ?? {}).length} singing keys
          </Badge>
          {takeHomeEdits.length ? (
            <Link href="/edits">
              <Badge tone="amber">{takeHomeEdits.length} take-home edits</Badge>
            </Link>
          ) : null}
        </div>
      </section>

      {error ? (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-rose/35 bg-rose/10 p-4 text-sm text-ink"
        >
          {error}
        </div>
      ) : null}

      {query.trim() ? (
        <section>
          <SectionHeading
            title={`${results.length} result${results.length === 1 ? "" : "s"}`}
            description={`Matching “${query}”`}
            action={
              <Button variant="ghost" size="sm" onClick={() => setQuery("")}>
                Clear
              </Button>
            }
          />
          {results.length === 0 ? (
            <EmptyState
              icon={<Search className="size-5" />}
              title="No matches"
              description="Try another title spelling or the artist name."
            />
          ) : (
            <div className="panel p-2">
              <SongTable songs={results} />
            </div>
          )}
        </section>
      ) : (
        <div className="space-y-10">
          <section>
            <SectionHeading title="Continue practising" />
            {!ready ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((index) => (
                  <Skeleton key={index} className="h-24" />
                ))}
              </div>
            ) : recentSongs.length === 0 ? (
              <EmptyState
                icon={<Clock3 className="size-5" />}
                title="Nothing in progress yet"
                description="Open any song from Songs or Artists."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {recentSongs.map(({ entry, song }) => (
                  <Link
                    key={song.id}
                    href={`/songs/${song.id}`}
                    className="panel group flex items-center gap-3 p-4 transition-colors hover:border-amber/30"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber/10 text-amber ring-1 ring-amber/20">
                      <Clock3 className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">
                        {song.title}
                      </span>
                      <span className="block truncate text-xs text-ink-muted">
                        {song.artist} · {formatRelativeTime(entry.openedAt)}
                      </span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionHeading
              title="Browse by artist"
              action={
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/collection">
                    All artists <ArrowRight />
                  </Link>
                </Button>
              }
            />
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {topArtists.map(([name, count]) => (
                <Link
                  key={name}
                  href={`/library?artist=${encodeURIComponent(name)}`}
                  className="panel flex items-center gap-3 p-4 transition-colors hover:border-amber/30"
                >
                  <Disc3 className="size-4 shrink-0 text-amber" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">
                      {name}
                    </span>
                    <span className="text-xs text-ink-muted">
                      {count} song{count === 1 ? "" : "s"}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <SectionHeading
              title="Play favourites"
              action={
                favoriteSongs.length ? (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/favorites">
                      See all <ArrowRight />
                    </Link>
                  </Button>
                ) : null
              }
            />
            {favoriteSongs.length === 0 ? (
              <EmptyState
                icon={<Heart className="size-5" />}
                title="No play favourites yet"
                description="Tap the heart on a song to pin it for playing."
              />
            ) : (
              <SongGrid songs={favoriteSongs} />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
