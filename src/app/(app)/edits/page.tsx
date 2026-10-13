import type { Metadata } from "next";
import { EditsView } from "@/components/home/edits-view";

export const metadata: Metadata = { title: "Take-home edits" };

export default function EditsPage() {
  return <EditsView />;
}
