import type { Metadata } from "next";
import { LibraryView } from "@/components/home/library-view";

export const metadata: Metadata = { title: "Songs" };

export default function LibraryPage() {
  return <LibraryView />;
}
