import type { ArrangementSection, ChordArrangement, Song } from "@/lib/domain/types";

function titleLine(song: Song): string {
  if (song.titlePinyin && song.titleEn) {
    return `${song.title} (${song.titlePinyin} / ${song.titleEn})`;
  }
  if (song.titleEn && song.titleEn !== song.title) {
    return `${song.title} (${song.titleEn})`;
  }
  if (song.titlePinyin) return `${song.title} (${song.titlePinyin})`;
  return song.title;
}

function artistLine(song: Song): string {
  return song.artistZhHans
    ? `Artist: ${song.artist} (${song.artistZhHans})`
    : `Artist: ${song.artist}`;
}

function chordRow(section: ArrangementSection["lines"][number]): string {
  if (!section.chords.length) return "";
  return `\`${section.chords.map((event) => event.chord).join(" – ")}\``;
}

function sectionBlock(section: ArrangementSection): string {
  const heading = section.annotation
    ? `**${section.label ?? section.type}** ${section.annotation}`
    : `**${section.label ?? section.type}**`;
  const rows = section.lines.map(chordRow).filter(Boolean);
  const parts = [heading, "", ...rows];
  if (section.notes) parts.push("", section.notes);
  return parts.join("\n");
}

/** Rebuild a ChordDatabase-style markdown file from a saved sheet. */
export function arrangementToDatabaseMarkdown(
  song: Song,
  arrangement: ChordArrangement,
): string {
  const blocks = [
    titleLine(song),
    artistLine(song),
    "",
    arrangement.notes?.trim() ||
      (arrangement.originalKey
        ? `Key: ${arrangement.originalKey}${arrangement.timeSignature ? `, ${arrangement.timeSignature}` : ""}.`
        : ""),
    "",
    ...arrangement.sections.map((section) => `${sectionBlock(section)}\n`),
  ];

  if (arrangement.form?.trim()) {
    blocks.push("**Form**", "", arrangement.form.trim(), "");
  }
  if (arrangement.miscNotes?.trim()) {
    blocks.push(arrangement.miscNotes.trim(), "");
  }

  return blocks
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd()
    .concat("\n");
}

export function markdownFilenameForSong(song: Song): string {
  const slug = song.id.startsWith("db_") ? song.id.slice(3) : song.id;
  return `${slug}.md`;
}
