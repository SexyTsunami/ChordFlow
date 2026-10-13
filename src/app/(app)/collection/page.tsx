import type { Metadata } from "next";
import { CollectionView } from "@/components/home/collection-view";

export const metadata: Metadata = {
  title: "Artists",
  description: "Browse ChordDatabase songs by artist.",
};

export default function CollectionPage() {
  return <CollectionView />;
}
