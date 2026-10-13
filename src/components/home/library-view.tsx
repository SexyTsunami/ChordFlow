"use client";

import * as React from "react";
import { SectionHeading } from "@/components/ui/primitives";
import { useLibrary } from "@/components/providers/library-provider";
import { SongBrowser } from "@/components/song/song-browser";

export function LibraryView() {
  const { songs } = useLibrary();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-6 lg:py-8">
      <SectionHeading
        title="Songs"
        description={`${songs.length} sheets from ChordDatabase · search or filter by artist`}
      />
      <SongBrowser
        songs={songs}
        emptyTitle="Your library is empty"
        emptyDescription="Add a song by hand or import a playlist to get started."
      />
    </div>
  );
}
