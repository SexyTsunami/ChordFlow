"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  FilePlus2,
  Guitar,
  Info,
  Music2,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import {
  ARRANGEMENT_STATUS_META,
  SECTION_LABELS,
  type ChordArrangement,
  type Song,
} from "@/lib/domain/types";
import {
  bestArrangement,
  useLibrary,
} from "@/components/providers/library-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Badge,
  EmptyState,
  SectionHeading,
  Skeleton,
} from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { semitonesBetween, uniqueChords } from "@/lib/music/chords";
import { arrangementForPlay, collectChords, transposeArrangement } from "@/lib/music/chordsheet";
import {
  arrangementSearchLinks,
  lyricsSearchLinks,
} from "@/lib/reference-links";
import { createId, errorMessage, nowIso } from "@/lib/utils";
import { ArrangementEditor } from "./arrangement-editor";
import { ChordDiagramRow } from "./chord-diagram";
import { ChordSheet, sectionAnchorId } from "./chord-sheet";
import { PracticeDock } from "./practice-dock";
import { FavoriteButton } from "./song-list";
import { SongPreviewButton, SongPreviewCaption } from "./song-preview-button";
import { SongToolbar } from "./song-toolbar";
import { useScrollProgress } from "./use-autoscroll";
import { useSongPreview } from "./use-song-preview";

export function SongPracticeView({ songId }: { songId: string }) {
  const library = useLibrary();
  const song = library.songsById.get(songId);
  const arrangements = library.arrangementsForSong(songId);

  if (!library.ready) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!song) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 lg:px-6">
        <EmptyState
          icon={<Music2 className="size-5" />}
          title="Song not found"
          description="It may have been removed, or this link is from another library."
          action={
            <Button variant="secondary" asChild>
              <Link href="/library">Back to all songs</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <SongWorkspace
      song={song}
      arrangements={arrangements}
    />
  );
}

function SongWorkspace({
  song,
  arrangements,
}: {
  song: Song;
  arrangements: ChordArrangement[];
}) {
  const { toast } = useToast();
  const {
    ready,
    preferences,
    practiceSessions,
    recordOpen,
    updatePreferences,
    savePracticeSession,
    deleteArrangementsForSong,
    setFavoriteKey,
  } = useLibrary();

  const [editing, setEditing] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [transpose, setTranspose] = React.useState(0);
  const [capo, setCapo] = React.useState(0);
  const [showTranslation, setShowTranslation] = React.useState(false);
  const [activeChord, setActiveChord] = React.useState<string | null>(null);
  const [metronomeOn, setMetronomeOn] = React.useState(false);
  const [loopSectionId, setLoopSectionId] = React.useState<string | null>(null);
  const [beatsPerBar, setBeatsPerBar] = React.useState(4);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const recordedRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!ready) return;
    if (recordedRef.current === song.id) return;
    recordedRef.current = song.id;
    void recordOpen(song.id);
  }, [ready, recordOpen, song.id]);

  const arrangement =
    arrangements.find((item) => item.id === selectedId) ??
    bestArrangement(arrangements);

  React.useEffect(() => {
    if (arrangement && !selectedId) setSelectedId(arrangement.id);
  }, [arrangement, selectedId]);

  React.useEffect(() => {
    const written = arrangement?.originalKey ?? song.originalKey ?? null;
    const saved = preferences.favoriteKeys?.[song.id];
    const delta =
      written && saved ? semitonesBetween(written, saved) : null;
    setTranspose(delta ?? 0);
    setCapo(arrangement?.capo ?? 0);
    setActiveChord(null);
    setLoopSectionId(null);
    if (arrangement?.timeSignature?.startsWith("3")) setBeatsPerBar(3);
    else if (arrangement?.timeSignature?.startsWith("6")) setBeatsPerBar(6);
    else setBeatsPerBar(4);
  }, [arrangement?.capo, arrangement?.id, arrangement?.timeSignature, song.id]);

  const sounding = React.useMemo(() => {
    if (!arrangement) return null;
    return transposeArrangement(arrangement, transpose, {
      preferFlats: preferences.preferFlats,
    });
  }, [arrangement, preferences.preferFlats, transpose]);

  const viewed = React.useMemo(() => {
    if (!arrangement) return null;
    return arrangementForPlay(arrangement, transpose, capo, {
      preferFlats: preferences.preferFlats,
    });
  }, [arrangement, capo, preferences.preferFlats, transpose]);

  const soundingChords = React.useMemo(
    () => (sounding ? uniqueChords(collectChords(sounding)) : []),
    [sounding],
  );
  const diagramChords = React.useMemo(
    () => (viewed ? uniqueChords(collectChords(viewed)) : []),
    [viewed],
  );
  const diagramActive = activeChord;

  const hasPinyin = Boolean(
    viewed?.sections.some((section) => section.lines.some((line) => line.pinyin)),
  );
  const hasTranslation = Boolean(
    viewed?.sections.some((section) =>
      section.lines.some((line) => line.translation),
    ),
  );

  const progress = useScrollProgress();
  const preview = useSongPreview({
    title: song.title,
    artist: song.artist,
    titleEn: song.titleEn,
    artistZh: song.artistZhHans,
  });

  React.useEffect(() => {
    if (preview.playing) setMetronomeOn(false);
  }, [preview.playing]);

  const practicedToday = React.useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return practiceSessions.some(
      (session) =>
        session.songId === song.id &&
        session.completed &&
        new Date(session.startedAt).getTime() >= start.getTime(),
    );
  }, [practiceSessions, song.id]);

  const startEditor = (target: ChordArrangement | null) => {
    setEditingId(target?.id ?? null);
    setEditing(true);
    preview.stop();
    setMetronomeOn(false);
  };

  const removeArrangement = async () => {
    if (!arrangement) return;
    setDeleting(true);
    try {
      await deleteArrangementsForSong(song.id);
      setSelectedId(null);
      setConfirmDelete(false);
      toast({ tone: "success", title: "Arrangement deleted" });
    } catch (error) {
      toast({
        tone: "error",
        title: "Could not delete",
        description: errorMessage(error),
      });
    } finally {
      setDeleting(false);
    }
  };

  const markPracticed = async () => {
    try {
      await savePracticeSession({
        id: createId("practice"),
        songId: song.id,
        arrangementId: arrangement?.id ?? null,
        startedAt: nowIso(),
        durationSeconds: 0,
        bpm: preferences.metronomeBpm,
        transpose,
        capo,
        completed: true,
      });
      toast({ tone: "success", title: "Marked as practised" });
    } catch (error) {
      toast({
        tone: "error",
        title: "Could not save practice",
        description: errorMessage(error),
      });
    }
  };

  if (editing) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-6 lg:py-8">
        <ArrangementEditor
          song={song}
          arrangement={
            arrangements.find((item) => item.id === editingId) ?? null
          }
          onClose={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-5 pb-44 lg:px-6 lg:pt-6">
      <Link
        href="/collection"
        className="mb-3 inline-flex items-center gap-1.5 text-xs text-ink-faint transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-3.5" /> Back to collection
      </Link>

      <header className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              {song.title}
            </h1>
            <FavoriteButton songId={song.id} />
            <SongPreviewButton preview={preview} compact />
          </div>
          <p className="mt-0.5 text-sm text-ink-muted">
            {song.artist}
            {song.titleEn && song.titleEn !== song.title ? ` · ${song.titleEn}` : ""}
            {song.titlePinyin ? ` · ${song.titlePinyin}` : ""}
          </p>
          <SongPreviewCaption preview={preview} />
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {song.album ? <Badge tone="outline">{song.album}</Badge> : null}
            {song.releaseYear ? (
              <Badge tone="outline">{song.releaseYear}</Badge>
            ) : null}
            {arrangement && arrangement.status !== "user" ? (
              <Badge tone={ARRANGEMENT_STATUS_META[arrangement.status].tone}>
                {ARRANGEMENT_STATUS_META[arrangement.status].label}
              </Badge>
            ) : null}
            {arrangement?.lyricsRights === "original-sample" ? (
              <Badge tone="sage">Original sample lyrics</Badge>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {arrangements.length > 1 ? (
            <select
              value={arrangement?.id ?? ""}
              onChange={(event) => setSelectedId(event.target.value || null)}
              aria-label="Choose arrangement"
              className="h-9 rounded-lg border border-line bg-surface-2 px-2 text-xs text-ink"
            >
              {arrangements.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          ) : null}
          {arrangement ? (
            <Button
              variant="primary"
              className="min-h-11 sm:min-h-8"
              size="sm"
              onClick={() => startEditor(arrangement)}
            >
              <Pencil /> Edit sheet
            </Button>
          ) : null}
          {arrangement ? (
            <Button
              variant="danger"
              className="min-h-11 sm:min-h-8"
              size="sm"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 /> Delete
            </Button>
          ) : null}
          <Button
            variant="secondary"
            className="hidden min-h-11 sm:inline-flex sm:min-h-8"
            size="sm"
            onClick={() => startEditor(null)}
          >
            <FilePlus2 /> {arrangement ? "New sheet" : "Create arrangement"}
          </Button>
        </div>
      </header>

      {sounding ? (
        <>
          <SongToolbar
            originalKey={arrangement?.originalKey ?? song.originalKey ?? null}
            transpose={transpose}
            onTransposeChange={setTranspose}
            singingKey={preferences.favoriteKeys?.[song.id] ?? null}
            onSaveSingingKey={(key) => {
              void setFavoriteKey(song.id, key);
              toast({
                tone: "success",
                title: key ? `Singing key saved: ${key}` : "Singing key cleared",
              });
            }}
            capo={capo}
            onCapoChange={setCapo}
            chords={soundingChords}
            preferFlats={preferences.preferFlats}
            onPreferFlatsChange={(value) =>
              void updatePreferences({ preferFlats: value })
            }
            fontScale={preferences.fontScale}
            onFontScaleChange={(value) =>
              void updatePreferences({ fontScale: value })
            }
            plainMode={preferences.plainMode}
            onPlainModeChange={(value) =>
              void updatePreferences({ plainMode: value })
            }
            showPinyin={preferences.showPinyin}
            onShowPinyinChange={(value) =>
              void updatePreferences({ showPinyin: value })
            }
            showTranslation={showTranslation}
            onShowTranslationChange={setShowTranslation}
            hasPinyin={hasPinyin}
            hasTranslation={hasTranslation}
          />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0">
              {arrangement?.source.attribution ? (
                <p className="mb-4 text-xs text-ink-faint">
                  {arrangement.source.attribution}
                  {arrangement.source.url ? (
                    <>
                      {" · "}
                      <a
                        href={arrangement.source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-soft underline-offset-2 hover:underline"
                      >
                        source
                      </a>
                    </>
                  ) : null}
                </p>
              ) : null}

              <ChordSheet
                arrangement={sounding}
                fontScale={preferences.fontScale}
                showPinyin={preferences.showPinyin}
                showTranslation={showTranslation}
                plainMode={preferences.plainMode}
                activeChord={activeChord}
                onChordSelect={setActiveChord}
                loopSectionId={loopSectionId}
              />
            </div>

            <aside className="hidden xl:block">
              <div className="sticky top-28 space-y-4">
                {preferences.showChordDiagrams && diagramChords.length ? (
                  <div className="panel p-4">
                    <h2 className="mb-3 flex items-center gap-1.5 text-xs font-medium tracking-[0.12em] text-ink-faint uppercase">
                      <Guitar className="size-3.5" />
                      {capo > 0 ? `Shapes · capo ${capo}` : "Chord diagrams"}
                    </h2>
                    <ChordDiagramRow
                      chords={diagramChords}
                      size="sm"
                      activeChord={diagramActive}
                    />
                    {capo > 0 ? (
                      <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
                        Sheet shows sounding chords. Diagrams are the shapes you
                        finger with the capo on fret {capo}.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="panel space-y-2 p-4 text-sm">
                  <h2 className="flex items-center gap-1.5 text-xs font-medium tracking-[0.12em] text-ink-faint uppercase">
                    <Info className="size-3.5" /> Song
                  </h2>
                  <MetaRow
                    label="Tuning"
                    value={arrangement?.tuningName ?? "Standard"}
                  />
                  <MetaRow
                    label="Written key"
                    value={arrangement?.originalKey ?? "Not verified"}
                  />
                  <MetaRow
                    label="Tempo"
                    value={
                      arrangement?.bpm ? `${arrangement.bpm} bpm` : "Not set"
                    }
                  />
                </div>

                {sounding.sections.length > 1 ? (
                  <nav className="panel p-3" aria-label="Sections">
                    <p className="mb-2 px-1 text-[10px] font-medium tracking-[0.12em] text-ink-faint uppercase">
                      Jump
                    </p>
                    <ul className="space-y-0.5">
                      {sounding.sections.map((section) => (
                        <li key={section.id}>
                          <a
                            href={`#${sectionAnchorId(section.id)}`}
                            className="block rounded-md px-2 py-1.5 text-xs text-ink-muted hover:bg-surface-2 hover:text-ink"
                          >
                            {section.label ?? SECTION_LABELS[section.type]}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                ) : null}
              </div>
            </aside>
          </div>

          {preferences.showChordDiagrams && diagramChords.length ? (
            <div className="panel mt-6 p-4 xl:hidden">
              <h2 className="mb-3 text-xs font-medium tracking-[0.12em] text-ink-faint uppercase">
                {capo > 0 ? `Shapes · capo ${capo}` : "Chord diagrams"}
              </h2>
              <ChordDiagramRow
                chords={diagramChords}
                size="sm"
                activeChord={diagramActive}
              />
            </div>
          ) : null}

          <PracticeDock
            preview={preview}
            onResetScroll={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            metronomeOn={metronomeOn}
            onMetronomeChange={setMetronomeOn}
            bpm={preferences.metronomeBpm}
            onBpmChange={(value) =>
              void updatePreferences({ metronomeBpm: value })
            }
            beatsPerBar={beatsPerBar}
            onBeatsPerBarChange={setBeatsPerBar}
            sections={sounding.sections}
            loopSectionId={loopSectionId}
            onLoopSectionChange={(sectionId) => {
              setLoopSectionId(sectionId);
              if (sectionId) {
                document
                  .getElementById(sectionAnchorId(sectionId))
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }}
            onMarkPracticed={() => void markPracticed()}
            practicedToday={practicedToday}
            progress={progress}
          />
        </>
      ) : (
        <MissingArrangement
          song={song}
          onCreate={() => startEditor(null)}
        />
      )}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this arrangement?</DialogTitle>
            <DialogDescription>
              Every chord sheet for {song.title} will be removed. The song
              itself stays in your library.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-ink-muted">
              You can write a new sheet afterwards.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => void removeArrangement()}
              disabled={deleting}
            >
              <Trash2 /> {deleting ? "Deleting…" : "Delete sheet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="text-ink-faint">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}

function MissingArrangement({
  song,
  onCreate,
}: {
  song: Song;
  onCreate: () => void;
}) {
  const arrangementLinks = arrangementSearchLinks(song.title, song.artist);
  const lyricLinks = lyricsSearchLinks(song.title, song.artist);

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      <div className="panel p-5">
        <SectionHeading
          title="No chord sheet yet"
          description="Write a sheet here. Saving it also makes a take-home markdown note for your desktop ChordDatabase folder."
        />
        <Button variant="primary" className="mt-2 w-full sm:w-auto" onClick={onCreate}>
          <FilePlus2 /> Write a sheet
        </Button>
      </div>

      <div className="space-y-4">
        <div className="panel p-5">
          <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Search className="size-4 text-amber" /> Find an arrangement
          </h2>
          <p className="mb-3 text-xs leading-relaxed text-ink-muted">
            These open licensed or official search pages. Transcribe what you
            find into your own sheet — don&apos;t copy a full tab into the app
            unless you have the right to use it.
          </p>
          <ul className="space-y-1.5">
            {arrangementLinks.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink transition-colors hover:border-amber/35"
                >
                  {link.label}
                  <ExternalLink className="size-3.5 text-ink-faint" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel p-5">
          <h2 className="mb-1 text-sm font-semibold text-ink">
            Read lyrics elsewhere
          </h2>
          <p className="mb-3 text-xs leading-relaxed text-ink-muted">
            No licensed lyrics provider is configured, so the words are not
            shown here.
          </p>
          <ul className="space-y-1.5">
            {lyricLinks.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink transition-colors hover:border-amber/35"
                >
                  {link.label}
                  <ExternalLink className="size-3.5 text-ink-faint" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
