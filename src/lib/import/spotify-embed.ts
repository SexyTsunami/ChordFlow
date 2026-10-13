import type { RawTrackInput } from "./normalize";

export type SpotifyEmbedPlaylist = {
  name: string;
  owner?: string;
  imageUrl?: string;
  tracks: RawTrackInput[];
  truncated: boolean;
};

type EmbedTrack = {
  uri?: string;
  title?: string;
  subtitle?: string;
  duration?: number;
  isPlayable?: boolean;
};

type EmbedEntity = {
  name?: string;
  title?: string;
  subtitle?: string;
  type?: string;
  coverArt?: { sources?: Array<{ url?: string }> };
  trackList?: EmbedTrack[];
};

function trackIdFromUri(uri: string | undefined): string | undefined {
  const match = /^spotify:track:([A-Za-z0-9]+)$/.exec(uri ?? "");
  return match?.[1];
}

function artistsFromSubtitle(subtitle: string | undefined): string {
  return (subtitle ?? "")
    .replace(/\u00a0/g, " ")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

export function parseSpotifyEmbedData(
  data: unknown,
  _playlistId: string,
): SpotifyEmbedPlaylist | null {
  const entity = (
    data as {
      props?: { pageProps?: { state?: { data?: { entity?: EmbedEntity } } } };
    }
  )?.props?.pageProps?.state?.data?.entity;
  if (!entity || (entity.type && entity.type !== "playlist")) return null;

  const tracks: RawTrackInput[] = [];
  for (const item of entity.trackList ?? []) {
    const title = (item.title ?? "").trim();
    const externalId = trackIdFromUri(item.uri);
    if (!title || !externalId) continue;
    tracks.push({
      title,
      artist: artistsFromSubtitle(item.subtitle),
      durationMs: typeof item.duration === "number" ? item.duration : null,
      externalId,
      externalUrl: `https://open.spotify.com/track/${externalId}`,
      isUnavailable: item.isPlayable === false,
    });
  }

  if (tracks.length === 0) return null;

  return {
    name: (entity.name ?? entity.title ?? "").trim() || "Spotify playlist",
    owner: entity.subtitle?.trim() || undefined,
    imageUrl: entity.coverArt?.sources?.[0]?.url,
    tracks,
    // The public embed page only ships the first page of tracks.
    truncated: (entity.trackList?.length ?? 0) >= 50,
  };
}

export function parseSpotifyEmbedHtml(
  html: string,
  playlistId: string,
): SpotifyEmbedPlaylist | null {
  const marker = 'id="__NEXT_DATA__"';
  const start = html.indexOf(marker);
  if (start === -1) return null;
  const open = html.indexOf(">", start);
  const close = html.indexOf("</script>", open);
  if (open === -1 || close === -1) return null;
  try {
    return parseSpotifyEmbedData(JSON.parse(html.slice(open + 1, close)), playlistId);
  } catch {
    return null;
  }
}
