"use client";

import * as React from "react";
import { LayoutGrid, List, Search, SlidersHorizontal } from "lucide-react";
import { Badge, EmptyState, Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import type { Song } from "@/lib/domain/types";
import { searchSongs, type SortKey } from "@/lib/search/search";
import { cn } from "@/lib/utils";
import { SongGrid, SongTable } from "./song-list";

const SORTS: Array<{ value: SortKey; label: string }> = [
  { value: "relevance", label: "Best match" },
  { value: "title", label: "Title" },
  { value: "artist", label: "Artist" },
  { value: "difficulty", label: "Difficulty" },
  { value: "year", label: "Year" },
];

export function SongBrowser({
  songs,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  defaultView = "list",
  showIndex = false,
}: {
  songs: Song[];
  emptyTitle?: string;
  emptyDescription?: React.ReactNode;
  defaultView?: "list" | "grid";
  showIndex?: boolean;
}) {
  const [query, setQuery] = React.useState("");
  const [artist, setArtist] = React.useState("");
  const [sort, setSort] = React.useState<SortKey>("relevance");
  const [direction, setDirection] = React.useState<"asc" | "desc">("asc");
  const [view, setView] = React.useState<"list" | "grid">(defaultView);
  const [onlyWithChords, setOnlyWithChords] = React.useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("chords") === "1" || params.get("sheet") === "ai-estimate") {
      setOnlyWithChords(true);
    }
    const fromUrl = params.get("artist");
    if (fromUrl) setArtist(fromUrl);
  }, []);

  const scoped = React.useMemo(() => {
    if (!artist.trim()) return songs;
    const needle = artist.trim().toLowerCase();
    return songs.filter((song) => song.artist.trim().toLowerCase() === needle);
  }, [artist, songs]);

  const results = React.useMemo(
    () =>
      searchSongs(scoped, {
        query,
        sort: query.trim() && sort === "relevance" ? "relevance" : sort === "relevance" ? undefined : sort,
        direction,
        hasArrangement: onlyWithChords ? true : undefined,
      }),
    [scoped, query, sort, direction, onlyWithChords],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title or artist…"
            aria-label="Filter songs"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="size-3.5 text-ink-faint" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Sort songs"
              className="h-9 rounded-lg border border-line bg-surface-2 px-2 text-xs text-ink"
            >
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={() => setDirection((d) => (d === "asc" ? "desc" : "asc"))}
              aria-label={`Sort ${direction === "asc" ? "descending" : "ascending"}`}
              disabled={sort === "relevance"}
            >
              <span className="text-xs">{direction === "asc" ? "↑" : "↓"}</span>
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setOnlyWithChords((v) => !v)}
            aria-pressed={onlyWithChords}
            className={cn(
              "h-9 rounded-lg border px-2.5 text-xs transition-colors",
              onlyWithChords
                ? "border-amber/40 bg-amber/12 text-amber-soft"
                : "border-line bg-surface-2 text-ink-muted hover:text-ink",
            )}
          >
            Has chords
          </button>

          <div className="flex rounded-lg border border-line bg-surface-2">
            <Button
              variant="ghost"
              size="icon-sm"
              className={cn("rounded-r-none", view === "list" && "text-amber")}
              onClick={() => setView("list")}
              aria-label="List view"
              aria-pressed={view === "list"}
            >
              <List />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className={cn("rounded-l-none", view === "grid" && "text-amber")}
              onClick={() => setView("grid")}
              aria-label="Grid view"
              aria-pressed={view === "grid"}
            >
              <LayoutGrid />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-faint">
        <Badge tone="outline">
          {results.length} of {scoped.length}
        </Badge>
        {artist ? (
          <button
            type="button"
            onClick={() => setArtist("")}
            className="rounded-full border border-amber/30 bg-amber/10 px-2 py-0.5 text-amber-soft"
          >
            {artist} ×
          </button>
        ) : null}
        {query.trim() ? <span>matching “{query}”</span> : null}
      </div>

      {results.length === 0 ? (
        <EmptyState
          icon={<Search className="size-5" />}
          title={query.trim() ? `No matches for “${query}”` : emptyTitle}
          description={
            query.trim()
              ? "Try the Traditional or Simplified title, pinyin, pinyin initials, or the English name."
              : emptyDescription
          }
        />
      ) : view === "grid" ? (
        <SongGrid songs={results} />
      ) : (
        <div className="panel p-2">
          <SongTable songs={results} showIndex={showIndex} />
        </div>
      )}
    </div>
  );
}
