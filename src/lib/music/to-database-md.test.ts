import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDatabaseMarkdown } from "./parse-database-md";
import { arrangementToDatabaseMarkdown, markdownFilenameForSong } from "./to-database-md";

describe("arrangementToDatabaseMarkdown", () => {
  it("rebuilds Brighter Than Sunshine with dashes, details, and form", () => {
    const markdown = readFileSync("ChordDatabase/brighter-than-sunshine.md", "utf8");
    const parsed = parseDatabaseMarkdown("brighter-than-sunshine", markdown);
    expect(parsed).toBeTruthy();
    const rebuilt = arrangementToDatabaseMarkdown(parsed!.song, parsed!.arrangement);
    expect(markdownFilenameForSong(parsed!.song)).toBe("brighter-than-sunshine.md");
    expect(rebuilt).toContain("Brighter Than Sunshine");
    expect(rebuilt).toContain("Artist: Aqualung");
    expect(rebuilt).toContain("Musicnotes");
    expect(rebuilt).toContain("`D – A – E – B`");
    expect(rebuilt).toContain("**Chorus**");
    expect(rebuilt).toContain("title lift");
    expect(rebuilt).toContain("**Form**");
    expect(rebuilt).toContain("Intro → Verse → Chorus");
  });
});
