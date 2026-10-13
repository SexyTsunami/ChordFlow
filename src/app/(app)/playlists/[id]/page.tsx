import type { Metadata } from "next";
import { PlaylistDetailView } from "@/components/playlist/playlist-detail-view";

export const metadata: Metadata = { title: "Playlist" };

export default async function PlaylistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PlaylistDetailView playlistId={id} />;
}
