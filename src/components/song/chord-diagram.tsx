"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  describeDiagram,
  diagramNotes,
  getChordDiagram,
  type ChordDiagram as Diagram,
} from "@/lib/music/diagrams";

/**
 * SVG fretboard diagram.
 *
 * Drawn left-to-right from the 6th (low E) string to the 1st, which is how
 * chord boxes are printed in songbooks. Every diagram carries an
 * `aria-label` describing the shape string by string.
 */

const STRINGS = 6;
const FRETS = 5;

export function ChordDiagramView({
  chord,
  size = "md",
  showNotes = false,
  className,
}: {
  chord: string;
  size?: "sm" | "md" | "lg";
  showNotes?: boolean;
  className?: string;
}) {
  const diagram = React.useMemo(() => getChordDiagram(chord), [chord]);
  if (!diagram) return null;

  const dims = {
    sm: { w: 56, h: 70, pad: 8, label: 9, dot: 4.2 },
    md: { w: 76, h: 94, pad: 10, label: 10, dot: 5.4 },
    lg: { w: 104, h: 128, pad: 12, label: 12, dot: 7 },
  }[size];

  const gridW = dims.w - dims.pad * 2;
  const gridH = dims.h - dims.pad * 2 - dims.label * 1.6;
  const stringGap = gridW / (STRINGS - 1);
  const fretGap = gridH / FRETS;
  const top = dims.pad + dims.label * 1.6;

  const { baseFret } = diagram;
  const relative = (fret: number) => fret - baseFret + 1;

  return (
    <figure className={cn("flex flex-col items-center gap-1", className)}>
      <svg
        viewBox={`0 0 ${dims.w} ${dims.h}`}
        width={dims.w}
        height={dims.h}
        role="img"
        aria-label={describeDiagram(diagram)}
        className="overflow-visible"
      >
        {/* Open / muted markers above the nut */}
        {diagram.frets.map((fret, i) => {
          const x = dims.pad + i * stringGap;
          const y = top - dims.label * 0.7;
          if (fret === -1) {
            const r = dims.dot * 0.55;
            return (
              <g key={`m${i}`} stroke="var(--color-ink-faint)" strokeWidth={1.1}>
                <line x1={x - r} y1={y - r} x2={x + r} y2={y + r} />
                <line x1={x - r} y1={y + r} x2={x + r} y2={y - r} />
              </g>
            );
          }
          if (fret === 0) {
            return (
              <circle
                key={`o${i}`}
                cx={x}
                cy={y}
                r={dims.dot * 0.55}
                fill="none"
                stroke="var(--color-ink-muted)"
                strokeWidth={1.1}
              />
            );
          }
          return null;
        })}

        {/* Nut (only at the first position) */}
        {baseFret === 1 ? (
          <rect
            x={dims.pad - 0.5}
            y={top - 2}
            width={gridW + 1}
            height={2.6}
            fill="var(--color-ink-muted)"
            rx={1}
          />
        ) : (
          <text
            x={dims.pad - 4}
            y={top + fretGap * 0.68}
            textAnchor="end"
            fontSize={dims.label * 0.85}
            fill="var(--color-ink-faint)"
            fontFamily="var(--font-mono)"
          >
            {baseFret}
          </text>
        )}

        {/* Frets */}
        {Array.from({ length: FRETS + 1 }).map((_, i) => (
          <line
            key={`f${i}`}
            x1={dims.pad}
            y1={top + i * fretGap}
            x2={dims.pad + gridW}
            y2={top + i * fretGap}
            stroke="var(--color-line-strong)"
            strokeWidth={0.8}
          />
        ))}

        {/* Strings */}
        {Array.from({ length: STRINGS }).map((_, i) => (
          <line
            key={`s${i}`}
            x1={dims.pad + i * stringGap}
            y1={top}
            x2={dims.pad + i * stringGap}
            y2={top + gridH}
            stroke="var(--color-line-strong)"
            strokeWidth={0.8}
          />
        ))}

        {/* Barres */}
        {diagram.barres.map((barre) => {
          const y = top + (relative(barre.fret) - 0.5) * fretGap;
          return (
            <rect
              key={`b${barre.fret}`}
              x={dims.pad + barre.from * stringGap - dims.dot}
              y={y - dims.dot * 0.72}
              width={(barre.to - barre.from) * stringGap + dims.dot * 2}
              height={dims.dot * 1.44}
              rx={dims.dot}
              fill="var(--color-amber)"
            />
          );
        })}

        {/* Finger dots */}
        {diagram.frets.map((fret, i) => {
          if (fret <= 0) return null;
          const inBarre = diagram.barres.some(
            (b) => b.fret === fret && i >= b.from && i <= b.to,
          );
          if (inBarre) return null;
          const x = dims.pad + i * stringGap;
          const y = top + (relative(fret) - 0.5) * fretGap;
          const finger = diagram.fingers[i];
          return (
            <g key={`d${i}`}>
              <circle cx={x} cy={y} r={dims.dot} fill="var(--color-amber)" />
              {finger && size !== "sm" ? (
                <text
                  x={x}
                  y={y + dims.dot * 0.62}
                  textAnchor="middle"
                  fontSize={dims.dot * 1.5}
                  fontWeight={700}
                  fill="var(--color-amber-ink)"
                  fontFamily="var(--font-sans)"
                >
                  {finger}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      <figcaption className="text-center">
        <span
          className={cn(
            "chord-token block leading-tight",
            size === "sm" ? "text-[11px]" : size === "lg" ? "text-base" : "text-xs",
          )}
        >
          {diagram.name}
        </span>
        {showNotes ? (
          <span className="block font-mono text-[10px] text-ink-faint">
            {diagramNotes(diagram).join(" ")}
          </span>
        ) : null}
        {diagram.approximated && size === "lg" ? (
          <span className="block text-[10px] text-ink-faint">
            simplified voicing
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}

export function ChordDiagramRow({
  chords,
  size = "md",
  activeChord,
  className,
}: {
  chords: string[];
  size?: "sm" | "md" | "lg";
  activeChord?: string | null;
  className?: string;
}) {
  const diagrams = React.useMemo(
    () =>
      chords
        .map((chord) => ({ chord, diagram: getChordDiagram(chord) }))
        .filter((entry): entry is { chord: string; diagram: Diagram } =>
          Boolean(entry.diagram),
        ),
    [chords],
  );

  if (diagrams.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-x-4 gap-y-3", className)}>
      {diagrams.map(({ chord }) => (
        <div
          key={chord}
          className={cn(
            "rounded-lg px-1.5 py-1 transition-colors",
            activeChord === chord ? "bg-amber/12 ring-1 ring-amber/30" : "",
          )}
        >
          <ChordDiagramView chord={chord} size={size} />
        </div>
      ))}
    </div>
  );
}
