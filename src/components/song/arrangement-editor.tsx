"use client";

import * as React from "react";
import { AlertTriangle, Eye, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Badge,
  Divider,
  Input,
  Label,
  SectionHeading,
  Textarea,
} from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { useLibrary } from "@/components/providers/library-provider";
import type {
  ArrangementStatus,
  ChordArrangement,
  Difficulty,
  LyricsRights,
  Song,
} from "@/lib/domain/types";
import { ARRANGEMENT_STATUS_META } from "@/lib/domain/types";
import { collectChords, invalidChords } from "@/lib/music/chordsheet";
import {
  CHORDS_ONLY_TEMPLATE,
  parseSheetText,
  preserveLineExtras,
  preserveSectionMeta,
  sectionsToSheetText,
} from "@/lib/music/sheet-text";
import { uniqueChords } from "@/lib/music/chords";
import { saveSheetEditFromArrangement } from "@/lib/storage/sheet-edits";
import { createId, errorMessage, nowIso } from "@/lib/utils";
import { ChordSheet } from "./chord-sheet";

/**
 * Manual arrangement editor.
 *
 * Everything the user types is their own content. ChordFlow stores how the
 * lyrics were obtained (`lyricsRights`) and how trustworthy the chords are
 * (`status`) so the practice screen can label them honestly.
 */

const COMMON_CHORDS = [
  "C", "G", "Am", "F", "Dm", "Em", "D", "A", "E", "Bm",
  "G7", "C7", "D7", "E7", "A7", "Cadd9", "Dsus4", "Asus2", "D/F#", "G/B",
];

const RIGHTS_OPTIONS: Array<{ value: LyricsRights; label: string }> = [
  { value: "user-provided", label: "Lyrics I have the right to use" },
  { value: "original-sample", label: "My own original words" },
  { value: "unavailable", label: "Chords only — no lyrics" },
];

const STATUS_OPTIONS: ArrangementStatus[] = ["user", "verified"];

export function ArrangementEditor({
  song,
  arrangement,
  onClose,
}: {
  song: Song;
  arrangement: ChordArrangement | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { saveArrangement, deleteArrangementsForSong } = useLibrary();

  const [sheet, setSheet] = React.useState(() =>
    arrangement && arrangement.sections.length
      ? sectionsToSheetText(arrangement.sections)
      : CHORDS_ONLY_TEMPLATE,
  );
  const [title, setTitle] = React.useState(arrangement?.title ?? "My arrangement");
  const [key, setKey] = React.useState(arrangement?.originalKey ?? "");
  const [capo, setCapo] = React.useState(arrangement?.capo ?? 0);
  const [bpm, setBpm] = React.useState<string>(
    arrangement?.bpm ? String(arrangement.bpm) : "",
  );
  const [timeSignature, setTimeSignature] = React.useState(
    arrangement?.timeSignature ?? "4/4",
  );
  const [tuningName, setTuningName] = React.useState(
    arrangement?.tuningName ?? "Standard",
  );
  const [difficulty, setDifficulty] = React.useState<Difficulty | "">(
    arrangement?.difficulty ?? "",
  );
  const [status, setStatus] = React.useState<ArrangementStatus>(
    arrangement?.status === "unavailable" ? "user" : (arrangement?.status ?? "user"),
  );
  const [rights, setRights] = React.useState<LyricsRights>(
    arrangement?.lyricsRights === "licensed-provider"
      ? "user-provided"
      : (arrangement?.lyricsRights ?? "unavailable"),
  );
  const [attribution, setAttribution] = React.useState(
    arrangement?.source.attribution ?? "",
  );
  const [sourceUrl, setSourceUrl] = React.useState(arrangement?.source.url ?? "");
  const [notes, setNotes] = React.useState(arrangement?.notes ?? "");
  const [showPreview, setShowPreview] = React.useState(false);
  const [desktopNote, setDesktopNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const draft = React.useMemo<ChordArrangement>(() => {
    const sections = preserveSectionMeta(
      preserveLineExtras(parseSheetText(sheet), arrangement?.sections ?? []),
      arrangement?.sections ?? [],
    );
    const timestamp = nowIso();
    return {
      id: arrangement?.id ?? createId("arr"),
      songId: song.id,
      title: title.trim() || "My arrangement",
      status,
      source: {
        kind: status === "ai-estimate" ? "ai" : "user",
        name: status === "ai-estimate" ? "AI estimate" : "Written in ChordFlow",
        url: sourceUrl.trim() || undefined,
        attribution: attribution.trim() || undefined,
      },
      originalKey: key.trim() || null,
      capo,
      tuning: arrangement?.tuning ?? ["E", "A", "D", "G", "B", "E"],
      tuningName: tuningName.trim() || "Standard",
      bpm: bpm.trim() ? Number(bpm) : null,
      timeSignature: timeSignature.trim() || "4/4",
      difficulty: difficulty || null,
      notes: notes.trim() || arrangement?.notes,
      form: arrangement?.form,
      miscNotes: arrangement?.miscNotes,
      lyricsRights: rights,
      lyricsAttribution: attribution.trim() || undefined,
      sections,
      createdAt: arrangement?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
  }, [
    arrangement,
    attribution,
    bpm,
    capo,
    difficulty,
    key,
    notes,
    rights,
    sheet,
    song.id,
    sourceUrl,
    status,
    timeSignature,
    title,
    tuningName,
  ]);

  const chords = React.useMemo(() => uniqueChords(collectChords(draft)), [draft]);
  const badChords = React.useMemo(() => invalidChords(draft), [draft]);
  const lineCount = draft.sections.reduce((sum, s) => sum + s.lines.length, 0);

  const insertChord = (chord: string) => {
    const element = textareaRef.current;
    if (!element) return;
    const start = element.selectionStart ?? sheet.length;
    const end = element.selectionEnd ?? start;
    const next = `${sheet.slice(0, start)}[${chord}]${sheet.slice(end)}`;
    setSheet(next);
    requestAnimationFrame(() => {
      element.focus();
      const caret = start + chord.length + 2;
      element.setSelectionRange(caret, caret);
    });
  };

  const onSave = async () => {
    if (draft.sections.length === 0) {
      toast({
        tone: "error",
        title: "Nothing to save",
        description: "Add at least one line of chords or lyrics.",
      });
      return;
    }
    setSaving(true);
    try {
      await saveArrangement(draft);
      saveSheetEditFromArrangement(song, draft, desktopNote);
      toast({
        tone: "success",
        title: "Saved on this phone",
        description: "A take-home markdown note is on the Edits page.",
      });
      onClose();
    } catch (error) {
      toast({
        tone: "error",
        title: "Could not save the arrangement",
        description: errorMessage(error),
      });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!arrangement) return;
    setSaving(true);
    try {
      await deleteArrangementsForSong(song.id);
      toast({ tone: "success", title: "Arrangement deleted" });
      onClose();
    } catch (error) {
      toast({ tone: "error", title: "Could not delete", description: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeading
        title={arrangement ? "Edit arrangement" : "New arrangement"}
        description={`${song.title} · ${song.artist}`}
        action={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X /> Close
            </Button>
            <Button variant="primary" size="sm" onClick={onSave} disabled={saving}>
              <Save /> {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="sheet">Chord sheet</Label>
              <div className="flex items-center gap-2 text-[11px] text-ink-faint">
                <span>{lineCount} lines</span>
                <span>·</span>
                <span>{chords.length} chords</span>
              </div>
            </div>
            <Textarea
              id="sheet"
              ref={textareaRef}
              value={sheet}
              onChange={(e) => setSheet(e.target.value)}
              spellCheck={false}
              rows={12}
              className="min-h-[16rem] font-mono text-[16px] leading-relaxed sm:text-[13px]"
            />
            <p className="text-xs text-ink-faint">
              <code className="text-amber-soft">[[Chorus]]</code> starts a section ·{" "}
              chords-only lines can be <code className="text-amber-soft">Am F C G</code>{" "}
              or <code className="text-amber-soft">[Am]</code> on a lyric character ·{" "}
              <code className="text-amber-soft">{"  // note"}</code> adds a performance
              note.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Insert a chord at the cursor</Label>
            <div className="flex flex-wrap gap-1">
              {COMMON_CHORDS.map((chord) => (
                <button
                  key={chord}
                  type="button"
                  onClick={() => insertChord(chord)}
                  className="rounded-md border border-line bg-surface-2 px-2 py-1 font-mono text-[11px] text-amber-soft transition-colors hover:border-amber/40 hover:bg-amber/10"
                >
                  {chord}
                </button>
              ))}
            </div>
          </div>

          {badChords.length ? (
            <div className="flex gap-2.5 rounded-lg border border-rose/35 bg-rose/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose" />
              <div>
                <p className="text-ink">
                  {badChords.length} symbol{badChords.length === 1 ? "" : "s"} could
                  not be read as a chord
                </p>
                <p className="mt-1 font-mono text-xs text-ink-muted">
                  {badChords.join("  ")}
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  They will still display, but transposition and diagrams will skip
                  them.
                </p>
              </div>
            </div>
          ) : null}

          <Divider />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="arr-title">Arrangement name</Label>
              <Input
                id="arr-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="arr-key">Key (leave blank if unverified)</Label>
              <Input
                id="arr-key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="G, Am, Bb…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="arr-capo">Capo</Label>
              <select
                id="arr-capo"
                value={capo}
                onChange={(e) => setCapo(Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm text-ink"
              >
                <option value={0}>None</option>
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Fret {i + 1}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="arr-bpm">Tempo (bpm)</Label>
              <Input
                id="arr-bpm"
                value={bpm}
                inputMode="numeric"
                onChange={(e) => setBpm(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="76"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="arr-time">Time signature</Label>
              <Input
                id="arr-time"
                value={timeSignature}
                onChange={(e) => setTimeSignature(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="arr-tuning">Tuning</Label>
              <Input
                id="arr-tuning"
                value={tuningName}
                onChange={(e) => setTuningName(e.target.value)}
                placeholder="Standard (E A D G B E)"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="arr-difficulty">Difficulty</Label>
              <select
                id="arr-difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty | "")}
                className="h-9 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm text-ink"
              >
                <option value="">Not rated</option>
                <option value="beginner">Beginner</option>
                <option value="easy">Easy</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="arr-status">Chord confidence</Label>
              <select
                id="arr-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ArrangementStatus)}
                className="h-9 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm text-ink"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {ARRANGEMENT_STATUS_META[option].label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-ink-faint">
                {ARRANGEMENT_STATUS_META[status].help}
              </p>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="arr-rights">Lyrics</Label>
              <select
                id="arr-rights"
                value={rights}
                onChange={(e) => setRights(e.target.value as LyricsRights)}
                className="h-9 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm text-ink"
              >
                {RIGHTS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-ink-faint">
                ChordFlow stores this with your arrangement. Only add lyrics you are
                allowed to use — it never fetches or generates them for you.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="arr-source">Source URL (optional)</Label>
              <Input
                id="arr-source"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="arr-attr">Attribution (optional)</Label>
              <Input
                id="arr-attr"
                value={attribution}
                onChange={(e) => setAttribution(e.target.value)}
                placeholder="Transcribed by…"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="arr-desktop">Note for desktop (optional)</Label>
              <Textarea
                id="arr-desktop"
                value={desktopNote}
                onChange={(e) => setDesktopNote(e.target.value)}
                rows={2}
                placeholder="What to change in the markdown later…"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="arr-notes">Song Details text</Label>
              <Textarea
                id="arr-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Key paragraph and other song-level notes…"
              />
            </div>
          </div>

          {arrangement ? (
            <>
              <Divider />
              <Button variant="danger" size="sm" onClick={onDelete} disabled={saving}>
                <Trash2 /> Delete this arrangement
              </Button>
            </>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button
              variant={showPreview ? "subtle" : "secondary"}
              size="sm"
              onClick={() => setShowPreview((value) => !value)}
            >
              <Eye /> {showPreview ? "Hide preview" : "Preview"}
            </Button>
          </div>

          {showPreview ? (
            <div className="panel max-h-[70dvh] overflow-y-auto p-4">
              {draft.sections.length === 0 ? (
                <p className="py-10 text-center text-sm text-ink-muted">
                  Your sheet will render here as you type.
                </p>
              ) : (
                <>
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    <Badge tone={ARRANGEMENT_STATUS_META[status].tone}>
                      {ARRANGEMENT_STATUS_META[status].label}
                    </Badge>
                    {key ? <Badge tone="outline">Key {key}</Badge> : null}
                    {capo ? <Badge tone="outline">Capo {capo}</Badge> : null}
                  </div>
                  <ChordSheet arrangement={draft} fontScale={0.92} />
                </>
              )}
            </div>
          ) : null}

          <div className="sticky bottom-20 z-20 flex gap-2 bg-canvas/95 py-3 lg:hidden">
            <Button variant="ghost" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => void onSave()}
              disabled={saving}
            >
              <Save /> {saving ? "Saving…" : "Save note"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
