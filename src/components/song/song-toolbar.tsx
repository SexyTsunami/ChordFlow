"use client";

import * as React from "react";
import {
  ALargeSmall,
  Guitar,
  Languages,
  LayoutList,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { Tooltip } from "@/components/ui/controls";
import { cn } from "@/lib/utils";
import { semitonesBetween, suggestCapos, transposeKey } from "@/lib/music/chords";

const KEY_CHOICES = [
  "C",
  "G",
  "D",
  "A",
  "E",
  "B",
  "F#",
  "F",
  "Bb",
  "Eb",
  "Ab",
  "Am",
  "Em",
  "Dm",
  "Bm",
  "F#m",
  "C#m",
  "Gm",
  "Cm",
];

/**
 * Key, capo and display controls for the practice screen.
 * Transposition is a view concern: the stored arrangement never changes.
 */

export type SongToolbarProps = {
  originalKey: string | null;
  transpose: number;
  onTransposeChange: (value: number) => void;
  singingKey?: string | null;
  onSaveSingingKey?: (key: string | null) => void;
  capo: number;
  onCapoChange: (value: number) => void;
  chords: string[];
  preferFlats: boolean;
  onPreferFlatsChange: (value: boolean) => void;
  fontScale: number;
  onFontScaleChange: (value: number) => void;
  plainMode: boolean;
  onPlainModeChange: (value: boolean) => void;
  showPinyin: boolean;
  onShowPinyinChange: (value: boolean) => void;
  showTranslation: boolean;
  onShowTranslationChange: (value: boolean) => void;
  hasPinyin: boolean;
  hasTranslation: boolean;
};

function ToggleChip({
  active,
  onClick,
  icon,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs transition-colors",
        active
          ? "border-amber/40 bg-amber/12 text-amber-soft"
          : "border-line bg-surface-2 text-ink-muted hover:border-line-strong hover:text-ink",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export function SongToolbar(props: SongToolbarProps) {
  const {
    originalKey,
    transpose,
    onTransposeChange,
    singingKey,
    onSaveSingingKey,
    capo,
    onCapoChange,
    chords,
    preferFlats,
    fontScale,
    onFontScaleChange,
  } = props;

  const currentKey = React.useMemo(
    () => transposeKey(originalKey, transpose, { preferFlats }),
    [originalKey, transpose, preferFlats],
  );

  const capoSuggestions = React.useMemo(
    () => suggestCapos(chords, { preferFlats, limit: 3 }).filter((s) => s.easyCount > 0),
    [chords, preferFlats],
  );

  return (
    <div className="sticky top-[53px] z-20 -mx-4 mb-5 border-y border-line bg-canvas/90 px-3 py-2.5 backdrop-blur lg:top-[57px] lg:-mx-6 lg:px-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
        {/* Transpose */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium tracking-[0.1em] text-ink-faint uppercase">
            Key
          </span>
          <div className="flex items-center rounded-lg border border-line bg-surface-2">
            <Tooltip label="Transpose down a semitone">
              <Button
                variant="ghost"
                size="icon-sm"
                className="min-h-11 min-w-11 rounded-r-none sm:min-h-8 sm:min-w-8"
                onClick={() => onTransposeChange(transpose - 1)}
                aria-label="Transpose down a semitone"
              >
                <Minus />
              </Button>
            </Tooltip>
            {originalKey ? (
              <select
                value={currentKey ?? originalKey}
                onChange={(event) => {
                  const delta = semitonesBetween(originalKey, event.target.value);
                  if (delta !== null) onTransposeChange(delta);
                }}
                aria-label="Change key"
                className="h-11 min-w-[4.5rem] border-x-0 bg-transparent px-1 text-center text-sm font-semibold text-ink focus-visible:outline-none sm:h-8 sm:text-xs"
              >
                {[currentKey, ...KEY_CHOICES]
                  .filter((key, index, all): key is string => Boolean(key) && all.indexOf(key) === index)
                  .map((key) => (
                    <option key={key} value={key}>
                      {key}
                      {key === originalKey ? " (orig)" : ""}
                    </option>
                  ))}
              </select>
            ) : (
              <span className="min-w-[4.5rem] px-1 text-center text-xs tabular-nums text-ink-faint">
                {transpose === 0
                  ? "—"
                  : `${transpose > 0 ? "+" : ""}${transpose} st`}
              </span>
            )}
            <Tooltip label="Transpose up a semitone">
              <Button
                variant="ghost"
                size="icon-sm"
                className="min-h-11 min-w-11 rounded-l-none sm:min-h-8 sm:min-w-8"
                onClick={() => onTransposeChange(transpose + 1)}
                aria-label="Transpose up a semitone"
              >
                <Plus />
              </Button>
            </Tooltip>
          </div>
          {transpose !== 0 ? (
            <Tooltip label="Back to the written key">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onTransposeChange(0)}
                aria-label="Reset transposition"
              >
                <RotateCcw />
              </Button>
            </Tooltip>
          ) : null}
          {currentKey && onSaveSingingKey ? (
            <Button
              variant={singingKey === currentKey ? "secondary" : "ghost"}
              size="sm"
              onClick={() =>
                onSaveSingingKey(singingKey === currentKey ? null : currentKey)
              }
            >
              {singingKey === currentKey ? `Singing ${currentKey}` : "Save singing key"}
            </Button>
          ) : null}
          {singingKey && singingKey !== currentKey ? (
            <Badge tone="sage">saved {singingKey}</Badge>
          ) : null}
          {originalKey ? (
            <Badge tone="outline" className="hidden sm:inline-flex">
              original {originalKey}
            </Badge>
          ) : (
            <Tooltip label="No verified key is stored for this song, so ChordFlow shows the shift in semitones instead of guessing one.">
              <Badge tone="outline" className="hidden cursor-help sm:inline-flex">
                key unknown
              </Badge>
            </Tooltip>
          )}
        </div>

        {/* Capo */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium tracking-[0.1em] text-ink-faint uppercase">
            Capo
          </span>
          <select
            value={capo}
            onChange={(e) => onCapoChange(Number(e.target.value))}
            aria-label="Capo position"
            className="h-11 rounded-lg border border-line bg-surface-2 px-2 text-sm text-ink focus-visible:border-amber/60 focus-visible:ring-2 focus-visible:ring-amber/30 focus-visible:outline-none sm:h-8 sm:text-xs"
          >
            <option value={0}>None</option>
            {Array.from({ length: 9 }).map((_, i) => (
              <option key={i + 1} value={i + 1}>
                Fret {i + 1}
              </option>
            ))}
          </select>
          {capoSuggestions.length ? (
            <div className="hidden items-center gap-1 md:flex">
              {capoSuggestions.map((suggestion) => (
                <Tooltip
                  key={suggestion.capo}
                  label={`Shapes: ${suggestion.shapes.join(" ")} · ${suggestion.easyCount}/${suggestion.totalCount} open chords`}
                >
                  <button
                    type="button"
                    onClick={() => onCapoChange(suggestion.capo)}
                    className={cn(
                      "rounded-md border px-1.5 py-0.5 text-[11px] transition-colors",
                      capo === suggestion.capo
                        ? "border-amber/40 bg-amber/12 text-amber-soft"
                        : "border-line bg-surface-2 text-ink-faint hover:text-ink",
                    )}
                  >
                    <Sparkles className="mr-1 inline size-3" />
                    {suggestion.capo === 0 ? "open" : `${suggestion.capo}`}
                  </button>
                </Tooltip>
              ))}
            </div>
          ) : null}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <div className="flex items-center rounded-lg border border-line bg-surface-2">
            <Tooltip label="Smaller text">
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-r-none"
                onClick={() =>
                  onFontScaleChange(Math.max(0.8, Number((fontScale - 0.1).toFixed(2))))
                }
                aria-label="Decrease text size"
              >
                <Type className="size-3" />
              </Button>
            </Tooltip>
            <span className="px-1 text-[11px] tabular-nums text-ink-faint">
              {Math.round(fontScale * 100)}%
            </span>
            <Tooltip label="Larger text">
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-l-none"
                onClick={() =>
                  onFontScaleChange(Math.min(2.2, Number((fontScale + 0.1).toFixed(2))))
                }
                aria-label="Increase text size"
              >
                <ALargeSmall />
              </Button>
            </Tooltip>
          </div>

          <ToggleChip
            active={props.plainMode}
            onClick={() => props.onPlainModeChange(!props.plainMode)}
            icon={<LayoutList className="size-3.5" />}
            label="Plain"
          />
          <ToggleChip
            active={props.showPinyin}
            onClick={() => props.onShowPinyinChange(!props.showPinyin)}
            icon={<Languages className="size-3.5" />}
            label="Pinyin"
            disabled={!props.hasPinyin}
          />
          <ToggleChip
            active={props.showTranslation}
            onClick={() => props.onShowTranslationChange(!props.showTranslation)}
            icon={<Guitar className="size-3.5" />}
            label="English"
            disabled={!props.hasTranslation}
          />
          <ToggleChip
            active={preferFlats}
            onClick={() => props.onPreferFlatsChange(!preferFlats)}
            icon={<span className="text-sm leading-none">♭</span>}
            label="Flats"
          />
        </div>
      </div>
    </div>
  );
}
