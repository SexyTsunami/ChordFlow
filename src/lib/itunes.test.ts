import { describe, expect, it } from "vitest";
import {
  itunesSearchTerms,
  pickItunesPreview,
  scoreItunesResult,
} from "./itunes";

const maple = {
  previewUrl: "https://audio-ssl.itunes.apple.com/preview/maple.m4a",
  trackName: "Maple",
  artistName: "Jay Chou",
  artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/100x100bb.jpg",
  trackViewUrl: "https://music.apple.com/tw/album/maple/123",
};

describe("pickItunesPreview", () => {
  it("prefers an English title match for a Chinese songbook entry", () => {
    const picked = pickItunesPreview(
      [
        {
          previewUrl: "https://example.com/wrong.m4a",
          trackName: "Sunny Day",
          artistName: "Jay Chou",
        },
        maple,
      ],
      { title: "楓", artist: "Jay Chou", titleEn: "Maple", artistZh: "周杰倫" },
    );
    expect(picked?.trackName).toBe("Maple");
    expect(picked?.previewUrl).toContain("maple.m4a");
    expect(picked?.artworkUrl).toContain("200x200bb");
  });

  it("ignores results with no preview and weak title overlap", () => {
    const picked = pickItunesPreview(
      [
        { trackName: "Unrelated Hit", artistName: "Someone Else" },
        {
          previewUrl: "https://example.com/other.m4a",
          trackName: "Totally Different Song",
          artistName: "Jay Chou",
        },
      ],
      { title: "楓", artist: "Jay Chou", titleEn: "Maple" },
    );
    expect(picked).toBeNull();
  });
});

describe("scoreItunesResult", () => {
  it("scores exact title plus artist higher than a loose title hit", () => {
    const exact = scoreItunesResult(
      { trackName: "Maple", artistName: "Jay Chou" },
      { title: "楓", artist: "Jay Chou", titleEn: "Maple" },
    );
    const loose = scoreItunesResult(
      { trackName: "Maple Leaf Rag", artistName: "Someone" },
      { title: "楓", artist: "Jay Chou", titleEn: "Maple" },
    );
    expect(exact).toBeGreaterThan(loose);
    expect(exact).toBeGreaterThanOrEqual(12);
  });
});

describe("itunesSearchTerms", () => {
  it("tries native and English titles without duplicating", () => {
    expect(
      itunesSearchTerms({
        title: "楓",
        artist: "Jay Chou",
        titleEn: "Maple",
        artistZh: "周杰倫",
      }),
    ).toEqual(["楓 周杰倫", "楓 Jay Chou", "Maple Jay Chou"]);
  });
});
