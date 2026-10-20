"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Repeat,
  RotateCcw,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider, Tooltip } from "@/components/ui/controls";
import { cn } from "@/lib/utils";
import type { ArrangementSection } from "@/lib/domain/types";
import { SECTION_LABELS } from "@/lib/domain/types";
import { SongPreviewButton } from "./song-preview-button";
import { useMetronome } from "./use-metronome";
import { sectionAnchorId } from "./chord-sheet";
import type { SongPreviewState } from "./use-song-preview";

/**
 * The practice dock: song preview, metronome, section loop and the
 * "practised" marker. Fixed to the bottom so the controls stay reachable with
 * a guitar on your lap, and clear of the mobile tab bar.
 */

export type PracticeDockProps = {
  preview: SongPreviewState;
  onResetScroll: () => void;
  metronomeOn: boolean;
  onMetronomeChange: (value: boolean) => void;
  bpm: number;
  onBpmChange: (value: number) => void;
  beatsPerBar: number;
  onBeatsPerBarChange: (value: number) => void;
  sections: ArrangementSection[];
  loopSectionId: string | null;
  onLoopSectionChange: (sectionId: string | null) => void;
  onMarkPracticed: () => void;
  practicedToday: boolean;
  progress: number;
};

export function PracticeDock(props: PracticeDockProps) {
  const [expanded, setExpanded] = React.useState(false);
  const { beat, unavailable } = useMetronome({
    bpm: props.bpm,
    beatsPerBar: props.beatsPerBar,
    enabled: props.metronomeOn,
  });

  // Section loop: jump back to the top of the looped section when scrolling
  // leaves it. Re-checks on every scroll rather than on a timer.
  React.useEffect(() => {
    if (!props.loopSectionId) return;
    const handler = () => {
      const element = document.getElementById(sectionAnchorId(props.loopSectionId!));
      if (!element) return;
      const rect = element.getBoundingClientRect();
      if (rect.bottom < 120) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [props.loopSectionId]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+4.25rem)] lg:pb-4">
      <div className="panel-raised pointer-events-auto w-full max-w-3xl overflow-hidden bg-surface/95 backdrop-blur">
        <div
          className="h-0.5 bg-amber/70 transition-[width] duration-150"
          style={{ width: `${Math.round(props.progress * 100)}%` }}
          aria-hidden
        />

        <div className="flex items-center gap-2 px-3 py-2.5">
          <SongPreviewButton preview={props.preview} />

          <Tooltip label="Back to the top">
            <Button
              variant="ghost"
              size="icon"
              onClick={props.onResetScroll}
              aria-label="Reset scroll position"
            >
              <RotateCcw />
            </Button>
          </Tooltip>

          <div className="min-w-0 flex-1">
            {props.preview.preview ? (
              <p className="truncate text-xs text-ink">
                {props.preview.playing ? "Playing preview" : "30s preview"}
                <span className="text-ink-faint">
                  {" · "}
                  {props.preview.preview.trackName}
                </span>
              </p>
            ) : (
              <p className="truncate text-xs text-ink-faint">
                {props.preview.loading ? "Finding a preview…" : "Metronome and loop"}
              </p>
            )}
            {props.preview.playing ? (
              <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-surface-3">
                <div
                  className="h-full bg-amber"
                  style={{ width: `${Math.round(props.preview.progress * 100)}%` }}
                />
              </div>
            ) : null}
          </div>

          <Tooltip label={props.metronomeOn ? "Stop metronome" : "Start metronome"}>
            <Button
              variant={props.metronomeOn ? "subtle" : "ghost"}
              size="icon"
              onClick={() => props.onMetronomeChange(!props.metronomeOn)}
              aria-label={props.metronomeOn ? "Stop metronome" : "Start metronome"}
              aria-pressed={props.metronomeOn}
            >
              <Timer />
            </Button>
          </Tooltip>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? "Hide practice options" : "Show practice options"}
          >
            {expanded ? <ChevronDown /> : <ChevronUp />}
          </Button>
        </div>

        {expanded ? (
          <div className="space-y-3 border-t border-line px-3 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex min-w-[220px] flex-1 items-center gap-2">
                <span className="w-12 text-[10px] tracking-[0.1em] text-ink-faint uppercase">
                  Tempo
                </span>
                <Slider
                  value={[props.bpm]}
                  min={40}
                  max={200}
                  step={1}
                  onValueChange={([value]) => props.onBpmChange(value)}
                  aria-label="Metronome tempo in beats per minute"
                  className="min-w-0 flex-1"
                />
                <span className="w-16 text-right text-[11px] tabular-nums text-ink-faint">
                  {props.bpm} bpm
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] tracking-[0.1em] text-ink-faint uppercase">
                  Accent
                </span>
                <select
                  value={props.beatsPerBar}
                  onChange={(e) => props.onBeatsPerBarChange(Number(e.target.value))}
                  aria-label="Beats per bar"
                  className="h-8 rounded-lg border border-line bg-surface-2 px-2 text-xs text-ink"
                >
                  {[2, 3, 4, 6, 8].map((n) => (
                    <option key={n} value={n}>
                      {n}/4
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1" aria-hidden>
                  {Array.from({ length: props.beatsPerBar }).map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "size-1.5 rounded-full transition-colors",
                        props.metronomeOn && beat === i
                          ? i === 0
                            ? "bg-amber"
                            : "bg-ink-muted"
                          : "bg-surface-3",
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>

            {unavailable ? (
              <p className="text-xs text-rose">
                This browser does not expose the Web Audio API, so the metronome
                is unavailable.
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-[10px] tracking-[0.1em] text-ink-faint uppercase">
                <Repeat className="size-3" /> Loop
              </span>
              <select
                value={props.loopSectionId ?? ""}
                onChange={(e) => props.onLoopSectionChange(e.target.value || null)}
                aria-label="Loop a section"
                className="h-8 min-w-[9rem] rounded-lg border border-line bg-surface-2 px-2 text-xs text-ink"
              >
                <option value="">No loop</option>
                {props.sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.label ?? SECTION_LABELS[section.type]}
                  </option>
                ))}
              </select>

              <Button
                variant={props.practicedToday ? "subtle" : "secondary"}
                size="sm"
                className="ml-auto"
                onClick={props.onMarkPracticed}
              >
                <CircleCheck />
                {props.practicedToday ? "Practised today" : "Mark as practised"}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
