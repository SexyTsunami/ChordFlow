"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  FileSpreadsheet,
  Link2,
  ListPlus,
  Loader2,
  Upload,
} from "lucide-react";
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
import { Badge, Input, Label, Textarea } from "@/components/ui/primitives";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/controls";
import { useToast } from "@/components/ui/toast";
import { useLibrary } from "@/components/providers/library-provider";
import { useProviderStatus } from "@/components/providers/use-provider-status";
import type { Playlist, PlaylistSource } from "@/lib/domain/types";
import { normalizeTracks, type RawTrackInput } from "@/lib/import/normalize";
import { detectProvider, parsePlaylistUrl } from "@/lib/import/parse-url";
import { CSV_TEMPLATE, parseTrackList, parseTracksCsv } from "@/lib/import/text";
import { createId, errorMessage, nowIso } from "@/lib/utils";

type ImportApiResponse = {
  ok: boolean;
  playlist?: {
    name: string;
    description?: string;
    owner?: string;
    imageUrl?: string;
    externalId: string;
    externalUrl: string;
    tracks: RawTrackInput[];
    warnings: string[];
    attribution: string;
  };
  error?: { code: string; message: string; hint?: string };
};

export function ImportDialog({ trigger }: { trigger: React.ReactNode }) {
  const router = useRouter();
  const { toast } = useToast();
  const { songs, savePlaylist } = useLibrary();
  const providers = useProviderStatus();

  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState("link");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<{ message: string; hint?: string } | null>(
    null,
  );

  const [url, setUrl] = React.useState("");
  const [listText, setListText] = React.useState("");
  const [listName, setListName] = React.useState("");
  const [listOrder, setListOrder] = React.useState<"title-first" | "artist-first">(
    "title-first",
  );
  const [csvText, setCsvText] = React.useState("");
  const [csvName, setCsvName] = React.useState("");

  const provider = detectProvider(url);
  const urlCheck = url.trim() ? parsePlaylistUrl(url) : null;

  const reset = () => {
    setUrl("");
    setListText("");
    setListName("");
    setCsvText("");
    setCsvName("");
    setError(null);
    setBusy(false);
  };

  const commit = React.useCallback(
    async (input: {
      name: string;
      source: PlaylistSource;
      sourceUrl?: string;
      externalId?: string;
      owner?: string;
      imageUrl?: string;
      description?: string;
      raw: RawTrackInput[];
      splitTitles: boolean;
      warnings: string[];
    }) => {
      const { tracks, duplicatesRemoved } = normalizeTracks(input.raw, {
        library: songs,
        splitTitles: input.splitTitles,
      });

      if (tracks.length === 0) {
        setError({
          message: "No usable tracks were found.",
          hint: "Check the format and try again — ChordFlow did not save anything.",
        });
        return;
      }

      const timestamp = nowIso();
      const playlist: Playlist = {
        id: createId("pl"),
        name: input.name.trim() || "Imported playlist",
        description: input.description,
        source: input.source,
        sourceUrl: input.sourceUrl,
        externalId: input.externalId,
        owner: input.owner,
        imageUrl: input.imageUrl,
        trackCount: tracks.length,
        tracks,
        duplicatesRemoved,
        importWarnings: input.warnings,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      await savePlaylist(playlist);
      toast({
        tone: "success",
        title: `Imported ${tracks.length} track${tracks.length === 1 ? "" : "s"}`,
        description: duplicatesRemoved
          ? `${duplicatesRemoved} duplicate${duplicatesRemoved === 1 ? "" : "s"} removed.`
          : undefined,
      });
      setOpen(false);
      reset();
      router.push(`/playlists/${playlist.id}`);
    },
    [router, savePlaylist, songs, toast],
  );

  const importFromUrl = async () => {
    setError(null);
    const parsed = parsePlaylistUrl(url);
    if (!parsed.ok) {
      setError({ message: parsed.reason });
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/import/playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const json = (await response.json()) as ImportApiResponse;

      if (!response.ok || !json.ok || !json.playlist) {
        setError({
          message: json.error?.message ?? `Import failed (HTTP ${response.status}).`,
          hint: json.error?.hint,
        });
        return;
      }

      await commit({
        name: json.playlist.name,
        description: json.playlist.description,
        source: parsed.provider,
        sourceUrl: json.playlist.externalUrl,
        externalId: json.playlist.externalId,
        owner: json.playlist.owner,
        imageUrl: json.playlist.imageUrl,
        raw: json.playlist.tracks,
        // YouTube titles are free text and need an artist/title split.
        splitTitles: parsed.provider === "youtube",
        warnings: json.playlist.warnings,
      });
    } catch (caught) {
      setError({ message: errorMessage(caught, "Could not reach the import service.") });
    } finally {
      setBusy(false);
    }
  };

  const importFromList = async () => {
    setError(null);
    const raw = parseTrackList(listText, listOrder);
    if (raw.length === 0) {
      setError({ message: "Add at least one song, one per line." });
      return;
    }
    setBusy(true);
    try {
      await commit({
        name: listName || "Pasted track list",
        source: "manual",
        raw,
        splitTitles: false,
        warnings: [],
      });
    } finally {
      setBusy(false);
    }
  };

  const importFromCsv = async () => {
    setError(null);
    const { tracks, warnings } = parseTracksCsv(csvText);
    if (tracks.length === 0) {
      setError({
        message: "No rows could be read from that CSV.",
        hint: warnings[0],
      });
      return;
    }
    setBusy(true);
    try {
      await commit({
        name: csvName || "CSV import",
        source: "csv",
        raw: tracks,
        splitTitles: false,
        warnings,
      });
    } finally {
      setBusy(false);
    }
  };

  const onCsvFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    if (!csvName) setCsvName(file.name.replace(/\.csv$/i, ""));
  };

  const providerReady =
    provider === "spotify"
      ? providers.status?.spotify
      : provider === "youtube"
        ? providers.status?.youtube
        : undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import a playlist</DialogTitle>
          <DialogDescription>
            Paste a Spotify or YouTube link, a plain track list, or a CSV.
            After import, estimate chords for the whole list in one click.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="link" className="flex-1">
                <Link2 /> Link
              </TabsTrigger>
              <TabsTrigger value="list" className="flex-1">
                <ListPlus /> Track list
              </TabsTrigger>
              <TabsTrigger value="csv" className="flex-1">
                <FileSpreadsheet /> CSV
              </TabsTrigger>
            </TabsList>

            <TabsContent value="link" className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="import-url">Playlist URL</Label>
                <Input
                  id="import-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://open.spotify.com/playlist/… or https://www.youtube.com/playlist?list=…"
                  spellCheck={false}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {provider ? (
                  <Badge tone={urlCheck?.ok ? "sage" : "rose"}>
                    {provider === "spotify" ? "Spotify" : "YouTube"} link
                  </Badge>
                ) : null}
                {provider && providerReady === false ? (
                  <span className="text-ink-muted">
                    {provider === "spotify"
                      ? "No official Spotify keys — the public playlist page will be used (first ~50–100 tracks)."
                      : "No YouTube API key — the public playlist page will be tried first."}
                  </span>
                ) : null}
                {urlCheck && !urlCheck.ok ? (
                  <span className="text-rose">{urlCheck.reason}</span>
                ) : null}
              </div>

              <div className="rounded-lg border border-line bg-surface-2/60 p-3 text-xs leading-relaxed text-ink-muted">
                A pasted link reads the public playlist page for titles and
                artists — never audio, never chords. Official API keys are
                optional and only help with longer or private lists. After
                import, tap Estimate chords.
              </div>
            </TabsContent>

            <TabsContent value="list" className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="list-name">Playlist name</Label>
                  <Input
                    id="list-name"
                    value={listName}
                    onChange={(e) => setListName(e.target.value)}
                    placeholder="Saturday practice set"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="list-order">Line format</Label>
                  <select
                    id="list-order"
                    value={listOrder}
                    onChange={(e) =>
                      setListOrder(e.target.value as "title-first" | "artist-first")
                    }
                    className="h-9 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm text-ink focus-visible:border-amber/60 focus-visible:ring-2 focus-visible:ring-amber/30 focus-visible:outline-none"
                  >
                    <option value="title-first">Title – Artist</option>
                    <option value="artist-first">Artist – Title</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="list-text">One song per line</Label>
                <Textarea
                  id="list-text"
                  value={listText}
                  onChange={(e) => setListText(e.target.value)}
                  rows={9}
                  spellCheck={false}
                  className="font-mono text-[13px]"
                  placeholder={"晴天 - 周杰倫\n告白氣球 - 周杰倫\nMojito - 周杰倫\nWonderwall by Oasis"}
                />
                <p className="text-xs text-ink-faint">
                  Numbered lists and bullets are stripped automatically. “Title by
                  Artist” also works.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="csv" className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="csv-name">Playlist name</Label>
                <Input
                  id="csv-name"
                  value={csvName}
                  onChange={(e) => setCsvName(e.target.value)}
                  placeholder="Exported playlist"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="csv-file">CSV file</Label>
                <input
                  id="csv-file"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={onCsvFile}
                  className="block w-full cursor-pointer rounded-lg border border-line bg-surface-2 text-sm text-ink-muted file:mr-3 file:cursor-pointer file:border-0 file:bg-surface-3 file:px-3 file:py-2 file:text-sm file:text-ink"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="csv-text">…or paste CSV</Label>
                <Textarea
                  id="csv-text"
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  rows={7}
                  spellCheck={false}
                  className="font-mono text-[13px]"
                  placeholder={CSV_TEMPLATE}
                />
                <p className="text-xs text-ink-faint">
                  Recognised columns: title, artist, album, source_url. Without a
                  header row the first two columns are used.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {error ? (
            <div
              role="alert"
              className="mt-4 flex gap-2.5 rounded-lg border border-rose/35 bg-rose/10 p-3 text-sm"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose" />
              <div>
                <p className="text-ink">{error.message}</p>
                {error.hint ? (
                  <p className="mt-1 text-xs text-ink-muted">{error.hint}</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={busy}
            onClick={
              tab === "link"
                ? importFromUrl
                : tab === "list"
                  ? importFromList
                  : importFromCsv
            }
          >
            {busy ? <Loader2 className="animate-spin" /> : <Upload />}
            {busy ? "Importing…" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
