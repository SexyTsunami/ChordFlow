import type { Metadata } from "next";
import { FavoritesView } from "@/components/home/favorites-view";

export const metadata: Metadata = { title: "Favourites" };

export default function FavoritesPage() {
  return <FavoritesView />;
}
