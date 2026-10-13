import { extractJsonAssignment, walkJson, ytText } from "./page-json";
import type { RawTrackInput } from "./normalize";

export type YouTubePagePlaylist = {
  name: string;
  owner?: string;
  tracks: RawTrackInput[];
};

export function parseYouTubePlaylistHtml(
  html: string,
  playlistId: string,
): YouTubePagePlaylist | null {
  const data = extractJsonAssignment(html, "ytInitialData");
  if (!data) return null;

  const tracks: RawTrackInput[] = [];
  let name = "";
  let owner = "";

  walkJson(data, (node) => {
    if (node.playlistMetadataRenderer && typeof node.playlistMetadataRenderer === "object") {
      const meta = node.playlistMetadataRenderer as { title?: unknown; ownerText?: unknown };
      name = name || ytText(meta.title);
      owner = owner || ytText(meta.ownerText);
    }
    if (node.playlistHeaderRenderer && typeof node.playlistHeaderRenderer === "object") {
      const header = node.playlistHeaderRenderer as {
        title?: unknown;
        ownerText?: unknown;
      };
      name = name || ytText(header.title);
      owner = owner || ytText(header.ownerText);
    }
    const video = node.playlistVideoRenderer;
    if (!video || typeof video !== "object") return;
    const item = video as {
      title?: unknown;
      videoId?: unknown;
      shortBylineText?: unknown;
    };
    const title = ytText(item.title);
    const videoId = typeof item.videoId === "string" ? item.videoId : "";
    if (!title || title === "Deleted video" || title === "Private video" || !videoId) {
      return;
    }
    if (tracks.some((track) => track.externalId === videoId)) return;
    tracks.push({
      title,
      channelTitle: ytText(item.shortBylineText) || undefined,
      externalId: videoId,
      externalUrl: `https://www.youtube.com/watch?v=${videoId}&list=${playlistId}`,
    });
  });

  if (tracks.length === 0) return null;
  return {
    name: name || "YouTube playlist",
    owner: owner || undefined,
    tracks,
  };
}
