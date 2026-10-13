"use client";

import * as React from "react";
import { listSheetEdits, subscribeSheetEdits, type SheetEditNote } from "./sheet-edits";

export function useSheetEdits(): SheetEditNote[] {
  const [notes, setNotes] = React.useState<SheetEditNote[]>([]);
  React.useEffect(() => {
    const refresh = () => setNotes(listSheetEdits());
    refresh();
    return subscribeSheetEdits(refresh);
  }, []);
  return notes;
}
