import type { Metadata } from "next";
import { SongPracticeView } from "@/components/song/song-practice-view";
import { loadChordDatabase } from "@/lib/data/load-chord-database";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const catalog = await loadChordDatabase();
    const title = catalog.songs.find((song) => song.id === id)?.title;
    return { title: title ?? "Song" };
  } catch {
    return { title: "Song" };
  }
}

export default async function SongPage({ params }: PageProps) {
  const { id } = await params;
  return <SongPracticeView songId={id} />;
}
