"use client";

import { Button } from "../ui/button";
import { INK, PLATINUM, RAISED } from "../ui/bevel";
import { Timer } from "../ui/timer";
import { feedSources } from "./format";
import type { EventDTO } from "./types";

/** A raised banner for an in-progress timer, with a live elapsed clock + Stop. */
export function RunningTimerBanner({ event, onStop }: { event: EventDTO; onStop: () => void }) {
  const sources = event.type === "feed" ? feedSources(event) : "";
  return (
    <div
      className="flex items-center gap-2 p-2"
      style={{ border: `1px solid ${INK}`, background: PLATINUM, boxShadow: RAISED }}
    >
      <span className="text-small text-platinumDark">{event.type === "feed" ? "Feeding" : "Napping"}</span>
      {sources && <span className="text-small">{sources}</span>}
      <Timer startAt={event.startAt} className="text-title font-bold" />
      <Button variant="default" onClick={onStop} className="ml-auto">
        Stop
      </Button>
    </div>
  );
}
