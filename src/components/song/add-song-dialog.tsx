"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { useLibrary } from "@/components/providers/library-provider";
import type { Song } from "@/lib/domain/types";
import { createId, errorMessage, nowIso } from "@/lib/utils";

/** Add a song by hand. Only the title is required; everything else is optional. */
export function AddSongDialog({
  trigger,
  defaults,
}: {
  trigger: React.ReactNode;
  defaults?: Partial<Song>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { upsertSong } = useLibrary();

  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState(defaults?.title ?? "");
  const [artist, setArtist] = React.useState(defaults?.artist ?? "");
  const [titleEn, setTitleEn] = React.useState(defaults?.titleEn ?? "");
  const [pinyin, setPinyin] = React.useState(defaults?.titlePinyin ?? "");
  const [album, setAlbum] = React.useState(defaults?.album ?? "");
  const [year, setYear] = React.useState(
    defaults?.releaseYear ? String(defaults.releaseYear) : "",
  );
  const [busy, setBusy] = React.useState(false);

  const save = async () => {
    if (!title.trim()) {
      toast({ tone: "error", title: "A title is required" });
      return;
    }
    setBusy(true);
    const song: Song = {
      id: createId("song"),
      title: title.trim(),
      titleEn: titleEn.trim() || undefined,
      titlePinyin: pinyin.trim() || undefined,
      artist: artist.trim() || "Unknown artist",
      album: album.trim() || undefined,
      releaseYear: year.trim() ? Number(year) : undefined,
      originalKey: null,
      difficulty: null,
      arrangementStatus: "unavailable",
      tags: [],
      origin: "user",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    try {
      await upsertSong(song);
      toast({ tone: "success", title: `Added ${song.title}` });
      setOpen(false);
      setTitle("");
      setArtist("");
      setTitleEn("");
      setPinyin("");
      setAlbum("");
      setYear("");
      router.push(`/songs/${song.id}`);
    } catch (error) {
      toast({ tone: "error", title: "Could not save", description: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a song</DialogTitle>
          <DialogDescription>
            Metadata only — you can write the chord sheet afterwards.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="song-title">Title *</Label>
            <Input
              id="song-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="晴天"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="song-artist">Artist</Label>
            <Input
              id="song-artist"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="周杰倫"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="song-en">English title</Label>
            <Input
              id="song-en"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              placeholder="Sunny Day"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="song-pinyin">Pinyin</Label>
            <Input
              id="song-pinyin"
              value={pinyin}
              onChange={(e) => setPinyin(e.target.value)}
              placeholder="Qing Tian"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="song-album">Album</Label>
            <Input
              id="song-album"
              value={album}
              onChange={(e) => setAlbum(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="song-year">Year</Label>
            <Input
              id="song-year"
              value={year}
              inputMode="numeric"
              onChange={(e) => setYear(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={busy}>
            <Plus /> {busy ? "Saving…" : "Add song"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
