import { describe, expect, it } from "vitest";
import {
  chordSequenceToInline,
  isChordSequenceLine,
  parseSheetText,
  sectionsFromChordEstimate,
  sectionsToSheetText,
} from "./sheet-text";

describe("chords-only sheet text", () => {
  it("treats space-separated symbols as a chord sequence", () => {
    expect(isChordSequenceLine("Am F C G")).toBe(true);
    expect(isChordSequenceLine("[Am] [F] [C] [G]")).toBe(true);
    expect(isChordSequenceLine("巷口的晚風")).toBe(false);
    expect(isChordSequenceLine("Am 晚風 F")).toBe(false);
  });

  it("parses a chords-only sheet into aligned sections", () => {
    const sections = parseSheetText(`[[Verse]]
Am F C G

[[Chorus]]
F C G Am`);
    expect(sections).toHaveLength(2);
    expect(sections[0].type).toBe("verse");
    expect(sections[0].lines[0].chords.map((c) => c.chord)).toEqual([
      "Am",
      "F",
      "C",
      "G",
    ]);
    expect(sections[1].type).toBe("chorus");
    expect(sections[1].lines[0].text.trim()).toBe("");
  });

  it("round-trips estimates as editable sequences", () => {
    const sections = sectionsFromChordEstimate([
      { type: "verse", label: "Verse", chords: ["Am", "F", "C", "G"] },
      { type: "chorus", label: "Chorus", chords: ["F", "C", "G", "Am"] },
    ]);
    const text = sectionsToSheetText(sections);
    expect(text).toContain("[[Verse]]");
    expect(text).toMatch(/Am\s+F\s+C\s+G/);
    expect(parseSheetText(text)[1].lines[0].chords.map((c) => c.chord)).toEqual([
      "F",
      "C",
      "G",
      "Am",
    ]);
  });

  it("drops tokens that are not chords when building an estimate", () => {
    const sections = sectionsFromChordEstimate([
      { type: "verse", chords: ["Am", "banana", "G"] },
    ]);
    expect(sections[0].lines[0].chords.map((c) => c.chord)).toEqual(["Am", "G"]);
    expect(chordSequenceToInline("Am G")).toBe("[Am]    [G]");
  });

  it("keeps bracketed and German H tokens from model output", () => {
    const sections = sectionsFromChordEstimate([
      { type: "verse", chords: ["[Am]", "H7", "C add9"] },
    ]);
    expect(sections[0].lines[0].chords.map((c) => c.chord)).toEqual([
      "Am",
      "B7",
      "Cadd9",
    ]);
  });
});
