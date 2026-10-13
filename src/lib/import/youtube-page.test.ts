import { describe, expect, it } from "vitest";
import { parseYouTubePlaylistHtml } from "./youtube-page";

const ytInitialData = {
  metadata: {
    playlistMetadataRenderer: { title: "Practice set" },
  },
  contents: {
    twoColumnBrowseResultsRenderer: {
      tabs: [
        {
          tabRenderer: {
            content: {
              sectionListRenderer: {
                contents: [
                  {
                    itemSectionRenderer: {
                      contents: [
                        {
                          playlistVideoListRenderer: {
                            contents: [
                              {
                                playlistVideoRenderer: {
                                  videoId: "abc123",
                                  title: { runs: [{ text: "周杰倫 - 晴天" }] },
                                  shortBylineText: { runs: [{ text: "Jay Chou" }] },
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      ],
    },
  },
};

describe("youtube playlist page", () => {
  it("reads videos from ytInitialData", () => {
    const html = `<script>var ytInitialData = ${JSON.stringify(ytInitialData)};</script>`;
    const parsed = parseYouTubePlaylistHtml(html, "PLtest");
    expect(parsed?.tracks).toHaveLength(1);
    expect(parsed?.tracks[0]).toMatchObject({
      title: "周杰倫 - 晴天",
      channelTitle: "Jay Chou",
      externalId: "abc123",
    });
  });
});
