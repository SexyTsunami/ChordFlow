"use client";

import { LoaderCircle, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/controls";
import { cn } from "@/lib/utils";
import type { SongPreviewState } from "./use-song-preview";

export function SongPreviewButton({
  preview,
  compact = false,
}: {
  preview: SongPreviewState;
  compact?: boolean;
}) {
  if (!preview.loading && !preview.preview) return null;

  const label = preview.playing ? "Pause preview" : "Play 30 second preview";
  const title = preview.preview
    ? `${preview.preview.trackName} · ${preview.preview.artistName}`
    : "Looking up a 30 second Apple preview";

  return (
    <Tooltip label={title}>
      <Button
        variant={preview.playing ? "primary" : "secondary"}
        size={compact ? "sm" : "icon-lg"}
        className={cn(
          compact ? "min-h-11 sm:min-h-8" : "size-11",
          preview.playing && "shadow-none",
        )}
        onClick={preview.toggle}
        disabled={preview.loading || !preview.preview}
        aria-label={label}
        aria-pressed={preview.playing}
      >
        {preview.loading ? (
          <LoaderCircle className="animate-spin" />
        ) : preview.playing ? (
          <Pause />
        ) : (
          <Play />
        )}
        {compact ? (
          <span>{preview.playing ? "Playing" : "Preview"}</span>
        ) : null}
      </Button>
    </Tooltip>
  );
}

export function SongPreviewCaption({ preview }: { preview: SongPreviewState }) {
  if (!preview.preview) return null;
  return (
    <p className="text-[11px] text-ink-faint">
      30s preview
      {preview.preview.trackViewUrl ? (
        <>
          {" · "}
          <a
            href={preview.preview.trackViewUrl}
            target="_blank"
            rel="noreferrer"
            className="text-amber-soft underline-offset-2 hover:underline"
          >
            Apple
          </a>
        </>
      ) : (
        " · Apple"
      )}
    </p>
  );
}
