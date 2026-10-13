"use client";

import * as React from "react";
import { SectionHeading } from "@/components/ui/primitives";
import { Switch } from "@/components/ui/controls";
import { useLibrary } from "@/components/providers/library-provider";

export function SettingsView() {
  const { storeLabel, ready, preferences, updatePreferences } = useLibrary();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 lg:px-6 lg:py-8">
      <SectionHeading
        title="Settings"
        description="This copy of ChordFlow keeps your library on this device unless Supabase is configured."
      />

      <div className="space-y-4">
        <section className="panel space-y-3 p-5">
          <h3 className="text-sm font-semibold text-ink">Library</h3>
          <p className="text-sm text-ink-muted">
            {ready ? `Saving to: ${storeLabel}` : "Opening library…"}
          </p>
          <p className="text-xs leading-relaxed text-ink-faint">
            No account is required. Songs, playlists and arrangements you create
            stay in this browser. Secrets are never stored here.
          </p>
        </section>

        <section className="panel space-y-3 p-5">
          <h3 className="text-sm font-semibold text-ink">Practice defaults</h3>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>Show chord diagrams</span>
            <Switch
              checked={preferences.showChordDiagrams}
              onCheckedChange={(value) =>
                void updatePreferences({ showChordDiagrams: value })
              }
            />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>Prefer flat spellings (♭)</span>
            <Switch
              checked={preferences.preferFlats}
              onCheckedChange={(value) =>
                void updatePreferences({ preferFlats: value })
              }
            />
          </label>
        </section>

        <section className="panel space-y-3 p-5">
          <h3 className="text-sm font-semibold text-ink">Take-home edits</h3>
          <p className="text-xs leading-relaxed text-ink-muted">
            This site reads songs from the ChordDatabase folder. When you edit a
            sheet on your phone, the change is saved on this device and a
            markdown note is added on the Edits page. Share or download that
            note, then paste it into the matching file on your desktop.
          </p>
        </section>
      </div>
    </div>
  );
}
