"use client";

import * as React from "react";
import Link from "next/link";
import { Music2, Search } from "lucide-react";
import { Badge, EmptyState, Input, SectionHeading } from "@/components/ui/primitives";
import { useLibrary } from "@/components/providers/library-provider";

function artistKey(artist: string): string {
  return artist.trim().toLowerCase();
}

export function CollectionView() {
  const { songs } = useLibrary();
  const [query, setQuery] = React.useState("");

  const artists = React.useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const song of songs) {
      const key = artistKey(song.artist);
      const current = map.get(key);
      if (current) current.count += 1;
      else map.set(key, { name: song.artist, count: 1 });
    }
    const needle = query.trim().toLowerCase();
    return [...map.values()]
      .filter((artist) => !needle || artist.name.toLowerCase().includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name, "en"));
  }, [query, songs]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-6 lg:py-8">
      <SectionHeading
        title="Artists"
        description="Browse the ChordDatabase by who wrote or sang the song."
      />

      <div className="relative mb-5 max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search artists…"
          aria-label="Search artists"
          className="pl-9"
        />
      </div>

      <div className="mb-4 text-xs text-ink-faint">
        <Badge tone="outline">
          {artists.length} artist{artists.length === 1 ? "" : "s"}
        </Badge>
      </div>

      {artists.length === 0 ? (
        <EmptyState
          icon={<Music2 className="size-5" />}
          title={query.trim() ? `No artists matching “${query}”` : "No songs yet"}
          description="Add markdown files to the ChordDatabase folder."
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {artists.map((artist) => (
            <Link
              key={artist.name}
              href={`/library?artist=${encodeURIComponent(artist.name)}`}
              className="panel flex items-center justify-between gap-3 p-4 transition-colors hover:border-amber/30"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-ink">
                  {artist.name}
                </span>
                <span className="text-xs text-ink-muted">
                  {artist.count} song{artist.count === 1 ? "" : "s"}
                </span>
              </span>
              <Music2 className="size-4 shrink-0 text-ink-faint" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
