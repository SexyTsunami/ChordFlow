"use client";

import * as React from "react";
import type { ArrangementSection, ChordArrangement } from "@/lib/domain/types";
import { SECTION_LABELS } from "@/lib/domain/types";
import { lineSegments, plainTextLine } from "@/lib/music/chordsheet";
import { cn } from "@/lib/utils";

/**
 * The chord sheet renderer.
 *
 * Chord-only rows (ChordDatabase sheets) stay on one line as
 * `D – A – E – B`. Lyric sheets still use the aligned chord-above-text layout.
 */

export type ChordSheetProps = {
  arrangement: ChordArrangement;
  fontScale?: number;
  showPinyin?: boolean;
  showTranslation?: boolean;
  plainMode?: boolean;
  activeChord?: string | null;
  onChordSelect?: (chord: string) => void;
  /** Section currently looped in practice mode. */
  loopSectionId?: string | null;
  className?: string;
};

const SECTION_TONE: Record<string, string> = {
  chorus: "text-amber border-amber/35 bg-amber/10",
  "pre-chorus": "text-amber-soft border-amber/25 bg-amber/5",
  bridge: "text-sage border-sage/30 bg-sage/10",
  intro: "text-ink-muted border-line bg-surface-2",
  outro: "text-ink-muted border-line bg-surface-2",
};

function sectionHeading(section: ArrangementSection): string {
  const base = section.label ?? SECTION_LABELS[section.type];
  const withNote = section.annotation ? `${base} ${section.annotation}` : base;
  return section.repeat && section.repeat > 1 ? `${withNote} ×${section.repeat}` : withNote;
}

function detailsLabel(section: ArrangementSection): string {
  return `${section.label ?? SECTION_LABELS[section.type]} Details`;
}

export function sectionAnchorId(sectionId: string) {
  return `section-${sectionId}`;
}

function ChordToken({
  chord,
  active,
  onSelect,
}: {
  chord: string;
  active: boolean;
  onSelect?: (chord: string) => void;
}) {
  if (!onSelect) {
    return (
      <span className={cn("chord-token", active && "underline decoration-amber/50")}>
        {chord}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onSelect(chord)}
      title={`Show the ${chord} diagram`}
      className={cn(
        "chord-token -mx-0.5 rounded px-0.5 transition-colors hover:bg-amber/15",
        active && "bg-amber/20",
      )}
    >
      {chord}
    </button>
  );
}

function NoteText({ text }: { text: string }) {
  const blocks = text.split(/\n\n+/);
  return (
    <div className="space-y-2">
      {blocks.map((block, index) => (
        <p key={index} className="text-[0.92em] leading-relaxed text-ink-muted">
          {block.split(/(`[^`]+`)/g).map((part, partIndex) => {
            const tick = part.match(/^`([^`]+)`$/);
            if (!tick) return <React.Fragment key={partIndex}>{part}</React.Fragment>;
            return (
              <code
                key={partIndex}
                className="rounded bg-surface-3 px-1 py-0.5 font-mono text-[0.92em] text-ink"
              >
                {tick[1]}
              </code>
            );
          })}
        </p>
      ))}
    </div>
  );
}

function DetailsButton({ title, text }: { title: string; text: string }) {
  return (
    <details className="group mt-2 rounded-lg border border-line bg-surface-2/60">
      <summary className="min-h-11 cursor-pointer list-none px-3 py-2.5 text-sm font-medium text-ink-muted marker:content-none sm:min-h-0 sm:py-2 sm:text-xs [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block text-ink-faint transition-transform group-open:rotate-90"
          >
            ▸
          </span>
          {title}
        </span>
      </summary>
      <div className="border-t border-line/70 px-3 py-2.5">
        <NoteText text={text} />
      </div>
    </details>
  );
}

function DashedChordLine({
  line,
  activeChord,
  onChordSelect,
}: {
  line: ChordArrangement["sections"][number]["lines"][number];
  activeChord?: string | null;
  onChordSelect?: (chord: string) => void;
}) {
  return (
    <div className="mb-[0.55em] overflow-x-auto last:mb-0">
      <div className="inline-flex min-w-full flex-nowrap items-baseline whitespace-nowrap">
        {line.chords.map((event, index) => (
          <React.Fragment key={event.id}>
            {index > 0 ? (
              <span className="px-1.5 text-ink-faint" aria-hidden>
                –
              </span>
            ) : null}
            <ChordToken
              chord={event.chord}
              active={activeChord === event.chord}
              onSelect={onChordSelect}
            />
          </React.Fragment>
        ))}
      </div>
      {line.note ? (
        <p className="mt-0.5 text-[0.72em] text-sage">({line.note})</p>
      ) : null}
    </div>
  );
}

function AlignedLine({
  line,
  activeChord,
  onChordSelect,
  showPinyin,
  showTranslation,
}: {
  line: ChordArrangement["sections"][number]["lines"][number];
  activeChord?: string | null;
  onChordSelect?: (chord: string) => void;
  showPinyin?: boolean;
  showTranslation?: boolean;
}) {
  const segments = React.useMemo(() => lineSegments(line), [line]);
  const isBlank = !line.text?.trim() && line.chords.length === 0;
  const chordOnly = !line.text?.trim() && line.chords.length > 0;

  if (isBlank) return <div className="h-[0.9em]" aria-hidden />;
  if (chordOnly) {
    return (
      <DashedChordLine
        line={line}
        activeChord={activeChord}
        onChordSelect={onChordSelect}
      />
    );
  }

  return (
    <div className="mb-[0.55em] last:mb-0">
      <div className="flex flex-wrap items-end">
        {segments.map((segment, index) => (
          <span
            key={`${segment.offset}-${index}`}
            className="inline-flex flex-col items-start"
          >
            <span
              className="min-h-[1.35em] text-[0.82em] leading-[1.3]"
              aria-hidden={!segment.chord}
            >
              {segment.chord ? (
                <ChordToken
                  chord={segment.chord}
                  active={activeChord === segment.chord}
                  onSelect={onChordSelect}
                />
              ) : (
                "\u00A0"
              )}
            </span>
            <span className="lyric-text leading-[1.5] whitespace-pre-wrap">
              {segment.text}
            </span>
          </span>
        ))}
      </div>

      {showPinyin && line.pinyin ? (
        <p className="mt-0.5 text-[0.72em] leading-snug text-ink-faint italic">
          {line.pinyin}
        </p>
      ) : null}
      {showTranslation && line.translation ? (
        <p className="mt-0.5 text-[0.74em] leading-snug text-ink-muted">
          {line.translation}
        </p>
      ) : null}
      {line.note ? (
        <p className="mt-0.5 text-[0.72em] text-sage">({line.note})</p>
      ) : null}
    </div>
  );
}

function PlainSection({ section }: { section: ArrangementSection }) {
  const body = section.lines
    .map((line) => {
      if (!line.text?.trim() && line.chords.length) {
        return line.chords.map((event) => event.chord).join(" – ");
      }
      const { chordRow, lyricRow } = plainTextLine(line);
      return chordRow ? `${chordRow}\n${lyricRow}` : lyricRow;
    })
    .join("\n");

  return (
    <pre className="overflow-x-auto font-mono text-[0.9em] leading-[1.6] whitespace-pre text-ink">
      {body}
    </pre>
  );
}

export function ChordSheet({
  arrangement,
  fontScale = 1,
  showPinyin = false,
  showTranslation = false,
  plainMode = false,
  activeChord,
  onChordSelect,
  loopSectionId,
  className,
}: ChordSheetProps) {
  return (
    <div
      className={cn("space-y-7", className)}
      style={{ fontSize: `${(fontScale * 1.0625).toFixed(3)}rem` }}
    >
      {arrangement.notes ? (
        <DetailsButton title="Song Details" text={arrangement.notes} />
      ) : null}

      {arrangement.sections.map((section) => (
        <section
          key={section.id}
          id={sectionAnchorId(section.id)}
          className={cn(
            "scroll-mt-28 rounded-xl transition-colors",
            loopSectionId === section.id &&
              "-mx-3 bg-amber/[0.06] px-3 py-2 ring-1 ring-amber/25",
          )}
          aria-label={sectionHeading(section)}
        >
          <h3 className="mb-2 flex items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[0.62em] font-semibold tracking-[0.1em] uppercase",
                SECTION_TONE[section.type] ?? "border-line bg-surface-2 text-ink-muted",
              )}
            >
              {sectionHeading(section)}
            </span>
            {loopSectionId === section.id ? (
              <span className="text-[0.62em] tracking-wide text-amber uppercase">
                looping
              </span>
            ) : null}
          </h3>

          {plainMode ? (
            <PlainSection section={section} />
          ) : (
            <div>
              {section.lines.map((line) => (
                <AlignedLine
                  key={line.id}
                  line={line}
                  activeChord={activeChord}
                  onChordSelect={onChordSelect}
                  showPinyin={showPinyin}
                  showTranslation={showTranslation}
                />
              ))}
            </div>
          )}

          {section.notes ? (
            <DetailsButton title={detailsLabel(section)} text={section.notes} />
          ) : null}
        </section>
      ))}

      {arrangement.form ? (
        <section aria-label="Form">
          <h3 className="mb-2">
            <span className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[0.62em] font-semibold tracking-[0.1em] text-ink-muted uppercase">
              Form
            </span>
          </h3>
          <p className="text-[0.95em] leading-relaxed text-ink">{arrangement.form}</p>
        </section>
      ) : null}

      {arrangement.miscNotes ? (
        <DetailsButton title="Misc Details" text={arrangement.miscNotes} />
      ) : null}
    </div>
  );
}
