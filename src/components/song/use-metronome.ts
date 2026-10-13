"use client";

import * as React from "react";

/**
 * Web Audio metronome.
 *
 * Clicks are synthesised, not sampled, so nothing copyrighted is played. Beats
 * are scheduled ahead of time against the audio clock (a `setInterval` alone
 * drifts badly), with the first beat of each bar accented.
 */

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.12;

export function useMetronome({
  bpm,
  beatsPerBar,
  enabled,
}: {
  bpm: number;
  beatsPerBar: number;
  enabled: boolean;
}) {
  const [beat, setBeat] = React.useState(0);
  const [unavailable, setUnavailable] = React.useState(false);

  const contextRef = React.useRef<AudioContext | null>(null);
  const nextNoteTimeRef = React.useRef(0);
  const beatRef = React.useRef(0);
  const bpmRef = React.useRef(bpm);
  const barRef = React.useRef(beatsPerBar);

  bpmRef.current = bpm;
  barRef.current = beatsPerBar;

  React.useEffect(() => {
    if (!enabled) {
      setBeat(0);
      beatRef.current = 0;
      return;
    }

    const AudioCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtor) {
      setUnavailable(true);
      return;
    }

    const context = contextRef.current ?? new AudioCtor();
    contextRef.current = context;
    void context.resume();

    nextNoteTimeRef.current = context.currentTime + 0.1;
    beatRef.current = 0;

    const click = (time: number, accent: boolean) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.frequency.value = accent ? 1480 : 920;
      osc.type = "square";
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(accent ? 0.5 : 0.28, time + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);
      osc.connect(gain).connect(context.destination);
      osc.start(time);
      osc.stop(time + 0.07);
    };

    const timer = window.setInterval(() => {
      while (nextNoteTimeRef.current < context.currentTime + SCHEDULE_AHEAD_S) {
        const current = beatRef.current % Math.max(1, barRef.current);
        click(nextNoteTimeRef.current, current === 0);
        const delay = (nextNoteTimeRef.current - context.currentTime) * 1000;
        window.setTimeout(() => setBeat(current), Math.max(0, delay));
        nextNoteTimeRef.current += 60 / Math.max(20, bpmRef.current);
        beatRef.current += 1;
      }
    }, LOOKAHEAD_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [enabled]);

  React.useEffect(() => {
    return () => {
      void contextRef.current?.close();
      contextRef.current = null;
    };
  }, []);

  return { beat, unavailable };
}
