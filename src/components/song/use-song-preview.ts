"use client";

import * as React from "react";
import type { ItunesPreview, ItunesSearchQuery } from "@/lib/itunes";

export type SongPreviewState = {
  loading: boolean;
  preview: ItunesPreview | null;
  playing: boolean;
  progress: number;
  toggle: () => void;
  stop: () => void;
};

export function useSongPreview(query: ItunesSearchQuery): SongPreviewState {
  const [loading, setLoading] = React.useState(true);
  const [preview, setPreview] = React.useState<ItunesPreview | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const stop = React.useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPlaying(false);
    setProgress(0);
  }, []);

  React.useEffect(() => {
    const params = new URLSearchParams({
      title: query.title,
      artist: query.artist,
    });
    if (query.titleEn) params.set("titleEn", query.titleEn);
    if (query.artistZh) params.set("artistZh", query.artistZh);

    let cancelled = false;
    setLoading(true);
    setPreview(null);
    stop();
    audioRef.current = null;

    void fetch(`/api/itunes/preview?${params.toString()}`)
      .then(async (response) => {
        const body = (await response.json()) as { preview?: ItunesPreview | null };
        if (!cancelled) setPreview(body.preview ?? null);
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [query.artist, query.artistZh, query.title, query.titleEn, stop]);

  const toggle = React.useCallback(() => {
    if (!preview?.previewUrl) return;
    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio(preview.previewUrl);
      audio.preload = "metadata";
      audio.setAttribute("playsinline", "true");
      audio.addEventListener("ended", () => {
        setPlaying(false);
        setProgress(0);
      });
      audio.addEventListener("timeupdate", () => {
        const current = audioRef.current;
        if (!current || !current.duration) return;
        setProgress(current.currentTime / current.duration);
      });
      audioRef.current = audio;
    }
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    void audio.play().then(
      () => setPlaying(true),
      () => setPlaying(false),
    );
  }, [playing, preview]);

  return { loading, preview, playing, progress, toggle, stop };
}
