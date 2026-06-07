"use client";

import { Button } from "../ui/button";

export type FormKind = "none" | "feed" | "nap" | "diaper";

/** The three entry points. Tapping the open one closes it (toggle). */
export function QuickAddBar({ open, onOpen }: { open: FormKind; onOpen: (k: FormKind) => void }) {
  const tab = (kind: Exclude<FormKind, "none">, label: string) => (
    <Button
      variant={open === kind ? "default" : "normal"}
      onClick={() => onOpen(open === kind ? "none" : kind)}
      className="flex-1"
    >
      {label}
    </Button>
  );
  return (
    <div className="flex gap-2">
      {tab("feed", "Feed")}
      {tab("nap", "Nap")}
      {tab("diaper", "Diaper")}
    </div>
  );
}
