"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Copy, Download, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, SectionHeading } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import {
  allEditsMarkdown,
  listSheetEdits,
  removeSheetEdit,
  subscribeSheetEdits,
  type SheetEditNote,
} from "@/lib/storage/sheet-edits";
import { errorMessage, formatRelativeTime } from "@/lib/utils";

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function shareOrCopy(title: string, text: string) {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text });
      return "shared";
    } catch (error) {
      if ((error as { name?: string }).name === "AbortError") return "cancelled";
    }
  }
  await navigator.clipboard.writeText(text);
  return "copied";
}

export function EditsView() {
  const { toast } = useToast();
  const [notes, setNotes] = React.useState<SheetEditNote[]>([]);
  const [openId, setOpenId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const refresh = () => setNotes(listSheetEdits());
    refresh();
    return subscribeSheetEdits(refresh);
  }, []);

  const handleCopy = async (note: SheetEditNote) => {
    try {
      await navigator.clipboard.writeText(note.markdown);
      toast({ tone: "success", title: `Copied ${note.filename}` });
    } catch (error) {
      toast({ tone: "error", title: "Could not copy", description: errorMessage(error) });
    }
  };

  const handleShare = async (note: SheetEditNote) => {
    try {
      const result = await shareOrCopy(note.filename, note.markdown);
      if (result === "copied") toast({ tone: "success", title: `Copied ${note.filename}` });
    } catch (error) {
      toast({ tone: "error", title: "Could not share", description: errorMessage(error) });
    }
  };

  const handleExportAll = async () => {
    const bundle = allEditsMarkdown(notes);
    if (!bundle) return;
    try {
      const result = await shareOrCopy("chordflow-edits.md", bundle);
      if (result === "copied") {
        downloadText("chordflow-edits.md", bundle);
        toast({ tone: "success", title: "Downloaded all take-home notes" });
      }
    } catch {
      downloadText("chordflow-edits.md", bundle);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 lg:px-6 lg:py-8">
      <SectionHeading
        title="Take-home edits"
        description="Sheet changes stay on this phone. Copy, share, or download the markdown, then paste it into ChordDatabase on your desktop."
        action={
          notes.length ? (
            <Button variant="primary" size="sm" onClick={() => void handleExportAll()}>
              <Share2 /> Share all
            </Button>
          ) : null
        }
      />

      {notes.length === 0 ? (
        <EmptyState
          icon={<Check className="size-5" />}
          title="No pending edits"
          description="When you save a sheet, a take-home markdown note appears here."
        />
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const open = openId === note.songId;
            return (
              <article key={note.songId} className="panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-medium text-ink">{note.title}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {note.artist} · ChordDatabase/{note.filename}
                    </p>
                    <p className="mt-1 text-[11px] text-ink-faint">
                      {formatRelativeTime(note.updatedAt)}
                    </p>
                    {note.desktopNote ? (
                      <p className="mt-2 text-sm text-ink-muted">{note.desktopNote}</p>
                    ) : null}
                  </div>
                  <Link
                    href={`/songs/${note.songId}`}
                    className="shrink-0 text-xs text-amber-soft underline-offset-2 hover:underline"
                  >
                    Open
                  </Link>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="primary" size="sm" onClick={() => void handleShare(note)}>
                    <Share2 /> Share
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => void handleCopy(note)}>
                    <Copy /> Copy
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => downloadText(note.filename, note.markdown)}
                  >
                    <Download /> Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOpenId(open ? null : note.songId)}
                  >
                    {open ? "Hide markdown" : "Show markdown"}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => removeSheetEdit(note.songId)}
                  >
                    <Trash2 /> Dismiss
                  </Button>
                </div>

                {open ? (
                  <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-surface-3 p-3 text-[12px] leading-relaxed whitespace-pre-wrap text-ink">
                    {note.markdown}
                  </pre>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
