"use client";

import * as React from "react";
import Link from "next/link";
import { Heart, Music2, Star } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { ARRANGEMENT_STATUS_META, type Song } from "@/lib/domain/types";
import { useLibrary } from "@/components/providers/library-provider";
import { cn } from "@/lib/utils";

function SingingKeyBadge({ songId }: { songId: string }) {
  const { preferences } = useLibrary();
  const key = preferences.favoriteKeys?.[songId];
  if (!key) return null;
  return <Badge tone="sage">sing {key}</Badge>;
}

function StatusBadge({ song }: { song: Song }) {
  const meta = ARRANGEMENT_STATUS_META[song.arrangementStatus];
  if (song.arrangementStatus === "unavailable") return null;
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function FavoriteButton({
  songId,
  className,
}: {
  songId: string;
  className?: string;
}) {
  const { favorites, toggleFavorite } = useLibrary();
  const active = favorites.has(songId);
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void toggleFavorite(songId);
      }}
      aria-pressed={active}
      aria-label={active ? "Remove from play favourites" : "Add to play favourites"}
      className={cn(
        "rounded-md p-1.5 transition-colors",
        active ? "text-amber hover:text-amber-soft" : "text-ink-faint hover:text-ink",
        className,
      )}
    >
      <Heart className={cn("size-4", active && "fill-current")} />
    </button>
  );
}

export function SongRow({
  song,
  index,
  showIndex = false,
}: {
  song: Song;
  index?: number;
  showIndex?: boolean;
}) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-line hover:bg-surface-2/70">
      <Link href={`/songs/${song.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        {showIndex ? (
          <span className="w-6 shrink-0 text-right font-mono text-xs text-ink-faint tabular-nums">
            {(index ?? 0) + 1}
          </span>
        ) : (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-faint group-hover:bg-surface-3">
            <Music2 className="size-4" />
          </span>
        )}

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="truncate text-[15px] font-medium text-ink">
              {song.title}
            </span>
            {song.titleEn && song.titleEn !== song.title ? (
              <span className="hidden truncate text-xs text-ink-faint sm:inline">
                {song.titleEn}
              </span>
            ) : null}
          </span>
          <span className="flex items-center gap-1.5 truncate text-xs text-ink-muted">
            <span className="truncate">{song.artist}</span>
            {song.album ? (
              <>
                <span className="text-ink-faint">·</span>
                <span className="hidden truncate sm:inline">{song.album}</span>
              </>
            ) : null}
            {song.releaseYear ? (
              <>
                <span className="text-ink-faint">·</span>
                <span className="tabular-nums">{song.releaseYear}</span>
              </>
            ) : null}
          </span>
        </span>

        <span className="hidden shrink-0 items-center gap-2 sm:flex">
          <SingingKeyBadge songId={song.id} />
          {song.difficulty ? (
            <Badge tone="outline">{song.difficulty}</Badge>
          ) : null}
          <StatusBadge song={song} />
        </span>
      </Link>

      <FavoriteButton songId={song.id} />
    </div>
  );
}

export function SongCard({ song }: { song: Song }) {
  return (
    <div className="group panel relative flex flex-col gap-2 p-4 transition-all hover:-translate-y-0.5 hover:border-amber/30 hover:shadow-[0_18px_40px_-28px_rgba(0,0,0,0.9)]">
      <Link
        href={`/songs/${song.id}`}
        className="absolute inset-0 z-0"
        aria-label={`${song.title} · ${song.artist}`}
      />
      <div className="relative z-10 flex items-start justify-between gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-amber/10 text-amber ring-1 ring-amber/20">
          <Music2 className="size-4" />
        </span>
        <FavoriteButton songId={song.id} className="-mt-1 -mr-1" />
      </div>
      <div className="relative z-10 min-w-0 pointer-events-none">
        <p className="truncate text-[15px] font-medium text-ink">{song.title}</p>
        {song.titlePinyin ? (
          <p className="truncate text-[11px] text-ink-faint italic">
            {song.titlePinyin}
          </p>
        ) : null}
        <p className="mt-1 truncate text-xs text-ink-muted">
          {song.artist}
          {song.releaseYear ? ` · ${song.releaseYear}` : ""}
        </p>
      </div>
      <div className="relative z-10 mt-auto flex flex-wrap gap-1.5 pt-1 pointer-events-none">
        <SingingKeyBadge songId={song.id} />
        <StatusBadge song={song} />
      </div>
    </div>
  );
}

export function SongGrid({ songs }: { songs: Song[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
      {songs.map((song) => (
        <SongCard key={song.id} song={song} />
      ))}
    </div>
  );
}

export function SongTable({
  songs,
  showIndex = false,
}: {
  songs: Song[];
  showIndex?: boolean;
}) {
  return (
    <div className="divide-y divide-line/60">
      {songs.map((song, index) => (
        <SongRow key={song.id} song={song} index={index} showIndex={showIndex} />
      ))}
    </div>
  );
}

export function FeaturedSongCard({ song }: { song: Song }) {
  return (
    <Link
      href={`/songs/${song.id}`}
      className="panel-raised group relative block overflow-hidden p-5 transition-colors hover:border-amber/30"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(28rem 16rem at 100% 0%, rgb(224 164 88 / 0.12), transparent 70%)",
        }}
        aria-hidden
      />
      <div className="relative flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber/15 text-amber ring-1 ring-amber/25">
          <Star className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-medium tracking-[0.14em] text-amber uppercase">
            Original practice song
          </p>
          <p className="mt-1 truncate text-lg font-semibold text-ink">{song.title}</p>
          <p className="truncate text-sm text-ink-muted">
            {song.titleEn} · {song.artist}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-ink-faint">
            Original words and chords written for ChordFlow, so you can try
            transposition, diagrams and practice mode on a complete sheet.
          </p>
        </div>
      </div>
    </Link>
  );
}
