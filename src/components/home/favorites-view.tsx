"use client";

import * as React from "react";
import Link from "next/link";
import { Badge, SectionHeading } from "@/components/ui/primitives";
import { useLibrary } from "@/components/providers/library-provider";
import { SongBrowser } from "@/components/song/song-browser";

export function FavoritesView() {
  const { favorites, songsById, preferences } = useLibrary();

  const songs = React.useMemo(
    () =>
      [...favorites]
        .map((id) => songsById.get(id))
        .filter((song): song is NonNullable<typeof song> => Boolean(song)),
    [favorites, songsById],
  );

  const singingSongs = React.useMemo(() => {
    return Object.entries(preferences.favoriteKeys ?? {})
      .map(([songId, key]) => {
        const song = songsById.get(songId);
        return song ? { song, key } : null;
      })
      .filter((item): item is { song: NonNullable<ReturnType<typeof songsById.get>>; key: string } =>
        Boolean(item),
      )
      .sort((a, b) => a.song.title.localeCompare(b.song.title));
  }, [preferences.favoriteKeys, songsById]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-6 lg:py-8">
      <SectionHeading
        title="Favourites"
        description={`${songs.length} play favourites · ${singingSongs.length} saved singing key${singingSongs.length === 1 ? "" : "s"}`}
      />

      {singingSongs.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-medium tracking-[0.12em] text-ink-faint uppercase">
            Singing keys
          </h2>
          <div className="panel divide-y divide-line/60">
            {singingSongs.map(({ song, key }) => (
              <Link
                key={song.id}
                href={`/songs/${song.id}`}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-surface-2/70"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink">{song.title}</span>
                  <span className="block truncate text-xs text-ink-muted">{song.artist}</span>
                </span>
                <Badge tone="sage">sing {key}</Badge>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <SongBrowser
        songs={songs}
        defaultView="grid"
        emptyTitle="No play favourites yet"
        emptyDescription="Tap the heart on a song to pin it for playing. On the song page, save a singing key separately."
      />
    </div>
  );
}
