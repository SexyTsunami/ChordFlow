import { describe, expect, it } from "vitest";
import { parseSpotifyEmbedData, parseSpotifyEmbedHtml } from "./spotify-embed";

const entity = {
  props: {
    pageProps: {
      state: {
        data: {
          entity: {
            type: "playlist",
            name: "Practice set",
            subtitle: "Jay",
            coverArt: { sources: [{ url: "https://example.com/art.jpg" }] },
            trackList: [
              {
                uri: "spotify:track:abc123def456ghi7",
                title: "晴天",
                subtitle: "周杰倫",
                duration: 269000,
                isPlayable: true,
              },
              {
                uri: "spotify:track:xyz789xyz789xyz7",
                title: "稻香",
                subtitle: "周杰倫,\u00a0aNNA",
                duration: 223000,
                isPlayable: true,
              },
            ],
          },
        },
      },
    },
  },
};

describe("spotify embed page", () => {
  it("reads title, artist and id from the public embed JSON", () => {
    const parsed = parseSpotifyEmbedData(entity, "playlistid12345678");
    expect(parsed?.name).toBe("Practice set");
    expect(parsed?.owner).toBe("Jay");
    expect(parsed?.tracks).toHaveLength(2);
    expect(parsed?.tracks[0]).toMatchObject({
      title: "晴天",
      artist: "周杰倫",
      externalId: "abc123def456ghi7",
    });
    expect(parsed?.tracks[1].artist).toBe("周杰倫, aNNA");
    expect(parsed?.truncated).toBe(false);
  });

  it("parses the __NEXT_DATA__ script tag", () => {
    const html = `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(entity)}</script></html>`;
    const parsed = parseSpotifyEmbedHtml(html, "playlistid12345678");
    expect(parsed?.tracks[0].title).toBe("晴天");
  });
});
