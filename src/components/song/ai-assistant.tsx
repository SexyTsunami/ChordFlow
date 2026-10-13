"use client";

import * as React from "react";
import { Info, Loader2, Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Label } from "@/components/ui/primitives";
import { useProviderStatus } from "@/components/providers/use-provider-status";
import type { Song } from "@/lib/domain/types";
import type { AiTask } from "@/lib/providers/types";
import { errorMessage } from "@/lib/utils";

/**
 * Optional AI chord assistance.
 *
 * Nothing here pretends to listen to a recording. Every result is labelled an
 * estimate, and when no API key is configured the panel says so plainly and
 * leaves the manual editor completely functional.
 */

const TASKS: Array<{ id: AiTask; label: string; hint: string }> = [
  {
    id: "suggest-capo",
    label: "Suggest a capo",
    hint: "Finds capo positions that turn your chords into open shapes.",
  },
  {
    id: "simplify-chords",
    label: "Simplify chords",
    hint: "Beginner-friendly substitutions for barre-heavy chords.",
  },
  {
    id: "explain-progression",
    label: "Explain the progression",
    hint: "Roman numerals and why the sequence works.",
  },
  {
    id: "align-chords",
    label: "Align chords to lyrics",
    hint: "Places your chords over the lyrics you have written.",
  },
  {
    id: "convert-sheet",
    label: "Convert a pasted sheet",
    hint: "Turns a chord sheet you own into ChordFlow's format.",
  },
  {
    id: "suggest-progression",
    label: "Suggest a progression",
    hint: "A starting point when you have nothing written yet.",
  },
];

type AiResult = {
  message: string;
  disclaimer: string;
  model: string;
  suggestion?: { chords?: string[]; capo?: number; key?: string; lines?: string[] };
};

export function AiAssistant({
  song,
  chords,
  songKey,
  sheet,
  onApplyLines,
  onApplyCapo,
}: {
  song: Song;
  chords: string[];
  songKey: string | null;
  sheet: string;
  onApplyLines?: (lines: string[]) => void;
  onApplyCapo?: (capo: number) => void;
}) {
  const { status, loading } = useProviderStatus();
  const [task, setTask] = React.useState<AiTask>("suggest-capo");
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<AiResult | null>(null);
  const [error, setError] = React.useState<{ message: string; hint?: string } | null>(
    null,
  );

  const configured = status?.ai === true;

  const run = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/ai/chords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task,
          songTitle: song.title,
          artist: song.artist,
          key: songKey,
          chords,
          notes: notes.trim() || undefined,
          userContent: sheet.slice(0, 8000),
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        setError({
          message: json?.error?.message ?? `Request failed (HTTP ${response.status}).`,
          hint: json?.error?.hint,
        });
        return;
      }
      setResult(json as AiResult);
    } catch (caught) {
      setError({ message: errorMessage(caught, "Could not reach the assistant.") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Sparkles className="size-4 text-amber" /> AI chord assistance
          </h3>
          <p className="mt-0.5 text-xs text-ink-muted">
            Optional. Works on what you have written — it cannot hear the song.
          </p>
        </div>
        {loading ? null : (
          <Badge tone={configured ? "sage" : "neutral"}>
            {configured ? "Configured" : "Not configured"}
          </Badge>
        )}
      </div>

      {!configured && !loading ? (
        <div className="flex gap-2.5 rounded-lg border border-line bg-surface-2 p-3 text-xs leading-relaxed text-ink-muted">
          <Info className="mt-0.5 size-4 shrink-0 text-ink-faint" />
          <p>
            Set <code className="text-amber-soft">AI_PROVIDER_API_KEY</code> (and
            optionally <code className="text-amber-soft">AI_MODEL</code>) to switch
            this on. Everything else in the editor works without it.
          </p>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="ai-task">What should it do?</Label>
        <select
          id="ai-task"
          value={task}
          onChange={(e) => setTask(e.target.value as AiTask)}
          disabled={!configured}
          className="h-9 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm text-ink disabled:opacity-50"
        >
          {TASKS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-ink-faint">
          {TASKS.find((t) => t.id === task)?.hint}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ai-notes">Extra context (optional)</Label>
        <input
          id="ai-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={!configured}
          placeholder="e.g. I can't barre yet"
          className="h-9 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm text-ink placeholder:text-ink-faint disabled:opacity-50"
        />
      </div>

      <Button
        variant="primary"
        size="sm"
        onClick={run}
        disabled={!configured || busy}
        className="w-full"
      >
        {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
        {busy ? "Thinking…" : "Run"}
      </Button>

      {error ? (
        <div className="flex gap-2.5 rounded-lg border border-rose/35 bg-rose/10 p-3 text-xs">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-rose" />
          <div>
            <p className="text-ink">{error.message}</p>
            {error.hint ? <p className="mt-1 text-ink-muted">{error.hint}</p> : null}
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="space-y-3 rounded-lg border border-amber/25 bg-amber/[0.06] p-3">
          <Badge tone="rose">AI estimate — not verified</Badge>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink">
            {result.message}
          </p>

          {result.suggestion?.chords?.length ? (
            <p className="font-mono text-xs text-amber-soft">
              {result.suggestion.chords.join("  ")}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {typeof result.suggestion?.capo === "number" && onApplyCapo ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onApplyCapo(result.suggestion!.capo!)}
              >
                Apply capo {result.suggestion.capo}
              </Button>
            ) : null}
            {result.suggestion?.lines?.length && onApplyLines ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onApplyLines(result.suggestion!.lines!)}
              >
                Replace sheet with suggestion
              </Button>
            ) : null}
          </div>

          <p className="text-[11px] leading-relaxed text-ink-faint">
            {result.disclaimer} · model: {result.model}
          </p>
        </div>
      ) : null}
    </div>
  );
}
