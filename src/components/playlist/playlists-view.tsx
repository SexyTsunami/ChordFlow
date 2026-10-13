"use client";

import * as React from "react";
import Link from "next/link";
import { ListMusic, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState, SectionHeading } from "@/components/ui/primitives";
import { ImportDialog } from "@/components/playlist/import-dialog";
import { useLibrary } from "@/components/providers/library-provider";
import { formatRelativeTime } from "@/lib/utils";

export function PlaylistsView() {
  const { playlists } = useLibrary();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-6 lg:py-8">
      <SectionHeading
        title="Playlists"
        description="Optional title lists. The songbook itself comes from ChordDatabase."
        action={
          <ImportDialog
            trigger={
              <Button variant="primary" size="sm">
                <Plus /> Import playlist
              </Button>
            }
          />
        }
      />

      {playlists.length === 0 ? (
        <EmptyState
          icon={<ListMusic className="size-5" />}
          title="No playlists yet"
          description="Paste a Spotify or YouTube link — no official API keys needed. Then estimate chords for the whole list."
          action={
            <ImportDialog
              trigger={
                <Button variant="secondary" size="sm">
                  <Plus /> Import a playlist
                </Button>
              }
            />
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {playlists.map((playlist) => (
            <Link
              key={playlist.id}
              href={`/playlists/${playlist.id}`}
              className="panel group p-4 transition-colors hover:border-amber/30"
            >
              <div className="flex items-center justify-between gap-2">
                <Badge tone="outline">{playlist.source}</Badge>
                <span className="text-xs text-ink-faint tabular-nums">
                  {playlist.tracks.length} tracks
                </span>
              </div>
              <p className="mt-2 truncate text-sm font-medium text-ink">
                {playlist.name}
              </p>
              <p className="truncate text-xs text-ink-muted">
                Updated {formatRelativeTime(playlist.updatedAt)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
