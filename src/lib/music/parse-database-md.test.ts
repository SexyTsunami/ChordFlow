import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectChords, transposeArrangement } from "./chordsheet";
import { parseDatabaseMarkdown } from "./parse-database-md";

describe("parseDatabaseMarkdown", () => {
  it("parses Hey Jude sections, details, and F major", () => {
    const markdown = readFileSync("ChordDatabase/hey-jude.md", "utf8");
    const parsed = parseDatabaseMarkdown("hey-jude", markdown);
    expect(parsed?.song.title).toBe("Hey Jude");
    expect(parsed?.song.artist).toBe("The Beatles");
    expect(parsed?.song.originalKey).toBe("F");
    expect(parsed?.arrangement.notes).toMatch(/Hooktheory and Alan W\. Pollack/);
    expect(parsed?.arrangement.form).toBe(
      "Verse → Verse 2 → Bridge → Verse 3 → Bridge → Verse 4 → Outro",
    );
    expect(parsed?.arrangement.sections[0].type).toBe("verse");
    expect(parsed?.arrangement.sections[0].label).toBe("Verse");
    expect(parsed?.arrangement.sections[0].lines[0].chords.map((c) => c.chord)).toEqual([
      "F",
      "C",
      "C7",
      "F",
    ]);
    expect(parsed?.arrangement.sections[0].lines[1].chords.map((c) => c.chord)).toEqual([
      "Bb",
      "F",
      "C7",
      "F",
    ]);
    const bridge = parsed?.arrangement.sections.find((section) => section.label === "Bridge");
    expect(bridge?.notes).toMatch(/only new color/);
    const verse4 = parsed?.arrangement.sections.find((section) => section.label === "Verse 4");
    expect(verse4?.notes).toMatch(/straight into the coda/);
    const outro = parsed?.arrangement.sections.find((section) => section.label === "Outro");
    expect(outro?.notes).toMatch(/Mixolydian color/);
    const upTwo = transposeArrangement(parsed!.arrangement, 2);
    expect(collectChords(upTwo).slice(0, 4)).toEqual(["G", "D", "D7", "G"]);
  });

  it("keeps Brighter Than Sunshine prose and chorus details", () => {
    const markdown = readFileSync("ChordDatabase/brighter-than-sunshine.md", "utf8");
    const parsed = parseDatabaseMarkdown("brighter-than-sunshine", markdown);
    expect(parsed?.song.title).toBe("Brighter Than Sunshine");
    expect(parsed?.song.artist).toBe("Aqualung");
    expect(parsed?.arrangement.notes).toMatch(/Musicnotes’ original published key is A major/);
    expect(parsed?.arrangement.notes).toMatch(/Easy C-shape reprints/);
    expect(parsed?.arrangement.form).toMatch(
      /Intro → Verse → Chorus → Verse → Chorus → Bridge → Verse → Chorus → Outro/,
    );
    const intro = parsed?.arrangement.sections[0];
    expect(intro?.label).toBe("Intro");
    expect(intro?.lines[0].chords.map((c) => c.chord)).toEqual(["D", "A", "E", "B"]);
    const chorus = parsed?.arrangement.sections.find((section) => section.label === "Chorus");
    expect(chorus?.notes).toMatch(/title lift/);
    expect(chorus?.notes).toMatch(/beginner charts drop it/);
  });

  it("parses 童話 title, artist, song details, and F# key", () => {
    const markdown = readFileSync("ChordDatabase/tong-hua.md", "utf8");
    const parsed = parseDatabaseMarkdown("tong-hua", markdown);
    expect(parsed?.song.title).toBe("童話");
    expect(parsed?.song.titlePinyin).toBe("Tong Hua");
    expect(parsed?.song.artist).toBe("Michael Wong");
    expect(parsed?.song.originalKey).toBe("F#");
    expect(parsed?.arrangement.notes).toMatch(/capo 6/i);
    expect(parsed?.arrangement.sections[0].notes).toMatch(/Capo-6 charts/);
  });

  it("keeps header annotations such as (short)", () => {
    const markdown = readFileSync("ChordDatabase/the-reason.md", "utf8");
    const parsed = parseDatabaseMarkdown("the-reason", markdown);
    const verse3 = parsed?.arrangement.sections.find((section) => section.label === "Verse 3");
    expect(verse3?.annotation).toBe("(short)");
    const chorus2 = parsed?.arrangement.sections.find((section) => section.label === "Chorus 2");
    expect(chorus2?.notes).toMatch(/lands borrowed/);
  });

  it("parses every ChordDatabase markdown into a sheet and keeps its prose", () => {
    const names = readdirSync("ChordDatabase").filter((name) => name.endsWith(".md"));
    const failed: string[] = [];
    const missingProse: string[] = [];
    for (const name of names) {
      const markdown = readFileSync(`ChordDatabase/${name}`, "utf8");
      const parsed = parseDatabaseMarkdown(name.slice(0, -3), markdown);
      if (!parsed?.arrangement.sections.length) {
        failed.push(name);
        continue;
      }
      const stored = [
        parsed.arrangement.notes,
        parsed.arrangement.form,
        parsed.arrangement.miscNotes,
        ...parsed.arrangement.sections.flatMap((section) => [
          section.label,
          section.annotation,
          section.notes,
        ]),
      ]
        .filter(Boolean)
        .join("\n");
      const body = markdown.split(/\r?\n/).slice(2);
      for (const line of body) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (/^\*\*.+\*\*/.test(trimmed)) continue;
        if (/^(`[^`]+`\s*)+$/.test(trimmed)) continue;
        const snippet = trimmed.replace(/`/g, "").slice(0, 24);
        const haystack = stored.replace(/`/g, "");
        if (snippet && !haystack.includes(snippet)) {
          missingProse.push(`${name}: ${snippet}`);
          break;
        }
      }
    }
    expect(failed).toEqual([]);
    expect(missingProse).toEqual([]);
    expect(names.length).toBeGreaterThan(400);
  });
});
