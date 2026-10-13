"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Badge,
  EmptyState,
  SectionHeading,
  Skeleton,
} from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import {
  bestArrangement,
  useLibrary,
} from "@/components/providers/library-provider";
import type { PlaylistTrack } from "@/lib/domain/types";
import { ARRANGEMENT_STATUS_META } from "@/lib/domain/types";
import { findSongForTrack } from "@/lib/music/estimate";
import { errorMessage } from "@/lib/utils";

export function PlaylistDetailView({ playlistId }: { playlistId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const {
    ready,
    playlists,
    songs,
    arrangements,
    savePlaylist,
    deletePlaylist,
    deleteArrangementsForSong,
  } = useLibrary();

  const playlist = playlists.find((item) => item.id === playlistId);
  const linkingRef = React.useRef(false);

  React.useEffect(() => {
    if (!ready || !playlist || linkingRef.current) return;
    const nextTracks = playlist.tracks.map((track) => {
      const found = findSongForTrack(track, songs, arrangements);
      if (!found || found.id === track.songId) return track;
      return {
        ...track,
        songId: found.id,
        matchStatus: track.matchStatus === "unmatched" ? "probable" : track.matchStatus,
      };
    });
    if (nextTracks.every((track, index) => track.songId === playlist.tracks[index]?.songId)) {
      return;
    }
    linkingRef.current = true;
    void savePlaylist({ ...playlist, tracks: nextTracks }).finally(() => {
      linkingRef.current = false;
    });
  }, [arrangements, playlist, ready, savePlaylist, songs]);

  if (!ready) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Skeleton className="mb-4 h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="Playlist not found"
          description="It may have been removed from this library."
          action={
            <Button variant="secondary" asChild>
              <Link href="/playlists">Back to playlists</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const trackStatus = (track: PlaylistTrack) => {
    const song = findSongForTrack(track, songs, arrangements);
    const songId = song?.id ?? track.songId;
    const songArr = songId
      ? arrangements.filter((item) => item.songId === songId)
      : [];
    return bestArrangement(songArr);
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-6 lg:py-8">
      <Link
        href="/playlists"
        className="mb-3 inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-ink"
      >
        <ArrowLeft className="size-3.5" /> All playlists
      </Link>

      <SectionHeading
        title={playlist.name}
        description={`${playlist.tracks.length} tracks · ${playlist.source}${
          playlist.owner ? ` · ${playlist.owner}` : ""
        }`}
        action={
          <div className="flex flex-wrap gap-2">
            {playlist.sourceUrl ? (
              <Button variant="secondary" size="sm" asChild>
                <a href={playlist.sourceUrl} target="_blank" rel="noreferrer">
                  <ExternalLink /> Source
                </a>
              </Button>
            ) : null}
            <Button
              variant="danger"
              size="sm"
              onClick={async () => {
                await deletePlaylist(playlist.id);
                router.push("/playlists");
              }}
            >
              <Trash2 /> Delete
            </Button>
          </div>
        }
      />

      <div className="mb-4 rounded-xl border border-amber/25 bg-amber/[0.06] p-3 text-xs leading-relaxed text-ink-muted">
        Playlists are just title lists. Open a song that is already in
        ChordDatabase to play it. Sheet edits you save become take-home
        markdown notes on the Edits page.
      </div>

      {playlist.importWarnings.length ? (
        <ul className="mb-4 list-disc space-y-1 pl-5 text-xs text-ink-faint">
          {playlist.importWarnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      <div className="panel divide-y divide-line/60">
        {playlist.tracks.map((track) => {
          const arrangement = trackStatus(track);
          const linked = findSongForTrack(track, songs, arrangements);
          const href = linked
            ? `/songs/${linked.id}`
            : track.songId
              ? `/songs/${track.songId}`
              : null;
          return (
            <div
              key={track.id}
              className="flex flex-wrap items-center gap-3 px-3 py-2.5"
            >
              <span className="w-6 text-right font-mono text-[11px] text-ink-faint tabular-nums">
                {track.position + 1}
              </span>
              {href ? (
                <Link href={href} className="min-w-0 flex-1 hover:opacity-80">
                  <p className="truncate text-sm text-ink">{track.title}</p>
                  <p className="truncate text-xs text-ink-muted">{track.artist}</p>
                </Link>
              ) : (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{track.title}</p>
                  <p className="truncate text-xs text-ink-muted">{track.artist}</p>
                </div>
              )}
              {arrangement ? (
                <Badge tone={ARRANGEMENT_STATUS_META[arrangement.status].tone}>
                  {ARRANGEMENT_STATUS_META[arrangement.status].label}
                </Badge>
              ) : (
                <Badge>No chords</Badge>
              )}
              {href ? (
                <Button variant="secondary" size="sm" asChild>
                  <Link href={href}>{arrangement ? "Open" : "Song"}</Link>
                </Button>
              ) : null}
              {arrangement ? (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Delete sheet for ${track.title}`}
                  onClick={async () => {
                    if (
                      !window.confirm(
                        `Delete the chord sheet for ${track.title}? The song stays in the playlist.`,
                      )
                    ) {
                      return;
                    }
                    try {
                      const song = findSongForTrack(track, songs, arrangements);
                      if (song) await deleteArrangementsForSong(song.id);
                      else await deleteArrangementsForSong(arrangement.songId);
                      toast({ tone: "success", title: `Deleted sheet for ${track.title}` });
                    } catch (error) {
                      toast({
                        tone: "error",
                        title: "Could not delete",
                        description: errorMessage(error),
                      });
                    }
                  }}
                >
                  <Trash2 />
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
