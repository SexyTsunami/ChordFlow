"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Music4, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/primitives";
import { useLibrary } from "@/components/providers/library-provider";
import { searchSongs } from "@/lib/search/search";
import { cn } from "@/lib/utils";

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { songs } = useLibrary();
  const [query, setQuery] = React.useState("");
  const [cursor, setCursor] = React.useState(0);

  const results = React.useMemo(
    () => searchSongs(songs, { query, limit: 12 }),
    [songs, query],
  );

  React.useEffect(() => {
    setCursor(0);
  }, [query]);

  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const go = React.useCallback(
    (songId: string) => {
      onOpenChange(false);
      router.push(`/songs/${songId}`);
    },
    [onOpenChange, router],
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (event.key === "Enter" && results[cursor]) {
      event.preventDefault();
      go(results[cursor].id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[12%] max-w-xl translate-y-0 p-0" hideClose>
        <DialogTitle className="sr-only">Search songs</DialogTitle>
        <DialogDescription className="sr-only">
          Search by Traditional or Simplified Chinese, pinyin, English title or
          artist.
        </DialogDescription>

        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="size-4 shrink-0 text-ink-faint" />
          {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search a title or artist…"
            aria-label="Search songs"
            className="h-12 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
          />
          <kbd className="hidden rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-ink-faint sm:block">
            esc
          </kbd>
        </div>

        <div className="max-h-[55dvh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-ink-muted">
              {query
                ? `Nothing matches “${query}”.`
                : "Start typing to search your songbook."}
            </p>
          ) : (
            <ul className="space-y-0.5">
              {results.map((song, index) => (
                <li key={song.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => go(song.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                      index === cursor ? "bg-surface-3" : "hover:bg-surface-2",
                    )}
                  >
                    <Music4 className="size-4 shrink-0 text-ink-faint" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">
                        {song.title}
                        {song.titleEn && song.titleEn !== song.title ? (
                          <span className="ml-2 text-xs text-ink-faint">
                            {song.titleEn}
                          </span>
                        ) : null}
                      </span>
                      <span className="block truncate text-xs text-ink-muted">
                        {song.artist}
                        {song.titlePinyin ? ` · ${song.titlePinyin}` : ""}
                      </span>
                    </span>
                    {song.arrangementStatus !== "unavailable" ? (
                      <Badge tone="amber">Chords</Badge>
                    ) : null}
                    {index === cursor ? (
                      <CornerDownLeft className="size-3.5 text-ink-faint" />
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
